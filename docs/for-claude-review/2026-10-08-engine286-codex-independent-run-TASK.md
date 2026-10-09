# Codex task — engine.286 independent read and plan (research-build, 2026-10-08)

Output: `docs/for-claude-review/2026-10-08-codex-engine286-read-and-plan.md`. Read-only: no code edits, no sheet writes, no commits. Today is 2026-10-08, live Cycle C110, next live fire C111 Sunday 2026-10-11.

**This is an independent run.** research-build is doing its own read in parallel and the two will be compared. Do NOT open `docs/research/*engine286*`, and in `docs/plans/2026-07-31-citizen-memory-perception.md` read only the one-line row text of engine.284 and the first paragraph of §engine.284 — skip the "Flag-column audit" bullets and everything after them. Form your own picture from the code and the live data.

## The job (builder direction, 2026-10-08)

The generic citizen event engines (daily, neighborhood, personal, civic role) are random draws. The builder wants them revisited so generic events align with the sim and with the "game of life" concept: what a citizen does and lives should follow the real elements that support it (the citizen's job, household, neighborhood condition, finances, health, the city's events), not an uncorrelated pool pick. Fix the existing engines; do not propose a new engine file.

Fold in two small items filed under engine.284: (a) `runCivicRoleEngine_` gates on the CIV flag with an exact `'y'` while the ledger spells `yes`, so it has never run for anyone; (b) births (`generationalEventsEngine.js`) and intake promotions (`processAdvancementIntake.js`) leave the UNI/MED/CIV flag columns blank. Your plan should say what the civic role engine becomes (wake as written, re-aligned to real events, or retired) and how mints should register flags.

## Builder rulings you must respect

- UNI / MED / CIV flags are deliberate canon guardrails and stay. On an ENGINE-clock row a flag excludes the citizen from the regular-life engines (household, career, education, relationship, neighborhood, generic micro-event). Retired A's players stay on UNI.
- ClockMode routes a citizen to their event kind. Universe (GAME) and media clocks cannot die; the civic clock is in the death roll. By design.
- Engine output is canon: a bug that fires is an event citizens lived. Dials follow events: fix the event engines, never retag texture. Rate and severity of success and failure are the dials, not gates.
- The sim has no real-world clock (`Y<n>C<m>`). The ledger is a tracked sample, never the city's denominator. Read `docs/SIM_DOCTRINE.md` before designing any mechanic.
- Sim calls (what citizens live, rates and severity, initiative design) belong to the builder — list them as numbered questions with your recommendation; do not decide them.

## Scope to read

`phase05-citizens/generateCitizensEvents.js` (`generateCitizensEvents_`), `phase04-events/generateGenericCitizenMicroEvent.js`, `phase05-citizens/runNeighborhoodEngine.js`, `phase05-citizens/runCivicRoleEngine.js`, `phase05-citizens/runAsUniversePipeline.js`, `phase04-events/generateGameModeMicroEvents.js`, `phase05-citizens/generateCivicModeEvents.js`, `phase05-citizens/generateMediaModeEvents.js`. You may run the wiring-card agent (`scripts/runEngineAgent.js`, agent `engine-wiring`) per target. Live data: read-only through `lib/sheets.js` or `output/simulation_ledger_snapshot.jsonl`.

## What to deliver

1. **Read-before** — per engine: which citizens it selects (clock, flag, tier gates), what it writes and where, what drives the draw today (state it reads vs a flat pool), and a live data point: how many lines it wrote to the ledger in the last cycles and whether those lines correlate with anything in the citizen's row.
2. **Plan** — the shape of the fix in tasks with file and function, tests, and the risks; what is bench-provable vs needs a live fire; how it composes with the dial machinery (a LifeHistory line moves a dial only if a reader scores it — find which tags are scored).
3. **Builder calls** — numbered, with your recommendation.
4. **Weakest assumptions** — the 2-3 you are least sure of and how you attacked them.

Rules: a row's or plan's own text is a claim, not evidence. "No evidence found" is an allowed answer — say where you looked.
