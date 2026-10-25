# Adversarial Review — `pipeline.87` Stale Stage Artifact Guard (`scripts/cron-desk-run.js`)

- **Reviewer:** `antigravity`
- **Date:** 2026-10-25
- **Target:** Uncommitted working-tree diff of `scripts/cron-desk-run.js` (`requireFreshArtifact`, `ARTIFACT_MAX_HOURS = 20`)
- **Task Spec:** `docs/for-claude-review/2026-10-25-pipeline87-stale-artifact-guard-TASK.md`

---

## Live Urgency Note (09:15 / 12:15 CDT Ines Sorensen Sunday Crons)

For today's live Sunday crons (`--desk culture --persona ines-sorensen --stage=report` at 09:15 and `--stage=write` at 12:15), **leave the working-tree guard in place across 09:15 and 12:15**:
- On disk right now, `output/cron-compare/culture_c112_ines-sorensen_packet-v2_angle.json` has `mtime` `2026-10-24 07:15:44 -0500` (`26.0h` old at 09:15, `29.0h` old at 12:15) and `packet.json` has `mtime` `2026-10-24 09:16:45 -0500` (`27.0h` old at 12:15).
- At both 09:15 and 12:15, `requireFreshArtifact` will throw at `scripts/cron-desk-run.js:2668` / `2838` before any quote pass, writer call, Rhea gate, staging, or grading occurs.

However, per Hunt 1's explicit criterion (*"A legitimate >20h path is a HOLD"*), the diff as written cannot ship without a fix because it breaks 100% of Saturday 12:00 `preSaturdayCoverageSweep.js` write retries and >20h `--regate` / `--date` recovery runs.

---

## Findings

### 1. [HIGH / HOLD] `scripts/preSaturdayCoverageSweep.js` (Saturday 12:00 cron) legitimately invokes `--stage=write` on Monday–Friday artifacts that are always >20h old (`22.75h–125.75h`)
- **Where:** `scripts/preSaturdayCoverageSweep.js:58,70-87,166-167,189-205`; `scripts/cron-desk-run.js:237-247,2838-2839`; `docs/OPERATIONS.md:57` (`0 12 * * 6`).
- **Mechanism:** Every Saturday at 12:00 CDT, `preSaturdayCoverageSweep.js` finds any live-cycle report-complete seat (`<desk>_c<cycle>_<persona>_packet-v2_story.md` with `reportAgeHours >= 8`) that has no `.staged.*` file, and spawns:
  ```bash
  node scripts/cron-desk-run.js --desk <desk> --persona <persona> --stage=write --gate-backend api
  ```
  Because weekday fanout runs Monday–Friday (angle `06:15`, report `13:15`, write `18:15`), **even Friday's artifacts are `29.75h` old (`angle.json`) and `22.75h` old (`packet.json`) by Saturday 12:00**. Monday–Thursday seats are `53.75h–125.75h` (`angle.json`) and `46.75h–118.75h` (`packet.json`) old.
  Worse, `preSaturdayCoverageSweep.js:197,216` adds `r.stem` to `.pre-saturday-sweep-attempted-c<cycle>.json` before `execFileSync` and saves the attempted set even when the child process exits non-zero — so `requireFreshArtifact` both kills every Saturday sweep retry and permanently burns the seat's one-shot retry for the cycle.
- **Verified Repro (from yesterday's live Saturday 12:00 run, 2026-10-24):**
  - `logs/pre-saturday-sweep.log:95` and `output/pre-saturday-sweep-status.json:9-16` show `preSaturdayCoverageSweep.js` retried `sports_c112_hal-richmond_packet-v2` at `2026-10-24T17:00:04Z` when Hal Richmond's Thursday `packet.json` (`2026-10-22 13:16:15 -0500`) was **46.7h old** and `angle.json` (`2026-10-22 06:16:32 -0500`) was **53.7h old** (it passed Rhea `4/4` and staged).
  - Running the new `requireFreshArtifact` against Hal's live C112 `angle.json` at Saturday's sweep timestamp (`Date.parse('2026-10-24T17:00:04.945Z')`) throws:
    `stale angle artifact at output/cron-compare/sports_c112_hal-richmond_packet-v2_angle.json (written 2026-10-22T11:16:32.874Z, 53.7h ago; max 20h) — today's --stage=angle did not land; not filing on yesterday's plan`

### 2. [MEDIUM] Built-in W3 recovery paths (`--regate` and `--date YYYY-MM-DD --only "<name>"`) throw when run >20h after W1
- **Where:** `scripts/cron-desk-run.js:131-134, 2838-2839, 2951, 2992-2996, 3500-3503, 3596`.
- **Mechanism:**
  1. `--regate` (`line 134, 2992`) re-runs W3's gate and routing on a draft and `.state.json` already on disk without calling the writer. Because `requireFreshArtifact` runs at `lines 2838-2839` before `if (REGATE)` (`lines 2951, 2992`), running `--regate` the next day (`>20h` after the `06:15` angle wake, i.e. after `02:15` the next morning) throws on `anglePath`.
  2. `runFanoutStage()` (`line 3500`) supports `--date YYYY-MM-DD --only "<name>"` (`replays a past day's rotation (a missed seat re-run with --only)`), and `notifyFanoutFailures` (`line 3596`) prints the Discord recovery command `cron-desk-run.js --stage=write --fanout --only "<name>" --gate-backend api`. If an 18:15 weekday write fails and the operator runs that recovery command after `02:15` the next morning (`>20h` after 06:15 W1), `requireFreshArtifact(anglePath)` rejects it.
- **Verified Repro:** `runWrite()` calls `requireFreshArtifact(anglePath, 'angle', 'angle')` at line 2838 unconditionally before checking `REGATE` or any retry flag.

### 3. [LOW] Clock skew / mtime semantics: no external cron refreshes `angle.json` / `packet.json`, but `runWrite`'s legacy last-chance quote branch rewrites `packet.json` at W3, and `mtimeMs` ignores `artifact.ranAt`
- **Where:** `scripts/cron-desk-run.js:240-245, 2905`.
- **Mechanism:**
  - Inspected `deliver-articles.js`, `reconcileRheaDisposition.js`, `preSaturdayCoverageSweep.js`, `cron-saturday-run.js`, `compactCycleOutput.js`, `weekly-maintenance.sh`, and `backup.sh`: **none** of them copies, touches, or modifies `<stem>angle.json` or `<stem>packet.json` (`runWrite` appends to `<stem>story.md` at line 3278, which refreshes `story.md` only).
  - Inside `cron-desk-run.js:2905`, the legacy `!PACKET_ACTIVE && !quotes.length` W3 last-chance quote pass calls `fs.writeFileSync(packetPath, ...)`, refreshing `packet.json`'s `mtimeMs` at 18:15 without updating `packet.ranAt` (dormant on live ADR-0017 packages where `PACKET_ACTIVE === true`).
  - Both `angle.json` (`line 2290`) and `packet.json` (`line 2710`) carry `ranAt` ISO timestamps (already validated for ordering by `validateWakeHandoff` at `lines 267-271`). Checking `fs.statSync(p).mtimeMs` alone means a `git checkout` or file copy refreshes `mtimeMs` even when `ranAt` is days old.

### 4. [LOW] Evaluation stems (`--evaluation-tag`) inherit the 20h cutoff
- **Where:** `scripts/cron-desk-run.js:1320-1350, 2663, 2832`.
- **Mechanism:** `runReport` and `runWrite` compute `stem = evaluationStem(wakeStageStem(...), EVALUATION_TAG)` before calling `requireFreshArtifact`.
- **Impact:** Reusing `--evaluation-tag <tag>` across days now fails closed if a tagged W1 fails (good), but re-running `--stage=write --evaluate-package <pkg> --evaluation-tag <tag> --no-gate` >20h after freezing a tagged W1+W2 benchmark pair will now throw unless the files are touched or a bypass flag is used.

### 5. [LOW] Error surface at 09:15 / 12:15 is clean downstream; `notebooklmDailyRouter.js` and `newsroom-digest.js` read `angle.json` / `packet.json` across a 36h window without checking handoff order
- **Where:**
  - Error surface (clean): `scripts/cron-desk-run.js:1462-1473, 1534-1540, 2667-2668, 2837-2839, 3537-3560, 3647-3655`; `scripts/deliver-articles.js:97-130`.
    - At 09:15 and 12:15 today, `seatSitsOut('ines-sorensen', 112, stage)` returns `false` (her C112 Voices slice has 2 facts / 2 people, `logs/ines-weekend.log:230`), `requireFreshArtifact` throws, and top-level `.catch` (`line 3654`) prints `[run] Fatal: stale angle artifact ...` to `logs/ines-weekend.log` and exits `1`.
    - `deliver-articles.js` at 12:45 scans `staged/` and `flagged/` for `.md` files modified in the last 8h (`deliver-articles.js:98,112`); since `runWrite` exits at line 2838 before writing any draft/staged/flagged file, 12:45 prints `nothing new to deliver` and exits `0`.
    - Grading (`rewardLoop`, `cron-desk-run.js:3222-3234, 3270-3276`) is never reached; Ines's Saturday `graded: 4/4` page entry is untouched.
    - In weekday `--fanout` mode (`lines 3537-3560`), a thrown stage records `ok: false, checks: null`; `fanoutCheckTotals` (`line 1463`) filters `null` out via `.filter(Boolean)` so check/grade averages are not skewed, and `notifyFanoutFailures` sends the Discord alert.
  - Scope — other `angle.json` / `packet.json` readers (`scripts/notebooklmDailyRouter.js:218-248`, `scripts/newsroom-digest.js:40-54`):
    - Both scan `output/cron-compare/` over a 36h window and join `angle.json`, `packet.json`, and `wake.json` by stem without checking `packet.ranAt > angle.ranAt` or `wake.ranAt > packet.ranAt`. If a multi-day seat (`ines-sorensen`, `tamsin-pruitt`, `nia-rook`) succeeds at W1 on Day 2 (overwriting `<stem>angle.json`) and fails at W2, both surfaces pair Day 2's `angle.json` with Day 1's `packet.json` and `wake.json` for the remainder of the 36h window.
  - Test coverage gap: `scripts/cronDeskFanoutHandoff.test.js` does not yet exercise `requireFreshArtifact`.

---

## Recommended Fix Before Committing `pipeline.87`

To satisfy both the multi-day seat guard (Ines / Tamsin / Nia never re-filing on yesterday's already-spent plan) and legitimate >20h W3 retries (`preSaturdayCoverageSweep.js`, `--regate`, manual `--stage=write` retries):

1. **Block consumed handoffs at `runReport` and `runWrite`:** If a `.wake.json` (or staged/flagged filing) for this stem already has `ranAt > angle.ranAt` (at `runReport`) or `ranAt > packet.ranAt` (at `runWrite`), the W1/W2 handoff was already consumed by a prior W3 run — refuse immediately (*"angle/packet already consumed by wake at <timestamp>"*), regardless of age.
2. **Exempt `REGATE` and explicit retry callers from the 20h wall at `runWrite` (or pass `--allow-stale-artifact` from `preSaturdayCoverageSweep.js`):**
   - At `runReport`: `angle.json` must always be fresh (`<= 20h`) and unconsumed.
   - At `runWrite`: if `REGATE` is set or `--allow-stale-artifact` is passed by `preSaturdayCoverageSweep.js:201-205` (where the artifact is an unconsumed same-cycle W1+W2 pair), skip the 20h mtime cutoff while keeping `validateWakeHandoff` (`packet.ranAt > angle.ranAt`, same `cycle`, same `persona`) and the unconsumed-wake check active.
3. **Add unit tests** for `requireFreshArtifact` in `scripts/cronDeskFanoutHandoff.test.js`.

**Verdict: HOLD**
