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

### T5 — Bonds × the dials (TraitProfile — Mike-ruled S320)
Vocabulary: **"dials" = the TraitProfile system** — the essence/voice column
the 24/7 citizen cron wakes and article pulls read. Everything here must
reach it: build → events → dials → autonomous life. Two seams:
1. **Traits shape bonds:** TraitProfile is parseable
   (`Archetype:…|sociability:60|warmth:74|family:68|…`) — bond formation
   and growth weight by trait affinity: high `sociability` bonds more, high
   `warmth` grows friendship faster, high `family` courts/marries faster.
   Deterministic reads, ctx.rng rolls.
2. **Bonds reach the cron life:** every bond event already writes a
   LifeHistory line (`appendBondLifeLine_`) — verified the wake loop reads
   LifeHistory, so wakes are bond-aware by construction. Build check:
   romance/wedding/rivalry lines carry tags the reflection classifier can
   route into tension open/resolve, so a bond can move a citizen's dials.

### SuperCouple — the full "math in their favor" (Mike-ruled S320)
Beyond the stamp: pay, fame, AND household hit their events and outcomes —
multi-engine, not just money. Hooks the stamp feeds (each built in its
owning stage): career engine (raise odds), UsageCount/fame paths (coverage
gravity), household events (positive weighting), kids' outcomes at 18.
engine.59 ships the stamp + the LifeHistory/story-hook moment; consumers
land with the money/fame stages.

## Tuning constants (grounded against live, S320 — these are NOT Mike's "dials")

Grounding run (live, 930 rows): market = 131 singles aged 20–65
(T1 6M/1F, T2 6M/3F, T3 24M/10F, T4 30M/51F — female surplus at T4, male
surplus above); 162 active friendships, intensity range 1–5.6, median ~3.5;
2 romantic bonds, both hand-seeded canon couples; GC pool 209M/29F active.

**THE grounded finding: ROMANCE_THRESHOLD 7 is unreachable — max organic
friendship intensity is 5.6. The organic romance pipeline has never fired.**

| Constant | Grounded value | Basis |
|---|---|---|
| ROMANCE_THRESHOLD | **7 → 5.5** | top of the real distribution — only the strongest few friendships qualify at any time (slow, not never). Verify the 5.6 ceiling cause at build (growth/decay math) |
| ROMANCE_CHANCE | 0.10 (keep) | with ~2-5 eligible pairs and tier+fitness scaling → expect ≈1 romance per 3-6 cycles world-wide |
| TIER_ROMANCE factor | (tA+tB)/8 | T1×T1 0.25× — compounds with 6M/1F T1 singles: super couples years apart |
| MARRIAGE_THRESHOLD | 8 (keep) | courtship = several cycles of romantic growth from 5.5 |
| Fitness clamp | 0.6–1.4 | education trued S320; DebtLevel/SavingsRate mapped at build |
| GC_MARRY_CHANCE | 0.02/cycle | drought singles: 66 single males vs 29 GC females (scarce), 64 single females vs 209 GC males (abundant) — scarcity factor makes the two doors asymmetric, as ruled |
| GC_DROUGHT | 10 cycles | ~1 sim-quarter single before the lottery opens |
| POOL_REF | 60 | matches the generator's F-floor |
| Namer roster cap | 5 | bounded EmergenceContext |
| SuperCouple stamp | T1×T1, T1×T2 | dynasty seed |

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
