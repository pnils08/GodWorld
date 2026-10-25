---
title: Codex review — boot docs and job model
created: 2026-10-23
updated: 2026-10-23
type: reference
tags: [architecture, infrastructure, active]
sources:
  - 3dcad5f0ff45ab680fe0705bbb450a2896a3aca3
  - 3d2da1910c5cc8ce0eeb17b2a1f924fd6ecc5fa6
  - docs/archive/for-claude-review/2026-10-23-codex-job-model-review-TASK.md
  - docs/engine/ROLLOUT_PLAN.md
  - docs/engine/rollout-rules.md
  - scripts/docLoopStatus.js
pointers:
  - "[[engine/rollout-rules]] — tracker contract requiring reconciliation"
  - "[[MODEL_HIERARCHY]] — job-model status"
---

# Codex review — boot docs and job model

**Target:** `3dcad5f0` + `3d2da191`, answering the five questions in the named TASK.

**Result: HOLD for adopting the job model as a complete operating contract.** The tone cleanup can stand. The job model supplies actionable instructions, but its tracker, boot roster and close procedure still express different rules. The measured tracker contains **87 rows, 8 active builds assigned to one terminal, and 14 rows naming two terminals**; its current lint returns clean. Four of the five requested gates survive in the boot/on-demand path. The fifth, mandatory Codex SHIP before PROD, is absent from both the before and after boot documents: this is a pre-existing omission, not a deletion attributable to these commits.

**Scope and evidence:** source review plus read-only local measurements. HEAD was `3d2da1910c5cc8ce0eeb17b2a1f924fd6ecc5fa6`. All reviewed boot files, MODEL_HIERARCHY, ROLLOUT, rollout-rules and docLoopStatus matched that commit. The working tree had extensive pre-existing changes, including SESSION_CONTEXT and newsroom scripts; none were edited. ROLLOUT was 177 lines / 32,695 bytes, SHA-256 `dfcf309dbf030c34954789e81f86f00d84fc7e800a3917c735e42806aa9131fb`.

## Findings

### 1. Produce or describe — FIX (high)

The block is delivered on the registered-terminal branch, after its boot sequence: `.claude/hooks/session-startup-hook.sh:234-277`. It is more than a wish, but delivery of an instruction is not evidence that the next terminal obeys it.

- **Sentence that binds:** “OPEN = one ROLLOUT row with this terminal as owner, and the model named for the job…” (`.claude/hooks/session-startup-hook.sh:275`). It names observable outputs: a row, an owner and a model selection. “DURING = nothing else opens; a defect or idea surfaced mid-job becomes a ROLLOUT row, not a build” supplies a concrete prohibition at the same line.
- **Sentence that does not establish a gate:** “Mike reads twice per job: the plan at open, the NEXT line at close” (same line). It predicts the builder's behavior without defining an approval receipt, what constitutes approval, or what happens if the plan changes. The job remains authorized only to its actual approved scope. “The two windows are two jobs, not two phases” describes the intended arrangement; it does not select or claim work.

Four source-level problems prevent this becoming a reliable next-boot procedure:

1. **The same payload gives conflicting routing.** Hook line 187 still says research-build is Sonnet plus Opus advisor for architecture/rollout/pipeline tuning, and engine-sheet is Opus plus Fable advisor for engine code/sheets/deploys. Line 275 says either terminal carries any job and selects its model per job. This is active injected text, unlike the explicitly historical split at `docs/MODEL_HIERARCHY.md:24-26`.
2. **There is no resume/claim step.** The research-build sequence reads two docs, queries family, lists lanes and greets (`hook:236-245`); the engine-sheet sequence reads its docs and greets (`hook:251-254`). Neither establishes which existing `in-progress` row is this terminal's job before allowing a new one. A compliant model could perform the OPEN action, but the hook does not inspect the tracker or reject a second claim.
3. **Job scope and incidental repairs disagree.** Research-build says anything surfaced mid-job files and waits (`.claude/terminals/research-build/TERMINAL.md:53`); engine-sheet explicitly permits a one-commit fix inside the current scope (`.claude/terminals/engine-sheet/TERMINAL.md:72,78`). The canonical block needs that distinction. An acceptance-blocking repair within the approved job is work needed to finish it; an unrelated improvement is a queued job. Commit count alone cannot establish that boundary.
4. **Job close and session close are conflated.** Canonical CLOSE says `done-pending-archive` and NEXT describing this one job (`hook:275`). The close skill says NEXT carries where work is and the next move, and only closed rows flip (`.claude/skills/session-end/SKILL.md:42-64`). It also explicitly says length is judgment, not a gate (`:46`; `scripts/sessionEndMechanical.js:337-340`). A session ending mid-job must preserve `in-progress`; a completed job awaiting an acceptance watch must not be falsely marked complete. No mechanism newly enforces 350 characters.

**Proposed correction:** define resume before open: read the terminal's active row; resume it if present; otherwise claim one eligible row and name the model. Keep ownership through completion, distinguish session handoff from job completion, and state the in-scope-repair exception once. Remove the contradictory roster. This is a proposed contract, not an applied change or an observed successful boot.

### 2. Jobs create jobs; tracker enforceability — FIX (high)

**Builder's words (2026-10-23):** “the one job at a time is not really possible as every job creates jobs.”

The response can work as a limit on **active execution**, with discoveries retained as queued work. It cannot mean that a terminal may own only one non-archived row: 54 rows are already shipped and awaiting observation. The state definition expressly distinguishes those from active builds (`docs/engine/rollout-rules.md:113-118`).

Exact census of the five-cell work rows, excluding headings and the generated plans-in-motion bullets (`docs/engine/ROLLOUT_PLAN.md:74-177`):

| Terminal cell, literal | live-observing | ready | in-progress | needs-info | blocked | Total |
|---|---:|---:|---:|---:|---:|---:|
| engine-sheet | 37 | 14 | 8 | 1 | 2 | 62 |
| research-build | 8 | 1 | 0 | 2 | 0 | 11 |
| engine-sheet / research-build | 6 | 2 | 0 | 0 | 0 | 8 |
| research-build / engine-sheet | 1 | 0 | 0 | 3 | 0 | 4 |
| research-build + engine-sheet | 2 | 0 | 0 | 0 | 0 | 2 |
| **Total** | **54** | **17** | **8** | **6** | **2** | **87** |

These are recorded states, not a claim that eight processes are presently coding. All eight `in-progress` rows are in §3 Now, owner engine-sheet:

| Row | ROLLOUT line |
|---|---:|
| engine.193 | 114 |
| pipeline.69 | 119 |
| governance.51 | 120 |
| canon.5 | 122 |
| engine.91 | 124 |
| engine.99 | 125 |
| engine.116 | 126 |
| engine.202 | 128 |

The proposed ≤1 rule is violated by **7 excess active rows** for engine-sheet; research-build has 0 recorded active rows. It is unsafe to infer that research-build is actually idle from that zero: the dirty handoff and newsroom files are separate evidence, and this review does not reclassify their work.

The section names also do not currently identify states reliably:

| Section | live-observing | ready | in-progress | needs-info | blocked | Total |
|---|---:|---:|---:|---:|---:|---:|
| §1 Waiting on builder | 1 | 2 | 0 | 2 | 0 | 5 |
| §2 Waiting on fire | 14 | 0 | 0 | 0 | 1 | 15 |
| §3 Now | 12 | 7 | 8 | 0 | 0 | 27 |
| §4 Queue | 27 | 8 | 0 | 4 | 1 | 40 |

**Proposed table rule:** every `in-progress` row occurs in §3 Now and has exactly one Terminal value, either `research-build` or `engine-sheet`; across the entire tracker each terminal has at most one such row. Both active jobs may generate any number of properly filed `ready`, `needs-info` or `blocked` rows, with the reason and pointer retained. A deployed watch remains `live-observing`, with an accountable owner, without occupying an active-build slot. On suspension, state and reason must reflect the real condition; do not relabel unfinished work merely to pass the count. When a watch demands a substantive repair, reconcile that repair against the current active job before starting it.

**What lint would need to check:**

1. Parse exact five-cell rows and section identity, reporting line number and row ID. Reject malformed rows and duplicate IDs before counting; do not silently omit them.
2. Validate the Terminal enum and reject `/` or `+` composite owners. Define explicitly whether unclaimed queue rows may have a blank Terminal; never allow a blank active owner.
3. Reject `in-progress` outside §3; count active rows globally per terminal and report every ID when count exceeds 1. A row elsewhere must not evade the limit.
4. Run the same checks through both `--lint` and `--gate`. Preserve their distinct exit contracts unless callers are deliberately updated: `--lint` reports with exit 0, while `--gate` exits 1 (`scripts/docLoopStatus.js:115-128`).

**Observed validation:** `node scripts/docLoopStatus.js --lint` returned exit 0 and “ROLLOUT LINT: clean — every row is a sweep-safe pointer within budget.” Its implementation checks state-cell multiplicity and summary length only (`:90-113`); it does not check terminal ownership, section membership or active-job counts. `parseRollout` treats the terminal as free text (`:57-77`).

Even the proposed lint enforces a table representation, not actual tool activity. The pre-commit gate only runs this validator when ROLLOUT is staged, and the validator reads the working-tree file (`.githooks/pre-commit:73-85`; `scripts/docLoopStatus.js:92`). A staged/working-tree mismatch or unrecorded second build is outside that enforcement. Actual admission would need a serialized claim checked before work starts; neither reviewed commit implements one. Do not describe a clean table lint as proof of serialized execution.

### 3. Load-bearing gates — FIX (high for the missing PROD prerequisite)

| Required gate | After these commits: readable location | Verdict |
|---|---|---|
| Codex SHIP before PROD | No explicit prerequisite in the reviewed boot set or engine §Authority. Engine helper table names Codex review (`.claude/terminals/engine-sheet/TERMINAL.md:59`); line 65 permits Codex **or agy** review before a multi-part build. Neither requires Codex SHIP of the deploy candidate. | **FIX: absent.** Also absent from the same boot sources at `3dcad5f0^`; not proven removed by these commits. |
| Bench before PROD | Engine §Authority `:77`: clean bench Cycle on live-synced state; research-build rule `:23` and TERMINAL `:31,80` repeat/link it. | **SHIP: retained**, available for an engine job at either terminal. |
| One unbenched change in flight | Same engine line `:77`, research-build rule `:23`, research-build TERMINAL `:80`. | **SHIP: retained in text.** Clarify that the limit is shared across engine jobs/bench use, not one per window. Two jobs must not become two unbenched changes on the shared bench. |
| No amend | Engine §Authority `:74`; research-build rule `:23`, research-build TERMINAL `:80`. | **SHIP: retained.** |
| Never message a busy lane | Research-build TERMINAL `:86` explicitly retains the 2026-10-22 rule: ListAgents idle, once per handoff, no FYIs. It replaces the old TERMINAL `:117` without dropping that gate. Hook `:240` preserves the distinction between roster presence and idle confirmation. | **SHIP for the original rb→es rule.** Universal reciprocal wording is not present on the es boot path. |

Thus **4/5 requested rules survive explicitly**, with qualifications above; **0/5 are shown to have been deleted by these two commits**. The missing Codex prerequisite still matters before adopting the replacement contract. A record saying a prior deployment had Codex SHIP is evidence about that deployment, not a rule requiring the next one to obtain it.

The busy-lane boundary should travel with the job, too: the es helper procedure says send and then wait (`.claude/terminals/engine-sheet/TERMINAL.md:54`), whereas its referenced manual requires confirmation **before** sending (`docs/reference/CROSS_LANE_MESSAGING.md:41-47`). Keep that manual's ordering explicit if either window can orchestrate helpers. This is a coverage gap, not a claimed deletion of the rb rule.

**Proposed correction:** place “PROD requires Codex SHIP on the exact candidate plus bench proof on that candidate” in the engine-job authority read path, preserving any explicit builder exception as an exception with its scope. Keep one shared unbenched-change limit, and require idle confirmation before messaging from either window. This review neither grants deployment authority nor changes existing approvals.

### 4. Rows with two owners — FIX (high)

There are **14**, not just the 10 matching the two literal spellings in the question. Four more reverse the slash order:

| Literal Terminal value | Count | Rows (ROLLOUT line) |
|---|---:|---|
| engine-sheet / research-build | 8 | engine.94 (89), engine.273 (95), engine.11 (96), pipeline.81 (106), engine.214 (109), engine.281 (112), engine.290 (138), engine.301 (168) |
| research-build / engine-sheet | 4 | civic.43 (76), pipeline.71 (78), pipeline.84 (86), engine.311 (176) |
| research-build + engine-sheet | 2 | pipeline.73 (144), pipeline.76 (147) |

Together: **9 live-observing, 2 ready, 3 needs-info, 0 in-progress**. They do not cause the eight-active-row violation, but they violate single accountable ownership independently.

**Contract conflict:** `docs/engine/rollout-rules.md:138` explicitly assigns work by the old domain split and permits slash-separated cross-builder ownership. Its triage mechanism still designs two tracks (`:61-69`). The new research-build rule says one Owner carries the whole job (`.claude/rules/research-build.md:49`). The actual column is **Terminal**, not a separate Owner field (`ROLLOUT_PLAN.md:74,104`); the new text must explicitly redefine that existing field rather than imply another schema.

There is also disagreement on unclaimed work: engine-sheet TERMINAL `:86` says work it cannot take gets a row **with no owner**; research-build TERMINAL `:65` says a job row has Owner = this terminal. The old contract requires a builder terminal (`rollout-rules.md:138`). No rows in this snapshot are unowned.

**Proposed migration rule:** select one accountable owner for each existing job; retain other contributors/reviewers in its pointer document. For the 9 watch rows, that owner is responsible for the acceptance read and closure. For the 2 ready and 3 decision-gated rows, ownership must be explicitly assigned or deliberately left unclaimed under a newly defined queue rule; never pick the first name syntactically. Split a row only if it contains two independently acceptable deliverables, not merely plan and build phases. Preserve its original ID/history and evidence when it remains one job. Reconcile the 14 rows, contract and validator together; this review makes no ownership assignment.

### 5. Boot size and paragraphs that do no work — SHIP for reduction; FIX for remaining duplication

UTF-8 byte counts were obtained with `wc -c`, feeding file bytes from `git show 3dcad5f0^:<path>` and `git show 3d2da191:<path>`. The four boot-loaded documents are explicitly listed at research-build TERMINAL `:22`; the hook directs the rule/terminal reads at `:237-238`.

| Loaded component | Before | After | Delta |
|---|---:|---:|---:|
| CLAUDE.md | 4,762 | 4,726 | −36 |
| .claude/rules/identity.md | 2,481 | 2,399 | −82 |
| .claude/rules/research-build.md | 9,446 | 7,566 | −1,880 |
| .claude/terminals/research-build/TERMINAL.md | 13,097 | 5,789 | −7,308 |
| **Four-document subtotal** | **29,786** | **20,480** | **−9,306** |
| Hook additionalContext, committed inputs reconstructed | 10,068 | 10,145 | +77 |
| **Commit-relative bundle** | **39,854** | **30,625** | **−9,229** |

**Measurement boundary:** the hook was not launched as a lifecycle hook. It writes a session stamp (`hook:25`), starts mags-bot (`:39`) and can patch plugin files (`:155-174`). Instead, its output was reconstructed for research-build with each commit's PIN/NEXT lines and six tracked inbox names, on the healthy/no-plugin-warning branch. Counts cover the additionalContext string, without JSON escaping or its final stripped newline. They are reproducible source-derived counts, not a captured historical harness session or a tokenizer estimate.

As a second check, the current PIN/NEXT and 11 current inbox filenames were held identical for both revisions. Only the output function was evaluated, with plugin healing removed; an independent string reconstruction matched its bytes exactly. That controlled comparison gives hook payload **11,445 → 11,522**, and total bundle **41,231 → 32,002**, again **−9,229 bytes (22.38%)**. A newline-terminated output-function stream measures 1 byte more in each case. Current carried state alone contributes **8,018 bytes**: PIN 5,610 and all NEXT lines 2,408. Those are measurements of the pre-existing dirty handoff, not changes credited to these commits. Saving this review will itself enlarge the inbox-name emission.

The hook's three static heredoc blocks for this terminal (ROSTER, research-build BOOT, DISCIPLINE) grew **2,673 → 2,750 bytes**. The full hook source shrank **19,252 → 19,130 bytes**, but comments and unexecuted branches are not the emitted payload. Counting only source size would therefore give the wrong direction for this component.

**Remaining paragraphs with no incremental boot decision, or work belonging on demand:**

| Location | Measured bytes | Assessment |
|---|---:|---|
| research-build TERMINAL `:8-16` | 278 | Launch/resume commands and window location arrive after launch has succeeded. Keep in a recovery reference, not every running session's read. |
| research-build TERMINAL `:38-40` | 616 | Repeats load routing, narrates the retired fallback and S348 incident. The hook already selected the registered terminal and `:22-32` supplies the current load contract. Preserve the operational no-persona boundary in one short place. |
| research-build TERMINAL `:42-47` | 832 | Second copy of check-before-assert/family instructions already in identity `:20-22`, CLAUDE `:19`, and hook `:239,245`. Keep the factual-check rule once; the S348 story does not add an action. This is duplication, not a recommendation to remove checking. |
| research-build rule `:8-10` | 891 | Skill-bag explanation and why the former split failed duplicate the canonical job-model block. Retain a pointer and job-type trigger; history can be read on demand. |
| research-build rule `:49-60` | 2,572 | Rollout mechanics and research filing/adoption instructions are useful when filing or researching, not mandatory input for every engine job. Load the owning contract when that action occurs. |
| research-build rule `:64-73` | 638 | Completion checklist largely repeats the pre-change audit at `:27-33` and registration rules at `:37-45`. Consolidate checks; retain acceptance and cross-terminal stack requirements. |

These six spans total **5,827 bytes before replacement pointers**; this is a gross candidate budget, not a safe automatic deletion patch. Required actions embedded in them must remain in their authoritative location. Also replace, rather than merely shorten, the stale roster (`hook:187`). The universal fleet-check paragraph (`hook:240`, 651 bytes) does real work for a dispatch, but can be conditional on dispatch instead of running for every isolated job. Retain the idle check at the moment of sending.

The tone-only commit removed framing while retaining the cited operational rules: identity hard rules remain at `:10-14`, factual checks at `:20-22`, and research-build checking behavior at `TERMINAL:42-45`. The larger reduction comes from removing old handoff/history material in `3d2da191`. No actual next-boot compliance or token-cost reduction was measured.

## Disposition

**Pending research-build reconciliation.** No findings have been applied. Required before treating the replacement text as the operating contract: reconcile boot routing and job/session lifecycle; define one active owner and migrate the eight active/fourteen composite-owner records based on evidence; extend lint/gate to validate the chosen invariant; restore the explicit Codex PROD prerequisite; and reconcile queue ownership with rollout-rules. The remaining byte reductions are recommendations, not blockers to the four retained safety rules.

**Reconciled in:** pending research-build assignment to the owning artifact; this is the requested finished inbox review. No tracked index, plan, rollout row or control-plane file was edited. No commit, deploy, Sheet access, cron run, model call, message to another lane, or live boot was performed. The named TASK was reread before filing; all five questions remain in scope.
