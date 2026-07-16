# engine.59 — Bonds × GC: the marriage market (S320 design, Mike-ruled)

**Terminal:** engine-sheet (build + deploy). **Sandbox:** 0716b.
**Parent:** [[2026-07-13-family-household-loop-build]] (engine.57 — P5 shipped the romance/marriage physics this refines).
**Rollout row:** engine.59. **Status:** designed, build pending Mike's dial sign-off.

## Why (Mike-direct, S320 — verbatim-close)

Romance builds slow — deliberately: "we didn't want a pool of 800 all marrying
each other." Tier matters in marriage: T1×T1 is the rarest — a "super couple"
with a lot of math in their favor once formed — and the rarity ladder descends
by tier. GC reopens the pool but generates slowly, so a GC marriage is a
greater per-candidate chance that stays a lottery on the sheer limited count
of available females. Age radius already gates; education level, debt rate,
savings rate should all factor into who gets a spouse. The reason it all
matters: marriage → household, and the household ultimately drives events →
dials → kids. **The sims are all trying to tier up and become a household —
that is the drive loop of the sim.**

## What exists (grounded S320)

- `bondEngine.js` P5 (engine.57, LIVE): friendship intensity ≥ 7 + both
  single + age window (20–65) + opposite sex → 10 %/cycle flip to romantic;
  romance ≥ 8 → `marryCitizens_` (household, register, SpouseId both ways).
  No caps — physics per SIM_DOCTRINE.
- GC spouse promotion shape: proven twice (S319 drip, S320 spouse drip) —
  full SL row, household surname, register row, GC → Promoted.
- Emergence machinery (engine.58, LIVE): surfacing ticks, EmergenceCount ≥ 3
  lottery → Tier-4 SL row. `EmergenceContext` currently keeps ONLY the last
  namer (last-write-wins).
- Columns available for fitness: `EducationLevel` (trued S320), `DebtLevel`,
  `SavingsRate`, `Tier`.

## Design — four tasks, all physics, no quotas

### T1 — Tier gravity on the romance flip
At the friendship→romance gate, scale ROMANCE_CHANCE by social orbit:
`tierFactor = (tierA + tierB) / 8` → T4×T4 = 1.0×, T1×T4 = 0.625×,
T1×T1 = 0.25× (rarest; compounds with the tiny T1 population).
On a T1×T1 or T1×T2 wedding, stamp the household `SuperCouple=yes`
(Household_Ledger col, ensured once) — the "math in their favor" hook the
money stage (savings/debt/banking) and event weighting consume later.

### T2 — Suitor fitness (who gets a spouse)
One factor, applied at BOTH the romance flip and the GC lottery:
`fitness = clamp(1 + EDU[level] + SAV[rate] − DEBT[level], 0.6, 1.4)`
- EDU: doctorate/masters +0.15, bachelors +0.08, else 0
- SAV: SavingsRate ≥ 0.10 → +0.10, ≥ 0.05 → +0.05
- DEBT: high → −0.15, medium → −0.05 (map to existing DebtLevel values at build)
Better-positioned citizens court faster; nobody is excluded, only paced —
physics, not gatekeeping.

### T3 — GC marriage channel (the lottery door)
A single adult citizen (age window, no active romantic bond) who has stayed
single through a courtship drought (`GC_DROUGHT = 10` cycles since last
romance flip opportunity — tracked cheaply: any single with no romantic bond
qualifies after the dial's cycle count) rolls per cycle:
`GC_MARRY_CHANCE (0.02) × fitness × scarcity`, where
`scarcity = availableOppositeSexGC / POOL_REF (60)` — supply IS the lottery;
the female-first generator floor (v2.8) is the refill valve.
Winner: GC promoted via the proven spouse shape (takes the citizen's
surname), marriage + household formed same cycle. Expected pace at current
pool: well under 1/cycle world-wide — slow by construction.

### T4 — Namers → bonds at promotion (engine.58 close-out)
`EmergenceContext` becomes an appended roster (`; `-joined, cap 5 namers,
newest kept). At GC promotion (both doors — lottery and marriage), seed
FRIENDSHIP bonds (intensity 3) between the new citizen and each named
roster citizen still active. You enter the world knowing the people who
talked about you; the bond engine grows or decays it from there — which
also means a lottery winner can walk the normal romance path immediately.

## Dials (Mike locks before build)

| Dial | Proposed | Meaning |
|---|---|---|
| TIER_ROMANCE factor | (tA+tB)/8 | T1×T1 0.25× … T4×T4 1.0× |
| Fitness clamp | 0.6–1.4 | spread between worst/best positioned |
| GC_MARRY_CHANCE | 0.02/cycle | base lottery odds per drought single |
| GC_DROUGHT | 10 cycles | single-streak before the lottery opens |
| POOL_REF | 60 | scarcity denominator (matches gen floor) |
| Namer roster cap | 5 | bonds seeded at promotion |
| SuperCouple stamp | T1×T1, T1×T2 | the dynasty-seed flag |

## Verification (0716b, one cycle + targeted checks)

- Romance flips logged with tier factor visible in the log line
- No same-cycle romance+marriage (existing invariant holds)
- A drought single with high fitness rolls the GC lottery (log line even on miss)
- Promoted spouse: surname, SL row, register, household, GC Promoted — the
  S320 checklist
- EmergenceContext shows rosters, not last-writer
- A promotion seeds N friendship bonds visible in Relationship_Bonds

## Out of scope (queued behind)

Education/debt/savings *effects* on life outcomes (money stage), banking
fluctuation layer, heritage/dynasty scoring (consumes SuperCouple + inheritance
chains), health effects.
