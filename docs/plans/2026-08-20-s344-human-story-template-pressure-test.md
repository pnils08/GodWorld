---
title: S344 Human Story Template Recovery and Pressure-Test Plan
created: 2026-08-20
updated: 2026-08-20
type: plan
tags: [media, newsroom, canon, evaluation, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md §pipeline.54
  - docs/research/2026-08-20-s344-human-story-template.md
  - docs/plans/2026-07-20-headless-newsroom-pipeline.md §Phase 2.5 (Mike-direct S344)
  - docs/adr/0017-typed-lived-experience-packets.md
  - docs/media/wake_templates/STORY_TEMPLATE.md
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout, pipeline.54"
  - "[[../SCHEMA]] — doc conventions"
  - "[[../index]] — registered in the same commit"
  - "[[../research/2026-08-20-s344-human-story-template]] — research basis and initial pressure test"
---

# S344 Human Story Template Recovery and Pressure-Test Plan

**Goal:** Restore one uniform human Article shape across every scheduled desk while retaining LEP/2 as the typed sidecar and Rhea as the independent contradiction gate.

**Architecture:** Mags' assignment remains immutable in §1. W1 returns a dual artifact—a human chase in the reporter's register plus a validated machine plan—and only the chase enters §2; W2 returns a citizen answer rather than assignment language in §3, and a wake with zero publishable answers fails before W3 opens; W3 fills a fixed four-part Article in §4. Deterministic checks enforce shape, Packet-backed names and supplied claims (no unsupplied access, dialogue, count, or room), real-world exclusion, repair-chrome exclusion, and assignment/INTAKE coherence before Rhea reviews contradictions. The W1 three-cited-facts machine check stays in the sidecar; it is not a human slot and is not retired.

**Terminal:** engine-sheet

**Pointers:**

- Prior work: [[2026-08-09-three-wake-lived-packet-pilot]] and [[../adr/0017-typed-lived-experience-packets]]
- Related plan: [[2026-07-20-headless-newsroom-pipeline]] §Phase 2.5
- Research basis: [[../research/2026-08-20-s344-human-story-template]] — restore S344 human slots; Packet remains sidecar; initial Jax/Tanya controls recorded

**Acceptance criteria:**

1. Every Packet-active W1 keeps a validated typed plan in the machine artifact and writes a non-JSON chase under story §2 in that reporter's register (where they are standing, who they are chasing, what does not line up). JSON-shaped chase and assignment-swap fail W1 before W2 can proceed. Third-person chase does **not** fail; S344 is voice, not pronouns. A chase that is the plan object in English (`I will verify the assigned fact and talk to POP-…`) fails as JSON-shaped.
2. Every landed W2 quote answers what the citizen saw, felt, understood, or wants about the assigned fact; “the Tribune should ask” and equivalent newspaper-as-actor language fails W2. Zero publishable answers fails W2 and does **not** open W3. W3 may not invent a quote to satisfy the Article template.
3. Every W3 Article that runs has the same ordered shape: assigned-fact lede → one scene → one landed Packet quote → unanswered question. Scene may be the supplied field or box score; scene is not a license to mint a room, access, dialogue, or count the Packet did not supply.
4. W3 fails before Rhea on a named entity absent from the Packet, an unsupplied access/dialogue/count/room claim, a prohibited real-world import, model-repair chrome, a missing required Article slot, or an Article/assignment/INTAKE mismatch.
5. The C103 Jax negative fixture fails for §2 JSON, Tribune-as-actor quotes, unsupplied real places, missing Packet quote, and transit/faith mismatch even though the preserved Rhea verdict says PASS.
6. C103 Luis Navarro (Fruitvale Transit Hub / Rafael Pilgrim) is the on-disk near-pass: assigned fact, named rider, Packet quote, unanswered question. Task 9 names what still fails the four-part (process recap, thin scene) and either tightens that artifact into the positive fixture or uses a builder-approved completion of it. C104 Tanya remains a boundary control: missing scene and quote, **and** invented clubhouse access her approach forbids. Dirt Carnival recovery is optional, not a Task 9 gate.
7. No task in this plan edits crontab, PM2, deployment state, publication state, canon ingestion, or live Sheets. Scheduled wakes continue producing observation artifacts during local development.

---

## Tasks

### Task 1: Lock the two current pressure-test controls

- **Files:**
  - `scripts/__fixtures__/newsroom/s344/` — create (frozen Jax / Tanya / Luis story+Article; NOT CANON)
  - `scripts/s344HumanSlots.js` — create
  - `scripts/s344HumanSlots.test.js` — create
  - `docs/research/2026-08-20-s344-human-story-template.md` — read
- **Steps:**
  1. Freeze the observed artifacts so later live cron-compare drift cannot move the fixtures.
  2. Treat Jax as the required fail fixture. Treat Tanya as a boundary control (empty §3 plus invented clubhouse access), not a full positive fixture. Treat C103 Luis Navarro as the on-disk near-pass.
  3. Score them with local detectors (JSON chase, Tribune-as-actor, real-world import, unsupplied access, assignment/INTAKE mismatch, empty W2) — no Rhea, no live writer change.
- **Verify:** `node scripts/s344HumanSlots.test.js` → PASS. Jax fails all five claimed gates; Tanya is json/empty-W2/clubhouse; Luis Article stays on the hub with a named rider and unanswered question while the story doc is still JSON §2 / empty §3. Third-person beat plan is not JSON-shaped; `I will verify the assigned fact and talk to POP-…` is.
- **Status:** [x] complete

### Task 2: Add the human chase to the W1 response contract

- **Files:**
  - `scripts/livedExperiencePacket.js` — modify
  - `scripts/livedExperiencePacketV2.js` — verify wrapper compatibility
  - `scripts/livedExperiencePacket.test.js` — modify
  - `scripts/livedExperiencePacketV2.test.js` — modify
- **Steps:**
  1. Add a required `chase` field to the W1 output contract: a beat plan in the reporter's register — where they are standing, who they are chasing, what does not line up — tied to the assigned fact.
  2. Keep `focus`, `checks`, `targets`, `interpretation`, `unverifiedLead`, and `closeQuestion` as typed sidecar fields.
  3. Reject a missing chase, JSON-shaped chase (including the plan object restated in English), or a replacement assignment. Do **not** reject third-person chase; Anthony/Hal seats are third-person by design.
- **Verify:** `node scripts/livedExperiencePacket.test.js && node scripts/livedExperiencePacketV2.test.js` → valid dual output passes (including a third-person Anthony-register chase); JSON-shaped, plan-in-English, and reassignment fixtures fail loudly; a missing-`I` chase does not fail on pronouns.
- **Status:** [x] complete

### Task 3: Put only the human chase in story §2

- **Files:**
  - `scripts/cron-desk-run.js` — modify
  - `scripts/cronDeskStoryTemplate.test.js` — create
- **Steps:**
  1. Retain the validated W1 plan in `angle.json` for W2/W3 machine use.
  2. Pass only the validated human chase to `storyDocOpen()`.
  3. Make W1 fail, rather than write the story document, if §2 would be JSON or a serialized plan.
- **Verify:** `node scripts/cronDeskStoryTemplate.test.js` → story §2 contains the chase in the reporter's register (first- or third-person); structured plan remains in the angle sidecar; JSON and plan-in-English §2 fixtures fail.
- **Status:** [x] complete

### Task 4: Make W2 ask for lived answers

- **Files:**
  - `scripts/livedExperiencePacket.js` — modify
  - `scripts/livedExperiencePacketV2.js` — modify
  - `scripts/newsroomInterviewContract.js` — modify
  - `scripts/newsroomInterviewContract.test.js` — modify
  - `scripts/cron-desk-run.js` — modify
- **Steps:**
  1. Replace question forms that ask what the Tribune should ask with one bounded prompt: what did the citizen see, feel, understand, or want about the supplied assigned fact?
  2. Preserve typed fact IDs and exposure rules; no new observation authority is created.
  3. Reject publishable quotes that make the Tribune/paper/reporter the actor or contain assignment-note language.
  4. If zero publishable answers land, fail W2 and do not invoke W3. W3 may not invent a quote to fill the Article template.
- **Verify:** `node scripts/newsroomInterviewContract.test.js && node scripts/livedExperiencePacketV2.test.js` → actual answers pass; the preserved C103 “Tribune should ask” lines fail; a zero-quote W2 fixture does not reach the W3 writer seam.
- **Status:** [x] complete

### Task 5: Define the fixed W3 Article contract

- **Files:**
  - `docs/media/wake_templates/STORY_TEMPLATE.md` — modify
  - `scripts/livedExperiencePacket.js` — modify
  - `scripts/livedExperiencePacketV2.js` — modify
  - `scripts/livedArticleShape.js` — modify
  - `scripts/livedArticleShape.test.js` — modify
- **Steps:**
  1. Encode the ordered Article slots: assigned-fact lede, one scene, one exact Packet quote, unanswered question.
  2. State once that named entities require Packet membership and unnamed non-contradictory texture is allowed. Scene may be the supplied field or box score; it must not mint a room, access, dialogue, or count absent from the Packet.
  3. Keep persona/desk instructions as voice overlays inside the fixed structure.
  4. Do not retire the W1 three-cited-facts machine check. It stays in the sidecar; the human slots remain chase / answer / Article.
- **Verify:** `node scripts/livedArticleShape.test.js` → complete Articles pass; missing, duplicated, or reordered slots fail with named reasons; a Tanya-class clubhouse-access scene fails; the three-cited-facts sidecar check remains wired.
- **Status:** [x] complete

### Task 6: Enforce the Packet named-entity wall and repair-chrome wall

- **Files:**
  - `scripts/articleContamination.js` — modify
  - `scripts/articleContamination.test.js` — modify
  - `scripts/livedExperiencePacketV2.js` — modify
  - `scripts/livedExperiencePacketV2.test.js` — modify
- **Steps:**
  1. Derive the named-entity allowlist from the W3 Packet rather than relying only on a growing phrase denylist.
  2. Retain explicit real-world import checks for known constructed-world collisions, including BART and Frank Ogawa.
  3. Reject model-repair chrome such as “corrected article,” repair explanations, Packet/schema narration, and instruction echoes.
  4. Preserve unnamed scene texture unless it makes a new concrete claim that contradicts the Packet. Fail unsupplied access, dialogue, count, or room (C104 Tanya “clubhouse” is the fixture). Named-entity allowlist alone will not catch that class.
- **Verify:** `node scripts/articleContamination.test.js && node scripts/livedExperiencePacketV2.test.js` → Jax real-place imports, Tanya clubhouse access, and repair chrome fail; anonymous non-contradictory texture passes.
- **Status:** [x] complete

### Task 7: Bind W3 Article and INTAKE to the assignment

- **Files:**
  - `scripts/livedExperiencePacketV2.js` — modify
  - `scripts/cron-desk-run.js` — modify
  - `scripts/livedExperiencePacketV2.test.js` — modify
  - `scripts/cronDeskStoryTemplate.test.js` — modify
- **Steps:**
  1. Require the lede and at least one INTAKE claim to resolve to the assigned fact/source IDs.
  2. Reject an Article whose central subject, place, or storyline belongs to another assignment.
  3. Add the C103 Jax transit-Article/faith-INTAKE mismatch as the regression fixture.
- **Verify:** `node scripts/livedExperiencePacketV2.test.js && node scripts/cronDeskStoryTemplate.test.js` → matching assignment passes; preserved mismatch fails before Rhea.
- **Status:** [x] complete

### Task 8: Order the gates without making Rhea the writer

- **Files:**
  - `scripts/cron-desk-run.js` — modify
  - `scripts/cron-desk-writer.js` — modify only if its repair path emits forbidden chrome before return
  - `scripts/cron-desk-writer.test.js` — modify
- **Steps:**
  1. Run human-slot, interview, Article-shape, entity/claim, and assignment checks deterministically before invoking Rhea. A failed W2 (zero publishable answers, Tribune-as-actor quotes) never reaches the W3 writer or Rhea.
  2. Send only a structurally valid Article plus Packet to Rhea for contradiction review.
  3. Do not ask Rhea to compose, repair, or normalize the Article.
- **Verify:** `node scripts/cron-desk-writer.test.js && node scripts/cronDeskStoryTemplate.test.js` → deterministic failures never reach the Rhea-call seam; valid fixtures do.
- **Status:** [x] complete

### Task 9: Establish one complete positive fixture

- **Files:**
  - `scripts/__fixtures__/newsroom/s344/luis_c103_article.md` — read (frozen near-pass)
  - `scripts/__fixtures__/newsroom/s344/s344-positive-article.md` — create (synthetic completion, NOT CANON)
  - `scripts/__fixtures__/newsroom/s344/s344-positive-packet.json` — create
  - `scripts/cronDeskStoryTemplate.test.js` — modify
- **Steps:**
  1. Start from the C103 Luis Navarro Fruitvale Hub Article: assigned fact, named rider, Packet quote, unanswered question. Record the four-part misses (process recap, thin scene).
  2. Either tighten that artifact into the positive fixture with a builder-approved completion, or use a visibly synthetic Packet + builder-approved Article. Do not present synthetic content as canon or place it in any publish/ingest path.
  3. Dirt Carnival recovery remains optional if an approved source path appears; it does not block this task.
  4. Prove the complete fixed template without flattening its voice.
- **Verify:** `node scripts/cronDeskStoryTemplate.test.js` → the approved positive pair passes every deterministic check; Luis near-pass is named in the test commentary for what still failed before completion.
- **Status:** [x] complete

### Task 10: Observe two scheduled wakes after an approved runtime land

- **Files:**
  - `output/cron-compare/*_story.md` — read generated artifacts only
  - `output/cron-compare/*.rhea.json` — read generated artifacts only
  - `docs/plans/2026-08-20-s344-human-story-template-pressure-test.md` — append results
- **Steps:**
  1. Leave the existing cron schedule and process state unchanged.
  2. After code review, local tests, and the separately controlled runtime land, inspect the next two naturally scheduled Articles against all acceptance criteria.
  3. Record deterministic verdict and Rhea verdict separately; a Rhea PASS cannot override a template failure.
- **Verify:** two dated changelog entries name the Article paths and independent template/Rhea outcomes; no scheduler diff exists.
- **Status:** [ ] in-progress — waiting on the next naturally scheduled write wake after `34cace97`/`cb5c20c6` (2026-08-21 18:15 CDT). Crontab was read, not rewritten.

---

## Open questions

- [x] Positive fixture source if Dirt Carnival cannot be recovered — **C103 Luis Navarro** is the on-disk near-pass; Task 9 starts there. Dirt Carnival is optional.
- [ ] Whether the builder accepts a tightened Luis Article as the permanent positive fixture, or wants a separately written completion. Does not block Tasks 2–8.

---

## Changelog

- 2026-08-20 (codex) — Initial active plan; Task 1 completed from C103 Jax and C104 Tanya artifacts. No runtime, scheduler, deployment, publication, or canon state changed.
- 2026-08-20 (grok) — Review cuts before Tasks 2–4: chase is reporter-register beat plan, not first-person-required; third-person seats stay legal; plan-in-English chase fails as JSON-shaped. Zero publishable W2 answers fail W2 and do not open W3. Scene cannot mint unsupplied room/access/dialogue/count (Tanya clubhouse). Luis Navarro C103 is the on-disk near-pass for Task 9; Dirt Carnival no longer gates it. W1 three-cited-facts machine check stays in the sidecar.
- 2026-08-20 (grok) — Task 1 built: frozen fixtures under `scripts/__fixtures__/newsroom/s344/` + `s344HumanSlots.js` detectors. `node scripts/s344HumanSlots.test.js` PASS — theory holds: the claimed Jax/Tanya/Luis failures are locally detectable without Rhea. No live wake wiring.
- 2026-08-20 (grok) — Tasks 2–4: W1 `chase` field + reporterChaseText; §2 writes chase only (JSON §2 throws); W2 questions ask what the citizen saw/felt; Tribune-as-actor quotes fail interview validation; zero publishable answers fail W2 and W3 does not last-chance. Tests: livedExperiencePacket, livedExperiencePacketV2, newsroomInterviewContract, cronDeskStoryTemplate PASS.
- 2026-08-20 (grok) — Tasks 5–8: four-part Article slots; BART/Ogawa + clubhouse + repair-chrome walls; assignment/INTAKE bind (Jax faith/transit); Packet-active W3 skips Rhea when those gates fail; writer strips repair-chrome prefix. `s344ArticleGate.evaluate` is the seam. W1 three-cited-facts sidecar still wired.
- 2026-08-20 (grok) — Task 9: synthetic NOT_CANON positive pair `scripts/__fixtures__/newsroom/s344/s344-positive-{article.md,packet.json}`. Luis C103 remains the near-pass (split Packet quote, INTAKE on the quote not the hub). Title-only first line is not the lede. No crontab, ingest, or Sheets.
- 2026-08-20 (grok) — Task 10 opened, not closed. Crontab read-only (M–F 06:15 angle / 13:15 report / 18:15 write unchanged; no install). Runtime land is `34cace97` + `cb5c20c6` (22:24–22:55 CDT). The 2026-08-20 18:15 write fanout ran before that land and is not the observation window. Retrospective gate on two of those Articles (Rhea PASS does not override): `output/cron-compare/staged/sports_c104_tanya-cruz_packet-v2_deepseek-deepseek-chat.staged.md` — s344 FAIL (JSON §2, empty W2, missing Packet quote, missing question, clubhouse); Rhea pass=true. `output/cron-compare/business_c104_business-desk_packet-v2_deepseek-deepseek-chat.md` — s344 FAIL (JSON §2, missing Packet quote, missing question); Rhea pass=true. Next natural write 2026-08-21 18:15 CDT supplies the two post-land Articles.
