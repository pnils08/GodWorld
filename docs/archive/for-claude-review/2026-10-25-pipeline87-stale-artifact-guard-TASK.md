# TASK — adversarial review: stage artifacts must be today's (pipeline.87)

- **Lane:** antigravity (read-only; write only `output/antigravity/2026-10-25-review-pipeline87-stale-artifact-guard.md`)
- **Owner / lander:** research-build
- **Target:** the UNCOMMITTED working-tree diff of `scripts/cron-desk-run.js` (`git diff -- scripts/cron-desk-run.js`, ~25 lines). Review that diff, not HEAD.
- **Live urgency:** the Ines Sorensen Sunday report fires at 09:15 CDT and the write at 12:15; the crons run the working tree, so this guard is already what they will execute.

## What happened

Ines's Sunday 06:15 angle (W1) failed three times (`logs/ines-weekend.log` from line 229): `meta-llama/llama-4-maverick` echoed the packet's fact lattice instead of a plan on a two-fact Voices slice. No `culture_c112_ines-sorensen_packet-v2_angle.json` was written today — but Saturday's (10-24 07:15, same stem, same Cycle 112) is still on disk. The report stage checked only `fs.existsSync(anglePath)` (`cron-desk-run.js` ~line 2652; write stage ~2822–2823), so at 09:15 it would have planned Sunday's quotes on Saturday's plan and at 12:15 filed a second piece on it.

## The change

`requireFreshArtifact(p, label, runStage, now)` next to `readJson`: missing → the old error text; older than `ARTIFACT_MAX_HOURS` (20) → `stale <label> artifact … not filing on yesterday's plan`. Used at the report stage (angle) and the write stage (angle + packet). Exported for tests. Verified by hand: fresh passes, 19.9h passes, 21h throws, missing throws, and the live Saturday angle is rejected.

## Hunts

1. **The 20h window vs every real schedule.** Weekday fanout: angle 06:15 → report 13:15 → write 18:15. Weekend seats: Ines Sat 07:15/09:15/11:15, Sun 06:15/09:15/12:15; UNDOCKED digest Sat 08:15/09:15/10:15. The Saturday 12:00 sweep and `cron-saturday-run.js` — do any of them re-run a write stage against an angle/packet older than 20h on purpose (a retry of Friday's seat on Saturday)? Grep for `--stage=write` callers and reconcile/retry paths. A legitimate >20h path is a HOLD.
2. **Clock skew / mtime semantics.** `fs.statSync(p).mtimeMs` vs `Date.now()`; anything that copies or touches these artifacts after the stage writes them (deliver, reconcile, archive, the 12:00 sweep) and would refresh an old file's mtime into the window?
3. **Evaluation stems.** `--evaluation-tag` runs write to a tagged stem via `evaluationStem(...)`; does the guard change their behaviour (they also go stale between tagged runs)?
4. **Error surface.** When the guard throws at 09:15 for a `--persona` weekend run, what does the caller print and exit, and does anything downstream (deliver-articles 12:45, the fanout summary, grading) misread a thrown stage as something other than "sat out"?
5. **Scope.** Any other stage/consumer that reads `angle.json` / `packet.json` by stem without a freshness check (grep `angle.json`, `packet.json`, `anglePath`, `packetPath`)?

## Format

Findings numbered, file:line, severity, verified repro or "could not verify". End SHIP / SHIP-WITH-FIXES / HOLD. No code edits, no Sheets, no cron, no network.
