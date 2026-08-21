---
title: Consolidate Model Calls on OpenRouter
created: 2026-08-20
updated: 2026-08-20
type: plan
tags: [infrastructure, cost, model-routing, draft]
sources:
  - Mike-direct 2026-08-20 (S385) — "move Rhea, Mags Saturday run, and the Discord bots to OpenRouter; the models they use run there too; unless the Anthropic API is cheaper it's easier to have it all in one place; shouldn't change performance and gets more model choices"
  - Inventory run 2026-08-20 — grep of ANTHROPIC_API_KEY / OPENROUTER_API_KEY across scripts/
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — infrastructure.7 row"
  - "[[../MODEL_HIERARCHY]] — routing + per-model strength notes"
  - "[[../index]] — indexed same commit"
---

# Consolidate Model Calls on OpenRouter

**Goal:** one API surface for the sim's model calls instead of two. Same models, same performance, one key, one bill, and a wider model menu when a lane needs to switch.

**Mike's framing (verbatim intent):** the models these scripts call are available on OpenRouter too, so unless the Anthropic API is genuinely cheaper for a given model, having it all in one place is easier. Performance shouldn't change. The upside is more model choices.

**The one thing that decides it:** OpenRouter adds a margin on top of provider pricing for most models. If that margin is real and non-trivial at our volume, "cheaper" fails and the consolidation is a convenience purchase, not a saving — which is still a legitimate reason to do it, but Mike should be told which one he's buying. **Price the actual models we call before migrating anything.**

---

## Inventory (verified 2026-08-20, not assumed)

**Already on OpenRouter only** — nothing to do:
`cron-rhea-gate.js`, `cron-civic-run.js`, `cron-civic-gate.js`, `cron-civic-eval.js`, `citizen-wake.js`, `citizenVoice.js`, `citizen-exchange.js`, `undockedEpisode.js`, `draftContentRows.js`, `buildNeighborhoodTexture.js`, `classifierGate.js`, `lib/reflectionClassifier.js`

**Dual-caller — has BOTH keys; find and repoint the Anthropic branch:**

| Script | anthropic refs | openrouter refs | models seen |
|---|---|---|---|
| `cron-saturday-run.js` | 3 | 3 | claude-sonnet-4-6 |
| `cron-desk-writer.js` | 5 | 3 | claude-sonnet-5, anthropic/claude-sonnet-5, claude-opus-4-8 |
| `moltbook-heartbeat.js` | 4 | 4 | claude-sonnet-4-6 |

Note `cron-desk-writer.js` already calls the SAME model both ways (`claude-sonnet-5` direct and `anthropic/claude-sonnet-5` via OpenRouter) — that file is the cheapest possible A/B for the price question and should be measured first.

**Anthropic-only — the actual migration list:**

| Script | Model | Notes |
|---|---|---|
| `rheaTwoPass.js` | claude-haiku-4-5 | Rhea's verification pass. Mike named this one first. |
| `mags-discord-bot.js` | claude-haiku-4-5 | Discord retired for now — migrate anyway so it comes back on the right rail. |
| `discord-reflection.js` | — | Same class as above. |
| `photoQA.js` | claude-haiku-4-5 | **Vision.** Confirm the OpenRouter route accepts image input identically. |
| `generate-edition-photos.js` | claude-haiku-4-5 | Prompt-side is Haiku; **image generation itself may be a different provider — check before assuming OpenRouter covers it.** |
| `generate.js` | — | Check what it still serves. |
| `crawlSheetsArchive.js` | — | Low frequency. |
| `citizenLifePoC.js` | — | PoC — confirm it is still live before spending effort. |
| `daily-reflection.js` | — | Documented DISABLED S187 / deleted at S340. **Verify it still exists before touching it.** |
| `openclaw-skills/media-generator/index.js` | — | Outside the sim proper; lowest priority. |

---

## Tasks

### Task 1: Price it before moving it — ✅ DONE 2026-08-20

Pulled live from `https://openrouter.ai/api/v1/models`; Anthropic-direct rates from the bundled `claude-api` skill's model table.

| Model | Anthropic direct in/out per 1M | OpenRouter in/out per 1M | Delta |
|---|---|---|---|
| `claude-haiku-4-5` → `anthropic/claude-haiku-4.5` | $1.00 / $5.00 | $1.00 / $5.00 | **$0.00** |
| `claude-sonnet-5` → `anthropic/claude-sonnet-5` | $2.00 / $10.00 (intro, reverts to $3.00 / $15.00 on 2026-09-01) | $2.00 / $10.00 | **$0.00** |
| `claude-sonnet-4-6` → `anthropic/claude-sonnet-4.6` | $3.00 / $15.00 | $3.00 / $15.00 | **$0.00** |

**There is no inference markup.** OpenRouter's own FAQ: "we pass through the pricing of the underlying providers without any markup, so you pay the same rate as you would directly." Verified against the live model endpoint — every rate matches to the cent.

**Where the cost actually is:** a fee on *credit purchases*, not on tokens — **5.5% (min $0.80) by card**, 5% by crypto. So consolidating costs ~5.5% more per dollar of model spend, paid at top-up time rather than per call. BYOK is a separate 5% path with a $25k/mo free allowance on pay-as-you-go, which at this project's volume means BYOK would be **fee-free** — worth pricing if the 5.5% ever matters.

**Two findings not in the original question:**
- **Batch rates are half.** `anthropic/claude-haiku-4.5:batch` is $0.50 / $2.50; `:batch` Sonnet 5 is $1.00 / $5.00. Anything that doesn't need a synchronous answer is 50% off on the same model. Worth a look for Rhea if grading can tolerate a queue.
- **Sonnet 5's $2/$10 is introductory and ends 2026-08-31** on both rails. Any before/after cost comparison run across that date will look like a 50% regression that has nothing to do with OpenRouter.

**Volume note:** `rheaTwoPass.js` does not log token usage, and there is no local spend log, so no dollar figure is available without instrumenting it first. The percentage above is the honest answer; the absolute number isn't derivable from what's on disk.

**Verdict for Mike:** identical token pricing, so this is a convenience purchase costing ~5.5% at top-up — bought for one key, one bill, and a wider model menu. Not a saving, and not a penalty on the calls themselves.

### Task 1b: Batch — verified mechanics, and what can actually use it

Mike's read on 2026-08-20: the project is a hobby with no deadline, cron wakes have hours of gaps, and nothing but interactive queries needs an instant answer — so batch should be close to free money. **Directionally right, with two constraints that change how it gets built.**

**Verified against `openrouter.ai/docs/batch-quickstart`:**

| Fact | Detail |
|---|---|
| Discount | 50% of standard per-token pricing |
| Endpoint | `POST /api/beta/batches`, `GET /api/beta/batches/:id` — **a separate beta API**, not the `/chat/completions` call with a `:batch` model id |
| Flow | Submit-and-poll. `202 Accepted` → `validating → in_progress → finalizing → completed` |
| **Turnaround** | **24-hour completion window.** No faster SLA is promised. |
| Input | Inline JSON: `{endpoint, model, requests:[{custom_id, body}]}`. No JSONL upload. |
| Retention | Results held 30 days |
| **Rejected** | **Image, audio, video, and file content.** Multimodal must stay on the sync API. |

**Constraint 1 — the 24-hour window, not the discount, is the design driver.** Batch is not "a few hours"; it is "any time within 24h." Every job whose output feeds another job *the same day* breaks under it. From the live crontab:

| Chain | Gap | Batchable as-is? |
|---|---|---|
| `cron-civic-run --stage=datawake` 05:45 → `cron-desk-run --stage=angle` 06:15 | 30 min | **No** |
| desk `angle` 06:15 → `report` 13:15 → `write` 18:15 | 7h, then 5h | **No** |
| `newsroom-digest` 06:00 → `notebooklmDailyNews` 08:00 | 2h | **No** |
| `citizen-wake` morning/midday/night 07:30 / 12:30 / 21:30 | 5h, 9h | **No** — a wake returning late lands in the wrong slot |
| `citizen-exchange` 17:00 | terminal output | **Yes** |
| `cron-undocked-run` 20:30 | terminal output | **Yes** |
| `moltbook-heartbeat` 14:00 | terminal output | **Yes** |
| `buildCitizenBondGraph` Sun 23:07 | weekly, terminal | **Yes** |
| `photoQA.js`, `generate-edition-photos.js` | vision/image | **Never** — multimodal is rejected outright |

So the drop-in wins are the *terminal* jobs — the ones nothing downstream waits on. That is a real but modest slice.

**The bigger option, which is Mike's call and not a mechanism decision:** run the pipeline **one day behind**. Submit each stage's batch when the current stage finishes and consume it on tomorrow's run. Given "no deadline," the sim genuinely does not care whether an edition is composed from today's or yesterday's wake — the cycle is the clock, not the wall. That converts nearly the whole fleet to 50% and costs one day of latency that nobody in the world experiences. It is a pipeline-cadence redesign, not a migration, and should be decided separately from this plan.

**Constraint 2 — Rhea is the hard case.** She is a gate: she grades an article and the verdict decides publish/no-publish inline, at the 18:15 write stage (`--gate-backend api`). Batching her means the write stage itself becomes async. Rhea should migrate to OpenRouter *sync* first (Task 3 as written), and only move to batch if the day-behind cadence is adopted.

**Pricing note that matters for the next 11 days:** Sonnet 5's `$2/$10` is an *introductory* rate against a `$3/$15` standard — a 33% discount that **ends 2026-08-31**, not a new one arriving. Batch is a separate, standing 50%. They stack: `anthropic/claude-sonnet-5:batch` is **$1.00/$5.00 today** — one third of standard sync — and becomes $1.50/$7.50 on 2026-09-01.

### Task 2: Repoint the dual-callers
`cron-desk-writer.js` first — it already runs the same model both ways, so switching the Anthropic branch off is a one-line change with an existing OpenRouter path to fall into. Then `cron-saturday-run.js`, then `moltbook-heartbeat.js`.
- **Verify:** each script's existing test passes; one live run per script matches prior output shape.

### Task 3: Migrate Rhea
`rheaTwoPass.js` → OpenRouter `anthropic/claude-haiku-4-5`. Rhea is the canon gate, so this is the one where a silent behaviour change matters most.
- **Verify:** run the existing Rhea tests (`cronRheaPersonaGate.test.js`, `cronDeskRheaProof.test.js`, `cron-rhea-gate.test.js`), then re-grade one already-graded article and confirm the verdict matches.

### Task 4: Migrate the rest
Discord pair, then `generate.js` / `crawlSheetsArchive.js`. **Handle the two image scripts separately** — vision input and image generation are the two places "the same models run on OpenRouter" is most likely to be false.
- **Verify:** per-script, whatever test exists; for the photo path, an actual rendered image.

### Task 5: Retire the key, or don't
If everything lands, decide whether `ANTHROPIC_API_KEY` stays in the env as a fallback or comes out. Leaving it is fine; leaving it *and* leaving a live code path that uses it silently is not.
- **Verify:** `grep -rl ANTHROPIC_API_KEY --include=*.js . | grep -v node_modules` returns only what was deliberately kept.

---

---

## Tasks 2–4 — ✅ DONE 2026-08-20 (`664de075`)

**The finding that made this cheap:** OpenRouter serves a fully **Anthropic-compatible `/v1/messages` endpoint**. Migration is a client-construction change, not a rewrite — same SDK, same request shapes, same models. Point the client at `https://openrouter.ai/api` (the SDK appends `/v1/messages` itself; `/api/v1` double-prefixes and 404s) with `OPENROUTER_API_KEY`.

All three call shapes proved live before any edit:

| Shape | Result |
|---|---|
| Plain messages | ok |
| `tool_use` round-trip | ok — correctly shaped `tool_use` block returned |
| Cached system block | ok — 27,008 tokens written, then fully read back; cost $0.033803 → $0.0027438 on call two |

**Migrated:** `rheaTwoPass.js` (haiku-4.5, plus `usage.cost` accumulation → `costUsd` in the output JSON, closing the Task 1 instrumentation gap), `mags-discord-bot.js` (haiku-4.5, tool call site + the startup key guard), `discord-reflection.js` (sonnet-4.6, both call sites in the two-phase loop), `cron-saturday-run.js` (narrator keeps the **same** model — the routing comment records a deliberate voice decision — only the rail changed).

Each keeps a documented revert: `RHEA_PROVIDER` / `MAGS_BOT_PROVIDER` / `REFLECTION_PROVIDER` / `NARRATOR_PROVIDER` = `anthropic`.

**Needed nothing (measured, not assumed):** `moltbook-heartbeat.js` already defaults to OpenRouter. `cron-desk-writer.js` routes from `desk-model-map.json` + `newsroom-wake-packages.json` and every seat in both is already an OpenRouter slug — only its last-resort fallback was hardened (`anthropic` → `openrouter`) so a failed map load can't drop silently onto the Anthropic key.

**Verified:** four Rhea suites pass; `node --check` clean on all five edited files. Acceptance test is the next unattended cron — `discord-reflection` at 07:00, then Saturday's 16:00 run.

**Pre-existing defect found, deliberately not fixed** (unrelated to this work, dead before it): `rheaTwoPass` resolves its default edition path to `editions/cycle_pulse_edition_{N}.txt` but the files are `cycle_pulse_c{N}.txt`; and even with an explicit `--edition`, the parser extracts **0 articles** from both a main edition and a supplemental. Rhea's two-pass lane has not been able to run for some time. Needs its own row.

### Task 5: Retire the key, or don't — ✅ DECIDED: keep it

`ANTHROPIC_API_KEY` stays. It is the documented revert path for four scripts, and the photo path still uses it live. Remaining callers, all deliberate:

| Script | Status |
|---|---|
| `generate-edition-photos.js` → `photoQA.js` | **Live**, in the print pipeline. Parked — vision/image through OpenRouter is unproven and was not in scope. |
| `rheaTwoPass`, `mags-discord-bot`, `discord-reflection`, `cron-saturday-run`, `cron-desk-writer`, `moltbook-heartbeat` | Revert branches only |
| `daily-reflection.js` | Disabled S187, crontab line commented out |
| `citizenLifePoC.js`, `crawlSheetsArchive.js` | No cron, no callers — dormant |

## Open questions

- [ ] Does OpenRouter's Anthropic route support vision input identically (`photoQA.js`)?
- [ ] Is image *generation* on the OpenRouter menu at all, or is `generate-edition-photos.js` calling a different provider for the render step?
- [ ] Rate limits — OpenRouter's per-key limits vs Anthropic direct, at Saturday-run burst volume.

---

## Changelog

- 2026-08-20 — Drafted from Mike-direct at S385, with a verified script inventory rather than an assumed one. Not started.
- 2026-08-20 — Task 1 DONE: OpenRouter is exact pass-through on all three models; cost is a 5.5% card fee on credit top-ups. Awaiting Mike on Task 2.
- 2026-08-20 — Task 1b added: batch verified as a separate submit-and-poll beta API with a 24h window and no multimodal; only terminal cron jobs batch as-is. Day-behind cadence flagged as the bigger option, Mike's call.
- 2026-08-20 — Tasks 2-5 DONE (`664de075`). OpenRouter serves an Anthropic-compatible /v1/messages endpoint, so migration was a rail change, not a rewrite. Key kept.
- 2026-08-20 — Mike-direct: day-behind batch cadence PARKED as the agreed next move, after the pipelines finish being tuned. Not scoped here.
