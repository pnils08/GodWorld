---
title: engine.299 Task 4C mode-writer patch delivery
created: 2026-10-18
updated: 2026-10-18
type: reference
tags: [engine, citizens, events]
sources:
  - docs/for-claude-review/2026-10-18-engine299-task4c-mode-writers-impl-TASK.md
  - docs/plans/2026-10-18-event-engines-move-dials.md
pointers:
  - engine299-task4c.patch
---

# Task 4C patch delivery — codex

Patch ready for review/application, not deployed. `engine299-task4c.patch` applies to both HEAD `182cb5a89561486b7add972e76706ff57fc0fe43` and the current working tree. The only repository writes by Codex are the two TASK-named deliverables. No commit, push, model call, cron, bench fire, canon execution or Sheet write. The TASK at line 3 is this generated pair's artifact manifest; no plan or index is modified in the shared checkout.

Implementation and tests ran in `/tmp/engine299-task4c-pjlzggzv/work`, a fresh HEAD archive overlaid with the tracked working-tree changes; `/tmp/engine299-task4c-pjlzggzv/base` retained the unpatched snapshot. The three explicitly protected dirty files are byte-identical to that snapshot: `phase05-citizens/generateCitizensEvents.js`, `phase05-citizens/runNeighborhoodEngine.js`, and `docs/plans/2026-10-18-event-engines-move-dials.md`. Other existing dirt, including citizenDialMap and scanner/test edits, was preserved. The patch contains no hunk for any of these dirty files.

## Result and change surface

Each mode writer resolves the selected primary's own delta first. Own-delta kinds keep their original tag. Inert kinds require exactly one valid, line-authored `dial:<dial>:<up|down>[:<band>]` tag; unsigned, malformed, conflicting metadata and unavailable resolver/helpers fail closed. Rejections increment `S.engine299.noDial` and `noDialBySource` before the stamp, LifeHistory, LastUpdated, log queue, details or eventsGenerated. Every graded annotation in this cut uses S. No source/role/rank/tier/ClockMode sets a sign. Pool selection odds and RNG consumption are unchanged.

LifeHistory_Log's EventTag is now the same tag written to LifeHistory, replacing GAME-Micro / MEDIA-Event / CIVIC-Event wrappers. Mode-specific summary details still identify the writer. Repository search found no active exact-wrapper log consumer requiring a coordinated change: the old GAME-Micro entry in `compressLifeHistory.js:224` is historical compatibility data; `scripts/engine-auditor/generateBaselineBriefs.js:42` is a comment. Graded base-kind handling remains in the existing resolver.

The essence data keeps every authored `tag` and `text` byte-for-byte unchanged, with 54 entries gaining metadata only. The seed executor grades only after its existing POPID + EventText author-once guard. The exact written tag is used for both appendRows and the newByPop re-derive input; old archive rows retain their old tag and are never retagged. Four unsigned essence entries remain data but are skipped/count on a future append. Existing historical biographies with their own deltas remain bare. No new life transition is authored.

Patch files:

- `phase04-events/generateGameModeMicroEvents.js`
- `phase05-citizens/generateMediaModeEvents.js`
- `phase05-citizens/generateCivicModeEvents.js`
- `utilities/tier1EssenceEvents.js`
- `scripts/seedTier1EssenceLive.js`
- `scripts/engine299ModeWriters.test.js`
- `docs/engine/TAG_REGISTRY.md`
- `docs/engine/EVENT_SYSTEM_MAP.md`
- `docs/engine/ENGINE_STUB_MAP.md`

The three existing truth docs are updated in the patch: TAG_REGISTRY, EVENT_SYSTEM_MAP, and the three STUB_MAP function contracts. The owning plan remains untouched as requested. No new production file or shared service is introduced; the only new patch file is the test.

## Source-verified wiring card

The TASK prohibits model calls, so this is a local source-verified card, not a model-generated engine-wiring receipt. All writer pointers below refer to the patched files, except explicitly named existing callers/readers.

| Seam | Evidence |
|---|---|
| Both scheduler entry points invoke GAME/CIVIC/MEDIA in Phase 5 | `phase01-config/godWorldEngine2.js:620`, `:638`, `:639`, `:2337`, `:2355`, `:2356` |
| GAME inert admission precedes history and log append | `phase04-events/generateGameModeMicroEvents.js:520`, `:541`, `:545`, `:556`, `:585` |
| MEDIA admission precedes history and log append | `phase05-citizens/generateMediaModeEvents.js:428`, `:449`, `:455`, `:463`, `:492` |
| CIVIC admission precedes history and log append | `phase05-citizens/generateCivicModeEvents.js:468`, `:489`, `:495`, `:503`, `:533` |
| History parser and same-Cycle fold read the written primary | `utilities/compressLifeHistory.js:777`, `:630`, `:1629` |
| Graded parse, magnitude and historical kind handling | `utilities/citizenDialMap.js:316`, `:322`, `:331`, `:340` |
| Seed author-once guard, grading, append and re-derive input | `scripts/seedTier1EssenceLive.js:127`, `:129`, `:145`, `:146` |
| Seed writer's real append requires apply; it was never executed against Sheets | `scripts/seedTier1EssenceLive.js:183`, `:188` |

## Validation

- `node --check` passes for all six changed/added JS files.
- `node scripts/engine299ModeWriters.test.js`: PASS; GAME 120, MEDIA 52, CIVIC 54 distinct lines exercised; 3,141 admitted mode outputs, 212 rejected selections. Exhaustive selection uses a VM replacement of the selection seam over actual generated pools; the unmodified selection path is also exercised. Conditional coverage includes sports seasons, all seven GAME archetypes, holidays, civic passed/failed votes, grants, factions, OARI, crime reader context, arc tension and load. Down fixtures remain Down; logs match cells; rejection leaves history, timestamp, dirty flag, log and eventsGenerated untouched. Missing helpers/resolver, invalid/conflicting dial metadata and own-delta Community have explicit assertions.
- The same test executes the full seed writer with an intercepted require graph and fake Sheets, including fake --apply append/readback/batch calls: 388 distinct future appends from the authored data, no inert tag, negative contract-pressure line Down, old bare historical tag preserved, unsigned count present, own-delta Community bare, repeat append count zero. This is local writer evidence, not a real write or a live persistence proof.
- Independent base-versus-patch essence comparison: every event's text and original tag identical, same per-citizen event count; 54 metadata additions. Four unsigned authored lines listed below.
- `node scripts/engine299Graded.test.js`: **12 passed, 0 failed** against the overlaid working tree.
- `GODWORLD_LEDGER_FAILS=0 npm test`: **282/292 files passed; 10 failed**, 147.94 seconds, offline-default runner. All 10 failures reproduced individually on the unpatched working-tree snapshot; none is newly attributable to this patch. The new mode-writer test passed within the suite on the final JS contents.

| Full-suite failure | Unpatched reproduction / bound |
|---|---|
| citizensEventsFame.t3 | Y.7 shared household moment assertion (0); existing dirty generator context |
| cron-civic-tick | subprocess `spawnSync node EPERM`; environment |
| deadBranchScan.offenders | expected syntheticEngine 2 vs actual 1; existing dirty scanner/test |
| dialWave2Seams | three hood trajectory assertions; existing dirty neighborhood context |
| employerSuccess | network `EAI_AGAIN`; environment, no unsandboxed test rerun |
| fireGuard | phase-order scanner subprocess yielded no slot count; environment |
| ingestEdition | subprocess fixture did not reach ingest loop / rerun message; environment |
| notebooklmSourceInventory | hardcoded `/root/GodWorld/output/codex` differs from isolated scratch path |
| rateEditionCoverage | subprocess output assertions; environment |
| undockedMintAccount | existing cast credential-presence assertion; credentials not copied into scratch |

Logs are in the scratch root: `mode-tests.log`, `graded-tests.log`, `npm-test.log`, `baseline-<test>.log`. No credentials were inspected or copied. The full suite was not rerun outside the sandbox.

- `git apply --check`: PASS against fresh HEAD files, frozen working-tree preimage, and actual `/root/GodWorld` working tree. Applied in the isolated HEAD check directory; all nine resulting files are byte-identical to the tested source. The new writer test also passes there with HEAD's citizenDialMap, independently of its current dirty version. No patch was applied to the shared checkout.

## Read-only offender scan, before and after

Command (run from base, then final work):

```sh
node scripts/deadBranchScan.js --offenders --sheet-id=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
```

The first sandboxed attempt failed DNS with EAI_AGAIN. Network-enabled read-only retries succeeded. The scanner implementation reads the bench LifeHistory_Log and the live Event_Content_Ledger, and writes only a scratch JSON report. Both successful scans report C112, 2,313 scanned log rows, 54 inert (2.3346%), 47 structural, 65 premise candidates and 20 life-verb candidates; incomplete=false, acceptanceEmpty=false. These are unchanged deployed-log observations, not patch output or bench proof.

Static code-site totals for the requested files: GAME 24→23, MEDIA 8→7, CIVIC 55→54, essence 0→0. The three removed sites are the wrapper log categories. The scanner is lexical: it still reports bare primary literals used as inputs to the admission guard (and Neighborhood header lookups); it does not follow metadata through grading. It does not scan essence inert sites in this run, so essence 0 is a coverage limitation, not proof. Writer-level tests provide the executable admission evidence. The scan remains nonempty; no global engine.299 completion claim is made.

Complete code-site list for these four files, grouped by literal (each number is an exact file line):

### Before

- `phase04-events/generateGameModeMicroEvents.js`: `Life` at 118, 249, 520; `Personal` at 142, 172, 223, 257, 304, 311, 318, 332; `Team` at 149, 290, 297, 325; `Civic` at 208, 229, 235, 241; `Season` at 263, 269, 275; `Holiday` at 426; `GAME-Micro` at 536.
- `phase05-citizens/generateMediaModeEvents.js`: `Neighborhood` at 56; `Personal` at 153, 233, 273, 274, 275, 276; `MEDIA-Event` at 443.
- `phase05-citizens/generateCivicModeEvents.js`: `Neighborhood` at 58; `Civic` at 127, 128, 129, 139, 141, 148, 153, 155, 160, 170, 171, 172, 173, 181, 182, 186, 187, 194, 197, 208, 209, 211, 215, 220, 233, 234, 240, 244, 246, 250, 260, 261, 262, 263, 269, 277, 283, 293, 294, 295, 296, 300, 327, 329, 337, 468; `Personal` at 130, 236, 310, 311, 312, 313, 320; `CIVIC-Event` at 483.
- `utilities/tier1EssenceEvents.js`: no reported sites.
### After

- `phase04-events/generateGameModeMicroEvents.js`: `Life` at 118, 249, 520; `Personal` at 142, 172, 223, 257, 304, 311, 318, 332; `Team` at 149, 290, 297, 325; `Civic` at 208, 229, 235, 241; `Season` at 263, 269, 275; `Holiday` at 426.
- `phase05-citizens/generateMediaModeEvents.js`: `Neighborhood` at 56; `Personal` at 153, 233, 273, 274, 275, 276.
- `phase05-citizens/generateCivicModeEvents.js`: `Neighborhood` at 58; `Civic` at 127, 128, 129, 139, 141, 148, 153, 155, 160, 170, 171, 172, 173, 181, 182, 186, 187, 194, 197, 208, 209, 211, 215, 220, 233, 234, 240, 244, 246, 250, 260, 261, 262, 263, 269, 277, 283, 293, 294, 295, 296, 300, 327, 329, 337, 468; `Personal` at 130, 236, 310, 311, 312, 313, 320.
- `utilities/tier1EssenceEvents.js`: no reported sites.

## Per-line authoring inventory

All signed entries below write `<Kind>-<Dial>-<Up|Down>-S`. UNSIGNED means no honest direction was assigned and selection is rejected/counts; it does not mean a bare line is written. Pool names for GAME are exact; line numbers for other files identify their original pool entries (their pool-line positions are unchanged). The dial selection expresses the line's meaning: recovery/strain → composure, seeking/learning → openness, making contact → sociability/warmth/family, effort → drive, public retreat/activity → outabout, stated accountability → integrity. Opposition by itself is not integrity: its effort line is drive. A passed or failed council measure without the citizen's stance is unsigned.

### `phase04-events/generateGameModeMicroEvents.js`

| Pool / site | Kind | Existing line / expression | Metadata |
|---|---|---|---|
| mlbPersonal | Personal | spent downtime away from the ballpark | dial:composure:up |
| mlbPersonal | Personal | caught up with family via video call | dial:family:up |
| mlbPersonal | Personal | enjoyed a quiet meal in the city | dial:composure:up |
| mlbPersonal | Personal | stepped away from baseball briefly | dial:outabout:down |
| mlbPersonal | Personal | ran personal errands around town | dial:outabout:up |
| mlbPersonal | Personal | spent time with friends outside the game | dial:sociability:up |
| mlbPersonal | Personal | enjoyed an off-day in Oakland | dial:composure:up |
| mlbTeamLife | Team | joined teammates for a team meal | dial:sociability:up |
| mlbTeamLife | Team | participated in clubhouse conversations | dial:sociability:up |
| mlbTeamLife | Team | connected with younger players | dial:warmth:up |
| mlbTeamLife | Team | shared a laugh with teammates | dial:warmth:up |
| mediaPersonal | Personal | decompressed after a long news cycle | dial:composure:up |
| mediaPersonal | Personal | caught up on industry reading | dial:openness:up |
| mediaPersonal | Personal | reflected on recent coverage decisions | dial:openness:up |
| mediaPersonal | Personal | maintained source relationships quietly | dial:sociability:up |
| civicWork | Civic | reviewed briefing materials | dial:drive:up |
| civicWork | Civic | attended internal policy meetings | dial:sociability:up |
| civicWork | Civic | consulted with department heads | dial:sociability:up |
| civicWork | Civic | prepared for upcoming public sessions | dial:drive:up |
| civicWork | Civic | addressed constituent concerns | dial:warmth:up |
| civicPersonal | Personal | found a quiet moment between obligations | dial:composure:up |
| civicPersonal | Personal | balanced public duties with personal time | dial:composure:up |
| civicPersonal | Personal | reflected on the weight of public service | dial:composure:down |
| civicPersonal | Personal | maintained composure under public scrutiny | dial:composure:up |
| mayorPool | Civic | navigated competing political pressures | dial:composure:down |
| mayorPool | Civic | considered long-term city priorities | dial:drive:up |
| mayorPool | Civic | met with key stakeholders privately | dial:sociability:up |
| councilPool | Civic | prepared for council deliberations | dial:drive:up |
| councilPool | Civic | met with district constituents | dial:sociability:up |
| councilPool | Civic | reviewed proposed legislation | dial:openness:up |
| staffPool | Civic | coordinated across departments | dial:sociability:up |
| staffPool | Civic | managed logistics for upcoming events | dial:drive:up |
| staffPool | Civic | handled sensitive communications | dial:integrity:up |
| publicFigureGeneral | Life | navigated being recognized in public | UNSIGNED |
| publicFigureGeneral | Life | maintained public composure | dial:composure:up |
| publicFigureGeneral | Life | handled attention with practiced ease | dial:composure:up |
| publicFigureGeneral | Life | found a moment of privacy | dial:outabout:down |
| publicFigureGeneral | Life | managed the demands of public life | dial:drive:up |
| publicFigurePersonal | Personal | enjoyed a rare quiet evening | dial:composure:up |
| publicFigurePersonal | Personal | connected with close friends | dial:sociability:up |
| publicFigurePersonal | Personal | took time for personal wellness | dial:composure:up |
| publicFigurePersonal | Personal | stepped back from the spotlight briefly | dial:outabout:down |
| publicFigurePersonal | Personal | appreciated a normal moment | dial:composure:up |
| championshipPool | Season | felt the city's championship energy | dial:fandom:up |
| championshipPool | Season | navigated heightened media attention | dial:composure:down |
| championshipPool | Season | noticed more fans recognizing them | UNSIGNED |
| playoffPool | Season | felt the city's postseason energy | dial:fandom:up |
| playoffPool | Season | noticed increased media presence | UNSIGNED |
| playoffPool | Season | sensed the heightened expectations | dial:composure:down |
| offseasonPool | Season | enjoyed the slower offseason pace | dial:composure:up |
| offseasonPool | Season | appreciated time away from the spotlight | dial:outabout:down |
| offseasonPool | Season | recharged during the break | dial:composure:up |
| Catalyst | Team | brought infectious energy to the clubhouse | dial:sociability:up |
| Catalyst | Team | sparked a lively conversation among teammates | dial:sociability:up |
| Catalyst | Team | rallied spirits during a team gathering | dial:warmth:up |
| Catalyst | Team | was the first to organize a group outing | dial:sociability:up |
| Anchor | Team | provided steady presence in the clubhouse | dial:composure:up |
| Anchor | Team | offered quiet counsel to a younger teammate | dial:warmth:up |
| Anchor | Team | maintained his routine with characteristic discipline | dial:drive:up |
| Anchor | Team | kept the team grounded during a hectic stretch | dial:composure:up |
| Watcher | Personal | observed the city from a quiet corner | dial:outabout:down |
| Watcher | Personal | took in the scene at a local establishment | dial:openness:up |
| Watcher | Personal | noticed details others missed around town | dial:openness:up |
| Watcher | Personal | spent time studying the rhythm of the neighborhood | dial:openness:up |
| Grounded | Personal | enjoyed a hearty meal at a neighborhood spot | dial:composure:up |
| Grounded | Personal | spent time in familiar surroundings | dial:openness:down |
| Grounded | Personal | found comfort in a simple routine | dial:composure:up |
| Grounded | Personal | appreciated the stability of home life | dial:family:up |
| Striver | Personal | worked on something beyond the baseball field | dial:drive:up |
| Striver | Personal | pursued a personal project with focus | dial:drive:up |
| Striver | Personal | studied film or read to sharpen his edge | dial:openness:up |
| Striver | Personal | channeled competitive energy into a side interest | dial:drive:up |
| Connector | Team | bridged conversations between different teammate groups | dial:sociability:up |
| Connector | Team | checked in with a teammate going through a tough stretch | dial:warmth:up |
| Connector | Team | organized something that brought the team closer | dial:sociability:up |
| Connector | Team | strengthened a bond with a fellow player | dial:warmth:up |
| Drifter | Personal | explored a part of Oakland he hadn't visited before | dial:openness:up |
| Drifter | Personal | wandered through the city with no particular destination | dial:outabout:up |
| Drifter | Personal | found an unexpected moment of solitude | dial:sociability:down |
| Drifter | Personal | let the afternoon unfold without a plan | dial:drive:down |
| holidayPublicPool | Holiday | participated in a holiday community event | dial:sociability:up |
| holidayPublicPool | Holiday | attended a holiday charity function | dial:warmth:up |
| holidayPublicPool | Holiday | reflected publicly on the year ahead | dial:openness:up |
### `phase05-citizens/generateMediaModeEvents.js`

| Pool / site | Kind | Existing line / expression | Metadata |
|---|---|---|---|
| line 273 | Personal | "stayed late at the newsroom, watching the city go dark through the window" | dial:outabout:down |
| line 274 | Personal | "skipped lunch and didn't notice until 4 PM" | dial:composure:down |
| line 275 | Personal | "walked home through the neighborhood instead of driving" | dial:outabout:up |
| line 276 | Personal | "thought about whether the work still matters the way it used to" | dial:drive:down |
| buildColumnistPool_ | Personal | reread old columns looking for a thread to pull | dial:openness:up |
| buildPhotographerPool_ | Personal | carried forty pounds of gear up three flights of stairs | dial:drive:up |
### `phase05-citizens/generateCivicModeEvents.js`

| Pool / site | Kind | Existing line / expression | Metadata |
|---|---|---|---|
| line 127 | Civic | "weighed competing priorities in the administration's agenda" | dial:drive:up |
| line 128 | Civic | "reviewed the latest approval numbers with senior staff" | dial:openness:up |
| line 129 | Civic | "held a private meeting with department heads" | dial:sociability:up |
| line 130 | Personal | "stepped away from City Hall for a quiet walk" | dial:composure:up |
| line 139 | Civic | "prepared signing remarks for the " + vote.name + " passage" | dial:drive:up |
| line 141 | Civic | "assessed political fallout from the " + vote.name + " failure" | dial:composure:down |
| line 148 | Civic | "received word on the " + grant.name + " federal decision" | UNSIGNED |
| line 153 | Civic | "faced mounting public frustration with City Hall" | dial:composure:down |
| line 155 | Civic | "felt cautious optimism about the city's direction" | dial:composure:up |
| line 160 | Civic | "felt the weight of multiple civic crises converging" | dial:composure:down |
| line 170 | Civic | "prepared for upcoming council session" | dial:drive:up |
| line 171 | Civic | "met with constituents about neighborhood concerns" | dial:sociability:up |
| line 172 | Civic | "reviewed policy briefs from committee staff" | dial:openness:up |
| line 173 | Civic | "navigated internal caucus dynamics" | UNSIGNED |
| line 181 | Civic | "voted on the " + vote.name + " — measure passed " + (vote.voteCount \|\| "") | UNSIGNED |
| line 182 | Civic | "fielded constituent calls about the " + vote.name + " passage" | dial:sociability:up |
| line 186 | Civic | "voted on the " + vote.name + " — measure failed " + (vote.voteCount \|\| "") | UNSIGNED |
| line 187 | Civic | "heard frustration from supporters of the " + vote.name | dial:composure:down |
| line 194 | Civic | "pushed back on administration priorities in caucus" | dial:drive:up |
| line 197 | Civic | "raised fiscal accountability concerns in committee" | dial:integrity:up |
| line 208 | Civic | "reviewed active case files with senior prosecutors" | dial:drive:up |
| line 209 | Civic | "coordinated with law enforcement on pending investigations" | dial:sociability:up |
| line 211 | Civic | "balanced prosecutorial priorities with limited resources" | dial:composure:down |
| line 215 | Civic | "addressed rising public concern about neighborhood safety" | dial:composure:down |
| line 220 | Civic | "weighed in on the alternative response initiative's legal framework" | dial:openness:up |
| line 233 | Civic | "reviewed department performance metrics with command staff" | dial:openness:up |
| line 234 | Civic | "approved patrol deployment adjustments" | dial:drive:up |
| line 236 | Personal | "reflected on the demands of leading a department under scrutiny" | dial:composure:down |
| line 240 | Civic | "directed additional resources to " + pickOne(hotspots) + " after elevated activity" | dial:drive:up |
| line 244 | Civic | "defended the focused enforcement strategy to community stakeholders" | UNSIGNED |
| line 246 | Civic | "reviewed community policing outcomes with district commanders" | dial:openness:up |
| line 250 | Civic | "coordinated with OARI implementation team on dispatch protocols" | dial:sociability:up |
| line 260 | Civic | "managed stakeholder expectations on project timelines" | dial:drive:up |
| line 261 | Civic | "reviewed budget projections with the finance team" | dial:openness:up |
| line 262 | Civic | "prepared status reports for council oversight committee" | dial:drive:up |
| line 263 | Civic | "balanced community demands with institutional constraints" | dial:composure:down |
| line 269 | Civic | "tracked developments on " + ie.name + " — " + ie.outcome | UNSIGNED |
| line 277 | Civic | "felt neighborhood tension affecting project momentum in " + neighborhood | dial:composure:down |
| line 283 | Civic | "stretched thin across competing institutional demands" | dial:composure:down |
| line 293 | Civic | "coordinated logistics across city departments" | dial:sociability:up |
| line 294 | Civic | "managed communications for upcoming public announcements" | dial:drive:up |
| line 295 | Civic | "reviewed scheduling conflicts for senior leadership" | dial:drive:up |
| line 296 | Civic | "handled sensitive constituent inquiries" | dial:warmth:up |
| line 300 | Civic | "managed post-vote communications for the administration" | dial:drive:up |
| line 310 | Personal | "found a quiet moment between obligations" | dial:composure:up |
| line 311 | Personal | "reflected on the cost of public service" | dial:composure:down |
| line 312 | Personal | "caught up with family after a long day" | dial:family:up |
| line 313 | Personal | "balanced the weight of the office with personal needs" | dial:composure:up |
| line 320 | Personal | "balanced " + (S.holidayLabel \|\| holiday) + " obligations with public duties" | dial:composure:down |
| line 327 | Civic | "sensed growing public discontent with city leadership" | dial:composure:down |
| line 329 | Civic | "noted a wave of civic optimism across the city" | dial:composure:up |
### `utilities/tier1EssenceEvents.js`

| Pool / site | Kind | Existing line / expression | Metadata |
|---|---|---|---|
| line 46 | Daily | A quiet life off the field with Amara between road trips — the part no box score measures. | dial:family:up |
| line 47 | Background | Stood in the loudest moments in franchise history and felt the air go still. | UNSIGNED |
| line 48 | Personal | The joy is in the swing — the half-second the ball leaves the world. | dial:warmth:up |
| line 64 | Background | Command over power — deconstructs lineups batter by batter, like a chemist breaking down molecules. | dial:openness:up |
| line 73 | Personal | Drawn to the invisible patterns — a scientist’s curiosity for how things really work. | dial:openness:up |
| line 86 | Background | Doesn’t get loud, doesn’t chase — rookies talk for twenty minutes; he asks the one right question. | dial:warmth:up |
| line 88 | Daily | A quiet watcher — comfortable in a clubhouse, not at a podium. | dial:outabout:down |
| line 141 | Lifestyle | A student of the game’s angles, on and off the field. | dial:openness:up |
| line 144 | Background | A measured presence in the clubhouse. | dial:composure:up |
| line 159 | Lifestyle | A student of the game’s geometry — sees the angles in everything. | dial:openness:up |
| line 160 | Background | Machine-steady; the same flawless glove every night. | dial:composure:up |
| line 195 | Background | Quietly dominant — lets the game come to him. | dial:composure:up |
| line 211 | Background | Says little; lets the work speak. | dial:sociability:down |
| line 227 | Background | Quiet, steady, no spotlight. | dial:composure:up |
| line 246 | Background | Composed beyond his years for a young arm. | dial:composure:up |
| line 247 | Personal | Open, curious, hungry to improve. | dial:openness:up |
| line 260 | Background | Carries the weight of the contract every at-bat. | dial:composure:down |
| line 261 | Personal | Swinging for the ceiling that justified the gamble. | dial:drive:up |
| line 273 | Background | Settling into a new clubhouse. | UNSIGNED |
| line 288 | Daily | A settled life after baseball. | dial:composure:up |
| line 289 | Background | Carries the calm of a man who already proved it. | dial:composure:up |
| line 305 | Daily | Two glasses on the terrace at Lake Merritt, watching the lake go dark. | UNSIGNED |
| line 306 | Daily | A quiet, settled life — morning walks, Sunday chili. | dial:composure:up |
| line 308 | Background | The steady one; fixes things slowly and perfectly. | dial:composure:up |
| line 326 | Lifestyle | No insurance, no plan — the artist’s life, lived for the next image. | UNSIGNED |
| line 327 | Personal | Sees what others overlook; open to everything. | dial:openness:up |
| line 343 | Background | Self-contained, composed; keeps her own counsel. | dial:composure:up |
| line 359 | Background | Measured, deliberate — a planner’s composure. | dial:composure:up |
| line 377 | Background | Steady under the weight of two front offices. | dial:composure:up |
| line 394 | Background | Centered, unhurried, attuned. | dial:composure:up |
| line 396 | Lifestyle | Lives by wellness and intention. | dial:composure:up |
| line 410 | Personal | Always chasing the quiet story behind the loud one. | dial:drive:up |
| line 456 | Background | Measured, unflashy, effective. | dial:composure:up |
| line 473 | Background | Measured, deliberate — every word on the record chosen. | dial:composure:up |
| line 490 | Background | Measured in every public statement. | dial:composure:up |
| line 510 | Lifestyle | Open to new approaches; the old answers haven’t worked for everyone. | dial:openness:up |
| line 525 | Background | Measured, deliberate, scrutinizing. | dial:composure:up |
| line 541 | Background | Measured — listens to all sides before he moves. | dial:openness:up |
| line 558 | Background | Measured, deliberate, his own counsel. | dial:composure:up |
| line 559 | Personal | Curious, independent-minded; thinks it through. | dial:openness:up |
| line 598 | Background | Measured, deliberate — the foundation before the structure. | dial:composure:up |
| line 618 | Background | Measured — describes every step on the record. | dial:integrity:up |
| line 635 | Background | Methodical — the milestones in order, none skipped. | dial:drive:up |
| line 653 | Background | Measured, exact — every gate documented. | dial:integrity:up |
| line 685 | Background | Knows the rhythm of the seasons the way sailors learn tides. | dial:openness:up |
| line 708 | Team | Lives in the stands and the bars where the games actually get felt. | dial:outabout:up |
| line 709 | Personal | Confessional and confrontational by turns — the heat is the point. | dial:composure:down |
| line 730 | Personal | Curious about the questions that don’t have clean answers. | dial:openness:up |
| line 731 | Background | Deliberate and unhurried in his judgments. | dial:composure:up |
| line 748 | Background | Precise and unhurried — built on sourced facts, never vague. | dial:integrity:up |
| line 771 | FirstFriday | The First Friday art walk is her beat — she works it block by block. | dial:outabout:up |
| line 774 | Background | Even-keeled, present, unhurried. | dial:composure:up |
| line 795 | Personal | Curious about how the whole economic loop turns. | dial:openness:up |
| line 814 | Background | Measured, exact, unflappable under stonewalling. | dial:composure:up |
| line 832 | PrevEvening | Out shooting the city’s nights, the light no one else waited for. | dial:outabout:up |
| line 834 | Background | A steady eye; thirty years of making the frame count. | dial:composure:up |
| line 855 | PrevEvening | Files from the bar stool at Eli’s Mile High, last night’s city still on him. | dial:outabout:up |
| line 856 | FirstFriday | Out in the city’s nights, watching who shows and who doesn’t. | dial:outabout:up |

The unsigned essence lines are the air going still (Background), settling into a clubhouse (Background), two glasses on the terrace (Daily), and an artist's no-insurance/no-plan lifestyle (Lifestyle). These do not specify a personal reaction strongly enough to choose a direction; their text remains untouched. Other entries of those same kinds are individually signed, never assigned a kind-wide default.

Own-delta pools (GAME Public/Work; MEDIA Media/Public and other own-delta kinds; CIVIC Public; essence Career, Community, Cultural, Reputation, Promotion, etc.) retain bare tags. Their existing direction is intentionally not replaced by this cut.

## Life-transition boundary and remaining limits

No GAME, MEDIA or CIVIC line in this cut creates a divorce, promotion, layoff, marriage, birth, death, hospitalization or move. Existing essence is authored biography, not an event generator. The scanner reports 16 pre-existing Promotion-tag sites, explicitly allowlisted as authored essence; they remain bare and unchanged. The following authored major-history entries are reported rather than signed or rewritten:

| Existing essence line | Tag | Authored text (unchanged) |
|---|---|---|
| 37 | Wedding | Married Amara Olsen, a pianist, in a quiet ceremony — the life that isn’t baseball. |
| 40 | Promotion | Hit the home run that won the 2031 World Series — nobody in the Coliseum sat down for nine minutes. |
| 67 | Promotion | Five Cy Young Awards; two hundred wins — “The Golden Arm.” |
| 71 | Wedding | Married Maya Torres barefoot on the beach where his father caught his last surf. |
| 72 | Birth | Son Rick Dillon Jr., named for his father. |
| 108 | Promotion | Won the Oakland Oaks NBA expansion franchise; building the city’s next chapter on a clock. |
| 136 | Promotion | Won the 2040 Home Run Derby. |
| 154 | Promotion | Three-time MVP (2032, 2034, 2035) — “The Machine.” |
| 155 | Promotion | Rookie of the Year, ten-time All-Star, eight Silver Sluggers, a batting title; inner-circle Hall of Fame. |
| 173 | Promotion | 2040 MVP (.293/38/107) — after hitting .186 in 2039. The redemption season. |
| 190 | Promotion | The best player in baseball — 99 overall, 8.0 WAR. |
| 191 | Promotion | Three-time All-Star, Silver Slugger — perfect in center field. |
| 257 | Promotion | Home Run Derby winner, 2039 — raw, prodigious power. |
| 304 | Wedding | Married to Mags Corliss; holds her hand on their morning lake walks. |
| 375 | Promotion | Holds a dynasty’s window open; a historic legacy taking on a new chapter. |
| 434 | Promotion | Won the mayoralty; leads Oakland through its biggest decisions. |
| 471 | Promotion | Took the DA’s office on a record of hard, clean convictions. |
| 577 | Promotion | Built the crisis-response program from a mobile pilot into a citywide deployment. |
| 616 | Promotion | Got the Community Benefits Agreement signed — not pending, executed. |
| 650 | Promotion | Carries a multibillion-dollar redevelopment from milestone to milestone. |

Existing `seedTier1Essence.js` is an authored-bare-tag preview harness, not the future append executor; this patch does not claim its old target-band QA is updated to the new append behavior. The live seed script still has its existing --apply authority and full re-derive behavior; this delivery authorizes no execution of it. Historical bare tags stay inert; no stored row is migrated. Real Sheets typed readback, production deploy, bench fire, population effects and the next Cycle remain unverified.

## Preimage checksums

SHA-256 of each existing patch target at delivery (the new test has no preimage):

- `phase04-events/generateGameModeMicroEvents.js`: `d03dcbc01dc4a989fbd00304b40bca1034b0699366a2bf9079ff420b404c5bf8`
- `phase05-citizens/generateMediaModeEvents.js`: `12817388eaee6206ab4dbdb918a089bb6142a8362068a54eac6b8ecd875a0149`
- `phase05-citizens/generateCivicModeEvents.js`: `937a03f84564196bdc47d3ec762202a5c9ee1cf27a89bd7873adae69489b5a6f`
- `utilities/tier1EssenceEvents.js`: `a3735b8c63fe7cac344e495dfb6c6adb8775ff918b1cde49a5178862c5aeed37`
- `scripts/seedTier1EssenceLive.js`: `8a0cad1a078469a996ac569708b0b5459ae96f172b9408699d91870cb9d773d4`
- `docs/engine/TAG_REGISTRY.md`: `1e746bf98d95e20fc6037bc0b94dd906686c8e11f02550ba90e6b8c037ecf832`
- `docs/engine/EVENT_SYSTEM_MAP.md`: `5eb593a5da81d1865bdae0bc2389ab5e56f834c2de8ba7f972a333e88b717af5`
- `docs/engine/ENGINE_STUB_MAP.md`: `bee6ac61cbe097bc546f4cd9e57525309406905ab8807cd11a5eba064f513d23`
