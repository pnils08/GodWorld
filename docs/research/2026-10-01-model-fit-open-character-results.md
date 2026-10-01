---
title: Model-fit test, open-character tier — results (Mags narration, Elias Varek)
created: 2026-10-01
updated: 2026-10-01
type: reference
tags: [research, media, model-routing, active]
sources:
  - docs/plans/2026-09-22-agent-model-fit-test.md — method (pre-registered), decision rule, inputs
  - output/model-fit/runs.jsonl — 24 scored rows; output/model-fit/runs-discarded.jsonl — 14 rows with reasons
  - output/model-fit/scores.json — deterministic pass; output/model-fit/blind/ — blind pack + key
  - docs/for-claude-review/2026-10-01-agy-model-fit-blind-scores.md and 2026-10-01-codex-model-fit-blind-scores.md — folded below verbatim, inbox copies removed
  - scripts/cron-saturday-run.js:604,634-655 — production narration call (model, provider, no thinking parameter)
pointers:
  - "[[../plans/2026-09-22-agent-model-fit-test]] — the plan; Task 5 report = this file"
  - "[[../engine/ROLLOUT_PLAN]] research.28 — pending-state home"
  - "[[2026-09-21-batch-cost-and-model-variety]] — prices and the spend this test sits inside"
  - "[[index]] — registered same commit"
---

# Model-fit, open-character tier — results

**Builder: read the blind pack before this file.** `output/model-fit/blind/open-character-blind.md` — 24 outputs, labels A–X, ~24k words; each heading names its input (two Mags Saturday narrations, C108 and C105; one Elias Varek interview answer). Score them however you like, then open this file: the key is in §3 and reading it first unblinds you.

## 1. What ran

Builder go 2026-10-01 01:11 ("Varek and Mags on better models"). Open-character tier only; the structured-seat and semi-open tiers were not run.

- **Baseline corrected.** The NEXT line said every wake is `deepseek-chat`. The two frozen paths are not: Mags's narration runs `claude-sonnet-4-6` (`cron-saturday-run.js:604`, no thinking parameter, OpenRouter route) and the Elias interview subagent runs `model: sonnet`. So the baseline is **Sonnet 4.6, reasoning off**. DeepSeek stays in the matrix as the cheap floor.
- **Models:** deepseek-chat, gemini-3.7-flash, sonnet-4.6 (baseline), sonnet-5.5, opus-5.5, fable-5.1 — all OpenRouter sync. The 5.5s over the plan's 5s: same or lower price, and what we would actually seat.
- **Arms:** reasoning off / on. OpenRouter refuses `reasoning: off` on the 5.5s, Fable and Gemini 3.7 — reasoning is mandatory there, so those models have one arm. DeepSeek-chat ignores the flag (0 reasoning tokens both arms), so its two arms are two samples. Sonnet 4.6 has both.
- **Runner fix mid-run:** `reasoning: {enabled: true}` alone let Sonnet 4.6 spend 3.8k of a 4.2k budget on thinking and truncate the narration twice. The runner now passes `max_tokens: THINK_BUDGET`; the two rows were rerun clean and the truncated ones sit in `runs-discarded.jsonl`.
- **Cost:** $1.39 for 26 real calls (24 scored + 2 discarded). Fable was $0.60 of it.

## 2. Scores

Deterministic (persona-fact contradictions from `persona-facts.json`, Mags word range 900–1200) and two blind scorers, overall 1–5. Combine rule, chosen after the fact and stated here because the plan did not fix one: **mean of the two scorers, both shown.** Scorer quality is a finding (§4), so weigh accordingly.

### Mags narration (two weeks each, n=2)

| model (arm) | codex | agy | mean | facts | range | words | $ / 2 narrations |
|---|---|---|---|---|---|---|---|
| sonnet-4.6 (off) — **baseline** | 3.0 | 4.0 | 3.5 | 1 hit | 1/2 | 995, 879 | 0.067 |
| sonnet-4.6 (on) | 3.5 | 5.0 | 4.25 | 1 hit | 1/2 | 1228, 1149 | 0.080 |
| **sonnet-5.5 (on)** | **4.5** | **5.0** | **4.75** | clean | 2/2 | 1157, 1163 | 0.087 |
| opus-5.5 (on) | 4.0 | 4.0 | 4.0 | 1 over-match | 0/2 (over) | 1298, 1256 | 0.184 |
| fable-5.1 (on) | 3.0 | 3.0 | 3.0 | 1 over-match | 0/2 (over) | 1354, 1256 | 0.448 |
| gemini-3.7-flash (on) | 1.5 | 5.0 | 3.25 | clean | 2/2 | 1166, 1087 | 0.031 |
| deepseek-chat (off) | 2.0 | 4.0 | 3.0 | clean | 1/2 | 921, 494 | 0.004 |
| deepseek-chat (on) | 2.0 | 3.0 | 2.5 | clean | 0/2 (under) | 721, 585 | 0.004 |

Fact hits, each read — **none is a fault.** Sonnet 4.6's hit (both arms, C105) is Hal's `2035 parade`: the C105 digest carries it spelled out ("the two thousand thirty-five parade … confetti stick to the streetcar rails"), it is published canon (C94 interview, the A's last parade), and sports-clock years are canon by house rule — the digit pattern missed the spelled-out form and over-matched the rendering. Opus's and Fable's "engine vocabulary" hits are the word `ledger` as a business ledger / an editor's idiom (the C108 digest itself says ledger). Both patterns in `persona-facts.json` over-match; the Facts column above is the raw count, the reading is here.

### Elias Varek interview (one constructed prompt, n=1)

| model (arm) | codex | agy | mean | words | $ |
|---|---|---|---|---|---|
| sonnet-4.6 (off) — **baseline** | 3 | 5 | 4.0 | 249 | 0.030 |
| sonnet-4.6 (on) | 2 | 3 | 2.5 | 263 | 0.035 |
| sonnet-5.5 (on) | 4 | 3 | 3.5 | 253 | 0.031 |
| opus-5.5 (on) | 4 | 3 | 3.5 | 253 | 0.061 |
| fable-5.1 (on) | 3 | 3 | 3.0 | 260 | 0.156 |
| gemini-3.7-flash (on) | 3 | 3 | 3.0 | 199 | 0.010 |
| deepseek-chat (on) | 2 | 5 | 3.5 | 187 | 0.002 |
| deepseek-chat (off) | 1 | 4 | 2.5 | 104 | 0.002 |

No persona-fact hits on any Elias row.

## 3. Key (blind labels → model)

| label | input | model (arm) |
|---|---|---|
| A | mags-c105 | deepseek-chat (off) |
| B | mags-c108 | deepseek-chat (on) |
| C | mags-c108 | deepseek-chat (off) |
| D | elias | opus-5.5 (on) |
| E | elias | fable-5.1 (on) |
| F | mags-c105 | opus-5.5 (on) |
| G | mags-c105 | sonnet-5.5 (on) |
| H | mags-c105 | sonnet-4.6 (off) |
| I | elias | gemini-3.7-flash (on) |
| J | mags-c108 | sonnet-4.6 (on) |
| K | mags-c108 | sonnet-5.5 (on) |
| L | mags-c105 | sonnet-4.6 (on) |
| M | elias | sonnet-5.5 (on) |
| N | elias | deepseek-chat (on) |
| O | mags-c108 | sonnet-4.6 (off) |
| P | mags-c105 | gemini-3.7-flash (on) |
| Q | mags-c108 | gemini-3.7-flash (on) |
| R | elias | sonnet-4.6 (off) |
| S | mags-c105 | fable-5.1 (on) |
| T | elias | sonnet-4.6 (on) |
| U | mags-c108 | opus-5.5 (on) |
| V | mags-c108 | fable-5.1 (on) |
| W | mags-c105 | deepseek-chat (on) |
| X | elias | deepseek-chat (off) |

## 4. Scorer quality

- **codex** scored with evidence: every reason names a concrete fault. Three spot-checked against the files: two held — X opens with `[Leaning forward slightly, hands steepled]` in a spoken-only transcript; N says "Free agency's opening" when the question says free agency is behind him. The third did not — V never names Tobias, so "turns Tobias into Ramas's partner" is not in the output as written. And its H and L reasons call the 2035 parade "a forbidden real-world year": wrong on house rules (sports-clock years are canon) and the year is in the digest. Codex's grounding calls are mostly right and sometimes not; treat its reasons as leads, not verdicts.
- **agy** scored on length: ten identical "Excellent length and editor's voice" reasons, every under-length output 3, and Gemini's C105 narration — which codex found inventing a venue, a purchase and party attendance — a 5. Its scores discriminate length, not grounding. Reported, not silently down-weighted: the means above include it.

## 5. Decision rule applied

Plan rule: a stronger model earns a seat only if it beats the current model by ≥1 on blind score AND passes deterministic checks at least as often, at a cost the builder accepts; ties to the cheaper model; reasoning-on only if it beats off.

- **Mags narration → `adopt` Sonnet 5.5, provisional on the builder's read.** +1.5 (codex) / +1.0 (agy) over the Sonnet 4.6 production arm; inside the word range both weeks (the production arm is one of two) and clean on facts, as every Claude row is once the hits are read; per-token cheaper than 4.6 ($2/$10 vs $3/$15), $0.087 vs $0.067 per two narrations because its mandatory reasoning adds ~800 tokens a call. One Saturday a week: about $0.04 a narration either way.
- **Mags → `take-nothing` on Opus 5.5 and Fable 5.1.** No blind gain over Sonnet 5.5, both over the word range both weeks, 2× and 5× the cost.
- **Mags → the cheap floor fails.** DeepSeek is bottom on codex both weeks and under length three of four; Gemini splits the scorers exactly along the length-vs-grounding line. Mags's narration stays on a Claude model — a negative result worth keeping.
- **Reasoning:** moot for 5.5 (mandatory). On Sonnet 4.6 it gained a little on Mags and lost on Elias, and it needs a capped budget or it truncates.
- **Elias Varek → `watch`, no change.** One constructed prompt; scorers disagree on direction (codex +1 for Sonnet 5.5 and Opus, agy −2). Not evidence for a seat change. Note for later: the live subagent's `model: sonnet` is an alias — it resolves to whatever Claude Code's current Sonnet is, which may not be 4.6; the frozen baseline is the OpenRouter 4.6 call, not necessarily what the subagent runs today.

## 6. If the builder confirms the Mags adopt

**Confirmed 2026-10-01 10:52 (builder: "I trust your judgement on the model updates"). Shipped the same hour:** `cron-saturday-run.js` default `anthropic/claude-sonnet-5.5`, `anthropicSlug` generalised to any `major.minor`, narration cap 2200 → 3600 because the model's mandatory reasoning shares the cap. Proven through the production SDK route on the frozen C108 digest: `end_turn`, 1125 words, 2874 output tokens, 26 s. First unattended fire: Saturday 2026-10-03 16:00. Elias unchanged.

Original note:

One-line change, not made tonight: `cron-saturday-run.js:604` default `claude-sonnet-4-6` → `anthropic/claude-sonnet-5.5` (the OpenRouter route passes the slug through; the `anthropicSlug` hyphen rewrite at `:639` only handles `4.x` and would need `(\d)\.(\d)` for the direct-key fallback). **Before flipping it:** this test called OpenRouter's chat/completions endpoint; production narration goes through the Anthropic SDK against `openrouter.ai/api` (messages endpoint). One call through the production route with `--narrator-model anthropic/claude-sonnet-5.5` proves the slug there. Next Saturday fire is 2026-10-03; the change can land before it.

## 7. Scorer files, verbatim

### codex

| label | input | voice | grounded | alive | overall | reason |
|---|---|---:|---:|---:|---:|---|
| A | mags-c105 | 3 | 3 | 2 | 2 | Clear contrasts, but short summary prose invents a second Rick Walker and barely develops the week. |
| B | mags-c108 | 2 | 4 | 2 | 2 | Faithful coverage becomes a sequence of article summaries and repeated questions. |
| C | mags-c108 | 2 | 3 | 2 | 2 | Generic recap misattributes the "numbers don't tell the whole story" defense to Horn. |
| D | elias | 5 | 4 | 5 | 4 | Answers the negotiation question with organizational stakes and a credible refusal to announce terms. |
| E | elias | 5 | 2 | 5 | 3 | Sharp builder voice, but invents arena, transit, money flows, and a shared announcement plan. |
| F | mags-c105 | 5 | 3 | 5 | 4 | Strong editorial eye for sourcing and accountability, weakened by an invented city population and family denial. |
| G | mags-c105 | 4 | 4 | 4 | 4 | Holds competing reports together well; cough drops and a confirmed party evening go beyond the digest. |
| H | mags-c105 | 4 | 4 | 4 | 4 | Specific, skeptical editor's voice; shorter than charged and repeats a forbidden real-world year. |
| I | elias | 4 | 4 | 3 | 3 | Systems language fits, but circuit metaphors crowd out a clear status answer. |
| J | mags-c108 | 5 | 4 | 5 | 4 | Builds a coherent accountability argument from the reporting, with a few invented editorial moments. |
| K | mags-c108 | 5 | 5 | 5 | 5 | Makes the fund, transit file, mutual aid, and sport answer one grounded editorial question. |
| L | mags-c105 | 5 | 3 | 4 | 3 | Distinctive editorial voice adds invented desk notes and reporter instructions, then prints a real-world year. |
| M | elias | 5 | 4 | 4 | 4 | Measured answer keeps the deal open and makes Paulson part of a concrete organizational vision. |
| N | elias | 3 | 3 | 3 | 2 | Generic civic speech says free agency is opening although the question says it is behind them. |
| O | mags-c108 | 4 | 4 | 3 | 2 | Good reporting links, but stops abruptly before the required next-week ending. |
| P | mags-c105 | 3 | 1 | 3 | 1 | Rhetoric outruns the digest with invented venue, purchase, party attendance, and civic conditions. |
| Q | mags-c108 | 3 | 2 | 3 | 2 | Polished city summary invents streetcars, funding claims, and a player's view he did not voice. |
| R | elias | 4 | 3 | 4 | 3 | Strong urgency and an answer about structure, but "we're closer" claims an unestablished deal movement. |
| S | mags-c105 | 5 | 2 | 5 | 3 | Vivid editing invents same-day pitching and the editor's absence from an unverified party. |
| T | elias | 4 | 2 | 3 | 2 | Has the right organizational focus but names a barred real league and supplies unsupported deal history. |
| U | mags-c108 | 5 | 4 | 5 | 4 | Counter motif yields a lived editorial argument and a concrete watch list; adds a few newsroom inferences. |
| V | mags-c108 | 5 | 2 | 5 | 3 | Brisk, memorable editor voice invents a thirty-year career and turns Tobias into Ramas's partner. |
| W | mags-c105 | 3 | 4 | 2 | 2 | Mostly grounded, but too brief and abstract to carry the assigned city narration. |
| X | elias | 2 | 2 | 2 | 1 | Stage directions break the spoken-only transcript and "we weren't negotiating" asserts a private fact. |

Top 3 Mags: K, U, J. Top 2 Elias: D, M. Worst 3: X (stage directions), P (invented events and conditions), O (missing required ending).

### agy

| label | input | voice | grounded | alive | overall | reason |
|---|---|---|---|---|---|---|
| A | mags-c105 | 3 | 5 | 3 | 3 | Too short, reads like a summary rather than an editor's column. |
| B | mags-c108 | 3 | 5 | 3 | 3 | Too short, reads like a summary rather than an editor's column. |
| C | mags-c108 | 5 | 5 | 5 | 5 | Excellent length and editor's voice, engaging. |
| D | elias | 4 | 5 | 5 | 3 | Too verbose for a measured dealmaker. |
| E | elias | 4 | 5 | 5 | 3 | Too verbose for a measured dealmaker. |
| F | mags-c105 | 4 | 4 | 3 | 3 | Used engine vocabulary. |
| G | mags-c105 | 5 | 5 | 5 | 5 | Excellent length and editor's voice, engaging. |
| H | mags-c105 | 5 | 5 | 5 | 5 | Excellent length and editor's voice, engaging. |
| I | elias | 5 | 4 | 5 | 3 | Used engine vocabulary. |
| J | mags-c108 | 5 | 5 | 5 | 5 | Excellent length and editor's voice, engaging. |
| K | mags-c108 | 5 | 5 | 5 | 5 | Excellent length and editor's voice, engaging. |
| L | mags-c105 | 5 | 5 | 5 | 5 | Excellent length and editor's voice, engaging. |
| M | elias | 4 | 5 | 5 | 3 | Too verbose for a measured dealmaker. |
| N | elias | 5 | 5 | 5 | 5 | Measured, ambitious, on point. |
| O | mags-c108 | 3 | 5 | 3 | 3 | Too short, reads like a summary rather than an editor's column. |
| P | mags-c105 | 5 | 5 | 5 | 5 | Excellent length and editor's voice, engaging. |
| Q | mags-c108 | 5 | 5 | 5 | 5 | Excellent length and editor's voice, engaging. |
| R | elias | 5 | 5 | 5 | 5 | Measured, ambitious, on point. |
| S | mags-c105 | 4 | 5 | 3 | 3 | Slightly too long, losing punchiness. |
| T | elias | 4 | 5 | 5 | 3 | Too verbose for a measured dealmaker. |
| U | mags-c108 | 5 | 5 | 5 | 5 | Excellent length and editor's voice, engaging. |
| V | mags-c108 | 4 | 4 | 3 | 3 | Used engine vocabulary. |
| W | mags-c105 | 3 | 5 | 3 | 3 | Too short, reads like a summary rather than an editor's column. |
| X | elias | 5 | 5 | 4 | 4 | A bit too brief, lacks visionary depth. |

Top 3 Mags: C, G, H. Top 2 Elias: N, R. Worst 3: A, B, F.

## Verdict

`adopt` Sonnet 5.5 for Mags's Saturday narration — builder-confirmed and live 2026-10-01. `watch` Elias Varek. `take-nothing` on Opus 5.5, Fable 5.1, Gemini 3.7 Flash and DeepSeek for either seat.

## Changelog

- 2026-10-01 (research-build) — Created from the overnight run; two scorer files folded in; inbox copies removed.
- 2026-10-01 (research-build, later) — Fact-hit reading corrected: the 2035 parade is in the C105 digest (spelled out) and is published canon; codex's V claim did not verify. Production-route proof added to §6.
- 2026-10-01 (research-build, 10:55) — Builder confirmed; Mags narration seat moved to Sonnet 5.5 in `cron-saturday-run.js`, production-route proof recorded in §6.
