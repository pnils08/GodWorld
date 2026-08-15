---
title: Cross-lane message bus — take the operator out of the relay
created: 2026-08-15
updated: 2026-08-15
type: plan
tags: [architecture, infrastructure, draft]
sources:
  - Operator direction 2026-08-15 — "design cheaper agents to be messengers, stop orchestrating multiple builds at once, more model filtering on abilities"
  - Proven 2026-08-15 — `tmux send-keys` into pane %20 redirected antigravity's autonomousNewsroom plan mid-session; it acknowledged and stood down
  - MEMORY reference_cross-lane-tmux-back-channel — the working primitive + its quirks
pointers:
  - "[[engine/ROLLOUT_PLAN]] — governance.47"
  - "[[../adr/0004-skill-bag-naming-principle]] — lanes are skill bags, not capability boxes"
  - "[[index]] — registered same commit"
---

# Cross-lane message bus

**Problem:** the operator is the message bus. Eight lanes run in parallel (4 Claude terminals + kimi, codex, antigravity, grok) and every cross-lane correction is currently hand-relayed — copy output from one pane, paste into another, re-explain the context. That is the bottleneck, and it caps how many builds can run at once at "however many the operator can personally hold."

**Proven primitive:** `tmux send-keys -l` + separate `C-m` reaches any non-Claude lane live. `SendMessage` reaches Claude sessions only. Both verified 2026-08-15.

## 1. The design constraint that shapes everything

**The messenger must not be a model.**

The operator's framing was "cheaper agents as messengers." The cheaper and safer answer is *no agent*: transport is a deterministic script, zero tokens, and it physically cannot paraphrase.

Rationale: the payload is frequently canon. The exchange that motivated this plan carried "Vinnie Keane POP-00001 is a Designated Hitter" as a correction to a lane that had written him as a newspaper reporter. A cheap model in the middle, re-summarising to save tokens, is a canon-drift vector introduced at the exact point where fidelity matters most. Telephone is not a saving.

**Split:**

| Concern | Where it runs | Why |
|---|---|---|
| Transport — find pane, confirm idle, send literal, capture reply | deterministic script, no model | must be verbatim; a paraphrase here corrupts canon |
| Routing — *which* lane should do this, given model strengths | judgment seat (research-build, or Sonnet) | routing is a judgment call; judgment at the cheapest tier is backwards |
| Authoring the message | judgment seat | the context IS the work; it does not compress |

This inverts the intuition that cheapness comes from a smaller model. Here it comes from removing the model.

## 2. Tasks

| # | Task | Detail | Terminal |
|---|---|---|---|
| 1 | `scripts/laneMessage.js` | Pane discovery by window name (never cached ids), idle-check via footer marker, `send-keys -l` + delayed `C-m`, until-loop reply capture, single-line payload enforcement | research-build |
| 2 | Lane registry | `scripts/lane-map.json` — window name → CLI, busy-marker string, whether it accepts `SendMessage` instead. Sibling of `civic-office-map.json` | research-build |
| 3 | Append-only transcript | Every send + reply to `logs/cross-lane.jsonl` — from, to, timestamp, payload, reply. **Non-optional:** if lanes talk without the operator, the record has to be readable after the fact | research-build |
| 4 | Hop limit | N hops per exchange (start N=3), then halt and surface to the operator. Two lanes can ping-pong indefinitely with nobody watching | research-build |
| 5 | Routing table | Per-lane capability profile driving handoff decisions — extends the existing route-by-model-strength principle from prose into data | research-build |

## 3. Acceptance criteria

1. `node scripts/laneMessage.js --to antigravity --message "..."` delivers verbatim and returns the reply.
2. A message sent to a lane sitting at bare `bash` is **refused**, not executed. (Typing into a dead pane runs the payload as shell commands — the sharpest failure mode in this design.)
3. Every exchange appears in `logs/cross-lane.jsonl`.
4. An exchange exceeding the hop limit halts and reports rather than continuing.

## 4. Pre-mortem — what makes this wrong in 3 sessions

- **Pane ids rot.** `%20` is not stable across restarts. Resolve by window name every call; never persist an id.
- **Dead-pane injection.** A pane at bare `bash` executes the message. Idle-check must verify the *expected CLI is running*, not merely that the pane exists.
- **Silent lane drift.** A lane that changes its busy-marker string breaks the reply wait. Fail loud on unknown footer, never assume completion.
- **Autonomy creep.** This plan is transport only. It does not authorise lanes to *initiate* work at each other unprompted — that is a separate decision and should stay one.

## 5. Blocked on

Operator approval — Task 1 creates a new `.js`, which is a standing approval gate. Filed as design so the direction is captured; no code until the gate clears.
