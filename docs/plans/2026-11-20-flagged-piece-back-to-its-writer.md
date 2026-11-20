---
title: Flagged Piece Back To Its Writer Plan
created: 2026-11-20
updated: 2026-11-20
type: plan
tags: [pipeline, draft]
sources:
  - scripts/cron-desk-run.js runWrite (gate → staged / flagged, :3300–3360), runWake (:3638), the :3735 route
  - scripts/cron-rhea-gate.js (verdict: pass, flags, summary, review; contractScore: opened / closed / purposeMet / inTarget, short, score, max)
  - docs/plans/2026-10-11-media-extension.md §pipeline.77, §pipeline.79, §pipeline.83
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.114"
  - "[[2026-10-11-media-extension]] — pipeline.77 reward loop, pipeline.83 failure review"
---

# Flagged Piece Back To Its Writer Plan

**Builder's words (2026-11-19/20):** "All crons get failed articles returned to them already" · "there are tons of record and plans about grading and improving them . Why do you think they get graded ? Why do you think they get stages fk flag ? … didn't finish the build" · earlier the same night: "anything capped is garbage and serves no one".

**Goal:** a piece the gate flags goes back to the journalist who wrote it, with everything the gate found and its grade; he fixes that piece and it is gated again — the flagged stage is where that happens, not where the piece stops.

**Rows:** pipeline.114 · **Owner:** research-build

## Read (2026-11-20)

| What | Code / record |
|---|---|
| The live write path | crontab 18:15 `cron-desk-run.js --stage=write --fanout` → `runFanoutStage` → `runWrite`. The gate runs once (`cron-rhea-gate.js`, Rhea verdict + contract score); pass → `staged/`, fail → `flagged/` with `<stem>.flags.json`. Nothing reads a flagged piece back to its writer (grep 2026-11-20: no reader of `flagged/` outside delivery, the daily router's count, the digest, the reconciler) |
| What a flagged piece does today | posted to Discord 18:45 marked GATE-FLAGGED with at most five findings (`deliver-articles.js`); counted (daily router, newsroom digest, cron feedback); its grade goes onto the journalist's page for his next, different piece (pipeline.77 mechanism 3); read by hand in the Saturday failure review (pipeline.83: whose failure — auditor / packet / reporter / quote-source) |
| Why grading exists | builder 2026-10-15: best of the week printed Saturday, print earns usage toward tiers, "identifies which cron is carrying out the task best". Scoreboard `output/cron-compare/reward-loop-c<N>.jsonl` (C114 40 rows, C115 38, C116 27) |
| How they improve today | pipeline.77 (builder 2026-10-14): the rubric the writer sees is the rubric that judges (1); the grade rides his page into the next wake (3). Group avg 2.86 → 3.80 → 4.00 C111–C113. Two drafts per piece dropped (builder 2026-10-29: "Why would I need two drafts of an article") |
| What this is not | the repair pass removed 2026-10-25 ("gate the facts, not the color"): a code rewrite that wrote the reporters strict to the Packet. Here the journalist fixes his own piece against the gate's findings; the gate still judges facts against the ledger and the citizens' own words, never color |
| Cost (pipeline.77 costing, 2026-10-29) | a draft ~$0.045, gate + contract judge ~$0.0125 — one return ≈ $0.06 a flagged piece; C116 write run flagged 1 of 7 |

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | `runWrite`: on a gate fail, the same writer seat (same package, model, state) is called again with its own draft, every flag the gate returned (all of them, no cut), the Rhea summary, and the contract score with what fell short — told: this is your piece, the desk sent it back, fix what is named | rb | not started |
| 2 | The fix is gated again by the same gate. Pass → `staged/` as today, its sidecar carrying both verdicts (first draft, fix). Fail → back again while each fix clears findings the one before carried; a fix that clears none stops the return and the piece stays in `flagged/` with every round on file — the stop is progress, not a count | rb | not started |
| 3 | The scoreboard row (`reward-loop-c<N>.jsonl`) carries each round: first-draft grade and gate result, each fix's, findings cleared — so improvement shows per journalist and model, on the same piece | rb | not started |
| 4 | Delivery and counts read the final state: a piece that passed on its fix posts as published-track with "fixed after the desk sent it back"; a piece still flagged posts every finding, not five | rb | not started |
| 5 | `runWake` (:3638) and the :3735 route: read whether any cron still runs them; if one does, the same return; if none, say so here | rb | not started |
| 6 | Tests on the return and the stop; one shell run on a C116 flagged piece (no publish); then live on the next 18:15 write run | rb | not started |

## Acceptance

1. A flagged piece on a live write run goes back to its writer with every finding, and the fix is gated — proven by the run log and the piece's sidecar.
2. The scoreboard shows the first-draft and fixed grades for that piece.
3. A fix that clears no finding ends the return; nothing loops.

## Builder's call

- Only gate-flagged pieces go back, or also a piece that passes the gate with a grade below full (C116: "the piece's purpose failed 8 of 47")?

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|

### Needs proof

| # | Item | Held by | Proof |
|---|---|---|---|

### New concepts

| # | Item | Held by | Sources |
|---|---|---|---|

## Changelog

- 2026-11-20 (research-build) — Plan written from the builder's words and the pipeline.77 / .79 / .83 records; nothing built. Sent for one review before the build.
