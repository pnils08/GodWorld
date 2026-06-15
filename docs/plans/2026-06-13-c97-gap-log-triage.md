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

**Architecture:** Three C97 sidecar gap logs (run-cycle, print, post-publish) clustered by root cause into themes (§Cluster Map) and routed to the terminal whose expertise owns each fix. Two themes are **operator editorial directives**, not bugs (T7 citizens-are-the-main-characters, T1 lifecycle-misfire-becomes-story) — they reshape edition story-selection, so they lead. **T7 corrected by Mike S257:** the S256 gap-log wording ("strip civic initiatives" / "75/25 ratio") is retracted — civic initiatives still generate and ingest to the engine; the only fix is editorial story-selection (citizens are the protagonist, civic-initiative material is background, not auto-front-page). Correlated open ROLLOUT rows are folded by reference (forward task only). The dominant signal of C97: **citizen accuracy is the product, stories are disposable** (Mike S256) — every citizen-bearing surface needs an accuracy gate; that thread runs through T2, T3, T6.

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
4. The two operator editorial directives (T1 story-promotion branch, T7 citizens-are-the-main-characters story-selection) are captured as phases, not buried as notes — they gate next cycle's edition story-selection. No "strip" and no numeric ratio (Mike S257 correction).

---

## §Cluster Map — gaps → themes → track → folds

Severity = highest constituent. Track = primary executor; (+other) = also has a task in the other track.

| # | Theme | Severity | Gaps | Track | Folds |
|---|-------|----------|------|-------|-------|
| T1 | Engine flipped sitting Mayor to "retired" — lifecycle misfire on office-holders + real-world date in milestone strings | HIGH | G-S1, G-S2 | B | [[2026-05-30-citizen-lifecycle-fame-system]] |
| T2 | No deterministic citizen-eligibility / card-integrity gate — Tier-1 codex entity reached a finished letter | HIGH | G-W-C97-1, G-P-C97-1, G-P-C97-3 | B (gates/matcher) + A (sift pool builder, letters RULES) | canon.3 T6 |
| T3 | Engine telemetry / real-world dates / months leak into canon-facing text | HIGH | G-PREP5, G-W-C97-2, G-PR-C97-5, G-PREP2 | A (skill/template/RULES) + B (deterministic linter + validator) | — |
| T4 | Civic voice cascade + dispatch fidelity (Sonnet tier, Mayor-first injection, ESCALATION carve-out, tracker schema) | HIGH | G-R2, G-PREP8, G-PREP9, G-R3, G-R4 | A (skill + agent RULES) | civic.14 (trackerOwner half) |
| T5 | FLUX race-default + DJ doesn't look up canon appearance | HIGH | G-PR-C97-2, G-PR-C97-3, G-PR-C97-4, G-PR-C97-6 | A (DJ RULES + model eval) + B (`--slug` regen path) | — |
| T6 | maraJsonReport.js `process` shadow crashes Arbiter lane | HIGH | G-W-C97-3 | B | — |
| T7 | **Operator editorial principle — citizens are the main characters, civic initiatives are background machinery (still generate + ingest to engine, just aren't auto-promoted to stories); engine/sim bugs visible in citizen data are story material** | DIRECTION | G-R1, G-R5, G-S6, G-S7 | A (sift story-selection lens) | pipeline.38 (engine-errors-as-news) |
| T8 | Sift/tracker data hygiene — stale Initiative_Tracker MCP, recycled-seed noise, synthesized briefs, Foothill neighborhood fence | MED | G-S3, G-S4, G-S5, G-W-C97-4 | B (deck/tracker writeback) + A (sift canon-fence) | civic.14 (tracker writeback) |
| T9 | Photo QA autonomy-blocker — Haiku credit exhaustion returns silent per-image ERROR | MED | G-PR-C97-1 | B (loud HALT state) | — |

LOW / moot / already-resolved / operator-execution items in §Already-Addressed and §Out-of-Scope. G-PREP1 (Mara cross-check skipped — operator execution, no skill change), G-PREP3/4 (dispositioned in-log), G-P-C97-2 (card-failure mis-keyed cycle, LOW), G-P-C97-3 (latent stub-card question) routed below.

---

## Track A — research-build (apparatus: skills, agent RULES, docs, canon, DJ)

Each phase is one focused research-build session. After skill-text edits run `/reload-skills` per TERMINAL.md §Skill Iteration.

### Phase RB-1: Citizens are the main characters — sift story-selection reframe + engine-bugs-as-news branch (Themes T7, T1-media-half) — HIGHEST LEVERAGE, OPERATOR DIRECTIVE

**Mike S257 (corrects the S256 gap-log wording):** *not* a strip, *not* a 75/25 ratio. Civic initiatives still generate and their voice output still **ingests to the engine** (that's canon — nothing to ration). The principle is editorial story-selection: **citizens are the main characters; civic initiatives are background machinery, not the protagonist.** The fix lives entirely in what sift promotes to an edition *story* — citizen/sim life leads; civic-initiative material is context, not auto-front-page. No change to whether the civic cascade runs or how much the voices say. The second half (b): an engine bug that surfaces in citizen-visible data (the Mayor "retired") is story material, not just a suppressed gap-log flag — fence the bogus state from being canonized as true, but a character can still speak to it ("a database glitch retired the mayor for a cycle").

- **Files:**
  - `.claude/skills/sift/SKILL.md` — modify (story-selection lens only)
- **Steps:**
  1. sift story-selection lens: citizens/sim life are the protagonists of the edition (citizen-life incl. bugs, A's feed, neighborhood crime/sentiment, festivals/faith, Baylight, illness/migration). Civic-initiative material (OARI/Transit/apprenticeship/Stab/Health + council/faction theater) is **background context, not an auto-promoted feature** — it earns a story only when a citizen is genuinely voiced in it, never as initiative-theater for its own sake. Do NOT strip generation; the cascade still runs and ingests to the engine. (reframes G-S7, G-R5)
  2. sift triage branch: engine-bug/anomaly visible in citizen data → a character can **speak to it as an in-world beat** (flag the card/state for correction justified by the published story); fence the bogus value from being canonized as true, but don't default the *event* to silent suppression. (G-S6)
- **Verify:** grep sift for the protagonist lens + the engine-bug beat branch; confirm NO "strip/do-not-generate civic initiatives" language (that was the retracted S256 wording) and NO numeric ratio rule.
- **Source gaps:** G-S6, G-S7 (reframed), G-R5 (reframed). **Absorbs ROLLOUT:** pipeline.38 (engine-errors-as-news — step 2 is its implementation; flip to done-pending-archive when RB-1 closes). **Status:** [x] DONE S258 — two additive blocks in `.claude/skills/sift/SKILL.md`: story-selection lens at Step 3 (citizens are protagonists; civic-initiative = background, slate only when a citizen is voiced; no strip, no ratio) + engine-bug-as-beat branch at Step 5 (engine bug in citizen data = story material, fence the bogus value but don't auto-suppress). Verified: lens+branch present, zero strip/do-not-generate language, zero numeric ratio. pipeline.38 → done-pending-archive.

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
- **Source gaps:** G-W-C97-1. **Status:** [x] DONE S258 — three edits: sift Step 10 candidate-pool integrity screen (tier+codex flag / card-integrity / live-window freshness); letters-desk RULES §2b citizen-card verification hard rule (age=2041−BirthYear, role/neighborhood/faith vs card, Tier-1+codex ineligible, applies to every citizen-bearing output); LENS kill-filter line (card-contradiction → correct-or-kill). Grep-verified present in all three. Live dry-run on C97 inputs runs at next `/sift`. (research-build builds the desk-agent files; media is in-world, doesn't build — Mike S258.)

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
- **Source gaps:** G-PREP5, G-PREP2, G-PR-C97-5, G-W-C97-2. **Status:** [x] DONE S258 — G-PREP5: city-hall-prep v1.6 Step 3 engine→in-world translation contract (no σ/decimals/phase-codes/`(engine)` tags; perception only). G-PREP2 + G-PR-C97-5: production_log_template + edition-print Step 0 reader-facing date stamps → in-world cycle/SimYear-Month-Day markers (template already had a separate Session(s)-running field for process-tracking + git keeps wall-clock; gap-logs keep wall-clock). Verified: zero `YYYY-MM-DD`/`HH:MM` left in production_log_template, edition-print `{timestamp}` gone. **G-W-C97-2 reporter-RULES half NOT done here — deliberately:** desk RULES already carry "No month names / Cycles only" + "Forbidden: decimal scores" (civic-desk RULES §lines 53/113); the rule exists, reporters still violate it, so the real fix is the deterministic pre-compile scan = **ES-3 (engine-sheet)**, not re-stating an existing rule across 8 desks. No desk-RULES churn.

### Phase RB-4: Civic voice cascade + dispatch fidelity (Theme T4) — HIGH

Dispatch + cascade fidelity, independent of story-selection. **G-R1 (voices ran ~90% civic-initiative) is NOT fixed here** — Mike S257: the voices saying a lot about civic initiatives is fine, it ingests to the engine; the editorial fix is in RB-1 story-selection (citizens are the protagonist), not a packet ratio. This phase keeps the genuine cascade-mechanics fixes: Haiku-not-Sonnet, prep pre-scripting the Mayor, ESCALATION-vs-engine-primacy, tracker schema.

- **Files:**
  - `.claude/skills/city-hall-prep/SKILL.md` + `.claude/skills/city-hall/SKILL.md` — modify
  - civic-office agent `RULES.md` files (police_chief, crc, ind) — modify (tracker schema)
- **Steps:**
  1. Set voice subagent model tier to Sonnet at the /city-hall dispatch step. (G-R2)
  2. Cascade mechanism: /city-hall runs Mayor first, injects her **actual** output into reacting voices at runtime; prep must NOT pre-script a "Mayor's Decisions" block. (G-PREP8)
  3. ESCALATION carve-out: a Mara ESCALATION cannot override engine-primacy for a subject absent from the initiative tracker (no manufacturing civic source material for non-tracked programs). (G-PREP9)
  4. Harmonize trackerUpdates field-path schema across voice-agent RULES + require `trackerOwner`. (G-R3 — pairs with civic.14 ES half; cap milestone-note length G-R4.)
- **Verify:** SKILLs grep for Sonnet tier + Mayor-first injection; voice RULES carry uniform trackerUpdates shape; NO 75/25 ratio rule present.
- **Source gaps:** G-R2, G-PREP8, G-PREP9, G-R3, G-R4. (G-R1 reframed → handled by RB-1 story-selection, not a ratio.) **Status:** [x] DONE S258. G-R2: city-hall Step 3 sets `model: sonnet` for ALL voice+project subagent dispatches (Steps 3–5; defaulted to Haiku). G-PREP8: city-hall-prep "does NOT include" now forbids a pre-scripted `## MAYOR'S DECISIONS THIS CYCLE` block (runtime injection at city-hall Step 3 line 151 already correct — prep was the leak). G-PREP9: added an engine-primacy carve-out onto the existing S229 ESCALATION-override rule (ESCALATION can't force a voice to speak to a subject absent from the tracker AND with no live engine signal → declines, logs reason). G-R3: canonical `trackerOwner` + four-field `trackerUpdates` + canonical-phase block added to police-chief / crc / ind RULES (baylight + okoro already had it). G-R4: MilestoneNotes ≤1-sentence/~200-char cap in INITIATIVE_TRACKER_CONTRACT §col26 (single source for all writers incl. OARI) + inline in the 3 faction blocks. city-hall-prep v1.6→v1.7. **NO 75/25 ratio added (G-R1/G-R5 retracted-S256 framing handled by RB-1 story-selection).**

### Phase RB-5: DJ canon-appearance lookup + image-model evaluation (Theme T5, A-half) — HIGH

FLUX forced a Black man onto canonically-white Isley Kelley across three generations; DJ invented the race because he doesn't look up canon appearance for named subjects. Operator directive: evaluate replacing FLUX.

- **Files:**
  - `.claude/agents/dj-hartley/RULES.md` + the bundle §INSTRUCTION FOR DJ block — modify
- **Steps:**
  1. DJ RULES: for every **named** citizen in a spec, pull appearance from `lookup_citizen` before writing the subject; front-load canon race/descriptor in `image_prompt` with an explicit negative to beat the FLUX default; for crowds/generics compose to Oakland's actual demographic mix. (G-PR-C97-3, G-PR-C97-2 contract half)
  2. Scope alternative image models with race/attribute adherence as the eval axis (deliverable: a short comparison note, not a swap this session). (G-PR-C97-2)
- **Verify:** DJ RULES grep for the named-subject lookup + front-load-race rule.
- **Source gaps:** G-PR-C97-2, G-PR-C97-3. **Status:** [x] DONE S258 (step 1) — dj-hartley RULES §Named-Subject Canon Appearance: every named citizen → `lookup_citizen` before writing the subject; front-load canon race/age/build with an explicit negative to beat the FLUX default; no-appearance-on-file → compose face non-load-bearing or escalate; crowds → Oakland demographic mix. Twin of letters RULES §2b. **Step 2 (image-model eval) FILED as research watch-row** (G-PR-C97-2) — replacing FLUX needs a current-model comparison on race/attribute adherence, a focused research pass, not a rushed note; row added to ROLLOUT research.*.

### Phase RB-6 (small): Sift canon-fence validation (Theme T8-A)

- **Files:** `.claude/skills/sift/SKILL.md` — modify
- **Steps:**
  1. sift brief canon-fence: validate any neighborhood fence against `Faith_Organizations` / `lookup_faith_org` before writing it into a voiceDirective (Foothill Baptist = East Oakland, the fence said West). (G-W-C97-4)
- **Verify:** sift greps for the canon-fence check.
- **Source gaps:** G-W-C97-4. **Status:** [x] DONE S258 — sift Step 7 Validation rules gained a canon-fence check: any neighborhood/geographic fence about a named faith org / business / cultural venue MUST be verified against `lookup_faith_org` / `lookup_business` / `lookup_cultural` before it's written, never asserted from memory.

---

**RB TRACK COMPLETE (S258): RB-1..6 all shipped.** Commits: RB-1 `3e8731b`, RB-2 `0ff2789`, RB-3 `9309e77`, RB-4 `ea8415e`, RB-5+RB-6 `0bfba5d`.

**ES TRACK — S259 reconciliation (research-build, git-verified):** engine-sheet shipped most of Track B in S257; the plan's per-phase `[ ] not started` markers were wholesale stale. Verified state: **ES-3 DONE** (`6a0d904`+`d0a8bbf`); **ES-5 DONE** (`a9cd061`); **ES-2 code DONE + wired** (`e40bb21`+`2361cfc`+`6033c26`+`f987211`) — destructive POP-01021→POP-00781 merge HELD for Mike's go; **ES-1 PARTIAL** (`9b769ce` step 1 only; steps 2+3 open; clasp-deploy deferred post-C98); **ES-4 PARTIAL** (`e690aa2`+`f5b0fbd` steps 3+4; steps 1+2 = G-S3 deck / G-S4 tracker writeback open). **Genuine ES residual:** ES-1 steps 2+3 + ES-4 steps 1+2 + the ES-2 held merge (operator) + ES-1 clasp deploy. governance.34 **stays in-progress** for that residual.

**Skill-wiring of the ES-2 gates — DONE S259 (research-build).** ES-2 built the two deterministic scripts (S257) but flagged "WIRING into the skills surfaced separately" — that wiring is apparatus (skill edits) = research-build, executed S259:
- `scripts/checkLetterEligibility.js` → sift Step 10 (after the candidate-pool emit; `node … {XX}`, exit 1 = HALT). Verified firing on live c97 candidates: POP-00004 caught INELIGIBLE, exit 1.
- `scripts/lintCivicPackets.js` → city-hall-prep Step 4 (before voice dispatch). Verified: all 7 c97 workspace packets clean.
- **Flag back to engine-sheet (substrate path bug):** `lintCivicPackets.js` `resolveFiles` bare-`<cycle>` mode globs top-level `output/pending_decisions*.md`, but prep writes packets to `output/civic-voice-workspace/*/current/pending_decisions.md` — the `<cycle>` form finds zero files. Wired via a `--file` loop as the stopgap (uses the validated `lintText` path); engine-sheet should point `resolveFiles` at the workspace glob so the documented `<cycle>` usage works.

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
- **Source gaps:** G-S1, G-S2. **Absorbs/relates:** [[2026-05-30-citizen-lifecycle-fame-system]]. **Status:** [~] PARTIAL — **step 1 DONE S257** (`9b769ce`): `generationalEventsEngine.checkRetirement_` CIV guard (no office-holder/media citizen auto-retires) + AGE_RANGES.RETIREMENT.min 58→68; live cleanup blanked the stray [Retirement] tag on POP-00034. **Step 2 card-display half DONE S259** (`187ce9b`, Node-only, no clasp): citizen cards anchor milestones on the in-world Cycle (`C81 [Death]` from the archive Cycle col) + strip the real-world date from live-O lines — full-population dry-run = zero real-world dates beside any milestone tag; dedup made prefix-robust. **Step 2 engine-side half DEFERRED (clasp, rides C98):** `applyMilestone_` still stamps `yyyy-MM-dd HH:mm` into the col-O *string* (engine-internal; card no longer surfaces it) — change to write `C{cycle}` so live O carries the anchor too. **Step 3 (baseline-brief office-holder exclusion) OPEN** — needs a check first: `generateBaselineBriefs.js` reads LifeHistory_Log (not col O), so confirm whether it still emits the retired-Mayor brief now the source roll is fixed before adding a guard. Election-challenger-from-SL deferred (B) per Mike, working-as-designed stub.

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
- **Source gaps:** G-W-C97-1 §1, G-PREP5, G-P-C97-1. **Status:** [x] CODE DONE S257 + wired S259 — **one operator action pending.** Step 1 field-actor letter-eligibility gate `scripts/checkLetterEligibility.js` (`e40bb21`); step 2 civic packet telemetry linter `scripts/lintCivicPackets.js` (`2361cfc`); step 3 matcher — honorific-strip + last-name-anchored dedup in `ingestPublishedEntities` resolveCitizens (`6033c26`). **Gate-wiring into sift Step 10 + city-hall-prep Step 4 DONE S259** (`f987211`; see Track A §Skill-wiring note — POP-00004 caught INELIGIBLE on live c97, exit 1). **MERGE KILLED — FALSE POSITIVE (Mike S259, ledger-verified).** The matcher's claim "POP-01021 'Dr. Tran-Muñoz' = POP-00781 Dr. Vanessa Tran-Muñoz" is wrong three ways: POP-01021 (role Community Organizer, Downtown, status `pending`) and POP-00781 are **different citizens**, and POP-00781 is not even the OARI Director — `queryLedger.js citizen POP-00781` returns **"Vanessa Treary," a Tier-4 barista in Lake Merritt** (income $30,732, 2 kids). The held merge would have collapsed two unrelated citizens into a barista's row. **Do NOT merge.** The matcher needs the inverse guard: honorific-stripped last-name anchoring auto-matched across *non-matching* surnames (Treary ≠ Tran-Muñoz) / appended a title-only name — it must require corroborating fields before proposing a merge, and must never target a row whose name doesn't actually share the anchored surname. Reframed as **ENGINE_REPAIR Row 29** (engine-sheet). The false-positive ALSO surfaced two generation/ingest bugs visible in POP-01021 → **ENGINE_REPAIR Row 30**.

### Phase ES-3: Pre-compile leak scan + maraJsonReport crash fix (Themes T3-validator, T6) — HIGH

- **Files:**
  - `scripts/maraJsonReport.js` — modify
  - the edition pre-compile validator (`scripts/validateEdition.js` or sibling) — modify
- **Steps:**
  1. maraJsonReport.js: rename the local `const process = Number(...)` shadow (e.g. `processScore`) OR capture `const { REVIEWER_MODEL } = globalThis.process.env` before the shadow. Unblocks the Mara lane JSON → Final Arbiter result-validity. (rheaJsonReport.js line 202 has the same `.env` read but no shadow — leave it.) (G-W-C97-3)
  2. Pre-compile scan: month-name regex + decimal-near-"sentiment" regex over reporter prose so Step 2 isn't the only catch. (G-W-C97-2 validator half)
- **Verify:** `node scripts/maraJsonReport.js <c97 inputs>` exits 0 with REVIEWER_MODEL populated; scan flags "November dusk" + "sentiment sits above 0.71" test strings.
- **Source gaps:** G-W-C97-3, G-W-C97-2. **Status:** [x] DONE S257 — step 1 maraJsonReport `process`-shadow renamed → `processRatio` (returned field unchanged; unblocks Mara lane → Final Arbiter) (`6a0d904`); step 2 `checkInWorldLeaks(editionText)` pre-compile scan — month-name + decimal-near-sentiment regex, WARNING severity, editorial-content-only split (`d0a8bbf`). Both steps shipped; node scripts, no clasp gate.

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
- **Source gaps:** G-S3, G-S4, G-S5, G-P-C97-2. **Status:** [~] PARTIAL S257 — **steps 3+4 DONE:** step 3 G-S5 synthesized world-event briefs flagged louder (`e690aa2`; ledger-sourced rawDesc already preferred); step 4 G-P-C97-2 `buildCitizenCards` failure-dump keys off LIVE World_Config cycleCount (was writing `_c96` on the C97 run) (`f5b0fbd`). **Steps 1+2 NOT started:** step 1 G-S3 (deck recycled-followup cap — C97 was 71% recycled — + Chicago/Bulls seed gating on live sports-feed presence); step 2 G-S4 (Initiative_Tracker MCP writeback reconcile — INIT-002/007 lag the milestone layer; pairs with civic.14).

### Phase ES-5 (small): Single-spec edition regen path + photo-QA loud HALT (Themes T5-B, T9) — MED

- **Files:**
  - `scripts/generate-edition-photos.js` — modify
- **Steps:**
  1. Honor `--slug <s>` as a spec filter for `--type edition` — regenerate only the matching spec, merge its entry into the existing manifest (no full-manifest clobber). Natural fix path for canon corrections caught at Step 3.5. (G-PR-C97-4)
  2. Surface credit-exhaustion / all-ERROR QA as a distinct loud failure state that HALTs for operator (not silent per-image ERROR rows that read like "no FAILs → proceed"); document FLUX/Together vs Anthropic/Haiku separate billing. (G-PR-C97-1)
- **Verify:** `generate-edition-photos.js --type edition --slug <one>` rewrites one spec + merges manifest, leaves the other 6 frames untouched; simulated all-ERROR QA → HALT, not PROCEED.
- **Source gaps:** G-PR-C97-4, G-PR-C97-1. **Status:** [x] DONE S257 (`a9cd061`) — step 1 `--slug` now filters `--type edition` to one matching spec + merges its manifest entry (no full clobber; the Kelley canon fix's backup/restore dance is gone); step 2 all-ERROR / credit-exhaustion QA surfaced as a distinct loud HALT state (was silent per-image ERROR rows reading like a pass). Both steps shipped; node script, no clasp gate.

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

- 2026-06-13 — Initial draft (S257, research-build). Three C97 gap logs (run-cycle 23 gaps, print 6, post-publish 3) clustered into 9 themes across two tracks per [[GAP_LOG_TRIAGE_PLAYBOOK]]. Lifecycle-fame root cause folded by reference to its existing plan, not double-filed.
- 2026-06-14 — T7 corrected (Mike S257). Retracted the S256 gap-log wording "strip civic-initiative apparatus" and the 75/25 ratio (RB-4 step 1) — both were a misread. Civic initiatives still generate and ingest to the engine; the real principle is editorial: **citizens are the main characters, civic initiatives are background, not auto-promoted to stories.** RB-1 reframed from scope-strip to sift story-selection lens (no city-hall roster strip); RB-4 drops the ratio step, keeps the cascade-mechanics fixes; G-R1 rerouted to RB-1. Engine-bugs-as-news branch (G-S6/pipeline.38) unchanged.
