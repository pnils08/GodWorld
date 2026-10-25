# TASK — codex: engine.306 gate 3 FIX plan review (items 3 + 4)

Read-only: code + docs + `output/` files; no cron, model, Sheet, bench, clasp, commit or push. Write to `docs/for-claude-review/2026-10-21-codex-engine306-gate3-fix-plan.md`, one SHIP / FIX per numbered step with file:line evidence, under ~20 lines. Report in one line when done.

**Source:** your gate 3 (`docs/archive/for-claude-review/2026-10-21-codex-engine306-diff-gate3.md`) items 3 (attribution FIX) and 4 (C113 watch FIX). Nothing is built yet; this is the plan.

## Facts the plan stands on (es wiring cards 2026-10-21)
- EventAttractiveness = `round(base × profile.eventMod × hMod.eventMod)` + pulse fold + chaos fold (`phase08-v3-chicago/v3NeighborhoodWriter.js:368-400, 487-489, 514, 523-534`). No rng on this column (`variance()` :470 feeds retail :513 and sentiment only). `pulseFoldDelta_` is pure (:278-287). `hMod` = holiday mods (same both legs); `profile.eventMod` = `hoodLabelMods_(name, S, label)` (:265-273) — reads S, not yet traced.
- Writer runs at Phase10-NeighborhoodMap (`godWorldEngine2.js:824` / `:2532`), before Phase10-ExecuteIntents (`:866` / `:2561`); S.worldEvents / storySeeds / storyHooks have no writer after it.
- One rng stream per Cycle, seeded by cycleId (`utilities/cycleModes.js:186-195`); `ctx.rngFor(salt)` gives salted side streams.
- World-event writers: Phase3 crisis spikes/buckets (`:593-594`), Phase4 worldEventsEngine_ (`:603`), faith (`:604`), chaos cars (`:609`), Phase5 applyBusinessDynamics_ closures (`:641`; push `applyBusinessDynamics.js:682`, domain BUSINESS).
- Seeds: one per medium/high world event + a cluster seed at ≥6 events (`applyStorySeeds.js:1022-1046`); final `S.storySeeds = deduped` :1448. **Not persisted to any sheet** (Story_Seed_Deck is from S.contractSeeds, `saveV3Seeds.js:14-25`); only a count (WorldEvents_Ledger StorySeedCount).
- World events persisted in full: Riley_Digest col U = `JSON.stringify(S.worldEvents)` (`godWorldEngine2.js:2020`, intent :2044); also WorldEvents_V3_Ledger (`recordWorldEventsv3.js:279`).
- Hooks persisted: Story_Hook_Deck HookText ← `h.text` only (`v3StoryHookWriter.js:72-98`); the writer scans `h.hook || h.text` (:393-396). Final hook writer `storyHook.js:1426` (Phase8-V3Integration). Only hook path whose count may scale with Business_Ledger rows: owner-door pool (`processAdvancementIntake.js:2234-2262`, draw count vs pool size not read).

## Plan

**Step 0 — free B2 read before any reset.** Bench was last fired by pair 2 (`2026-10-21-e306-pair2.log` 11:58, after drill2 11:36; the landing ran on live). Read bench C113 Riley_Digest WorldEvents JSON, Story_Hook_Deck C113 rows, WorldEvents_Ledger C113 StorySeedCount → untapped B2 partial receipt; cross-check for step 2.

**Step 1 — bench-only tap, never merged** (pattern `15a1e2ac`). In `saveV3NeighborhoodMap_` after :400 record: list lengths (worldEvents, storySeeds, storyHooks); the four component counts (event-domain hits, event-text hits, seed hits, hook hits); worldEvents tallied by domain|subdomain|source; seeds by priority. Per hood: profile.eventMod, hMod.eventMod, value after :514, after pulse fold, after chaos fold, saved value. One `queueAppendIntent_` row to an `EA_Diag` tab (ensure + append, as `Spot_Diag`). No rng draw, no S write, no direct write.

**Step 2 — tapped pair.** Bench push = stage 18 + tap (`2026-10-21-push-e306-bench.sh`, manifest-checked). A2t = baseline reset + C113; B2t = reset + the 103 rows (intake driver `--target bench`) + C113 — pair2.sh shape, halts on non-PASS. **Acceptance:** A2t LifeHistory sha = `130462736b782fbe`, B2t = `bb0ac98b0284f1cd`; per-hood saved EventAttractiveness = `2026-10-21-e306-attrib-A2-B2.json`; B2t Riley WorldEvents JSON = step 0. Any mismatch = the tap perturbed the run → stop.

**Step 3 — decomposition.** Per hood Δ = Δ(round(base×mod)) + Δpulse + Δchaos, exact from EA_Diag. Cause classes, checked in order: (a) Phase3–4 events already differ A2t vs B2t → a pre-Phase-5 reader of Business_Ledger shifted the single rng stream (chaos targets the candidate, but `:603` precedes `:609`) — name it; (b) closure events (BUSINESS domain; text hits via `'art'`/`'market'` substrings in a business name); (c) seeds follow (b)/(a) 1:1; (d) owner-door hook count vs pool size; (e) `profile.eventMod` moved. Verdict "rng-stream shift" only when every component delta traces to a changed draw sequence with no row-count path; a row-count path is named as structural and goes to the builder before C113 Sun 2026-10-25.

**Step 4 — widen the C113 watch** (DEPLOY_HISTORY §PROD stage 18 "First live fire", one edit) + a read-only `--target live` mode on `2026-10-21-e306-readers.js` comparing to `2026-10-21-e306-preimage-live.json`: (i) pre/post BIZ IDs + bizIdHighWater (a heritage birth makes 284 / BIZ-00290, `generationalWealthEngine.js:3203-3241`); (ii) typed new-row dynamics on rows 182..284 — revenue/growth writes, closures, Business_Archive moves (`applyBusinessDynamics.js:664-749`); (iii) per hood spot eligibility + holder shift vs C112 (`2026-10-21-e306-spots.js`); (iv) EA components on live from Riley_Digest + Story_Hook_Deck + seed count (seed keyword hits bounded 0..count — no tap on PROD); (v) an all-hood EA drop not explained by (iv) holds acceptance.

**Step 5 — your gate 4** on the EA_Diag receipt, the decomposition and the watch diff before item 3/4 close.

## Hunt
1. Does the tap capture enough to assign every hood's Δ with no residual? Anything upstream of :400 it misses?
2. Can the tap perturb the run (rng, S mutation, intent ordering, the ExecuteIntents batch)? Is the sha + per-hood value check enough proof it didn't?
3. Is step 3's (a)–(e) list complete — any other path by which 103 Business_Ledger rows change S.worldEvents / storySeeds / storyHooks length or text, or `hoodLabelMods_`?
4. Step 4: anything the rows can do on C113 the widened watch still misses; is (iv) a sound live substitute for the tap?

Done = the md exists.
