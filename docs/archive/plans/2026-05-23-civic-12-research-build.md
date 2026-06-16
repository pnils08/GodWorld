---
title: civic.12 Research-Build Slice — Project-Agent Pre-Write Constraint + City-Hall Skill Disambiguation
created: 2026-05-23
updated: 2026-05-23
type: plan
tags: [civic, skill-text, agent-rules, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md §civic.12
  - docs/plans/2026-05-22-c94-gap-log-triage.md §3 C9
  - output/production_log_city_hall_c94_run_gaps.md (G-R1, G-R2, G-R3, G-R4, G-R5)
  - output/production_log_city_hall_c94_gaps.md (G-PREP1, G-PREP3, G-PREP5, G-PREP7, G-PREP8)
  - .claude/agents/civic-project-{oari,health-center,stabilization-fund,transit-hub}/RULES.md
  - .claude/agents/civic-office-baylight-authority/RULES.md
  - .claude/skills/{city-hall,city-hall-prep,city-clerk}/SKILL.md or equivalent
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — civic.12 row"
  - "[[../SCHEMA]] — doc conventions"
  - "[[../index]] — register same commit"
  - "[[2026-05-22-c94-gap-log-triage]] — parent triage §3 C9"
---

# civic.12 Research-Build Slice Plan

**Goal:** Close the research-build slice of civic.12 by structurally enforcing the S215 G-R5 pre-write constraint (which was previously a documentation-only close that didn't hold — the constraint asserted in `/city-hall` SKILL.md was never actually added to the per-agent RULES.md files), plus skill-text reconciliation for Baylight layer ambiguity (G-R3), Mara directive Drive convention (G-PREP3), ESCALATION override semantics (G-PREP8), and city-clerk one-pass-audit directive (G-R5). Deferred to follow-ups: G-R1 (`trackerUpdates` schema decision — needs `applyTrackerUpdates.js` reality check + cross-terminal coordination with engine-sheet), G-R4 (agent-memory permission investigation), G-PREP1 (auto-investigate move to post-`/city-hall` — needs deeper design rethink).

**Architecture:** Skill-text + agent-RULES edits across 9 files. The structural fix for G-R2 (the highest-leverage item) is: remove the "Write decisions JSON" instruction at Step 5 from all 5 project-agent RULES.md (OARI, Health Center, Stab Fund, Transit Hub, Baylight Authority), replace with explicit "DO NOT pre-write `decisions_c{XX}.json` at Step 5 — that's a Step 6 artifact created by `scripts/assembleDecisions.js`" constraint. Preserve the OUTPUT section's description of what decisions_c{XX}.json contains (still part of the cycle's eventual artifacts; just created by the script, not the agent). Deliverable filings (doc_*, deliverable_*, workforce_*) remain legitimate canon work the project director files per their IDENTITY scope.

**Terminal:** research-build

**Pointers:**
- Parent triage: [[2026-05-22-c94-gap-log-triage]] §3 C9.
- Source gap logs: `output/production_log_city_hall_c94_gaps.md` (G-PREP*) + `output/production_log_city_hall_c94_run_gaps.md` (G-R*).
- S215 close-note at `.claude/skills/city-hall/SKILL.md` line 205 explicitly says "Project agent SKILL.md / RULES.md for every project (Baylight, OARI, Stab Fund, Health Center, Transit Hub) carries the constraint" — this plan closes the gap between the assertion and the file state.

**Acceptance criteria:**
1. All 5 project-agent RULES.md files (`.claude/agents/civic-project-{oari,health-center,stabilization-fund,transit-hub}/RULES.md` + `.claude/agents/civic-office-baylight-authority/RULES.md`) carry an explicit "DO NOT pre-write decisions_c{XX}.json at Step 5" constraint near the top of the file, AND the prior "Write decisions JSON" tool-schedule entries are removed or rewritten to point at the constraint.
2. `.claude/skills/city-hall/SKILL.md` Baylight Authority disambiguation: appears in exactly one of Layer-2 (Step 4 voice list) or Layer-3 (Step 5 project list), not both. Recommendation per gap log: Layer-3 (project-director matches IDENTITY scope).
3. `.claude/skills/city-hall-prep/SKILL.md` (or equivalent) Step 1 carries: (a) Mara directive Drive folder convention check before AUTO-derivation; (b) Mara ESCALATION-tagged directives override absence-of-statement defaults — voice must be assigned a topic.
4. `.claude/agents/city-clerk/SKILL.md` carries a "one-pass-audit" directive: write the audit JSON in a single Write call without prior exploratory reads, OR prescribe Bash-tool-allowed structural pre-check before the JSON write.
5. ROLLOUT civic.12 partial close: research-build slice CLOSED inline with sub-deliverable mapping (G-R2, G-R3, G-R5, G-PREP3, G-PREP8); deferred items (G-R1, G-R4, G-PREP1) named explicitly with reasons.

---

## Design

### G-R2 — Project-agent pre-write constraint (the S215 close that didn't hold)

**Failure pattern:** S215 closed G-R5 with a documentation-only update — `/city-hall` SKILL.md line 205 asserts "Project agent SKILL.md / RULES.md for every project (Baylight, OARI, Stab Fund, Health Center, Transit Hub) carries the constraint." **The constraint was never added to the RULES.md files.** Per-agent RULES.md still carry the OLD instruction ("Write decisions JSON. Save to `output/city-civic-database/initiatives/{slug}/decisions_c{XX}.json`") in their tool-call schedule + OUTPUT sections. OARI self-diagnosed this gap in its C94 run summary.

**Per-agent line patterns (verified):**

| Agent | Bullet line | Save-to line | Tool-call schedule | OUTPUT section |
|-------|-------------|--------------|--------------------|----------------|
| `civic-office-baylight-authority` | L13 | L247 | L78 | L329 |
| `civic-project-oari` | L65 | L74 | L139 | L323 |
| `civic-project-health-center` | L74 | L83 | L157 | L310 |
| `civic-project-stabilization-fund` | L62 | L137 | L209 | L395 |
| `civic-project-transit-hub` | L60 | L69 | L132 | L285 |

**Fix shape (applied identically to each file):**

1. **Add a new §Pre-Write Constraint section near the top of each RULES.md** (after the Output section that lists what the agent writes — that section gets reframed). The new section explicitly states:
   ```
   ## Pre-Write Constraint (Step 5 vs Step 6)

   You DO NOT pre-write `decisions_c{XX}.json` at Step 5. That artifact is
   created at Step 6 by `scripts/assembleDecisions.js` from your voice
   JSON content. Writing it at Step 5 violates the user-approval gate
   that protects tracker apply.

   Your Step 5 output is:
   - REQUIRED: voice JSON at `output/civic-voice/{slug}_c{XX}.json` —
     flat top-level statement array matching cabinet/voice cascade shape.
   - OPTIONAL: deliverable filings at `output/city-civic-database/initiatives/{slug}/`
     (formal documents, progress reports, workforce updates) per your
     IDENTITY canon scope. These are the project director's legitimate
     filings, distinct from the decisions JSON.
   - FORBIDDEN: `output/city-civic-database/initiatives/{slug}/decisions_c{XX}.json`
     — assembleDecisions.js creates this at Step 6 from your voice JSON's
     decisions[] content. If you write it, the Step 6 apply runs against
     stale agent-pre-write instead of canonically-assembled content.

   S229 close of S215 G-R5 recurrence (G-R2). The S215 close was
   documentation-only; this section is the structural enforcement.
   ```

2. **Remove the "Write decisions JSON" entry from the tool-call schedule table** (or rewrite to "DO NOT write decisions JSON — see §Pre-Write Constraint").

3. **Rewrite OUTPUT section's "Decisions JSON" subsection** to clarify the artifact is real but assembled at Step 6, not Step 5. Keep the schema description for downstream understanding but remove the "you write this" framing.

4. **Update the top-of-file Output bullet list** to remove the standalone "Decisions JSON: `decisions_c{XX}.json`" line — replace with a pointer to §Pre-Write Constraint.

### G-R3 — Baylight Authority Layer-2/Layer-3 disambiguation

**Failure:** `.claude/skills/city-hall/SKILL.md` v2.1 §Step 4 voice list includes `civic-office-baylight-authority` AND §Step 5 project list also includes it. Same agent in two cascade layers without disambiguation. C94 operator ran her in Layer-2 (received Mayor cascade only, not all-voice cascade — poorer context than designed).

**Fix:** Pick Layer-3 (project-director matches her IDENTITY scope better than cabinet-voice — she runs the Baylight District project, she's not a citywide cabinet voice). Remove from Layer-2 list. Add a clarifying note in the skill text: "Baylight Authority runs at Layer-3 with the other project agents (OARI / Stab Fund / Health Center / Transit Hub) — she receives full cascade context (Mayor + all factions + cabinet) before reporting. Her `civic-office-*` path prefix is a legacy naming artifact; she is a project director, not a citywide cabinet voice."

### G-PREP3 — Mara directive Drive folder convention

**Failure:** `output/mara-directives/mara_directive_c94.txt` was missing at C94 prep session start. Skill specifies AUTO-derivation if absent. Mike instead handed a Drive file ID via Discord chat. Skill workflow has no "check Drive for Mara directive" step — only "auto-derive AUTO version if absent." For autonomous mode, this is a blocker.

**Fix:** `.claude/skills/city-hall-prep/SKILL.md` Step 1 Mara directive section gains a "check Drive `mara-directives/` folder first" step before AUTO-derivation. Document the folder convention (path or Drive folder ID). Mara files manually → ad-hoc per-cycle file ID is the current state; until that's regularized (Mara writes directly to disk via service-account, or a known fixed Drive folder), the skill text needs to instruct: (a) check Drive folder `<folder-id>` for `mara_directive_c{XX}.{txt,md}`; (b) if found, download via `scripts/downloadDriveFile.js`; (c) if absent, fall back to AUTO-derivation with explicit warning.

### G-PREP8 — Mara ESCALATION override of absence-of-statement default

**Failure:** Mara C94 directive on Okoro tagged "ESCALATION — this directive was issued in C93 and went unsatisfied." Skill v1.2 mentions civic.5 (Okoro absence-of-statement is meaningful — don't force a statement) AND S215 G-9 (Mara additive only, not primary) — pulling opposite ways. No skill-text rule for "Mara ESCALATION overrides civic.5 absence-of-statement default."

**Fix:** `.claude/skills/city-hall-prep/SKILL.md` Step 1 (or equivalent topic-assignment section) gains an ESCALATION rule:

```
ESCALATION-tagged Mara directives override absence-of-statement defaults.
If Mara filed an ESCALATION directive on a voice agent who is normally
treated as absence-meaningful (Okoro per civic.5), the voice MUST be
assigned a topic. ESCALATION signals Mara already gave the voice one
cycle of pass; a second pass would be canonical drift. Tag the
pending_decisions packet with "MARA ESCALATION — voice must respond."
```

### G-R5 — City Clerk one-pass-audit directive

**Failure:** First Clerk launch at C94 Step 5.6 terminated after 17 tool calls without writing `clerk_audit_c94.json`. Agent ran exploratory reads of voice JSONs and ran out of turn budget before producing the audit artifact. Re-launch with tight "produce JSON in one Write call, no exploration" prompt succeeded in 3 tool calls.

**Fix:** `.claude/agents/city-clerk/SKILL.md` (or equivalent) gains a "one-pass-audit" directive at the top of the skill:

```
## One-Pass Audit (S229)

You produce the audit JSON in a single Write call. No exploratory reads
of voice JSONs before writing. The audit prompt carries the structured
10-check schema; fill it from the prompt's context, not by re-reading
files. If you need a voice JSON that wasn't included in the prompt
context, request it via a single Read + then write the audit — NOT a
multi-turn exploration.

Pattern: read prompt → write audit JSON in one Write call → done.
17-tool-use ceiling on Clerk runs without producing output is a real
failure mode (S229 G-R5). Tighter prompts work; exploratory prompts
hit the budget without producing the artifact.
```

### Deferred items

| Gap | Reason for deferral |
|-----|---------------------|
| **G-R1** trackerUpdates schema | Cross-terminal: needs `applyTrackerUpdates.js` actual-input-shape verification (engine-sheet read) + canonical-shape decision before either agent RULES.md or script edits. Decision involves which side bends. File for next session with engine-sheet coordination. |
| **G-R4** agent-memory permission | **CLOSED won't-build S256.** Mischaracterized as a safety boundary — it's NOT a write to Mags' MEMORY.md; it's each voice's own `.claude/agent-memory/<agent>/MEMORY.md` self-held continuity scratchpad (read-at-boot / update-at-end, wired in each agent SKILL; files exist). Redundant with the load-bearing path: `/city-hall-prep` already pushes "what you said last cycle" from the prior voice JSON into each packet. The scratchpad is a vestigial parallel (older, unverified during subagent runs, confusingly reuses the `MEMORY.md` name). Left in place (harmless); rename off `MEMORY.md` if agents ever need private notes. No safety fork. |
| **G-PREP1** auto-investigate move | **CLOSED S256 (city-hall-prep v1.5), option (c).** Root cause confirmed: the Step 1 disambiguation checked for a `C{XX}` MilestoneNotes entry, but runs at prep — before `/city-hall` Step 6 writes that entry — so the current-cycle entry can't exist and every flagged initiative mis-fired into Scenario A, defeating civic.11's false-positive disambiguation. Fix = reframe the 3 dispositions to read the **latest existing entry** (normally `C{XX-1}`) instead of literal `C{XX}`. Chose option (c) over (a) post-/city-hall audit-move + (b) gate-on-completion: lowest blast-radius, preserves the Scenario A/B/C/D framework, no step relocation — restores intended civic.11 behavior rather than changing it. |

### Pre-mortem

| Failure mode | Mitigation |
|---|---|
| Agent reads new §Pre-Write Constraint section but still pre-writes because tool-call schedule still lists "Write decisions JSON" | Edit ALL three reference sites per agent in same commit: top-of-file Output bullet, tool-call schedule row, OUTPUT section. Section header alone isn't enough — the procedural language has to be removed too. |
| New §Pre-Write Constraint section gets ignored because it's buried | Position near top of file (after Identity / Inputs, before Output). Section title is the first thing the agent reads when scanning RULES.md. |
| Baylight Layer-3-only change breaks existing prompt scripts that invoke her at Layer-2 | Search the codebase for `baylight_authority_c{XX}.json` invocation patterns. If skill text drives invocation, the text update is sufficient. If hard-coded scripts invoke her at Layer-2, those need updating too. |
| ESCALATION override rule conflicts with future-cycle Mara directives that explicitly want absence-of-statement preserved | Add escape clause: "Mara may opt out of ESCALATION override by tagging the directive 'ESCALATION — absence acceptable' explicitly." Default is override; opt-out is explicit. |
| Clerk one-pass directive too restrictive — Clerk legitimately needs to read voice JSONs to audit them | The structured 10-check prompt should embed the voice JSONs as context (operator passes them via prompt). Clerk reads the prompt, writes the audit. If voice JSONs are too large to embed, structure shifts to "one-pass per voice: read voice JSON, write per-voice audit row, move on" — still bounded, not exploratory. |

---

## Tasks

### Task 1: Update 5 project-agent RULES.md with §Pre-Write Constraint

- **Files:**
  - `.claude/agents/civic-office-baylight-authority/RULES.md`
  - `.claude/agents/civic-project-oari/RULES.md`
  - `.claude/agents/civic-project-health-center/RULES.md`
  - `.claude/agents/civic-project-stabilization-fund/RULES.md`
  - `.claude/agents/civic-project-transit-hub/RULES.md`
- **Steps (per agent):**
  1. Add §Pre-Write Constraint section near top of file (after Identity / Inputs, before Output bullets).
  2. Remove standalone "Decisions JSON: `decisions_c{XX}.json`" bullet from top-of-file Output list — replace with pointer to §Pre-Write Constraint.
  3. Remove or rewrite "Save to: ... decisions_c{XX}.json" line in execution section.
  4. Remove "Write decisions JSON" entry from tool-call schedule table (or rewrite to "DO NOT — see §Pre-Write Constraint").
  5. Reframe OUTPUT section's "Decisions JSON" subsection: keep schema description (downstream understanding) but remove "you write this" framing.
- **Verify:** `grep -c "Pre-Write Constraint\|DO NOT pre-write" .claude/agents/civic-{office-baylight-authority,project-oari,project-health-center,project-stabilization-fund,project-transit-hub}/RULES.md` ≥ 5.
- **Status:** [ ] not started

### Task 2: /city-hall SKILL.md Baylight Layer-3-only

- **Files:**
  - `.claude/skills/city-hall/SKILL.md`
- **Steps:**
  1. Locate §Step 4 Layer-2 voice list and §Step 5 Layer-3 project list.
  2. Remove `civic-office-baylight-authority` from §Step 4 voice list.
  3. Add clarifying note in §Step 5 that Baylight Authority runs here despite her `civic-office-*` path (legacy naming artifact; she is a project director).
- **Verify:** `grep -c "baylight" .claude/skills/city-hall/SKILL.md` (Layer-2 occurrence removed; Layer-3 occurrence + clarification note present).
- **Status:** [ ] not started

### Task 3: /city-hall-prep SKILL.md — Mara Drive convention + ESCALATION override

- **Files:**
  - `.claude/skills/city-hall-prep/SKILL.md` (or equivalent — verify file path first)
- **Steps:**
  1. Locate Step 1 Mara directive section.
  2. Add Drive folder check before AUTO-derivation (G-PREP3): "Check Drive `mara-directives/` folder for `mara_directive_c{XX}.{txt,md}` before AUTO. If found, download via `scripts/downloadDriveFile.js`. If absent, fall back to AUTO with explicit warning."
  3. Add ESCALATION override rule (G-PREP8): "ESCALATION-tagged Mara directives override absence-of-statement defaults. If Mara filed ESCALATION on a voice normally treated as absence-meaningful (Okoro per civic.5), assign a topic. Tag pending_decisions packet 'MARA ESCALATION — voice must respond.'"
- **Verify:** Grep for "MARA ESCALATION" + "mara-directives/" in skill text.
- **Status:** [ ] not started

### Task 4: city-clerk SKILL.md — one-pass-audit directive

- **Files:**
  - `.claude/agents/city-clerk/SKILL.md` (verify file path)
- **Steps:**
  1. Add §One-Pass Audit section at top of skill.
  2. Document the "read prompt → write audit in one Write call" pattern.
  3. Cite S229 G-R5 (17-tool-use ceiling failure mode).
- **Verify:** `grep -c "One-Pass Audit\|one-pass audit" .claude/agents/city-clerk/SKILL.md` ≥ 1.
- **Status:** [ ] not started

### Task 5: Register plan + flip civic.12 ROLLOUT row

- **Files:**
  - `docs/index.md` — add plan entry
  - `docs/engine/ROLLOUT_PLAN.md` — civic.12 row partial-close with research-build sub-deliverable closure inline + deferred items named explicitly
- **Steps:**
  1. `docs/index.md` plan registration.
  2. ROLLOUT civic.12: research-build slice CLOSED inline; deferred items (G-R1 cross-terminal, G-R4 investigation, G-PREP1 design-rethink) listed with reasons. State stays `in-progress` (engine-sheet half + deferred research-build items still open) OR split into separate rows if cleaner.
- **Verify:** `grep -n "civic.12" docs/engine/ROLLOUT_PLAN.md` shows updated row.
- **Status:** [ ] not started

### Task 6: Commit + push

- **Files:**
  - Commit: plan + 5 project-agent RULES + 3 SKILLs + ROLLOUT + index
- **Steps:**
  1. Cross-terminal git stack check.
  2. Stage path-specifically.
  3. Commit message: `S229 [research-build] civic.12 part 1 — project-agent pre-write constraint (S215 G-R5 close) + city-hall + city-hall-prep + Clerk skill text`.
  4. Push.
- **Verify:** `git log --oneline -1` shows the commit; cross-terminal stack clean post-push.
- **Status:** [ ] not started

---

## Open questions

None at write time. Path to `.claude/skills/city-hall-prep/SKILL.md` and `.claude/agents/city-clerk/SKILL.md` to be confirmed at execute time (Task 3 and Task 4 verify steps cover this).

---

## Changelog

- 2026-05-23 — Initial draft (S229 research-build). Scope tightened: research-build slice of civic.12 cluster C9 closeable in one session. G-R2 (highest-leverage HIGH — S215 G-R5 documentation-only close that didn't hold) + G-R3 + G-PREP3 + G-PREP8 + G-R5. Deferred G-R1 / G-R4 / G-PREP1 to follow-ups per cross-terminal / investigation / design-rethink reasons.
