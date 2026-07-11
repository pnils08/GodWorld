---
title: Citizen Voice Quote Supply — Every Quote Is a Cheap Call to the Citizen Plan
created: 2026-07-11
updated: 2026-07-11
type: plan
tags: [media, citizens, citizen-loop, edition-pipeline, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md §pipeline.43
  - docs/plans/2026-07-06-citizen-loop-deepening.md §Task 9 (citizenVoice.js — built S300, media wiring was the open handoff this plan executes)
  - .claude/skills/write-edition/SKILL.md §QUOTE DISCIPLINE + §reporter-range quote invention (read S312)
  - /root/.claude/projects/-root-GodWorld/memory/feedback_centralized-curation-tidies-stories.md — the S296 diagnosis this closes ("direct reporter↔citizen OpenRouter quotes, not a better checklist")
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (pipeline.43)"
  - "[[2026-07-06-citizen-loop-deepening]] — engine.48 (Task 9 handoff lands here; Task 9 canon-guard amended by this plan's Task 1)"
  - "[[2026-07-11-agent-exchange-engine]] — engine.53 sibling (same assembly, cron-side; this plan is edition-side)"
  - "[[index]] — registered same commit"
---

# Citizen Voice Quote Supply Plan

**Goal:** Every citizen quote in an edition is the citizen actually speaking — one cheap `citizenVoice.js` call carrying their dials, bonds, tensions, and page memory — recorded to their own page and intake at the moment they speak, instead of a premium desk model inventing their voice and a post-publish backfill patching the record afterward.

**Architecture:** Quote supply moves upstream of the desks. A `/write-edition` pre-pass (main session — desk agents have no Bash) reads `dispatch_c{XX}.json`, builds one story-specific ask per attached citizen, and batch-calls `scripts/citizenVoice.js` (built S300) with a new opt-in `--record` mode: the quote generates from wake-parity perception, appends to the citizen's page (`daypart='PRESS'`), classifies, and lands one gated `Reflection_Intake` row — same write block as a wake, dials still applied only at the cycle drain. Returned lines land in a per-cycle voice packet injected into desk launch prompts as supplied verbatim lines. The existing QUOTE DISCIPLINE gate ("quote only what the brief supplies") flips from constraint to delivery mechanism; in-scene quote invention demotes to fallback. Letters ride the same pass per-writer. Authored Tier-1 voice agents keep the premium `/interview` path — this covers everyone else. **Mike-direct S312: this is the priority avenue for citizen usage.**

**Terminal:** research-build (this plan + skill wiring, per S310 skill-authoring ruling) → engine-sheet (Tasks 1–2, script edits)

**Pointers:**
- Voice CLI (exists): `scripts/citizenVoice.js` — `--pop --ask --json --dry-run`, wake-parity assembly via `lib/wakePerception.js`, exit 2 when citizen has no DialState (caller falls back to desk-voiced)
- Write block to reuse (wake steps 1–4): `scripts/citizen-wake.js` L193–245 (classify → page append → tension open/resolve → intake row)
- Page/classifier/intake libs: `lib/citizenPage.js` (`ensurePagePointer_`, `appendReflection_`), `lib/reflectionClassifier.js` (`classifyTripleReflection_`), `Reflection_Intake` row shape `[ts, popId, cycle, daypart, event, snippet, applied='no', affect]`
- Dispatch spec: `docs/media/dispatch_schema.md` — articles[] carry brief paths; briefs carry the verified citizens per story
- Quote gate being flipped: `.claude/skills/write-edition/SKILL.md` launch-prompt QUOTE DISCIPLINE block + §Rules "reporter-range quote invention (S227, closes G-W37)"
- Post-publish reflection backfill to reconcile: `.claude/skills/post-publish/SKILL.md` substep 2e (interview voice reflection ingest, engine.43 T5)

**Acceptance criteria:**
1. Pre-pass on a locked dispatch with N attached citizens produces `output/voices/voices_c{XX}.json` with N entries — each a quote grounded in that citizen's real perception, or an explicit `fallback` marker (exit-2 / call failure), never a silent gap.
2. Desk articles quote supplied citizens verbatim from the packet (string-match check); zero invented attributed quotes for citizens who have supplied lines.
3. At fetch time (before publication) each quoted citizen's page carries one `daypart='PRESS'` doc and `Reflection_Intake` carries one row (`applied='no'`); zero LifeHistory/dial/ledger writes; `compressLifeHistory.dial.test.js` passes untouched.
4. Letters: each letter is voiced by its writer's own call; the letters desk formats and frames but does not author writer prose.
5. `/post-publish` does not double-ingest a quote-supplied citizen (no second intake row for the same quote).
6. Cost visible: pre-pass logs calls + token totals (expect ~10–25 DeepSeek calls per edition — pennies).

**Subjectivity note (design decision, not a bug):** a fetched quote that gets cut in editing still happened to the citizen — they spoke to a reporter. Page + intake record the *speaking*, publication records the *printing*. The canon wall is unchanged: page/intake are the subjective layer, dial application stays behind the cycle drain, and only publication makes a quote citable fact.

---

## Tasks

### Task 1: `--record` mode on citizenVoice.js *(engine-sheet)*

- **Files:**
  - `scripts/citizenVoice.js` — modify
  - `docs/plans/2026-07-06-citizen-loop-deepening.md` — modify (Task 9 canon-guard amendment note)
- **Steps:**
  1. Add `--record` flag (default OFF — read-only behavior unchanged for existing callers). When set, after generating the voice line run the wake write block (`citizen-wake.js` L193–245 pattern): `classifyTripleReflection_` on the quote with the citizen's open tensions → `ensurePagePointer_` + `appendReflection_` (`daypart='PRESS'`, extra `{affect, event, ask: <first 120 chars>}`) → tension open/resolve to `logs/citizen-tension-state.json` → one `Reflection_Intake` row (`daypart='PRESS'`, `applied='no'`).
  2. `--dry-run` + `--record` → print what would be written, write nothing (wake discipline).
  3. Amend engine.48 Task 9's canon-guard line: read-only is the *default*, `--record` is the sanctioned write mode (Mike-direct S312, this plan) — same page+intake-only wall as the wake.
- **Verify:** live sandbox call with `--record` → 1 page doc + 1 intake row + quote returned; without flag → zero writes (byte-identical to S300 behavior); dial test passes.
- **Status:** [ ] not started

### Task 2: Batch mode *(engine-sheet)*

- **Files:**
  - `scripts/citizenVoice.js` — modify
- **Steps:**
  1. Add `--batch=path.json` (array of `{pop, ask, record}`) → runs calls sequentially, emits a JSON array to stdout: `{pop, name, quote, disp, recorded, fallback: null | 'no-dials' | 'call-failed: <msg>'}`. One citizen's failure never kills the batch — it lands as a `fallback` entry.
  2. Log per-call + total token usage to stderr (acceptance 6).
- **Verify:** batch of 3 (one valid, one no-DialState pop, one bogus pop) → 3 entries, 1 quote + 2 fallbacks, exit 0.
- **Status:** [ ] not started

### Task 3: `/write-edition` quote-supply pre-pass *(research-build)*

- **Files:**
  - `.claude/skills/write-edition/SKILL.md` — modify
- **Steps:**
  1. New Step 1.5 (after dispatch read, before desk launches): for each article, read its brief, collect the verified citizens, and write a batch file of `{pop, ask, record: true}` — the ask built from the brief's story context ("The Tribune is writing about <spine/headline angle>. What's your honest take, as someone living it?" + the citizen's context line). Run `node scripts/citizenVoice.js --batch=... > output/voices/voices_c{XX}.json`.
  2. Inject into each desk launch prompt a SUPPLIED CITIZEN LINES block: `POP | Name | "quote"` for that article's citizens (skip fallbacks).
  3. Rewrite the QUOTE DISCIPLINE launch-prompt block: supplied lines are the citizen's own words — quote them verbatim or trim from the front/back, never paraphrase-then-attribute. In-scene invention (S227 craft rule) now applies ONLY to citizens with a `fallback` marker or scene extras never attached to the story. Update §Rules and the Step 2 Pass 2 editor checklist to match (check quotes against the voice packet first, brief second).
- **Verify:** dry `/write-edition` Step 1.5 on the latest locked dispatch → voices JSON exists, N entries; a launched desk prompt (printed in dry mode) carries the block; QUOTE DISCIPLINE text references the packet.
- **Status:** [ ] not started

### Task 4: Letters ride the same pass *(research-build)*

- **Files:**
  - `.claude/skills/write-edition/SKILL.md` — modify (letters launch step)
- **Steps:**
  1. Extend Step 1.5: for each `letters[]` entry with a ledger citizen writer, add a batch entry whose ask is the letter seed ("Write to the Tribune about <topic> — what would you actually say?", `record: true`, letters tolerate longer output — pass `--max-tokens` accordingly).
  2. Letters desk launch prompt: writer's supplied text is the letter's substance; the desk formats (salutation, trim, house style) and may not author substance for supplied writers. Generic invented writers (S227 letters-texture exception) are unaffected.
- **Verify:** letters desk output for a supplied writer traces to the voiced text (string overlap); invented-writer letters still work.
- **Status:** [ ] not started

### Task 5: Post-publish dedup reconcile *(research-build)*

- **Files:**
  - `.claude/skills/post-publish/SKILL.md` — read substep 2e + citizen-card refresh, then modify
- **Steps:**
  1. Read 2e's current scope (interview voice reflection ingest). Add the rule: citizens whose quotes came through the voice packet (`output/voices/voices_c{XX}.json` exists and lists them) already own their PRESS intake row — 2e must not write a second reflection row for the same quote. Interview-format subjects (premium `/interview` path) keep the 2e backfill unchanged.
  2. Citizen usage tracking (NAMES INDEX / usage log / fame) is publication-side and stays untouched — it records printing, not speaking.
- **Verify:** post-publish dry pass on an edition with a voice packet → 2e skip logged for packet citizens; usage log still updates.
- **Status:** [ ] not started

---

## Parked (explicitly out of scope — do not fold in)

- **Sift-time quote fetching** — asks are built at write time from locked briefs; fetching at sift would voice citizens for articles that die in the slate. Revisit only if write-time latency actually hurts.
- **Voiced pull-quotes for civic officials via civic-office agents** — officials with DialState ride this path as citizens; their *institutional* statements stay with the civic voice agents (different speech register, city-hall's domain).
- **A `[Press]` LifeHistory line at drain time** ("spoke to the Tribune") — would make quote-giving visible to future perception assembly. Real idea, engine-side, needs its own look at drain mechanics; not part of this wiring.

## Open questions

- [ ] None blocking. Ask-template wording (Task 3 step 1) is starting-value — tune against the first live edition's quote quality.

---

## Changelog

- 2026-07-11 — Initial draft (S312, research-build). Mike-direct: priority citizen-usage avenue + record-at-speak-time (page + gated intake; dials stay behind the cycle drain). Closes the S296 curation diagnosis.
