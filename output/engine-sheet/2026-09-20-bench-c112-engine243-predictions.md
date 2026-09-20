# Bench C112 — engine.243 predictions, declared BEFORE the fire

Bench: SANDBOX 0908, script version **@71**, deployment read back at @71.
Repo: HEAD `a4c28557` (engine.243 naming + lifecycle events + in-flight backfill).
Bench sheet state read before the fire: `World_Config.cycleCount` = **111**.
Carried crisis arc on the bench: **CRISIS-110-ROCKRIDG**, onset C110, last ledger
phase `early`, detected on `2 hospitalizations last cycle; housing pressure 6.00`.
Rockridge Neighborhood_Map at read time: CrimeIndex 0.57, RetailVitality 11.95,
Sentiment 0.33, MigrationFlow 2, HousingPressure 6.5.

A passing cycle is not a proof. These are the specific claims the fire settles.

| # | Prediction | How it is checked |
|---|---|---|
| 1 | `ok:true`, `Engine_Errors` empty for C112 | fire JSON + Engine_Errors tab |
| 2 | The Rockridge arc is **named** this cycle even though it onset before naming existed — `The Rockridge Hospital Run` | any C112 Event_Arc_Ledger row's Summary, or the cycle packet's arc line, begins with that name |
| 3 | The name comes from what it was DETECTED on (hospital), **not** from whichever channel is live at C112 — housing pressure is still 6.5 and would otherwise name it `Housing Squeeze` | the name reads `Hospital Run` |
| 4 | If the arc reaches **peak** this cycle: a `WorldEvents_V3_Ledger` row appears whose EventDescription starts with the name and says "crisis at peak". Before this cut, peak wrote a ripple + an arc row and NO world event | WorldEvents_V3_Ledger C112 rows |
| 5 | If the arc **resolves** this cycle: a world event whose description starts with the name and says "eased", severity low, plus a `resolved` Event_Arc_Ledger row | as above |
| 6 | If it neither peaks nor resolves (stays early/rising/decline): **no** new world event — the lifecycle emission fires only on those two transitions, not every cycle | WorldEvents_V3_Ledger C112 has no `crisis` description |
| 7 | **Crime is unchanged in character.** No `crisis-lifecycle` event may count as a crime cause (engine.212 counts SAFETY world events as a cause and Phase3-Crime runs immediately after Phase3-CrisisBuckets). Rockridge's arc is HEALTH-domain so this cycle cannot disprove it on its own; the ±3/cycle engine.212 bound must still hold on all 22 hoods | Crime_Metrics cols H–J before/after |
| 8 | No new rng draw: the detector still draws zero, so nothing downstream shifts position | phase timings sane, no unexplained drift in dice-driven tabs |

**Honest limit:** a single bench cycle cannot prove the naming of a *new* onset —
live onset rate is ~1 in 6 cycles. What it proves is the in-flight path, the
emission gating, and that the cut does not throw on real state.

---

## RESULT — bench C112 fired on @71, 2026-09-20

`ok:true`, ranMs 140477, `World_Config.cycleCount` 111 → **112**, **Engine_Errors empty**.

| # | Prediction | Result |
|---|---|---|
| 1 | ok:true, 0 Engine_Errors | **HELD** — Engine_Errors tab has header only |
| 2 | Rockridge arc named `The Rockridge Hospital Run` | **FAILED** — it came back unnamed |
| 3 | Named from the detected channel, not the live one | not reached |
| 4 | Peak emits a world event | not exercised — the arc did not peak |
| 5 | Resolved emits a world event | not exercised — the arc did not resolve |
| 6 | Neither transition ⇒ no lifecycle world event | **HELD** — 0 Event_Arc_Ledger rows at C112, and none of the 10 WorldEvents_V3_Ledger C112 rows is a crisis-lifecycle row |
| 7 | Crime unchanged in character | **HELD** — all 22 hoods updated at C112, levels inside the engine.212 band (Downtown P36.65/V20.78/Q42.76, Rockridge 37.59/23.90/43.32) |
| 8 | No new rng draw | **HELD** — no unexplained drift; detector still draws nothing |

### Why 2 failed — the thing only a real fire could show

The hook the desks got read:

> `Cooling down in Rockridge: Rockridge recovering — pressure lifting Follow-up angle available.`

CRISIS-110-ROCKRIDG had already entered `decline` before this deploy. The
lifecycle **overwrites `arc.summary` every cycle**, and the recovery branch
writes `"<hood> recovering — pressure lifting"` — which carries no channel at
all. The in-flight backfill reads the carried summary for evidence, found none,
fell back to this cycle's live channels, and there were none either (count 0 is
what `decline` means). So the arc stayed anonymous, exactly as the unit test
could not have predicted: the fixture in that test still had its onset evidence.

**Fix (same session):** `crisisNameFromDomain_`. `domainTag` DOES survive the
carry, so a legacy arc with no recoverable evidence is named at the precision
the surviving evidence supports and no finer — `The Rockridge Health Crisis`,
marked `nameChannel: 'domain'` so the coarser basis is visible. A NEW arc never
reaches this path; it is named from real channel evidence at onset.
`scripts/crisisNaming.test.js` 48/48, fixtured on the exact state the bench
handed back.

### Also found (filed, not fixed here — one unbenched change at a time)

`WorldEvents_V3_Ledger` holds **50 of 434 rows with a blank EventDescription**
(SAFETY 8, CIVIC 10, HEALTH 7, INFRASTRUCTURE 6, CULTURE 13, ENVIRONMENT 3,
ECONOMIC 3). `recordWorldEventsv3_` writes `ev.description || ''` and
`generateCrisisSpikes_` never sets a `description` field on the events it
pushes. Every crisis spike has therefore reached the ledger with nothing a desk
can read. Filed as engine.244.
