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

**Architecture:** Mags' assignment remains immutable in §1. W1 returns a dual artifact—a human first-person chase plus a validated machine plan—and only the chase enters §2; W2 returns a citizen answer rather than assignment language in §3; W3 fills a fixed four-part Article in §4. Deterministic checks enforce shape, Packet-backed named entities, real-world exclusion, repair-chrome exclusion, and assignment/INTAKE coherence before Rhea reviews contradictions.

**Terminal:** engine-sheet

**Pointers:**

- Prior work: [[2026-08-09-three-wake-lived-packet-pilot]] and [[../adr/0017-typed-lived-experience-packets]]
- Related plan: [[2026-07-20-headless-newsroom-pipeline]] §Phase 2.5
- Research basis: [[../research/2026-08-20-s344-human-story-template]] — restore S344 human slots; Packet remains sidecar; initial Jax/Tanya controls recorded

**Acceptance criteria:**

1. Every Packet-active W1 keeps a validated typed plan in the machine artifact and writes a non-JSON, first-person chase under story §2; JSON-shaped or third-person chase text fails W1 before W2 can proceed.
2. Every landed W2 quote answers what the citizen saw, felt, understood, or wants about the assigned fact; “the Tribune should ask” and equivalent newspaper-as-actor language fails W2.
3. Every W3 Article has the same ordered shape: assigned-fact lede → one scene → one landed Packet quote → unanswered question.
4. W3 fails before Rhea on a named entity absent from the Packet, a prohibited real-world import, model-repair chrome, a missing required Article slot, or an Article/assignment/INTAKE mismatch.
5. The C103 Jax negative fixture fails for §2 JSON, Tribune-as-actor quotes, unsupplied real places, missing Packet quote, and transit/faith mismatch even though the preserved Rhea verdict says PASS.
6. A builder-approved positive Article fixture passes the deterministic checks and then reaches Rhea without losing the journalist's voice; C104 Tanya remains a partial boundary control until the missing scene, quote, and first-person voice are supplied.
7. No task in this plan edits crontab, PM2, deployment state, publication state, canon ingestion, or live Sheets. Scheduled wakes continue producing observation artifacts during local development.

---

## Tasks

### Task 1: Lock the two current pressure-test controls

- **Files:**
  - `docs/research/2026-08-20-s344-human-story-template.md` — read
  - `output/cron-compare/civic_c103_freelance-firebrand_packet-v2_story.md` — read
  - `output/cron-compare/staged/civic_c103_freelance-firebrand_packet-v2_anthropic-claude-sonnet-5.staged.md` — read
  - `output/cron-compare/civic_c103_freelance-firebrand_packet-v2_anthropic-claude-sonnet-5.rhea.json` — read
  - `output/cron-compare/sports_c104_tanya-cruz_packet-v2_story.md` — read
  - `output/cron-compare/staged/sports_c104_tanya-cruz_packet-v2_deepseek-deepseek-chat.staged.md` — read
- **Steps:**
  1. Preserve the exact observed failures and partial successes in the research matrix.
  2. Treat Jax as the required fail fixture and Tanya as a boundary control, not a full positive fixture.
- **Verify:** `rg -n "C103 Jax|C104 Tanya" docs/research/2026-08-20-s344-human-story-template.md` → both controls and their distinct roles appear.
- **Status:** [x] complete

### Task 2: Add the human chase to the W1 response contract

- **Files:**
  - `scripts/livedExperiencePacket.js` — modify
  - `scripts/livedExperiencePacketV2.js` — verify wrapper compatibility
  - `scripts/livedExperiencePacket.test.js` — modify
  - `scripts/livedExperiencePacketV2.test.js` — modify
- **Steps:**
  1. Add a required `chase` field to the W1 output contract: short, first-person reporting intent tied to the assigned fact.
  2. Keep `focus`, `checks`, `targets`, `interpretation`, `unverifiedLead`, and `closeQuestion` as typed sidecar fields.
  3. Reject a missing chase, JSON-shaped chase, a replacement assignment, or a chase without first-person language.
- **Verify:** `node scripts/livedExperiencePacket.test.js && node scripts/livedExperiencePacketV2.test.js` → valid dual output passes; JSON/third-person/reassignment fixtures fail loudly.
- **Status:** [ ] not started

### Task 3: Put only the human chase in story §2

- **Files:**
  - `scripts/cron-desk-run.js` — modify
  - `scripts/cronDeskStoryTemplate.test.js` — create
- **Steps:**
  1. Retain the validated W1 plan in `angle.json` for W2/W3 machine use.
  2. Pass only the validated human chase to `storyDocOpen()`.
  3. Make W1 fail, rather than write the story document, if §2 would be JSON or a serialized plan.
- **Verify:** `node scripts/cronDeskStoryTemplate.test.js` → story §2 contains first-person prose; structured plan remains in the angle sidecar; JSON §2 fixture fails.
- **Status:** [ ] not started

### Task 4: Make W2 ask for lived answers

- **Files:**
  - `scripts/livedExperiencePacket.js` — modify
  - `scripts/livedExperiencePacketV2.js` — modify
  - `scripts/newsroomInterviewContract.js` — modify
  - `scripts/newsroomInterviewContract.test.js` — modify
- **Steps:**
  1. Replace question forms that ask what the Tribune should ask with one bounded prompt: what did the citizen see, feel, understand, or want about the supplied assigned fact?
  2. Preserve typed fact IDs and exposure rules; no new observation authority is created.
  3. Reject publishable quotes that make the Tribune/paper/reporter the actor or contain assignment-note language.
- **Verify:** `node scripts/newsroomInterviewContract.test.js && node scripts/livedExperiencePacketV2.test.js` → actual answers pass; the preserved C103 “Tribune should ask” lines fail.
- **Status:** [ ] not started

### Task 5: Define the fixed W3 Article contract

- **Files:**
  - `docs/media/wake_templates/STORY_TEMPLATE.md` — modify
  - `scripts/livedExperiencePacket.js` — modify
  - `scripts/livedExperiencePacketV2.js` — modify
  - `scripts/livedArticleShape.js` — modify
  - `scripts/livedArticleShape.test.js` — modify
- **Steps:**
  1. Encode the ordered Article slots: assigned-fact lede, one scene, one exact Packet quote, unanswered question.
  2. State once that named entities require Packet membership and unnamed non-contradictory texture is allowed.
  3. Keep persona/desk instructions as voice overlays inside the fixed structure.
- **Verify:** `node scripts/livedArticleShape.test.js` → complete Articles pass; missing, duplicated, or reordered slots fail with named reasons.
- **Status:** [ ] not started

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
  4. Preserve unnamed scene texture unless it makes a new concrete claim that contradicts the Packet.
- **Verify:** `node scripts/articleContamination.test.js && node scripts/livedExperiencePacketV2.test.js` → Jax real-place imports and repair chrome fail; anonymous non-contradictory texture passes.
- **Status:** [ ] not started

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
- **Status:** [ ] not started

### Task 8: Order the gates without making Rhea the writer

- **Files:**
  - `scripts/cron-desk-run.js` — modify
  - `scripts/cron-desk-writer.js` — modify only if its repair path emits forbidden chrome before return
  - `scripts/cron-desk-writer.test.js` — modify
- **Steps:**
  1. Run human-slot, interview, Article-shape, entity, and assignment checks deterministically before invoking Rhea.
  2. Send only a structurally valid Article plus Packet to Rhea for contradiction review.
  3. Do not ask Rhea to compose, repair, or normalize the Article.
- **Verify:** `node scripts/cron-desk-writer.test.js && node scripts/cronDeskStoryTemplate.test.js` → deterministic failures never reach the Rhea-call seam; valid fixtures do.
- **Status:** [ ] not started

### Task 9: Establish one complete positive fixture

- **Files:**
  - `scripts/fixtures/newsroom/s344-positive-article.md` — create after builder approves the source Article
  - `scripts/fixtures/newsroom/s344-positive-packet.json` — create from the matching non-canon test Packet
  - `scripts/cronDeskStoryTemplate.test.js` — modify
- **Steps:**
  1. Prefer recovery of the exact accepted Dirt Carnival Article through a separately approved source path.
  2. If it cannot be recovered, use a builder-approved Article and visibly synthetic Packet fixture; do not present synthetic content as canon or place it in any publish/ingest path.
  3. Prove the complete fixed template without flattening its voice.
- **Verify:** `node scripts/cronDeskStoryTemplate.test.js` → the approved positive pair passes every deterministic check.
- **Status:** [ ] not started

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
- **Status:** [ ] not started

---

## Open questions

- [ ] Which exact accepted Article should become the permanent positive fixture if the original C102 Dirt Carnival text cannot be recovered? This blocks Task 9 only; Tasks 2–8 can use visibly synthetic local fixtures plus the preserved negative artifacts.

---

## Changelog

- 2026-08-20 (codex) — Initial active plan; Task 1 completed from C103 Jax and C104 Tanya artifacts. No runtime, scheduler, deployment, publication, or canon state changed.
