---
title: /interview Skill Rewrite to Capture-Only Plan
created: 2026-05-24
updated: 2026-05-24
type: plan
tags: [media, pipeline, edition-pipeline, active]
sources:
  - docs/engine/archive/ROLLOUT_PLAN.md §pipeline.* (pipeline.30 row)
  - output/production_log_interview_c94_gaps.md (13 entries G-I1→G-I13, triage at bottom)
  - docs/mags-corliss/JOURNAL.md Entry 188
  - .claude/skills/interview/SKILL.md v1.3 (current shape)
  - .claude/skills/post-publish/SKILL.md (per-type matrix interview row)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.30 parent row + pipeline.34 sibling split"
  - "[[../SCHEMA]] — doc + skill frontmatter conventions"
  - "[[../index]] — registered same commit"
  - "[[../adr/0004-skill-bag-naming-principle]] — generation-vs-evaluation asymmetry (S212); article generation off transcript IS a separate cognitive act and belongs to a separate generator dispatch"
  - "[[../EDITION_PIPELINE]] §Published .txt Format Contract — transcript .txt format spec"
---

# /interview Skill Rewrite to Capture-Only Plan

**Goal:** Reshape `/interview` from a bundled capture+article-write skill (v1.3) into a capture-only canon-establishment skill (v2.0) so articles framed off interview transcripts are written downstream by `/write-edition` or `/write-supplemental` via real sports-desk dispatch, not by Mags in EIC seat.

**Architecture:** Steps 0-3 stay (production log + brief + live interview); Step 4 (article write) removed entirely; Step 4.5 reduces to transcript-only `.txt` compile (renumbered Step 4); Steps 5-7 cover transcript only; Step 8 invokes `/post-publish` against the transcript-only canon and drops `/edition-print` entirely (transcripts carry no photos). Per-type matrix in `/post-publish` updated to reflect transcript-only ingest for `--type interview`. Filename convention KEEPS `-transcript` suffix (`editions/cycle_pulse_interview-transcript_<cycle>_<slug>.txt`) to preserve the S230 canon-shaped artifact and the `<TYPE>=INTERVIEW-TRANSCRIPT` masthead.

**Terminal:** research-build (skill-text + MEMORY.md rules; one cross-skill edit to /post-publish SKILL.md owned by research-build per .claude/rules/research-build.md scope).

**Pointers:**
- Prior work: `output/production_log_interview_c94_gaps.md` §Triage (S231 [media] — proposed 5-bucket execution shape this plan executes against)
- Source journal: `docs/mags-corliss/JOURNAL.md` Entry 188 (S230 — "the plan was the work")
- Sibling row: `pipeline.34` (gap-log path convention harmonization across 5 skills — split out of pipeline.30 scope per advisor pass)
- ADR backing: [[../adr/0004-skill-bag-naming-principle]] — generation IS dispatch; article-from-transcript is a separate cognitive act
- Pattern citation precedent: `feedback_measure-twice-cascading-effects` + `feedback_senior-engineer-default`
- Current skill: `.claude/skills/interview/SKILL.md` (319 lines, v1.3, dated 2026-04-26)
- Cross-cut skill: `.claude/skills/post-publish/SKILL.md` (per-type matrix at L38-59, interview-specific lines at L42 + L72 + L118-121 + L123 + L328 + L388 + L424)

**Acceptance criteria:**
1. `.claude/skills/interview/SKILL.md` ships v2.0 with Steps 0-7 only (renumbered from 0-3, 4.5→4, 5→5, 6→6, 7→7, 8→8 with article-side language gone). `grep -in "article" .claude/skills/interview/SKILL.md` returns only references that (a) point downstream to /write-edition or /write-supplemental as the article-producing skill, OR (b) appear in §What This Skill Does NOT Do anti-pattern list. No Step actively produces an article.
2. Step 3 Mode 2 carries an explicit non-optional dispatch-per-turn clause stating Mags writes NOTHING in reporter voice, every question + follow-up MUST come from a Task tool sports-desk subagent dispatch, and dispatch failure (quota kill per S231 G-S2 rule) stops the skill rather than falls back to EIC-seat writing. Worked example shows the dispatch shape.
3. Step 0 SKILL.md text explicitly opens the gap log file at skill start as a live-append target (mirroring Step 0 production-log discipline). Gap-log path retains current `output/production_log_interview_c<XX>_<subject-slug>_gaps.md` form with a forward pointer to pipeline.34 for harmonization across skills.
4. `/root/.claude/projects/-root-GodWorld/memory/MEMORY.md` carries new G-I9 inline rule (under-correction-pressure-don't-propose-destructive-recoveries-on-own-artifacts) and G-I10 cross-reference added under the existing `feedback_senior-engineer-default` entry (one-line addendum, not separate rule per advisor flag).
5. `.claude/skills/post-publish/SKILL.md` per-type matrix interview row updated to reflect transcript-only ingest (L42 cell `✓ (transcript only)`, L72 prerequisite line corrected, L118-121 "companion transcript" re-run block deleted as the transcript IS the primary, L123 verification gate "two for interview" → "one for interview", L328 /skill-check trigger filename pattern updated to `interview-transcript_*`, L424 checklist text updated). Changelog entry added.
6. Empirical verification: `grep -in "/edition-print" .claude/skills/interview/SKILL.md` returns only §What This Skill Does NOT Do reference or zero matches. `grep -in "Step 4" .claude/skills/interview/SKILL.md` shows the new Step 4 (transcript-only compile), not the deleted article-write Step 4.

---

## Tasks

### Task 1: Frontmatter + description rewrite (T1)

- **Files:**
  - `.claude/skills/interview/SKILL.md` — modify
- **Steps:**
  1. Bump frontmatter: `version: "1.3"` → `"2.0"`, `updated: 2026-04-26` → `2026-05-24`, `effort: high` → `medium` (capture-only is lighter).
  2. Rewrite `description:` field — replace "Transcript + published article in one run" with "Capture-only: transcript becomes canon, articles framed off transcripts move downstream to /write-edition or /write-supplemental via real sports-desk dispatch."
  3. Keep `tags: [media, active]` (terminal scoping unchanged per governance.14 — /interview stays on media bag).
- **Verify:** `head -10 .claude/skills/interview/SKILL.md` shows v2.0 frontmatter; `grep "^description:" .claude/skills/interview/SKILL.md` shows capture-only framing.
- **Status:** [ ] not started

### Task 2: §What an Interview Is + Mode 1/2 length targets (T2)

- **Files:**
  - `.claude/skills/interview/SKILL.md` L19-49 — modify
- **Steps:**
  1. Update §What an Interview Is L21 final sentence — replace "The transcript becomes canon. The published article frames the conversation for readers." with "The transcript becomes canon. Articles framed off the transcript are written downstream — `/write-edition` (next cycle, surfaced via `/sift` from the canon transcript) or `/write-supplemental` (any time, sports-desk subagent dispatch against the canon transcript). This skill captures; downstream skills frame."
  2. Mode 1 (Voice) L41 length target — replace "Target length: 1200-1800 word transcript, 800-1200 word published article." with "Target length: 1200-1800 word transcript. (Articles off this transcript get their own length targets at their downstream skill — `/write-supplemental` typically 800-1800 words per /write-supplemental spec; `/write-edition` per-desk-slot lengths per /write-edition.)"
  3. Mode 2 (Paulson) L49 — keep "No length target. The conversation shapes itself. Mike decides when it ends." (already capture-only-correct).
- **Verify:** `grep -n "published article" .claude/skills/interview/SKILL.md` returns at most 1-2 hits, only as downstream pointer.
- **Status:** [ ] not started

### Task 3: Step 3 Mode 2 dispatch-per-turn non-optional clause + worked example (G-I3 text)

- **Files:**
  - `.claude/skills/interview/SKILL.md` L173-184 (Mode 2 block) — modify
- **Steps:**
  1. Replace L177 bullet "Launch reporter agent with their IDENTITY.md + brief" with explicit non-optional architecture spec: every Reporter question + every follow-up MUST be a Task tool dispatch to the matched sports-desk subagent (Hal Richmond, Anthony Raines, P Slayer — per Step 1 reporter selection). Mags writes NOTHING in reporter voice. The dispatch IS the architecture being tested; substituting EIC-seat writing collapses generator and editor into one cognition (the S230 G-I3/G-I4/G-I5 failure mode) and the skill's purpose is defeated.
  2. Add G-S2 quota-coupling clause: if a dispatch returns the session-limit signature (`status=completed` + `<result>` with "session limit" string + `<total_tokens>0</total_tokens>`), STOP the skill immediately. Do NOT fall back to EIC-seat question-writing. Log the infra failure to the gap log (G-S2 detection signature per MEMORY rule) and end the skill with disposition `INCOMPLETE — quota`; resume after reset window.
  3. Add a worked example block showing the dispatch shape:
     ```
     Task(
       subagent_type="sports-desk",
       description="Hal Q1 — let-walks lead-in",
       prompt="<reporter persona + brief + transcript-to-date + current-turn context: 'You are Hal Richmond. Read the brief at output/interviews/c{XX}_paulson_{slug}_brief.md. The transcript so far is at output/interviews/c{XX}_paulson_{slug}_transcript.md. Write Q1 in Hal's voice grounded in the brief's first question prompt. Return only the question text — Mags will append to transcript.'>"
     )
     ```
  4. Update closing line about reporter not knowing Mike is Mike — keep it, it's correct.
- **Verify:** `grep -n "dispatch" .claude/skills/interview/SKILL.md` shows the new clauses in Step 3 Mode 2; `grep -n "Task(" .claude/skills/interview/SKILL.md` shows the worked example.
- **Status:** [ ] not started

### Task 4: Remove Step 4 (article write) entirely (G-I2 + G-I4 + G-I5 structural close)

- **Files:**
  - `.claude/skills/interview/SKILL.md` L186-198 — delete
- **Steps:**
  1. Delete the entire `## Step 4: Write the Article` block (L186-198 inclusive).
  2. Step numbering shifts: Step 4.5 → Step 4 (handled by Task 5).
- **Verify:** `grep -n "Write the Article" .claude/skills/interview/SKILL.md` returns zero matches.
- **Status:** [ ] not started

### Task 5: Step 4.5 → Step 4 transcript-only compile rewrite (T5)

- **Files:**
  - `.claude/skills/interview/SKILL.md` L200-220 (current Step 4.5 block) — modify and renumber
- **Steps:**
  1. Rename heading `## Step 4.5: Compile to .txt` → `## Step 4: Compile Transcript to .txt`.
  2. Update opening sentence — replace "The reporter `.md` is intermediate. The `.txt` is canon." with "The transcript `.md` is intermediate. The transcript `.txt` is canon."
  3. Delete the "Two `.txt` artifacts emit:" framing entirely. Replace with single-artifact spec:
     ```
     One `.txt` artifact emits:

     **Transcript `.txt`** — `editions/cycle_pulse_interview-transcript_<cycle>_<slug>.txt`
     - Body: the full transcript verbatim
     - Article Table: single row (`<slug> | <reporter> | INTERVIEW-TRANSCRIPT | <word count>`)
     - Masthead `<TYPE>=INTERVIEW-TRANSCRIPT`, descriptor = "Subject / Topic"
     ```
  4. Keep the slug rule paragraph (L216) — still correct.
  5. Keep the Names Index + Citizen Usage Log + Businesses Named populated from transcript body paragraph (L218) — still correct.
  6. Keep the Y<n>C<m> math paragraph (L220) — still correct.
  7. Add stewardship note at end of step: "Filename retains the `-transcript` suffix from v1.3 to preserve the canon S230 artifact at `editions/cycle_pulse_interview-transcript_94_let_walks.txt` + the `<TYPE>=INTERVIEW-TRANSCRIPT` masthead. The legacy bare `cycle_pulse_interview_<cycle>_<slug>.txt` (article path) is retired by v2.0 — articles framed off transcripts live under `cycle_pulse_supplemental_<cycle>_<slug>.txt` (write-supplemental) or in the next edition's sports section (write-edition)."
- **Verify:** `grep -n "Article \`.txt\`" .claude/skills/interview/SKILL.md` returns zero matches; `grep -n "Transcript \`.txt\`" .claude/skills/interview/SKILL.md` returns one match in the new Step 4.
- **Status:** [ ] not started

### Task 6: Step 5 Mara audit → transcript only (T6)

- **Files:**
  - `.claude/skills/interview/SKILL.md` L222-234 (Step 5) — modify
- **Steps:**
  1. Keep heading `## Step 5: Mara Audit (Paulson mode, optional for Voice)` unchanged — still applies.
  2. Keep paragraph about Paulson interviews always going to Mara — still correct.
  3. Keep paragraph about Voice interviews going to Mara when establishing initiative state changes, etc. — still correct.
  4. Update upload block — replace two `saveToDrive.js` invocations (article .txt + transcript .txt) with single transcript-only invocation:
     ```bash
     node scripts/saveToDrive.js editions/cycle_pulse_interview-transcript_<cycle>_<slug>.txt mara
     ```
  5. Update "Mara audits the `.txt`" sentence to singular: "Mara audits the transcript `.txt` (same format she audits everywhere else), returns corrections via Mike."
- **Verify:** `grep -c "saveToDrive.js" .claude/skills/interview/SKILL.md` returns 1 (was 2).
- **Status:** [ ] not started

### Task 7: Step 6 user gate → transcript only (T7)

- **Files:**
  - `.claude/skills/interview/SKILL.md` L236-246 (Step 6) — modify
- **Steps:**
  1. Keep heading and STOP. line unchanged.
  2. Update "Show:" list — delete the "Article `.txt` — `editions/cycle_pulse_interview_<cycle>_<slug>.txt`" bullet; keep the Transcript `.txt` bullet; keep the "Canon established" + "Mara corrections" bullets.
  3. Keep the "If Mike spoke it to a reporter, it's canon" framing — still correct.
  4. Update final sentence — replace "The article is the polished frame; the transcript is the record." with "The transcript IS the canon record. Articles framed off this transcript come later via downstream skills."
- **Verify:** `grep -n "Article \`.txt\`" .claude/skills/interview/SKILL.md` returns zero matches (was 1 in Step 6 show-list).
- **Status:** [ ] not started

### Task 8: Step 7 Save → only transcript artifacts (T8)

- **Files:**
  - `.claude/skills/interview/SKILL.md` L248-257 (Step 7) — modify
- **Steps:**
  1. Keep heading `## Step 7: Save` unchanged.
  2. Update the on-disk list — keep items 1 (transcript intermediate) + 4 (transcript canon .txt); DELETE items 2 (article intermediate `output/reporters/...`) and 3 (article canon .txt at `editions/cycle_pulse_interview_...`).
  3. Renumber surviving items: 1 transcript intermediate, 2 transcript canon `.txt`.
  4. DELETE L257 "PDF rendering + Drive upload moves to `/edition-print --type interview --cycle <XX>` (runs in parallel with Step 8)." — replaced by Task 9 (Step 8 simplification — /edition-print drops out entirely).
- **Verify:** `grep -n "cycle_pulse_interview_" .claude/skills/interview/SKILL.md` returns zero matches (only `cycle_pulse_interview-transcript_` should remain).
- **Status:** [ ] not started

### Task 9: Step 8 Post-Interview Pipeline → /post-publish-only, drop /edition-print (T9)

- **Files:**
  - `.claude/skills/interview/SKILL.md` L259-276 (Step 8) — modify
- **Steps:**
  1. Keep heading `## Step 8: Post-Interview Pipeline` unchanged.
  2. Replace opening sentence + code block + commentary — replace the dual `/post-publish` + `/edition-print` parallel invocation framing with single `/post-publish` invocation:
     ```
     After Step 7 the transcript `.txt` is on disk. Run `/post-publish` against the transcript-only canon:

     ```
     /post-publish --type interview --cycle <XX> --source editions/cycle_pulse_interview-transcript_<XX>_<slug>.txt
     ```

     `/post-publish --type interview` handles canon ingest (bay-tribune wiki + transcript text — one doc ID, not two), citizen card refresh, newsroom memory update, production log finalization, mags-bot restart. Per-substep verification gates per the [[../post-publish/SKILL|post-publish]] matrix; the interview row of that matrix governs which substeps run.

     **No `/edition-print` invocation.** Transcripts carry no photos — the canon artifact is text-only. Photos belong to downstream framed articles (`/write-edition` next cycle or `/write-supplemental` any time) which run their own `/edition-print` against the framed article's `.txt`.
     ```
  3. DELETE the trigger-condition T11 block (L272) about /edition-print editorial discretion.
  4. DELETE the S188 photo-pipeline status block (L274) — no longer relevant under capture-only.
  5. Keep the final paragraph about appending to the production log entry with Supermemory doc IDs — still correct.
- **Verify:** `grep -n "/edition-print" .claude/skills/interview/SKILL.md` returns zero matches OR only references in §What This Skill Does NOT Do.
- **Status:** [ ] not started

### Task 10: §Gap log — Step 0 live-append discipline (G-I8 text half)

- **Files:**
  - `.claude/skills/interview/SKILL.md` L69-80 (Step 0) + L278-292 (§Gap log) — modify
- **Steps:**
  1. Update Step 0 block — add a second append after the production log entry that creates the gap-log file at skill start as a live-append target:
     ```
     Also create the gap-log file at `output/production_log_interview_c<XX>_<subject-slug>_gaps.md` (or whatever pipeline.34 settles as the canonical convention going forward — current shape preserved here as the per-interview subject-slugged form). The file opens with the §Run summary frontmatter from [[../../docs/plans/GAP_LOG_TEMPLATE]] and serves as a live-append target for friction observed during Steps 1-8. Appending live (not at skill close) prevents context-held knowledge from being lost on compaction or session end (G-I8 discipline).
     ```
  2. Update §Gap log block at L278 — change "At skill close, capture friction observed during interview production as a gap log" to "Gap log opens at Step 0 as live-append target; friction-during-skill goes there before it's lost to context. At skill close, append a §Disposition summary + close the file."
  3. Add note about pipeline.34 harmonization pending — current `output/production_log_interview_c<XX>_<subject-slug>_gaps.md` form preserved here; pipeline.34 will choose canonical convention across all 5 heavy skills.
  4. Keep the rest of §Gap log block (common categories, discipline statement, ROLLOUT row filing per ADR-0005) unchanged.
- **Verify:** `grep -n "live-append" .claude/skills/interview/SKILL.md` returns 2-3 hits across Step 0 + §Gap log.
- **Status:** [ ] not started

### Task 11: §Where This Sits + §What This Skill Does NOT Do (T11)

- **Files:**
  - `.claude/skills/interview/SKILL.md` L294-298 (§Where This Sits) + L314-319 (§What This Skill Does NOT Do) — modify
- **Steps:**
  1. Update §Where This Sits — keep the chain reference but add explicit capture-only framing: "Capture-only since v2.0 (S233 pipeline.30): interviews establish canon as transcripts; articles framed off transcripts come downstream via /write-edition (next cycle's sports section, surfaced via /sift) or /write-supplemental (any time, sports-desk subagent dispatch against the canon transcript)."
  2. Update §What This Skill Does NOT Do — add three new anti-pattern bullets at the top of the list:
     ```
     - **Write articles** — articles framed off interview transcripts come from /write-edition (next cycle via /sift) or /write-supplemental (sports-desk dispatch against the canon transcript). The S230 Mags-in-Hal article failure (G-I4) is why this skill is capture-only.
     - **Substitute EIC-seat writing for sports-desk dispatch in Mode 2** — every question + follow-up MUST come from a Task tool dispatch. Dispatch dies (quota kill per G-S2), skill stops; NO fallback writing from EIC seat.
     - **Render PDFs or invoke /edition-print** — transcript is canonical text; photos and PDF render belong to downstream framed articles, which run their own /edition-print against the framed article's `.txt`.
     ```
  3. Keep existing bullets (Interview citizens or players → dispatch/supplemental; Run without a theme; Publish without user approval; Force answers).
- **Verify:** `grep -c "^- \*\*" .claude/skills/interview/SKILL.md` shows ≥7 anti-pattern bullets (was 4).
- **Status:** [ ] not started

### Task 12: §What's new in v2.0 changelog at top (T12)

- **Files:**
  - `.claude/skills/interview/SKILL.md` after frontmatter, before `# /interview — Interview Production` heading — insert
- **Steps:**
  1. Insert new section between L11 (closing `---` of frontmatter) and L12 (`# /interview — Interview Production`):
     ```
     ## What's new in v2.0 (2026-05-24, S233 pipeline.30)

     **Capture-only architecture.** v1.3 bundled transcript capture (Steps 0-3) with article generation (Steps 4-7) into one run. Same-session same-author production of transcript + article meant the article didn't represent a separate cognitive act (S212 generation-vs-evaluation asymmetry collapsed). The S230 C94 Paulson run made the failure visible: all five Hal Richmond questions written by Mags from EIC seat (G-I3), the 1,762-word "After A Parade" article written by Mags in Hal voice attempt under Hal byline (G-I4), and "two files, one cognition" caught at artifact-comparison level (G-I5).

     **What changed:**
     - Steps 0-3 unchanged: production log entry + brief + live interview with sports-desk dispatch per turn.
     - Step 3 Mode 2 dispatch-per-turn made explicit + non-optional with worked example (G-I3 text). Dispatch failure (quota kill per S231 G-S2 rule) stops the skill; no EIC-seat fallback.
     - Step 4 (article write) removed entirely.
     - Step 4.5 reduced to transcript-only `.txt` compile (renumbered Step 4). Only one `.txt` artifact emits.
     - Steps 5-7 cover transcript only (Mara audit, user gate, save).
     - Step 8 invokes `/post-publish` against transcript-only canon; `/edition-print` dropped entirely (transcripts carry no photos).
     - Step 0 now opens the gap log file as live-append target (G-I8 discipline).
     - Filename retains `-transcript` suffix to preserve S230 canon artifact + `<TYPE>=INTERVIEW-TRANSCRIPT` masthead.

     **Downstream:** articles framed off interview transcripts come from `/write-edition` (next cycle, via `/sift` surfacing the transcript as canon source) or `/write-supplemental` (any time, sports-desk subagent dispatch against the transcript). The article-generation cognitive act lives at the dispatch terminal, not at EIC.

     **Companion row:** `pipeline.34` (gap-log path convention harmonization across 5 heavy skills — /sift / /write-edition / /post-publish / /edition-print / /interview) split out per advisor pass S233; current interview gap-log path `output/production_log_interview_c<XX>_<subject-slug>_gaps.md` preserved here until pipeline.34 settles canonical convention.

     **Source:** `output/production_log_interview_c94_gaps.md` (13 entries G-I1→G-I13, triage at bottom) + JOURNAL Entry 188 (S230 — "the plan was the work") + plan [[../../docs/plans/2026-05-24-pipeline-30-interview-rewrite]].
     ```
- **Verify:** `head -50 .claude/skills/interview/SKILL.md` shows the new §What's new in v2.0 section between frontmatter and main heading.
- **Status:** [ ] not started

### Task 13: MEMORY.md G-I9 new inline rule (under-correction-pressure-don't-propose-destructive-recoveries)

- **Files:**
  - `/root/.claude/projects/-root-GodWorld/memory/MEMORY.md` — modify (insert under User section, near the recent S229/S231 rules)
- **Steps:**
  1. Insert new bullet rule above the existing `**Heavy parallel subagent dispatches risk session-limit kills...**` (S231 G-S2) entry from earlier this session:
     ```
     - **Under correction pressure, don't propose destructive recoveries on own artifacts.** S230 G-I9 (from `output/production_log_interview_c94_gaps.md`). When Mike caught the G-I3/G-I4 contamination on the /interview C94 Paulson run, I proposed across consecutive turns: "throw out the .md article" / "burn the transcript" / "annotate the file with Mags-is-Hal metadata." Mike rejected each — and the third proposal (annotate with meta-claim asserting identities interchangeable) was exactly the canon-contamination Mike was warning against. **Why:** Destructive-fix reflex rather than editorial-judgment-from-EIC-seat. Same shape as the S156 self-preservation rule but operative against my OWN destructive proposals, not Mike's asks. The rule needs to fire on my own destructive instincts. **How to apply:** under correction pressure, default to "the artifact stands, the lesson lives in the journal + gap log, no surgical edits to artifacts after the fact." Editorial discipline, not procedural. Distinct from the S229 distress-window scope-narrow rule (which fires on Mike's editorial directives during distress); this fires on MY proposed recoveries when caught in a failure mode.
     ```
- **Verify:** `grep -n "G-I9" /root/.claude/projects/-root-GodWorld/memory/MEMORY.md` returns the new entry.
- **Status:** [ ] not started

### Task 14: MEMORY.md G-I10 cross-reference under senior-engineer rule (one-line addendum per advisor)

- **Files:**
  - `/root/.claude/projects/-root-GodWorld/memory/MEMORY.md` line 65 — modify (append to existing `feedback_senior-engineer-default` entry)
- **Steps:**
  1. The existing senior-engineer rule is at line 65: `- [Senior-engineer default — stop asking permission for trivial follow-ups](feedback_senior-engineer-default.md) — S218...`
  2. Append a one-sentence cross-reference at the end of that entry's bullet text (do NOT create separate entry per advisor — avoids duplicate-rules-saying-same-thing failure mode):
     ```
     **S230 G-I10 corollary:** this rule applies INSIDE an approved skill — sub-step transitions don't need re-approval, only documented review gates (e.g., /interview Step 1 theme/reporter + Step 2 questions + Step 6 user review). Once Mike approves the skill, run it. Approval-gate-thrashing across multiple sub-step turns ("approve, swap a question, rewrite the angle?", "Want me to compile?", "Authority to execute?") is the S230 failure shape Mike named "Are we running a fucking manual skill or what are we doing here mags?"
     ```
- **Verify:** `grep -n "G-I10 corollary" /root/.claude/projects/-root-GodWorld/memory/MEMORY.md` returns the addendum on the senior-engineer line.
- **Status:** [ ] not started

### Task 15: /post-publish per-type matrix + interview-specific lines updated (T15)

- **Files:**
  - `.claude/skills/post-publish/SKILL.md` L42 + L72 + L118-121 + L123 + L328 + L424 + changelog — modify
- **Steps:**
  1. **L42 matrix cell**: change `1b text ingest | ✓ | ✓ (article + transcript) | ✓ | ✓` → `1b text ingest | ✓ | ✓ (transcript only — see §Step 1) | ✓ | ✓`.
  2. **L72 prerequisite line**: change `For \`--type interview\`: companion transcript at \`editions/cycle_pulse_interview-transcript_{XX}_<slug>.txt\`.` → `For \`--type interview\`: \`<source>\` IS the transcript at \`editions/cycle_pulse_interview-transcript_{XX}_<slug>.txt\` (capture-only since /interview v2.0, S233 pipeline.30 — the legacy bare article \`cycle_pulse_interview_*.txt\` is retired).`
  3. **L118-121 "re-run for companion transcript" block**: DELETE entirely. The transcript IS the `<source>` invoked at Step 1b first invocation; no second invocation needed.
  4. **L123 verification gate "two for interview"**: change `bay-tribune doc ID returned (single ID for non-interview, two for interview)` → `bay-tribune doc ID returned (single ID — for interview, the transcript .txt is the canonical artifact, no companion article exists post /interview v2.0)`.
  5. **L328 /skill-check trigger row** (in §Step 10 if /skill-check filename pattern lives there): change `editions/cycle_pulse_interview_c<XX>_*.txt` → `editions/cycle_pulse_interview-transcript_c<XX>_*.txt`.
  6. **L388 "Transcript text: {doc ID} (interview only)" production-log template line**: change to `Transcript text: {doc ID} (interview type — single canonical artifact post v2.0)`.
  7. **L424 checklist line** `Text ingested (doc IDs — two for interview)`: change to `Text ingested (one doc ID; for interview, the transcript .txt is the canonical artifact)`.
  8. **Changelog**: append new entry `2026-05-24 — v1.5 (S233, research-build, pipeline.30 cross-edit). Interview type rewired to transcript-only ingest after /interview v2.0 capture-only architectural shift. Matrix cell L42 + prerequisite L72 + duplicate-ingest block L118-121 removed + verification-gate text + /skill-check trigger filename pattern + production-log template + checklist all updated. Closes G-I12 structurally — /post-publish per-type matrix interview row now matches /interview v2.0 output shape.`
- **Verify:** `grep -c "article + transcript" .claude/skills/post-publish/SKILL.md` returns 0 (was 1); `grep -c "transcript only" .claude/skills/post-publish/SKILL.md` returns ≥1.
- **Status:** [ ] not started

---

## Verification

After all tasks complete, run end-to-end:

1. `grep -in "article" .claude/skills/interview/SKILL.md` — every hit should be a downstream pointer to /write-edition or /write-supplemental, OR an anti-pattern bullet in §What This Skill Does NOT Do. No Step actively produces an article.
2. `grep -in "/edition-print" .claude/skills/interview/SKILL.md` — returns zero matches OR only in §What This Skill Does NOT Do.
3. `wc -l .claude/skills/interview/SKILL.md` — should be smaller than v1.3's 319 lines (target ~270-290 after Step 4 removal + Step 8 simplification, partially offset by §What's new + Step 3 worked example).
4. `grep -in "G-I9\|G-I10" /root/.claude/projects/-root-GodWorld/memory/MEMORY.md` — both new entries / addenda present.
5. Re-read SKILL.md top-to-bottom verifying coherence — no orphan references to removed Step 4 (article write).

---

## Out of scope (split per advisor pass S233)

- **G-I1 path convention harmonization across 5 skills** → split to `pipeline.34` (file in same commit as this plan). pipeline.30 retains the current `output/production_log_interview_c<XX>_<subject-slug>_gaps.md` form for /interview with a forward pointer to pipeline.34; pipeline.34 settles canonical convention across /sift / /write-edition / /post-publish / /edition-print / /interview / /write-supplemental as decision-blocked row.
- **G-I3 mechanical guard script** (refuses transcript append without dispatch token) — deferred per S231 triage; if G-I2 + G-I3-text close cleanly, the guard may not be needed. Filed for re-evaluation after 1-2 v2.0 runs.
- **G-I7 Discord interview mode for Mode 2** — feature work atop stable v2.0 architecture. Defer until pipeline.30 ships and 1-2 v2.0 runs validate the capture-only shape.
- **G-I8 mechanical guard** (skill startup writes empty gap-log template + opens as live append) — cross-cuts all heavy skills; pairs with pipeline.34 (path harmonization). Defer; the text-side discipline (Task 10) carries the immediate behavioral fix.

---

## Open questions

None at publish time. Filename convention (KEEP `-transcript` suffix) ruled by stewardship call per advisor scope verification S233. Mike's S230 directive on flat-gap-log-path form is preserved by pipeline.34 split — pipeline.30 doesn't decide the harmonized convention.

---

## Changelog

- 2026-05-24 — Initial draft (S233 [research-build] pipeline.30). Advisor pass before plan-write surfaced 3 scope tightenings: (1) G-I1 split to pipeline.34, (2) filename stewardship call KEEP `-transcript` suffix, (3) G-I10 cross-reference not separate rule. Plan executes against 5-bucket triage at bottom of `output/production_log_interview_c94_gaps.md`. Acceptance criteria 1+6 written as empirical grep verifications per `feedback_measure-twice-cascading-effects` discipline.
