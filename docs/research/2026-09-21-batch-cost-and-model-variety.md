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
- **`adopt` — Claude tiers on batch for the mayor, Carmen and Mags**; pick the tier by voice quality, not price.
- **`watch` — Anthropic-native batch:** needs the builder to confirm the key and credits; only worth it if OpenRouter's `:batch` route disappoints.
- **`watch` — non-Claude families for council seats:** move only to a `:batch` sibling whose price is verified below standard; four listed `:batch` endpoints are more expensive than standard.
- **`take-nothing` — moving every wake to Fable 5.1 by default** before usage logging exists.

## Applications (living)

- (none yet)

## Changelog

- 2026-09-21 — Filed. OpenRouter batch verdict corrected from `watch` to `adopt`.
