---
title: Newsroom recall and closing removal fold rereview
created: 2026-11-11
updated: 2026-11-11
type: reference
tags: [media, infrastructure, active]
sources:
  - 1a294729d
  - docs/for-claude-review/2026-11-11-codex-recall-close-diff-review.md
  - docs/for-claude-review/2026-11-11-es-brief-codex-recall-close.md
pointers:
  - "[[for-claude-review/2026-11-11-codex-recall-close-diff-review]]"
---

# Verdict: HOLD

**F1, F4, F5, F6 and the test-shell gap-log leak are closed for this fold. F2 and F3 remain partially open.** Seven focused suites pass, including the previously failing Rhea contract suite. Synthetic probes still promote speech or a mismatched claim into the recall fact list.

Scope: final requested rereview of `1a294729d`, limited to the six prior findings, the gap-log leak, and the adjacent feedback/max fixes included in that commit. The seven reviewed files matched the commit on disk. Concurrent dirty work was left untouched. No implementation change is included.

## R1 — P2: F2 remains open for a chunk with an unmatched straight closing quote

**Evidence:** `scripts/livedExperiencePacketV2.js:621`–`624`, called before admission at `scripts/livedExperiencePacketV2.js:662`–`671`.

The fold correctly removes complete multi-sentence quotes before splitting and handles a stray curly closing mark. However, the final replacement treats every remaining straight double quote as an opening mark. If a retrieved chunk starts inside speech and contains its closing straight quote, the function keeps the speech before the mark and deletes the following text.

Executed synthetic input and actual result from `selectUsedToolLines`:

```text
Hit: [C998 · daily] Test North served 142 synthetic meals. That is all." Test Reporter checked the record.
Draft: In C998 Test North served 142 synthetic meals.
Returned fact: C998 published: Test North served 142 synthetic meals.
```

Here the hit begins inside a quote whose opening is in a previous chunk. The subject and number inside the speech satisfy the new admission checks. The sentence consequently enters the used-fact list and can be persisted by the unchanged `appendToolFacts` path (`scripts/cron-desk-writer.js:1584`–`1588`). This is the original F2 speech-to-fact failure at a chunk boundary, not a demonstrated live publication or Rhea pass.

**Required correction:** conservatively reject automatic fact admission for a hit with ambiguous/unbalanced straight quotes, or carry enough source context to determine quote state. A lone straight mark cannot reliably identify which side is prose. Retain the passing paired-quote and curly-boundary cases and add this closing-straight-quote case.

## R2 — P2: F3 still does not bind the number to the same claim or a complete name

**Evidence:** `scripts/livedExperiencePacketV2.js:668`–`669`.

The fold adds a proper-name substring and restricts matching to one sentence. It now rejects the original Test North/Test South example and a Cycle occurring only in a neighboring sentence. But `u.includes(n)` does not require a complete name, and no metric/predicate match is required.

Executed synthetic cases, using the same hit:

```text
Hit: [C998 · daily] Test North counted 142 synthetic widgets.

Draft A: In C998 Test North counted 142 synthetic permits.
Draft B: In C998 Test Northside counted 142 synthetic widgets.

Both return: C998 published: Test North counted 142 synthetic widgets.
```

Draft A changes the counted thing; draft B changes the subject. Both mark the source claim used even though it does not support the draft claim. The comment's promise of a proper name carried "whole" at line 667 is not implemented. Once appended, the accepted number joins the global approved-number set in `auditArticle` (`scripts/livedExperiencePacketV2.js:745`–`749`), so this selection can also suppress the numeric observation for the unsupported claim. This remains a local provenance defect; the independent model gate was not run.

**Required correction:** require a complete entity match and bind the figure to its metric/claim in that sentence. If a heuristic cannot establish that binding, leave the hit available as recall context without automatically promoting it to an approved fact. Add both negative examples above alongside the positive same-subject/same-metric case, which passed locally.

## Prior finding reconciliation

| Prior item | Disposition | Evidence and verification |
|---|---|---|
| F1 — handed closing | Closed | `livedExperiencePacketV2.js:244` deletes closing from the cloned writer profile. Behavioral W3 probes for Trevor, Jax, and Luis confirmed no closing field and no mutation of the original package; Luis exercised `RECORDS_BRIEF`. Jax's explicit unanswered-question instruction is removed at `cron-desk-writer.js:1190` and the legacy lane text at `cron-desk-run.js:730`. |
| F2 — interior speech | Partially closed; R1 remains | Complete curly and straight multi-sentence quotes returned no facts. The existing curly chunk-boundary cases pass. Unmatched straight closing quotes still fail as above. |
| F3 — unrelated number admission | Partially closed; R2 remains | Original different-subject and neighboring-Cycle cases return no facts; a matching positive case returns its fact. Metric mismatch and name-prefix cases still fail as above. |
| F4 — scaffold stripping | Closed | `cron-desk-writer.js:928`–`929` bounds the INTAKE heading and requires colon-delimited metadata rows with horizontal whitespace. The mocked retrieval regression at `cron-desk-writer.test.js:228`–`243` preserves `BUSINESS` and its following paragraph while removing the footer. |
| F5 — /3 grade echo | Closed | `cron-desk-run.js:2179` recognizes both `/3` and `/4`. Executed the exact production guard expression: both grade-bearing focus strings matched; a plain synthetic focus did not. |
| F6 — stale contract suite | Closed | `cronRheaPersonaGate.test.js:76`–`97` now checks score/max 3, no `closed` output, no closing in either judge message, length-floor enforcement, and a harmless extra `closed` response field. The full suite passes. |
| Test-shell gap-log leak | Closed for the named path | `cron-desk-run.js:3432`–`3433` passes a scratch path explicitly. Executed that production caller block with `TEST_SHELL` in `/tmp` and the real `appendGapsEntry`: the synthetic note appeared in the scratch log. The live branch selected `undefined` as before; its append was stubbed, not executed. |

The F1 test added to the repository is a source-text assertion (`livedExperiencePacketV2.test.js:929`–`930`); closure above is supported by separate behavioral packet probes as well as source tracing.

Two adjacent notes from the original review also close: `cronFeedback.js:101`–`103` now counts only wakes that actually carry each boolean grade part. A synthetic mixed week produced closing failures 1/1 and opening failures 0/2. `cron-desk-run.js:3442` now persists `max` in the reward-loop log, with the legacy default of 4; this was source-verified.

## Verification and limits

Passed full suites: `livedExperiencePacket.test.js`, `livedExperiencePacketV2.test.js`, `cronDeskFanoutHandoff.test.js`, `newsroomWakePackages.test.js`, `cronFeedback.test.js`, `cron-desk-writer.test.js`, and `cronRheaPersonaGate.test.js`. All seven changed JavaScript files passed `node --check`; the candidate diff passed whitespace checking.

Tests used the same temporary isolation preload as the first review: environment loading stubbed, credential reads and network calls blocked, filesystem writes restricted to `/tmp`. Additional probes used synthetic data only. The gap-log check executed the exact changed caller block plus its real write helper, not the whole paid writer pipeline. No model, Sheet, Drive, Discord, production log, installed cron, deployment, or service action was run. The comment claiming removal of 14 historical shell entries was not independently verified. This is a source/local-test verdict, not live cron proof or a general certification of every test-shell path.

No engine function, `S.` field, or Sheet schema change is in this fold; no engine wiring card was requested. Delivery is this rereview and its required index entry. The remaining HOLD is confined to R1/R2, the unresolved portions of F2/F3.
