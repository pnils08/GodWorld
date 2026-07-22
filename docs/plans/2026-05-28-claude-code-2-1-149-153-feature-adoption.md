---
title: Claude Code v2.1.149–v2.1.153 Feature Adoption
created: 2026-05-28
updated: 2026-05-28
type: plan
tags: [governance, infrastructure, tooling, token-budget, active]
sources:
  - "GitHub: https://github.com/anthropics/claude-code/releases (v2.1.148–v2.1.153 fetched S241)"
  - "S241 conversation — Mike: 'pull all useful tools onto the rollout for future session builds, if something is crucial for us do it now'"
  - "S241 conversation prior turn — token-burn diagnostic motivation"
  - "output/production_log_session-startup_c95_gaps.md (S241 boot-burn gap log — companion empirical context)"
pointers:
  - "[[engine/archive/ROLLOUT_PLAN]] — parent rollout (governance.22)"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — register in same commit"
  - "[[archive/plans/2026-05-28-gemini-offload-pattern]] — sibling S241 plan, governance.21 — different lever on the same token-budget concern"
  - ".claude/hooks/session-startup-hook.sh — Task 5 modification target"
  - ".claude/terminals/research-build/TERMINAL.md — Tasks 1 + 3 modification target"
  - ".claude/terminals/engine-sheet/TERMINAL.md — Task 3 modification target"
---

# Claude Code v2.1.149–v2.1.153 Feature Adoption

**Goal:** Adopt the genuinely useful surface from Claude Code v2.1.149–v2.1.153 — token-budget diagnostics, per-skill tool scoping, in-session skill reload, hook upgrades — without scope-creeping into every release-note item. Six tasks, each independently picker-grabbable.

**Architecture:** Survey of releases v2.1.148–v2.1.153 (May 22–28) yields six candidate features. One is Mike-action-only (diagnostic). Two are tiny adoption notes (workflow + cadence). One is a code change (hook upgrade). One is a multi-skill audit pass (per-skill tool scoping). One is investigation-then-decide (`MessageDisplay` hook fit for persona-frame stripping). The seventh release-note item (`/code-review --fix`) is already covered by the project's `/simplify` alias and is dropped from this plan.

**Terminal:** research-build (design + plan + TERMINAL.md edits + hook investigation). Engine-sheet picks up Task 3 (workflow note in its own TERMINAL.md) and Task 5 (hook code change) if/when scoped.

**Pointers:**
- Companion: `output/production_log_session-startup_c95_gaps.md` — the S241 boot-burn gap log. Task 1 (`/usage` cadence) provides empirical data on which gap-log fix prioritizes first; Task 2 (`disallowed-tools`) is the per-skill scoping that pairs with the gap-log's G-SS1 identity-split (different layers, same goal: scope-tighten what loads).
- Sibling: [[archive/plans/2026-05-28-gemini-offload-pattern]] (governance.21) — Gemini offload triage is the *external* lever on token budget; this plan is the *internal* lever (use the harness's own newer scoping mechanisms).
- Version confirmed current: `claude --version` → `2.1.153 (Claude Code)` at plan-write time. All six features available right now; no upgrade gate.

**Acceptance criteria:**
1. Each of the six tasks below either ships its small artifact (TERMINAL.md edit / hook upgrade / cadence note) or files a follow-up plan (for the audit-pass + investigation tasks).
2. No regression in current operations — adoption is purely additive.
3. `/usage` per-category data captured in at least one session-close commit body within two sessions of this plan landing, providing empirical input on which other tasks to prioritize.

---

## Tasks

### Task 1: `/usage` per-category diagnostic cadence — adoption note

- **Source:** v2.1.149 (May 22) — `/usage` now splits across skills / subagents / plugins / MCP servers.
- **Cost-of-delay:** Low cost, high diagnostic value. Without data on where tokens go, prioritization of G-SS1 vs G-SS7 vs G-SS8 vs `disallowed-tools` vs Gemini-offload paths is guesswork.
- **Files:**
  - `.claude/terminals/research-build/TERMINAL.md` — modify (append §End-of-Session Diagnostic line near existing Session Close section)
  - `.claude/terminals/engine-sheet/TERMINAL.md` — modify (same)
  - `.claude/terminals/civic/TERMINAL.md` — modify (same)
  - `.claude/terminals/media/TERMINAL.md` — modify (same)
- **Steps:**
  1. For each of the four terminal files above, append a one-line note near §Session Close:
     > **§End-of-Session Diagnostic** — at session-close, Mike runs `/usage` and pastes the per-category breakdown (skills / subagents / plugins / MCP servers) into the session-close commit body when notable. Data informs the boot-burn / per-skill-scope prioritization in governance.22.
  2. Do not touch other sections.
- **Verify:** `grep -c 'End-of-Session Diagnostic' .claude/terminals/*/TERMINAL.md` → 4.
- **Status:** [x] DONE 2026-05-28 (S241) — §End-of-Session Diagnostic added to all 4 TERMINAL.md files before §Session Close. Cadence note sets the empirical-data primitive for boot-burn / per-skill-scope prioritization. Verification gate met.

### Task 2: `disallowed-tools` frontmatter — per-skill scope audit

- **Source:** v2.1.152 (May 27) — skills can now declare `disallowed-tools` frontmatter to remove tools from the model when that skill runs.
- **Cost-of-delay:** Medium. Project has 60+ skills (project skills + plugin skills + agents). Many shouldn't have full tool access (reviewer-only skills shouldn't have Write/Edit; voice-generator skills shouldn't have arbitrary Bash; verification skills shouldn't have Write). Tighter scoping = fewer wrong-tool routes + less tool-availability overhead per skill load.
- **Files:**
  - `.claude/skills/**/SKILL.md` — audit pass; per-skill frontmatter edit where appropriate
  - `docs/plans/2026-05-28-disallowed-tools-skill-audit.md` — create as follow-up plan once the audit method is decided
- **Steps:**
  1. List all skill files: `find .claude/skills -name 'SKILL.md' -type f`.
  2. Per skill, read frontmatter + body; categorize: (a) full-tool-access required, (b) read-only acceptable (no Write/Edit/Bash-exec), (c) write-only-to-own-output (no Read of arbitrary paths), (d) ambiguous — needs Mike's read.
  3. Draft a follow-up plan (`docs/plans/2026-05-28-disallowed-tools-skill-audit.md`) with the audit matrix + per-skill `disallowed-tools` proposals. Don't apply edits until Mike confirms the matrix.
  4. Plan gets its own ROLLOUT row when filed (governance.22.sub or sibling row); register in index.
- **Verify:** Audit-pass deliverable is `docs/plans/2026-05-28-disallowed-tools-skill-audit.md` carrying per-skill categorization + `disallowed-tools:` proposal per skill. Edits to the skills themselves do not ship in this task — that's a downstream task gated on Mike's confirmation.
- **Status:** [ ] not started — picker work, multi-hour audit pass

### Task 3: `/reload-skills` command — workflow adoption note

- **Source:** v2.1.152 (May 27) — `/reload-skills` command added; reloads skill files without restarting Claude Code.
- **Cost-of-delay:** Low absolute cost, but compounds in research-build + engine-sheet terminals which edit skill files multiple times per session today. Restart-to-test friction eliminated.
- **Files:**
  - `.claude/terminals/research-build/TERMINAL.md` — modify (append §Workflow note)
  - `.claude/terminals/engine-sheet/TERMINAL.md` — modify (same)
- **Steps:**
  1. Append to research-build TERMINAL.md (near existing workflow sections):
     > **§Skill Iteration** — when editing skill files (`.claude/skills/**/SKILL.md`) mid-session, run `/reload-skills` to apply the changes without restarting. Source: Claude Code v2.1.152.
  2. Append same to engine-sheet TERMINAL.md.
- **Verify:** `grep -c 'reload-skills' .claude/terminals/research-build/TERMINAL.md .claude/terminals/engine-sheet/TERMINAL.md` → 2.
- **Status:** [x] DONE 2026-05-28 (S241) — §Skill Iteration added to both research-build + engine-sheet TERMINAL.md. Engine-sheet variant cross-links to clasp pull rhythm for sheet-side iteration consistency.

### Task 4: `MessageDisplay` hook event — fit-for-purpose investigation

- **Source:** v2.1.152 (May 27) — new `MessageDisplay` hook event allows transforming assistant messages before display.
- **Cost-of-delay:** Speculative; needs investigation before commit. Possible application: filter Mags-persona-frame leakage in operational terminals (the G-SS1 problem from the boot-burn gap log) without rewriting `identity.md`. Could be a complementary or alternative path to G-SS1.
- **Files:**
  - (investigation only — no edits this task)
- **Steps:**
  1. Fetch the hook contract from Claude Code docs or the v2.1.152 release notes. WebFetch `https://docs.claude.com/en/docs/claude-code/hooks` or equivalent; look for `MessageDisplay` event shape.
  2. Determine: (a) does the hook see/transform full assistant message text, or just metadata; (b) is the transformation pre- or post-render; (c) what's the cost in latency per message.
  3. Decide whether `MessageDisplay` is a legitimate alternative to G-SS1 (identity.md split) for persona-frame stripping in operational terminals.
  4. Output: short feasibility note in this plan's changelog OR a follow-up plan if buildable. If buildable, file a new ROLLOUT row pointing at the follow-up plan; if not, mark task complete with reasoning in the changelog.
- **Verify:** Decision documented either in this plan's changelog (closed-no-build) or in a follow-up plan file registered in index (closed-buildable).
- **Status:** [x] DONE 2026-05-28 (S241) — see §MessageDisplay verdict below. Decision: SKIP for G-SS1 purpose; observational-only-elsewhere.

#### MessageDisplay verdict (S241 finding)

**Verdict: SKIP for the G-SS1 (identity.md split) alternative-path use case. Limited observational uses elsewhere; not addressed by this task.**

Key finding from `https://code.claude.com/docs/en/hooks` fetch:

- MessageDisplay fires **during display**, while assistant message text streams to the user.
- It can transform what the user SEES via `displayContent`, but **cannot change what Claude sees in the transcript or what gets saved to conversation history.** Quote from docs: *"Display-only: the transcript and what Claude sees keep the original."*
- The hook is best-effort asynchronous; the original text displays regardless of hook execution state.
- No documented latency budget.

**Why this fails as a G-SS1 alternative:** The G-SS1 (boot-burn gap log) problem is Mags persona conditioning leaking into operational terminals because `identity.md` always-loads. The persona conditioning is on the MODEL'S side — Claude reads `identity.md` and conditions its output generation. MessageDisplay can strip Mags-voice tokens from the user-visible rendering AFTER generation, but the token-generation cost already happened. The conditioning's downstream effect on every Skill/Edit/Bash routing decision in the terminal also still applies — the hook only affects display, not decision-making. G-SS1 must remain on the identity.md split path; the model-side conditioning is the actual lever.

**Limited valid uses for MessageDisplay (out-of-scope for this task):** stripping system-reminder blocks from user display, logging for analytics, display-only annotations. None of these is the G-SS1 problem.

**No follow-up plan required.** MessageDisplay is not adopted for this task; other uses can surface as separate ROLLOUT rows if needed.

### Task 5: `SessionStart` hook — add `reloadSkills` + `sessionTitle` returns

- **Source:** v2.1.152 (May 27) — `SessionStart` hooks now support `reloadSkills` and `sessionTitle` returns.
- **Cost-of-delay:** Low. `sessionTitle` would set per-terminal chrome title (so the window shows "media / civic / research-build / engine-sheet" without manual tmux inspection). `reloadSkills: true` would force a skill reload at boot, useful if skill files changed since last session.
- **Files:**
  - `.claude/hooks/session-startup-hook.sh` — modify
- **Steps:**
  1. Read current hook (already familiar from S241 boot-burn gap-log work).
  2. Determine the JSON-return shape the v2.1.152 hook contract expects (verify against docs or release notes; do NOT guess).
  3. Modify the hook to emit `sessionTitle` per terminal name (`media`, `civic`, `research-build`, `engine-sheet`, `Mags-only`) — already detected at line 27-44.
  4. Add `reloadSkills: true` to the boot return — low risk, ensures skill-file edits between sessions take effect.
  5. Test by opening a fresh session in each terminal and confirming the title changes.
- **Verify:** Each of the 4 terminals (and Mags-only fallback) emits its correct `sessionTitle`. Hook bash syntax clean (`bash -n .claude/hooks/session-startup-hook.sh`).
- **Status:** [~] EXECUTED-PENDING-BOOT-VERIFY 2026-05-28 (S242, research-build). **Scope was bigger than "small code change":** the contract (verified via claude-code-guide against code.claude.com/docs/en/hooks) requires the ENTIRE hook stdout to be ONE valid JSON object for `sessionTitle`/`reloadSkills` to register — plain text and JSON cannot coexist in stdout. The hook previously emitted plain text (the whole `<godworld-state>` block), so adopting the fields meant converting the output mechanism, not adding two lines. Blast radius = every boot, every terminal. **Implementation:** boot block moved into a `build_boot_context()` function (heredocs + `case` parse cleanly there; inlining heredocs inside `$(...)` does not — first attempt syntax-errored, caught by `bash -n`), captured into `$BOOT_TEXT`, emitted as `{hookSpecificOutput:{hookEventName,additionalContext,sessionTitle,reloadSkills:true}}` built with `jq` (correct escaping guaranteed). **Safety:** if `jq` is ever absent, falls back to legacy plain-text emission (boot context unchanged, no title/reload) — boot never hard-breaks. `pm2 stop` stdout now fully redirected (would have invalidated the JSON). **Offline verification PASS:** `bash -n` clean; output is valid JSON; `sessionTitle` correct per path (research-build live-detected, Mags-only on empty tmux); `reloadSkills:true`; `additionalContext` carries the full byte-identical boot block; all 4 terminal branches present; fallback branch confirmed. **PENDING (Mike, restart-gated):** this install's actual JSON ingestion can't be verified offline — open a fresh session in any terminal and confirm (a) the `<godworld-state>` block still appears, (b) the window title reads the terminal name. If boot context looks wrong: `git revert` this commit (one-line restore of plain-text hook). Per the S242 zod lesson — offline pass ≠ live-boot pass; the real gate is a fresh boot.

### Task 6: Stateful MCP reconnect (v2.1.153) — passive verification

- **Source:** v2.1.153 (May 28) — stateful MCP server reconnect issues fixed.
- **Cost-of-delay:** Zero — fix is already live at v2.1.153 (current version). Task is observational only.
- **Files:**
  - (no edits — passive observation)
- **Steps:**
  1. Over next 2-3 sessions, watch for MCP connection drops (godworld, claude-mem, supermemory MCPs). If none drop, mark task closed.
  2. If drops occur, file an issue against this row reopening the question.
- **Verify:** Two consecutive sessions with no MCP reconnect errors logged in conversation.
- **Status:** [~] OBSERVATION PERIOD OPEN — started 2026-05-28 (S241). Closes at S244+ if no MCP reconnect errors observed across S241–S244. Re-open if drops occur.

---

## Open questions

- [ ] Should Task 2 (`disallowed-tools` audit) be sequenced before or after the S241 boot-burn gap-log G-SS1 fix (identity.md split)? — Both reduce per-skill load surface. `disallowed-tools` is per-skill tool scoping; G-SS1 is rule-file scoping. They don't conflict; either ordering works. *Provisional:* let `/usage` per-category data (Task 1) inform the ordering. If MCPs / plugins dominate the budget, `disallowed-tools` lands first; if rule files dominate, G-SS1 lands first.
- [ ] Should this plan's tasks promote individually to separate ROLLOUT rows once Mike picks them up, or stay as sub-tasks under governance.22? — Project pattern (governance.18 partial-close model) allows partial closure inside a row. Keep as sub-tasks; close in commits with `(governance.22 Task N closed)` notation.

---

## Status log

### governance.22 — status (drained from ROLLOUT, 2026-06-26 / S274)

Claude Code v2.1.149–v2.1.153 feature adoption — 6 candidate items from May 22–28 releases: (1) `/usage` per-category cadence note **CLOSED S241** — §End-of-Session Diagnostic in all 4 TERMINAL.md, (2) `disallowed-tools` per-skill scope audit **AUDIT DONE S242 (research-build)** — [[../plans/2026-05-28-disallowed-tools-skill-audit]]: 48-skill matrix (10 FULL / 2 LOADER / 16 WRITEOWN / 20 READONLY), mechanics verified via claude-code-guide (pattern scoping `Bash(rm *)`, `Agent` not "Task", Q4 cascade + Q5 run-while-disallowed undocumented). **Reframed AUTONOMY-GATED per Mike S242** — feature's design intent is unattended skills; GodWorld is human-in-loop today, so the matrix is durable prep and the pilot-first editing rollout waits for the unattended/scheduled-execution transition (NOT a near-term picker). No skill files edited, (3) `/reload-skills` workflow note **CLOSED S241** — §Skill Iteration in research-build + engine-sheet, (4) `MessageDisplay` hook investigation **CLOSED S241 SKIP** — display-only event, can't change model-side persona conditioning that drives G-SS1; identity.md split remains the actual lever, (5) `SessionStart` hook upgrade (`reloadSkills` + `sessionTitle` returns) **EXECUTED-PENDING-BOOT-VERIFY S242 (research-build):** hook converted to single-JSON-object output (whole-stdout-JSON required for structured fields per verified contract) — `build_boot_context()` fn + `jq`-built `{hookSpecificOutput:{additionalContext,sessionTitle,reloadSkills:true}}` + jq-missing plain-text fallback. Offline verification all-pass; live-boot ingestion gated on Mike's next fresh session (revert = git revert the S242 commit), (6) Stateful MCP reconnect **OBSERVATION OPEN S241→S244+**. Version verified current (`claude --version` → `2.1.153`); no upgrade gate. 5-of-6 resolved; **no near-term pickable work remains** — T5 awaits Mike's boot-verify, T6 observation runs to S244, T2 edit-rollout is autonomy-gated. Source: S241 conversation + GitHub release notes. Sibling to governance.21 (Gemini offload — external lever on same token-budget concern; this is the internal lever).

## Changelog

- 2026-05-28 — Initial draft (S241). Mike S241 directive: *"pull all useful tools onto the rollout for future session builds, if something is crucial for us do it now."* Survey of v2.1.148–v2.1.153 release notes yielded 6 candidate features (7th — `/code-review --fix` — already covered by project's `/simplify` alias, dropped). Version verified current (`claude --version` → `2.1.153`) at plan-write; no upgrade gate. Nothing crucial-now per honest read; all six items are improvement work for picker grab.
- 2026-05-28 — **Task 5 EXECUTED-PENDING-BOOT-VERIFY (S242, research-build).** Mike picked T5 off the gov.22 picker. Measure-twice surfaced that T5 ≠ "small code change": SessionStart structured fields require whole-stdout-as-JSON (contract verified via claude-code-guide). Converted `.claude/hooks/session-startup-hook.sh` to a `build_boot_context()` function + single `jq`-built JSON object (`additionalContext` + `sessionTitle` per terminal + `reloadSkills:true`), with a jq-missing plain-text fallback so boot never hard-breaks. First attempt inlined heredocs inside `$(...)` and syntax-errored — `bash -n` caught it; refactored to a function. Offline verification all-pass (syntax, valid JSON, per-terminal title, full boot payload, fallback). Live-boot ingestion unverified offline — gated on Mike's next fresh session. 4-of-6 tasks now resolved/closed; T2 (`disallowed-tools` audit) is the last open picker; T6 observation window still running to S244+. Pattern: feedback_measure-twice-cascading-effects + S242 zod lesson (offline pass ≠ live-boot pass).
