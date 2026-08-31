# Anomaly follow-up — Cycle 105 (engine terminal)

**Routed:** `route-to-engine-debug` · **Suppressed from the C105 edition until cleared.**

## POP-00777 — income +156% with no cohort

`34,335 → 88,000` (+156%), **peer move share 0%**.

## Why this one and not the other ten

Ten other citizens posted income jumps of 104–218% this cycle and all were triaged `cover-as-story`, because each carried a **peer move share of 38–50%** — roughly half their comparison cohort moved with them. That pattern is legible: it is engine.135's employment cascade re-basing pay against hood reference businesses, landing on live citizens for the first time since the wave deployed.

POP-00777 moved **alone**. Same magnitude, no cohort. Either the citizen has a genuine individual cause (a promotion, an inheritance, a business outcome) that the cascade explains one-to-one, or the re-base applied to a row it should not have.

## What to check

1. Resolve POP-00777 **by POPID against `Simulation_Ledger`** — name, hood, employer, `Employer_BizID`, CareerStage, Status.
2. Does their hood have a `Business_Ledger` reference set? engine.135 D2/D4 prices draws by hood (`hoodReferencePay_`); a hood with a thin or absent business set is the most likely way a single row moves without peers.
3. Check `LifeHistory_Log` C105 for an event explaining the jump (promotion, employer change, inheritance). If one exists, this is a story, not a defect — clear it and release for coverage.
4. Compare against the ten cohort movers: same employer? same hood? If POP-00777 is the only citizen at their employer, peer-share 0% may simply mean a cohort of one, which is a detector artifact rather than an engine fault.

## Disposition

Do **not** cover until resolved. If (3) finds a clean in-world cause, release it to the Business desk alongside the cohort story. If (2) shows a hood with no business reference, that is an engine.135 follow-up and belongs in the employment-cascade acceptance pass, not the edition.

Source: `output/engine_anomalies_c105.json`
