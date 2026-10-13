# Cron model audit + OpenRouter key-limit read — 2026-10-12

engine-sheet, read-only, for research-build to carry to the builder. Nothing changed. Prices: OpenRouter `/api/v1/models`, read 2026-10-12, USD per 1M tokens in / out. "Newer" = a later release in the same family on OpenRouter. "Stronger" is claimed only between generations of one family. Across families it is untested here (model-fit evidence: [[2026-10-01-model-fit-open-character-results]]).

## 1. Key-limit failures

| Field | Finding | Source |
|---|---|---|
| Incidents | ONE window, 2026-09-15 10:45Z → 19:00Z. Each failure prints twice in the wake log, so the earlier "3 of 16" was a line count. Wakes lost: 2 (morning 12:30Z Vinnie Keane POP-00001, midday 17:30Z Travis Paiz POP-00222). The 02:30Z night wake on 09-16 hit a different error ("Provider returned error"). | `logs/citizen-wake.log.4.gz` :89–100 |
| Same window, other crons | civic-cron 10:45Z (council-d3 deepseek, both attempts), newsroom-fanout `citizenVoice` (11 lines), moltbook heartbeat 19:00Z | `logs/civic-cron.log.4.gz`, `logs/newsroom-fanout.log.4.gz`, `logs/moltbook-error.log.4.gz` |
| Key | All 31 key-limit lines name one key hash (`a196c76d182f…`, workspace `default`). That key is `OPENROUTER_API_KEY`, the one most crons share. | grep across `logs/*.gz` |
| Limit type | "total limit" = a credit cap set on the key with no reset period. Not a rate limit, not a daily quota. | error text |
| Now | `GET /api/v1/key` with the env key: `limit: null` (no cap), lifetime usage $81.75, this month $10.96, this week $0.88, today $0.20 | live read 2026-10-12 |
| Recurs? | No. One window, nothing since in the rotated or current logs. It can only recur if a cap is set on the key again. | |
| Scripts on the same env key | citizen-wake, citizen-exchange, cron-work-wake, cron-civic-run/gate/eval, cron-desk-writer (packet-v2 OpenRouter seats), cron-rhea-gate, cron-saturday-run, moltbook-heartbeat, discord-reflection, undocked, reflectionClassifier, mags-discord-bot, citizenVoice (newsroom-fanout) | `grep OPENROUTER_API_KEY` |
| Not on it | claude-mem has its own `CLAUDE_MEM_OPENROUTER_API_KEY` on the free `nvidia/nemotron-3-super-120b-a12b:free` (key not read, so whether it is the same key is unknown). loreWriter calls Google's API direct. notebooklm-daily is NotebookLM (no model string). | `~/.claude-mem/settings.json` (model line only), `scripts/loreWriter.js:192` |

## 2. Model audit — every cron-run LLM call

| Script / role | Seats | Model | $ in/out | Verdict | Cheaper AND stronger option | Canon voice? |
|---|---|---|---|---|---|---|
| citizen-wake.js reflection | all | deepseek/deepseek-chat (2024-12) | .32/.89 | older | anthropic/claude-haiku-5.5 .10/.50 is cheaper on both sides. Not compared on voice. | **yes, builder's call** |
| citizen-exchange.js | all | deepseek/deepseek-chat | .32/.89 | older | same as above | **yes** |
| cron-work-wake.js reflect | 9 packs | deepseek/deepseek-chat | .32/.89 | older | same | **yes** |
| cron-work-wake.js reflect | district-attorney | moonshotai/kimi-k2 (2025-07) | .57/2.30 | older | kimi-k2.5 .50/2.50 is newer and about the same price | **yes** |
| Desk packet-v2 angle + report | 12 seats | deepseek/deepseek-chat | .32/.89 | older | haiku-5.5 cheaper | no (internal stages) |
| Desk packet-v2 angle + report | 13 seats | meta-llama/llama-3.3-70b-instruct (2024-12) | .59/.79 | older | haiku-5.5 or llama-4-maverick .19/.65 cheaper | no |
| Desk write | business-desk | anthropic/claude-opus-5.5 | 4/20 | current-and-fit (lead desk; ruled) | — | yes |
| Desk write | firebrand, navarro, marbury, hal-richmond, maria-keen | anthropic/claude-sonnet-5 | 2/10 | older (same family) | **claude-sonnet-5.5 at the same 2/10: newer, no cost change** | yes (same family, smaller voice risk) |
| Desk write | carmen-delaine, anthony-raines, elliot-graye, kai-marston, lila-mezran, angela-reyes | anthropic/claude-haiku-5.5 | .10/.50 | current-and-fit (Haiku 4.5 last ran 2026-10-06; the ruling is complete) | — | yes |
| Desk write | trevor-shimizu, simon-leary, sharon-okafor, noah-tan, selena-grant, talia-finch | openai/gpt-5.6-luna (2026-07) | .20/1.20 | current | — | yes |
| Desk write | p-slayer, tanya-cruz, mason-ortega, rachel-torres, nia-rook (+weekly), celeste-tran | x-ai/grok-4.3 (2026-04) | 1.25/2.50 | older | grok-4.7 (2026-09) 2/6 is newer but **costs more** | yes |
| cron-rhea-gate.js audit | — | google/gemini-3.7-flash (fallbacks 3.5-flash, 3.5-flash-lite) | .75/3.75 | current-ish | gemini-3.8-flash (2026-09) at the same .75/3.75; 3.5-flash fallback is older and costs more (1.5/9) | no |
| cron-civic-run seats | MAYOR-01, DA-01 | moonshotai/kimi-k2 | .57/2.30 | older | kimi-k2.5 newer, about the same price | **yes (civic voice)** |
| cron-civic-run seats | COUNCIL-D2, D4 | meta-llama/llama-3.3-70b-instruct | .59/.79 | older | llama-4-maverick cheaper | **yes** |
| cron-civic-run seats | COUNCIL-D6, D7, D8 | google/gemini-3.7-flash | .75/3.75 | current-ish | gemini-3.8-flash, same price | **yes** |
| cron-civic-run seats | ~26 others + 4 projects | deepseek/deepseek-chat | .32/.89 | older | haiku-5.5 cheaper. The friction rule (parties never share a family) limits the swap. | **yes** |
| cron-civic-gate.js | — | **mistralai/mistral-large (2024-02)**, picked every Cycle because gemini always sits in the writer set | 2/6 | **older-and-pricier** | claude-haiku-5.5 (already the 3rd candidate) .10/.50; mistral-large-2512 .50/1.50 | no (checker) |
| cron-saturday-run | audit / narrator | gemini-3.7-flash / anthropic/claude-sonnet-5.5 | — | current | — | narrator yes |
| moltbook-heartbeat.js | default | deepseek/deepseek-chat (`MOLTBOOK_MODEL` env overrides) | .32/.89 | older | haiku-5.5 | out-of-world |
| moltbook-heartbeat.js | Anthropic fallback | claude-sonnet-4-6 | 3/15 | older-and-pricier | sonnet-5.5 2/10 | — |
| discord-reflection.js (3×/day) | — | anthropic/claude-sonnet-4.6 | 3/15 | **older-and-pricier** | **claude-sonnet-5.5 2/10: newer and cheaper, same family** | Mags persona |
| undocked (cron-undocked-run) | — | openrouter/deepseek/deepseek-chat | .32/.89 | older | haiku-5.5 | UNDOCKED canon |
| lib/reflectionClassifier.js | — | anthropic/claude-haiku-5.5 | .10/.50 | current | — | no |
| loreWriter (Fri) | — | gemini-3.7-flash via Google API | — | current-ish | gemini-3.8-flash | yes |

## Swaps that are cheaper (or same price) AND newer in the same family — no voice-family change

1. discord-reflection Sonnet 4.6 → Sonnet 5.5: 3/15 → 2/10.
2. Five desk writers Sonnet 5 → Sonnet 5.5: same price.
3. civic gate mistral-large → claude-haiku-5.5: 2/6 → .10/.50. The gate is a checker, not a voice, and the family is never a civic writer, so the independence rule holds.
4. moltbook's Anthropic fallback Sonnet 4.6 → Sonnet 5.5.

## Swaps that change voice (builder's call)

deepseek-chat → haiku-5.5 would cost less across citizen-wake, exchange, work-wake, civic seats and desk angle/report. It changes the writing family on canon-facing voices. In civic it also collides with the one-family-per-party rule.

## Costs more

grok-4.3 → grok-4.7 (1.25/2.5 → 2/6).

## Dead or stale config (no runtime effect today)

- `civic-office-map.json` PD-01 carries `qwen/qwen3-235b-a22b`, which OpenRouter no longer lists, and has no agentDir. The police-chief seat resolves to CHIEF-POLICE (deepseek). civic.34 dropped qwen.
- `cron-civic-gate.js:93` 4th candidate `nousresearch/hermes-4-70b` is no longer listed and is never reached.
- `desk-model-map.json` (deepseek/llama) is the legacy single-model route. Live packet-v2 writes follow `newsroom-wake-packages.json` (C111 drafts confirm).
