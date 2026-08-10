---
title: "ADR-0017: Typed lived-experience Packets are the standard dynamic LLM boundary"
created: 2026-08-09
updated: 2026-08-10
type: reference
tags: [architecture, agents, citizens, civic, media, canon, decision, active]
sources:
  - "Mike direction 2026-08-09 — facts enter canon; prose is secondary; dynamic state should be compact and structured for LLM use"
  - "Mike direction 2026-08-09 — a Cycle is not complete without its published Edition feeding RAG, NotebookLM, journalist memory, and citizen memory"
  - "C102 Jax three-wake trace — Wake 2 discarded Wake 1's plan and four generic prompts manufactured unsupported named people, events, dates, and counts"
  - "DeepSeek blind review 2026-08-09 — directionally confirms atomic ID-keyed facts, a pre-prose entity/quote manifest, and deterministic post-generation checks; illustrative example data is NOT_CANON"
  - "[[../research/2026-08-07-cron-lifecycle-review]] — standing cross-domain schedule, write, and canon-boundary map"
  - "[[0006-parser-validator-format-contracts]] — canonical exemplar or fail-loud validation"
  - "[[0007-cross-layer-canon-authority-precedence]] — Sheets and published Editions own different canon field classes"
  - "[[0012-autonomous-deep-dispatch-write-edition]] — raw evidence and reporter agency must survive the handoff"
  - "[[0013-citizen-signal-emergent-story-source]] — subjective citizen signal is a story seed, not automatic canon"
  - "[[0016-data-ledgers-are-the-truth-source]] — ledgers supply truth; code derives and structures it"
pointers:
  - "[[../plans/2026-08-09-three-wake-lived-packet-pilot]] — pipeline.54 proving plan"
  - "[[../media/wake_templates/STORY_TEMPLATE]] — human inspection view of the three wakes"
  - "[[../media/examples/lived_experience_packet_v1.json]] — canonical machine exemplar"
  - "[[../media/examples/lived_experience_packet_v2.json]] — claim-manifest refinement exemplar"
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.54"
  - "[[../index]] — registered same change"
---

# ADR-0017: Typed lived-experience Packets are the standard dynamic LLM boundary

**Status:** Accepted; Jax is the first live package-gated cohort
**Date:** 2026-08-09
**Deciders:** Mike (direction), Codex (C102 trace and pilot implementation); research-build and engine-sheet remain reviewers/landers for their surfaces

## Context

GodWorld already has the right life cycle but not one interface for the LLMs
inside it. Citizen wakes, civic datawakes, newsroom wakes, and Saturday canon
closure each assemble dynamic state differently. The useful paths share a
pattern: a small deterministic data slice, an explicit task, and structured
output. The unreliable paths pass prose summaries or broad prompts and ask the
model to decide what it knows.

The C102 Jax trace made the failure mechanical. Wake 1 produced a reporter plan.
Wake 2 loaded the artifact but kept only the assignment label. It then sent the
same “what have you seen with your own eyes?” prompt to four citizens. Those
answers invented named residents, assaults, police-response times, cameras,
streetlights, press conferences, and grants. Wake 3 used the supplied quotes as
instructed. The break was therefore the Wake 1 → Wake 2 evidence boundary, not a
model refusing to use notes.

This is also an efficiency defect. Repeated prose forces each model to rediscover
identity, task, signal, exposure, and epistemic limits from tokens that the
backend can arrange once. Facts are canon inputs; prose is a rendering.

## Decision

1. **Every dynamic LLM handoff uses one typed lived-experience Packet.** Its
   semantic order is fixed:

   ```text
   actor → task → signal → exposure → known claims → limits → output contract
   ```

   JSON is the canonical machine form. Markdown is an audit/rendering surface,
   never the contract the parser must rediscover.

2. **Claims carry a type and a source.** The controlled claim types are:
   `FACT`, `OBSERVATION`, `INTERPRETATION`, `INTENTION`, and `LEAD`.
   `FACT` and `OBSERVATION` require an addressable source or supplied exposure.
   `INTERPRETATION` and `INTENTION` may be voiced subjectively. `LEAD` is useful
   controlled imagination or suspicion but is not publishable as fact until a
   later deterministic or editorial verification binds it to a source.

3. **The backend decides knowledge boundaries; the LLM decides voice and
   meaning.** Code selects the actor, task, signal, exposure, allowed entities,
   source claims, and output grammar. The agent remains free to choose emphasis,
   interpretation, question order, and prose. This preserves ADR-0012 reporter
   agency: the Packet organizes evidence; it does not prescribe WHAT-to-say.

4. **Private subjectivity and press evidence are different scopes.** A citizen's
   private reflection may shape emotion and interpretation. It does not prove a
   new public event. A press/interview Packet either emits a bounded publishable
   quote, emits an unverified `LEAD`, or abstains. An attributed quote does not
   silently convert the event alleged inside it into a verified fact.

5. **Load-bearing invention is not “color”; bounded lived texture is.** A wake
   package declares the reporter's creative authority. New named people,
   businesses, institutions, relationships, official acts, votes, criminal
   claims, dates, counts, and other canon-bearing assertions require Packet
   support. A package may authorize generic rooms, named streets, reporter
   presence, and role-only anonymous voices as narrative texture when they carry
   no canon claim. Texture moves lived experience; it does not prove the record.

6. **The contract ships with canonical exemplars and fail-loud validators.**
   `LEP/1` is preserved at `docs/media/examples/lived_experience_packet_v1.json`
   with `scripts/livedExperiencePacket.js`. `LEP/2` is preserved at
   `docs/media/examples/lived_experience_packet_v2.json` with
   `scripts/livedExperiencePacketV2.js`. Missing stages, claims without sources,
   unknown IDs, and malformed wake output fail rather than falling back to
   prose. An exhaustive evaluation manifest may also fail on an unapproved
   number or quotation. A live load-bearing profile routes those lexical findings
   to persona-aware Rhea because ordinals, sign phrasing, punctuation, and
   anonymous color require semantic classification.

7. **The Edition closes the life cycle.** A Cycle's generated state becomes
   shared lived experience only when its Edition is published and post-publish
   has fed the approved RAG, NotebookLM, journalist-memory, and citizen-memory
   surfaces. The next Cycle must not be treated as ready while the previous
   Cycle lacks that closure. Draft, sample, staged, or private reflection output
   remains non-canon.

8. **Adoption is package-gated.** `pipeline.54` first proved the old and typed
   three-wake paths side by side on the same persona, Cycle, assignment, sources,
   and models. Live promotion is then per journalist. Scheduled fanout runs only
   active packages; an unupgraded journalist is skipped with no generic fallback.
   Each package declares its Packet version, models by wake, review profile,
   creative authority, and canon blockers.

## Consequences

**Positive.** Less repeated context; visible provenance; candidate-specific
questions; useful abstention; load-bearing facts cannot hide inside “color”;
legitimate persona texture survives; the same contract can serve citizen, civic,
and media wakes; handoffs become mechanical and testable across models.

**Costs and risks.** Packet builders become load-bearing and need tests. An
over-specified Packet or generic lexical gate can flatten reporter judgment.
Package-only rollout temporarily reduces Article volume. Claim typing is only
useful if downstream consumers enforce it. These are mitigated by the fixed
load-bearing boundary, persona authority profile, canonical exemplar, and
independent Rhea gate.

## LEP/2 refinement after the first A/B

The first C102 treatment proved that a label alone cannot validate its contents:
Wake 2 placed produce trading and safety tips inside `INTERPRETATION`, then Wake
3 expanded them into reporter observation. `LEP/2` therefore keeps the base
sequence but changes the publication boundary:

- each supplied fact receives a local immutable claim ID;
- Wake 2 selects fact IDs and code-owned stance/question/intention IDs instead
  of authoring quote prose;
- code renders the quote and gives it a quote ID;
- Wake 3 receives an Article claim manifest of approved fact, quote, and subject
  IDs plus non-publishable leads and forbidden claim classes;
- evaluation manifests may remain exhaustive; a live package can declare a
  load-bearing policy plus explicit authorized texture and conditions;
- the local post-generation audit rejects lexical expansion under an exhaustive
  policy and forwards the same observations to Rhea under a load-bearing policy.

This does not make lexical checks a semantic canon oracle. Unsupported history,
causality, collective sentiment, and absence claims still require a stronger
sentence/claim enforcement layer and the independent editorial gate. Model
quality remains a prose and compliance variable, never the canon authority.

## First live package: Jax Caldera

`scripts/newsroom-wake-packages.json` is the live registry. The first package is
`freelance-firebrand` (`JAX-LEP2-1`):

- Wake 1 and Wake 2 use `meta-llama/llama-3.3-70b-instruct`;
- Wake 3 uses `anthropic/claude-sonnet-5`;
- the writer receives LEP/2 with zero live research tools;
- Jax may create generic street/bar/laundromat/BART/corner texture and role-only
  anonymous voices under explicit conditions;
- persona-aware Rhea remains strict on false named entities, official action or
  inaction, votes, criminal claims, record contradictions, and load-bearing
  figures;
- Rhea judges sourcing/canon integrity. Whether the Article moves the sim remains
  an editorial/capability judgment, consistent with her protected reviewer lane.

The C102 LEP/2 Article is therefore a product pass, not a contaminated failure.
Its `7th Street`, bar, and anonymous bartender are signature Jax texture. The
pre-Rhea lexical rejection was the failed component. Remaining tuning issues are
duplicate lattice language, exact framing of council responsibility, and ending
the substantive copy on Jax's unanswered question.

## Rejected alternatives

- **Prompt tuning only.** Rejected: the C102 defect was discarded structure and
  an absent evidence boundary, not one weak sentence.
- **A stronger model.** Rejected: stronger writers used the supplied unsupported
  quotes correctly and even recognized that they were unsupported.
- **One prose lifecycle document as the runtime payload.** Rejected: useful for
  operators, expensive and ambiguous for machines.
- **Separate citizen, civic, and media Packet doctrines.** Rejected: that is the
  fragmentation this decision resolves. Domain builders may extend `exposure`,
  but they do not fork the base sequence or claim vocabulary.
- **Remove subjective invention.** Rejected: lived interpretation is the point.
  The decision controls where invention lands (`INTERPRETATION` or `LEAD`) rather
  than deleting voice.

## Changelog

- 2026-08-09 (codex) — Initial decision and C102 three-wake proving contract.
- 2026-08-09 (codex) — Added the LEP/2 claim-manifest refinement from the first A/B and DeepSeek blind review: finite Wake 2 lattice, code-rendered quote IDs, and fail-closed number/direct-quote audit. No API or live run performed.
- 2026-08-09 (codex) — LEP/2 C102 proof: Wake 2 produced three bounded quotes plus one institutional abstention; Wake 3 invented a bar/bartender scene and altered a signed metric, then failed closed before scoring. Manifest containment works; semantic prose control remains open.
- 2026-08-10 (codex) — Corrected the C102 verdict after persona audit: the Article passed and the generic lexical cage failed. Added the JAX-LEP2-1 live package, per-wake Llama/Llama/Sonnet routing, package-only fanout, load-bearing manifest policy, and persona-aware Rhea review.
