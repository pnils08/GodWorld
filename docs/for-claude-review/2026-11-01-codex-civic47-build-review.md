---
title: Codex civic.47 build review and protected handoff
created: 2026-11-01
updated: 2026-11-01
type: reference
tags: [civic, engine, review, active]
sources:
  - docs/plans/2026-10-31-civic-autonomy.md
  - commit fe5746d41
  - output/codex/civic47-b2-protected.patch
  - output/codex/civic47-control-plane.patch
pointers:
  - "[[../plans/2026-10-31-civic-autonomy]] — owning plan and task status"
  - "[[README]] — Claude review inbox contract"
---

# civic.47 — offline build review and Claude handoff

**Verdict: HOLD for pilot activation.** Commit `fe5746d41` contains a local civic.47 candidate in `scripts/**` and `output/**`. The two protected patches are proposals for Claude. Nothing here is deployed, a Sheet schema change, an authoritative ballot, an applied action, a paid model comparison, or a sandbox Cycle result. Agy reviews before anything lands, per the builder's instruction; do not push this guest commit.

## Built and locally verified

1. **A2 event and brief adapter — offline SHIP, runtime proof open.** `scripts/civicEventView.js:169` exposes source-revision event views; `scripts/civicBrief.js:104,154-190` constructs `CIVIC-BRIEF/2`, whitelisted evidence reads and dependent-action evidence checks; `scripts/buildCivicOfficeSlice.js` attaches the brief. Synthetic mayor/D2 awareness, correction, cancellation, source freshness and retrieval tests pass in `scripts/civic47Brief.test.js`. The old parade is a historical source, not a fresh event.
2. **A3 duty and decision envelope — offline SHIP, policy/proof open.** `scripts/civicDutyQueue.js` plans least-served regular and event opportunities; `scripts/civicActionSession.js:16-87` gives each accepted action a stable client ID and a locked local append with hash-conflict detection. `scripts/cron-civic-run.js:3258-3497` uses those under `--civic47-pilot`, with independent answers, read requests, per-action records and typed model-finish handling. Legacy mode keeps its existing route. The pilot prompt suggests two decisions and eight upkeep items, but the civic gate rejected hard capacity refusals; `scripts/cron-civic-run.js:2708-2749` now admits any separately valid ideas and leaves resource/action admission to later policy. No complete civic-week receipt was run.
3. **B1/B3 local contracts — source-only SHIP, authoritative path HOLD.** `scripts/civic47Authority.js:10-98` has typed holder, treasury, classifier and reservation planning; `scripts/civic47Ballots.js:7-90` extracts ballots and mayor choices and previews a tally. `scripts/cron-civic-run.js:1691-1704,2050-2058` writes local intent files marked nonauthoritative. These do not reserve shared Sheet funds or bind a vote.
4. **B4/A4 local feedback — source-only SHIP, receiver proof HOLD.** `scripts/civic47OutcomeFeed.js:9-126` requires applied/readback receipts before outcomes, real exposure receipts before reactions, and published receipts before coverage. `scripts/buildCivicDomainSlice.js:998-1153` exposes source candidates; `scripts/civicBrief.js:104-151` returns source-linked outcomes to the next brief. There is no producer yet for authoritative experience, reaction or approval component rows.
5. **A5 offline fixture — SHIP as a preparation artifact only.** `scripts/civic47ModelFitOffline.js` scores the 15 synthetic cases in `output/civic47-model-fit/scenarios.json` against `rubric.json`. `provider-profile.template.json` has no claimed current provider facts or costs. No paid calls were made.
6. **B2 protected F7 proposal — tested, not applied.** `output/codex/civic47-b2-protected.patch` changes the station cohort in `lib/initiativePhaseContract.js` and `phase05-citizens/civicInitiativeEngine.js`, with its protected test. `git apply --check` passed on HEAD. Applied in a fresh HEAD archive under `/tmp`, its `lib/initiativePhaseContract.test.js` passed **291/291**. `output/codex/civic47-control-plane.patch` only marks the inactive civic.47 pilot boundary in two `.claude/skills` files; `git apply --check` passed. Claude should inspect and apply or revise each independently. Neither patch is a city event/program receiver.

## HOLD findings for the complete plan

1. **B1 persistence and B2 effects: accepted request cannot become an applied civic.47 action.** `scripts/civicActionSession.js:42-83` stores local `pending` rows; `scripts/civic47Authority.js:61-98` returns a reservation plan without a shared write. `scripts/dumpBeatTabs.js:87,180-186` only exports `Civic_Action_Ledger` when `--civic47-pilot` finds the tab. With an accepted event/service action, no existing writer consumes it, reserves treasury funds, emits a committed effect receipt, or reconciles a partial write. A local pending row can therefore remain pending while the world changes zero. Claude needs a schema/migration decision, an engine-owned execution journal, real receiver effects, typed readback and failure-injection proof before activation.
2. **B3 official ballots are not binding.** `scripts/cron-civic-run.js:1703,2054-2057` writes intent JSON; `phase05-citizens/civicInitiativeEngine.js:434,483` still calls the probability council resolver and mayor veto. A D2 YES in the local file can therefore coexist with an engine NO; a mayor sign can coexist with a random veto. Claude must bridge an authorized Sheet ballot source into the single engine vote authority, define quorum and deadline policy, bind the mayor decision, and test replay/partial delivery. The current control-plane patch does not do that.
3. **B4 accountability has no authoritative component writer.** `scripts/civic47OutcomeFeed.js:69-114` reads experience/reaction/publication rows if supplied; `phase05-citizens/updateCivicApprovalRatings.js:718-748` still scores initiative motion via its existing rule. A delivered service with negative citizen experience has no traceable civic.47 approval component, and a mere stage motion can still score. Claude must add deduplicated saved experience and versioned approval components after an agreed policy; local feed tests do not prove the engine reader.
4. **A5/AB6 proof and production decisions remain open.** `docs/plans/2026-10-31-civic-autonomy.md:291-294` lists policy, receiver, journal and paid-evaluation gates. `scripts/civic47ModelFitOffline.js` has no provider execution. No composed sandbox event/program run, no matched state readback, no migration manifest, and no normal wake proof exists. The pilot flag should remain inactive.

## Source-derived wiring card and test boundary

The preapproved card command `node scripts/runEngineAgent.js --agent engine-wiring --model anthropic/claude-haiku-4.5 --task "Target: resolveCouncilVote_"` returned `[FATAL] Connection error.` It was not retried. Source wiring: `phase01-config/godWorldEngine2.js:575,636-637,737` runs Phase 2 initiative effects, Phase 5 civic initiatives then approval, and Phase 7 city events. `phase05-citizens/civicInitiativeEngine.js:110-188` reads `Initiative_Tracker`; scheduled votes call `resolveCouncilVote_` and `checkMayoralVeto_` at `:434,483`, then write tracker rows at `:735`. `phase02-world-state/applyInitiativeImplementationEffects.js:826` queues treasury intents. This card is a source trace, not a generated wiring-card artifact.

Focused local evidence: `cron-civic-game` **56/56**, `cron-civic-tick` **72/72** (the local spawn test needed sandbox escalation), `civicPetitions` **14/14**, `civicReviewFixes` **15/15**, office/domain/datawake prompt suites and new civic.47 brief/duty/authority/ballot/outcome/transit/offline-fit suites passed. All changed scripts passed `node --check`. The tests use synthetic local fixtures; they do not establish Sheet, concurrency, persistence, model, deployment or live behavior. No live Cycle or external write was run.

**Final gate:** agy review, Claude's protected-file/source review, policy and schema rulings, binding engine receivers, and a composed sandbox proof are required before civic.47 pilot activation. The commit is local and must not be pushed by this lane.

## Correction — 2026-11-01 (codex)

Commit `715032ca7` removed the pilot prompt's fixed decision/upkeep counts and routes its hearing seats through synchronous transport. The existing batch validator requires `max_tokens` (`scripts/cron-civic-tick.test.js:889-896`), so `scripts/cron-civic-run.js:1813-1818` bypasses batch submission under `--civic47-pilot`; legacy batches retain their cap and contract. The sentence above saying the pilot prompt suggests two decisions and eight upkeep items is superseded. The new synthetic tick test passed **73/73**; actual provider support and cost remain unverified.
