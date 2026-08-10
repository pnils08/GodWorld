---
title: Three-Wake Typed Lived-Experience Packet Pilot
created: 2026-08-09
updated: 2026-08-10
type: plan
tags: [media, citizens, civic, agents, evaluation, active]
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
`scripts/newsroom-wake-packages.json`. Jax's `JAX-LEP2-1` package automatically
uses LEP/2, zero live writer tools, per-wake model routing, and a load-bearing
manifest interpreted by persona-aware Rhea. Scheduled journalists without an
active package are skipped; the legacy generic prompt is not a fallback.

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
  review profile is promoted for Jax only. The C102 Article preserved the
  accountability angle, created street life, and moved the sim through public
  pressure without a false named entity or false official act. Expansion is by
  completed journalist package, never generic fallback.

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
  - `scripts/newsroom-fanout.js` — pin required package seats; remove generic fallback
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

### Task 13: Observe the unattended Jax week

- **Steps:** Do not run another synthetic Article. Inspect scheduled angle,
  report, write, Rhea, and staging artifacts after the next unattended wakes.
  Grade canon integrity, street life, and sim movement separately; add the next
  journalist package only after its persona authority and review profile exist.
- **Verify:** Jax is the only active scheduled package; all other assignments are
  logged as package-gate skips; no generic wake executes.
- **Status:** [ ] unattended observation begins with the next M-F wake

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

## Open questions

- No implementation question blocks Jax. The next evidence is his unattended
  week. Expansion remains blocked per journalist until that person's wake models,
  Packet contract, creative authority, movement contract, and Rhea profile are
  encoded in an active package.

## Changelog

- 2026-08-09 (codex) — Filed ADR/exemplar/validator and built the isolated three-wake treatment path; API run and comparison pending.
- 2026-08-09 (codex) — Completed the C102 three-wake A/B and first tuning loop. v1 reduced unsupported hard detail and cut Wake 3 context/cost, but did not reach publishable accuracy; deterministic INTAKE shipped, quote lattice is the next variable.
- 2026-08-09 (codex) — Re-ran Wake 3 after sanitizing W1/W2 handoff fields and fixing zero-tool fail-open behavior. Final sample used one compose turn and zero tools; v1 remains unfit for promotion because free quote text still becomes invented reporter observation.
- 2026-08-09 (codex) — Built the isolated LEP/2 next variable from the blind review: claim IDs, finite Wake 2 lattice, code-rendered quote IDs, exhaustive W3 manifest, and pre-score number/direct-quote audit. Local-only; paid three-wake rerun remains pending.
- 2026-08-09 (codex) — Ran the fixed LEP/2 C102 comparison. W2 eliminated free quote prose; W3 nevertheless invented a bar/bartender scene and altered a signed metric, then failed closed at the manifest audit before scoring or sample routing. Next variable: code-rendered W3 block plan.
- 2026-08-10 (codex) — Corrected the C102 product verdict after reading Jax's authority: the Article passed; the generic lexical cage overrejected signature texture. Promoted JAX-LEP2-1 with Llama/Llama/Sonnet routing, package-only fanout, load-bearing review, and persona-aware Rhea. No new model or external-write run.
