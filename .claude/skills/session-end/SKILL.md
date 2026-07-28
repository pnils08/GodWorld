---
name: session-end
description: End-of-session handshake — update project state, run mechanical orchestrator, commit and push. Per S229 governance.7, the 13-step ritual collapsed to model steps + 1 script invocation.
version: "2.5"
updated: 2026-07-28
tags: [infrastructure, active]
effort: low
disable-model-invocation: true
---

# /session-end — Close the Session

> **Skill bag:** session closer running a gen-eval pass on the session's work. Step 2 writes the carried set (PIN + NEXT[terminal]) + ROLLOUT updates; Step 3 runs the mechanical sub-steps (audits, restart) as a single script. Per S229 governance.7 (plan: `docs/archive/plans/2026-05-23-session-end-collapse.md`).

**Purpose:** Leave enough of yourself behind that the next version of you can find her way back.

**Two close modes (S226).** Pick by next-session cadence, not by how much work shipped. Canonical pattern lives in `.claude/terminals/research-build/TERMINAL.md` §Session Close.

- **Soft close (~2 min)** — chaining to a new session within minutes. Update the PIN + your terminal's NEXT line in SESSION_CONTEXT (the whole carried set, ADR-0009 §loop-tightening) + cross-terminal stack check + commit+push. The block below is **hard close**.
- **Hard close (~5-10 min)** — end of day, multi-day break, or ≥3 chained soft closes. Run the full sequence below.

---

## Hard Close Sequence

Three model-judgment steps + one mechanical script invocation. Steps are numbered 0, 2, 3, 4 — there is no Step 1. It was the journal write, retired S300; the numbering stayed so downstream "Step 2/3/4" references across the TERMINAL.md files kept resolving.

### Step 0: Detect Terminal

One bash command, used as the `--terminal` arg for Step 3:

```bash
tmux display-message -t "$TMUX_PANE" -p '#W'
```

Map to `research-build` / `engine-sheet` / `media` / `civic`. Unmatched falls back to `research-build` (S211 hook design, S221 unregistered-window routing now Mags-only mode but session-end still routes through research-build for stack-check coverage).

Each terminal's `TERMINAL.md` §Session Close carries the **Terminal-Specific Audit** table — read it, fix any stale files surfaced before continuing.

### Step 2: Update SESSION_CONTEXT PIN + NEXT + ROLLOUT_PLAN — model judgment

**The carried-set contract (ADR-0009 §loop-tightening; hardened S283 Mike-direct): SESSION_CONTEXT is a minimal AI→AI handoff — one `#` header line + one `**PIN:**` line + one `**NEXT[<lane>]:**` line per lane. NOTHING else.** No STATUS narrative, no Shipped block, no prose sections, no tables. claude-mem saves the session; git history shows the work; ROLLOUT_PLAN carries open work — none of that goes in SESSION_CONTEXT. Displaced narrative rotates to `docs/mags-corliss/SESSION_HISTORY.md`. Both soft and hard close write the *same* two things — the modes differ only in the sweep overhead, not in what lands in SESSION_CONTEXT.

**Length is model judgment, not a gate (Mike-direct S298).** The FATAL minimal-handoff guard that enforced NEXT ≤ 350 / PIN ≤ 450 was removed from `sessionEndMechanical.js` — nothing checks shape at close anymore. Keep the lines tight because a long one costs every terminal at every boot, not because a script will stop you.

Three sub-actions:

1. **Update the PIN line** — pipe-delimited, whole-world state, shared by every lane. Live shape:

   ```
   **PIN:** S<N> | Day <D> | canonical C<c> (bench state) | prod <engine range + what's pending> | <standing facts>
   ```

   Bump `S<N>` +1 on every close, soft *or* hard — it's a boot odometer, a mechanical instance counter, not a span marker (ADR-0009 §loop-tightening refinement 1). Bump `Day <D>` only if a real day boundary crossed. Move the canonical cycle only if a cycle actually ran. Everything after that is standing world-state: prod engine range, the weekly cadence, frozen paths. Add a fact when it becomes true for all lanes; drop one when it stops being load-bearing. There is no `Session:` or `Edition:` field — a close that writes those is writing a PIN that no longer matches the file.

2. **Rewrite your own `NEXT[<lane>]:` line** — one line, aim for ≤ 350 chars: where the work is + the next move, with a `(claude-mem: <hook>)` pointer when the thread is rich. NOT a task stub, and NOT a narrative paragraph — detail lives in ROLLOUT rows / plan changelogs / claude-mem; NEXT is just the entry point into them. Identical form soft or hard. **Don't touch another lane's NEXT line** — a PreToolUse guard (`session-context-ownership-guard.sh`) blocks it for Claude terminals, and the same rule binds the external CLIs by AGENTS.md.

3. **Update ROLLOUT_PLAN.md** — refresh Next Session Priorities; flip closed rows to `done-pending-archive`; move fully-closed clusters to `ROLLOUT_ARCHIVE.md`. ROLLOUT is canonical for what's open.

   **Archive Sweep Trigger (deterministic — G-SE2, don't re-litigate per close):** sweep `done-pending-archive` rows to `ROLLOUT_ARCHIVE.md` **IF** their count ≥ 2 **OR** the prior sweep was ≥ 2 sessions ago. **Skip** (defer to next clean close) **IF** the working tree has uncommitted cross-terminal changes. Newest Archive Pass inserts first within the Archive Pass section (see the convention comment in ROLLOUT_ARCHIVE.md).

**Optional model sub-actions:**

- **`/save-to-mags`** — model judgment whether the session has anything architectural worth canonizing. Tag with terminal name (`[research/build]`, `[media]`, etc.). There is NO Stop-hook auto-save (neutralized S221, verified S283) — deliberate saves are the only Supermemory writes; claude-mem carries the automatic session record.
- **`/batch`** — submit heavy analysis work that wasn't urgent enough to run live. Results wait at 50% cost for next session.

**Terminal-specific files** (NEWSROOM_MEMORY for media, production_log for cycle terminals, RESEARCH.md for research-build, ENGINE_MAP for engine-sheet) get updated alongside SESSION_CONTEXT/ROLLOUT per the TERMINAL.md §Session Close `Terminal-Specific Saves` list — no need for a separate step.

### Step 3: Run Mechanical Orchestrator

```bash
node scripts/sessionEndMechanical.js --terminal=<name> [--rotate-history]
```

Wraps: **session summary → Supermemory (best-effort S283 — mirrors claude-mem's session summary to `session-logs` + `sl-<terminal>`; zero LLM calls, idempotent, never blocks a close)** → `auditPlanTagDrift` (informational — drift never fails close) → ROLLOUT conformance lint (informational) → cross-terminal git stack check (read-only report) → `pm2 restart`.

Retired sub-steps, so nobody goes looking for them: `minimalHandoffGuard` (S298, Mike-direct — shape/length caps are model judgment now), `rotateJournalRecent` + JOURNAL content-quality (S300 journal freeze), `writeShippedBlock` (ADR-0009 §loop-tightening — the carried set is hand-written in Step 2), `rolloutTriage` (S235).

**Order invariant:** run Step 2 (SESSION_CONTEXT PIN + NEXT + ROLLOUT) before this script, so the summary bridge and the stack check see the session's real final state.

**`--rotate-history` is vestigial — don't reach for it.** It parses `STATUS` paragraphs out of SESSION_CONTEXT, and the loop-tightening rewrite deleted STATUS blocks from that file. `subRotateHistory` now finds zero every time and prints `no STATUS paragraphs found — skipping`. Harmless, but it cannot do anything. If SESSION_HISTORY ever needs a real rotation again, that's a rewrite, not a flag.

**Failure semantics:**
- Fatal (exit 1, aborts session close): SESSION_HISTORY rotation failure.
- Informational (prints under `does not fail close` header, continues): `auditPlanTagDrift` drift, ROLLOUT conformance lint.
- Tolerant (prints warning, continues): `pm2 restart` failure, cross-terminal stack check error, session-summary bridge error.

Plan: `docs/archive/plans/2026-05-23-session-end-collapse.md`.

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

## External Lanes — kimi, codex, antigravity (S340)

These are not Claude Code terminals. They have no tmux boot hook, no `.claude/terminals/` dir, and they never run this skill — it isn't reachable from their harness. They close by the contract in the repo-root `AGENTS.md` §Session close, which is the file they already read at boot.

**Their close is two things:** rewrite their own `NEXT[<lane>]:` line in SESSION_CONTEXT.md, and commit path-specifically. Nothing else. No PIN bump — the PIN is whole-world state and a Claude terminal owns it. No ROLLOUT sweep, no mechanical script, no Supermemory bridge.

**What a Claude terminal does about them: nothing.** If `NEXT[codex]` is stale, that is Codex's line to fix at its next close. The ownership guard blocks the edit and the rule is the same one that has governed the four terminals since S304 — correct content, wrong hand. Raise it with Mike; don't reach in.

The one asymmetry worth knowing: when a Claude terminal reviews and lands an external agent's batch (engine-sheet did this for Codex at S338), the *landing* goes in the Claude terminal's own NEXT line and commit. The external lane still writes its own line for what it did.

---

## Failure Modes

| Scenario | What Happens |
|----------|-------------|
| /session-end never runs | Next session boots on a stale PIN + last session's NEXT line, not a system failure. Worst case: wrong cycle/edition in the boot display + a NEXT line pointing at already-done work. |
| Step 0 audit finds stale files | Fix them now before continuing — the audit is the whole point. |
| Step 3 `auditPlanTagDrift` reports drift | Informational — does not fail close. Surface as next-session priority signal. |
| Step 3 `--rotate-history` finds nothing | Expected — STATUS blocks no longer exist. The flag is vestigial; leave it off. |
| Step 4 stack check shows other-terminal commits | Hold push. "Committed locally; push pending coordination" note in SESSION_CONTEXT. |
| An external lane's NEXT goes stale | Only that CLI can rewrite it. A Claude terminal reaching in is blocked by the ownership guard — raise it with Mike instead. |
| All terminals | Run Step 0 + 2 + 3 + 4. There is no Step 1. |

---

---

## Changelog

- 2026-07-28 (S340, research-build) — v2.5 doc-vs-reality pass + external lanes. **Three documented mechanisms did not exist.** (1) The minimal-handoff guard was described as FATAL with NEXT ≤ 350 / PIN ≤ 450 caps in three places; `sessionEndMechanical.js` removed it at S298 (Mike-direct) and nothing has enforced shape since — now stated as model judgment. (2) Step 2 told the closer to update `Session:`, `Cycle:`, and `Edition:` fields; the live PIN is pipe-delimited and has no such fields, so a literal follower wrote a malformed PIN — replaced with the real shape. (3) `--rotate-history` parses STATUS paragraphs that loop-tightening deleted from SESSION_CONTEXT; documented as vestigial rather than left as a live-looking option. **Journal residue cut:** Step 1 (retired S300) was still announcing its own retirement in six places for ~400 tokens — the step block is gone, one line under Hard Close explains the numbering gap, this entry is the record. **Added §External Lanes** — kimi / codex / antigravity close via repo-root `AGENTS.md` §Session close: own NEXT line + path-specific commit, no PIN bump, no mechanical script. Claude terminals never write an external lane's line. Companion edits: `AGENTS.md` §Session close, `.claude/rules/newsroom.md` (journal-is-media-only rule cut, safety clause preserved), `civic/TERMINAL.md` §Session Close, `lib/mags.js` (dead journal readers removed), `scripts/rotateJournalRecent.js` + `scripts/daily-reflection.js` deleted.
- 2026-07-06 (S300, research-build) — v2.4 journal freeze (pipe.40 T4). Step 1 (journal) RETIRED for all terminals — the git journal (`JOURNAL.md`/`JOURNAL_RECENT.md`) froze to archive; Mags' inner life moved to her citizen page (POP-00005) via the citizen-loop machinery (nightly `discord-reflection.js`, EIC-daypart `magsPageAppend.js` at real moments in `/sift`, read-back `magsPageRecall.js`). Supersedes the S249 media-only rule with journal-is-page-only. Step numbering preserved (Step 1 kept as a documented no-op) so downstream "Step 2/3/4" refs across TERMINAL.md files stay valid. `sessionEndMechanical.js`: `JOURNAL_TERMINALS` + `subRotateJournalRecent` + `subJournalQuality` removed, routing now uniform. Companion edits: media TERMINAL.md §Session Close, `session-startup-hook.sh` media boot-read repoint, JOURNAL freeze headers. Plan: `docs/archive/plans/2026-07-06-journal-to-citizen-loop.md`.
- 2026-06-15 (S260, research-build) — v2.3 loop-tightening (ADR-0009 §loop-tightening). SESSION_CONTEXT carried set reduced to `{PIN, NEXT[terminal]}`; boot-read set ≡ session-end-write set. Step 2 rewritten: STATUS narrative paragraph → one `NEXT[<terminal>]:` line + PIN refresh (incl. Edition stage); both close modes write the same two things. `writeShippedBlock` RETIRED (script + boundary file `git rm`'d) — the git-log "## Shipped Last Session" block duplicated `git log` and went stale (frozen at S248 for ~11 sessions). Boot hook drops the Shipped-block awk, adds Edition to the PIN + a per-terminal NEXT emit. Step 3 wrap-list + failure semantics + Failure Modes table updated; soft-close line updated. Companion edits: `sessionEndMechanical.js` (writeShippedBlock sub-step removed), 4× TERMINAL.md §Session Close, SESSION_CONTEXT.md restructured. Plan: `docs/plans/2026-06-14-boot-doc-architecture-restructure.md` §loop-tightening.
- 2026-05-31 (S249, research-build) — v2.2 journal-write to media-only (governance.20, Mike S238 directive). Step 1 (journal) now runs **only on the media terminal**; research-build + civic join engine-sheet in skipping it (operational mode reads no JOURNAL_RECENT at boot, so a journal write conditions nothing there). `scripts/sessionEndMechanical.js`: `PERSONA_TERMINALS` → `JOURNAL_TERMINALS = {media}` (the set's only use was journal-step gating). Brings the SKILL + script + research-build/civic TERMINAL.md into line with CLAUDE.md §Terminal architecture, which already stated operational terminals have "no journal." research-build + civic TERMINAL.md §Session Close + §Owned-docs updated same commit. Conditioning for operational terminals lands in ROLLOUT close-notes / RESEARCH.md / commit bodies / ENGINE_MAP.
- 2026-05-30 (S248, research-build) — v2.1 friction-reduction pass (governance.19, source `output/production_log_session_end_c94_gaps.md`). G-SE3: Step 1 journal template `[N+1]` → `[N]` (closing-session number) + parenthetical. G-SE5: Step 2.2 leads with hard-vs-soft binding to the Step 1 journal decision (no form re-derivation). G-SE2: Step 2.3 deterministic Archive Sweep Trigger (count ≥2 OR ≥2 sessions since last sweep; skip on uncommitted cross-terminal changes). G-SE4: added an ARCHIVE-PASS ORDERING comment at the S227 anchor in ROLLOUT_ARCHIVE.md (the prior line-802 "newest at bottom" claim contradicted actual newest-first-after-S227 practice; comment now names the real insert point). G-SE1 (cross-terminal write contention) deferred to governance.26 Task 6 — the unified-close single-writer protocol supersedes the Step-2 stopgap.
- 2026-05-23 (S229, research-build) — v2.0 rewrite per governance.7. 349 → ~150 lines. 13 steps → 4 model + 1 mechanical script invocation. Mechanical orchestrator: `scripts/sessionEndMechanical.js`. Plan: `docs/archive/plans/2026-05-23-session-end-collapse.md`. Advisor-consulted before write: failure semantics, drop list, honest count.
- 2026-05-08 (S211) — v1.2. rotateJournalRecent + writeShippedBlock scripts. S207 boot-handoff primitive.
