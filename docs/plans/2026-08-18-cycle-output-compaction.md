---
title: Cycle Output Compaction Plan
created: 2026-08-18
updated: 2026-08-18
type: plan
tags: [architecture, infrastructure, draft]
sources:
  - docs/engine/ROLLOUT_PLAN.md (governance group)
  - lib/getCurrentCycle.js — canonical live-cycle resolver (engine.81, S336)
  - Mike-direct 2026-08-18 (research-build session): "compact will be once the
    cycle data is x cycles old... compacting them in the first few cycles maybe
    drop valuable insight needed but having that as a safe background on the
    cycle output is great in case it every needs to be opened"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[../SCHEMA]] — doc conventions"
  - "[[../index]] — add entry in same commit"
---

# Cycle Output Compaction Plan

**Goal:** cycle-tagged files under `output/` that only serve the pipeline stage that produced them — and are never read again once a cycle closes — get folded into one `.tar.gz` per cycle once that cycle is old enough that nothing needs it raw, so disk footprint and future git-commit size stay bounded instead of growing linearly with cycle count forever.

**Architecture:** one new script, `scripts/compactCycleOutput.js`. It resolves the live cycle via `lib/getCurrentCycle.js`, scans an explicit allow-list of cycle-tagged source paths under `output/`, groups matched files by cycle number, and for every cycle at least `THRESHOLD` (default 5) cycles behind live with no existing archive: tars+gzips its files to `output/archive/cycle-output/c{N}.tar.gz`, verifies the archive lists the same file count it swept, then deletes the raw files (and `git rm --cached` any that are tracked). It does not commit — same as every other cron today, the compacted result sits in the working tree until the next session's normal sweep, same pattern already in place for `output/`. Runs weekly via cron, dry-run by default, `--apply` to actually compact.

**Terminal:** research-build (design) → engine-sheet (build + cron wire), per `(engine terminal)` tag — this is a new script (S296 fix-don't-add applies), needs Mike's go-ahead on this concrete shape before the build task runs.

**Pointers:**
- Prior work: session diagnosing `notebooklmDailyNews.js` archive-query failure (2026-08-18) surfaced the disk/git growth conversation this plan answers.
- Related: `docs/adr/` — this earns an ADR once built (load-bearing: changes the durability guarantee CLAUDE.md states for `output/`, from "raw file, git-tracked" to "compacted archive, git-tracked" past the threshold).

**Acceptance criteria:**
1. `node scripts/compactCycleOutput.js --dry-run` against the live tree reports the cycle→file-count breakdown matching the discovery pass below (no surprises, no directories touched outside the allow-list).
2. `--apply` on an eligible cycle produces a `.tar.gz` that `tar -tzf` lists with the exact file count swept, and the raw files are gone from disk and (if tracked) from the git index.
3. Re-running `--apply` on an already-archived cycle is a no-op (doesn't re-tar, doesn't error).
4. `output/recovered/` is never touched by any run, dry or applied — it's Aug-11-wipe disaster-recovery material, not routine cron scratch, and compacting it works against the reason it exists (Mike/anyone should be able to open any of those 21 recovered artifacts directly, always).
5. Nothing fires while `cycleCount` is frozen at C103 (current state) — first real compaction only happens once C104+ resumes and a cycle crosses the threshold.

---

## Discovery (verified 2026-08-18, this session)

Two shapes of cycle-tagged path found under `output/` via `find` + pattern match — this is the allow-list, not "everything under output/":

**(a) Filename embeds `_cNNN_` or `_cNNN.`:**
- `output/cron-compare/` (+ `flagged/`, `flagged/history/`, `samples/`, `staged/` subdirs) — desk fanout packets, angle/arc/asks/story/state/tooltrace files. 432 files, 3.7M as of this session.
- `output/cron-civic/`, `output/cron-civic/packets/`, `output/cron-civic/packs/` — civic council/staff packs, gate files. 396K.
- `output/civic-voice/`, `output/civic-voice-packets/`
- `output/city-civic-database/initiatives/{baylight,health-center,oari,stabilization-fund,transit-hub,youth-apprenticeship}/`
- `output/exchanges/`, `output/mara-directives/`

**(b) Literal `cNNN/` directory:**
- `output/cron-civic/staged/c103/`
- `output/notebooklm/daily/c103/`, `output/notebooklm/daily/c90/` (audio already stripped per the 2026-08-18 audio-retention fix — these are now source-pack.md + archive-continuity.md + manifest.json, small)
- `output/slices/c103/`

**Explicitly excluded:**
- `output/recovered/` — Aug-11-wipe recovery set, disaster-recovery material, never routine scratch. Never compact.
- Anything date-stamped rather than cycle-stamped (`output/cron-compare/digest-YYYY-MM-DD.md`, `fanout-YYYY-MM-DD.*.json`) — different retention question (daily cron cadence, not cycle cadence), out of scope for this plan. Note for a future pass, don't fold in here.

---

## Tasks

### Task 1: Discovery + dry-run report

- **Files:**
  - `scripts/compactCycleOutput.js` — create
- **Steps:**
  1. Resolve live cycle: `const cycle = require('./lib/getCurrentCycle')({ soft: true })`.
  2. Define the allow-list of source globs from the Discovery section above as a literal array in the script (not a dynamic `output/**` walk — the allow-list IS the safety boundary).
  3. For each allow-listed path, extract cycle number via `_c(\d+)[_.]` or `/c(\d+)/` regex; group file paths by cycle number.
  4. Print a table: cycle N → file count → total bytes → eligible (bool, `live - N >= THRESHOLD`) → already-archived (bool, `output/archive/cycle-output/c{N}.tar.gz` exists).
- **Verify:** `node scripts/compactCycleOutput.js --dry-run` → table matches the Discovery counts above for c103 (currently ineligible, `live - 103 = 0 < 5`).
- **Status:** [ ] not started

### Task 2: Apply-mode compaction

- **Files:**
  - `scripts/compactCycleOutput.js` — modify
- **Steps:**
  1. For each eligible, not-yet-archived cycle: `tar czf output/archive/cycle-output/c{N}.tar.gz <matched files, relative paths>`.
  2. Verify: `tar tzf` the new archive, compare entry count to the swept file count — abort that cycle (leave raw files in place, delete the partial archive) on mismatch.
  3. On verified match: `fs.unlinkSync` each raw file; for any that `git ls-files` shows as tracked, `git rm --cached --quiet` (index only — the file is already gone from disk from the prior step).
  4. Log per-cycle: files compacted, bytes reclaimed, archive path.
- **Verify:** on a synthetic test cycle (copy a handful of real c103 files to a scratch `output/` tree under a fake low cycle number, run against it) — archive is valid, raw files gone, re-run is a no-op.
- **Status:** [ ] not started

### Task 3: Safety guards

- **Files:**
  - `scripts/compactCycleOutput.js` — modify
- **Steps:**
  1. Hard-fail (no compaction, exit 1) if `getCurrentCycle({soft:true})` returns null — never guess the live cycle.
  2. Hard-fail if any resolved file path, after `path.resolve`, falls outside `output/` — belt-and-suspenders against a regex mismatch reaching outside the sandbox.
  3. Explicit denylist check: skip (log, don't error) any path under `output/recovered/` even if a future allow-list edit accidentally includes it.
- **Verify:** unit test or manual run confirms all three guards trip correctly on crafted bad input.
- **Status:** [ ] not started

### Task 4: Cron wire

- **Files:**
  - crontab — modify (via `crontab -e` or the project's cron-management path)
- **Steps:**
  1. Add weekly off-peak slot, e.g. `30 22 * * 0 cd /root/GodWorld && /usr/bin/node scripts/compactCycleOutput.js --apply >> /root/GodWorld/logs/cycle-compaction.log 2>&1`.
- **Verify:** `crontab -l` shows the new line; first live run (once eligible) produces a clean log with no errors.
- **Status:** [ ] not started

### Task 5: Doc registration + rollout close

- **Files:**
  - `docs/index.md` — modify (add entry)
  - `docs/engine/ROLLOUT_PLAN.md` — modify (link this plan, mark state)
- **Steps:**
  1. Register this plan file in `docs/index.md`.
  2. File/close the governing rollout row pointing here.
- **Verify:** grep confirms both link directions resolve.
- **Status:** [ ] not started

---

## Open questions

- [ ] `THRESHOLD = 5` cycles is a judgment call, not a measured number — no telemetry exists yet on how far back anyone has actually needed to open raw cycle output. Flagged as adjustable via `--threshold N`; revisit once a few cycles have actually crossed it.

---

## Changelog

- 2026-08-18 — Initial draft (research-build session, following the audio-retention fix in the same session).
