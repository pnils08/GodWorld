# Bench C113 — engine.243 re-proof after the C112 failure, declared BEFORE the fire

Bench: SANDBOX 0908, script version **@72** (deployment read back at @72).
Repo HEAD `e8b364a6` — adds `crisisNameFromDomain_`, the fix for the one
prediction C112 broke.

State going in: `cycleCount` 112. `CRISIS-110-ROCKRIDG` is in `decline` — the
C112 hook read "Cooling down in Rockridge: Rockridge recovering — pressure
lifting", which is `ch.count === 0`, so its `consecutiveGood` is at least 1 and
(given C111 wrote no ledger row and it was already declining at C112) most
likely 2. `RESOLVE_CYCLES` is 3.

| # | Prediction | How it is checked |
|---|---|---|
| 1 | `ok:true`, Engine_Errors empty, cycleCount 113 | fire JSON + tabs |
| 2 | The Rockridge arc is **named** this cycle — `The Rockridge Health Crisis`, at domain precision, because its channel evidence was erased before the deploy | Story_Hook_Deck C113 hook text and/or an Event_Arc_Ledger C113 Summary |
| 3 | It does **not** get a channel-precision name (`Hospital Run`) — there is nothing left to derive one from, and a guess is worse than a coarse truth | the name reads `Health Crisis` |
| 4 | If `consecutiveGood` reaches 3 it **RESOLVES**: an Event_Arc_Ledger row phase `resolved`, a `WorldEvents_V3_Ledger` row whose EventDescription starts with the name and says "eased", severity low — the end of a crisis reaching the newsroom for the first time | both tabs at C113 |
| 5 | If it resolves, the city gains its **first remembered crisis**, and any later onset in Rockridge will cite it by name and in-world stamp | carry blob / next onset |
| 6 | If it does not resolve this cycle, there is still **no** lifecycle world event — emission is on the peak and resolved transitions only | WorldEvents_V3_Ledger C113 |
| 7 | Crime unchanged in character, 22 hoods inside the engine.212 ±3 band | Crime_Metrics |

---

## RESULT — bench C113 fired on @72, 2026-09-20

`ok:true`, ranMs 133149, cycleCount 112 → **113**, **Engine_Errors empty**.

**The chain closed, end to end, on real state.**

Event_Arc_Ledger C113:

> `113 | CRISIS-110-ROCKRIDG | resolved | Rockridge`
> `The Rockridge Housing Squeeze — Rockridge crisis eased after 3 cycles back within city range`

WorldEvents_V3_Ledger C113:

> `[HEALTH/low/Rockridge] The Rockridge Housing Squeeze — Rockridge crisis eased after 3 cycles back within city range`

That second row is the point of the cut. Before it, a crisis ending reached the
ripple ledger and the arc ledger and **never S.worldEvents** — the newsroom
could report a crisis starting and had no structural way to report it ending.
This is the first one that did.

| # | Prediction | Result |
|---|---|---|
| 1 | ok:true, Engine_Errors empty, cycleCount 113 | **HELD** |
| 2 | The arc is named | **HELD** |
| 3 | Named `Health Crisis` at domain precision, not a channel | **FAILED — and the failure is the useful one.** It named `Housing Squeeze` |
| 4 | Resolution writes an arc row + a named, low-severity world event saying "eased" | **HELD**, both |
| 5 | The city gains its first remembered crisis | **HELD** (carried) |
| 6 | No lifecycle event absent a transition | n/a — it transitioned |
| 7 | Crime unchanged in character | **HELD** — 22 hoods, 0 stale at C113 |

### Why 3 failed, and why it mattered

The backfill tried the carried summary (evidence erased by the recovery line),
then fell back to **this cycle's live channels** — housing pressure was active,
so the arc was named `The Rockridge Housing Squeeze`. That name is true here
only by luck: housing happened to be one of the two channels it was detected on
at C110 ("2 hospitalizations last cycle; housing pressure 6.00"). The mechanism
did not know that. A legacy arc could just as easily have been named after
something that arrived long after it started.

**Fix:** a legacy arc is now named from **onset-derived sources only**, in
descending precision — the carried summary's evidence, then `domainTag` (written
by `domainFor_` from the onset evidence, and always carried). This cycle's live
channels are no longer a naming source at all. `scripts/crisisNaming.test.js`
49/49, with a fixture that puts a live housing channel in front of the namer and
requires it to be ignored.

**Honest limit:** the bench can no longer re-prove this path — Rockridge was its
only pre-naming arc and it has now resolved. The unit fixture carries it. Every
NEW arc is named at onset from real evidence and never touches this path.

### Second confirmation of engine.244

`[CIVIC/medium/Jack London]` at C113 again landed with a blank EventDescription.
