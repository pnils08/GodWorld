# Phase 1/2 Technical Design — UNDOCKED Episode Runner + Adapter

**Proposal draft** — kimi lane, 2026-08-15  
**Owning plan:** `docs/plans/2026-08-07-spacemolt-game-show.md` (items 1.1, 1.2, 2.1, 2.2)  
**Status:** For research-build terminal review and ownership.  

This design adapts the upstream SpaceMolt agent stack (`SpaceMolt/commander` v0.4.0 and `SpaceMolt/spacemolt-lib` v12.1.0, both MIT) into GodWorld's in-world reality show, **UNDOCKED**. It keeps the upstream tool loop intact and inserts GodWorld-side wrappers, telemetry, a deterministic adapter, and a review gate.

---

## 1. Episode runner (plan 1.1)

Shape: crontab one-shot invocation, never a daemon or `pm2 cron_restart`.

Wrapper responsibilities:

- Accept cast manifest and episode window (e.g., `--episode E00001 --popid POP-12345 --duration 900`).
- Map each cast member to a SpaceMolt session named `undocked-<popid>`.
- Spawn `bun run commander` with upstream flags: `--model <model> --session undocked-<popid> --url <game-url> --file <mission-brief> --benchmark`.
- Wall-clock timeout: wrapper enforces `--duration`; on expiry it sends SIGINT, which the upstream loop catches into its `AbortSignal` clean-stop seam.
- SIGINT forwarding: Ctrl-C / cron kill / wrapper timeout all route through the same `AbortSignal` so in-flight tool calls can finish only if already committed.
- stdout capture: every `[tool]`, `[trade]`, `[mining]`, `[battle]`, `[chat]` line is tee'd to a durable per-episode log at `logs/spacemolt-show/<episode-id>/<popid>-<timestamp>.log`. This path is proposed in engine-sheet territory; confirm with owning terminal before first run.
- Token accounting: `--benchmark` cumulative tokens-in/tokens-out is parsed from the final stdout lines and recorded in the episode JSON.
- Single-instance guard: wrapper takes a filesystem lock keyed by episode id so overlapping cron starts cannot duplicate an episode.

## 2. Mission brief (plans 1.1, 1.2)

Each episode loads a brief file passed to `--file`.

Template contents:

- In-character preamble in the cast member's voice register (bound by plan 1.2 pilot voice binding).
- Explicit recovery authority: when fuel < threshold, dock and `refuel`; when hull/module damage exceeds threshold, `repair` or `repair_module`; when stranded with no fuel and no credits, request dock-rescue explicitly.
- Mission objective: e.g., visit N systems, mine/target ore, trade, or survive a patrol window.
- Prohibitions: do not repeat the same failed action more than K times; do not ignore `no_fuel` state.

This directly addresses the previous homegrown miner failure mode: the agent ran 61 times, mined zero ore, then sat 71 days at `no_fuel` because the brief never authorized recovery actions.

## 3. Telemetry + adapter (plan 2.1)

Factual spine: `spacemolt-lib` WebSocket push event stream. This is zero cost against the 60 req/min per-IP public API budget shared across the fleet.

The runner opens a second WS connection using the same Clerk fleet API key (`SPACEMOLT_CLERK_KEY`) and records the typed notification stream for the player id associated with `undocked-<popid>`. Auth flow: `GET /api/registration-code` -> list owned players; `POST /api/player/{id}/ws-token` -> mint single-use WS token; connect and listen.

Per-episode output schema (`output/spacemolt-show/staged/<episode-id>.json`):

```json
{
  "episode_id": "E00001",
  "popid": "POP-12345",
  "session": "undocked-POP-12345",
  "window": { "started_at": "...", "duration_seconds": 900 },
  "credits_delta": 0,
  "systems_visited": [],
  "combat_results": { "kills": 0, "deaths": 0, "assists": 0 },
  "cargo": { "ore": 0, "items": [] },
  "mishaps": ["no_fuel", "stranded"],
  "typed_event_counts": { "mining_yield": 0, "trade_complete": 0, "battle_started": 0 },
  "captains_log": [
    { "ts": "...", "quote": "...", "provenance": "QUOTED_SUBJECTIVE_COLOR" }
  ],
  "tokens_in": 0,
  "tokens_out": 0,
  "log_path": "logs/spacemolt-show/E00001/..."
}
```

Adapter rules (deterministic, no LLM):

- Aggregate typed events into counts and deltas.
- Extract only the agent's own `chat_message` / `pirate_radio` lines as `captains_log` entries, marked `QUOTED_SUBJECTIVE_COLOR`.
- Never infer causality not present in the event stream.
- Never promote raw game output to canon.

## 4. Review gate (plan 2.2)

Staged episode JSON lands in a gated intake shaped like the existing `Reflection_Intake` pattern.

- No sim writes without explicit gate approval.
- A reviewer (builder or delegated canon gate) opens the staged JSON + log, decides whether the episode becomes a sim-facing cultural event.
- Approved events are emitted as the second played-event feed type (instance 1 is the sports feed), in exactly one new feed type — no framework generalization.
- Engine-sheet wires the approved feed into cycle intake and the evening-events engine per builder direction 2026-08-15.

## 5. Failure modes

| Failure | Mitigation |
|--------|-----------|
| Rate-limit backpressure | Runner tracks 60 req/min across the fleet; on 429 it pauses, logs, and resumes within the window. WS push events cost zero. |
| WS disconnect mid-episode | Exponential reconnect with ws-token re-mint; reconnects are logged; episode continues if within duration. |
| Agent strands (no fuel/credits) | Mission brief carries explicit `refuel` / `repair` / `repair_module` / dock-rescue authority. |
| Abort mid-tool-call | `AbortSignal` seam lets the upstream loop finish a committed call then exit cleanly; partial action is logged, not hidden. |
| Duplicate episode ids | Filesystem lock per episode id + timestamped session names prevent cron overlap. |
| Agent self-registers or invents credentials | Verify-001 (2026-08-15) proved this failure: `register` is Clerk-gated (registration code required) and the agent burned the whole episode hallucinating placeholder codes. Runner MUST pre-mint accounts via the Clerk registration code and pre-seed `sessions/<name>/credentials.json`; the mission brief must forbid calling `register`/`login` at all. |

## 6. Cost accounting

Verify-002 measurement (2026-08-15, openrouter/deepseek/deepseek-chat, 10-min
SIGINT cap, `--benchmark`, pre-seeded account): **1,306,485 tokens in / 5,360
out over 73 turns ≈ $0.20–0.40 per 10-minute episode at uncached list prices**
(repeated-context cache reads likely push real cost lower). Mission completed:
undock → navigate → mine 76 ore (5 types) → skill level-up → dock → sell for
206cr → refuel from critically low → relaunch. 4 tool errors, all
self-corrected; captain's-log handoff written unprompted (plan 1.2's pilot
voice works out of the box). Cadence math: 4 cast × 1 episode/week ≈ a few
dollars/month at this tier.

Verify-001 measurement (2026-08-15, same model): 800,553 tokens in / 16,233
out ≈ $0.12 — the *floor* for a doomed run (registration gate, zero game
actions), kept as the failure-mode baseline.

Acceptance criterion: one unattended scheduled episode completes under the cost cap and leaves a durable log plus staged JSON.

## 7. Explicit non-goals

- No casino ledger integration.
- No framework generalization beyond the second played-event feed type.
- No live canon writes from the runner or adapter.

---

**Next action requested:** research-build terminal review, path approval for `logs/spacemolt-show/`, and authorization to proceed to v0.2 acceptance run.
