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

## Timing correction — 2026-11-01 (codex)

Commit `a3a24d813` removed the post-fire ballot and mayor-decision intent files. The Sunday chain explicitly turns a **fired** Cycle into civic output (`scripts/cron-civic-run.js:5-7`), while `phase05-citizens/civicInitiativeEngine.js:400-434` resolves votes in that fire. A `VoteCycle === cycle` ballot collected by the subsequent hearing arrives too late. The earlier local-intent claim in this review is superseded: `scripts/civic47Ballots.js` remains a tested local contract, but B3 needs a delivered pre-fire opportunity, a session that survives delays, an authorized ballot write, and a single engine reader before a binding result can be claimed. The post-fire prompt regression and local tick suite passed **74/74**.

The pilot transport pointer above moved to `scripts/cron-civic-run.js:1792-1797` after this deletion.

## Pilot-policy update — 2026-11-01 (codex)

The builder chose the plan's proposed defaults behind the inactive pilot flag. Commit `3f5bda84e` encodes two regular and up to two extra event opportunities per elected seat, with Fri/Sat event duty only for a fresh major event (`scripts/civic47PilotPolicy.js:5-29`; `scripts/civicDutyQueue.js:12-70`; `scripts/cron-civic-run.js:3229-3277`). Sunday remains the decision chain, normal civic runs remain Mon-Thu, and no production cron was changed. The plan has no numeric delegated spend or event-duration bands, so `delegation.enabled=false` and all band fields are null. `scripts/civic47Authority.js:31-35` holds delegated action classification until a versioned numeric policy is supplied. The synthetic duty/authority, civic game **56/56**, and civic tick **74/74** suites pass. This is an offline policy candidate, not a Sheet reservation or live event-duty proof.

## Script follow-up — 2026-11-01 (codex)

The A2 sports adapter now requires `dumpBeatTabs`' `sourceHashes.Oakland_Sports_Feed` to match the exact file bytes before calling the export current (`scripts/civicEventView.js:119-132`). A same-Cycle overwrite with old metadata is unavailable, then a new manifested refresh changes the generation hash. This Codex edit was staged by the concurrent research-build commit `02d94d365`; inspect those two script paths in that commit separately from its other files. The synthetic A2 brief test passed.

Commit `7cab2ef59` carries saved experience, reaction and publication files through the current Cycle instead of dropping them after their first Cycle (`scripts/buildCivicOutcomeFeed.js`); a C120 response appears in a C121 official brief and a future C122 file does not appear early. Commit `fc01458d3` adds stable action IDs to accepted local moves and `scripts/civic47Journal.js`: it reconciles against a current, hash-verified `Civic_Action_Ledger` export by original move, holder, office, payload and requested Cycle. An applied label without effect and readback receipts remains unavailable. The brief exposes a matched prior result by the original move ID; colons in that ID are accepted only for `prior` evidence requests. The journal, brief, outcome, duty and office slice tests passed; civic game **56/56** and tick **74/74** passed. Both protected patches still pass `git apply --check` on current HEAD.

These checks establish local read and replay contracts only. The proposed Sheet journal does not exist yet; no shared reservation, event/program writer, pre-fire ballot writer, citizen reaction writer or approval component writer was added. The HOLD findings above and the no-push handoff remain in force.
