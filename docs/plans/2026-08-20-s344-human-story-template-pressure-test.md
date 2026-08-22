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

**Architecture:** Mags' assignment remains immutable in §1. W1 returns a dual artifact—a human chase in the reporter's register plus a validated machine plan—and only the chase enters §2; W2 returns a citizen answer rather than assignment language in §3, and a wake with zero publishable answers fails before W3 opens; W3 fills a fixed four-part Article in §4. The Packet is the data, not the picture. Allotted hallucination is the job: Jax's bar, Tanya's clubhouse, a named in-world spot that fits the numbers. The Packet will never contain a clubhouse event — that already-canon data is what they paint from. A new in-world place ("Tina's bar is my game-day spot") is not a leak; it is INTAKE `BIZ` and mints into GodWorld. The wall is real-world Oakland (BART, Frank Ogawa, Heinold's), invented engine numbers, invented Packet quotes, and Tribune-as-actor — not "does this room already exist on a sheet." **Desk split:** sports/culture/firebrand *paint* (Jax bar, Tanya clubhouse, named in-world `BIZ` that mints). Civic desks *report* — votes, money, phases, storylines, and the relationships between offices (who gets along, who doesn't). That interpersonal texture serves the world; invented bars and invented vote facts do not. Deterministic checks enforce shape, real-world exclusion, repair-chrome exclusion, and assignment/INTAKE coherence before Rhea. Rhea reviewProfiles are still the old Packet-exhaustive wall for most seats (Tanya's blockers were retuned; Jax/Carmen/Luis were not). The W1 three-cited-facts machine check stays in the sidecar.

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
  2. Scene is allotted hallucination: an in-world room or named spot that fits the assigned data. Real-world Oakland places fail. Engine numbers and Packet quotes stay Packet-backed. A new in-world `BIZ` must land on INTAKE so it can mint.
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
  4. Preserve allotted scene texture (in-world bar, clubhouse SET, named spot that is not real Oakland). Fail invented speech sourced from the room, real-world imports, and Packet-quote/number invention. C104 Tanya “clubhouse” as SET is not the fail.
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

### Task 11: Retune Rhea so allotted picture is not a contradiction (hand to Claude)

Rhea still grades against `reviewProfile.canonBlockers` injected in `scripts/cron-rhea-gate.js`. Writer/Tanya slice already allow the picture. Rhea will still FLAG it unless the profiles move.

- **Files:**
  - `scripts/newsroom-wake-packages.json` — modify (per-seat `reviewProfile`)
  - `scripts/cron-rhea-gate.js` — read; change only if profile injection is not enough
  - `scripts/newsroomWakePackages.test.js` — modify
- **Steps:**
  1. **Sports / culture / firebrand (picture desks).** Pass in-world SET and a newly named in-world business that is not real Oakland; require it on INTAKE `BIZ`. Still fail real-world Oakland, invented Packet people, invented quotes, invented numbers. **Jax is currently inverted:** `authorizedTexture` still names BART; `textureConditions` and `canonBlockers` still forbid a fabricated named business. That blocks "Tina's bar" — the allotted mint — and should be reversed.
  2. **Civic desks (Carmen, Luis, civic fact-reporters).** Not much to invent. They report Packet facts (votes, money, phases) and track civic storylines. Allotted civic texture is **office relationships** — who gets along, who doesn't — as world-serving observation, not as a vote, bloc, dollar, or phase. IND remains individuals, not a bloc. Invented bars/BART/Ogawa still fail. Invented vote math still fails.
  3. Tanya's `canonBlockers` were already retuned in `9a15ea30`. Do not revert. Do not treat her clubhouse SET as a Rhea fail.
  4. A Rhea PASS still cannot override a deterministic template/real-world fail. After Task 10 observation, land this before the next write wake if 18:15 still flags picture desks.
- **Verify:** Jax Article with an in-world named bar + INTAKE BIZ does not fail Rhea for "fabricated named business." Carmen/Luis Article that infers an office relationship without inventing a vote still passes. Same Article inventing a 5–3 tally not in the Packet still fails. Real-world BART/Ogawa still fail.
- **Status:** [ ] not started — Claude / research-build after Task 10 (or in parallel if 18:15 is already flagging picture desks on SET).

#### The gate axis — governing rule (builder-direct, 2026-08-21)

Task 11 is the first case of a general law. State the law, not the case:

> **The gate is "is this a real-world Oakland entity," not "is this entity on the ledger."**
>
> A named entity that is not on the ledger and is not real-world Oakland is **not a violation — it is intake.** The reporter naming it is the sim working. A reporter who names their favourite bar has told us that bar exists; a reporter who cites the man he always sees there has told us that man exists. The bar is minted to the business ledger and can hire. The man is an untracked Tier-5 who can be promoted. Ledger membership is the *outcome* of the citation, never its precondition.
>
> What still fails: a real-world Oakland establishment, person, or landmark. Invented words in the mouth of a **tracked** citizen. Invented Packet numbers, votes, money, or phases.
>
> The boundary that keeps this safe: a **novel or unnamed** speaker is legal texture and generates intake; a **named tracked** citizen stays Packet-bound. Otherwise "a longtime council staffer told me" becomes a laundering route for invented quotes attributed to real citizens. Rhea's retuned job is to check that a novel entity is not a disguised real citizen or a real-world import — not to ask whether it is already on a sheet.

**Where this actually bites — verified 2026-08-21, do not re-derive:**

- **The deterministic S344 walls are already on this axis.** They enforce a real-world denylist (BART, Frank Ogawa, blight imports, repair chrome) plus unsupplied *access*, not ledger membership. Task 6's "derive the named-entity allowlist from the Packet" was specified but did not land as an allowlist, which is fortunate — an allowlist would have been the wrong axis. Proven by direct run: a civic Article naming "Tina's Bar" with an unnamed speaker at the bar and a real Packet quote returns `fail=false, findings: (none)`. **The deterministic layer does not block the mint. Do not "fix" it toward Packet membership.**
- **Rhea is where the colour dies.** Per-seat `reviewProfile.canonBlockers` in `scripts/newsroom-wake-packages.json` still forbid a fabricated named business on the Jax seat, whose `authorizedTexture` simultaneously names BART — inverted on both halves. That is the Task 11 fix.
- **The mint machinery is built and live, not missing.** Unknown intake names route to `Generic_Citizens` (`phase01-config/godWorldEngine2.js:1262-1285`, engine.58/S320) and promote to full ledger rows at `EmergenceCount` ≥ threshold via `checkEmergencePromotions_` (`phase05-citizens/processAdvancementIntake.js:147-152`) — the lottery. New businesses append to `Business_Ledger` seeded economically alive so a mint can hire from birth (`scripts/ingestPublishedEntities.js`, S336). Collision is handled: businesses dedup by ID-else-name, ambiguous citizens log rather than write.
- **Two wiring breaks stop the loop, both outside the wake pipeline.** (1) `cron-saturday-run.js` `stepPublish` no longer emits `NAMES INDEX`, `BUSINESSES NAMED`, or `ARTICLE TABLE` — the exact sections `ingestPublishedEntities.js` parses. Verified: c103 carries 0 of each where e99 and e102 carry all three, and a dry run against c103 returns 0 mints and "no ARTICLE TABLE found". (2) `ingestPublishedEntities.js` is never called by the Saturday cron — line 837 prints a reminder to run it by hand. Fixing (1) means regenerating those sections in `stepPublish` from the `byStem` staged sidecars already in scope, which preserves the intake script's verified parse contract.

Sequencing: (1) and (2) are Saturday-run scope, orthogonal to the wake pipeline, and can land before the next Saturday 16:00 compile without disturbing Task 10. The Rhea retune waits for Task 10 to close. The observation still pays under this direction — it tests real-world imports, invented Packet quotes, and template shape, all of which the law above keeps.

#### Pre-fire review record (engine-sheet, 2026-08-21)

Tasks 1–9 reviewed at the console before the first live fire. Findings are recorded here so tomorrow's observation is scored against a stated baseline rather than re-derived.

**Fit — confirmed.** Acceptance criteria 1–6 each map to an implemented check, not a doc claim. `s344HumanSlots`, `livedExperiencePacket`, `livedExperiencePacketV2`, `newsroomInterviewContract`, `cronDeskStoryTemplate`, `livedArticleShape`, `articleContamination`, and `cron-desk-writer` all PASS.

**grok's retrospective verified, not accepted.** `s344ArticleGate.evaluate` run directly against the cited live artifact `output/cron-compare/business_c104_business-desk_packet-v2_deepseek-deepseek-chat.md` returns `fail=true` — `s344-slot=missing-packet-quote; s344-slot=missing-unanswered-question` — on an Article Rhea passed. That is the S344 thesis holding on live material.

**Scope — clean.** No crontab, PM2, publish/ingest, Sheets, or canon touched.

**Timing correction.** `34cace97`/`cb5c20c6`/`1ebed79f` are on origin/main and cron runs the working tree, so the first live fire is the **2026-08-21 06:15 angle wake**, not the 18:15 write. The whole chain runs new code all day.

**Containment verified.** Fanout is per-assignment try/catch (`scripts/cron-desk-run.js:2831`) with a Discord failure ping and a documented `--only` recovery. A gate failure does not throw: it skips Rhea, so `pass=false` routes the draft to `flagged/` rather than `staged/` (`:2486`). Since `staged/` is what the Saturday compile reads, broad gate firing surfaces as a thin Saturday edition, not a crashed pipeline.

**Three false-positive edges to score tomorrow's artifacts against:**

1. `chase too short` — hard-fails W1 under 40 characters.
2. `chaseReplacesAssignment` — fails unless the chase carries a ≥5-char assignment-or-hood token verbatim; a chase written in synonyms throws.
3. ~~`clubhouse` / `press box` / `locker room` mere-word fail~~ — closed: those rooms are persona SET (Tanya clubhouse dispatch, Anthony press-box/clubhouse transition, Hal press-box beat). Gate now fails invented speech sourced from the room, not the word.

**One contained regression, deliberately unfixed.** `storyDocOpen` lost its `try/catch` around `fs.writeFileSync`, so a disk-write failure now fails the wake instead of logging non-fatal. Left in place because changing this code inside the observation window would make tomorrow's results unattributable (S250 deploy-attribution). Fix after Task 10 closes.

**Quote span (landed during the observation window).** `missing-packet-quote` now accepts a Packet-backed sentence span and mid-quote attribution. Invented speakers, invented words, Tribune-as-actor, and empty W2 stay fail-loud. Landed because it is a one-function change and it is the 18:15 write that would have false-flagged Luis-class Articles. W1/W2 contracts and crontab were not touched.

No wake was hand-driven for this review; Task 10 remains the acceptance test.

**Matcher version at first live fire.** `adaa6237` (23:58) loosened
`missing-packet-quote` from an exact contiguous string to a Packet-backed span,
after `22a06b65` had parked that same loosening with "do not change the matcher
during the observation window." **The loosening was builder-directed** — the
park was grok's own caution, and the call to override it was made deliberately,
not worked around. The record should also be explicit that **no wake has fired
since the `34cace97`/`cb5c20c6` land, so the observation window had not opened
when the matcher changed.** The 18:15
write on 2026-08-20 ran pre-land; the first post-land wake is 06:15 on
2026-08-21. Attribution is therefore intact, and the change is the right one on
the merits — exact contiguous matching false-failed the Luis split-attribution
case, and shipping it into the first live day risked a broad false
`missing-packet-quote` sweep pushing every Article to `flagged/`. The baseline
above was re-verified against `adaa6237` and is unchanged: the cited business
c104 artifact still returns `missing-packet-quote; missing-unanswered-question`,
and `livedArticleShape`, `cronDeskStoryTemplate`, `s344HumanSlots` and
`articleContamination` all still pass. **From 06:15 forward the matcher is
frozen** — the parked further-loosening stays parked until Task 10 closes.

---

## Open questions

- [x] Positive fixture source if Dirt Carnival cannot be recovered — **C103 Luis Navarro** is the on-disk near-pass; Task 9 starts there. Dirt Carnival is optional.
- [ ] Whether the builder accepts a tightened Luis Article as the permanent positive fixture, or wants a separately written completion. Does not block Tasks 2–8.
- [x] After Task 10: loosen `missing-packet-quote` from exact contiguous string to Packet-backed span + mid-quote attribution. Landed before the 18:15 write (`packetQuoteLanded`). WHO/invented-words/Tribune-as-actor/empty-W2 stay fail-loud.
- [ ] Task 11: Rhea reviewProfiles — picture desks may mint in-world `BIZ`; civic desks report facts + office relationships, not bars. Jax profile still forbids fabricated named business and still names BART. Hand to Claude.

---

## Changelog

- 2026-08-20 (codex) — Initial active plan; Task 1 completed from C103 Jax and C104 Tanya artifacts. No runtime, scheduler, deployment, publication, or canon state changed.
- 2026-08-20 (grok) — Review cuts before Tasks 2–4: chase is reporter-register beat plan, not first-person-required; third-person seats stay legal; plan-in-English chase fails as JSON-shaped. Zero publishable W2 answers fail W2 and do not open W3. Scene cannot mint unsupplied room/access/dialogue/count (Tanya clubhouse). Luis Navarro C103 is the on-disk near-pass for Task 9; Dirt Carnival no longer gates it. W1 three-cited-facts machine check stays in the sidecar.
- 2026-08-20 (grok) — Task 1 built: frozen fixtures under `scripts/__fixtures__/newsroom/s344/` + `s344HumanSlots.js` detectors. `node scripts/s344HumanSlots.test.js` PASS — theory holds: the claimed Jax/Tanya/Luis failures are locally detectable without Rhea. No live wake wiring.
- 2026-08-20 (grok) — Tasks 2–4: W1 `chase` field + reporterChaseText; §2 writes chase only (JSON §2 throws); W2 questions ask what the citizen saw/felt; Tribune-as-actor quotes fail interview validation; zero publishable answers fail W2 and W3 does not last-chance. Tests: livedExperiencePacket, livedExperiencePacketV2, newsroomInterviewContract, cronDeskStoryTemplate PASS.
- 2026-08-20 (grok) — Tasks 5–8: four-part Article slots; BART/Ogawa + clubhouse + repair-chrome walls; assignment/INTAKE bind (Jax faith/transit); Packet-active W3 skips Rhea when those gates fail; writer strips repair-chrome prefix. `s344ArticleGate.evaluate` is the seam. W1 three-cited-facts sidecar still wired.
- 2026-08-20 (grok) — Task 9: synthetic NOT_CANON positive pair `scripts/__fixtures__/newsroom/s344/s344-positive-{article.md,packet.json}`. Luis C103 remains the near-pass (split Packet quote, INTAKE on the quote not the hub). Title-only first line is not the lede. No crontab, ingest, or Sheets.
- 2026-08-21 (engine-sheet) — Pre-fire review of Tasks 1–9: fit confirmed, 8 suites PASS, gate verified failing a Rhea-passed live Article, scope clean. First live fire is 06:15 not 18:15. Baseline + 3 false-positive edges recorded under Task 10.
- 2026-08-20 (grok) — Task 10 opened, not closed. Crontab read-only (M–F 06:15 angle / 13:15 report / 18:15 write unchanged; no install). Runtime land is `34cace97` + `cb5c20c6` (22:24–22:55 CDT). The 2026-08-20 18:15 write fanout ran before that land and is not the observation window. Retrospective gate on two of those Articles (Rhea PASS does not override): `output/cron-compare/staged/sports_c104_tanya-cruz_packet-v2_deepseek-deepseek-chat.staged.md` — s344 FAIL (JSON §2, empty W2, missing Packet quote, missing question, clubhouse); Rhea pass=true. `output/cron-compare/business_c104_business-desk_packet-v2_deepseek-deepseek-chat.md` — s344 FAIL (JSON §2, missing Packet quote, missing question); Rhea pass=true. Next natural write 2026-08-21 18:15 CDT supplies the two post-land Articles.
- 2026-08-21 (grok) — Parked after Task 10: exact contiguous Packet-quote match is too strict (Luis split-attribution false fail). Matcher unchanged for the observation window. WHO, invented words, Tribune-as-actor, empty W2 stay.
- 2026-08-21 (grok) — Landed `packetQuoteLanded` before the 18:15 write: Packet-backed sentence span + mid-quote attribution pass; invented quote still fails. W1/W2 and crontab untouched.
- 2026-08-21 (grok) — Sports SET is not a leak: drop mere-word clubhouse/press-box/locker fail. Tanya/Anthony/Hal bags place them in those rooms. Still fail invented speech sourced from the room. Crontab untouched.
- 2026-08-21 (grok) — Allotted hallucination lock: Packet is data, not the picture. In-world named spots (Tina's bar) mint via INTAKE BIZ. Wall is real Oakland, fake numbers, fake Packet quotes. Tanya files from the clubhouse; Jax opens in an in-world place not BART. Writer hygiene + Tanya slice/package updated. No crontab.
- 2026-08-21 (grok) — Task 11 filed for Claude: Rhea not yet fixed except Tanya blockers. Jax reviewProfile still forbids fabricated named business and still authorizes BART. Civic Rhea stays fact-desk; allotted civic texture is office relationships (who gets along), not invented bars or votes. IND not a bloc.
- 2026-08-21 (engine-sheet) — Reconciled the matcher-version contradiction between `22a06b65` (park) and `adaa6237` (land): no wake fired between the runtime land and the change, so the observation window had not opened. Baseline re-verified unchanged. Matcher frozen from 06:15.
- 2026-08-21 (engine-sheet) — Filed the governing gate-axis law over Task 11 (builder-direct): real-world = fail, novel in-world = intake, tracked citizens stay Packet-bound. Verified the deterministic walls already hold that axis; Rhea's per-seat profiles do not. Named the two Saturday-run wiring breaks that stop the mint loop.
- 2026-08-21 (engine-sheet) — Task 10 FIRST LIVE DAY observed. 5/6 on angle, report and write — the pipeline held, no broad sweep to flagged. One structural failure, and it is predicted edge #2 from the pre-fire record: **Hal Richmond failed W1 on `chase replaces the assignment`**, then report and write cascaded ("no angle artifact"). `chaseReplacesAssignment` demands a ≥5-char assignment-or-hood token verbatim, and Hal's historian register writes around proper nouns by design — the heuristic penalises voice, not accuracy. Loosen it (accept a hood/desk/subject synonym, or drop it to a warning) before it costs another wake. **P Slayer staged**, which is the un-inverted profile working. Flagged today: business-desk, angela-reyes, carmen-delaine, elliot-graye — triage those against the gate axis before assuming they are real failures.
