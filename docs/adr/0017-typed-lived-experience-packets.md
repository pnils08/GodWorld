---
title: "ADR-0017: Typed lived-experience Packets are the standard dynamic LLM boundary"
created: 2026-08-09
updated: 2026-08-13
type: reference
tags: [architecture, agents, citizens, civic, sports, business, media, canon, decision, active]
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

**Status:** Accepted; the Packet boundary remains active, while JAX-LEP2-1 is inactive after editorial rejection
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

   `CITIZEN_INTERVIEW/1` is the Wake 2 press contract. The citizen authors the
   quote during the interview; the backend may validate, reject, or hash it but
   may not paraphrase, assemble, or supply words. The former LEP/2 lattice was
   not an interview and is rejected as quote provenance. Same-neighborhood or
   assignment membership is not lived exposure: `lived-context` requires an
   addressable story-linked evidence row. Without one, Wake 2 permits only a
   short first-person `direct-reaction` to supplied facts or abstention. In that
   mode the citizen retains ledger identity and temperament, but unrelated life
   history is withheld so the model cannot project it onto the assigned story.

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
   anonymous color require semantic classification. Before claim IDs are derived,
   exact type/text/source duplicates collapse to one known claim. When Wake 1
   supplies no candidate with a POPID, its target schema is explicitly empty and
   any model-added target rows are narrowed to `[]`; all other malformed output
   still fails loud.

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
- Wake 2 asks the citizen for one first-person response from the simulated life
  context assembled by `citizenVoice.js`;
- the backend preserves that authored response exactly, binds its quote ID to a
  hash of the text, and never composes or completes citizen speech;
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

## First live packages

`scripts/newsroom-wake-packages.json` is the live registry. The first package was
`freelance-firebrand` (`JAX-LEP2-1`):

- Wake 1 and Wake 2 use `meta-llama/llama-3.3-70b-instruct`;
- Wake 3 uses `anthropic/claude-sonnet-5`;
- the writer received LEP/2 with zero live research tools;
- the package initially permitted generic city texture and role-only anonymous
  voices, an authority later proven unsafe for this constructed world;
- persona-aware Rhea checked the package manifest but did not independently
  establish that backend-composed lattice text was citizen-authored speech.

That activation decision is superseded. Builder review of the C103 Article found
unsupported real-world city assumptions, invented public conditions, and
backend-composed statements presented as citizen quotations. Rhea passed the
same manifest that supplied those statements and recorded `packetChecked: false`,
so its pass was circular provenance evidence rather than product proof.
`JAX-LEP2-1` is inactive and has no authorized texture. Reactivation requires a
sim-only typed slice, verbatim citizen-authored quote provenance, an independent
Packet-aware review, and fresh builder acceptance.

The second package is `carmen-delaine` (`CARMEN-LEP2-1`):

- all three wakes use `deepseek/deepseek-chat`, preserving Carmen's established
  precise-accretion route;
- LEP/2 and zero live writer tools remain the evidence boundary;
- Carmen may connect Packet-backed votes, Initiatives, money, and clocks to a
  Packet-backed named resident consequence, with unnamed street color only;
- named people and places, nine-seat vote math, official acts or absence,
  budgets, timelines, and implementation state must remain Packet-backed;
- when both civic packages are selected, they occupy separate same-desk seats.
  Neither may replace the other, and a civic shortfall never consumes another
  desk's slot.

The third package and first sports seat is `p-slayer` (`PSLAYER-LEP2-1`):

- all three wakes use `meta-llama/llama-3.3-70b-instruct`, preserving the
  established confrontation-first heat route;
- the sports fan-pulse slice enters LEP/2 as player candidates, immutable feed
  anchor facts, and a bounded creative brief carrying charge, bag modes,
  friction, central feeling, prior-take pointer, and scene rule;
- P Slayer may use first-person I/we rhetoric, unnamed fan-setting texture,
  metaphor, and rhetorical counterargument without turning them into measured
  collective sentiment, sourced quotes, or new events;
- roster moves, results, records, stats, numbers, contracts, injuries, named
  entities, player/coach/front-office acts, and attributed statements remain
  Packet-backed load-bearing claims;
- a selected sports package occupies only a sports seat and cannot evict a civic
  package or consume another desk's assignment.

The fourth package and first business seat is `business-desk`
(`JORDAN-LEP2-1`), the established single-reporter Jordan Velez identity:

- all three wakes use `deepseek/deepseek-chat`, preserving Jordan's established
  precise, numbers-serve-the-story route;
- the economic/storefront slice enters LEP/2 as candidate citizens, sourced
  anchor facts, named-business bounds, and a creative brief carrying the
  translated economic frame, hook, forbidden claims, and scene rule;
- Jordan may use generic storefront texture and skeptical economic analysis, but
  texture cannot create a measured trend, hiring action, closure, interview,
  quote, contract, payment, or named entity;
- money, wages, rent, employee/job counts, dates, leases, contracts,
  disbursements, observable economic actions, and current-state claims remain
  Packet-backed load-bearing facts; raw engine labels and decimals stay out of
  public-facing prose;
- the selected package occupies only the business seat and cannot consume a
  civic, sports, culture, or other desk assignment.

The fifth package and first evening/culture seat is `kai-marston`
(`KAI-LEP2-1`), the established Arts & Entertainment identity:

- all three wakes use `meta-llama/llama-3.3-70b-instruct` as the initial arts
  voice route; the cheaper-model comparison remains a graduation measurement,
  not a prompt-only assumption;
- Kai consumes the shared deterministic evening substrate, but receives a
  seat-specific arts pulse and `KAI_ARTS_BAG` overlay rather than a shared
  culture-desk voice;
- named TV, movies, city events, venues, artists, famous sightings, and
  streaming signals remain source-addressed Packet inputs; unnamed sensory room
  color is allowed only under the review profile conditions;
- a selected culture package occupies only the culture seat and cannot evict a
  civic, sports, or business package. Mason, Maria, Sharon, Graye, and future
  Social Trends seats require their own packages even when they share this
  substrate.

The daily rota is capacity-bounded independently of package count. Active
`requiredDaily` entries form the eligible pool; the staged-count/LRU selector
chooses at most the declared two civic, two sports, one culture, and one business
seat. The package-only gate may normalize or reject those six selections, but it
must never insert another package. Activation therefore expands coverage and
rotation, not daily model calls or desk capacity. The stage runner reapplies the
same cap to saved fanout files, preferring source-assigned seats, so an artifact
written under older expansion semantics cannot bypass the live limit.

Wake artifacts are Cycle-scoped and may reuse the same filenames across several
days. Existence is therefore not valid handoff proof. Before Wake 3, the report
Packet must identify the current Cycle, package persona, reporter POPID, angle
path, and assigned story, and its `ranAt` must be later than the current angle's
`ranAt`. A failed or missing Wake 2 cannot silently revive a prior-day Packet.

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
- 2026-08-10 (codex) — Made required-package pinning multi-seat and cross-desk safe, then added Carmen Delaine as CARMEN-LEP2-1 with her existing DeepSeek civic-ledger route and load-bearing review profile; JAX-LEP2-1 is unchanged.
- 2026-08-10 (codex) — Added P Slayer as PSLAYER-LEP2-1 with all-Llama routing, a load-bearing fan-heat profile, and a typed fan-pulse handoff through Wake 3; Jax and Carmen are unchanged.
- 2026-08-10 (codex) — Added Jordan Velez as JORDAN-LEP2-1 with DeepSeek across all three wakes, the existing single-reporter business-desk identity, a load-bearing economics/labor profile, and a typed economic/storefront handoff through Wake 3; Jax, Carmen, and P Slayer are unchanged.
- 2026-08-10 (codex) — Hardened the C103 angle boundary after the first unattended cohort wake: exact sourced claims now deduplicate before LEP/2 IDs, and candidate-free W1 Packets explicitly produce no targets. No recovery wake or external write was run.
- 2026-08-10 (codex) — Added KAI-LEP2-1 as the first evening/culture package. Kai uses a separate Llama route and arts review profile while sharing the deterministic evening substrate; the LEP/2 handoff now preserves seat-specific pulse, arts authority, named media/events/places/sightings, and source pointers.
- 2026-08-10 (codex) — Added RACHEL-LEP2-1 for Sgt. Rachel Torres with a disk-first public-safety slice, typed classification/response creative brief, DeepSeek route, and safety-specific load-bearing review profile. Full proof remains pending; protected persona-document normalization is separate.
- 2026-08-12 (codex) — Luis C103 showed that one state fact plus bounded reactions cannot support a full investigation without invented reporting history. LEP/2 now types absent reporting evidence as `NOT_SUPPLIED`, removes excluded leads from Luis's writer Packet, adapts evidence-thin work to a 180–280 word records brief, carries ledger-backed subject profiles, and blocks engine classifier/row leakage.
- 2026-08-12 (codex) — A corrected Sonnet records-brief attempt still reversed the phase relationship, converted missing evidence into absence, split an approved quote, and inferred collective resident sentiment. `RECORDS_BRIEF` is now code-rendered with zero writer calls; the configured Sonnet route remains available only for `FULL_INVESTIGATION` Packets with supplied reporting events.
- 2026-08-13 (codex) — Corrected package expansion semantics after the active cohort grew to nineteen: active packages are the LRU candidate pool, while the daily rota remains bounded at 2 civic / 2 sports / 1 culture / 1 business and the package gate can no longer insert seats.
- 2026-08-13 (codex) — Closed the Cycle-scoped stale-packet seam: Wake 3 now requires a newer matching Wake 2 Packet for the current angle, persona, reporter POPID, and exact assigned story before any writer or Rhea work.
- 2026-08-13 (codex) — Superseded the Jax activation verdict after builder rejection of the C103 Article. JAX-LEP2-1 is inactive; its generic city texture authority is removed, backend-composed lattice text is barred from quotation, and reactivation requires sim-only evidence plus verbatim citizen-authored quote provenance.
- 2026-08-13 (codex) — Reclassified every LEP/2 lattice line as non-speech after the builder's cross-Article audit. Wake 2 now uses `CITIZEN_INTERVIEW/1`: the citizen sees their simulated life context, authors the response, and the backend preserves or rejects it without composing prose. Existing lattice-bearing proofs are invalid.
- 2026-08-13 (codex) — The first direct-speech Luis spot test proved citizen authorship but not lived grounding: both respondents invented civic history from same-neighborhood assignment. Tightened `CITIZEN_INTERVIEW/1` so lived context requires addressable story-linked evidence; otherwise only a bounded first-person direct reaction or abstention can pass.
- 2026-08-13 (codex) — Final Luis proof landed two distinct fact-bounded direct reactions, preserved each response exactly through the Article, passed Packet-aware Rhea, and cleared the deterministic contamination scan. The contract labels these as direct reaction; lived-exposure testimony still requires addressable story-linked evidence.
- 2026-08-13 (codex) — Made world-contamination blocking independent of Rhea across weekday routing, reconciliation, and Saturday intake. Five C103 lattice-quote artifacts moved from staged to flagged; their historical Rhea passes remain recorded but cannot cross the canon door.
