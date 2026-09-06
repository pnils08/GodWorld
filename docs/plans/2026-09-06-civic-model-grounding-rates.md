---
title: Civic Number-Grounding Failure Rates by Model Plan
created: 2026-09-06
updated: 2026-09-06
type: plan
tags: [civic, quality, models, done]
sources:
  - Mike-direct 2026-09-06 — "D1 has now failed the number gate 5 of 6 attempts across three runs. The two-attempts-no-fallback rule is civic.26's design, so I left it."
  - logs/civic-cron.log + logs/civic-cron.log.*.gz — full retained history of ungroundedNumbers() rejections
  - scripts/civic-office-map.json, scripts/cron-civic-run.js (FALLBACK_MODELS, civic.26)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — civic.34"
  - "[[../index]] — add entry in same commit"
---

# Civic Number-Grounding Failure Rates by Model Plan

## Context

Mike flagged one seat (COUNCIL-D1) failing the civic number-grounding gate
(`ungroundedNumbers()`, `scripts/cron-civic-run.js`) 5 of 6 attempts across
3 runs, and correctly left civic.26's two-attempts-same-model-no-fallback
rule alone (switching providers to dodge a content-quality gate would weaken
the gate, not fix it — that rule is doctrine, not a bug).

The question worth answering wasn't "what's wrong with D1" — it was whether
D1 was uniquely broken or a symptom of something fleet-wide.

## Method

Every log line matching `ungrounded number(s)`, `fabricated statistic(s)
after retry`, or `cited number(s) not in your packet` (the same detector,
wired at two call sites — the weekday datawake and the Sunday hearing chain)
across the full retained `logs/civic-cron.log*` history, tallied by
`agentDir`, then mapped to each seat's assigned model via
`scripts/civic-office-map.json` (offices + projects).

## Finding

| Model | Seats on it | Incidents | Per-seat rate |
|---|---|---|---|
| qwen/qwen3-235b-a22b | 4 (COUNCIL-D1/D3/D5/D9) | 12 | ~3.0 |
| deepseek/deepseek-chat | ~30 | 8 (health-center 4, baylight 2, oari 1, okoro 1) | ~0.27 |
| mistralai/mistral-large | 1 (mayor) | 6 | n=1, not a rate |
| moonshotai/kimi-k2 | 3 | 0 | 0 |

qwen's per-seat rate is roughly 10x deepseek's, with real sample size on
both sides (4 seats / 12 incidents vs ~30 seats / 8 incidents) — not noise.
D1 wasn't uniquely broken; every qwen seat shows the same pattern, and D1
was just the one Mike was watching tonight.

deepseek is not immune — its residual failures cluster on metric-heavy
project/milestone seats (health center construction %, OARI disbursement
counts, stabilization fund dollars) where the task itself demands a fresh
specific figure the pack sometimes doesn't have yet, a content-shape
problem more than a model-quality one.

Mayor (mistral, the fleet's only seat on that model) has the single highest
raw incident count — 6, on one weekly-cadence seat. That's a real signal
but n=1 means it can't be rate-compared the way the qwen cohort can, and
the mayor is a far more prominent, singularly-characterized voice than a
district seat. Flagged, not swapped, without Mike's word.

## Decision

Swapped COUNCIL-D1/D3/D5/D9 from qwen/qwen3-235b-a22b to
deepseek/deepseek-chat in `scripts/civic-office-map.json` — the fleet's
established default, with the best per-seat rate at real sample size.
Dropped qwen from civic.26's `FALLBACK_MODELS` (`scripts/cron-civic-run.js`)
— a fallback exists to rescue a seat from a CALL failure (429/timeout); one
that reliably reintroduces the exact defect the two-attempt VALIDITY gate
exists to catch isn't a rescue.

The two-attempt-same-model gate remains the real defense regardless of
model choice — this lowers the odds of a muted seat, it doesn't remove the
ceiling. `civic-cron-week-carry.test.js` (civic.26's own suite) stays green
with 2 fallback models instead of 3; no test assumed exactly 3.

## Open

- Mayor (mistral) — same measurement, one seat, awaiting Mike's read on
  whether her voice is worth the swap risk.
- deepseek's residual project-seat rate — a content-shape problem
  (thin-pack metric seats), not a model-swap candidate; watch, don't act.

## Changelog

- 2026-09-06 (research-build, S431) — Measured + closed. civic.34.
