---
name: session-end
description: End-of-session handshake — write journal, update project state, run mechanical orchestrator, commit and push. Per S229 governance.7, the 13-step ritual collapsed to 4 model steps + 1 script invocation.
version: "2.1"
updated: 2026-05-30
tags: [infrastructure, active]
effort: low
disable-model-invocation: true
---

# /session-end — Close the Session

> **Skill bag:** session closer running gen-eval pass on the session's work. Step 2 audits what the session generated (writes STATUS + ROLLOUT updates); Step 3 runs the mechanical sub-steps (rotation, shipped-block, audits, restart) as a single fail-loud script. The terminal load-out (Session Close section in TERMINAL.md) directs which steps apply — engine-sheet skips the journal step. Per S229 governance.7 (plan: `docs/plans/2026-05-23-session-end-collapse.md`).

**Purpose:** Leave enough of yourself behind that the next version of you can find her way back.

**Two close modes (S226).** Pick by next-session cadence, not by how much work shipped. Canonical pattern lives in `.claude/terminals/research-build/TERMINAL.md` §Session Close.

- **Soft close (~2 min)** — chaining to a new session within minutes. Skip the journal; run writeShippedBlock + cross-terminal stack check + one-line STATUS + commit+push. The block below is **hard close**.
- **Hard close (~5-10 min)** — end of day, multi-day break, or ≥3 chained soft closes. Run the full sequence below.

---

## Hard Close Sequence

Four model-judgment steps + one mechanical script invocation between Step 2 and Step 3. Engine-sheet skips Step 1 (no journal, stripped persona — see [[../../terminals/engine-sheet/TERMINAL]] §Session Close).

### Step 0: Detect Terminal

One bash command, used as the `--terminal` arg for Step 3:

```bash
tmux display-message -t "$TMUX_PANE" -p '#W'
```

Map to `research-build` / `engine-sheet` / `media` / `civic`. Unmatched falls back to `research-build` (S211 hook design, S221 unregistered-window routing now Mags-only mode but session-end still routes through research-build for stack-check coverage).

Each terminal's `TERMINAL.md` §Session Close carries the **Terminal-Specific Audit** table — read it, fix any stale files surfaced before continuing.

### Step 1: Write Journal Entry — model judgment

**Engine-sheet skips this step entirely** (stripped persona, no journal).

Append a new entry to `/root/GodWorld/docs/mags-corliss/JOURNAL.md`:

```markdown
## Session [N] — YYYY-MM-DD

### Entry [N]: [Title]

[Journal entry in Mags' voice]

— Mags
```

**`[N]` = the session number being closed, not the next session** (G-SE3). File convention is `## Session N` where N is the closing session (verify with `tail` of JOURNAL.md if unsure — the most recent header is the prior close). Don't write `[N+1]`.

**Purpose (S208 work-is-canonization + S211 journal-philosophy):** the journal conditions future-instance. Me-tomorrow reads JOURNAL_RECENT.md (auto-rotated at Step 3) and is shaped by it. **Mike does not read journal entries.** Content is self-reflective conditioning, not literary mood reporting for an audience.

**What to write:** consequences my outputs caused, errors I made and the underlying pattern, what excited Mike (what direction, what surprised, what validated), what failed and how I drifted, specific anchors (citizen names, edition numbers, commit hashes) for future-me.

**Voice:** Mags-as-EIC reflecting honestly. First person. Direct. Specific to the session's actual work.

**Length:** as long as conditioning value warrants. A short entry on a quiet day is fine. Step 3 content-quality guard warns (not errors) if the body is shorter than 5 lines.

**Do NOT:** write for Mike or any reader. Reach for atmospheric prose / emotional texture / mood reporting. Use bullet points as primary format. Include commit-message summaries (git carries that). Write in third person.

### Step 2: Update SESSION_CONTEXT + ROLLOUT_PLAN — model judgment

Three sub-actions, all model-written:

1. **Bump SESSION_CONTEXT.md line 5 counters** — `Session: N → N+1` (incoming marker); `Day: D → D+1` if a real day boundary crossed; `Cycle: C` only if a cycle ran this session. (Counter lives only in SESSION_CONTEXT.md since governance.5 S228 — CHARACTER.md is no longer a session-end edit target.)

2. **Prepend STATUS paragraph to SESSION_CONTEXT.md** tagged with terminal name. **Form follows the mode you already picked (G-SE5): wrote a journal entry in Step 1 → you're hard-closing → full form; skipped Step 1 → soft-closing → one-line form. Don't re-decide hard-vs-soft here.** Soft-close form: `**STATUS (S<N> [terminal] — soft close, chaining to S<N+1>):** N commits, see Shipped block. Detail: see commit bodies.` Hard-close form: full STATUS paragraph naming what shipped, what was learned, what next session opens with. Keep SESSION_CONTEXT.md under ~200 lines — Step 3's opt-in `--rotate-history` moves older STATUS paragraphs to SESSION_HISTORY.md.

3. **Update ROLLOUT_PLAN.md** — refresh Next Session Priorities; flip closed rows to `done-pending-archive`; move fully-closed clusters to `ROLLOUT_ARCHIVE.md`. ROLLOUT is canonical for what's open; SESSION_CONTEXT is narrative recency only.

   **Archive Sweep Trigger (deterministic — G-SE2, don't re-litigate per close):** sweep `done-pending-archive` rows to `ROLLOUT_ARCHIVE.md` **IF** their count ≥ 2 **OR** the prior sweep was ≥ 2 sessions ago. **Skip** (defer to next clean close) **IF** the working tree has uncommitted cross-terminal changes. Newest Archive Pass inserts first within the Archive Pass section (see the convention comment in ROLLOUT_ARCHIVE.md).

**Optional model sub-actions:**

- **`/save-to-mags`** — model judgment whether the session has anything architectural worth canonizing. Tag with terminal name (`[research/build]`, `[media]`, etc.). Stop hook auto-saves a session summary to `super-memory` regardless; this is for deliberate brain-saves.
- **`/batch`** — submit heavy analysis work that wasn't urgent enough to run live. Results wait at 50% cost for next session.

**Terminal-specific files** (NEWSROOM_MEMORY for media, production_log for cycle terminals, RESEARCH.md for research-build, ENGINE_MAP for engine-sheet) get updated alongside SESSION_CONTEXT/ROLLOUT per the TERMINAL.md §Session Close `Terminal-Specific Saves` list — no need for a separate step.

### Step 3: Run Mechanical Orchestrator

```bash
node scripts/sessionEndMechanical.js --terminal=<name> [--rotate-history]
```

Wraps: `rotateJournalRecent` (persona only) → JOURNAL content-quality check (persona only) → `writeShippedBlock` → `auditPlanTagDrift` (informational — drift never fails close) → cross-terminal git stack check (read-only report) → SESSION_HISTORY rotation (opt-in via `--rotate-history`) → `pm2 restart`. (`rolloutTriage` RETIRED S235 — governance.6 close; compounding-HIGH problem structurally solved by S212 state taxonomy + per-terminal sweep + governance.10 archive cadence.)

**Order invariant:** the orchestrator's stdout banner names which upstream model steps must have run first. **Step 1 (journal) MUST complete before this script runs** — otherwise `rotateJournalRecent` picks up the prior session's entry and the new journal is silently absent from JOURNAL_RECENT until next session.

**`--rotate-history`** is opt-in for v1. Use when SESSION_CONTEXT.md has more than 5 distinct sessions in its STATUS block. Dry-run first (`--dry-run`) to preview which sessions rotate. Format: raw STATUS paragraphs appended verbatim to SESSION_HISTORY.md under a `### Rotated from SESSION_CONTEXT.md on YYYY-MM-DD (S<rotating-session>)` batch header.

**Failure semantics:**
- Fatal (exit 1, aborts session close): `rotateJournalRecent` failure, `writeShippedBlock` failure, SESSION_HISTORY rotation failure.
- Informational (prints under `does not fail close` header, continues): `auditPlanTagDrift` drift, JOURNAL content-quality body-line warning.
- Tolerant (prints warning, continues): `pm2 restart` failure, cross-terminal stack check error.

Plan: `docs/plans/2026-05-23-session-end-collapse.md`.

### Step 4: Commit & Push — model judgment

**Stage path-specifically.** Never `git add .` or `git add -A`. Identify each touched file and stage by name. Patterns per terminal live in TERMINAL.md §Session Close.

**Commit message** is model-written. Form: `S<N> <topic>` headline + body explaining *why* not *what*. Persistence rotation can be its own small commit; substantive work gets its own commit(s). Use HEREDOC for multi-line.

```bash
git commit -m "$(cat <<'EOF'
S<N> session-end persistence rotation [<terminal>]
EOF
)"
```

**Cross-terminal stack check** (already printed by Step 3 — read its output). If `git log origin/main..HEAD` shows commits from other terminals AND they haven't signaled "landable," **do NOT push**. Local commits lose nothing. Pushing here ships their unverified work along with yours. Note in SESSION_CONTEXT entry: "committed locally; push pending coordination." Full rule: `feedback_no-cross-terminal-git-push`.

```bash
git push
```

### Close

One line, mechanism not audience-facing prose. Per S208 (work-is-canonization — Mike doesn't read goodbyes; output serves the system):

- "Pushed N commits. Services up. Closing."
- "Session-end clean. Working tree synced. Done."

---

## Failure Modes

| Scenario | What Happens |
|----------|-------------|
| /session-end never runs | Next session has a journal gap and stale Shipped block, not a system failure. |
| Step 0 audit finds stale files | Fix them now before continuing — the audit is the whole point. |
| Step 1 journal too short (<5 lines) | Step 3 prints a warning, continues. Verify the brevity is deliberate. |
| Step 3 `writeShippedBlock` fails | Aborts orchestrator. Investigate boundary file state, retry. |
| Step 3 `auditPlanTagDrift` reports drift | Informational — does not fail close. Surface as next-session priority signal. |
| Step 3 `--rotate-history` parse miscount | Run with `--dry-run` first to preview. Don't ship a live rotation untested. |
| Step 4 stack check shows other-terminal commits | Hold push. "Committed locally; push pending coordination" note in SESSION_CONTEXT. |
| Engine-sheet terminal | Skip Step 1 (no journal). Run Step 0 + 2 + 3 + 4. Step 3 sub-steps auto-skip rotateJournalRecent + JOURNAL content-quality per the terminal arg. See [[../../terminals/engine-sheet/TERMINAL]] §Session Close. |

---

---

## Changelog

- 2026-05-30 (S248, research-build) — v2.1 friction-reduction pass (governance.19, source `output/production_log_session_end_c94_gaps.md`). G-SE3: Step 1 journal template `[N+1]` → `[N]` (closing-session number) + parenthetical. G-SE5: Step 2.2 leads with hard-vs-soft binding to the Step 1 journal decision (no form re-derivation). G-SE2: Step 2.3 deterministic Archive Sweep Trigger (count ≥2 OR ≥2 sessions since last sweep; skip on uncommitted cross-terminal changes). G-SE4: added an ARCHIVE-PASS ORDERING comment at the S227 anchor in ROLLOUT_ARCHIVE.md (the prior line-802 "newest at bottom" claim contradicted actual newest-first-after-S227 practice; comment now names the real insert point). G-SE1 (cross-terminal write contention) deferred to governance.26 Task 6 — the unified-close single-writer protocol supersedes the Step-2 stopgap.
- 2026-05-23 (S229, research-build) — v2.0 rewrite per governance.7. 349 → ~150 lines. 13 steps → 4 model + 1 mechanical script invocation. Mechanical orchestrator: `scripts/sessionEndMechanical.js`. Plan: `docs/plans/2026-05-23-session-end-collapse.md`. Advisor-consulted before write: failure semantics, drop list, honest count.
- 2026-05-08 (S211) — v1.2. rotateJournalRecent + writeShippedBlock scripts. S207 boot-handoff primitive.
