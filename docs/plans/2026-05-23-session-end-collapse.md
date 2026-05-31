---
title: /session-end Ritual Collapse
created: 2026-05-23
updated: 2026-05-23
type: plan
tags: [infrastructure, governance, complete]
sources:
  - docs/engine/ROLLOUT_PLAN.md §governance.7
  - .claude/skills/session-end/SKILL.md v1.2 (current 13-step shape)
  - .claude/terminals/research-build/TERMINAL.md §Session Close (S226 soft-close pattern, canonical)
  - .claude/terminals/engine-sheet/TERMINAL.md §Session Close (stripped-persona variant)
  - scripts/rotateJournalRecent.js (S211)
  - scripts/writeShippedBlock.js (S207)
  - scripts/auditPlanTagDrift.js (S212)
  - ~~scripts/rolloutTriage.js (S212 fix)~~ — RETIRED S235 per governance.6 close
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — governance.7 row"
  - "[[../SCHEMA]] — doc conventions"
  - "[[../index]] — add entry same commit"
  - "[[../adr/0005-rollout-plan-structure]] — ROLLOUT discipline parent"
---

# /session-end Ritual Collapse Plan

**Goal:** Collapse `/session-end` from 13 steps to **4 model-judgment steps + 1 mechanical script invocation**, so session close stops being a 20-minute ritual that drifts (S228 walked the very ritual whose collapse this plan addresses — and missed CHARACTER.md drift inherited from a rename three sessions earlier).

**Architecture:** Build `scripts/sessionEndMechanical.js` — a single Node entry point that takes `--terminal=<name>` and runs the scriptable sub-steps in the right order: `rotateJournalRecent` (persona terminals only) → `writeShippedBlock` → `auditPlanTagDrift` (informational, never fatal) → cross-terminal git stack check (read-only report) → JOURNAL-quality content guard → `pm2 restart`. (Original architecture included `rolloutTriage <cycle>` research-build-only step — RETIRED S235 per governance.6 close; compounding-HIGH problem structurally solved by state taxonomy + per-terminal sweep + governance.10 archive cadence.) Skill rewrite then slims SKILL.md to: detect terminal → write journal → write SESSION_CONTEXT STATUS + ROLLOUT updates → run mechanical script → commit & push (model-written message). Two-commit cadence — ship the script with dry-run validation first, then flip the skill.

**Terminal:** research-build

**Pointers:**
- Prior work: S228 governance.5 close (CHARACTER.md drift caught only by Mike's grill — `34606bd` / `cb2246d`). S207 `writeShippedBlock.js` and S211 `rotateJournalRecent.js` already exist as proof the per-step extraction works.
- Related plan: none — this is internal apparatus work.
- Research basis: ROLLOUT row `governance.7` inline-design; S228 conscience-conditioning note "the audit-the-audit pattern only fires AGAINST decisions I'm making; doesn't fire against decisions inherited from rituals."

**Acceptance criteria:**
1. `node scripts/sessionEndMechanical.js --terminal=research-build` runs end-to-end on a clean working tree with no errors, prints an ordered per-step transcript, and produces the same on-disk results that the current 13-step ritual produces (verified by diffing JOURNAL_RECENT.md + SESSION_CONTEXT.md Shipped block before/after).
2. `node scripts/sessionEndMechanical.js --terminal=engine-sheet` skips journal sub-steps cleanly and runs only the substrate-relevant mechanical sub-steps (writeShippedBlock + stack check + pm2 restart).
3. `--rotate-history` opt-in flag detects sessions older than the most-recent 5 in SESSION_CONTEXT.md and appends them to SESSION_HISTORY.md verbatim under a `### Rotated from SESSION_CONTEXT.md on YYYY-MM-DD (S<N>)` batch header. Dry-run mode prints the rotation plan without writing.
4. Rewritten SKILL.md is **under 150 lines** (current is 349) and the step list is: (0) detect terminal, (1) journal, (2) SESSION_CONTEXT STATUS + ROLLOUT updates, (3) mechanical script, (4) commit & push. Engine-sheet variant runs (0) + (2) + (3) + (4).
5. The drop-list is honored — Step 6 paranoid file-eyeball verification is gone, but the JOURNAL content-quality check (last-entry body line count guard) lives inside the mechanical script and fails loud if the journal entry is empty / <5 lines.
6. `auditPlanTagDrift` exit code 1 (drift detected) **does not fail** the orchestrator — drift is informational at session-close, the script prints the drift table and continues.

---

## Design

### Step inventory (current → target)

| # | Current /session-end step | Where it goes |
|---|---|---|
| 0 | Detect terminal & run terminal-specific audit table | Stays model — terminal detection (one bash command); audit-table content lives in TERMINAL.md and gets read at session-end like any model-driven check |
| 1 | Session counter (RETIRED S228) | Already gone |
| 2 | Write journal entry | Stays model — content is judgment, no script can do this |
| 2.5 | rotateJournalRecent | → mechanical script (sub-step) |
| 3 | Terminal-Specific Saves | Folds into Step 2 (model writes ROLLOUT + SESSION_CONTEXT + NEWSROOM_MEMORY / production_log as applicable per TERMINAL.md) — duplicate step removed |
| 4 | Update SESSION_CONTEXT + ROLLOUT_PLAN | Stays model — STATUS paragraph + Next Session Priorities are judgment |
| 4.5 | writeShippedBlock | → mechanical script (sub-step) |
| 5 | Supermemory (/save-to-mags) | Stays model — judgment call whether the session has anything architectural worth canonizing |
| 5.5 | Batch deferred work | Stays model — optional, judgment |
| 6 | Post-write verification (cat/tail/read first 10 lines) | DROPPED — Edit tool errors on write fail; eyeball-read is genuine redundancy. **Content-quality check** (last journal entry body > N lines) survives inside the mechanical script. |
| 6.5 | Commit & push (with cross-terminal stack check) | Model writes message + decides commit/hold-push. **Stack check sub-step** moves into mechanical script as read-only report; model reads the report and decides. |
| 7 | pm2 restart | → mechanical script (sub-step) |
| 8 | Close (one-line acknowledgment) | Stays model (one line, mechanism, not audience-facing) |

**Net post-rewrite:** 4 model-judgment steps (0, 1=journal, 2=STATUS+ROLLOUT, 3=commit+push) + optional model steps (`/save-to-mags`, batch) + 1 mechanical script invocation between Step 2 and Step 3.

**Honest count:** the wins are not "13 → 3+1." They are "13 → 4+1 plus optional," with the 6 most error-prone repeat-every-session sub-steps now mechanical and fail-loud.

### Script architecture (`scripts/sessionEndMechanical.js`)

**CLI:**

```
node scripts/sessionEndMechanical.js --terminal=<name> [--rotate-history] [--dry-run]
```

- `--terminal=<name>` — required. One of `research-build` / `media` / `civic` / `engine-sheet`. Passed by skill (which detects via tmux); script does not re-detect. Mismatch (e.g. running with `--terminal=media` from research-build tmux window) is the model's responsibility to avoid.
- `--rotate-history` — optional. Opt-in for v1 (test on current SESSION_CONTEXT backlog before flipping default). Triggers the SESSION_HISTORY rotation sub-step.
- `--dry-run` — optional. Reports what each writing sub-step WOULD do without writing. Useful for first-time `--rotate-history` validation. **Caveat:** `rotateJournalRecent` and `writeShippedBlock` do not support dry-run themselves; in `--dry-run` mode the orchestrator skips them with a notice.

**Per-terminal sub-step routing:**

| Sub-step | research-build | media | civic | engine-sheet |
|---|:-:|:-:|:-:|:-:|
| Order banner (stdout) | ✓ | ✓ | ✓ | ✓ |
| `rotateJournalRecent` | ✓ | ✓ | ✓ | — |
| JOURNAL content-quality check (last entry body > 5 lines) | ✓ | ✓ | ✓ | — |
| `writeShippedBlock` | ✓ | ✓ | ✓ | ✓ |
| `auditPlanTagDrift` (informational, never fatal) | ✓ | ✓ | ✓ | ✓ |
| ~~`rolloutTriage <current-cycle>`~~ RETIRED S235 | — | — | — | — |
| Cross-terminal git stack check (read-only report) | ✓ | ✓ | ✓ | ✓ |
| SESSION_HISTORY rotation (opt-in `--rotate-history`) | ✓ | ✓ | ✓ | ✓ |
| `pm2 restart mags-bot godworld-dashboard` | ✓ | ✓ | ✓ | ✓ |

Engine-sheet's skip-list (no journal, no JOURNAL_RECENT, no journal-quality check) mirrors the existing stripped-persona rule in its TERMINAL.md §Session Close.

### Order-of-operations invariant

The script's stdout banner states the order explicitly so the model can verify:

```
sessionEndMechanical: terminal=<name>, rotate-history=<bool>, dry-run=<bool>
Expected upstream model steps (in order):
  1. Journal entry appended to JOURNAL.md  ← must happen BEFORE rotateJournalRecent
  2. SESSION_CONTEXT.md STATUS prepended + ROLLOUT_PLAN.md updated
Now running mechanical sub-steps:
  [1/N] rotateJournalRecent ...
  [2/N] journal content-quality check ...
  [3/N] writeShippedBlock ...
  ...
```

If the model runs the script BEFORE writing the journal, `rotateJournalRecent` picks up the prior session's journal and the new entry is silently missing from JOURNAL_RECENT until next session. The banner is the guardrail.

### auditPlanTagDrift handling

`auditPlanTagDrift` exits 1 on drift. The orchestrator captures stdout + exit code, prints the drift output to its own stdout under a clear header (`### auditPlanTagDrift (informational — does not fail close)`), then continues to the next sub-step. Drift becomes a next-session priority signal in SESSION_CONTEXT, not a session-close blocker.

### JOURNAL content-quality guard

After `rotateJournalRecent` runs, the orchestrator reads the last entry from JOURNAL.md via `lib/sessionLog.readLast(..., 1)` and asserts:

- `body.split('\n').length >= 5` — a journal entry shorter than 5 lines is structurally suspicious (S208 work-is-canonization, S211 journal-philosophy: short is OK for quiet days but truly empty is a write failure)

If the guard fails, the orchestrator prints a loud warning **but does not exit non-zero** — the journal may be deliberately terse on a near-empty day. Warning is enough; the model decides whether to extend.

**Critical:** never cat/tail/dump the journal body to stdout (S169 rule). Use `readLast()` for metadata only.

### Cross-terminal git stack check (read-only report)

The script runs `git log --oneline origin/main..HEAD` and prints the result. Does not block the close. The model reads the report and decides: empty → push freely; non-empty with other-terminal commits → hold push, note "committed locally; push pending coordination" per S156 cross-terminal-git rule.

### SESSION_HISTORY rotation (opt-in v1)

**Behavior:** parses SESSION_CONTEXT.md for `**STATUS (S<N> [...]` paragraph starts. Each STATUS paragraph is from `**STATUS (S<N>` until the next `**STATUS` or the next `---` separator. Groups by `S<N>` session number. Identifies the most recent 5 distinct session numbers; everything older rotates.

**Rotation target format** (per advisor — raw paragraphs, no model-quality summaries):

```markdown
### Rotated from SESSION_CONTEXT.md on YYYY-MM-DD (S<N>)

#### Session N — [terminal] [rotated mechanically]

<raw STATUS paragraph body>

#### Session N — [terminal] [rotated mechanically]

<raw STATUS paragraph body>
```

The model-quality `<one-line summary>` heading style used by existing SESSION_HISTORY entries is preserved for past entries; new rotations use the `[rotated mechanically]` marker to make the distinction visible at archive time.

**v1 default:** `--rotate-history` is OPT-IN. Default off. Mike runs it once on the current SESSION_CONTEXT backlog (which has 8 distinct sessions — S221 through S228 — well past the 5-session rule), eyeballs the diff, then a future plan flips the default to on.

**Acceptance for v1 ship:** `--rotate-history --dry-run` on current SESSION_CONTEXT prints the rotation plan without writing; the plan correctly identifies S221, S222, S223 as rotation candidates (3 oldest of the 8 distinct).

### Drop list

- **Step 6 paranoid verification (eyeball first 10 lines of each touched file).** Edit tool errors loud on write failure; the JOURNAL content-quality guard inside the mechanical script covers the one substantive content check that's not redundant.
- **Step 3 "Terminal-Specific Saves" as a distinct step.** Folds into Step 2 (the model already updates ROLLOUT_PLAN, NEWSROOM_MEMORY, production_log, etc. when those files were touched this session; no need to enumerate them as a separate skill step).
- **Step 1 counter-bump prose.** Already retired S228; SKILL.md still carries the explanation. New SKILL.md treats counter-bump as a sub-bullet of Step 2 (SESSION_CONTEXT line 5 edit).

### Keep list

- Step 0 terminal detection (one bash command).
- Step 2 journal (Mags-voice conditioning).
- Step 2 SESSION_CONTEXT STATUS paragraph + ROLLOUT_PLAN Next Session Priorities (model judgment).
- Step 2 `/save-to-mags` (optional model judgment).
- Step 2 batch deferred work (optional model judgment).
- Step 3 mechanical script (the orchestrator).
- Step 4 commit & push (model writes message, decides on hold-push based on script's stack-check report).
- One-line close acknowledgment (mechanism, not prose).

### Pre-mortem

| Failure mode | Mitigation |
|---|---|
| Script silently fails a sub-step and model doesn't notice → conditioning lost | Each sub-step prints `[N/N] <name> ✓` / `[N/N] <name> ✗ <reason>`. Orchestrator exits non-zero on any sub-step failure that's not flagged informational (auditPlanTagDrift drift). |
| Terminal detection inside script disagrees with tmux at session end | Don't re-detect inside script — `--terminal` is required arg, model passes the detected name from SKILL.md Step 0. Mismatch is model error, not script error. |
| `rotateJournalRecent` runs before model writes journal → new entry missing from JOURNAL_RECENT | Order banner in stdout states the upstream model-step ordering explicitly. Model reads banner before running. Documented in SKILL.md Step 2 → Step 3 transition. |
| `--rotate-history` parser miscount → drops a STATUS paragraph or duplicates one | OPT-IN for v1, must be `--dry-run` tested first. The 8-session current backlog is the integration test fixture. |
| `pm2 restart` fails because PM2 services aren't running | `pm2 restart` is idempotent-friendly but errors if service unknown. Wrap in try/catch, print warning, continue. Services restart at session-start hook anyway. |
| `auditPlanTagDrift` drift across multiple plans floods stdout | Print drift count + first 3 entries, link to full output via re-run command. |
| Cross-terminal stack check returns commits the model doesn't recognize | Print full `git log --oneline` block. Model decides. Script doesn't reason about ownership. |

---

## Tasks

### Task 1: Build scripts/sessionEndMechanical.js

- **Files:**
  - `scripts/sessionEndMechanical.js` — create
- **Steps:**
  1. CLI parser for `--terminal=<name>` (required), `--rotate-history` (boolean), `--dry-run` (boolean).
  2. Validate `--terminal` value against allowlist. Exit 1 with usage message if missing/invalid.
  3. Build per-terminal sub-step list per routing table above.
  4. Print order banner to stdout naming upstream model-step expectations + downstream sub-step order.
  5. Execute sub-steps sequentially. Each sub-step: print `[N/M] <name> ...`, run, print `✓` or `✗`. On `✗` for non-informational sub-step, exit 1 with the error.
  6. `rotateJournalRecent`: `require('./rotateJournalRecent')` or `execSync('node scripts/rotateJournalRecent.js')`. Pick whichever stays simplest (execSync is fine — they're independent scripts).
  7. JOURNAL content-quality check: `require('../lib/sessionLog').readLast(JOURNAL_PATH, 1)[0]` → `body.split('\n').length >= 5` → warn but don't exit on fail.
  8. `writeShippedBlock`: execSync.
  9. `auditPlanTagDrift`: execSync but trap exit 1; print stdout under informational header; do not propagate exit code.
  10. ~~`rolloutTriage`: research-build only; read current cycle from `SESSION_CONTEXT.md` line 5 (`Cycle: <N>`) with regex; execSync `node scripts/rolloutTriage.js <N>`.~~ — REMOVED S235 per governance.6 close.
  11. SESSION_HISTORY rotation: opt-in via `--rotate-history`. Parser per design above. Dry-run prints plan, live writes.
  12. Cross-terminal git stack check: execSync `git log --oneline origin/main..HEAD`; print result under clear header.
  13. `pm2 restart mags-bot godworld-dashboard`: execSync; trap errors, warn, continue.
  14. Exit 0 if all sub-steps succeeded (or were informational).
- **Verify:**
  - `node scripts/sessionEndMechanical.js` (no args) → exits 1 with usage message.
  - `node scripts/sessionEndMechanical.js --terminal=research-build --dry-run` → prints banner + sub-step list with `(dry-run, skipped)` annotations on writing sub-steps; exits 0.
  - `node scripts/sessionEndMechanical.js --terminal=research-build --rotate-history --dry-run` → prints planned SESSION_HISTORY rotation block; exits 0.
- **Status:** [ ] not started

### Task 2: Dry-run validation on current SESSION_CONTEXT backlog

- **Files:**
  - (read-only) `SESSION_CONTEXT.md`, `docs/mags-corliss/SESSION_HISTORY.md`
- **Steps:**
  1. `node scripts/sessionEndMechanical.js --terminal=research-build --rotate-history --dry-run`
  2. Verify the printed rotation plan identifies S221, S222, S223 as rotation candidates (3 oldest of the 8 distinct sessions in current SESSION_CONTEXT).
  3. Verify the planned SESSION_HISTORY append shape matches existing entries (uses `### Rotated from SESSION_CONTEXT.md on YYYY-MM-DD (S<N>)` batch header + `#### Session N — [terminal] [rotated mechanically]` per-entry header + raw STATUS paragraph body).
- **Verify:** stdout contains "Would rotate sessions: S221, S222, S223" (or equivalent) without touching files.
- **Status:** [ ] not started

### Task 3: Commit script + plan (commit 1)

- **Files:**
  - `scripts/sessionEndMechanical.js` (new)
  - `docs/plans/2026-05-23-session-end-collapse.md` (new — this file)
  - `docs/index.md` (registration entry)
- **Steps:**
  1. Stage path-specifically.
  2. Cross-terminal git stack check.
  3. Commit message: `S229 [research-build] governance.7 part 1 — sessionEndMechanical orchestrator + plan doc`. Body explains why (Task 2 dry-run validation), notes that SKILL rewrite + ROLLOUT flip ship in commit 2.
  4. Push.
- **Verify:** `git log --oneline -1` shows the commit; `git status --short` clean except for tracked unstaged work from this session.
- **Status:** [ ] not started

### Task 4: Rewrite .claude/skills/session-end/SKILL.md

- **Files:**
  - `.claude/skills/session-end/SKILL.md` — rewrite (349 → ~140 lines)
- **Steps:**
  1. Frontmatter: bump version `1.2` → `2.0`, update `updated` to 2026-05-23, keep `disable-model-invocation: true`.
  2. Replace step list with 5 sections: Step 0 (Detect Terminal), Step 1 (Write Journal — model), Step 2 (Update SESSION_CONTEXT + ROLLOUT — model), Step 3 (Run Mechanical Script), Step 4 (Commit & Push — model). Optional model sub-steps for `/save-to-mags` + batch under Step 2.
  3. Engine-sheet variant: explicit skip-Step-1 note, points at engine-sheet TERMINAL.md §Session Close for substrate-specific audit table.
  4. Drop Step 6 verification language entirely (one-line note: "JOURNAL content-quality guard lives in the mechanical script; tool-write failures error at edit time, no eyeball read needed").
  5. Preserve Failure Modes table but slim to 8 rows max (current is 11).
  6. Update changelog at bottom.
- **Verify:** `wc -l .claude/skills/session-end/SKILL.md` ≤ 150.
- **Status:** [ ] not started

### Task 5: Update TERMINAL.md §Session Close sections

- **Files:**
  - `.claude/terminals/research-build/TERMINAL.md` — §Session Close hard-close block
  - `.claude/terminals/media/TERMINAL.md` — §Session Close hard-close block
  - `.claude/terminals/civic/TERMINAL.md` — §Session Close hard-close block
  - `.claude/terminals/engine-sheet/TERMINAL.md` — §Session Close hard-close block (already terminal-specific; light pointer update)
- **Steps:**
  1. Each terminal's hard-close block currently enumerates the 13-step ritual inline. Replace with a 5-step block pointing at SKILL.md v2.0 + terminal-specific Audit Table (which stays).
  2. Soft-close blocks (S226) unchanged — already match the new shape.
  3. Engine-sheet TERMINAL.md: minimal change. Its hard-close already documents the stripped-persona skip list; just add a one-line pointer to the new orchestrator.
- **Verify:** Grep for "13 steps" / "step 6" / "step 2.5" / "step 4.5" across `.claude/terminals/*/TERMINAL.md` — no hits.
- **Status:** [ ] not started

### Task 6: Register plan in docs/index.md + flip governance.7 ROLLOUT row

- **Files:**
  - `docs/index.md` — add plan entry
  - `docs/engine/ROLLOUT_PLAN.md` — flip governance.7 ready → done-pending-archive with closure details
- **Steps:**
  1. `docs/index.md` under `docs/plans/`: `- **[[plans/2026-05-23-session-end-collapse]]** — /session-end ritual collapse plan (governance.7). 4 model + 1 mechanical. *(plan, infrastructure, active)*`
  2. `docs/engine/ROLLOUT_PLAN.md` governance.7 row: state `ready` → `done-pending-archive`; pointer block to `[[../plans/2026-05-23-session-end-collapse]]`; closure summary inline (commits + acceptance evidence + v1.0 ship vs deferred items).
- **Verify:** `grep -n "governance.7" docs/engine/ROLLOUT_PLAN.md` shows the done-pending-archive row.
- **Status:** [ ] not started

### Task 7: Commit skill rewrite + TERMINAL updates + plan registration + ROLLOUT flip (commit 2)

- **Files:**
  - `.claude/skills/session-end/SKILL.md`
  - `.claude/terminals/research-build/TERMINAL.md`
  - `.claude/terminals/media/TERMINAL.md`
  - `.claude/terminals/civic/TERMINAL.md`
  - `.claude/terminals/engine-sheet/TERMINAL.md`
  - `docs/index.md`
  - `docs/engine/ROLLOUT_PLAN.md`
- **Steps:**
  1. Cross-terminal git stack check.
  2. Stage path-specifically.
  3. Commit: `S229 [research-build] governance.7 final — SKILL.md v2.0 + TERMINAL Session Close updates + ROLLOUT flip`. Body explains the 13 → 4+1 collapse, names what got dropped (Step 6 paranoid verify, Step 3 overlap), what got kept (JOURNAL content-quality guard, model judgment steps).
  4. Push.
- **Verify:** Working tree clean except for tracked unstaged work from this session.
- **Status:** [ ] not started

---

## Open questions

None at write time. Open questions surfaced during execution get appended here.

---

## Changelog

- 2026-05-23 — Initial draft (S229 research-build). Advisor consulted before write: scope confirmed, four specifics nailed (auditPlanTagDrift informational not fatal; SESSION_HISTORY raw-paragraph rotation not model-summarized; JOURNAL content-quality guard survives Step 6 drop; `/save-to-mags` + batch stay model). Two-commit cadence per advisor (script + plan first, dry-run validate, then SKILL + TERMINAL + ROLLOUT). Honest count: 4 model + 1 mechanical, not 3+1.
