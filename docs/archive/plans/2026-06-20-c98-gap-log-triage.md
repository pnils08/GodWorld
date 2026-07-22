---
title: C98 Gap-Log Triage & Remediation Plan
created: 2026-06-20
updated: 2026-06-20
type: plan
tags: [governance, architecture, active]
sources:
  - output/production_log_run_cycle_c98_gaps.md (run-cycle: G-EC / G-RC / G-PREP / G-R / G-S / G-W legs)
  - output/production_log_c98_print_gaps.md (print: G-PR-C98-*)
  - output/production_log_c98_post_publish_gaps.md (post-publish: G-P-C98-*)
  - docs/plans/GAP_LOG_TRIAGE_PLAYBOOK.md (the 8-step method this executes)
  - docs/plans/2026-06-13-c97-gap-log-triage.md (governance.34 — prior cycle, structural template)
pointers:
  - "[[engine/archive/ROLLOUT_PLAN]] — parent rollout (governance.41 single pointer row)"
  - "[[GAP_LOG_TRIAGE_PLAYBOOK]] — method"
  - "[[2026-06-01-initiative-tracker-contract]] — civic.14, where the trackerUpdates cluster folds"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered same commit"
---

# C98 Gap-Log Triage & Remediation Plan

**Goal:** Convert the C98 production gap logs (~60 gaps across run-cycle / print / post-publish) into one phased, two-track remediation plan that research-build and engine-sheet execute, with every gap routed, folded, watched, or scoped-out — nothing left on the shelf to compound.

**Architecture:** Per [[GAP_LOG_TRIAGE_PLAYBOOK]]: read all three logs in one head, cluster by root cause (not by source skill), route each theme to the terminal whose expertise owns the fix (research-build = skill/agent/doc/canon text; engine-sheet = engine code/scripts/parsers/validators), fold correlated open ROLLOUT rows forward (point, don't restate), and file ONE `governance.41` pointer row. The HIGH trackerUpdates-conformance cluster folds into **civic.14** (Phases 2–3, now unblocked) — these C98 gaps are its concrete acceptance cases. The OpenAI 3-tier memory proposal is pulled OUT to its own research file (strategic input, not a gap-fix).

**Terminal:** research-build (triage author + RB track) / engine-sheet (ES track)

**Pointers:**
- Prior cycle: [[2026-06-13-c97-gap-log-triage]] (governance.34)
- Folds into: [[2026-06-01-initiative-tracker-contract]] (civic.14), [[engine/archive/ENGINE_REPAIR]] / engine.8 / engine.35 / engine.29 / pipeline.13 / pipeline.37
- Strategic input split-out: `docs/research/2026-06-20-layered-memory-architecture.md` (research row, see §Strategic Input)

**Acceptance criteria:**
1. Every C98 gap appears exactly once in this plan — in a phase, a fold, the watch bucket, or out-of-scope. No orphans.
2. Each phase names exact files, concrete steps, a verify command, and `Source gaps:` / `Absorbs ROLLOUT:` lines.
3. One `governance.41` row in ROLLOUT pointing here; plan registered in `docs/index.md` same commit.

---

## Cluster Map

| Theme | Severity | Constituent gaps | Track | Folds / ties |
|-------|----------|------------------|-------|--------------|
| T1 — Voice-agent trackerUpdates conformance | HIGH | G-R1, G-R2, G-R3, G-PREP1, G-PREP2, G-PREP3 | **fold → civic.14** | civic.14 Phase 2 (validator + voteCycle stamp + drift-tolerance) + Phase 3 (agent RULES enforcement + tracker-advance scripts) |
| T2 — Drive OAuth token recurrence | HIGH | G-W (saveToDrive invalid_grant) | ES (ES-1) | reopens G-W5 (governance.33 "RESOLVED-permanent" S256 regressed 4 days later) |
| T3 — Parser/validator brittleness | HIGH | G-W (byline "By"), G-W (validateEdition regex bleed) | ES (ES-2) | engine.8 lib class |
| T4 — Post-publish intake robustness | HIGH | G-P-C98-1 (sentinel hard-abort), G-P-C98-4 (stale-manifest) | ES (ES-3) | pipeline.37 |
| T5 — Sift/edition canon-fence (real-world + non-ledger leaks) | MED/HIGH | G-S2, G-W (McClymonds), G-S4, G-S3 | RB (RB-1) | candidate-integrity discipline (S256/S258) |
| T6 — Voice-agent canon-fidelity drift | LOW | G-R4, G-R5, G-R6 | RB (RB-2) | project-agent RULES + prep cascade |
| T7 — DJ photo-direction (load-bearing-text + atmospheric orphan) | MED | G-PR-C98-1, G-PR-C98-2 | RB (RB-3) + ES (ES-5) | pipeline.13 |
| T8 — Skill/agent text drift | LOW | G-W (letters legacy path), G-P-C98-2 (expected-N), G-W (capability reviewer advisories) | RB (RB-4) | — |
| T9 — Neighborhood-decay router | MED | G-RC5, G-EC18–G-EC33, G-EC43 | ES (ES-4) | engine.35 |
| T10 — Canon-ledger backfills + sports-feed taint | LOW | G-P-C98-3 (Wilson Shepard), G-RC1 (NBA taint half), G-S2 (Mateo/Dario names) | ES (ES-6) + Mike | — |
| Photo manifest sync | LOW | G-PR-C98-3 | ES (ES-5) | pipeline.13 |

**Engine header-drift (G-EC2/5–17, G-EC34–42):** fold → engine.8 sweep (orphan literals + acceptable-noise defensive fallbacks). **Exception:** G-EC3 (`StatusStartCycle`) + G-EC4 (`HealthCause`) are the **engine.29 S255 ride-along columns** referenced-but-not-yet-added to Simulation_Ledger → signal that **engine.29 Phase A deploy is pending**, route there not engine.8. G-EC2/9/10 (`TierRole`) is a separate pure orphan → engine.8.

---

## Research-Build Track

### RB-1: Sift/edition canon-fence — block real-world + non-ledger anchors at the sift layer

- **Files:**
  - `.claude/skills/sift/SKILL.md` — modify (canon-recall fence step)
  - `docs/canon/CANON_RULES.md` — read (confirm the no-fly + invention-authority pattern covers loop-bot reflections)
- **Source gaps:** G-S2 (loop-bot reflection anchors "Mateo Walker" canon-only / "Dario Vega" pure invention — both not ledger-backed), G-W (sift seeded real-but-uncanon "McClymonds High" into Quintero brief — real-world-leak vector at sift layer), G-S4 (Foothill Baptist neighborhood — verify via `lookup_faith_org` before brief; C97 mis-placed West Oakland, it is East Oakland), G-S3 (Quintero POP-00050 age-drift 23-vs-24 — resolve against ledger BirthYear at brief-time).
- **Steps:**
  1. Add an explicit sift-step rule: every citizen/institution name sourced from loop-bot nightly reflections OR from prior-edition canon-recall must pass `lookup_citizen` / `lookup_faith_org` / ledger BirthYear check BEFORE it reaches a brief. Loop-bot reflections are impressionistic, NOT a verification source.
  2. Add the real-world-institution fence: a real Oakland specific (school, church, business) surfaced by canon-recall is NOT automatically canon — flag status-TBD, keep the canon generic (e.g. "West Oakland origin") unless ledger/canon confirms the specific.
  3. Note in the skill that S256/S258 candidate-integrity discipline already caught all four C98 instances pre-brief — this phase hardens the rule into the skill text so it survives a discipline lapse, not a net-new mechanism.
- **Verify:** `grep -n "lookup_citizen\|loop-bot\|status-TBD" .claude/skills/sift/SKILL.md` → fence rules present.
- **Absorbs ROLLOUT:** none (new hardening).
- **Status:** [x] DONE S265 — sift SKILL.md v2.0.2, Step 4 provenance fence (loop-bot non-source / canon-recall not self-certifying / real-world-institution status-TBD / age-at-brief-time). CANON_RULES confirmed (no-fly + invention-authority cover the class; no edit needed). Verify grep passes.

### RB-2: Voice-agent canon-fidelity drift — name + roster fidelity in project/faction agents

- **Files:**
  - `.claude/agents/civic-project-transit-hub/RULES.md` — modify (pin name)
  - `.claude/agents/civic-project-health-center/RULES.md` — modify (no canonical-office-holder name reuse)
  - `.claude/skills/city-hall-prep/SKILL.md` — modify (inject current roster status into bloc packets)
- **Source gaps:** G-R4 (transit agent self-renamed "Elena Soria Dominguez" → "Eloise Soria-Dominguez" in 4 places), G-R5 (health agent invented "Rev. Marcus Webb" colliding with canonical Stab-Fund Director Marcus Webb — renamed Aldridge pre-lock), G-R6 (OPP/Rivers whip-read carried stale "Crane absent, 5 of 8" — Crane D6 was ACTIVE, actual 9-0).
- **Steps:**
  1. Pin "Elena Soria Dominguez" (exact spelling) in the transit-hub agent output instruction.
  2. Add a project-agent RULES note: invented supporting characters must NOT reuse canonical office-holder names (Webb, Santana, Montez, Dane, etc.) — collision risk for downstream sift/edition.
  3. In city-hall-prep, inject the current active/recovering/vacant roster status (per `.claude/rules/civic.md` §Council member status enum) into each bloc packet so whip-reads don't carry stale absence assumptions.
- **Verify:** `grep -n "Elena Soria Dominguez" .claude/agents/civic-project-transit-hub/RULES.md` → name pinned; roster-injection step present in city-hall-prep.
- **Absorbs ROLLOUT:** none.
- **Status:** [x] DONE S265 — transit-hub RULES name-pin (immutable callout); health-center RULES office-holder-collision rule (general form rides civic.14 Phase 3 to other agents); city-hall-prep v1.8 Step-3 live roster-status block (Step 1 checks, Step 3 delivers). Both verify greps pass.

### RB-3: DJ photo-direction — load-bearing-text spec-pattern + atmospheric-orphan cap

- **Files:**
  - `.claude/agents/dj-hartley/IDENTITY.md` or `RULES.md` — modify (spec-pattern + ATMOSPHERIC cap)
- **Source gaps:** G-PR-C98-1 (FLUX dropped 3 of 6 photos on legible-text negative-frame violations after full 3-attempt regen — jersey backs, lit landmark signs, commercial strips: text on the *load-bearing subject surface* that DoF/blur can't hide), G-PR-C98-2 RB-half (atmospheric vantage-point frame orphaned — no edition section to host it; DJ caps ATMOSPHERIC at 0 unless the layout exposes a host).
- **Steps:**
  1. Add the DJ spec-pattern: "never make legally-forbidden text the subject plane." For the load-bearing-text class, direct AWAY from the text surface at spec-time — sports = crowd/stadium-exterior/field-action with no jersey backs; landmark atmospheric = dock+water+sky excluding the sign; commercial strip = architecture/sky/foot-traffic with storefronts out of frame. Composition-suppression (blur/distance/crop) only works for *peripheral/environmental* text.
  2. Cap ATMOSPHERIC specs at 0 unless the compiled edition exposes a host section (pairs with ES-5 placement option). Note: regen-on-fail re-rolls the same prompt and burns 2 extra renders for zero saves on this class — recommend gating regen-off for it (coordinate with ES-5).
- **Verify:** `grep -n "load-bearing\|subject plane\|ATMOSPHERIC" .claude/agents/dj-hartley/*.md` → spec-pattern + cap present.
- **Absorbs ROLLOUT:** partial-feeds pipeline.13 (DJ-direction layer) — note forward, don't restate.
- **Status:** [x] DONE S265 — dj-hartley RULES: "Load-Bearing Text — Direct AWAY at Spec Time" (jersey-backs/lit-signs/commercial-strips → recompose off the text plane) + "Atmospheric Frames — Cap at Zero Without a Host" (regen-off for both classes). **Open Q resolved DJ-cap-at-source** (see §Open questions) — ES-5 must NOT also host orphans. Verify grep passes.

### RB-4: Skill/agent text drift — letters path, expected-N formula, capability advisories

- **Files:**
  - `.claude/agents/letters-desk/IDENTITY.md` + `RULES.md` — modify (kill legacy desk-output default)
  - `.claude/skills/post-publish/SKILL.md` — modify (Step 5 expected-N formula)
  - `.claude/skills/write-edition/SKILL.md` or capability-reviewer agent — modify (advisory-noise note)
- **Source gaps:** G-W routing (letters-desk wrote `output/desk-output/letters_c98.md` despite instruction for `output/letters/c98_letters.md` — IDENTITY/RULES carry legacy default), G-P-C98-2 (Step 5 `--expected N` formula `matched+candidates+ambiguous+phantom+appended` excludes the canon-drift bucket → off-by-one; correct value = parser's total parsed-row count, canon-drift IS a parsed row), G-W reviewer-handoff LOW (capability reviewer 3 recurring advisory false-positives: canon-names-not-invented grabs headline fragments, article-length-balance reads body-merge concatenation, names-index-completeness expects per-article index vs edition-level NAMES INDEX).
- **Steps:**
  1. Update letters-desk IDENTITY + RULES to default the write path to `output/letters/c{XX}_letters.md`; drop the `output/desk-output/` legacy default.
  2. Fix post-publish Step 5 expected-N: state "use the parser's total parsed-row count (canon-drift rows included), not the sum of resolution buckets."
  3. Document the 3 capability-reviewer advisory false-positive classes as known-non-blocking so they stop reading as findings each cycle.
- **Verify:** `grep -n "output/letters/" .claude/agents/letters-desk/*.md` → new default; expected-N note in post-publish SKILL.
- **Absorbs ROLLOUT:** none.
- **Status:** [x] DONE S265 — letters-desk RULES+IDENTITY pinned to `output/letters/c{XX}_letters.md` (desk-output legacy default killed); post-publish Step 5 expected-N = parser total parsed-row count (canon-drift IS a row, no bucket-sum); capability-review v1.1 §Known advisory false-positives (3 classes, durable re-scope → engine-sheet). Both verify greps pass.

---

## Engine-Sheet Track

### ES-1: Drive OAuth token recurrence — investigate WHY a Production-status token revokes

- **Files:**
  - `scripts/saveToDrive.js` — read (getAuth L140-152, OAuth2 user creds path)
  - `scripts/reauthorizeDrive.js` — read (the re-mint flow that already failed to hold)
- **Source gaps:** G-W INFRA BLOCKER (saveToDrive → `invalid_grant` at Step 5; `GOOGLE_REFRESH_TOKEN` expired/revoked; SA reads work because it's a different credential).
- **Critical framing:** governance.33 logged this "fixed permanently" S256 via consent-screen Testing→Production promotion (claude-mem 29720/30163) — it **regressed 4 days later**. The phase is **investigate why a Production-status refresh token still expires/revokes**, NOT re-mint. Re-mint is the workaround that already failed; if this phase just re-mints, ES repeats the failed fix. Candidate causes to rule in/out: 7-day refresh-token expiry on unverified OAuth apps, scope/consent mismatch, app still effectively in Testing despite the promotion, single-token-per-client rotation.
- **Steps:**
  1. Read `saveToDrive.js` getAuth + `reauthorizeDrive.js`; confirm the exact credential and grant type in use.
  2. Determine the actual revocation cause (OAuth app verification status, refresh-token lifetime policy for the app's publishing state) — this is the deliverable, not a token.
  3. Propose a durable fix matched to the cause (service-account-with-domain-delegation for Drive writes if user-OAuth refresh can't be made permanent; or complete OAuth app verification). Re-mint to unblock the next cycle is fine AS a stopgap, flagged as such.
- **Verify:** root-cause documented; `node scripts/saveToDrive.js --test` round-trips after the durable fix.
- **Absorbs ROLLOUT:** **reopens G-W5** (governance.33 closed it as permanent; flip the governance.33 G-W5 note to regressed-see-governance.41-ES-1).
- **Status:** [x] DONE S265 (Mike-driven console session). **ROOT CAUSE — hypothesis reversed by live evidence:** the consent screen is **"In production"** (NOT Testing), External, scope `drive.file` (non-sensitive → no verification required) — so the 7-day Testing-mode refresh-token expiry I suspected does NOT apply to tokens minted now. Reconcile with "died 4 days after the S256 promotion": a refresh token's expiry policy is fixed at **mint time**, so the dead token was minted during/before the Jun-14/15 Testing→Production flip and carried the old 7-day clock — S256's promotion was the correct durable fix, it just couldn't rescue an already-minted Testing-era token. **FIX APPLIED:** re-minted cleanly under In-production (`reauthorizeDrive.js`, against the Mags Drive Writer client `559534329568-53ue…m1m39` = the live `.env` client); `saveToDrive.js --test` round-trips (create+delete). **TIME-TEST (the real proof):** token minted **2026-06-20**; if it survives past **2026-06-27** the permanent fix is confirmed. **CLEANUP (Mike go-call):** project had 4 OAuth clients; deleted the 2 relic Desktop clients (Desktop client 2 `3neq` = past localhost:8888 experiment, Desktop client 3 `an7v` = ID pasted in scratch sheet `z_Sheet4`), KEPT **Mags Drive Writer** (live) + **Apps Script** (osvi — the engine's Apps Script OAuth client; **measure-twice corrected my earlier "optional delete" — it is load-bearing, NOT a stray**). Deletes restorable 30 days; Drive write re-verified post-cleanup. **Residual (optional, harmless):** `.claude/settings.local.json` carries a frozen allowlist string referencing the deleted `3neq` client — dead reference, no effect. **G-W5 reopened→addressed.**

### ES-2: Parser/validator brittleness — byline "By" false-match + council regex bleed

- **Files:**
  - the byline parser (`^By\s+` detection — likely `lib/` or `scripts/` write-edition compile path) — modify
  - `scripts/validateEdition.js` (council faction/district regex `Name[^.]*?\b(D\d|OPP|CRC|IND)\b`) — modify
- **Source gaps:** G-W parser HIGH (sentence-initial "By next cycle, Fruitvale…" captured as a chunk byline → Contract-B strict counter rejected lowercase → "1 byline for 2 CULTURE rows" throw; recurs whenever a body paragraph opens with "By"), G-W validator HIGH (faction/district regex `[^.]*?` scanned across newline-separated period-less CUL + NAMES INDEX lines until it hit bare `D7`/`CRC` tokens → 26 false-positive CRITICALs).
- **Steps:**
  1. Byline parser: require the ` | ` bureau form for a byline match (not bare `^By`), OR add a compile-time lint for body-initial "By" so the prose reword isn't a per-cycle manual fix.
  2. validateEdition: bound the faction/district match to a single line/sentence, not `[^.]*?` across a period-less list block.
- **Verify:** craft a fixture edition with a body paragraph opening "By" + a period-less footer council list → parser/validator pass with zero false positives.
- **Absorbs ROLLOUT:** engine.8 (header/parser-alignment class) — note forward.
- **Status:** [x] DONE S265 (`41ea8d97`). Unified byline detection on a shared `looksLikeByline()` predicate (38 cases; also fixed a latent mis-reject of the comma-bureau form); bounded the council district/faction regex to one line (`[^.\n]*?`) — proven old→4 FPs / new→0. Regression tests: `scripts/lib.editionParser.byline.test.js` (5/5), `scripts/validateEdition.councilBleed.test.js` (1/1); parser suite 48/48; E98 still PASSABLE. Node-side, no clasp.

### ES-3: Post-publish intake robustness — sentinel-abort + stale-manifest

- **Files:**
  - `scripts/ingestPublishedEntities.js` (`assertParserSanity` L421-433, throw at L982) — modify
  - `scripts/postRunFiling.js` (required-files set) — modify
- **Source gaps:** G-P-C98-1 (BLOCKING — `(no new businesses this cycle)` sentinel is a real content line yielding 0 parsed entities, so `assertParserSanity` throws before `appendCitizens`; aborts the whole Step 5 intake every no-new-business cycle; no CLI flag bypasses), G-P-C98-4 (postRunFiling reports INCOMPLETE for `output/mara-audit/edition_c98_for_review.txt` — a consumed transient input, not a persistent output; G-P22 stale-manifest class).
- **Steps:**
  1. `assertParserSanity`: treat the `(no new <X> this cycle)` / `(none this cycle)` sentinel family as an explicit zero-entity SUCCESS, not a parse failure — add a sentinel regex to the content-line filter where separators are already stripped (same place, L428 path). Mirror for the NAMES INDEX sentinel if one exists.
  2. `postRunFiling.js`: drop the Mara pre-review packet (`edition_c<XX>_for_review.txt`) from the required-files set — it's an input, not an output.
- **Verify:** run intake against a no-new-business fixture edition → completes (matched/appended/drift counts produced, verify gate runs), no abort. `postRunFiling` reports COMPLETE without the pre-review packet.
- **Absorbs ROLLOUT:** pipeline.37 (post-publish friction) — note forward.
- **Status:** [x] DONE S265 (`03683d99`). `isAbsenceSentinel()` filters the "(no new … this cycle)" family out of the parser-sanity content count (genuine-unparsed guard intact); for_review packet → `required:false`. Regression test `scripts/ingestPublishedEntities.sentinel.test.js` (11/11); real-E98 dry-run intake now EXIT=0 (27 matched, no abort); `postRunFiling --cycle 98` now COMPLETE. Node-side, no clasp.

### ES-4: engine.35 router — extend collapse to the decay/negative pole + sign-aware WHY anchor

- **Files:**
  - `scripts/routePatternSeeds.js` (`collapseImprovements`) — modify
- **Source gaps:** G-RC5 (C98 wrote 18 seeds; 14 per-hood citywide-decay seeds did NOT collapse to one Citywide synthesis seed — `collapseImprovements` clusters only `improvement`-type/positive-pole intents; worse, each of the 14 carries a POSITIVE causal anchor "the A's winning stretch + VeteransDay" on neighborhoods the engine flagged DECLINING −0.4 to −0.6 = WHY mis-attribution), G-EC18–G-EC33 + G-EC43 (16 neighborhoods decay with no matching active initiative — the math-anomaly mass G-RC5 describes; authoritative diagnosis is `engine_review_c98.md` mean-reversion off a positive base).
- **Steps:**
  1. Extend collapse to cluster `math-imbalance`/sentiment-decay (negative pole) the same way improvements are clustered — citywide decay folds to one synthesis seed.
  2. Make the WHY anchor sign-aware: a declining hood must not cite a positive global driver. The collapse was built/validated against C97 (improvement-dominant cycle); C98 is the first decay-dominant cycle through it — untested router shape.
- **Verify:** re-run `routePatternSeeds.js --cycle 98` (dry) → citywide decay collapses to ≤1 synthesis seed; no declining hood carries a positive WHY anchor.
- **Absorbs ROLLOUT:** **engine.35** (router) — this is forward work on that row; note `Absorbs ROLLOUT: engine.35 (decay-pole collapse)`.
- **Status:** [x] DONE S265 (`85553ea8`). `decayMetric()` + `collapseSeeds()` (both poles): improvement keeps magnitude-band clustering, decay folds the whole same-metric group at ≥MIN_CLUSTER (mean-reversion is non-uniform, banding would fragment it); sign-aware WHY (decay → mean-reversion anchor, not the positive A's-streak). Real C98 dry-run: **18 seeds → 2** (17 decaying hoods → 1 citywide-decay synth; lone positive anchor is the West Oakland initiative, correct). Unit test `routePatternSeeds.decay.test.js` (11/11). Node-side, no clasp, deck write path untouched.

### ES-5: Photo manifest/sidecar sync + atmospheric-orphan placement

- **Files:**
  - `scripts/generate-edition-photos.js` — modify (manifest writeback at QA close)
  - `scripts/generate-edition-pdf.js` — modify (orphaned-frame placement)
- **Source gaps:** G-PR-C98-3 (manifest.json carries `editorialFlag:false, dropped:false` for the 3 QA-dropped photos; drop-state lives only in `.meta.json` sidecars; PDF generator filters on sidecar correctly so this run was fine, but any manifest-only consumer treats dropped photos as live), G-PR-C98-2 ES-half (atmospheric frame `atm_veterans_parade` PASSED QA but never rendered — no ATMOSPHERIC section in the compiled `.txt` for `findPhotosForSection` to attach it; silent orphan with no editorial decision).
- **Steps:**
  1. `generate-edition-photos.js`: write the QA drop verdict (`dropped`/`editorialFlag`) back into `manifest.json` at QA close so manifest and sidecar agree.
  2. `generate-edition-pdf.js`: place orphaned QA-passed ATMOSPHERIC frames into a masthead/section-break/filler/FRONT-PAGE-secondary slot rather than silently dropping (coordinate with RB-3 cap — either DJ stops emitting them OR the generator hosts them; pick one, don't double-handle).
- **Verify:** dropped photos show `dropped:true` in manifest.json; a QA-passed atmospheric frame either renders or is capped at source.
- **Absorbs ROLLOUT:** pipeline.13 — note forward.
- **Status:** [x] DONE S265 (`bc7d9af3`) — step 1 only. `syncDropStateToManifest()` copies sidecar drop-state into `manifest.photos[]` at QA close (idempotent; explicit `dropped:false` for live photos); added `require.main` guard + export. **Step 2 (PDF orphan-hosting) NOT built** — Open Q resolved DJ-cap-at-source (RB-3), hosting would double-handle. Test `generate-edition-photos.syncDropState.test.js` (5/5). Node-side, no clasp.

### ES-6: Canon-ledger backfills + sports-feed downstream-taint check

- **Files:**
  - Simulation_Ledger (Wilson Shepard backfill) — sheet write
  - `output/canon_drift_c98.json` — read
  - sports-feed sentiment/seed path — read (taint check)
- **Source gaps:** G-P-C98-3 (Wilson Shepard, Oakland Oaks head coach, named in C98 edition + known in bay-tribune but no Simulation_Ledger row → correctly held canon-layer-drift; needs POP-ID backfill like Elena Soria Dominguez S256 / Vanessa Tran-Muñoz S241), G-RC1 ES-half (NBA `Team Record` cell holds a date not a W-L record; it already FIRED a breaking-news @ Jack London trigger off the malformed value → propagated; verify whether it seeded any sentiment downstream), G-S2 ledger half (Mateo Walker = bay-tribune canon only, no Sim_Ledger card — decide backfill-or-drop; Dario Vega = pure reflection invention, drop).
- **Steps:**
  1. Backfill Wilson Shepard into Simulation_Ledger with a POP-ID (clasp-gated if it touches engine schema — bundle into the post-C98/C99 deploy window per deploy-attribution discipline).
  2. Trace the NBA date-string: did the C98 breaking-news trigger seed sentiment or a story seed? If yes, scope the taint; if no, confirm contained.
  3. Mateo Walker: decide ledger backfill vs canon-only acceptance (Mike call if Tier-1); Dario Vega: confirm pure invention, no action.
- **Verify:** Wilson Shepard resolves via `lookup_citizen`; NBA-taint trace documented.
- **Absorbs ROLLOUT:** none (backfills + verify).
- **Status:** [x] DONE S265 (Mike go-call on the live-ledger write). **(1) Wilson Shepard backfilled** → `POP-01022` (First=Wilson, Last=Shepard, OriginGame=GodWorld, UNI=yes/MED=no/CIV=no, ClockMode=GAME, Tier=3, Status=Active, RoleType="Head Coach, Oakland Oaks", CitizenBio set; BirthYear/Neighborhood/Gender/economics left blank — not invented, pending Paulson-domain enrichment). Verified live (ledger 906→907 rows, row reads back correct). Structural fields mirror Paulson POP-00527 (sports figure) + Vanessa POP-01021 (sparse-backfill precedent, cycle-safe). **(2) NBA taint — CONTAINED:** the malformed `Team Record` date fired a breaking-news @ Jack London trigger, but no downstream propagation — Jack London's decay (-0.45) is mid-pack in the citywide cooldown (normal mean-reversion, not an NBA spike); the only NBA deck item is the legitimate Oaks expansion-draft story (Q3); the "Jack London" sift proposal is the Anna Baker retirement. Cell-fix itself is Paulson-domain (out-of-scope per triage). **(3) Dario Vega** = pure reflection invention → dropped, no action. **Mateo Walker = REVERSAL ON EVIDENCE (do NOT backfill, Mike-confirmed):** measure-twice found POP-00725 = "Matthew Welker" (Jack London, Trade Union Representative) — exact match to the C98 "Mateo Walker, 62, Jack London, Trade Union Rep" canon. "Mateo Walker" is a name-drift mis-rendering of existing citizen Matthew Welker, NOT a missing person; a card would create a duplicate phantom (same class as the killed POP-01021/POP-00781 merge). Real fix is editorial name-fidelity (RB-1 provenance fence already covers loop-bot drift). No new card. Pattern: feedback_measure-twice-cascading-effects.

---

## Folds (point forward, do not restate)

- **T1 trackerUpdates conformance → [[2026-06-01-initiative-tracker-contract]] (civic.14).** Phase 1 shipped S256 → Phases 2–3 now unblocked. The C98 gaps are the concrete acceptance cases:
  - **civic.14 Phase 2** (engine drift-tolerance, clasp): G-PREP1 (stamp `voteCycle` + forward `nextActionCycle` when an initiative advances to `vote-scheduled`, so the vote-trigger is deterministic not Mara-inferred); the pre-assembly validator that rejects non-canonical `ImplementationPhase` / missing `trackerUpdates.initiative` and forces re-emit (G-R1).
  - **civic.14 Phase 3** (writer-side enforcement): G-R1 (Mayor agent — bake canonical phase list + required `trackerUpdates.initiative` into output instruction), G-R2 (pin okoro agent output to canonical `{office, cycle, statements:[]}` object shape — recurring flat-array drift), G-R3 (voice/project agents always emit MilestoneNotes for an initiative they spoke on, even with no phase change), G-PREP2 (advance `Initiative_Tracker.NextActionCycle` + `ImplementationPhase` when city-hall writes milestone updates — engine-sheet scripts half).
  - **civic.14 data cleanup:** G-PREP3 (INIT-004 empty/`UNKNOWN`/`untracked` junk row — confirm dead + remove or restore).
- **Engine header-drift → engine.8** (orphan literals G-EC2/9/10 TierRole, G-EC5–G-EC17 multi-sheet orphans, G-EC34–G-EC42 acceptable-noise defensive fallbacks; G-EC40 hidden `Game_Intake` tab).
- **engine.29 Phase A deploy pending signal:** G-EC3 (`StatusStartCycle`) + G-EC4 (`HealthCause`) on `generationalEventsEngine.js` are the S255 ride-along columns referenced-but-not-yet-added to Simulation_Ledger → confirms engine.29 Phase A column-add + deploy is still pending; not generic noise.
- **Riley_Digest stale (last row C92) → research.1 / engine-sheet handoff:** G-S1 (atmospheric-overlay texture sheet not advancing past C92; C98 had to source overlay from world_summary + baseline_briefs).

---

## Watch bucket (no phase — verify next cycle / benign)

- **G-RC3** — Neighborhood_Demographics stayed 17 while map writer output 21. **C99 watch:** verify demographics goes 17→21; if it stays 17, the `ensureNeighborhoodDemographics` DEMO_NEIGHBORHOODS roster fix (S256) isn't being read.
- **G-RC2** — 24 storylines abandoned in one cycle. Verify via `/engine-review` this is intended cleanup (followup-gate + lifecycle aging out apparatus threads), not over-aggressive abandonment of live storylines.
- **G-RC4** — 8× priorityEngine CIVIC clamp. Working as designed; benign, noting volume.
- **G-EC1** — faith domain produced 5 events with 0 prior-cycle Tribune coverage. Editorial coverage-gap, not an engine defect — surfaces for desk awareness.
- **G-EC44–G-EC47** — cohort-collision / phase-ordering / phase-skip / silent-fail = V2-runtime classes, PENDING the engine-run-log local-ingest path. No action until that path lands.

---

## Out-of-scope (Mike / Paulson)

- **G-RC1 cell-fix** — the NBA `Team Record` cell holds a date string; the A's cell is correct (`53-14`). Cell correction is operator/sports-feed (Paulson domain). The *downstream-taint check* is ES-6; the cell edit itself is Mike's.

---

## Strategic Input — split out, NOT a gap-fix

**The OpenAI 3-tier layered-memory proposal (G-W architecture-input, Mike-sourced).** Source doc: Drive `1n5fUak76Bdnj7a1yoqx9QSGo66IAJl_b` ("OpenAI_feedback 98.txt"). Core claim: **token-burn is an editorial problem** — the sim stores high-administrative-value / low-narrative-value data (permit status, authorization chains, committee votes, application counts) useful in-cycle but near-worthless ~20 cycles later, and that's where much token burn hides. Proposed tiers: (1) Permanent Canon (never forget), (2) Story Memory (keep until resolved), (3) Historical Archive (queryable, NOT injected). Empirical anchor: this is the storage-layer statement of the C98 editorial doctrine Mara graded A- on (the one ding — OARI cost figures — is the Archive layer leaking onto the page). Chaos-cars link (engine.11) = the supply side of the Story tier.

**Disposition:** per [[GAP_LOG_TRIAGE_PLAYBOOK]] anti-pattern #5 (surface strategic items, don't jam them into the two-track fix model), this is pulled OUT of the triage. It gets its own research file `docs/research/2026-06-20-layered-memory-architecture.md` + a `research.*` ROLLOUT row, assessed against the autonomy roadmap (research.12) + the Supermemory container architecture (`docs/SUPERMEMORY.md` — much of tier-3 "queryable not injected" may already map to Supermemory-by-ID retrieval) + chaos-cars (engine.11). The new design work is the tier-1/tier-2 boundary + what auto-promotes between them. Surfaced to Mike directly.

---

## Open questions

- [x] **ES-5 / RB-3 atmospheric-orphan ownership** — RESOLVED S265 **DJ-cap-at-source** (research-build call, the recommended path). DJ caps ATMOSPHERIC at 0 unless the compiled edition exposes a host (RB-3, shipped). **ES-5 must therefore NOT add orphan-hosting to the PDF generator** — its manifest/sidecar drop-state sync (the other half of ES-5) still stands, but the atmospheric-placement option is dropped to avoid double-handling. Cheaper to cap at source than render frames with no editorial slot. (Mike can flip to PDF-host if he prefers the layout to absorb orphans; until then, source-cap holds.)

---

## Changelog

- 2026-06-20 — Initial draft (S265, research-build). C98 triage per [[GAP_LOG_TRIAGE_PLAYBOOK]]. ~60 gaps → 10 themes; T1 trackerUpdates folds to civic.14 Phases 2–3; 3-tier memory proposal split to its own research file. Filed as governance.41.
