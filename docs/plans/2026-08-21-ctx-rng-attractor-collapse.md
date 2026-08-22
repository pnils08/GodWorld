# ctx.rng attractor collapse — the simulation's PRNG has ~10k distinct values

**Filed:** 2026-08-21 (engine-sheet) · **ROLLOUT:** `engine.128` · **Status:** RNG fix LANDED `33cf8636` (see §9); BondId restore + mint still open
**Found by:** chasing 53 duplicate BondIds in `output/bond-ledger-live.tsv` during the published-canon bond mint review.

---

## 1. The claim

`ctx.rng` — the single seeded RNG every engine phase draws from — degenerates into a **shared 10,466-value attractor cycle**. Every seed converges into the *same* loop, entering only at a different offset. After a few thousand draws in any cycle, the engine is no longer sampling 2^31 states; it is walking one fixed 10,466-long ring forever.

This is not a bond defect. Bonds are where it became *visible*.

## 2. Root cause — float precision, one line

`utilities/cycleModes.js:44` —

```js
function seededRng_(seed) {
  var state = hashInt32_(seed);
  return function() {
    state = ((state * 1103515245) + 12345) & 0x7fffffff;   // <-- here
    return state / 0x7fffffff;
  };
}
```

`state` reaches 2^31. `state * 1103515245` therefore reaches **1.36e18**, which exceeds `Number.MAX_SAFE_INTEGER` (9.007e15) by ~150×. JavaScript has no integer type here — the product is a float64, so the low-order bits are **silently rounded away before `& 0x7fffffff` ever runs.** The mask then operates on a number whose low bits are already gone.

The glibc LCG constants are correct. The arithmetic they need is not available to them.

## 3. Evidence (reproducible)

| check | result |
|---|---|
| `state * 1103515245` vs MAX_SAFE_INTEGER | 1.36e18 vs 9.0e15 — **exceeds, low bit already zeroed** |
| distinct values in 100,000 draws, seed 102 | **16,987** (expected ~100,000) |
| distinct values in 100,000 draws, seed 103 | **19,278** |
| attractor cycle length, seeds 102 / 103 / 1 | **10,466 for all three — identical values, identical order** |
| entry offset into that cycle | seed 102 → draw 6522; seed 103 → draw 8813; seed 1 → draw 5688 |

Different seeds do not produce different worlds after warm-up. They produce **the same ring entered at a different phase.**

## 4. Why this produced the BondId corruption

`phase05-citizens/seedRelationBondsv1.js:449` builds a BondId from 8 consecutive `rng()` draws with **no uniqueness check**:

```js
for (var i = 0; i < 8; i++) id += chars[Math.floor(rand() * 16)];
```

Once two cycles are both inside the shared ring, their draw sequences are identical up to a phase shift. So:

- **phase-aligned** → byte-for-byte identical BondId → **53 exact duplicates observed**
- **off by one draw** → the 8-char window slides one position → **39 one-character rotations observed**
  (`BOND-76768EB2` c102 / `BOND-B76768EB` c103; `BOND-93E00BDE` / `BOND-3E00BDE1`; `BOND-56DC828D` / `BOND-6DC828D1`)

Every single duplicate splits **c102 vs c103** — the only two cycles in the export. Predicted by the mechanism, confirmed in the data.

## 5. Blast radius

`ctx.rng` is *the* simulation RNG — `safeRand_(ctx)` hands it to every consumer (`utilities/safeRand.js:29`). Events, drift, promotions, marriage market, migration, health, crime all draw from it. The consequence is not non-determinism (replay still works — same seed, same output). The consequence is **variety**: the world has been drawing its "randomness" from a pool of ~10k values that repeats, and every cycle falls into the same pool.

For a project whose test is *does this help the citizens have a life*, a 10,466-value entropy ceiling on every life event is a substrate-level cap on how different two citizens can be.

## 6. The fix

The correct PRNG **already exists in this repo** — `mulberry32_`, sitting unused as the fallback branch at `utilities/safeRand.js:33`. It uses `Math.imul`, which does true 32-bit integer multiplication and never leaves float-safe range.

Point `seededRng_` at that arithmetic. One function body, no new file, no new dependency, no schema change. Determinism is preserved (still seeded, still replayable forward).

**Known consequence, needs a call:** past-cycle *replay* (`ctx.replaySeed`) will no longer reproduce c1–c104 outputs, because the stream changes. Nothing already written to canon or the ledger changes — this is forward-only. But the replay-a-past-cycle capability breaks at the boundary.

## 7. Sequence

1. Land the `seededRng_` fix + a regression test asserting distinct-value count over 100k draws and no shared attractor across seeds.
2. Add the uniqueness guard on `generateSeedBondId_` regardless — a correct PRNG makes collisions astronomically unlikely, not impossible, and BondId is read as a lookup key at `phase05-citizens/bondEngine.js:1670`.
3. Targeted restore of the 53 colliding BondIds (structural guard on the writing code + targeted restore, never a sweep).
4. *Then* the published-canon bond mint — see [[2026-08-21-published-canon-bond-mint]]. Minting into a table whose primary key collides is building on sand.

## 8. Related

- Bond mint plan (blocked on this): `docs/plans/2026-08-21-published-canon-bond-mint.md`
- **Architecture this exposed: [[../ENGINE_CRON_LOOP]]** — the engine/cron loop and the missing canon→engine return edge. The BondId collisions were the symptom that led there.
- Engine rules on `ctx.rng` / no-`Math.random`: `.claude/rules/engine.md` §Engine rules
- `[[../engine/ROLLOUT_PLAN]]` row `engine.128`

---

## 9. Landed 2026-08-21 (engine-sheet)

`seededRng_` is now mulberry32 over `Math.imul`; `hashInt32_` carried the same
defect (`x * 0x45d9f3b` ≈ 3.1e17) and was fixed in place. `hashString_` was
checked and is sound — it uses bit shifts, which coerce to int32.

Measured before → after, same assertions:

| assertion | old | new |
|---|---|---|
| distinct values per 100,000 draws (seed 102) | 17,313 | >99,000 |
| values seed-103 shares with seed-102 (40k draws) | **36,144 / 40,000 (90%)** | <5% |
| same seed reproduces its stream | yes | yes (preserved) |

That 90% overlap is the finding in one number: nine of every ten "random" values
in a cycle were values the previous cycle had already drawn.

Guard: `utilities/cycleModes.rng.test.js`, 8 assertions, extracted from the real
source via `vm` rather than copied, so a future rot fails the test instead of
passing a stale duplicate. Verified to have teeth — the old implementation fails
assertions 1 and 2 outright. This class never throws and never fails a cycle, so
a statistical assertion is the only thing that can catch it.

`ctx.rng.draws` counts draws per cycle. Still needs one wire-up line wherever the
cycle summary is written to surface it — that number sizes how much of a cycle
sat past the old 5,700–8,800-draw entry point.

Not yet done: the targeted restore of the 53 colliding BondIds, and the
uniqueness guard on `generateSeedBondId_` (§7 items 2–3). The mint stays gated
on those.
