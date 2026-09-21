---
title: Batch cost and model variety — what civic/Mags/Carmen cost now, and who batches
created: 2026-09-21
updated: 2026-09-21
type: reference
tags: [research, infrastructure, civic, cost, active]
sources:
  - https://openrouter.ai/api/v1/models — public model list, fetched 2026-09-21 (446 models, 74 `:batch` endpoints); all prices below are from it unless marked
  - https://openrouter.ai/docs/batch-quickstart — OpenRouter Batch API (cited in scripts/orBatch.js header)
  - output/cron-civic/directive_c104-c108.json, mayor_open_c104/c107/c108.json, mayor_gavel_c104/c105/c107.json — the only civic files that record `usage` and `cost`
  - scripts/orBatch.js (commits 5ca20b6e, 1ef8e265, 2026-08-29), output/or-batches.jsonl, output/or-batch_batch-*.md — an OpenRouter batch already run on anthropic/claude-sonnet-5
  - scripts/cron-saturday-run.js:514-575 (narrator model and rail), scripts/desk-model-map.json, scripts/newsroom-wake-packages.json (Carmen routing)
  - docs/research/2026-09-21-batch-inference-options.md — the Anthropic-native batch research this builds on
pointers:
  - "[[2026-09-21-batch-inference-options]] — Anthropic Message Batches, first pass; this file corrects its OpenRouter verdict"
  - "[[../plans/2026-09-21-civic-sunday-stage-machine]] — the plan that would consume this"
  - "[[../reference/CIVIC_GAME_LOOP]] — current civic shape"
  - "[[index]] — registered same commit"
---

# Batch cost and model variety

**Source:** OpenRouter's public model list (no key), the civic run outputs, the Saturday and desk scripts, and the repo's own earlier OpenRouter batch run. Anything I could not measure is marked ESTIMATE or NOT VERIFIED.

**What this addresses:** The builder wants to move civic, the civic desk (Carmen), the Saturday Mags run, and possibly Mags and Elias Varek as citizen voices onto strong Claude models at batch price, and asked what those runs cost now, whether the math makes sense, and which other model families batch so factions can keep different "opinions."

## Findings

**1. OpenRouter batch is proven in this repo, on Claude, on the key we already hold.** `scripts/orBatch.js` (2026-08-29) submits to OpenRouter's Batch API with `anthropic/claude-sonnet-5`; two batches ran (`output/or-batches.jsonl`), both returned `status_code 200`. Its header records why: the Anthropic direct batch path bills Anthropic API credits, "which the project no longer holds"; OpenRouter batch bills the existing `OPENROUTER_API_KEY` at half the standard rate. This corrects the earlier verdict in [[2026-09-21-batch-inference-options]] (OpenRouter `watch`, availability unverified): availability is now verified per model (finding 3) and the rail is already working. Whether the Anthropic key holds any credits today is NOT VERIFIED (the builder said he would check).

**2. Current civic spend is pennies. Measured where logged, estimated elsewhere.**
Only three civic call types record `usage` (with a `cost` field from OpenRouter): the Sunday directive, the mayor's open and the mayor's gavel. Voices, project directors, datawake and work-wake record no tokens.

| Run type | Calls/wk | Tokens in / out per call | Basis |
|---|---|---|---|
| Directive (gemini-3.7-flash, incl. ~1.9k reasoning) | 1 | 6,573 / 3,725 | MEASURED, 5 cycles C104–C108, avg cost $0.0188 |
| Mayor open + gavel (kimi-k2, earlier mistral) | 2 | 8,582 / 1,482 | MEASURED, 3 calls, avg cost $0.0086 |
| Sunday voices + project directors | ~15 | ~8,500 / ~900 | ESTIMATE: prompt size assumed equal to the measured mayor prompt; output from stored voice files (avg 3.3 KB) |
| Datawake seats | ~44 | ~4,000 / ~350 | ESTIMATE: pack ~4.5 KB + agent files ~6.3 KB + schema; stored statements avg 850 chars; 11 seats × Mon–Thu |
| Work-wake | ~16 | ~2,500 / ~300 | ESTIMATE: max_tokens 260, ~600-char nodes; count assumed |
| **Weekly total** | ~78 | **~367k in / ~40k out** | |

Current weekly cost at the models actually used (measured rows exact; the rest priced as `deepseek/deepseek-chat` at $0.32 in / $0.89 out per MTok, the seat majority per the earlier research): about **$0.18 a week, roughly $0.76 a month.**

**3. Batch availability per model family** (OpenRouter public list; `:batch` endpoints present or absent):

| Family | Model we use now | `:batch` today | Notes |
|---|---|---|---|
| Claude | none in civic; Saturday narrator = claude-sonnet-4-6 | Fable 5.1 / 5, Opus 5 / 4.8–4.1, Sonnet 5 / 4.6 / 4.5, Haiku 4.5 | Standard price exactly halved on all |
| Gemini | gemini-3.7-flash (directive, 3 seats) | 3.8-flash, 3.7-flash, 3.6-flash, 3.5-flash(-lite), 3.1-pro, 2.5-flash/pro | Halved |
| DeepSeek | deepseek-chat (27 seats) | v4-pro-0813 (halved: $0.66 / $1.98); v4-flash-0731 (**listed above** standard: $0.11 / $0.33 vs $0.04 / $0.16); v4-flash-vision-exp | **`deepseek-chat` itself has no `:batch`** |
| Kimi / Moonshot | kimi-k2 (mayor, 2 seats) | kimi-k3 only ($3.0 / $15.0, **above** its $1.7 / $8.5 standard) | k2 has none |
| Llama | llama-3.3-70b (2 seats, p-slayer) | none for it; `meta/muse-glimmer-30b:batch` exists | 3.3-70b has none |
| Qwen | qwen3-235b (1 seat) | qwen3.8-2.4t-a95b (same as standard), qwen3.5-9b (above standard) | 235b has none |
| Mistral | mistral-medium-3.1 earlier | medium-3.5, medium-3.1, large-2512, small-2603, ministral-8b | Halved-ish |
| OpenAI GPT | none | gpt-6-astra, gpt-5.6 luna/terra/sol, gpt-5.x, gpt-4.1 and more | Halved |
| xAI Grok | none in civic | grok-4.3 only ($1.0 / $2.0 vs standard $1.25 / $2.5, 0.8×) | Small discount |
| Others | | glm-5.x, minimax-m3, thinkingmachines/inkling | Mostly ~same as standard |

Across the 74 `:batch` endpoints paired with a standard listing: 62 are half price or lower; 7 are within ~0.8–1.0× of standard; **4 cost more than standard** (deepseek-v4-flash-0731 2.75×, kimi-k3 1.76×, qwen3.5-9b 1.7×, glm-5.2 1.08×). **The discount is not universal: price each model before assuming it.** Provider-native batch programs for DeepSeek, Moonshot and others were not checked (NOT VERIFIED).

**4. Cost of the same weekly civic volume on Claude at batch price** (367k in / 40k out per week; ESTIMATE for the token split; no prompt caching, no extra thinking tokens):

| Model (OpenRouter `:batch`) | $/MTok in / out | $/week | $/month |
|---|---|---|---|
| Current mixed chain (measured + deepseek-chat estimate) | mixed | 0.18 | 0.76 |
| Gemini 3.7 flash batch | 0.375 / 1.875 | 0.21 | 0.92 |
| Haiku 4.5 batch | 0.50 / 2.50 | 0.29 | 1.23 |
| Sonnet 5 batch | 1.00 / 5.00 | 0.57 | 2.46 |
| Opus 5 batch | 2.50 / 12.50 | 1.42 | 6.16 |
| Fable 5.1 batch | 5.00 / 25.00 | 2.85 | 12.32 |
| Fable 5.1 standard, for comparison | 10.00 / 50.00 | 5.69 | 24.65 |

Reading it: putting **all** civic wakes on Fable 5.1 batch costs about $12 a month, roughly 16× today's spend, against a total that is still small in absolute terms. Thinking tokens bill as output: cap output and set effort low or the output side is understated.

**5. The other voices the builder asked about.**
- **Mags Saturday narration** already runs Claude, `claude-sonnet-4-6` through OpenRouter's Anthropic-compatible rail (`NARRATOR_PROVIDER` defaults to `openrouter`; direct Anthropic only if set). Tokens are not logged. ESTIMATE 15k in / 2k out (output ~1.5k tokens from the 5.7–6.3 KB pulse): $0.075 a run now; Fable 5.1 batch $0.125, Fable 5.1 standard $0.25. About $0.54 a month on Fable batch against $0.32 now.
- **Elias Varek as a citizen voice:** the agent files are 16.9 KB (~4.2k tokens). ESTIMATE 7k in / 500 out per wake: $0.0475 on Fable 5.1 batch.
- **Carmen Delaine (civic desk)** runs three wakes a day Mon–Fri (angle 06:15, report 13:15, write 18:15) on `deepseek/deepseek-chat` (`newsroom-wake-packages.json`, CARMEN-LEP2-1). Tokens are not logged; the write step is a tool loop that accumulates usage. UNIT ESTIMATE 20k in / 2k out per wake: DeepSeek $0.008, Sonnet 5 batch $0.03, Fable 5.1 batch $0.15; 15 wakes a week is $0.12 on DeepSeek, $0.45 on Sonnet 5 batch, $2.25 on Fable 5.1 batch. The desk `write` stage also runs a Rhea gate; that is not costed here.

## Extraction — what's usable

- **Rail:** OpenRouter batch already works on the key the sim uses; no Anthropic credits are needed for it. What still needs verifying is the OpenRouter credit balance, not the Anthropic one.
- **Model choice is a quality decision; money is not the constraint.** The whole civic week is under $3 on Fable 5.1 batch. The reason to keep cheap models is faction variety, not cost.
- **Faction variety, from findings only:** families that batch today and are cheap — Gemini flash ($0.375 / $1.875), Mistral (small/medium/large), DeepSeek v4-pro ($0.66 / $1.98), Haiku 4.5 — can hold the council seats; the current `deepseek-chat`, `llama-3.3-70b`, `kimi-k2` and `qwen3-235b` cannot batch and would need to move to a batching sibling (deepseek-v4-pro, kimi-k3 at a higher price, a Qwen 3.8) or stay on real-time calls. Different labs' models on different factions keep the "different opinions" the builder wants; Claude for the mayor, the civic desk and Mags is affordable at any tier.
- **Stage machine cost note:** batch is single-shot, so the inline retry/fallback loop cannot run; a resubmit costs one more (small) call.
- **Gap to close before any change:** log `usage` for voices, datawake, work-wake, Carmen and the Saturday narration. Today only three call types record it, so every estimate above stands on an assumed prompt size.

## Verdict

- **`adopt` — OpenRouter Batch API as the batch rail** (proven in-repo, existing key, `:batch` list verified). Supersedes the `watch` in the first research file.
- **`adopt`, CONDITIONAL — Claude tiers on batch for the mayor, Carmen and Mags**; pick the tier by voice quality, not price. **Blocked today:** OpenRouter rejected every Claude `:batch` submit on 2026-09-21 (see Failure evidence, Section 3) although the same route ran Sonnet 5 on 2026-08-29. Re-verify with a 1-request batch before building on it; fallbacks are Anthropic credits or a working `:batch` model.
- **`adopt` — Gemini 3.7 Flash and DeepSeek v4-pro `:batch` as the verified working batch families** (completed 6–13 min, schema-complete JSON at adequate `max_tokens`).
- **`watch` — Anthropic-native batch:** needs the builder to confirm the key and credits; only worth it if OpenRouter's `:batch` route disappoints.
- **`watch` — non-Claude families for council seats:** move only to a `:batch` sibling whose price is verified below standard; four listed `:batch` endpoints are more expensive than standard.
- **`take-nothing` — moving every wake to Fable 5.1 by default** before usage logging exists.

## Failure evidence and Mags pricing

Evidence gathered 2026-09-21 by a live probe (scratch script, six tiny batches, total spend about $0.006; account balance read back at about $8.4–8.6 of $70 purchased) plus the repo's own history. Anything not observed is marked NOT VERIFIED.

### 1. What the repo's own August batches show

- Two Sonnet 5 batches (2026-08-29, one 121-file 347 KB packet each, `output/or-batches.jsonl`): the generation timestamp on batch 1 is 625 s after submit (~10.4 min); batch 2's output file was fetched 11.7 min after submit (upper bound). Latency was minutes, not hours, on a ~129k-token prompt.
- **Batch 1 "succeeded" and was unusable:** HTTP 200, `finish_reason: length`, 32,000 completion tokens of which 31,999 were reasoning, `content: null`. Billed anyway (usage 128,930 in / 32,000 out; about $0.29 at the listed Sonnet 5 batch price, estimate). Fixed by disabling reasoning (`scripts/orBatch.js`, commit 1ef8e265) and resubmitting.
- No usage/cost was stored for batch 2.

### 2. Docs (https://openrouter.ai/docs/batch-quickstart)

- `POST /api/v1/batches`, `GET /api/v1/batches/:id`, list, delete. Statuses: `validating`, `in_progress`, `completed`, `failed`, `expired`, `cancelled` (plus transient `finalizing`, `cancelling`). Window: `24h` only. Results come back inline on the GET, stored 30 days.
- Per result exactly one of `response` or `error`. `request_counts` = total/completed/failed.
- **Not stated in the docs:** whether failed requests are billed, what happens at expiry beyond the status, rate limits, max requests per batch, max batch size, result ordering.
- `scripts/orBatch.js` still uses the older `/api/beta/batches` route; the docs only mention `/api/v1/batches`.

### 3. Live probe — what actually happened

| Case | Result |
|---|---|
| Gemini 3.7 Flash `:batch`, 2 valid requests | Completed in **365 s** (6.1 min). Cost $0.0019 for both. |
| DeepSeek v4-pro-0813 `:batch`, 1 request | Completed in **770 s** (12.8 min). Schema-complete JSON, 100 completion tokens, cost **$0.00026**. |
| Gemini, 3 requests incl. `max_tokens` 500,000 | Completed in **768 s**, 3 of 3 ok, cost $0.0039. The huge `max_tokens` was accepted, not rejected. |
| Gemini with `reasoning: {enabled: false}` | **Whole batch failed in 3 s**: "Reasoning is mandatory for this endpoint and cannot be disabled." `results: null`, `usage: null`. |
| Gemini, `max_tokens` 300 | Request "succeeded" (`finish: length`) with **truncated, unparseable JSON**: 286 of 296 tokens were mandatory reasoning. Billed. |
| Gemini, `max_tokens` 1200 | Schema-complete JSON; reasoning 603 of 681 completion tokens (~88%). |
| One request with empty `messages` among 4 | **All 4 failed** in 21 s at validation, `request_counts.failed = 4`, `usage: null`, one error naming the bad `custom_id`. No partial results. |
| A request body whose `model` differs from the batch `model` | Whole submit rejected 400: "Each batch request body model must match the top-level model." One batch = one model. |
| Duplicate `custom_id` | Whole submit rejected 422. |
| Estimated cost above balance (`max_tokens` 10,000,000) | Submit rejected 402: "estimated to cost $18.76, which exceeds your available balance of $8.57" — the reservation is priced off `max_tokens`. |
| **`anthropic/claude-sonnet-5`, `:batch`, `claude-haiku-4.5:batch`, `claude-sonnet-4.6:batch`, on `/api/v1/batches` and `/api/beta/batches`** | **All rejected 400: "Model ... does not have a :batch endpoint."** The public model list and its endpoints record still show an Anthropic `:batch` endpoint, and the same route ran Sonnet 5 on 2026-08-29. Cause NOT VERIFIED. |
| Result order | Returned `good-1, overlimit, good-2` for a submit order of `good-1, good-2, overlimit`: **order is not preserved; match by `custom_id`.** |

Every batch that ran took 6–13 minutes, well inside the 24 h window. Every rejection happened at submit or within about 20 s, before any generation, so nothing model-related was billed on the failed batches (`usage: null`).

### 4. Mags's Saturday narration priced (ESTIMATE)

`scripts/cron-saturday-run.js` `stepNarrate` sends one call per week: a ~900-character charge plus the week's curated articles, each capped at 2,400 characters (`edition_curation_c104…c107.json`: 7, 9, 9, 9 selected), and asks for 900–1,200 words at `max_tokens` 2200. Measured outputs `cycle_pulse_c104…c107.md`: 958–1,048 words (5.7–6.3k chars). Estimated size per run: **~5.8k tokens in (upper bound from 9 x 2,400 chars at ~3.9 chars/token), ~1.5k tokens out.** Prices from OpenRouter's public model list (per MTok in/out):

| Model | $/run | With +4k thinking tokens | $/month (4.3 runs) |
|---|---|---|---|
| Sonnet 4.6 standard (current; $3 / $15) | 0.040 | 0.100 | 0.17 |
| Sonnet 4.6 batch ($1.50 / $7.50) | 0.020 | 0.050 | 0.09 |
| Opus 5 batch ($2.50 / $12.50) | 0.033 | 0.083 | 0.14 |
| Fable 5.1 standard ($10 / $50) | 0.133 | 0.333 | 0.57 |
| **Fable 5.1 batch ($5 / $25)** | **0.066** | **0.166** | **0.29** |

Mags on Fable 5.1 is about **$0.07 a run, roughly $0.29 a month** at batch price; thinking tokens bill as output, so cap effort and `max_tokens`. The catch is the same as Section 3: OpenRouter's Claude `:batch` route rejected every submit today.

### 5. Design implications (from the evidence only)

| Failure mode | Seen? | Cheapest handling |
|---|---|---|
| **One malformed request kills the whole batch** (empty messages, bad model in a body, duplicate `custom_id`, unsupported parameter) | Yes, submit or ~20 s | Validate every request locally before submit (non-empty messages, unique `custom_id`, body model equals batch model, per-model parameter table). Resubmit the batch minus the offender on `failed` with all-failed counts. |
| **Per-model parameter rules** (Gemini: reasoning mandatory) | Yes | Keep a small per-model request profile (reasoning on/off/effort, min `max_tokens`) beside the model map; never send one profile to all families. |
| **"Succeeded" but unusable** (reasoning ate `max_tokens`: `content: null` or truncated JSON, billed) | Yes, on both Sonnet 5 and Gemini | Treat `finish_reason: length` or unparseable JSON as invalid; size `max_tokens` for reasoning + answer (Gemini needs about 1,200 for a small JSON); resubmit only those seats in the next window. |
| **Unusable Claude route** ("does not have a :batch endpoint") | Yes, today | Probe the model with a 1-request batch at submit; on rejection fall back to a listed working `:batch` model, or add Anthropic credits and use the direct batch API. Do not build the civic machine on Claude-batch until it is re-verified. |
| **Result order** | Yes, not preserved | Key results by `custom_id` = seat + cycle, always. |
| **Balance reservation** | Yes, 402 | Check balance before submit; cap `max_tokens` per request so the reserved estimate stays small; top up before the week. |
| **Latency** | 6–13 min observed | Poll every 5–10 min with no model calls; an `expired` batch at 24 h means resubmit. Expiry behavior itself NOT VERIFIED. |
| **Late results / provider outage** | Not observed | Per-seat state (`submitted` / `collected` / `pending`) so a late batch never blocks the tracker close; NOT VERIFIED beyond that. |
| **One batch = one model** | Yes | Group seats by model into separate batches; mixed-faction weeks mean several small batches, not one. |

## Applications (living)

- (none yet)

## Changelog

- 2026-09-21 — Filed. OpenRouter batch verdict corrected from `watch` to `adopt`.
- 2026-09-21 — Added §Failure evidence and Mags pricing (live probe): Claude `:batch` submits rejected today; batch failures are all-or-nothing at validation; Gemini/DeepSeek batches verified; Mags on Fable 5.1 batch ~$0.07/run.
