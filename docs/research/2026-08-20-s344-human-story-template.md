---
title: S344 Human Story Template Recovery — research
created: 2026-08-20
updated: 2026-08-20
type: reference
tags: [research, media, newsroom, canon, evaluation, active]
sources:
  - Mike-direct 2026-08-20 — restore the three human story slots; Packet is the sidecar; Rhea is the contradiction gate
  - docs/plans/2026-07-20-headless-newsroom-pipeline.md §Phase 2.5 (Mike-direct S344)
  - docs/media/wake_templates/STORY_TEMPLATE.md
  - docs/adr/0017-typed-lived-experience-packets.md
  - scripts/cron-desk-run.js
  - scripts/livedExperiencePacket.js
  - scripts/livedExperiencePacketV2.js
  - scripts/cron-desk-writer.js
  - scripts/livedArticleShape.js
  - scripts/articleContamination.js
  - output/cron-compare/civic_c103_freelance-firebrand_packet-v2_story.md
  - output/cron-compare/staged/civic_c103_freelance-firebrand_packet-v2_anthropic-claude-sonnet-5.staged.md
  - output/cron-compare/sports_c104_tanya-cruz_packet-v2_story.md
  - output/cron-compare/staged/sports_c104_tanya-cruz_packet-v2_deepseek-deepseek-chat.staged.md
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.54 pending-state home"
  - "[[index]] — registered here, same commit"
  - "[[../plans/2026-08-20-s344-human-story-template-pressure-test]] — ignited implementation and proving plan"
  - "[[../adr/0017-typed-lived-experience-packets]] — Packet boundary retained as the machine sidecar"
---

# S344 Human Story Template Recovery — research

**Source:** Mike-direct 2026-08-20, tested against the S344 plan contract, the active LEP/2 implementation, and actual C103–C104 story, Article, Packet, and Rhea artifacts.

**What this addresses:** The scheduled newsroom is producing mechanically complete artifacts without reliably producing journalism. The immediate question is whether the intended S344 division of labor still fits the typed Packet architecture, and what deterministic checks can protect Article shape and canon without asking Rhea to become the writer.

**What it does:** S344 assigns each component one job. Mags fixes the angle. The reporter completes three human-facing slots: a first-person chase, answers from interviewed citizens, and a fixed-shape Article. The Packet separately carries typed claims and provenance. Deterministic validators enforce artifact shape and Packet boundaries; Rhea independently checks contradiction.

**Extraction — what's usable:**

- **Mags-owned angle → §1 assignment.** The Article cannot choose a replacement subject. The assigned fact, subject, place, and source remain fixed across all three wakes.
- **Reporter-owned chase → §2 human prose.** The visible story document must contain the reporter's first-person reporting chase, not the validated plan object. `livedPacket.validateAngleOutput` remains the machine check and its result stays in the angle/Packet sidecar.
- **Citizen-owned answer → §3 interview.** The interview asks what the citizen saw, felt, or understood about the assigned fact. A response that turns the citizen into an assignment editor—“the Tribune should ask”—is not an answer and must fail the report wake.
- **Template-owned Article → §4 copy.** Every desk uses one sequence: assigned-fact lede → one scene → one Packet quote → unanswered question. Persona controls diction, emphasis, heat, and observation inside that shape; it does not invent a new shape.
- **Packet-backed names, free unnamed color → Article scene.** Named people, places, businesses, institutions, and events must resolve from the Packet. Unnamed sensory and street texture is allowed when it does not contradict the Packet.
- **Deterministic walls before Rhea → gate separation.** JSON in §2, Tribune-as-actor quotes, unsupplied named entities, real-world imports, repair chrome, missing required slots, and assignment/INTAKE mismatch are locally detectable format or provenance failures. Rhea remains the independent contradiction reviewer after these checks pass.
- **Scheduled wakes as observation stream → probation tuning.** The crons can continue producing non-canon staged/flagged samples while the validators are developed and compared. This requires no crontab, PM2, deployment, publication, or canon-ingest change.

## Verified inversion in the active path

1. `scripts/cron-desk-run.js` asks W1 for a typed plan when `PACKET_ACTIVE` is true, validates `r.text`, then assigns `angleRead.text = JSON.stringify(plan, null, 2)`. `storyDocOpen()` prints that field under §2. The visible reporter slot is therefore guaranteed to be a schema dump.
2. The W2 resident question builders explicitly ask what “the Tribune should ask.” Current C103–C104 quotes reproduce that assignment language verbatim, so §3 contains newsroom instructions instead of testimony.
3. W3 always invokes `cron-desk-writer.js` with `--packet-only`. The current shape check rejects a handful of summary phrases, but does not require the four-part Article sequence or assignment/INTAKE identity.
4. `articleContamination.js` has a short real-Oakland denylist. It does not catch the C103 Jax imports “Fruitvale BART” and “1 Frank Ogawa Plaza.”
5. Rhea passed the C103 Jax Article despite an unverified real place, no Packet quote, and an INTAKE claim about a faith coverage gap attached to a transit-stall Article. The verdict is internally consistent with Rhea's current contradiction job; it demonstrates why Article-format and assignment-coherence gates cannot be delegated to Rhea.

## Initial pressure test

| Control | §2 chase | §3 answer | §4 fixed shape | Entity wall | Assignment match | Rhea | Result |
|---|---|---|---|---|---|---|---|
| C103 Jax transit-stall Article | FAIL — JSON plan | FAIL — both citizens tell the Tribune what to ask | FAIL — invented platform scene; no Packet quote | FAIL — Fruitvale BART and 1 Frank Ogawa Plaza absent from Packet | FAIL — Article is transit; INTAKE is faith coverage gap | PASS | Required negative fixture; proves the missing gates |
| C104 Tanya late-season Article | FAIL — JSON plan | FAIL — no interview answer landed | PARTIAL — assigned-fact lede and unanswered close, but no scene or quote | PASS on named entities | PASS | PASS | Useful boundary control; disciplined but not yet the complete S344 Article |

The documented C102 Jax “Dirt Carnival” remains the accepted voice exemplar in the headless-newsroom plan and the Jax stink-audit research: one verified inconsistency, street-level scene, accountable actor, unanswered question. Its raw Article is not present in the current repository or output tree, so it cannot yet serve as a byte-for-byte automated fixture. The plan must either recover the exact artifact through an approved source path or build the first passing local fixture from a builder-approved Article; the documentation claim alone is not test evidence.

## Response-contract seam found during pressure testing

The current W1 Packet demands `json-only`, and both LEP/1 and LEP/2 validate that same model response. A literal “write raw `r.text` into §2” would still print JSON. The build therefore needs a dual representation in one validated response: a required first-person `chase` string for the story document plus the typed plan fields for the sidecar. The plan treats the human field as required, rejects JSON-shaped chase text, and keeps the structured fields machine-only.

**Not applicable / hazard:**

- Replacing the Packet with prose would discard typed facts and provenance and reopen the canon-contamination class ADR-0017 closed.
- Expanding Rhea's prompt until it rewrites every Article would merge author and reviewer roles and make failures model-dependent.
- A universal named-entity ban would also kill the intended product. Packet-backed names are allowed; unnamed street color remains the reporter's job.
- A longer freeform writer prompt does not establish uniformity. The fixed template and deterministic validator must own shape.
- The C104 Tanya draft is not a full positive fixture merely because Rhea staged it. It proves only the useful subset named in the matrix.
- Running new paid model calls is not necessary for the first pressure-test tranche. Existing artifacts and synthetic local fixtures can establish the validator behavior before a later approved live proof.

**Verdict:** `adopt`

Restore S344's human-facing template on top of, not instead of, LEP/2. Keep scheduled wakes running as an observation stream; install deterministic artifact/provenance walls before asking Rhea the narrower contradiction question.

**Ignited plans:** [[../plans/2026-08-20-s344-human-story-template-pressure-test]]

---

## Applications (living)

- 2026-08-20 — Initial C103 Jax and C104 Tanya pressure-test matrix; ignited the pipeline.54 recovery plan.

---

## Changelog

- 2026-08-20 (codex) — Initial extraction and two-Article pressure test (Mike-direct).
