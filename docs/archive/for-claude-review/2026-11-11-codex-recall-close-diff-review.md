---
title: Newsroom recall and closing removal diff review
created: 2026-11-11
updated: 2026-11-11
type: reference
tags: [media, infrastructure, active]
sources:
  - docs/for-claude-review/2026-11-11-es-brief-codex-recall-close.md
  - 5c8c16f2ebd97df05d9489b2f1265ab054a39a64
  - 5d9cd7ada265e46d16fd7dd2d3cde37e5a975958
pointers:
  - "[[EDITION_PIPELINE_DEEP_DISPATCH]]"
---

# Verdict: HOLD

Six findings below. The recall tool wiring and Saturday score normalization check out locally. The closing still reaches writers through the complete packet and an explicit system instruction; recall admission can promote quoted speech and unrelated facts; the new grade bypasses an existing contamination guard; and the Rhea contract suite is stale and fails.

Reviewed the two named commits, including the added OpenRouter instruction and recall-admission branch. The reviewed runtime files matched `5c8c16f2e` on disk. HEAD advanced during review to `d8a5c8f8c` (plan documentation); this review remains scoped to the named candidate. These are Node newsroom scripts, with no clasp deployment gate. Per the brief, 06:15 is angle, 13:15 report, and 18:15 write; the grade-echo issue can affect angle, while recall and writer-closing behavior affect write. The installed cron schedule was not independently inspected.

## F1 — P1: The writer still receives the closing contract

**Evidence:** `scripts/livedExperiencePacketV2.js:241`, `scripts/livedExperiencePacketV2.js:261`, `scripts/livedExperiencePacketV2.js:298`; `scripts/cron-desk-writer.js:1140`, `scripts/cron-desk-writer.js:1451`, `scripts/cron-desk-writer.js:1190`.

The candidate removes the rubric's printed closing (`cron-desk-writer.js:452`) but clones the entire package review profile into the packet. Removing the investigation override also leaves the original package `articleContract.closing` in that clone. The writer reads the complete JSON state into `worldState` and includes it in the model's message without removing that field. A local W3 build with Trevor's actual package produced `reviewProfile.articleContract.closing = "a bounded forward warning or maintenance question grounded in what remains unknown"`. That is still a handed closing question. Jax additionally receives the system instruction `End on ONE unanswered question` at line 1190, independent of the removed W3 voice clause.

**Failure:** package with a closing instruction → new W3 JSON → writer prompt still contains that instruction. Omitting `Close on:` from one rendering does not remove the handed closing from the model's input. The test-light arm also receives this packet.

**Fix:** omit the closing field from the writer-facing packet/prompt and remove the remaining direct closing instruction in the writer. The seat files can remain unchanged as requested. Assert against the complete assembled model messages, including a records-brief seat and Jax.

## F2 — P2: Splitting before quote detection launders an interior speech sentence

**Evidence:** `scripts/livedExperiencePacketV2.js:640`–`646`; persistence at `scripts/cron-desk-writer.js:1584`–`1588` and `scripts/livedExperiencePacketV2.js:696`–`705`.

The new recall branch splits on sentence boundaries, then rejects only sentences containing a double quotation mark. Interior sentences of a multi-sentence quote have no opening or closing mark.

Local synthetic reproduction:

```text
Hit: [C998 · daily] Test Speaker said, “The hall is open. We served 142 synthetic meals. That is all.”
Draft: In C998 the test hall served 142 synthetic meals.
Result: C998 published: We served 142 synthetic meals.
```

`selectUsedToolLines` returns the interior spoken sentence as a fact. `appendToolFacts` writes that selection into `known` and `manifest.approvedFacts`. This contradicts the new branch's explicit unquoted-sentence rule and strips the statement's speaker/context. It does not create an approved quote, and this review does not claim a demonstrated Rhea pass.

**Fix:** identify quoted spans before sentence splitting, or conservatively exclude an entire recall hit containing quotation marks. Cover multi-sentence speech and chunk/truncation boundaries, not only a quote contained in one sentence.

## F3 — P2: A Cycle and one shared number approve an unrelated recall claim

**Evidence:** `scripts/livedExperiencePacketV2.js:638`–`646`; the existing neighboring history path requires the pilot and result detail at `scripts/livedExperiencePacketV2.js:652`–`668`.

The new branch requires no subject, place, metric, or predicate match. One significant number shared with any draft line containing the Cycle admits the whole source sentence. Local synthetic reproduction:

```text
Hit: [C998 · daily] Test North counted 142 synthetic widgets.
Draft: In C998 Test South counted 142 synthetic permits.
Result: C998 published: Test North counted 142 synthetic widgets.
```

**Failure:** an unrelated recall hit is marked used and persisted as an approved fact. Its numbers then join the global approved-number set in `auditArticle` (`scripts/livedExperiencePacketV2.js:720`–`734`), obscuring the unsupported draft attribution in that local audit. Whole paragraph lines are eligible units, so the Cycle can also belong to a neighboring sentence. The later independent Rhea review is not proof that this selection was correct; her prompt deliberately omits approved-number cues (`scripts/cron-rhea-gate.js:522`–`540`).

**Fix:** bind admission to the relevant entity and claim/metric in the same attributed unit, with provenance retained. Add negative cases for a shared number on a different subject/metric and a Cycle appearing only in adjacent prose.

## F4 — P2: The scaffold filter can consume the paragraph after an ordinary section heading

**Evidence:** `scripts/cron-desk-writer.js:929`–`933`.

The row filter makes the colon optional and uses `\s*`, which crosses newlines. A standalone uppercase `BUSINESS` section heading therefore matches together with the following prose line. With a mocked retrieval result, this synthetic chunk was discarded and the tool returned its no-result message:

```text
BUSINESS
Test owners in TESTBOROUGH counted 142 synthetic customers at the entirely fictional test market, with enough descriptive text for the retrieval length threshold.
```

The control containing the same information as an ordinary paragraph returned a C998 hit. This is case-sensitive: ordinary sentence-case `Business owners ...` survived the control probe. The defect is the collision with an uppercase heading and the newline-consuming match, not every occurrence of the word business.

**Failure:** real article section → prose erased as filing metadata → length/query filter removes the hit. A reporter loses published background even though retrieval returned it.

**Fix:** match actual footer grammar, with horizontal whitespace and a required delimiter, or strip only a recognized INTAKE region. Preserve ordinary section headings and their paragraphs; test chunk boundaries separately.

## F5 — P2: The W1 grade-echo guard still recognizes only /4

**Evidence:** new reader `scripts/cron-desk-run.js:1527`; feedback injection `scripts/cron-desk-run.js:2123`; stale guard `scripts/cron-desk-run.js:2179`; W3 carrier `scripts/livedExperiencePacket.js:938`.

The new `graded: 3/3` line is read and handed to W1, but its existing reject/resample check is still `/\bgraded:?\s*\d\s*\/\s*4\b/i`. A synthetic valid plan with focus `TEST-ONLY follow-up; graded: 3/3 — nothing fell short.` passed `validateAngleOutput`, bypassed the exact source guard, and appeared unchanged in W3 `signal.plan.focus`. Changing the same text to `3/4` made the guard catch it.

**Failure:** new grade feedback echoed by W1 → accepted editorial plan → writer receives machine grading metadata as focus. The intentional firewall against carrying the grade into article planning has regressed for every newly scored piece.

**Fix:** update the guard to recognize both stored formats and test the actual plan-to-W3 path, including negative and positive controls.

## F6 — P2: The Rhea contract suite still tests the retired four-part contract

**Evidence:** `scripts/cronRheaPersonaGate.test.js:79`, `scripts/cronRheaPersonaGate.test.js:83`, `scripts/cronRheaPersonaGate.test.js:92`; changed implementation `scripts/cron-rhea-gate.js:348`–`355`.

Running the existing suite locally fails at line 79 with `AssertionError: 3 == 4`. Later assertions still require the closing in the grading prompt and expect another perfect score of 4. These expectations contradict this candidate's intentional three-part contract. This is stale test coverage, not evidence that the runtime should return to four criteria.

**Fix:** update the suite to assert `score: 3`, `max: 3`, no graded `closed` field, and no closing instruction in either judge message. Retain the length-floor and malformed-response cases. The commit's broad PASS claim does not establish this suite passing at the reviewed candidate.

## Checks that passed and remaining limits

- **Recall-only path, source traced:** runner passes both flags and a four-call budget (`cron-desk-run.js:3106`–`3116`); recall-only classification and package bypass are explicit (`cron-desk-writer.js:892`–`894`, `:1086`); the system adds `RECALL_BLOCK` (`:1387`); the loop retains results (`:1494`–`1497`); manifest amendment runs with truthy `WRITER_TOOLS` (`:1574`); runner rereads the state (`cron-desk-run.js:3143`) and supplies it to Rhea (`:3221`). Manifest identity is checked by `exactRheaProof` (`:99`). This proves the source handoff, not a paid end-to-end run.
- **Package inventory, executed:** all 15 names in `OWN_TOOL_SEATS` have package writer-tool grants. No missing-grant seat was found. A synthetic recall-only seat receives only `canon_recall`. Both Nia seats receive exactly `undocked_history`, `citizen_lookup`, and `canon_recall`; the executor explicitly allows recall for Nia (`cron-desk-writer.js:945`–`946`).
- **Saturday, executed focused probes:** `stagedGrade` maps 3/3 to 4, 2/3 to 2.67, preserves old 3/4 as 3, and rejects 4/3. Staged proof retains the complete contract score (`cron-desk-run.js:115`), so its max survives. Saturday's displayed `/4` is correct for this normalized value. The full Saturday suite was not run because it writes receipts under the repository's output tree; these checks called the pure helper only.
- **Other readers, source traced:** `cronFeedback.js:29` still lists closing; missing `closed` does not count as a false value, so new scores do not become closing failures. Its denominator nevertheless includes all graded wakes (`:98`–`102`), so a mixed week dilutes historical closing-failure counts. `cron-desk-run.js:3438`–`3440` drops `max` from `reward-loop-c<N>.jsonl`; that diagnostic log cannot independently distinguish an old 3/4 from a new 3/3. Neither is the Saturday rank source. No runtime contract-score consumer was found in the dashboard search. Remaining `renderRecordsBrief`/`renderSourceBrief` closing text has test callers only in the inspected script tree; the live W3 path uses the model writer.
- **OpenRouter, source verified:** the provider-specific system instruction at `cron-desk-writer.js:1340` now asks for the section as the final message; returned text is filed at `:1520`. No model was called to reproduce the earlier Luna behavior.
- **Test-shell arm, source verified only:** `TEST_LIGHT` requires the scratch-directory variable; memory tools are disabled by nulling `BYLINE_POPID` in that shell. This does not establish whole-shell write isolation. The pre-existing gaps path still calls `appendGapsEntry` without `TEST_SHELL` protection (`cron-desk-run.js:3430`), whose default path is the live production log (`:2713`, `:2622`). A shell draft with an absence sentence or thin tool result can write there even with `--no-gate`. This is pre-existing collateral behavior, not a newly introduced finding in the named diff. No shell/model rerun was performed.

## Verification record

Six full focused suites passed: `livedExperiencePacket.test.js`, `livedExperiencePacketV2.test.js`, `cronDeskFanoutHandoff.test.js`, `newsroomWakePackages.test.js`, `cronFeedback.test.js`, and `cron-desk-writer.test.js`. `cronRheaPersonaGate.test.js` failed as F6 describes. `node --check` passed for all ten changed JavaScript files; `bash -n scripts/testReporterWrite.sh` passed.

Local tests used a temporary preload that stubbed environment loading, blocked credential reads and network connections, and prohibited filesystem writes outside `/tmp`. Recall probes used synthetic mocked search results; no remote canon was queried. Focused probes also exercised quote admission, unrelated-number admission, section stripping, closing-packet preservation, the grade-echo path, grant inventory, Nia toolsets, and mixed-score conversion. No newsroom model/API, Sheet, Drive, Discord, cron, deployment, or service operation was run; the permitted engineering-memory recall was separate from these checks. No engine function, `S.` field, or Sheet schema change is under review, so no engine wiring card was requested.

Concurrent work was left untouched. Delivery consists of this review and its required index entry; no runtime fix is included. HOLD requires settling F1–F6, not changing the builder's intended newsroom behavior.
