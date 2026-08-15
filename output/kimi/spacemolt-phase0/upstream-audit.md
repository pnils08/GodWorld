# SpaceMolt Phase 0 — upstream audit (kimi, 2026-08-15)

Static audit of shallow clones at `output/kimi/spacemolt-phase0/{commander,spacemolt-lib}`
(both cloned 2026-08-15, `--depth 1`). No live session, no account creation, no
install. Plan: `docs/plans/2026-08-07-spacemolt-game-show.md` items 0.1/0.2/0.4.

## Verdicts

| Plan item | Verdict | Why |
|---|---|---|
| 0.2 Commander adopt-verify | **READY-WITH-WRAPPER** | AbortSignal seam + per-turn round cap exist; no CLI turn/cost cap, no durable JSON action log — both are wrapper jobs |
| 0.4 Telemetry source | **PICK: spacemolt-lib WS event stream** (fallback: MCP `get_action_log`/`captains_log`) | Typed push events cost zero against the 60 req/min IP budget; action-log polling spends it |
| 0.1 execution note (Clerk vs register/login) | **ANSWERED** | One Clerk key owns the fleet; `registrationCode` links new accounts; commander uses per-account user/pass — the flows coexist |

## 0.2 — Commander (v0.4.0, MIT, Bun + @mariozechner/pi-ai)

- **Stop seam exists:** `runAgentTurn(..., options?.signal)` — checks
  `signal.aborted` before every LLM call and inside tool execution
  (`commander/src/loop.ts:42,107`). Main driver is `while (running)` around
  `runAgentTurn` (`commander/src/commander.ts:421`). A wrapper sets a
  wall-clock timer → abort → clean exit. No code change needed for a
  time-capped episode.
- **No native one-shot/turn-cap flag.** CLI flags are only: `--model`,
  `--session`, `--url`, `--file`, `--debug`, `--no-sanitize`,
  `--force-credentials`, `--benchmark` (`commander/src/commander.ts:67-115`).
  Per-turn tool rounds are capped internally (`MAX_TOOL_ROUNDS`,
  `loop.ts:40`) but turns repeat until aborted. Episode cap = wrapper's job
  (timeout + abort). Cost cap = not enforceable in-process; measure from
  pi-ai usage accounting or OpenRouter dashboard after the verify run.
- **OpenRouter is native:** `openrouter` provider with `OPENROUTER_API_KEY`
  (`commander/src/model.ts:40`); model string `openrouter/<provider>/<model>`.
- **Action log is console-only.** All tool/results logging goes through
  `ui.ts` to stdout — no `writeFileSync`/`appendFileSync` outside
  `session.ts` (which writes only credentials.json + TODO.md). Durable
  per-episode JSON = wrapper captures stdout (structured `[tool]`/`[trade]`
  lines, see README) or a small patch adding a file sink. Prefer wrapper
  capture: zero upstream divergence.
- **Auth:** commander self-registers via the game's HTTP API
  (`register`/`save_credentials` tools, `commander/src/tools.ts:19-27`) and
  stores per-session `credentials.json` under `sessions/<name>/`
  (`commander/src/session.ts:11-30`). One cast member = one `--session` name
  = one credentials file. Clean multi-cast model.
- **Recovery:** `refuel`, `repair`, `repair_module` are first-class actions
  (`spacemolt-lib/src/generated/actions.gen.ts:204,214-215`); mission briefs
  must explicitly authorize refuel/repair/dock-when-stranded (the old miner
  died of exactly this absence). README demo shows spontaneous refuel
  behavior, but do not rely on it — put it in the brief.

## 0.4 — Telemetry: spacemolt-lib (v12.1.0, MIT) WS stream vs MCP action log

- **Typed push events** (`spacemolt-lib/src/generated/notifications.gen.ts:126+`):
  `battle_started/update/ended`, `player_kill`, `player_died`,
  `mining_yield`, `trade_complete`, `chat_message`, `pirate_radio`,
  `base_destroyed`, `drone_destroyed`, `skill_level_up`,
  `achievement_unlocked`, ~33 typed msg_types total. This is episode-adapter
  gold: combat outcomes, deaths, trade results, and color (pirate radio,
  chat) arrive typed and timestamped with **zero polling**.
- **Rate budget:** the known 60 public-API req/min per IP (plan 0.1b) applies
  to HTTP polling. The WS stream is push — the fleet's budget stays free for
  the episode runner's actual game actions.
- **Fallback:** MCP `get_action_log`/`captains_log` remain useful —
  `captains_log` is the pilot-voice material for plan 1.2 regardless. Pick:
  WS stream as the adapter's factual spine; `captains_log` harvested
  post-episode for quoted subjective color.

## 0.1 — Clerk-key fleet model (execution note resolved)

`spacemolt-lib/src/auth/clerk.ts` header documents it exactly:
`GET /api/registration-code` returns the owned-player list + a one-time
**registration code that links a new `register` to the Clerk user**;
`POST /api/player/{id}/ws-token` mints single-use (~5 min) WS login tokens.
So: mint each cast account via in-game `register` with the registration
code → all cast accounts owned by the one show Clerk key → commander pilots
via per-account user/pass sessions, the lib watches the whole fleet over WS.
The Mags account stays untouched (plan 0.1 decision intact).

## Held for explicit go (0.2 acceptance run)

One bounded live episode on OpenRouter cheap tier against the live server —
touches external game state and spends cents, so it waits for Mike's go.
Proposed shape: fresh throwaway session, mission "mine ore, sell, refuel,
dock", wrapper timeout ~10 min, stdout captured to
`logs/spacemolt-show/verify-episode.json`. Deliverable: cost-per-episode
number + durable log, per the plan's acceptance criteria.

## Code health notes

- commander: v0.4.0, tests exist (`model.test.ts`, `paths.test.ts`), single
  dep (pi-ai), Bun-compiled single binary releases available.
- spacemolt-lib: v12.1.0, `tests/` dir, generated-from-OpenAPI internals
  (`fetch-spec`/`generate` scripts), full `check` pipeline. Healthy upstream.
