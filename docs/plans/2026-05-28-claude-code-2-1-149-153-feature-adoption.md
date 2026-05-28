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
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (governance.22)"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — register in same commit"
  - "[[2026-05-28-gemini-offload-pattern]] — sibling S241 plan, governance.21 — different lever on the same token-budget concern"
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
- Sibling: [[2026-05-28-gemini-offload-pattern]] (governance.21) — Gemini offload triage is the *external* lever on token budget; this plan is the *internal* lever (use the harness's own newer scoping mechanisms).
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
- **Status:** [ ] not started

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
- **Status:** [ ] not started — tiny

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
- **Status:** [ ] not started — investigation work

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
- **Status:** [ ] not started — small code change; gated on verifying the hook return-shape contract first

### Task 6: Stateful MCP reconnect (v2.1.153) — passive verification

- **Source:** v2.1.153 (May 28) — stateful MCP server reconnect issues fixed.
- **Cost-of-delay:** Zero — fix is already live at v2.1.153 (current version). Task is observational only.
- **Files:**
  - (no edits — passive observation)
- **Steps:**
  1. Over next 2-3 sessions, watch for MCP connection drops (godworld, claude-mem, supermemory MCPs). If none drop, mark task closed.
  2. If drops occur, file an issue against this row reopening the question.
- **Verify:** Two consecutive sessions with no MCP reconnect errors logged in conversation.
- **Status:** [ ] open — observational, closes itself

---

## Open questions

- [ ] Should Task 2 (`disallowed-tools` audit) be sequenced before or after the S241 boot-burn gap-log G-SS1 fix (identity.md split)? — Both reduce per-skill load surface. `disallowed-tools` is per-skill tool scoping; G-SS1 is rule-file scoping. They don't conflict; either ordering works. *Provisional:* let `/usage` per-category data (Task 1) inform the ordering. If MCPs / plugins dominate the budget, `disallowed-tools` lands first; if rule files dominate, G-SS1 lands first.
- [ ] Should this plan's tasks promote individually to separate ROLLOUT rows once Mike picks them up, or stay as sub-tasks under governance.22? — Project pattern (governance.18 partial-close model) allows partial closure inside a row. Keep as sub-tasks; close in commits with `(governance.22 Task N closed)` notation.

---

## Changelog

- 2026-05-28 — Initial draft (S241). Mike S241 directive: *"pull all useful tools onto the rollout for future session builds, if something is crucial for us do it now."* Survey of v2.1.148–v2.1.153 release notes yielded 6 candidate features (7th — `/code-review --fix` — already covered by project's `/simplify` alias, dropped). Version verified current (`claude --version` → `2.1.153`) at plan-write; no upgrade gate. Nothing crucial-now per honest read; all six items are improvement work for picker grab.
