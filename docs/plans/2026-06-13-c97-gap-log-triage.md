---
title: C97 Gap-Log Triage & Remediation Plan
created: 2026-06-13
updated: 2026-06-13
type: plan
tags: [architecture, pipeline, engine, civic, canon, governance, active]
sources:
  - output/production_log_run_cycle_c97_gaps.md (G-PREP1..9, G-R1..5, G-S1..7, G-W-C97-1..4)
  - output/production_log_c97_print_gaps.md (G-PR-C97-1..6)
  - output/production_log_c97_post_publish_gaps.md (G-P-C97-1..3)
  - docs/plans/GAP_LOG_TRIAGE_PLAYBOOK.md (the reusable method)
  - docs/archive/plans/2026-05-29-c95-gap-log-triage.md (precedent — two-track phased model)
pointers:
  - "[[GAP_LOG_TRIAGE_PLAYBOOK]] — how this kind of plan is built (the method)"
  - "[[../engine/ROLLOUT_PLAN]] — single pointer row; this plan carries detail + tracking"
  - "[[TEMPLATE]] — plan shape"
  - "[[2026-05-30-citizen-lifecycle-fame-system]] — owns the Mayor-retirement root cause (T1)"
  - "[[../index]] — registered same commit"
---

# C97 Gap-Log Triage & Remediation Plan

**Goal:** Close the C97 production gaps (3 gap logs, ~30 entries) as two-track phased work — research-build (apparatus) + engine-sheet (substrate) — with ROLLOUT carrying one pointer row and this plan carrying all detail + per-phase tracking.

**Architecture:** Three C97 sidecar gap logs (run-cycle, print, post-publish) clustered by root cause into themes (§Cluster Map) and routed to the terminal whose expertise owns each fix. Two themes this cycle are **operator scope directives**, not bugs (T7 strip-civic-initiatives, T1 lifecycle-misfire-becomes-story) — they reshape what the pipeline generates, so they lead. Correlated open ROLLOUT rows are folded by reference (forward task only). The dominant signal of C97: **citizen accuracy is the product, stories are disposable** (Mike S256) — every citizen-bearing surface needs an accuracy gate; that thread runs through T2, T3, T6.

**Terminal:** research-build (Track A) + engine-sheet (Track B). Research-build owns this plan + the single ROLLOUT row + the session-end summarization cadence.

**Pointers:**
- Method (reusable): [[GAP_LOG_TRIAGE_PLAYBOOK]]
- Precedent: [[../archive/plans/2026-05-29-c95-gap-log-triage]]
- Root-cause sub-plan folded by reference: [[2026-05-30-citizen-lifecycle-fame-system]] (T1)
- Source gap logs: the three `output/production_log_*c97*_gaps.md` (frontmatter `sources`)

**Acceptance criteria:**
1. Every HIGH/MED C97 gap is either (a) assigned to a numbered phase in Track A or B, (b) folded into a named existing ROLLOUT row, or (c) listed in §Already-Addressed / §Out-of-Scope with disposition. No HIGH/MED gap unaccounted for.
2. ROLLOUT carries exactly one new row pointing here (state `in-progress`); no per-cluster sprawl.
3. Each phase is one focused session for one terminal — exact files, a verify step, source gaps listed.
4. The two operator scope directives (T1 story-promotion branch, T7 civic-initiative strip) are captured as phases, not buried as notes — they gate next cycle's generation.

---

## §Cluster Map — gaps → themes → track → folds

Severity = highest constituent. Track = primary executor; (+other) = also has a task in the other track.

| # | Theme | Severity | Gaps | Track | Folds |
|---|-------|----------|------|-------|-------|
| T1 | Engine flipped sitting Mayor to "retired" — lifecycle misfire on office-holders + real-world date in milestone strings | HIGH | G-S1, G-S2 | B | [[2026-05-30-citizen-lifecycle-fame-system]] |
| T2 | No deterministic citizen-eligibility / card-integrity gate — Tier-1 codex entity reached a finished letter | HIGH | G-W-C97-1, G-P-C97-1, G-P-C97-3 | B (gates/matcher) + A (sift pool builder, letters RULES) | canon.3 T6 |
| T3 | Engine telemetry / real-world dates / months leak into canon-facing text | HIGH | G-PREP5, G-W-C97-2, G-PR-C97-5, G-PREP2 | A (skill/template/RULES) + B (deterministic linter + validator) | — |
| T4 | Civic voice cascade + dispatch fidelity (75/25 ratio, Sonnet tier, Mayor-first injection, ESCALATION carve-out, tracker schema) | HIGH | G-R1, G-R2, G-PREP8, G-PREP9, G-R3, G-R4 | A (skill + agent RULES) | civic.14 (trackerOwner half) |
| T5 | FLUX race-default + DJ doesn't look up canon appearance | HIGH | G-PR-C97-2, G-PR-C97-3, G-PR-C97-4, G-PR-C97-6 | A (DJ RULES + model eval) + B (`--slug` regen path) | — |
| T6 | maraJsonReport.js `process` shadow crashes Arbiter lane | HIGH | G-W-C97-3 | B | — |
| T7 | **Operator scope directive — strip civic-initiative apparatus to Baylight; engine/sim bugs ARE the lead story** | DIRECTION | G-R5, G-S6, G-S7 | A (sift triage branch + city-hall roster scope) | pipeline.38 (engine-errors-as-news) |
| T8 | Sift/tracker data hygiene — stale Initiative_Tracker MCP, recycled-seed noise, synthesized briefs, Foothill neighborhood fence | MED | G-S3, G-S4, G-S5, G-W-C97-4 | B (deck/tracker writeback) + A (sift canon-fence) | civic.14 (tracker writeback) |
| T9 | Photo QA autonomy-blocker — Haiku credit exhaustion returns silent per-image ERROR | MED | G-PR-C97-1 | B (loud HALT state) | — |

LOW / moot / already-resolved / operator-execution items in §Already-Addressed and §Out-of-Scope. G-PREP1 (Mara cross-check skipped — operator execution, no skill change), G-PREP3/4 (dispositioned in-log), G-P-C97-2 (card-failure mis-keyed cycle, LOW), G-P-C97-3 (latent stub-card question) routed below.

---

## Track A — research-build (apparatus: skills, agent RULES, docs, canon, DJ)

Each phase is one focused research-build session. After skill-text edits run `/reload-skills` per TERMINAL.md §Skill Iteration.

### Phase RB-1: Sift story-promotion branch + civic-initiative scope strip (Themes T7, T1-media-half) — HIGHEST LEVERAGE, OPERATOR DIRECTIVE

The cycle's biggest reframe, twice-stated by Mike (S256): (a) the civic-initiative cascade (OARI, Transit, apprenticeship, Stab Fund, Health Center + council/faction/tracker theater) is layered apparatus, does not resonate in the sim, and **should not generate edition stories** — Baylight stays (it reshapes the physical world). (b) An engine bug that surfaces in citizen-visible data (the Mayor "retired") is NOT a thing to suppress — it's the FRONT PAGE; the in-world story (Mayor publicly corrects the record) is how the world heals the bug and justifies the card correction.

- **Files:**
  - `.claude/skills/sift/SKILL.md` — modify
  - `.claude/skills/city-hall-prep/SKILL.md` — modify (roster scope)
- **Steps:**
  1. sift triage: add a decision branch — engine-bug/anomaly visible in citizen data → **promote as in-world story** (character speaks on it), flag the card/state for correction justified by the published story. Do NOT default such events to suppress/fence/contamination. (G-S6)
  2. sift scope: edition stories come from engine/sim output (citizen-life incl. bugs, A's feed, neighborhood crime/sentiment, festivals/faith, Baylight, illness/migration) — NOT the civic-initiative apparatus. Stop standing up/surfacing OARI/Transit/apprenticeship/Stab/Health features. (G-S7)
  3. city-hall-prep: roster scope reduces to Baylight + whatever genuinely touches citizen/district life; do NOT stand up OARI/INIT-007/Transit/Stab/Health voices next cycle. (G-R5)
- **Verify:** grep both SKILLs for the new branch + scope language; confirm no remaining instruction to generate the named civic initiatives as features.
- **Source gaps:** G-S6, G-S7, G-R5. **Absorbs ROLLOUT:** pipeline.38 (engine-errors-as-news editorial-direction note — step 1 is its implementation; flip to done-pending-archive when RB-1 closes). **Status:** [ ] not started

### Phase RB-2: Citizen-bearing accuracy gate — sift pool builder + letters-desk RULES (Theme T2, A-half) — HIGH

Mike S256: "citizen accuracy IS the product — stories are disposable." A Tier-1 codex-linked entity (POP-00004 Lucia Polito) reached a finished letter; caught only by Mike's eye. Engine-side hard gate is RB-2's ES sibling (ES-2); this phase fixes the apparatus side.

- **Files:**
  - `.claude/skills/sift/SKILL.md` — modify (candidate-pool builder)
  - `.claude/agents/letters-desk/RULES.md` + `LENS.md` — modify
- **Steps:**
  1. sift candidate-pool builder: screen pool for (a) tier + codex/Entity flag, (b) card-integrity (drop self-contradictory cards — POP-00029 shape), (c) freshness against the **live** cycle window (exclude any citizen with an edition appearance in trailing N cycles, not just the loaded-tracker range — Calvin Turner E95 leak). (G-W-C97-1 §2,§4)
  2. letters-desk RULES: enforce age = 2041 − BirthYear (never trust candidate-file age); verify role + neighborhood against the citizen card before writing (Bauer rabbi-not-pastor, Turner/Bauer age drift). (G-W-C97-1 §3)
  3. Broaden to a stated principle: every citizen-bearing output (letters, reporter cameos, quotes) carries a verify-against-card step. (G-W-C97-1 §4)
- **Verify:** dry-run sift candidate pool on C97 inputs → Polito/Turner/POP-00029 all excluded; letters RULES greps clean for the age-anchor + card-verify rule.
- **Source gaps:** G-W-C97-1. **Status:** [ ] not started

### Phase RB-3: In-world hygiene across canon-facing text — packet linter rule + templates + reporter RULES (Theme T3, A-half) — HIGH

Engine telemetry, σ, decimals, phase-codes, real-world dates, and calendar months keep leaking into canon-facing surfaces. The deterministic linters are ES-3; this phase writes the rules the linters enforce + fixes the templates.

- **Files:**
  - `.claude/skills/city-hall-prep/SKILL.md` — modify (Step 3 translation contract)
  - `docs/media/production_log_template.md` — modify (in-world cycle marker)
  - `.claude/skills/edition-print/SKILL.md` — modify (Step 0 template timestamp)
  - reporter desk `RULES.md` files — modify (months + decimals fence reinforcement)
- **Steps:**
  1. city-hall-prep Step 3: explicit rule — no metrics, σ, decimals, phase-codes, or `(engine)`/`Engine:` tags in any packet; engine state expressed only as perception. (G-PREP5)
  2. production-log + edition-print Step 0 templates: replace real-world `{timestamp}`/date/session-stamp fields with in-world cycle / SimYear-Month-Day markers — resolve the "use the template" vs "no real-world dates" conflict by making the canon-facing template in-world. (G-PREP2, G-PR-C97-5)
  3. reporter RULES reinforcement: cycles-not-months + no raw engine scores (CU2/S1/S2 month leaks, B1 decimal leak). (G-W-C97-2)
- **Verify:** templates grep clean for `{timestamp}` / `YYYY-MM-DD` in canon-facing sections; Step 3 carries the no-telemetry rule.
- **Source gaps:** G-PREP5, G-PREP2, G-PR-C97-5, G-W-C97-2. **Status:** [ ] not started

### Phase RB-4: Civic voice cascade + dispatch fidelity (Theme T4) — HIGH

The C97 inversion: voices ran ~90% civic-initiative, ~10% district life — fails the operator 75/25 bar. Plus dispatch ran on Haiku not Sonnet, prep pre-scripted the Mayor's decisions, and the ESCALATION-override collided with engine-primacy.

- **Files:**
  - `.claude/skills/city-hall-prep/SKILL.md` + `.claude/skills/city-hall/SKILL.md` — modify
  - civic-office agent `RULES.md` files (police_chief, crc, ind) — modify (tracker schema)
- **Steps:**
  1. Encode the 75/25 ratio in city-hall-prep Step 3 (packets lead 75% district life from baseline_briefs citizen-life + neighborhood events; civic decision is the 25% tail) and reinforce in the /city-hall dispatch prompts. (G-R1)
  2. Set voice subagent model tier to Sonnet at the /city-hall dispatch step. (G-R2)
  3. Cascade mechanism: /city-hall runs Mayor first, injects her **actual** output into reacting voices at runtime; prep must NOT pre-script a "Mayor's Decisions" block. (G-PREP8)
  4. ESCALATION carve-out: a Mara ESCALATION cannot override engine-primacy for a subject absent from the initiative tracker (no manufacturing civic source material for non-tracked programs). (G-PREP9)
  5. Harmonize trackerUpdates field-path schema across voice-agent RULES + require `trackerOwner`. (G-R3 — pairs with civic.14 ES half; cap milestone-note length G-R4.)
- **Verify:** SKILLs grep for 75/25 + Sonnet tier + Mayor-first injection; voice RULES carry uniform trackerUpdates shape.
- **Source gaps:** G-R1, G-R2, G-PREP8, G-PREP9, G-R3, G-R4. **Status:** [ ] not started

### Phase RB-5: DJ canon-appearance lookup + image-model evaluation (Theme T5, A-half) — HIGH

FLUX forced a Black man onto canonically-white Isley Kelley across three generations; DJ invented the race because he doesn't look up canon appearance for named subjects. Operator directive: evaluate replacing FLUX.

- **Files:**
  - `.claude/agents/dj-hartley/RULES.md` + the bundle §INSTRUCTION FOR DJ block — modify
- **Steps:**
  1. DJ RULES: for every **named** citizen in a spec, pull appearance from `lookup_citizen` before writing the subject; front-load canon race/descriptor in `image_prompt` with an explicit negative to beat the FLUX default; for crowds/generics compose to Oakland's actual demographic mix. (G-PR-C97-3, G-PR-C97-2 contract half)
  2. Scope alternative image models with race/attribute adherence as the eval axis (deliverable: a short comparison note, not a swap this session). (G-PR-C97-2)
- **Verify:** DJ RULES grep for the named-subject lookup + front-load-race rule.
- **Source gaps:** G-PR-C97-2, G-PR-C97-3. **Status:** [ ] not started

### Phase RB-6 (small): Sift canon-fence validation (Theme T8-A)

- **Files:** `.claude/skills/sift/SKILL.md` — modify
- **Steps:**
  1. sift brief canon-fence: validate any neighborhood fence against `Faith_Organizations` / `lookup_faith_org` before writing it into a voiceDirective (Foothill Baptist = East Oakland, the fence said West). (G-W-C97-4)
- **Verify:** sift greps for the canon-fence check.
- **Source gaps:** G-W-C97-4. **Status:** [ ] not started

---

## Track B — engine-sheet (substrate: engine code, scripts, parsers, sheets)

### Phase ES-1: Office-holder lifecycle-retirement misfire + real-world date strip (Theme T1) — HIGH

The engine fired a "retired" lifecycle/fame event on sitting Mayor Santana (POP-00034) the same cycle city-hall has her taking OARI citywide. Root cause lives in the lifecycle/fame system; baseline_briefs regenerated WITH the contaminant because the regen didn't fix the source.

- **Files:**
  - lifecycle/fame engine code (per [[2026-05-30-citizen-lifecycle-fame-system]]) — modify
  - `scripts/buildBaselineBriefs.js` (or the generator that emits `baseline_briefs_c<XX>.json`) — modify
- **Steps:**
  1. Lifecycle retirement roll: exempt active office-holders from the retirement roll (or fix whatever fired it) — operator investigation per G-S1 (misfire vs emergent "planning retirement" signal). This is the source fix; folds into the lifecycle-fame plan, don't double-file.
  2. Strip real-world dates ("2026-06-12") from milestone strings — in-world-only rule.
  3. Baseline-brief generator: exclude office-holder retirement life-events (or rely on the source fix) — deleting the artifact without fixing the generator is not a fix (the C97 regen proved it). (G-S2)
- **Verify:** re-run baseline-brief generation on C97 inputs → no Mayor-retirement brief; no real-world date in any milestone string.
- **Source gaps:** G-S1, G-S2. **Absorbs/relates:** [[2026-05-30-citizen-lifecycle-fame-system]]. **Status:** [ ] not started

### Phase ES-2: Deterministic citizen-eligibility + packet linter gates (Themes T2-engine, T3-linter) — HIGH

The catch must be mechanical — the operator is the contamination source, so self-policing can't be the gate.

- **Files:**
  - the citizen-selection-surface gate (sift candidate build / letters selection path) — modify
  - a packet linter at the city-hall-prep Step-4 gate — create
  - duplicate-citizen matcher `scripts/ingestPublishedEntities.js` — modify
- **Steps:**
  1. Eligibility gate: Tier-1 AND codex-linked/Entity-flagged citizens are HARD-INELIGIBLE for letters + incidental cameos; fail loud, not silent include. (G-W-C97-1 §1)
  2. Packet linter at Step-4: grep packets for σ, `+0.`, backtick phase-codes, `engine`/`Engine:` tags → fail the gate. (G-PREP5 ES half)
  3. ingestPublishedEntities matcher: normalize honorific + middle-name truncation (`Dr./Rev./Bishop <First> <Middle?> <Last>` match full + last-name-anchored before append; hit canon-drift path when a bay-tribune person-record exists). Then merge POP-01021 → POP-00781 and delete the POP-01021 row. (G-P-C97-1)
- **Verify:** gate run → POP-00004 ineligible; linter flags a telemetry-laced test packet; `lookup_citizen` POP-01021 → not found, POP-00781 intact.
- **Source gaps:** G-W-C97-1 §1, G-PREP5, G-P-C97-1. **Status:** [ ] not started

### Phase ES-3: Pre-compile leak scan + maraJsonReport crash fix (Themes T3-validator, T6) — HIGH

- **Files:**
  - `scripts/maraJsonReport.js` — modify
  - the edition pre-compile validator (`scripts/validateEdition.js` or sibling) — modify
- **Steps:**
  1. maraJsonReport.js: rename the local `const process = Number(...)` shadow (e.g. `processScore`) OR capture `const { REVIEWER_MODEL } = globalThis.process.env` before the shadow. Unblocks the Mara lane JSON → Final Arbiter result-validity. (rheaJsonReport.js line 202 has the same `.env` read but no shadow — leave it.) (G-W-C97-3)
  2. Pre-compile scan: month-name regex + decimal-near-"sentiment" regex over reporter prose so Step 2 isn't the only catch. (G-W-C97-2 validator half)
- **Verify:** `node scripts/maraJsonReport.js <c97 inputs>` exits 0 with REVIEWER_MODEL populated; scan flags "November dusk" + "sentiment sits above 0.71" test strings.
- **Source gaps:** G-W-C97-3, G-W-C97-2. **Status:** [ ] not started

### Phase ES-4: Story-deck + tracker-writeback hygiene (Theme T8-B) — MED

- **Files:**
  - the Story_Seed_Deck generator — modify
  - Initiative_Tracker writeback path — modify
  - `buildCitizenCards.js` — modify (cycle-resolution)
- **Steps:**
  1. Deck generator: age out / cap recycled storyline-followups (C97 was 71% recycled); gate Chicago/Bulls seeds on live sports-feed presence (8 Chicago seeds had zero live-canon backing). (G-S3)
  2. Tracker writeback: INIT-002/INIT-007 MCP layer lags the milestone + city-hall layer — reconcile so `lookup_initiative` matches the authoritative milestone/city-hall state. (G-S4 — pairs with civic.14)
  3. Prefer ledger-sourced descriptions; flag `synthesized` ones more loudly. (G-S5)
  4. buildCitizenCards.js: derive the failure-dump cycle from the run's cycle (C97 run wrote `citizen_card_failures_c96.json`). (G-P-C97-2)
- **Verify:** deck regen on C97 → recycled share capped, Chicago seeds gated; `lookup_initiative(INIT-007)` no longer "untracked"; failure dump named for the run cycle.
- **Source gaps:** G-S3, G-S4, G-S5, G-P-C97-2. **Status:** [ ] not started

### Phase ES-5 (small): Single-spec edition regen path + photo-QA loud HALT (Themes T5-B, T9) — MED

- **Files:**
  - `scripts/generate-edition-photos.js` — modify
- **Steps:**
  1. Honor `--slug <s>` as a spec filter for `--type edition` — regenerate only the matching spec, merge its entry into the existing manifest (no full-manifest clobber). Natural fix path for canon corrections caught at Step 3.5. (G-PR-C97-4)
  2. Surface credit-exhaustion / all-ERROR QA as a distinct loud failure state that HALTs for operator (not silent per-image ERROR rows that read like "no FAILs → proceed"); document FLUX/Together vs Anthropic/Haiku separate billing. (G-PR-C97-1)
- **Verify:** `generate-edition-photos.js --type edition --slug <one>` rewrites one spec + merges manifest, leaves the other 6 frames untouched; simulated all-ERROR QA → HALT, not PROCEED.
- **Source gaps:** G-PR-C97-4, G-PR-C97-1. **Status:** [ ] not started

---

## Cross-track dependencies

- **T1 (ES-1)** is the source fix for the Mayor-retirement contaminant; **RB-1 step 1** (sift story-promotion branch) is the *media response* to the same event — they're complementary, not blocking. RB-1 ships the "promote engine bugs as in-world stories" branch regardless of when ES-1 lands.
- **T2 gate** splits: ES-2 step 1 is the hard deterministic eligibility gate (engine); RB-2 is the pool-builder screen + letters RULES. Both needed — the gate is the backstop, the screen is the first line.
- **T3 linter** splits: RB-3 writes the rules; ES-2 step 2 + ES-3 step 2 are the deterministic enforcers.
- **T8 tracker**: ES-4 step 2 + the civic.14 trackerOwner half (RB-4 step 5) both touch tracker fidelity — coordinate so the writeback schema and the owner-dispatch agree.

---

## Already-addressed / dispositioned in-log (no phase)

- **G-PREP1** — Mara cross-check skipped 5 runs: operator-execution failure, the requirement is already explicit, no skill change. Execution discipline, not a backlog item.
- **G-PREP3** — INIT-007 Scenario A/B: dispositioned as Scenario A this run; the disambiguation tool flagging both is by design.
- **G-PREP4** — ROLLOUT pull removed from city-hall-prep skill (civic terminal doesn't touch ROLLOUT): recorded, done.
- **G-PR-C97-6** — FLUX signage gibberish: known text-rendering ceiling, subsumed by the model-replacement eval in T5/RB-5.
- **G-W-C97-1 resolution** — the C97 slate was scrapped + regenerated with 3 verified fresh citizens (operator-side, manual). The *fix* (gates) is RB-2 + ES-2; the cycle's content is already clean.
- **canon.3 T6 (pre-existing row)** — `buildCitizenCards.js` exits 0 on partial failure; tracked under canon.3, not re-filed here.
- **G-P-C97-3** — the "genuinely-new civic-persona with 0 quotes" scenario is moot: the trigger (POP-01021 "Dr. Tran-Muñoz") was an **engine error** — a duplicate minted off a truncated name (Mike S257). There is no mechanism that spawns a real new civic office, so no stub-card policy is needed. The real fix is the dedup/matcher in **ES-2 step 3** (merge POP-01021→POP-00781 + honorific/middle-name truncation normalization). G-P-C97-3 closes there; no separate phase.

## Open questions

None. (The stub-card question was retired S257 — its triggering scenario was an engine duplicate, not a real new persona; see §Already-Addressed.)

---

## Changelog

- 2026-06-13 — Initial draft (S257, research-build). Three C97 gap logs (run-cycle 23 gaps, print 6, post-publish 3) clustered into 9 themes across two tracks per [[GAP_LOG_TRIAGE_PLAYBOOK]]. Two operator scope directives (T7 strip-civic-initiatives, T1 promote-engine-bugs-as-stories) lead the research-build track. Lifecycle-fame root cause folded by reference to its existing plan, not double-filed.
