# Approval as a poll — how real approval works and what the sim should read

**Status:** research, active (S455, 2026-09-13, engine-sheet). Companion to ROLLOUT `engine.213` and `civic.36`.
**Source:** the builder's own framing tonight ("how is approval done in real life? polls") plus the live record read this session — `Civic_Office_Ledger`, `Ripple_Ledger` approval-shift rows C101–C106, `Neighborhood_Map` C106, `Edition_Coverage_Ratings` C92–C106, bench fires @26–@29 (C107–C111).

## What this addresses

The approval number was a delta accumulator over the initiative tracker. Ashford, holding the strongest district in the city, sat at 45 after six cycles of −3/−1 for one opposed health-center row, while every hood read positive and five desks rated the week +3..+5. A reader of the Tribune would not recognise the number. The builder's test for any approval mechanic, stated tonight: **would someone living in Oakland say that about that person?** That is the acceptance criterion for everything below.

## How approval works in real life

A poll: a sample of residents is asked whether they approve of the job the person is doing. Each answers from their own life. The things that move the answer, roughly in order of weight in the literature and in practice:

1. **Their own circumstances** — job, pay, rent, whether the street feels safe, whether the kids' school is fine. Economic voting: people grade incumbents on how *they* are doing, lagged a season.
2. **Direction over level** — a poor district that is improving approves; a rich district sliding disapproves. "Are things getting better here" beats "is here better than there."
3. **Partisanship** — a floor and a ceiling: the seat's own faction rarely drops below ~35% approval, the other faction rarely rises above ~60%. Independents swing.
4. **The press** — framing, salience; a bad week of coverage costs a few points, a good week pays a few; it does not set the level.
5. **Events** — a vote against your own district (Ashford, C80), a scandal, a visible delivery (a center opening). Sharp, then fading.
6. **Honeymoon and inertia** — a new holder starts high and decays; a poll has memory, it does not reset weekly.
7. **Sampling noise** — ±3 points is normal; two polls disagree.

Nobody polls the initiative tracker. City hall's paperwork reaches voters through 1, 4 and 5.

## What the sim should read (the poll of the ledger)

The sim already has the poll's respondents: the ledger citizens, each with a hood, a job, income, a household, life events, dials, and (through faction lean where present) a partisan prior. The right mechanic is literally the real one:

- **Sample** — each cycle, for each seat, draw N citizens of the district (Mayor: the city), deterministic on `ctx.rng` and the cycle.
- **Each answers** — `approve = f(own state)`: employment and income trend (Income vs last cycle, `Employment_Roster`), recent negative/positive life events (`LifeHistory_Log` tags Friction/Setback/Strain vs Milestone), hood mood (smoothed `Neighborhood_Map.Sentiment`), crime near home, hospital load, dials (Composure/Integrity shape how much a bad week moves a person), faction lean (floor/ceiling), plus a scandal or a vote-against-district on the seat's record.
- **Aggregate** — share approving → the number, with inertia (a poll has memory) and sampling noise (±2).
- **Write the poll, not just the number** — a `Civic_Approval_Poll` tab: cycle, seat, sample size, approve/disapprove/unsure, top reason tags. That is what the civic desk reports and what interviews draw from.

Interim (shipped tonight, engine.213a–d): the hood-level proxy of that poll. Target level = 50 + mood (smoothed mean hood sentiment; council half own district, half city; Mayor city) × 8 + relative ordering (momentum, crime, sentiment, ¼ retail against the city middle) × 5 + press step × 3; approval closes 20% of the gap per cycle; civic motion stays an event on top; sitting costs nothing, silence half the old curve. Reader test on the live C106 rows: Mayor 62; D1 57, D2 63, D3 58, D4 60, D5 57, D6 64, D7 67, D8 63, D9 65.

## What the bench exposed (and what it means)

Bench C108→C109: mean hood sentiment went +0.46 → −0.14 in one cycle with **zero world events**, and stayed negative through C111. Live C95–C106 city sentiment: 0.59 0.70 0.23 0.63 0.80 0.21 0.00 0.44 0.42 0.84 0.25. That is `engine.165` (sentiment sawtooth, HIGH, open). A poll faithfully reports an unhappy city, so every bench seat slid to ~50 in three cycles. The approval mechanic is only as sane as its inputs: **the sentiment channel is the next fix, and it is the one that makes or breaks "a world that makes sense."** Smoothing (engine.213d, EMA 0.3) halves the damage; it does not remove the cause.

## Interviews — the qualitative half

Real approval coverage is a number plus quotes. The media room already has the pieces: citizen-voice agents, `/interview`, the desk agents. A poll cycle should hand the civic desk three things: the number and its move, the top reason tags from the sample, and three respondents (by POPID, resolved by name) to interview — one approving, one disapproving, one unsure — so the edition carries "why" in a citizen's words, not the engine's. Rhea gates the facts (the number, the seat, the vote record); the quote is colour (SIM_DOCTRINE §13).

## Cron shape (proposed, not built)

- **Poll** — engine Phase 5 (deterministic, `ctx.rng`), writes `Civic_Approval_Poll` via intents; `Civic_Office_Ledger.Approval` becomes the poll's smoothed headline.
- **Office work** — the Mon–Thu datawakes currently reach no sheet. The chain writes a per-office `WorkScore` (actions on record vs "on track" statements) to `Civic_Office_Ledger`; the poll reads it as a small term. Filed on `engine.213`.
- **Interviews** — Sunday, after the poll: three respondents per seat that moved > 3, handed to the civic desk packet.
- **Media** — the press term stays: half CIVIC desk, half whole paper, on the live range.

## Not applicable / hazards

- Real-world Oakland politics, real polling houses, real party names: scaffold only, never imported (`project_real-life-is-not-real-world-oakland`).
- A poll that reads a noisy input is a noisy poll; fix `engine.165` before trusting cycle-to-cycle moves.
- Do not tune weights until a number looks right — every change tonight was checked against the reader test on the live rows first, and the one that failed it (@83's level-vs-middle composite: Rivers 76→46, Carter 76→49) was replaced before any sheet write.

## Rulings needed (builder)

1. Poll the ledger (the real mechanic) as the next cut, replacing the hood proxy — yes/no.
2. Partisan floor/ceiling: does faction lean exist on enough citizens to use, or does the poll stay non-partisan until it does.
3. Rebase policy: tonight's plan restores only the six seats the C101–C106 bleed took below authored canon (Ashford 51, Tran 59, Vega/Crane/Chen/Mobley 55); the four above target drift under inertia. Alternative: no rebase, let all ten drift.
