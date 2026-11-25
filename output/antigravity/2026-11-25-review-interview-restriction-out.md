# Adversarial Review — Seat-File Reporter Picks Outside the Pool (`91385f174`)

- **Reviewer:** Antigravity (`agy`)
- **Date:** 2026-11-25
- **Brief:** `docs/for-claude-review/2026-11-25-rb-brief-agy-interview-restriction-out.md`
- **Commit reviewed:** `91385f174` (`pipeline.111: a seat-file reporter interviews whom it picks`)
- **Files inspected:** `scripts/livedExperiencePacket.js`, `scripts/livedExperiencePacketV2.js`, `scripts/cron-desk-run.js`, `scripts/cron-desk-writer.js`, `scripts/newsroomInterviewContract.js`, `scripts/citizenVoice.js`, `scripts/cron-rhea-gate.js`, `scripts/newsroomSourcing.js`, `scripts/newsroomWakePackages.js`, `scripts/newsroom-wake-packages.json`, `scripts/s344ArticleGate.js`, `scripts/livedArticleShape.js`, `scripts/articleContamination.js`, `scripts/cron-saturday-run.js`, `scripts/livedPacketFreeAngle.test.js`, `scripts/newsroomInterviewContract.test.js`, `scripts/cron-desk-writer.test.js`, `scripts/newsroomWakePackages.test.js`, `output/simulation_ledger_snapshot.jsonl`
- **Verdict:** **SHIP-WITH-FIXES**

---

## Findings

### 1. [HIGH] `ownLifeInterviewPacket` strips `"say so plainly"`, `citizenVoice.js` strips the citizen's life, and `schema.basis` conflicts with `validateInterviewOutput`

- **Where:**
  - `scripts/newsroomInterviewContract.js:133-152` (`ownLifeInterviewPacket`), `:158-161` (`hasLivedEvidence`), `:211-214` (`validateInterviewOutput`), `:245-250` (`citizenEvidenceGuard`)
  - `scripts/livedExperiencePacket.js:835-836` (`questionFor`), `:890` (`evidenceFor`)
  - `scripts/cron-desk-run.js:548-561` (`collectQuoteAsks`)
  - `scripts/citizenVoice.js:210-212` (`voiceOne`)
- **What is wrong:**
  1. **Missing `"say so plainly"` room:** `questionFor` (`scripts/livedExperiencePacket.js:835-836`) appends `' Speak from your life. If the question assumes something that has not happened to you, say so plainly. Do not add a concrete example, object, event, or rumor that is not in the Packet.'` Immediately afterward, `collectQuoteAsks` (`scripts/cron-desk-run.js:548-551`) calls `ownLifeInterviewPacket(inputPacket, target && target.question)` for every `SEAT_FILE` seat (the only seats that make `reporter-pick`s). `ownLifeInterviewPacket` (`scripts/newsroomInterviewContract.js:141-142`) overwrites `out.task.question` with `(planned ? ... : ...) + ' Speak from your life.'`, and `out.limits.rule` (`:148`) says only `'If you have nothing true, abstain.'` A `reporter-pick` whose life was not touched by the question's premise is never told to say so plainly.
  2. **Citizen's simulated life stripped in `citizenVoice.js`:** Because `evidenceFor` (`scripts/livedExperiencePacket.js:890`) returns `[]` for `reporter-pick` and `ownLifeInterviewPacket` (`scripts/newsroomInterviewContract.js:143`) sets `exposure.evidence = []`, `cron-desk-run.js:561` computes `livedContextAllowed: interviewContract.hasLivedEvidence(inputPacket)` as `false`. In `citizenVoice.js:210-211`, `interviewMode && !livedContextAllowed` routes the citizen away from `:212` (`lifeArc`, `health`, `show`, `c.life`, `family`, `standing`, `who`, `bonds`, `sports`, `texture`, `memory`) to `identity + ownRecord + '\n\nThis interview has no story-linked personal exposure. Stay in your own voice, but do not project unrelated life history onto the story.'` And `ownLifeInterviewPacket` (`scripts/newsroomInterviewContract.js:144-146`) keeps only the citizen's ledger profile, calendar, and `known` facts naming them (typically none for an off-record pick). Thus a `reporter-pick` asked to `"Speak from your life"` does not receive their `LifeHistory`, family, bonds, neighbors, or reflections in the system prompt.
  3. **`schema.basis` conflict / false rejection:** `ownLifeInterviewPacket` (`scripts/newsroomInterviewContract.js:150`) sets `out.output.schema.basis = 'lived-context|direct-reaction|null'`, while `citizenEvidenceGuard(false)` (`:248`) instructs `'Set basis to direct-reaction.'` Because `hasLivedEvidence(input)` is `false`, any model following `schema.basis` and returning `basis: 'lived-context'` is rejected by `validateInterviewOutput` (`:211-213`: `'lived-context basis requires addressable story-linked evidence'`) and turned into a `contract-invalid` fallback at `cron-desk-run.js:619`.

---

### 2. [MEDIUM] Pool candidates past index 12 (`peopleCap`) are silently dropped between W1 and W2

- **Where:** `scripts/livedExperiencePacket.js:390-392` (`buildFreeAnglePacket`), `scripts/cron-desk-run.js:2404-2408` (`runAngle`), `scripts/cron-desk-run.js:495-511, 571` (`collectQuoteAsks`)
- **What is wrong:** `buildFreeAnglePacket` (`scripts/livedExperiencePacket.js:392`) slices `inputPacket.exposure.candidates` to `(slice && slice.prewrite && slice.prewrite.peopleCap) || 12`. In `runAngle`, `byPop` (`scripts/cron-desk-run.js:2404`) is populated from the unsliced `sourcingPool.candidates` (`newsroomSourcing.js` does not cap `street`/`workplace`/`offices`/`named` at 12). If a seat-file reporter picks a citizen who sits at index `>= 12` in `sourcingPool.candidates` (e.g., via `citizen_lookup`), `validateAngleOutput` accepts the target via `reporterPickRefusal`, `runAngle` (`:2407`) finds `byPop.has(t.pop) === true` and omits them from `reporterPicks`, and `collectQuoteAsks` (`:507-511`) filters `pool.candidates` against `w1ByPop` (built from the 12-entry `inputPacket.exposure.candidates`). The target is in neither `filled` nor `reporterPicks` and is dropped at `:571` (`WARN angle target outside the sourcing pool dropped`).

---

### 3. [MEDIUM] `contractScore` still grades `bareWrite` free-angle seats against the beat's `reviewProfile.purpose`

- **Where:** `scripts/cron-desk-run.js:3283, 3311, 3364-3365, 3472, 4064-4067`, `scripts/cron-rhea-gate.js:318-341, 442, 883`
- **What is wrong:** For `SEAT_FILE` seats, `bareWrite` (`cron-desk-run.js:3283`) causes `bareReviewProfile` (`:4064-4067`) to strip `articleContract` from `writePacket.reviewProfile`, so `rubricBlock` (`cron-desk-writer.js:474`) returns `''`. However, `rewardLoop` is `true` on every package, so `cron-desk-run.js:3472` still passes `--contract-score` to `cron-rhea-gate.js`. When `packet.reviewProfile.articleContract` is absent, `cron-rhea-gate.js:442` falls back to `profile` (the full `wakePackage.reviewProfile` from `scripts/newsroom-wake-packages.json`), and `buildContractPrompt` (`:328, 334`) grades `purposeMet` against that beat-record purpose (e.g. `"Report Oakland's schools and youth from the schools record"`). A seat-file reporter chasing an angle outside the supplied beat record is graded down on `purposeMet` in `.rhea.json`, `.wake.json`, `reward-loop-c<N>.jsonl`, and their page doc (though `cron-desk-run.js:2291` skips reading the grade back at W1 when `FREE_ANGLE` is set).

---

### 4. [MEDIUM] `renderPacketIntake` `quotedIn` produces false positives under 25 chars and false negatives at 25+ chars

- **Where:** `scripts/cron-desk-writer.js:505-509` (`renderPacketIntake`)
- **What is wrong:**
  1. **False positive (`< 25` chars):** `if (whole && whole.length < 25) return flat.includes(whole);` (`:507`) searches the entire flattened article body without requiring quotation marks or proximity to `name`. Any short answer under 25 chars (e.g., a 4-word citizen quote like `"Nothing on file here."` or `"It is fine now."`, or a short `worker-answer`/`office-record` like `"Nothing on file."`) that appears anywhere in unquoted body text alongside a mention of `name` promotes `mentioned` to `quoted-source`. Verified locally via `renderPacketIntake`: body `"Jordan passed Test Citizen on the street. Nothing on file."` with `quote: "Nothing on file."` emits `NAMES: Test Citizen | quoted-source`.
  2. **False negative (`>= 25` chars composed of short sentences):** When `whole.length >= 25` (`:508-509`), `quotedIn` splits on `(?<=[.!?"”])\s+` and filters `.filter(t => t.length >= 25)`. An answer of 25+ chars made of sentences each under 25 chars skips `:507` and has all sentences filtered out by `:509`, returning `false`. Verified locally via `renderPacketIntake`: body `'Test Citizen said, "I saw it. Nothing has moved."'` with `quote: 'I saw it. Nothing has moved.'` (28 chars; sentences 9 and 18 chars) emits `NAMES: Test Citizen | mentioned`.

---

### 5. [LOW] Seat-specific W1/W2/W3 edge cases (`ines-sorensen`, `anthony-raines`, null `story`, W2 re-check)

- **Where:** `scripts/cron-desk-run.js:490, 501, 520-526, 2007, 2278, 3284-3296`, `scripts/livedExperiencePacket.js:421-424, 706-726`
- **What is wrong:**
  1. `ines-sorensen` has `seatFile` set (`FREE_ANGLE = 'free-rows'`), so W1 permits any active citizen via `buildFreeAnglePacket`; however, `runWrite` (`cron-desk-run.js:3284-3289`) calls `voices.pagesForPicks(picks)` and throws `'Voices: the angle names no citizen with a page on the record'` if all picked targets lack a page in `output/citizen_pages/index.jsonl`.
  2. `anthony-raines` has `seatFile` + `sourcing: 'records'`; W2 (`cron-desk-run.js:490`) correctly returns `[]` so records seats interview nobody, while W1 (`buildFreeAnglePacket`, `livedExperiencePacket.js:421-424`) still prompts him for `targets` and states `'Up to four are asked.'`
  3. If `runAngle` reaches `cron-desk-run.js:2007` with `story === null` (e.g., `nia-rook` invoked directly via `--stage=angle` without fanout, or `nia-rook-weekly` when `weeklySlice.empty` is true, where `free.week` still populates `buildFreeAnglePacket` via `undockedRecordLines`), `sourcingPool` is written as `null`, and W2 `collectQuoteAsks:501` throws `'W2 requires the fixed W1 sourcing pool'`.
  4. `collectQuoteAsks` (`cron-desk-run.js:520-526`) comments `'re-checked against the ledger here'`, but calls `reporterPickCandidate` (`livedExperiencePacket.js:717-726`), which checks ledger presence (`ledgerRowForPop`) without re-running `reporterPickRefusal` (Active / non-MED), though W1 already ran `reporterPickRefusal` and `push` (`:529`) checks self. Note also that `output/simulation_ledger_snapshot.jsonl` contains one `Active` citizen with `RoleType: "Journalist"` and `MED (y/n): "no"` (`POP-00546`, Tara Ellison), whom `reporterPickRefusal` admits and `articleContamination.js:171` flags (`reporter-as-source`) if quoted in prose.

---

## Verified Clean Against Remaining Brief Checks

- **Puppeting (Attack 2):** `buildFreeAnglePacket` (`scripts/livedExperiencePacket.js:421-424`), `ownLifeInterviewPacket` (`scripts/newsroomInterviewContract.js:141-148`), and `citizenVoice.js:210-212` do not tell the reporter whom to pick or put words in a citizen's mouth.
- **No fabricated evidence row (Attack 4):** `evidenceFor` (`scripts/livedExperiencePacket.js:890`) returns `[]` for `sourceKind === 'reporter-pick'` and `ownLifeInterviewPacket` (`scripts/newsroomInterviewContract.js:143`) keeps `exposure.evidence` empty; no claim places the pick in the story record.
- **W3 / Rhea / writer audit / SELF-SCORE / INTAKE usage credit (Attacks 1 & 3):**
  - `buildWritePacket` (`scripts/livedExperiencePacket.js:1068-1086`, `scripts/livedExperiencePacketV2.js:304-357`) adds landed `reporter-pick` quotes to `exposure.sources`, `exposure.subjects`, `manifest.approvedQuotes`, and `manifest.approvedSubjects`, and pulls selected `known` facts (their ledger profile) into `manifest.approvedFacts`.
  - `auditArticle` (`scripts/livedExperiencePacketV2.js:886`) returns `errors: []` (non-blocking observations only).
  - `SELF-SCORE` (`scripts/cron-desk-writer.js:533-537`) is suppressed when `rewardLoop` is on (`:1723`, `cron-desk-run.js:3659`) and counts `exposure.sources` when emitted.
  - `cron-rhea-gate.js:530-541, 631-662` treats `reporter-pick` quotes as backed `quoted-source` entries and verified ledger citizens.
  - `buildIntakeSidecar` (`scripts/cron-desk-run.js:3135`) and `usageRowsFor` (`scripts/cron-saturday-run.js:478-500`) resolve `popid` via `packet.quotes` (`byQuote`) and map `quoted-source` to `quoted`.
- **Breakage (Attack 5):**
  - Records seats (`sourcing: 'records'`) return `[]` at `cron-desk-run.js:490`.
  - Non-seat-file seats (`SEAT_FILE = null`, `FREE_ANGLE = null`) keep the assigned W1 packet, the `allowed.has(t.pop)` W1 check (`livedExperiencePacket.js:679-683`), and the full pool at W2 (`cron-desk-run.js:576-578`).
  - Zero candidates + zero targets validates in both free and assigned modes (`livedExperiencePacket.js:672-697`).
  - Lowercase picks are trimmed and uppercased before `allowed.has` / `reporterPickRefusal` (`livedExperiencePacket.js:674`).
  - Picks already in the first 12 pool candidates are excluded from `reporterPicks` (`cron-desk-run.js:2407`) and retain their original pool `sourceKind` and `evidence` at W2 (`:517-525`).
  - `QUOTE_CITIZEN_CAP` (`4`) holds in `collectQuoteAsks` (`cron-desk-run.js:528`).
- **Local unit tests run and passed:** `livedPacketFreeAngle.test.js`, `newsroomWakePackages.test.js`, `newsroomInterviewContract.test.js`, `livedExperiencePacket.test.js`, `livedExperiencePacketV2.test.js`, `cron-desk-writer.test.js`, `cron-rhea-gate.test.js`, `cronDeskFanoutHandoff.test.js`, `reporterOwnPieces.test.js`.
