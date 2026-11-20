---
title: Flagged Piece Back To Its Writer Plan
created: 2026-11-20
updated: 2026-11-20
type: plan
tags: [pipeline, active]
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
| 1 | `runWrite`: on a gate fail, the same writer seat (same package, model, state) is called again with its own draft, every flag the gate returned (all of them, no cut), the Rhea summary, and the contract score with what fell short — told: this is your piece, the desk sent it back, fix what is named | rb | built 2026-11-20 — `lib/sentBack.js` (findings, note, the writer's block), `cron-desk-writer.js --sent-back`, `runWrite` gates through `gateDraft()` and loops before the route |
| 2 | The fix is gated again by the same gate. Pass → `staged/` as today, its sidecar carrying both verdicts (first draft, fix). Fail → back again while each fix clears findings the one before carried; a fix that clears none stops the return and the piece stays in `flagged/` with every round on file — the stop is progress, not a count | rb | built 2026-11-20 — `goesBack`: a fix with as many findings as the piece before ends it; a fail with nothing named (no verdict) does not go back; a writer error or an unchanged fix keeps the piece as filed. Each round kept as `<stem>.sent-back-<n>.md` + `.json` |
| 3 | The scoreboard row (`reward-loop-c<N>.jsonl`) carries each round: first-draft grade and gate result, each fix's, findings cleared — so improvement shows per journalist and model, on the same piece | rb | built 2026-11-20 — `sentBack` on the scoreboard row (round, findings, score, gate result), the `.wake.json` record, the staged sidecar, the flags file |
| 4 | Delivery and counts read the final state: a piece that passed on its fix posts as published-track with "fixed after the desk sent it back"; a piece still flagged posts every finding, not five | rb | built 2026-11-20 — every finding; findings past Discord's 2,000 characters ride at the top of the attached piece; "sent back to the writer N times; fixed and passed / still flagged" |
| 5 | `runWake` (:3638) and the :3735 route: read whether any cron still runs them; if one does, the same return; if none, say so here | rb | read 2026-11-20: neither runs from a cron (the `--wake` crontab line is commented "old"; the live write is `--stage=write --fanout`) — the return is in `runWrite` only |
| 6 | Tests on the return and the stop; one shell run on a C116 flagged piece (no publish); then live on the next 18:15 write run | rb | tests 2026-11-20: `lib/sentBack.test.js` 26, `scripts/deliver-articles.test.js`; `node scripts/run-tests.js` 349/349. Shell run 2026-11-20 (builder: "Yes"), `output/test-shell/20261120-004035-tamsin-pruitt-sentback/`, Tamsin's C116 piece flagged 11-19: the real gate on it through the new `gateDraft` — flagged, 1 high finding (a quote put on Wilson Shepard not in his record), 3/3; sent back with that finding (`--sent-back`, the writer's own seat: Sonnet 5.5, 6 tool calls) — the quote is gone, the rest kept, 1,451 → 1,282 words; gated again — pass, 0 findings, 3/3, staged in the shell. Cost: writer 59,905 in / 4,818 out ≈ $0.17, two gates $0.031. The loop's own control flow (the `while`) did not run in the shell — a re-gate keeps the writer out by design; live: Fri 2026-11-20 18:15 |

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

- 2026-11-20 (research-build) — Shell run on Tamsin's flagged C116 piece: sent back with its one finding, the fix passed the gate 0 findings, 3/3; ≈ $0.20. A round on a Sonnet seat is ~$0.18, not the ~$0.06 average.
- 2026-11-20 (research-build) — Tasks 1–5 built, flagged pieces only (the builder's call still open); tests 349/349; live from Fri 18:15. A write run takes ~7 min, Discord 18:45: a few rounds still land.
- 2026-11-20 (research-build) — Plan written from the builder's words and the pipeline.77 / .79 / .83 records; nothing built. Sent for one review before the build.
