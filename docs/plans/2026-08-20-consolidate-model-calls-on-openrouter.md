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

## Open questions

- [ ] Does OpenRouter's Anthropic route support vision input identically (`photoQA.js`)?
- [ ] Is image *generation* on the OpenRouter menu at all, or is `generate-edition-photos.js` calling a different provider for the render step?
- [ ] Rate limits — OpenRouter's per-key limits vs Anthropic direct, at Saturday-run burst volume.

---

## Changelog

- 2026-08-20 — Drafted from Mike-direct at S385, with a verified script inventory rather than an assumed one. Not started.
- 2026-08-20 — Task 1 DONE: OpenRouter is exact pass-through on all three models; cost is a 5.5% card fee on credit top-ups. Awaiting Mike on Task 2.
