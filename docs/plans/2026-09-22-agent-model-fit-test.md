---
title: Which model does an in-world agent actually benefit from — test plan
created: 2026-09-21
updated: 2026-09-29
type: plan
tags: [research, civic, architecture, draft]
sources:
  - Builder direction 2026-09-21 — test whether a frontier model helps agents like Elias Varek (the sim's most powerful billionaire) or Mags (city media) versus current cheap models; builder adds Anthropic credit 2026-09-22
  - Builder observation 2026-09-21 — a stronger model tends to mean more reasoning, not better output; the prompt is what matters
  - docs/research/2026-09-21-batch-cost-and-model-variety.md — current spend (~$0.18/week civic), OpenRouter prices, failure evidence
pointers:
  - "[[plans/2026-09-21-civic-sunday-stage-machine]] — the model-per-seat ruling this test can revise"
  - "[[research/2026-09-21-batch-cost-and-model-variety]] — prices and provider facts"
  - "[[index]] — registered same commit"
---

# Which model does an in-world agent benefit from

**Goal:** Learn, with evidence, which model class each kind of in-world agent needs — so a seat gets a strong model only where it changes the output, and stays cheap where it does not.

**Hypothesis under test (builder):** for structured, prompt-driven jobs a stronger model adds reasoning tokens and cost but not better output; the prompt is the lever. Counter-hypothesis to give a fair chance: for open-ended character voices with wide latitude (Elias Varek, Mags) a frontier model may produce more distinct, more in-character, more surprising output that justifies its price.

**Terminal:** research-build designs and runs it; kimi/codex/agy help score. No production change comes from this plan; results feed the model-per-seat ruling.

**Status:** Draft, waiting on the builder's Anthropic credit (2026-09-22). Direct Anthropic is needed because the OpenRouter Claude `:batch` route was rejected on 2026-09-21; OpenRouter synchronous calls are the fallback and work today.

## Method — pre-registered so we do not tune the yardstick to the result

**Fixed inputs.** For each agent type below, freeze 3 real prompts/packs from stored C104–C108 material (same pack, same output contract). Only the model changes. No prompt tuning per model.

**Agents (three tiers of latitude):**
1. **Structured decision seat** — a council seat's datawake pack with the closed move set (tight contract, lots of validators).
2. **Semi-open voice** — a civic-desk reporter (Carmen Delaine) on a council story.
3. **Open character voice** — Elias Varek (`citizen-voice-elias-varek`) answering an interview prompt, and Mags's Saturday narration prompt.

**Models (each run with reasoning off AND on/default, so we separate "more reasoning" from "better output"):** the seat's current model (e.g. `deepseek/deepseek-chat`), Gemini flash tier, Sonnet 5, Opus 5, Fable 5.1. Direct Anthropic for the Claude rows; OpenRouter for the rest.

**Measures (computed before anyone reads outputs):**
- *Deterministic:* schema validity, grounding-gate pass rate, move validity against the closed set, character-cap compliance, finish reason, tokens in/out/reasoning, dollars.
- *Verbosity:* words per decision; whether the answer is decisions or prose (the civic requirement is terse).
- *Voice:* distinctiveness between agents (lexical overlap between two seats' outputs from the same model, a low-cost proxy), and consistency with the agent's frozen persona facts (a checklist of 5 facts per agent checked by script or rubric).
- *Blind judgement:* 12 outputs shuffled and unlabeled per tier, scored 1–5 by two scorers (agy and codex) plus, if the builder wishes, a 10-item blind read; scorers see no model names.

**Decision rule (written now):** a stronger model earns a seat only if it beats the current model by at least 1 point on blind score AND passes deterministic checks at least as often, at a cost the builder accepts. If reasoning-on does not beat reasoning-off on blind score, keep reasoning off. Ties go to the cheaper model.

**Cost:** roughly 3 tiers × 3 prompts × 5 models × 2 reasoning arms = 90 calls at a few thousand tokens each — on the order of a few dollars at most, dominated by Fable and Opus with reasoning on. Cap the run at $10 and stop early if a row is clearly dominated.

## Reusable call shapes — confirmed 2026-09-28 (S501, research-build)

Traced how each tier is actually invoked in production before writing any runner code, per Task 2's own "reuses existing call shapes" instruction. Finding changes Task 2's shape:

- **Structured decision seat (council):** `cron-civic-run.js` calls seats with a raw OpenRouter completion, NOT a Claude Code subagent — `civic-office-council-seat/SKILL.md` carries `disable-model-invocation: true` for exactly this reason. Reusable pieces, verbatim: `readPersonaDir(dir)` (`scripts/cron-civic-run.js:1241-1256`, joins shared `LENS.md`+`RULES.md` then the district's own `IDENTITY.md`+`LENS.md`+`RULES.md` as the system prompt) and `callOpenRouter(model, system, user, maxTokens)` (`scripts/cron-civic-run.js:848-880`). Neither is exported (`module.exports` at `:3777` omits both) — the runner replicates the ~40 lines rather than requiring the live cron file (safer: zero risk of touching a script the Sunday/weekday chain depends on).
- **Semi-open voice (Carmen Delaine / civic-desk):** different mechanism entirely — `cron-desk-run.js` spawns `scripts/cron-desk-writer.js` as a subprocess (`buildWriterArgs`, `cron-desk-run.js:1334-1346`), and that writer **already accepts `--provider` and `--model` flags** (`cron-desk-writer.js:186-195`, defaults from the desk's routing table otherwise). This means Task 2 needs no custom prompt-assembly for this tier at all — point `--state-file` at a frozen `semi-open-voice-*` packet and vary `--provider`/`--model` per run. Truest possible "existing call shape": it's *the* production code path, not a replica.
- **Open character — Mags's Saturday narration:** found and resolves part of the earlier "not found" note. `cron-saturday-run.js` step 3 (`stepNarrate`, `:798-819`) calls `anthropicChat(NARRATOR_MODEL, NARRATOR_CHARGE(cycle), <curated-article digest>, maxTokens)` — `NARRATOR_CHARGE(cycle)` (`:787-797`) is Mags's real frozen system prompt, `anthropicChat` (`:558-571`) already runs the Anthropic SDK against OpenRouter's Anthropic-compatible endpoint (`NARRATOR_PROVIDER=anthropic` reverts to a direct key) — this is the exact "Direct Anthropic... OpenRouter sync is the fallback" mechanism the plan's own Status line already named, already built, already in production. Elias Varek's interview path ~~is still unresolved~~ **resolved 2026-09-29 (kimi): the `citizen-voice-elias-varek` subagent via `/interview` Mode 1 Step 3 — Sonnet, per-turn dispatch with theme + transcript-so-far + INTERVIEW TURN framing; NOT `citizenVoice.js`** (that guess was wrong — citizenVoice is the generic-citizen DeepSeek quote-supply path). The runner for this tier sends the frozen pack's system/user pair to the test model directly.
- **Prior art, read before building further:** [[../research/2026-07-19-headless-cron-newsroom-agentic-rag]] §Thread A 2026-07-20 entry — a real writer-model sweep already ran (DeepSeek vs Sonnet on real C101 sports copy, ~500× cost gap, DeepSeek correct on every anchor fact) and landed a recommended **per-run scorecard** (voice ✓/✗, facts-from-world-state ✓/✗, human-edits Low/Med/High, word-count ✓/✗, hallucination count, runtime, API $) plus a working per-desk model philosophy (DeepSeek routine, Sonnet voice-critical, GPT editor/fact-check) that this new test should reconcile with, not duplicate. `output/cron-compare/` also holds real prior one-off model benchmarks (`git log` — "deepseek baseline for luis-navarro", "Gemini 2.5 Flash benchmark vs existing claude/deepseek desk runs") — narrower than this plan's 5-model×2-reasoning-arm design, but real empirical precedent worth reading before assuming a clean-slate build.

## Running the test — where everything lives (2026-09-29)

| What | Where |
|---|---|
| Frozen inputs (9) + provenance | `output/model-fit/inputs/` — index and sources in `MANIFEST.md` there |
| Runner | `scripts/modelFitRun.js` — header comment documents every flag |
| Results, one JSON row per call | `output/model-fit/runs.jsonl` (append-only; empty until Task 3) |
| Semi-open tier's raw writer output | `output/cron-compare/civic_c*_mf-*` (each row's `writerMeta` / `savedFile` points at it) |

One call: `node scripts/modelFitRun.js --input <frozen file> --model <id> --provider openrouter|anthropic --reasoning off|on [--rate-in X --rate-out Y]`. Add `--dry-run` to see what would be sent without spending anything. Run matrix = 9 inputs x 5 models x 2 reasoning arms (semi-open tier has no arm, so 3 x 5 x 1 there); Claude rows use `--provider anthropic` (needs the builder's credit), the rest OpenRouter. Pass current per-1M prices at run time so cost lands in the row. Scoring happens after the run from `runs.jsonl`; scorers get `output` text with the `model` field stripped.

## Tasks

1. **Freeze inputs** — pick and store 9 packs/prompts under `output/model-fit/inputs/` (kimi lane or codex). Verify: each replays through its existing validators. **9/9 DONE (6 staged 2026-09-28 S501 research-build; open-character tier finished 2026-09-29 kimi) — see [[../../output/model-fit/inputs/MANIFEST]]. Mags packs replay byte-identical from stored C105/C108 material (`scripts/freezeModelFitInputs.js --verify`, local-only); Elias's call shape traced to the `citizen-voice-elias-varek` subagent (NOT citizenVoice.js) and his pack is constructed from persona files + a brief on real C108 canon — flagged `constructed: true` in the pack.**
2. **Runner** — a scratch script that calls a model with a frozen input, records every measure above to `output/model-fit/runs.jsonl`. Reuses existing call shapes (§Reusable call shapes, traced 2026-09-28 — semi-open-voice tier needs no custom runner at all, just `cron-desk-writer.js --state-file <frozen> --provider/--model <test>`; structured-seat needs ~40 lines replicated from `cron-civic-run.js`; open-character needs Elias's shape traced first); not a production script. **Built 2026-09-29 (rb): `scripts/modelFitRun.js`.** Structured-seat + semi-open-voice tiers wired and smoke-tested with one real DeepSeek call each (rows discarded, not data); open-character tier wired 2026-09-29 once kimi's inputs landed (dry-run verified on all three, no real call yet). `--reasoning off|on` works on the structured tier only — the semi-open tier shells out to `cron-desk-writer.js --packet-only`, so its arm is recorded `writer-default`. No built-in price table: cost is recorded only when `--rate-in/--rate-out` are passed. Not yet built: grounding-gate / closed-move-set checks and the persona-fact checklist — add before the real run. Verify: dry-run with one input and the current model — done.
3. **Run** — after credit lands; cap $10; log every call.
4. **Score** — deterministic first, then blind scoring by agy and codex (no model names).
5. **Report** — `docs/research/` file with the table, the decision rule applied, and a verdict per agent type: adopt / watch / take-nothing. Feed the model-per-seat ruling in the civic.39 plan.

## Open questions

- [ ] Builder: do you want to do a blind read too, and on which agents (Elias and Mags are the ones your judgement matters most for).
- [x] Which real Elias Varek and Mags prompts to freeze — answered 2026-09-29 (kimi): Mags = stored C108 + C105 curated digests; Elias = constructed pack on real C108 canon (`constructed: true` — no stored Elias interview exists).
- [ ] Whether to include DeepSeek v4 and Kimi K3 as extra rows once their `:batch` prices are known.

## Changelog

- 2026-09-21 (research-build) — Draft filed from builder direction; waiting on credit.
- 2026-09-28 (S501, research-build) — Task 1 partially unblocked: freezing inputs doesn't need the
  Anthropic credit, only the Task 3 run does. Staged 6/9 (structured-seat ×3 council datawake packs,
  semi-open-voice ×3 Carmen Delaine report packets, all real C104-C108 production material). Open-
  character tier (Elias/Mags) left unstaged — no real stored interview/narration material found for
  either, and the plan's own Open Questions already park exactly this choice. Task 2 (runner) not
  started. Still waiting on credit for Task 3.
- 2026-09-28 (S501, research-build, same session) — Traced the real call shape for all three tiers
  before writing runner code (§Reusable call shapes). Finding: semi-open-voice needs no custom runner,
  `cron-desk-writer.js` already takes `--model`/`--provider`; structured-seat replicates ~40 lines from
  `cron-civic-run.js` (not exported, so not required directly); open-character's Mags half is a real,
  callable function (`cron-saturday-run.js` `stepNarrate`/`NARRATOR_CHARGE`), Elias's half still
  untraced. Surfaced real prior art (2026-07-20 writer-model sweep, `docs/research/2026-07-19-headless-
  cron-newsroom-agentic-rag.md`) with a recommended scorecard this test should reconcile with, not
  duplicate. Chose to bank this as a design finding rather than force half-built runner code at 4am —
  Task 2 write-up is next, still gated on nothing but time.
- 2026-09-29 (kimi) — Task 1 complete (9/9). Open-character tier frozen:
  Mags narration inputs at C108 + C105 rebuilt from stored curation + staged sets via new
  `scripts/freezeModelFitInputs.js` (uses cron-saturday-run.js's own exported `loadStagedSet`, so
  production proof gates apply; all 9 stems per cycle passed, nothing dropped); `--verify` replays
  all packs byte-identical, local-only. Elias interview path traced: the authored surface is the
  `citizen-voice-elias-varek` subagent via `/interview` Mode 1 Step 3 (Sonnet, per-turn dispatch),
  NOT `scripts/citizenVoice.js` (that's the generic-citizen DeepSeek quote path). No stored Elias
  interview exists in C104-C108, so his pack is constructed — persona boot assembly verbatim off
  disk (disposition cache, refreshed c109, superseding IDENTITY per SKILL boot step 2) + a dispatch
  prompt themed on the real stored exchange_c108 Varek–Paulson conversation; flagged
  `constructed: true` in the pack for the report. Third input is a second Mags cycle, not an
  Elias follow-up — a follow-up would need invented Elias quotes in the transcript, which canon
  rules forbid. Task 2 (runner) not started.
- 2026-09-29 (rb, overnight): Task 4 deterministic side built — `scripts/modelFitScore.js` (schema, grounding, milestone cap, persona-fact contradictions from `output/model-fit/persona-facts.json`, word range, distinctiveness, seeded blind pack + separate key; `--self-test` passes on `output/model-fit/score-fixture.jsonl`). Built by agy from a spec, verified by rb. Still open: Task 3 real run (needs builder's Anthropic credit), blind scoring by agy + codex, report.
- 2026-09-29 (rb) — infrastructure.7 (consolidate model calls on OpenRouter) folded into this test by the builder: same question (which agent needs which model), and current model alignment is running well; the test now also looks for deeper writing.
