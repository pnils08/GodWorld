---
title: Three-Wake Typed Lived-Experience Packet Pilot
created: 2026-08-09
updated: 2026-08-14
type: plan
tags: [media, citizens, civic, sports, business, agents, evaluation, active]
sources:
  - "[[../adr/0017-typed-lived-experience-packets]] — governing decision"
  - "[[../research/2026-08-07-cron-lifecycle-review]] — standing operations map"
  - "[[2026-07-20-headless-newsroom-pipeline]] — current three-wake owner"
  - "[[2026-07-11-citizen-voice-quote-supply]] — Wake 2 quote-supply owner"
  - "[[2026-07-28-civic-cron-city-hall]] — structured civic datawake precedent"
  - "C102 Jax baseline artifacts under output/cron-compare/civic_c102_freelance-firebrand_*"
  - "DeepSeek_Cron_feedback.txt (Drive file 1uNFe17VQ9ix7W7ORVQ29pDTZStzHTh58) — blind structural review; example facts remain NOT_CANON"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.54"
  - "[[../media/examples/lived_experience_packet_v1.json]] — canonical exemplar"
  - "[[../media/examples/lived_experience_packet_v2.json]] — claim-manifest refinement exemplar"
  - "[[../media/wake_templates/STORY_TEMPLATE]] — audit view"
  - "[[../index]] — registered same change"
---

# Three-Wake Typed Lived-Experience Packet Pilot

**Goal:** Prove that one compact, source-addressed Packet across angle → report → write materially reduces unsupported hard claims while preserving Jax's usefulness and voice.

**Architecture:** Explicit `--packet-contract=v1|v2` remains an isolated,
samples-only evaluation namespace and requires `--no-gate`. Live scheduled
adoption is separate and package-gated through
`scripts/newsroom-wake-packages.json`. Nineteen active packages automatically use
LEP/2, zero live writer tools, per-wake model routing, and load-bearing
manifests interpreted by persona-aware Rhea: Jax, Carmen, Luis, Trevor,
P Slayer, Anthony, Hal, Tanya, Simon, Maria, Graye, Mason, Jordan, Kai, Rachel, Lila, Angela,
and Noah. Their typed accountability, civic,
investigation, systems, fan-pulse, sports-analytics, sports-history, sideline, long-view, economic/storefront, arts, public-safety, and
health-service, education-stability, and weather-ground slices add domain anchors and bounded
creative briefs to that same contract.
Luis's `CIVIC-DOMAIN-SLICE-4` additionally selects between a zero-model local
`RECORDS_BRIEF` when no reporting events are supplied and the configured Sonnet
`FULL_INVESTIGATION` path when a typed reporting trail exists.
Evidence-thin Jax, Carmen, Jordan, Kai, Rachel, Lila, Angela, Noah, P Slayer, and Trevor
Packets use a zero-model local `SOURCE_BRIEF`: W1/W2 may plan and gather bounded
statements, but W3 prints only filtered approved facts, exact quote blocks, and
one open question. Their configured writer model remains recorded for a future
reporting-rich branch; it is not spent on the thin branch.
Scheduled journalists without an active package are skipped; the legacy generic
prompt is not a fallback.

**Terminal:** research-build / engine-sheet review; implementation and local proof by codex

**Acceptance criteria:**

1. The old and treatment runs use Cycle 102, Jax Caldera, the same assigned civic signal, the same four candidate POPIDs, DeepSeek for citizen voice, and Llama 3.3 70B for writing.
2. Treatment artifacts never overwrite baseline artifacts and never stage, publish, ingest, record PRESS state, write reporter memory, or expose live writer tools.
3. Every treatment Packet passes `scripts/livedExperiencePacket.js`; malformed Wake 1 or Wake 2 JSON fails loud.
4. Comparison records input/output tokens, approximate cost, tool calls, unsupported named entities/events/dates/counts, quote provenance, INTAKE parsing, usefulness, and an independent Rhea verdict.
5. Promotion requires a clear reduction in unsupported hard claims with no material loss of the Article's question, friction, and citizen relevance.

## Fixed A/B controls

| Control | Baseline | Treatment |
|---|---|---|
| Cycle / reporter / desk | C102 / Jax Caldera / civic | same |
| Assignment | Chinatown civic-gap stink slice | same |
| Wake 1–2 model | DeepSeek | same |
| Wake 3 model | Llama 3.3 70B | same |
| Candidate pool | four affected/same-hood citizens | same |
| Dynamic handoff | prose + generic questions | `LEP/1` JSON + candidate exposure |
| Writer tools | historical baseline trace retained | zero live tools |
| World writes | none (`--no-gate`) | none; treatment additionally forbids record/memory |

The existing C102 baseline is preserved at:

- `output/cron-compare/civic_c102_freelance-firebrand_angle.json`
- `output/cron-compare/civic_c102_freelance-firebrand_asks.json`
- `output/cron-compare/civic_c102_freelance-firebrand_packet.json`
- `output/cron-compare/samples/civic_c102_freelance-firebrand_meta-llama-llama-3-3-70b-instruct.sample-0207.md`

The treatment stem is
`output/cron-compare/civic_c102_freelance-firebrand_packet-v1_*`.
The final scored treatment Article is
`output/cron-compare/samples/civic_c102_freelance-firebrand_packet-v1_meta-llama-llama-3-3-70b-instruct.sample-0403.md`.

## Tasks

### Task 1: Contract, exemplar, and validator

- **Files:**
  - `docs/adr/0017-typed-lived-experience-packets.md` — create
  - `docs/media/examples/lived_experience_packet_v1.json` — create
  - `scripts/livedExperiencePacket.js` — create
  - `scripts/livedExperiencePacket.test.js` — create
- **Steps:** Define the fixed sequence and claim vocabulary; validate every
  source claim and each wake's output shape; use visibly non-canon fixtures.
- **Verify:** `node scripts/livedExperiencePacket.test.js`
- **Status:** [x] built and locally validated 2026-08-09 (codex)

### Task 2: Samples-only treatment namespace

- **Files:**
  - `scripts/cron-desk-run.js` — modify
  - `scripts/cron-desk-writer.js` — modify
- **Steps:** Add `--packet-contract=v1`; require `--no-gate`; use a distinct
  `packet-v1` artifact tag; disable reporter-wall and memory tools; expose zero
  live writer tools.
- **Verify:** baseline filename helpers remain unchanged; treatment filenames
  include `packet-v1`; `node --check` passes.
- **Status:** [x] built and locally validated 2026-08-09 (codex)

### Task 3: Reformat Wake 1

- **Files:** `scripts/cron-desk-run.js` — modify
- **Steps:** Assemble actor → task → signal → exposure → facts → limits → output;
  require a structured reporter plan whose target POPIDs come from the Packet.
- **Verify:** treatment `angle.json` contains `packetContract`, `inputPacket`, and
  a validator-passing `angleRead.plan`.
- **Status:** [x] built and API-proven in Task 6 (codex)

### Task 4: Reformat Wake 2

- **Files:**
  - `scripts/cron-desk-run.js` — modify
  - `scripts/citizenVoice.js` — modify
- **Steps:** Consume Wake 1's actual plan; build a different exposure/question
  Packet for each candidate; lower evidence-mode temperature; require
  observation / interpretation / intention / unverifiedLead / abstain JSON;
  forbid record mode.
- **Verify:** four `asks.json` entries have different candidate-bound Packets;
  `packet.json` preserves all interviews but supplies Wake 3 only bounded quotes.
- **Status:** [x] built and API-proven in Task 6 (codex)

### Task 5: Reformat Wake 3

- **Files:**
  - `scripts/cron-desk-run.js` — modify
  - `scripts/cron-desk-writer.js` — modify
- **Steps:** Inject one compact W3 JSON Packet; facts may be asserted, bounded
  quotes attributed, interpretations framed, and leads excluded; require the
  existing INTAKE and self-score tail; compose with zero live tools.
- **Verify:** writer meta reports `packetOnly: true`; tool trace is empty; INTAKE
  parses; output routes only to `samples/`.
- **Status:** [x] built and API-proven in Task 6 (codex)

### Task 6: Run the three treatment wakes

- **Commands:**

  ```bash
  node scripts/cron-desk-run.js --stage=angle --desk civic --persona freelance-firebrand --cycle 102 --packet-contract=v1 --no-gate
  node scripts/cron-desk-run.js --stage=report --desk civic --persona freelance-firebrand --cycle 102 --packet-contract=v1 --no-gate
  node scripts/cron-desk-run.js --stage=write --desk civic --persona freelance-firebrand --cycle 102 --packet-contract=v1 --no-gate
  ```

- **Verify:** all three finish; no external write log occurs; separate treatment
  artifacts exist; all mechanical checks pass.
- **Status:** [x] complete 2026-08-09 (codex) — W1 1/1; final W2 retained 2/4 bounded quotes (Marcus institutional path abstained, Hal malformed output dropped); W3 composed with zero tools and routed only to `samples/`.

### Task 7: Score old versus treatment

- **Files:** `output/cron-compare/` artifacts — read; plan status log — update
- **Steps:** Run deterministic name/INTAKE/source checks, compare token/cost/tool
  metadata, manually classify unsupported hard claims, and run the independent
  API Rhea gate against both samples without routing either to staging.
- **Verify:** one comparison table names the winner per criterion and the next
  single tuning variable.
- **Status:** [~] local/deterministic + manual comparison complete 2026-08-09 (codex). Independent OpenRouter Rhea rerun was not performed: the execution security reviewer rejected sending the nonpublic Article+Packet for that separate evaluation. No workaround was attempted.

### Task 8: Promotion decision

- **Steps:** If treatment clears acceptance, specify the smallest production
  integration cohort. If it does not, retain the side path and change one
  variable at a time. Civic and citizen cron adoption are later applications,
  not part of this pilot.
- **Status:** [x] v1 was not promoted. LEP/2 plus a persona-aware load-bearing
  review profile was first promoted for Jax. The C102 Article preserved the
  accountability angle, created street life, and moved the sim through public
  pressure without a false named entity or false official act. Expansion is by
  completed journalist package, never generic fallback; Carmen became the
  second package in Task 14.

### Task 9: Build the LEP/2 claim-manifest refinement

- **Files:**
  - `scripts/livedExperiencePacketV2.js` — create
  - `scripts/livedExperiencePacketV2.test.js` — create
  - `docs/media/examples/lived_experience_packet_v2.json` — create
  - `scripts/cron-desk-run.js` — add isolated `v2` routing
  - `scripts/cron-desk-writer.js` — normalize INTAKE and audit manifest use
- **Steps:** Give facts stable local IDs; make Wake 2 select finite stance,
  question, and intention IDs; render quotes in code; build the W3
  fact/quote/subject manifest; reject unapproved numbers and quotations in the
  exhaustive evaluation profile.
- **Verify:** both Packet test suites and writer tests pass; `v1`, `v2`, and
  baseline artifact names remain distinct; no API call is needed.
- **Status:** [x] built and locally validated 2026-08-09 (codex)

### Task 10: Run the fixed LEP/2 A/B

- **Commands:** Repeat Tasks 6–7 with `--packet-contract=v2` and the same C102,
  reporter, assignment, candidates, and models.
- **Verify:** compare v2 against both the preserved baseline and final v1 sample;
  report canon errors and prose/usefulness separately.
- **Status:** [x] complete 2026-08-09 (codex). W1 and W2 completed; W2 landed
  three code-rendered quotes and one institutional abstention. W3 used zero
  tools. The then-current lexical audit rejected it before routing; the
  2026-08-10 persona review found that rejection overbroad and graded the Article
  a product pass.

### Task 11: Promote the Jax live wake package

- **Files:**
  - `scripts/newsroom-wake-packages.json` — package registry and Jax authority
  - `scripts/newsroomWakePackages.js` — validator and package-only gate
  - `scripts/newsroom-fanout.js` — select active package seats within fixed desk quotas; remove generic fallback
  - `scripts/cron-desk-run.js` — automatic contract and per-wake routing
  - `scripts/citizenVoice.js` — explicit OpenRouter model per Wake 1/2 request
  - `scripts/cron-desk-writer.js` — load-bearing Packet composition
- **Steps:** Make Jax the first active package; route W1/W2 to Llama 3.3 70B and
  W3 to Sonnet 5; keep zero writer tools; skip all unupgraded fanout assignments.
- **Verify:** package, handoff, Packet, and writer tests pass; changed scripts
  pass `node --check`; no paid or external-write run.
- **Status:** [x] built and locally validated 2026-08-10 (codex)

### Task 12: Make headless Rhea persona-aware

- **Files:**
  - `scripts/cron-rhea-gate.js` — load the writer profile and W3 manifest
  - `scripts/cronRheaPersonaGate.test.js` — prompt-boundary regression
  - `scripts/livedExperiencePacketV2.js` — route lexical cues semantically under a load-bearing policy
- **Steps:** Keep Rhea in the sourcing lane. Permit declared Jax texture without
  treating it as canon proof; remain strict on named inventions, official action
  or inaction, votes, criminal claims, contradictory state, and load-bearing
  figures. Do not ask Rhea to grade voice or sim movement.
- **Verify:** local prompt test includes authority, conditions, blockers, and the
  reviewer-lane boundary; exhaustive evaluation behavior still fails closed.
- **Status:** [x] built and locally validated 2026-08-10 (codex)

### Task 13: Observe the unattended packaged cohort

- **Steps:** Do not run another synthetic Article. Inspect one fresh scheduled
  angle → report → write chain built after the fixed-cap rota correction. Grade
  canon integrity, street life, and sim movement separately from mechanical
  completion, then inspect Rhea disposition and staging proof for every seat.
- **Verify:** the saved fanout contains exactly two civic, two sports, one
  culture, and one business assignment; every assignment owns an active package
  and canonical byline-roster POPID; W2 and W3 consume the same six identities;
  each W3 Packet is newer than and exactly bound to that seat's current W1 angle;
  Rhea pass/hash proof governs staged versus flagged; no generic wake or
  package-inserted seventh seat executes.
- **Status:** [ ] first eligible proof is the next fresh M-F angle wake after
  `4d549bbc`; the capped 2026-08-13 legacy fanout is containment evidence only

### Task 14: Add the second civic package without evicting Jax

- **Files:**
  - `scripts/newsroom-fanout.js` — reserve active package seats before pinning
  - `scripts/newsroom-wake-packages.json` — add Carmen's package and authority
  - `scripts/newsroomWakePackages.test.js` — same-desk and cross-desk regressions
- **Steps:** Make required-package replacement aware of every active package
  identity; add Carmen Delaine (`POP-00011`) as `CARMEN-LEP2-1`; preserve
  `JAX-LEP2-1` unchanged.
- **Verify:** both required civic seats coexist regardless of registry order; a
  missing civic seat is added without replacing another desk; package, handoff,
  LEP/2, Rhea, syntax, and documentation lint checks pass.
- **Status:** [x] built and locally validated 2026-08-10 (codex)

### Task 15: Add the first sports package with a typed fan-pulse handoff

- **Files:**
  - `scripts/newsroom-wake-packages.json` — add P Slayer's package and authority
  - `scripts/cron-desk-run.js` — pass the fan-pulse slice into LEP/2
  - `scripts/livedExperiencePacket.js` — type player candidates, feed anchors,
    and the bounded creative brief across Wake 1 through Wake 3
  - package and Packet tests — cover the required sports seat and typed handoff
- **Steps:** Add P Slayer (`POP-00008`) as `PSLAYER-LEP2-1` with Llama 3.3 70B
  on all three wakes. Preserve fan charge, friction, prior-take pointer, and
  scene limits as editorial instructions while keeping roster moves, results,
  stats, contracts, injuries, quotes, and collective fan sentiment Packet-bound.
- **Verify:** required civic and sports seats coexist; the first sports story is
  pinned to P Slayer without consuming another desk; player candidates and feed
  anchors enter LEP/2; the creative brief survives to Wake 3; Jax and Carmen's
  package objects remain unchanged.
- **Status:** [x] built and locally validated 2026-08-10 (codex)

### Task 16: Add Jordan Velez with a typed economic/storefront handoff

- **Files:**
  - `scripts/newsroom-wake-packages.json` — add Jordan's package and authority
  - persona/model maps — bind Jordan to the existing single-reporter
    `business-desk` control-plane package
  - `scripts/cron-desk-run.js` and `scripts/livedExperiencePacket.js` — carry
    economic candidates, sourced anchors, and business limits through LEP/2
  - package, routing, economic-slice, and Packet tests — cover the business seat
- **Steps:** Add Jordan Velez (`POP-00153`) as `JORDAN-LEP2-1` with DeepSeek on
  all three wakes. Preserve the economic/storefront pack's named businesses,
  translated frame, forbidden claims, and scene boundary while keeping money,
  labor actions, contracts, quotes, and measured trends Packet-bound.
- **Verify:** the required business seat coexists with both civic seats and the
  sports seat; the existing `business-desk` identity loads; sourced anchors and
  limits survive to Wake 3; Jax, Carmen, and P Slayer's package objects remain
  unchanged.
- **Status:** [x] built and locally validated 2026-08-10 (codex)

### Task 17: Surgical package migration checklist — every newsroom persona

This checklist is the migration gate for the next phase of pipeline.54. A
persona is not ready because a prompt was rewritten or a model was swapped. A
package becomes active only after its identity, typed slice, model route,
angle/report/write contracts, reviewer boundary, tests, and attended proof all
agree. The package registry remains package-only: an unchecked seat is skipped,
never silently sent through the generic prompt.

Daily eligibility is not compulsory daily execution. Active `requiredDaily`
entries form the staged-count/LRU candidate pool; the rota still selects only
two civic, two sports, one culture, and one business package. The package gate
may normalize or reject those selected seats but may not insert extras. Package
graduation expands rotation coverage without expanding the six-seat wake or its
cost envelope. Every stage reapplies that cap to its saved fanout before model
work, preferring source-assigned seats; this contains pre-fix rota artifacts
without silently creating replacement reporters who missed earlier wakes.

#### Non-negotiable gates for every seat

1. **Identity and scope:** verify name, POPID, beat domain, persona authority,
   canon tier, and whether the seat is an Article, data-memo, or visual contract.
2. **Typed slice:** build the smallest deterministic domain slice: assigned
   signal, source-addressed facts, candidate POPIDs, creative brief, limits,
   and explicit missing-data/abstention behavior. A slice must not make the
   model reconstruct the world from prose.
3. **Model route:** choose angle, report, and write models independently. Test
   the cheapest plausible model against a stronger candidate on the same fixed
   Packet fixtures. Record voice fidelity, unsupported-claim rate, abstentions,
   token count, latency, and cost. A different personality may require a
   different model; extra prompt scaffolding is not a substitute for a model
   that cannot hold the voice.
4. **Aligned contracts:** align the slice, angle assignment, W1 schema/rule,
   W2 question/report contract, W3 writer manifest, and Rhea profile. No generic
   angle or generic model fallback may remain hidden in the path.
5. **Local gates:** add deterministic Packet/route/package tests, syntax checks,
   malformed-output tests, empty-candidate tests, and persona-specific review
   fixtures. Record the exact model route and expected failure behavior.
6. **Proof and activation:** run one attended three-wake proof, inspect W1/W2/W3
   plus Rhea and staging artifacts, measure cost/latency, then activate the
   package. Full unattended graduation is a separate gate; angle success alone
   does not close it.

#### Persona inventory

`[x] package` means the package is implemented and active; `[ ] proof` means
the full three-wake/Rhea graduation is still open. For unchecked seats, the
slice and model text is a starting work surface, not an adopted contract.

| Package | Seat / POPID | Domain | Contract and slice surface | Model route | Package | Proof |
|---|---|---|---|---|---|---|
| JAX-LEP2-1 | Jax Caldera / POP-00799 | accountability | Inactive; rebuild from a sim-only typed slice with verbatim citizen-authored quote provenance | route withdrawn pending rebuild | [ ] | C103 builder rejection supersedes Rhea pass: unsupported real-world city framing and backend-composed statements presented as quotes |
| CARMEN-LEP2-1 | Carmen Delaine / POP-00011 | civic ledger | Article LEP/2; initiatives/votes/money | DeepSeek / DeepSeek / local source brief | [x] | attended W1-W3/Rhea passed; one medium public-wording flag remains |
| PSLAYER-LEP2-1 | P Slayer / POP-00008 | sports | Article LEP/2; typed fan pulse | Llama / Llama / local source brief | [x] | attended W1-W3/Rhea passed; [ ] reporting-rich column |
| JORDAN-LEP2-1 | Jordan Velez / POP-00153 | economics/labor | Article LEP/2; economic/storefront | DeepSeek / DeepSeek / local source brief | [x] | attended W1-W3/Rhea passed with zero candidates/quotes |
| LUIS-LEP2-1 | Luis Navarro / POP-00636 | civic investigations | `CIVIC-DOMAIN-SLICE-4`; typed reporting evidence; local thin-record brief or reporting-backed Article | DeepSeek / DeepSeek / local-or-Sonnet | [x] | direct-speech records brief passed 2/2 direct reactions, exact quote proof, Packet-aware Rhea, and contamination scan; [ ] story-linked lived-exposure/Sonnet proof |
| TREVOR-LEP2-1 | Trevor Shimizu / POP-00155 | infrastructure | Article LEP/2; typed incident/link/warning systems brief and unestablished cascade | DeepSeek / DeepSeek / local source brief | [x] | replacement proof passed 1/3 direct reactions; one invalid response rejected, one source abstained; exact quote, Packet-aware Rhea, and contamination scan passed |
| RACHEL-LEP2-1 | Sgt. Rachel Torres / POP-00057 | safety | Article LEP/2; typed public-safety signal and classification/response gap | DeepSeek / DeepSeek / local source brief | [x] | attended W1-W3/Rhea passed with zero candidates/quotes |
| LILA-LEP2-1 | Dr. Lila Mezran / POP-00154 | health | Article LEP/2; `HEALTH-SERVICE-BRIEF-1`; typed access/timeline/human-cost unknowns | DeepSeek / DeepSeek / local source brief | [x] | attended W1-W3/Rhea passed; DeepSeek schema pass, Llama schema fail |
| ANGELA-LEP2-1 | Angela Reyes / POP-00156 | education | Article LEP/2; `EDUCATION-STABILITY-BRIEF-1`; typed participation/access/outcome unknowns | DeepSeek / DeepSeek / local source brief | [x] | attended W1-W3/Rhea passed; DeepSeek more useful than Llama on same W1 Packet |
| NOAH-LEP2-1 | Noah Tan / POP-00157 | environment | Article LEP/2; `WEATHER-GROUND-BRIEF-1`; every Cycle's deterministic weather condition | DeepSeek / DeepSeek / local source brief | [x] | attended W1-W3/Rhea passed; ordinary weather narrates the Cycle |
| ANTHONY-LEP2-1 | Anthony Raines / POP-00017 | sports analytics | Article LEP/2; typed line-card and unresolved-subject boundary | DeepSeek / DeepSeek / local source brief | [x] | replacement proof rejected Vinnie Keane's unsupported response, emitted a quote-free sheet recap, and passed Packet-aware Rhea plus contamination scan |
| HAL-LEP2-1 | Hal Richmond / POP-00007 | sports history | Article LEP/2; typed present-fact/unsupplied-history boundary | Llama / Llama / local source brief | [x] | attended W1-W3/Rhea passed; Llama safer than DeepSeek on same W1 Packet |
| TANYA-LEP2-1 | Tanya Cruz / POP-00014 | sports sideline | Article LEP/2; typed record/access/observation boundary | DeepSeek / DeepSeek / local source brief | [x] | replacement proof rejected Adash Stanley as quote-ineligible and his unsupported response, emitted a quote-free sheet recap, and passed Packet-aware Rhea plus contamination scan |
| SIMON-LEP2-1 | Simon Leary / POP-00016 | sports long view | Article LEP/2; present role change/current-record boundary | DeepSeek / DeepSeek / local source brief | [x] | replacement proof passed 1/1 direct reaction with exact raw-to-Packet-to-Article text, Packet-aware Rhea, and contamination scan |
| pending | Ariana Reyes / POP-00133 | sports analytics | Candidate Article LEP/2; numeric/board pulse; blocked until a current As_Roster + TrueSource audit artifact exists | Candidate DeepSeek; benchmark | [ ] | blocked: current `output/desk-packets/truesource_reference.json` is absent; feed-only fallback forbidden |
| MARIA-LEP2-1 | Maria Keen / POP-00013 | culture | Article LEP/2; evening-life/neighborhood ground with no invented attendance | Llama / Llama / local source brief | [x] | attended W1-W3/Rhea passed; Llama safer and shorter than DeepSeek on the same W1 Packet |
| GRAYE-LEP2-1 | Elliot Graye / POP-00012 | community/faith | Article LEP/2; canon-forward faith institution and sighting-only boundary | Llama / Llama / local source brief | [x] | attended W1-W3/Rhea passed; corrections-forward context fixed a false Rhea canon reversal |
| KAI-LEP2-1 | Kai Marston / POP-00158 | culture/arts | Article LEP/2; shared evening substrate with arts overlay | Llama / Llama / local source brief | [x] | attended W1-W3/Rhea passed; [ ] reporting-rich scene |
| MASON-LEP2-1 | Mason Ortega / POP-00160 | culture/food | Article LEP/2; restaurant-list fact and unsupplied-workplace boundary | DeepSeek / DeepSeek / local source brief | [x] | attended W1-W3/Rhea passed; Llama failed corrected W1 schema |
| SHARON-LEP2-1 | Sharon Okafor / POP-00159 | culture/lifestyle | Article LEP/2; quiet-venue fact and unsupplied-behavior boundary | Llama / Llama / local source brief | [x] | attended W1-W3/Rhea passed; Llama avoided DeepSeek's invented causes and trends |
| pending | Elliot Marbury / POP-00166 | data/general | Separate data-memo contract; TrueSource/As_Roster audit slice | Candidate DeepSeek; benchmark | [ ] | blocked: current combined audit artifact is absent; feed-only memo forbidden |
| pending | DeShawn Hartley / POP-00015 | visual media | Separate visual/photo-prompt contract; visual record slice | Existing DJ direction path; benchmark pending | [ ] | blocked: C103 compiled Edition + Sift inputs do not exist before Saturday; active path now rejects unsupplied landmark defaults |

The eighteen active packages have locked routes, but their cost/model comparison and
full unattended graduation remain checklist work. Elliot Marbury and DeShawn
Hartley are deliberately not forced into Article LEP/2 until their data-memo and
visual contracts are specified; contract shape is part of Gate 1. Celeste Tran
(`POP-00164`) is confirmed in the canonical roster but is not yet in
`persona-map.json`; she is not counted as one of these 22 mapped personas and
must receive a Social Trends overlay before any package or shared evening access
is activated for her.

Document normalization is a separate, proposal-only workstream: inventory each
persona's IDENTITY/LENS/RULES/SKILL and bag, render backend-readable candidate
diffs, run schema/canon checks, and require the owning terminal's approval before
touching protected `.claude` files. Package activation does not authorize an
automatic rewrite.

## Status log — first C102 A/B

All treatment artifacts are `NOT_CANON`; no Sheet, Drive, memory, staging, or
publication write occurred.

| Measure | Preserved baseline | Typed treatment | Result |
|---|---:|---:|---|
| Wake 3 injected state | 38,002 bytes | 6,640 bytes | **82.5% smaller** |
| Wake 3 input tokens | 26,679 | 12,571 | **52.9% lower** |
| Wake 3 measured API cost | $0.0029 | $0.0014 | **51.7% lower** |
| Wake 3 runtime | 249s | 26s | **89.6% lower** |
| Live writer tool calls | 0 | 0 | equal; treatment mechanically forbids them |
| Article words | 552 | 396 | treatment is tighter |
| Invented named people | ≥1 (`Mrs. Lau`) | 0 | treatment wins |
| Unsupported hard details (manual lower bound) | ≥14 | ≥10 | reduction, but Wake 2 contamination still propagates |
| INTAKE parser errors | 4 | 0 | treatment wins; backend now authors INTAKE deterministically |
| Candidate outcomes | 4 confident quotes | 2 quotes, 1 institutional abstention, 1 malformed/drop | uncertainty is visible |

**What improved.** The assault, police-response time, cameras, press conferences,
grants, overflowing dumpsters, and invented resident disappeared. Wake 2 consumed
Wake 1's real plan; candidates got distinct questions; the generic citizen path
could not manufacture Marcus Osei's institutional statement; malformed output
failed closed. Wake 3 used zero tools and its INTAKE is now code-rendered from
the Packet rather than model-authored prose.

**What remains.** Selena's quote smuggled produce trading and safety tips into an
`INTERPRETATION`; the writer repeated those as its own observation, invented an
8th Street walk, a once-thriving history, collective community sentiment, and
broadened “no active initiative” into “no plan, no effort.” The model self-score
again said zero hallucinations, proving it is not the verification floor. Claim
labels improve routing but cannot validate their own contents. The next test
should keep the Packet and deterministic INTAKE, replace free quote text with a
backend-rendered lattice over allowed facts + stance + question, and retain
independent Rhea as the eventual promotion gate.

One intermediate Wake 3 treatment exposed a fail-open zero-budget bug:
`maxToolCalls: 0` was defaulted by `0 || 6`, allowing three read-only research
calls. The code now preserves zero explicitly, has a regression test, and the
final trace records an empty call list. The intermediate read caused no external
write and its sample is not the scored treatment above.

## Status log — LEP/2 C102 run

All three wakes used the same fixed C102/Jax/civic controls. The run made no
Sheet, Drive, memory, staging, publication, or canon write.

| Stage | LEP/2 result |
|---|---|
| Wake 1 | Completed; DeepSeek 2,853 input / 229 output tokens |
| Wake 2 | Completed; DeepSeek 7,511 input / 523 output tokens across four candidates |
| Wake 2 disposition | Three lattice-selected, code-rendered quotes; Marcus Osei institutional path abstained |
| Wake 3 state | 14,350 bytes; evaluation manifest `AM-94aa23169c6e` |
| Wake 3 tools | Zero |
| Wake 3 disposition | Lexical audit rejected before routing; retrospective product grade **pass / A-** |
| INTAKE | Deterministic parse: zero errors |

The rejected raw draft is
`output/cron-compare/civic_c102_freelance-firebrand_packet-v2_meta-llama-llama-3-3-70b-instruct.md`.
The audit reported `7th Street`, unsigned `1.06`, an unsupplied bartender
quotation, and punctuation changes to approved quotes. The persona audit changed
the verdict: a street-level location, generic bar, reporter drink, and role-only
anonymous bartender are explicit Jax authority, while “down 1.06” preserves the
direction of source `-1.06`. The audit did contain the Article, but its generic
lexical policy—not the Article—was the failed component.

The Article's core angle is true to the C102 data: Chinatown carries a decay
signal with no active Initiative/mitigator, and the record recommends council or
mayoral pressure. It moved the sim by publicly assigning pressure and opening a
thread future wakes can answer. Remaining tuning is narrower: avoid duplicated
lattice language; frame council silence/responsibility as a question unless the
record supplies the absence; and place Jax's unanswered question at the actual
end. A code-rendered prose block plan is rejected because it would flatten the
persona behavior the pilot proved useful.

## Status log — first C103 unattended angle wake

The 2026-08-10 scheduled angle fanout proved the four required seats coexisted:
Carmen and P Slayer completed, while Jax and Jordan failed before artifact
write. Jax's selected audit label exactly repeated `contradiction.a` at the same
source, so LEP/2 derived a duplicate claim ID. Jordan's selected storefront
signal supplied no citizen POPIDs, while the generic W1 target schema invited
DeepSeek to add two unsupported targets. The local correction collapses exact
type/text/source claim duplicates before ID derivation and makes candidate-free
target output explicitly and deterministically empty. The initial recovery wakes
were held pending builder approval; Task 13 remains open for the recovered angle
and later report/write/Rhea observation. After approval, the Jax and Jordan
angle-only recoveries succeeded and wrote C103 artifacts; full report/write/Rhea
observation remains open.

## Status log — C103 cohort repair and attended source-brief proof

The 2026-08-12 review found three shared canon breaks rather than six isolated
prose problems: altered direct quotes and invented subject profiles; raw engine
classifiers/decimals entering public facts; and a prior-Cycle sports row winning
the current assignment. LEP/2 now hard-blocks every unapproved direct quote for
load-bearing packages, exact W1 candidates are the only possible W2 targets,
and evidence-thin packages can bypass W3 generation with a local
`SOURCE_BRIEF`. Jax and Trevor receive public tracker language before W1, Kai's
scoring fields remain internal, and P Slayer selects a current-Cycle feed row
whenever one exists.

Attended `NOT_CANON` C103 proofs then passed the local manifest audit: Carmen
produced a quoteless civic brief; Kai produced a one-fact Nightline Station
brief; P Slayer produced a current-Cycle Pablo Almanzar no-hitter brief with no
Kelley state; and Trevor produced one infrastructure fact plus three exact
code-lattice quote blocks. All four W3 proofs used zero writer calls. The first
Kai and P Slayer model-written attempts were correctly rejected during repair
and were not routed. These are local/sample proofs only: no Article was staged,
published, uploaded, or ingested, and headless Rhea was not run.

The remaining Jax, Jordan, and Rachel review is also complete locally. Jordan
and Rachel each produced a candidate-free, quoteless `SOURCE_BRIEF` and passed
the typed manifest audit. Jax Wake 1 selected Calvin Turner and Vladimir
Gonzalez as its two bounded targets. An earlier Wake 2 Packet still contained
four exact statements; its Sonnet draft then split unapproved quote text and
failed closed before routing. The contained local Jax `SOURCE_BRIEF` built from
that retained Packet passes, while a fresh external Wake 2 observation remains
open to prove the new two-target boundary outside the regression fixture.

Across Jax, Jordan, Rachel, Carmen, Kai, P Slayer, and Trevor, the final local
gate now reports zero manifest errors, zero structural-junk hits, and zero
engine-language hits in Article prose. The Rhea engine scanner previously read
the machine-only `## INTAKE` provenance block and falsely surfaced canonical
source names; `42802ff2` restricts that scan to prose and adds a regression.
Independent model Rhea was not run because it would send each nonpublic Article
plus its Packet manifest and review profile to OpenRouter. The attempted fresh
Jax Wake 2 was likewise held because it would send two citizen profile Packets
to OpenRouter Llama. Both require payload-specific builder approval.

The builder granted that approval on 2026-08-13. Fresh Jax Wake 2 requested only
Calvin Turner and Vladimir Gonzalez, proving the two-target boundary, but
OpenRouter rejected both Llama requests at the account key's total limit before
inference; the resulting Packet visibly landed zero quotes. Its zero-call local
W3 source brief then passed manifest, prose-engine, and structural checks. The
first approved Gemini Rhea request hit the same total-limit rejection before a
verdict, so the remaining six calls were not repeated against a confirmed
account-wide block.

Overnight Rhea artifacts are not accepted as repaired-cohort proof: Jordan and
Kai predate the final corrections, while several later verdicts treated raw
machine-only `## INTAKE` provenance as Article prose. Commit `622a3bd3` now
omits that block from the model's draft while retaining deterministic intake
validation. Trevor's overnight duplicate-quote finding remains a legitimate
editorial warning to retest after provider capacity returns.

After the builder raised the key limit, the approved proof completed. Jax Wake
2 made exactly two Llama calls and landed exact statements from Calvin Turner
and Vladimir Gonzalez; fresh zero-call W3 then passed every local gate. Gemini
Rhea independently passed all seven repaired Articles with zero high-severity
flags at a total gate cost of `$0.3223`. Carmen alone received one medium flag:
`supplied phase is disbursement active` remains accurate but reads like status
language rather than public prose. No Article was staged, published, uploaded,
or ingested.

Dr. Lila Mezran then completed the next Task 17 package. Her C103 health slice
now translates the tracker row to `Temescal Community Health Center is
approved, and construction is active` while retaining the raw source pointer
only in provenance. `HEALTH-SERVICE-BRIEF-1` keeps affected people, access,
opening timeline, capacity, staffing, diagnoses, prevalence, treatment results,
and causal outcomes explicitly unestablished until supplied. On the identical
W1 Packet, DeepSeek passed the typed schema; Llama failed because
`unverifiedLead` was not an array. W2 had no supplied citizen and made zero
calls; W3 locally rendered a quoteless source brief with zero calls. Manifest,
prose-engine, and structural checks passed, and independent Gemini Rhea passed
with zero flags for `$0.0428`. No Article was staged, published, uploaded, or
ingested.

The builder then approved Rhea as the weekday staging disposition: any Article
with a passing verdict moves to staged, while a non-pass stays flagged for
review. `scripts/reconcileRheaDisposition.js` closes the standalone-rerun seam
with hash-bound verdicts, reversible local history, and a dry-run default. The
Cycle 103 reconciliation staged all eight then-current Rhea passes and cleared their
stable active flag markers into history. It did not publish, upload, ingest, or
write any external system; the Saturday run remains the only canon door.

After Claude removed the protected Angela-lane real-school references, Angela
Reyes completed the next Task 17 package. Her education slice translates the
canon Initiative record to `Oakland Youth Apprenticeship Pipeline has been
announced, and its pilot is active` while holding every participant, school,
eligibility, placement, staffing, and outcome detail unestablished. DeepSeek and
Llama both passed the identical W1 schema; DeepSeek retained the route because
it supplied a usable records checklist, while Llama returned no checks and a
generic impact frame. W2 had zero candidates and made zero calls; W3 rendered
locally and passed the manifest with zero observations. Independent Gemini Rhea
passed with zero flags for `$0.0425`, and the hash-bound Article became the
ninth staged C103 pass. No byline, Sheet, Drive, Supermemory, publication, or
canon-ingestion write occurred.

Anthony Raines completed an attended C103 DeepSeek route proof after the shared
sports substrate was repaired. The parser now separates player stat ownership
even when the feed omits a comma, rejects `No No` as a false person, and treats
the explicit feed subject list as authoritative over prose spelling variants.
Anthony's Packet aligns `Pablo Almanza` to the explicitly supplied
`Pablo Almanzar` label without inventing a POPID, exposes only ledger-resolved
Vinnie Keane (`POP-00001`) to Wake 2, and preserves Pablo's unresolved identity
as a typed blocker. Wake 1 and Wake 2 passed; Wake 3 locally rendered an exact
source brief, quarantined all three free-form leads, and passed Gemini Rhea with
zero flags for `$0.0537`. The eleventh C103 Article staged. The standard
post-gate hooks also wrote Anthony's byline-usage row and a reporter PRESS entry
plus gated `Reflection_Intake` row (`applied=no`); no Article publication or
canon ingestion ran. A same-Packet Llama comparison was initially rejected
before inference by the execution approval layer, so `ANTHONY-LEP2-1` remained
`active: false` at that point rather than waiving Gate 3.

After the builder explicitly approved OpenRouter Packet use, the same bounded
C103 W1 Packet ran through Llama 3.3 70B. Llama used 2,132 prompt tokens and 194
completion tokens but failed closed at LEP/2 validation because its target did
not carry a supplied POPID with both question and basis. DeepSeek therefore wins
the fixed-Packet comparison: it passed the schema and the already-attended
W1-W3/Rhea path. `ANTHONY-LEP2-1` is active on its unchanged all-DeepSeek route;
the failed Llama output did not stage or enter canon.

Hal Richmond's package closes the unsafe archive-carveout seam without
editing his protected persona sources. Feed-backed present facts enter the typed
W1 and W3 manifests, unresolved feed names cannot become Wake 2 targets, and an
era echo may name a person, place, team, event, season, or statistic only when
the Packet supplies it. First-person interpretation remains permitted, but
witnessed memories, archive access, prior coverage, and imported history are
canon blockers unless supplied as facts. On the same corrected C103 Packet,
DeepSeek passed schema but added unsupported historical and roster implications;
Llama stayed on the supplied line, record, and streak. Llama therefore owns W1/W2.
Wake 2 safely abstained with zero quotes, local Wake 3 used zero writer calls,
and contextual Gemini Rhea passed with zero flags for `$0.0477`. The twelfth C103
Article staged and `HAL-LEP2-1` is active.

Tanya Cruz's first contextual review exposed two independent gates rather than a
reason to waive either one. The deterministic intake proved her exact Adash Stanley
quote came from `packet.W2`, while Rhea initially substituted a different historical
statement because the API prompt did not enumerate approved Packet quotes. The gate
now supplies exact speaker/text/source/fact-ID provenance, and Tanya's slice translates
the public record to `23 points and 7 assists` and `0-1` instead of leaking raw
`23pt/7asst`, `L1`, mood, or event enums. DeepSeek beat Llama on W1 usefulness and
schema discipline; the corrected proof used 1,666/252 W1 tokens and 1,390/94 W2
tokens, landed one bounded quote, rendered W3 locally with zero writer calls, and
passed contextual Gemini Rhea with zero flags for `$0.0422`. The thirteenth C103
Article staged and `TANYA-LEP2-1` is active.

Simon Leary's C103 package selects Benji Dillon's bullpen move inside the supplied
`124-34` record and 15-game winning streak. It exposes only Benji's resolved POPID
and permits structure/continuity language solely as interpretation; franchise
history, organizational intent, collective memory, and citywide meaning remain
unsupplied. DeepSeek passed W1 at 1,738/272 tokens; Llama failed the same schema at
1,673/119 because it omitted `unverifiedLead`. DeepSeek W2 used 1,811/120 tokens
and landed one bounded quote. Local W3 used zero writer calls, and contextual
Gemini Rhea passed with zero flags for `$0.0437`. The fourteenth C103 Article
staged and `SIMON-LEP2-1` is active.

Ariana Reyes remains correctly blocked: the current runtime tree contains no
`output/desk-packets/truesource_reference.json` or equivalent current
As_Roster + TrueSource audit artifact, and her analytics contract forbids an
archive-card or feed-only substitute. Maria Keen therefore became the next
buildable Article seat. Her C103 package reuses the typed evening slice, exposes
only Nightline Station's open-and-quiet condition in West Oakland, and blocks
invented attendance, patrons, dialogue, neighborhood sentiment, or civic effect.
Llama passed W1 at 2,136/95 tokens and stayed closer to the record than DeepSeek's
2,218/256-token interpretation; W2 had zero candidates and zero calls, W3 rendered
locally with zero writer calls, and contextual Gemini Rhea passed with zero flags
for `$0.0423`. The fifteenth C103 Article staged and `MARIA-LEP2-1` is active.

Elliot Graye's C103 faith-ground package exposed a corrections-forward seam: the
raw Ripple/world summary still named always-blocked real institution Beth Jacob
Congregation, while the authoritative map supersedes it with B'nai Tikvah
Synagogue. The evening slice now applies the map before typed facts are emitted,
and Rhea injects only correction pairs relevant to the current Article/world
comparison. Llama's W1 used 2,200/145 tokens and kept speculative purpose in
typed interpretation/leads; DeepSeek used 2,306/229 and invented a sacred-space
motive plus imagined congregant behavior. Llama won. W2 had zero candidates and
zero calls, W3 rendered locally with zero writer calls, the first Gemini Rhea
correctly failed closed but reversed the old/new authority for `$0.0469`, and the
unchanged Article passed the corrected Rhea context with zero flags for `$0.0549`.
The sixteenth C103 Article staged and `GRAYE-LEP2-1` is active.

Mason Ortega's C103 package exposed a shared-slice cross-seat leak before
graduation: his selected Piedmont Heights restaurant assignment still inherited
Nightline Station's global top-pulse prewrite facts. The first comparison was
discarded. `assignmentFromSlice` now carries a seat-specific prewrite into the
runner, and the restaurant pulse no longer presupposes workers, a shift, service,
cost, or a citywide food trend at one venue. On the corrected fixed Packet, Llama
used 1,817/101 tokens but failed schema because `unverifiedLead` was not an array;
DeepSeek passed at 1,889/174, with its staffing and seasonal ideas confined to
non-publishable leads. W2 had zero candidates and zero calls, W3 rendered locally
with zero writer calls, and contextual Gemini Rhea passed with zero flags for
`$0.0387`. The seventeenth C103 Article staged and `MASON-LEP2-1` is active.

Sharon Okafor's C103 package treated Nightline Station's supplied open-and-quiet
condition as a reporting question rather than evidence of a behavior pattern.
Llama used 1,819/79 tokens and stayed within the venue record; DeepSeek used
1,920/218 but invented peak hours, regular clientele, a neighborhood mood, and
two named causal leads. Llama won. W2 had zero candidates and zero calls, W3
rendered locally with zero writer calls, and contextual Gemini Rhea passed with
zero flags for `$0.0407`. The eighteenth C103 Article staged and
`SHARON-LEP2-1` is active.

The two remaining special-contract seats were then audited without forcing them
through Article LEP/2. Marbury cannot build an audit-grade memo because the
current combined `As_Roster + TrueSource` artifact is absent; the feed-only
fallback remains forbidden. Hartley's established visual path is structurally
separate and waits for the compiled Edition plus Sift inputs. Its active
`djDirect` bundle no longer seeds real-world landmark, institution, team,
chain, or invented-business defaults: every named visual element must now come
from the exact Edition/world bundle, and `generate-edition-photos` fails closed
before a provider call when a retired legacy default is absent from that
bundle. C103 has a world summary but no compiled Edition or Sift proposal file,
so an attended visual proof correctly remains open until Saturday compile.

## Open questions

- Eighteen Cycle 103 Articles are staged and clear the deterministic
  contamination scan. Five superseded artifacts remain flagged: Jax, Trevor,
  Anthony, Simon, and Tanya printed backend lattice as citizen speech.
  Weekday routing, local Rhea reconciliation, and Saturday intake all apply the
  deterministic contamination blocker before a Rhea pass can stage or ingest an
  Article. Luis passed 2/2 bounded direct reactions, Trevor passed 1/3, and Simon
  passed 1/1 with exact citizen-authored text. Anthony's and Tanya's attempted
  responses failed closed, so their replacement Articles are quote-free
  sheet-backed recaps. None of these proves story-linked lived exposure.
  Preserve Carmen's medium public-wording flag as a polish item. Angela Reyes's
  package and attended proof are complete. Noah Tan's weather package and proof
  are complete. Anthony's DeepSeek route beat Llama on the fixed C103 Packet and
  the package is active. Hal and Tanya's model comparisons and attended proofs are
  also complete, and both packages are active.
- Simon's, Maria's, Graye's, Mason's, and Sharon's packages and attended proofs
  are complete. Ariana Reyes is still the earliest unchecked Article seat but
  is blocked on a current As_Roster + TrueSource audit artifact. Elliot Marbury
  is also blocked on that current combined audit substrate. Hartley's separate
  visual contract is locally contained but awaits the first compiled Edition +
  Sift Packet for an attended proof; do not substitute an Article Packet.
- Luis's thin-record path and Packet-aware Rhea proof passed, but his
  reporting-trail-backed Sonnet path and story-linked lived-exposure proof remain
  open. A direct reaction is not evidence that a citizen experienced the story.
- Tanya's typed package keeps access, observed action, room mood, dialogue,
  injury detail, and team response `NOT_SUPPLIED` unless the Packet carries
  evidence. Exact Packet quote provenance now constrains Rhea's fabrication check.
- Expansion remains blocked per journalist until that person's wake models,
  Packet contract, creative authority, movement contract, and Rhea profile are
  encoded in an active package and the existing cohort review is complete.

## Changelog

- 2026-08-09 (codex) — Filed ADR/exemplar/validator and built the isolated three-wake treatment path; API run and comparison pending.
- 2026-08-09 (codex) — Completed the C102 three-wake A/B and first tuning loop. v1 reduced unsupported hard detail and cut Wake 3 context/cost, but did not reach publishable accuracy; deterministic INTAKE shipped, quote lattice is the next variable.
- 2026-08-09 (codex) — Re-ran Wake 3 after sanitizing W1/W2 handoff fields and fixing zero-tool fail-open behavior. Final sample used one compose turn and zero tools; v1 remains unfit for promotion because free quote text still becomes invented reporter observation.
- 2026-08-09 (codex) — Built the isolated LEP/2 next variable from the blind review: claim IDs, finite Wake 2 lattice, code-rendered quote IDs, exhaustive W3 manifest, and pre-score number/direct-quote audit. Local-only; paid three-wake rerun remains pending.
- 2026-08-09 (codex) — Ran the fixed LEP/2 C102 comparison. W2 eliminated free quote prose; W3 nevertheless invented a bar/bartender scene and altered a signed metric, then failed closed at the manifest audit before scoring or sample routing. Next variable: code-rendered W3 block plan.
- 2026-08-10 (codex) — Corrected the C102 product verdict after reading Jax's authority: the Article passed; the generic lexical cage overrejected signature texture. Promoted JAX-LEP2-1 with Llama/Llama/Sonnet routing, package-only fanout, load-bearing review, and persona-aware Rhea. No new model or external-write run.
- 2026-08-10 (codex) — Made required-package pinning multi-seat and cross-desk safe, then added Carmen Delaine as the second civic LEP/2 package with her established DeepSeek route and civic-ledger authority. JAX-LEP2-1 is unchanged; no model or external-write run.
- 2026-08-10 (codex) — Added P Slayer as the first sports LEP/2 package with all-Llama routing and a load-bearing fan-heat profile. Wired the existing fan-pulse slice into the typed Packet so players, feed anchors, charge, friction, prior-take pointer, and scene limits survive through Wake 3. Jax and Carmen are unchanged; no model or external-write run.
- 2026-08-10 (codex) — Added Jordan Velez as JORDAN-LEP2-1 with DeepSeek across all three wakes and a load-bearing economics/labor profile. Reused the single-reporter business-desk identity and carried the existing economic/storefront slice into LEP/2 as sourced anchors plus bounded creative limits. Jax, Carmen, and P Slayer are unchanged; no model or external-write run.
- 2026-08-10 (codex) — Diagnosed the first C103 unattended angle wake and hardened the LEP/2 boundary: exact sourced claims deduplicate before ID derivation, and a candidate-free W1 Packet narrows model-added targets to an empty list. Recovery was not fired.
- 2026-08-10 (codex) — Filed Task 17, the surgical migration checklist for all 22 newsroom personas: typed slice, per-wake model benchmark, aligned contracts, deterministic tests, attended proof, and separate data/visual contract gates. Jax and Jordan angle recoveries succeeded; full cohort graduation remains open.
- 2026-08-10 (codex) — Added KAI-LEP2-1 as the first evening/culture package. Kai shares the deterministic evening substrate but receives a seat-specific arts pulse, bag authority, LEP/2 creative brief, Llama route, and load-bearing Rhea profile; Mason, Maria, and future Social Trends remain separate package gates.
- 2026-08-10 (codex) — Added RACHEL-LEP2-1 for Sgt. Rachel Torres with a disk-first public-safety slice, typed safety creative brief, DeepSeek route, and load-bearing incident/classification review profile; full W1-W3/Rhea proof remains open. Document normalization is explicitly proposal-only and separate from activation.
- 2026-08-12 (codex) — Added LUIS-LEP2-1 with an all-DeepSeek route and a compact investigation brief that separates known facts, missing evidence, and an explicitly unestablished silence clock. Existing packages remain unchanged; full W1-W3/Rhea proof and model comparison remain open.
- 2026-08-12 (codex) — Added TREVOR-LEP2-1 with an all-DeepSeek route and a compact systems brief that keeps timestamps, second-system evidence, causal links, and cascade claims explicitly missing until supplied. Existing packages remain unchanged; full W1-W3/Rhea proof and model comparison remain open.
- 2026-08-12 (codex) — Promoted Luis Wake 3 from DeepSeek to Sonnet for evidence-disciplined investigative prose while retaining DeepSeek for planning and interviews; the attended C103 sample remains `NOT_CANON` until separately graded.
- 2026-08-12 (codex) — The attended Luis Wake 1 exposed a stale civic-domain cache: the pre-package `CIVIC-DOMAIN-SLICE-1` artifact omitted typed missing evidence. Bumped the slice contract to v2 and added a stale-cache rebuild regression before rerunning; no Wake 2 executed on the stale Packet.
- 2026-08-12 (codex) — The corrected Luis Wake 1 then exposed a beat-ineligible source candidate: active A's right fielder Vladimir Gonzalez. Civic slice v3 now resolves candidate POPIDs against the local ledger, excludes professional athletes and unresolved profiles with machine-readable reasons, and fails closed before Wake 2.
- 2026-08-12 (codex) — The first Luis Wake 2 attempt was interrupted after the runner announced four targets: Packet candidates were first-priority but generic civic-lane POPIDs still filled unused quote capacity. Packet mode now treats the assigned candidate set as exhaustive; regression holds two assigned targets and rejects two generic fallbacks.
- 2026-08-12 (codex) — The first Sonnet Wake 3 sample had strong known/unknown prose but enlarged safe intentions into prior tracking, invented conversation/access/ownership framing, and indexed the runtime Cycle fact instead of the sourced claim. Luis W3 now forbids those transformations explicitly, and deterministic INTAKE skips the runtime Cycle claim.
- 2026-08-12 (codex) — The second Sonnet sample fixed INTAKE but still turned missing evidence into confirmed absence (`no one filed`, `no office has been asked`) and invented first-person reporting acts. The contract now requires the exact epistemic form `the Packet does not establish X`; non-occurrence and reporting acts require approved facts.
- 2026-08-12 (codex) — Final attended verdict: Sonnet produced compelling Luis prose but again invented reporting history, independent conversations, confirmed non-occurrence, and an unnamed owner/file frame. `INVESTIGATION_EPISTEMIC_OVERREACH` now fails these phrases deterministically even under load-bearing review. Luis remains proof-open; no sample staged or published.
- 2026-08-12 (codex) — Approved Luis correction: civic slice v4 carries typed reporting-evidence states and ledger-backed subject relevance; evidence-thin W3 Packets suppress excluded leads and request a 180–280 word records brief; the local audit also blocks raw engine classifier, severity, and row metadata. Targeted proof and one attended Sonnet spot test follow.
- 2026-08-12 (codex) — The corrected Wake 1 Packet passed, but its model-authored close still presupposed remedial steps. Evidence-thin Wake 3 now replaces W1 framing with a code-owned assignment and neutral next-record question before prose generation.
- 2026-08-12 (codex) — Corrected Wake 2 landed one of two reactions and exposed candidate-profile loss during report assembly plus a scalar non-publishable lead. Wake 2 now consumes the exact W1 candidate objects and mechanically normalizes that discarded lead field; publishable quote selection remains ID-only.
- 2026-08-12 (codex) — The final pre-write inspection confirmed two bounded quotes and zero visible leads, then removed redundant POPID literals from prose-facing subject profiles while retaining structural subject IDs.
- 2026-08-12 (codex) — The 247-word Sonnet records brief passed the first lexical wall but still reversed the phase relationship, narrated missing requests/responses as absence, split one exact quote, truncated another, and inferred shared resident sentiment. Evidence-thin `RECORDS_BRIEF` now bypasses the writer and code-renders only approved facts, exact quotes, typed unknowns, and the neutral close; Sonnet remains for reporting-trail-backed `FULL_INVESTIGATION`.
- 2026-08-12 (codex) — Evidence-thin C103 proof passed after `b3872535`: 182 body words, two exact quotes, zero writer calls/tools, and zero local manifest errors or observations. The old and corrected drafts were uploaded to the builder-supplied Drive folder as explicit `NOT_CANON` review artifacts; full reporting-trail/Sonnet and Rhea proof remain open.
- 2026-08-12 (codex) — Truth-up after builder review: the active cohort is eight packages, Luis's slice now branches between local `RECORDS_BRIEF` and reporting-backed Sonnet, and further package expansion is gated behind review of the six C103 Rhea failures plus Trevor's first full proof.
- 2026-08-12 (codex) — Repaired the three shared C103 failure classes at the Packet boundary: direct quotes fail closed, exact candidates own W2 identity exposure, public slice facts omit engine metadata, and P Slayer cannot promote a prior-Cycle row over a current feed row. Thin Carmen/Jordan/Rachel/Kai/P Slayer/Trevor W3 Packets now use zero-call `SOURCE_BRIEF` assembly.
- 2026-08-12 (codex) — Attended `NOT_CANON` local proofs passed for Carmen, Kai, P Slayer, and Trevor; Trevor landed three exact quote blocks. No Rhea, staging, publication, upload, or ingestion occurred. Review Jax/Jordan/Rachel and run Rhea before another package.
- 2026-08-12 (codex) — Completed the Jax/Jordan/Rachel local review and the seven-Article deterministic gate. All repaired briefs pass manifest, prose-engine, and structural scans; Jax's stale four-source Packet and the independent OpenRouter Rhea pass remain explicit external-proof gates.
- 2026-08-13 (codex) — Builder approved fresh Jax W2 plus seven Gemini Rhea calls. OpenRouter's total key limit rejected both two-target Llama requests and the first Gemini request before inference; local Jax W3 passed with zero quotes. Rhea now excludes machine-only `## INTAKE` from model review while deterministic intake validation remains.
- 2026-08-13 (codex) — After the key limit was raised, fresh Jax W2 landed 2/2 bounded sources and local W3 passed. Independent Gemini Rhea passed all seven repaired Articles with zero high flags for `$0.3223`; Carmen retained one medium public-wording flag. No publication or ingestion occurred.
- 2026-08-13 (codex) — Added LILA-LEP2-1 with a typed health-service brief and public tracker translation. DeepSeek beat Llama on the identical W1 schema; zero-call W2/W3 and independent Rhea passed with zero flags. No publication or ingestion occurred; Angela Reyes is next.
- 2026-08-13 (codex) — Added the local Rhea-disposition reconciler and applied the builder's staging policy to Cycle 103: eight passes staged, stable failure markers archived as review history, and no publication or canon ingestion executed. Angela remains gated on Claude's protected verbiage cleanup.
- 2026-08-13 (codex) — Builder rejected the staged Jax C103 Article as a complete product failure. JAX-LEP2-1 is inactive, generic city texture authority is removed, and reactivation requires sim-only evidence plus verbatim citizen-authored quotation provenance.
- 2026-08-13 (codex) — Full staged-set audit invalidated the Wake 2 graduation claim: five C103 Articles print backend lattice as seven attributed statements, while thirteen contain no interview quote. Added local `CITIZEN_INTERVIEW/1`, which exposes citizen sim-life context, requires citizen-authored speech, preserves it exactly, rejects legacy lattice, and allows abstention. No paid or external-write run performed.
- 2026-08-13 (codex) — First direct-speech Luis Wake 2 authored and preserved two distinct responses, but both invented unsupplied civic history from same-neighborhood assignment, so Wake 3 was not run. The contract now rejects self-certified lived context without addressable story-linked evidence and limits unexposed citizens to a bounded direct reaction or abstention.
- 2026-08-13 (codex) — Two tightened Luis retries correctly landed zero quotes but showed that unrelated personal-life context still prompted invented station use and plan history. Direct-reaction mode now exposes only ledger identity, neighborhood, role, and temperament; richer life context requires addressable story-linked evidence.
- 2026-08-13 (codex) — Final Luis proof landed 2/2 distinct fact-bounded direct reactions with exact raw-to-Packet-to-Article text, rejected no lattice, translated the raw phase label at rendering, passed Packet-aware Rhea and the contamination scan, and staged a local records brief. This proves direct reaction, not story-linked lived exposure.
- 2026-08-13 (codex) — Wired `articleContamination.js` into weekday routing, Rhea reconciliation, and Saturday staged intake. Moved Jax, Trevor, Anthony, Simon, and Tanya from staged to flagged while preserving their Rhea-pass history; Saturday dry-run now admits exactly fourteen C103 Articles.
- 2026-08-13 (codex) — Graduated ANGELA-LEP2-1 after Claude's protected verbiage cleanup: DeepSeek beat Llama on same-Packet usefulness, zero-call W2/W3 passed locally, independent Rhea passed with zero flags, and the ninth C103 Article staged without an external author-state or canon write. Noah Tan is next.
- 2026-08-13 (codex) — Began Noah Tan's Task 17 audit: removed real air/weather agencies from his writable voice contract and required Packet-supplied monitoring authority. C103 has no environmental lane entry, and protected culture-desk agency references remain for Claude; NOAH-LEP2-1 was not activated on an invented assignment.
- 2026-08-13 (codex) — Builder ruled ordinary weather is Cycle narration and all Rhea-cleared Articles become canon at Saturday's gate regardless of Edition selection. NOAH-LEP2-1 now sources every Cycle's deterministic weather line; W1 schema, zero-call W2/W3, manifest, and independent Rhea passed with zero flags. The tenth C103 Article staged; Anthony Raines is next.
- 2026-08-13 (codex) — Built ANTHONY-LEP2-1 and repaired shared sports parsing: exact subject authority, false-name rejection, split stat ownership, and unresolved-POPID abstention. DeepSeek W1/W2, local W3, manifest, and Gemini Rhea passed; the eleventh C103 Article staged. The registry stays inactive because the required same-Packet second-model benchmark was rejected before inference.
- 2026-08-13 (codex) — Built inactive HAL-LEP2-1 local gates: present feed facts now enter W1/W3 manifests, unresolved names cannot become interview targets, and unsupplied history or witnessed memory is blocked rather than treated as a franchise carveout. Fixed-Packet comparison and attended W1-W3/Rhea remain open.
- 2026-08-13 (codex) — Built inactive TANYA-LEP2-1 local gates and repaired the live typed-slice selector: Hal and Tanya now reach W1 as typed slices, while sideline access, observation, mood, dialogue, injuries, and team response remain unsupplied unless Packet-backed.
- 2026-08-13 (codex) — Graduated ANTHONY-LEP2-1 after the approved fixed-Packet comparison: Llama 3.3 70B failed W1 target schema after 2,132 input and 194 output tokens; DeepSeek's existing schema and attended W1-W3/Rhea proof won. Activated the unchanged all-DeepSeek route; no benchmark output staged.
- 2026-08-13 (codex) — Graduated HAL-LEP2-1 on Llama/Llama/local after DeepSeek's same-Packet W1 introduced unsupported historical and roster implications. W2 safely abstained, local W3 used zero writer calls, Gemini Rhea passed with zero flags, and the twelfth C103 Article staged.
- 2026-08-13 (codex) — Graduated TANYA-LEP2-1 on DeepSeek/DeepSeek/local. Rhea now receives exact manifest quote provenance; Tanya's public facts naturalize sports-feed labels. The corrected attended proof landed one bounded quote, passed contextual Rhea with zero flags, and staged the thirteenth C103 Article.
- 2026-08-13 (codex) — Graduated SIMON-LEP2-1 on DeepSeek/DeepSeek/local. The typed slice confines sports-as-civic-architecture to interpretation over Benji Dillon's role change and the supplied current record; Llama failed W1 schema, local W3 used zero writer calls, Rhea passed with zero flags, and the fourteenth C103 Article staged.
- 2026-08-13 (codex) — Recorded Ariana Reyes's missing current As_Roster + TrueSource audit substrate as a fail-closed package blocker, then graduated MARIA-LEP2-1 on Llama/Llama/local. The public evening brief drops backend record scaffolding, W2/W3 made zero model calls, Gemini Rhea passed with zero flags, and the fifteenth C103 Article staged. Elliot Graye is the next buildable seat.
- 2026-08-13 (codex) — Graduated GRAYE-LEP2-1 on Llama/Llama/local after closing a real-name corrections-forward seam between raw C103 signals and Rhea. The typed slice removes the blocked real faith institution, W2/W3 made zero model calls, the unchanged Article passed corrected Gemini Rhea with zero flags, and the sixteenth C103 Article staged. Mason Ortega is next.
- 2026-08-13 (codex) — Graduated MASON-LEP2-1 on DeepSeek/DeepSeek/local after fixing the evening slice's global-top-pulse leak into seat-specific Packets. The corrected restaurant fact makes no worker or service premise, Llama failed W1 schema, W2/W3 made zero model calls, Gemini Rhea passed with zero flags, and the seventeenth C103 Article staged. Sharon Okafor is next.
- 2026-08-13 (codex) — Graduated SHARON-LEP2-1 on Llama/Llama/local. DeepSeek invented peak-hours, clientele, mood, sports, and festival explanations from one quiet-venue fact; Llama stayed bounded, W2/W3 made zero model calls, Gemini Rhea passed with zero flags, and the eighteenth C103 Article staged. Marbury's separate data-memo contract is next.
- 2026-08-13 (codex) — Audited the remaining special seats: Marbury is blocked on the absent current As_Roster + TrueSource artifact; Hartley waits for compiled C103 Edition + Sift inputs. Removed hardcoded real-world visual defaults from the active DJ bundle and added a pre-provider source-boundary gate; no image call or publication ran.
- 2026-08-13 (codex) — Reconciled the nineteen-package cohort with the six-seat live schedule after saved fanouts exposed 8- and 11-seat expansion. Active packages now feed the existing staged-count/LRU selector at fixed 2/2/1/1 desk quotas; the package-only gate cannot insert seats, and every stage caps older saved fanouts before model work. Local tests only; no wake, Sheet write, or model call ran.
- 2026-08-13 (codex) — Reopened Task 13 against the current cohort: graduation now requires one fresh unattended six-seat W1→W2→W3 chain with stable identities and exact Rhea/staging proof. The 2026-08-13 oversized saved fanout is runtime-contained but cannot prove the corrected builder path.
- 2026-08-13 (codex) — Added a fail-closed W3 freshness gate after current C103 artifacts proved that Cycle-scoped filenames can leave yesterday's report Packet behind today's angle. Stage, Cycle, persona, reporter POPID, angle pointer, assigned story, and timestamp order must now agree before writer or Rhea work.
- 2026-08-13 (codex) — Rebuilt the four non-Jax lattice-bearing packages under `CITIZEN_INTERVIEW/1`: Trevor passed 1/3 direct reactions and Simon 1/1; Anthony and Tanya rejected unsupported responses and emitted quote-free recaps. All four passed Packet-aware Rhea and deterministic contamination checks, bringing Saturday's dry-run scope to eighteen clean C103 Articles. Jax remains inactive and story-linked lived exposure remains unproven.
- 2026-08-14 (codex) — Diagnosed the fresh unattended W1/W2 chain: Graye's invalid supplied-target output and three zero-quote runs were held gates, not empty candidate pools. Restored the bounded four-person W2 bench so affected/assigned citizens stay first, then same-neighborhood and city residents remain available after a reporter-selected target abstains or fails the direct-speech contract. Local Packet/package tests passed; fresh cron proof remains open.
