---
title: Newsroom Canon Flow — Saturday Gate, Autonomy Graduation, Narrator
created: 2026-08-04
updated: 2026-08-04
type: plan
tags: [media, canon, infrastructure, architecture, active]
sources:
  - Mike-direct 2026-08-04 (remote session, research-build) — the five-point Saturday/canon direction, captured verbatim below
  - "[[../research/2026-08-04-mags-as-narrator]] — research basis; adopt-trigger fired this session"
  - "[[2026-07-20-headless-newsroom-pipeline]] — the M–F machinery this plan completes; Phase 2b superseded by Phase 3 here"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.45"
  - "[[../index]] — registered same commit"
  - "[[2026-07-28-civic-cron-city-hall]] — civic.15; the datawake→desk-lane feed rides this same funnel; chain `--apply` graduation is a separate switch"
  - "[[2026-07-31-canon-ingest-backfill]] — engine.91; per-article ingest idempotency work this plan depends on"
---

# Newsroom Canon Flow — Saturday Gate, Autonomy Graduation, Narrator

**Goal:** Complete the cron→canon spine. M–F wakes + Rhea gate already run unattended; NotebookLM daily news already consumes staged output. What's missing is the **publication event** and the **path to autonomy**. This plan builds the Saturday run (EIC accuracy report + curation + Mags narration + canon ingest), the per-article Supermemory flow, the INTAKE contract that makes articles sheet-ingestable and searchable, and the graduation rule that ends the probation wall.

## Mike's direction (2026-08-04, verbatim intent — the design contract)

1. **Saturday exists right now only to test.** Once the world covers itself at **90% accuracy**, Rhea publishes articles directly and **the autonomy begins**. Mags as EIC reports each Saturday how close we are or aren't.
2. **Daily crons get the previous day's staged articles** plus the other context items. *(Supersedes the S332 zero-staged-retrieval wall within the cycle-week: staged articles are the newsroom's own prior filings — retrievable as "what we've filed this week," never as canon fact.)*
3. **Saturday puts the edition into the permanent NotebookLM notebook** — the world-canon door.
4. **All staged articles go into Supermemory** — per-article, NOT combined into an edition — **tagged to the journalist and the cycle**.
5. **The INTAKE sections of articles must be sheet-ingestable**, and retrieval queries use them for Supermemory searches.

Confirmed same session: Saturday is **curation + narration both** — two steps of one run, not two products. Reporters stay authors-in-canon (seventeen voices); Mags narrates on top (one voice on the Pulse). The compile/assembly layer from [[../EDITION_PIPELINE]] is deleted, not repaired — curation and narration replace it.

---

## Phase 1 — INTAKE contract *(research-build spec → engine-sheet build)*

Every wake-3 article ends with a fixed, machine-parseable **INTAKE block** (extends `docs/media/wake_templates/STORY_TEMPLATE.md` §5):

- **NAMES INDEX** — every named citizen: `Name | POPID | role-in-story`
- **BUSINESSES/ORGS** — named entities with BIZ/org IDs where they exist
- **STORYLINES** — storyline/initiative refs the piece advances
- **NEIGHBORHOODS** — where the story lives
- **DATA CLAIMS** — each load-bearing number with its source ref (world summary / engine audit / sheet field)

Tasks:
1. **Template + prompt.** Add the INTAKE spec to STORY_TEMPLATE wake-3 and the write-wake prompt. The self-score footer stays; INTAKE sits beside it.
2. **Parser.** Deterministic `parseArticleIntake` (home it in `lib/`, reusable by gate + Saturday run + Supermemory sweep). Emits: (a) sheet-row payloads (Citizen_Media_Usage and intake-class rows), (b) Supermemory metadata (journalist, cycle, POPIDs, neighborhoods, storylines) for tagged search.
3. **Gate enforcement.** `cron-rhea-gate.js` pre-check: missing/malformed INTAKE, or a NAMES INDEX entry failing the existing `canon-name-check.js` ledger check → flagged, never staged. INTAKE quality is part of clearance, because everything downstream (sheets, Supermemory search, accuracy audit) reads it.
4. **Build caveat (standing):** `ingestEdition.js`/`ingestEditionWiki.js` are edition-shaped — read their input contract before adapting; per-article ingest may be a real adaptation, not a flag. engine.91's customId idempotency work is the dedup substrate here.

**Acceptance:** one cleared article yields a parsed INTAKE with zero unverified names; parser output writes a valid Citizen_Media_Usage payload and a Supermemory tag set; an article with a fabricated name in INTAKE routes to `flagged/`.

### Phase 1 spec detail (research-build, 2026-08-04 — the bind-points for the engine-sheet build)

**Block format — strict line grammar, in the article body.** Cheap models produce line grammar reliably (the `<!-- SELF-SCORE -->` footer already proves the machine-block pattern in wake-3 output). Final section of every draft:

```
## INTAKE
NAMES: Lucia Polito | POP-00654 | quoted-source
NAMES: Calvin Turner | POP-00381 | subject
BIZ: Rico's Auto | BIZ-0112 | mentioned
STORYLINE: fruitvale-transit-hub | advanced
HOOD: Fruitvale
CLAIM: Transit Hub Phase II is a $230M visioning process | world_summary_c102 §initiatives
```

- `NAMES:` role enum: `quoted-source` / `subject` / `mentioned`. Every `quoted-source` must trace to §3 INTERVIEWS (real citizenVoice quotes) — an INTAKE quoted-source with no §3 backing is the invented-source class, auto-flag.
- `STORYLINE:` verb enum: `advanced` / `opened` / `closed` / `referenced` — this is the moves-the-sim signal Saturday curation ranks on.
- `CLAIM:` one load-bearing factual claim per line + the source ref that backs it. This is the EIC audit's checkable surface: each claim is deterministically re-verifiable, which is what makes the 90% accuracy score computable rather than vibed.
- No entity invented for the block: names/BIZ IDs must resolve against the ledger snapshot (reuse `canon-name-check.js` machinery). Unnamed color per the S344 doctrine never appears in INTAKE — the block indexes the record, not the texture.

**Parser — `lib/articleIntake.js`** (one home, three consumers): `parse(text) → { names[], businesses[], storylines[], hoods[], claims[], errors[] }`. On gate pass, the parsed object is written into the existing `.staged.json` sidecar as `intake:` — downstream consumers read the sidecar, never re-parse prose.

**Consumer contracts:**
1. **Gate** (`cron-rhea-gate.js` pre-check): parse errors, unresolvable POPID/BIZ IDs, or an unbacked quoted-source → `flagged/`. INTAKE validity is part of clearance.
2. **Sheets** (Saturday step 6): usage rows from INTAKE names — `quoted-source` rows already exist via `citizenVoice --record` (do NOT double-write; skip that class), so the new writes are `subject`/`mentioned` classes. Exact UsageType strings are an engine-sheet bind-point against `EMERGENCE_USAGE_TYPES` in `processAdvancementIntake.js` — bind at build, don't invent here. Header-mapped + idempotent like `recordBylineUsage`.
3. **Supermemory** (Saturday step 5): one document per article. `containerTags`: `bay-tribune` + `journalist-<bylinePopid>` + `cycle-<N>` + desk. `metadata`: byline, bylinePopid, desk, cycle, POPIDs, hoods, storylines, status (`staged`→`published` on curation). Queries filter on these — Mike's "queries grab these for searches."
4. **EIC audit** (Saturday step 1): per-article accuracy = claims verified / claims total, weighted by the S344 severity classes; NAMES resolution is a hard fail class (citizen-bending).

**Known seam:** staged article bodies carry no `By <Name>` line — `ingestEdition.js:extractBylineMeta` regexes published-edition bylines and will find nothing on per-article input. The per-article ingest path must take byline/desk from the sidecar, not the regex. (This is the concrete instance of the "ingest scripts are edition-shaped" caveat.)

**Build amendment (engine-sheet, 2026-08-04) — the MODEL never writes ids.** The wake-3 writer state deliberately carries no POPIDs (prose-leak class, first 2.5.2 live run; THE WALL forbids printing them) — instructing the model to emit `NAMES: Name | POP-##### | role` would regress that fix or force invented ids. Resolution: the model emits the 2-field form (`NAMES: <name> | <role>`, `BIZ: <name> | <role>`); `lib/articleIntake.js` accepts both forms (`popid`/`bizId: null` when absent); the GATE resolves name→id deterministically from its own records (`quotes[].pop`, `story.popids`, ledger snapshot) and writes the enriched object into the sidecar. Unresolvable name = the fabricated-source flag, unchanged. Full-grammar ids live in the sidecar, which is the only surface consumers read.

## Phase 2 — daily continuity feed *(engine-sheet)*

1. Wake context packs (`buildLaneState`) include the **previous day's staged articles** for that desk — labeled as the newsroom's own filings this week, not canon. Bounded (previous day only, headline + INTAKE + body cap) so the pack doesn't regrow the 40k blob.
2. Storyline dedup stays at Saturday curation; the weekly budget cap (28) is unchanged.
3. NotebookLM daily news (`notebooklmDailyNews.js`) already consumes staged output — no change.

**Acceptance:** a Wednesday wake demonstrably reads Tuesday's staged filing (follow-up references it); pack size stays bounded; no staged claim is presented as canon in the injected context.

## Phase 3 — the Saturday run *(engine-sheet wires the cron; media terminal owns the two editorial seats; supersedes headless-pipeline Phase 2b)*

One cron, six steps, in order:

1. **EIC accuracy audit — the test Saturday exists for.** Mags (EIC seat, headless) reviews the week's full staged set against ledger/canon. Per-article verdict: `accurate` / `corrections-needed` / `canon-violation`, fail classes weighted per S344 (citizen-bending worst; engine-verbiage lesser). Output: `output/eic_scorecard_c{N}.md` — weekly accuracy %, trend line, and the plain-language answer to **"how close to 90% are we?"** This lands in Mike's Sunday digest.
2. **Curation.** Rank staged articles mechanically first (self-score footers + INTAKE-derived moves-the-sim signals: storyline advancement, citizen impact, initiative pressure), Mags picks the top ~8–9. Storyline dedup happens here.
3. **Narration.** Mags writes the Cycle Pulse as narrator — drawing on the curated set, quoting her own staff's reporting by name. One voice on the Pulse, seventeen in canon. (Hazard watch from the research file: sameness-of-register is the new cookie-cutter door; the accuracy audit in step 1 is also her interrogation surface, so narration isn't her only mode.)
4. **Publish — the canon door.** Edition (narration + curated articles) → permanent NotebookLM notebook + standard canon ingest; `byline-published` Citizen_Media_Usage rows fire (engine.88 fame anchor unchanged).
5. **Supermemory sweep — everything cleared, per-article.** ALL staged articles (curated or not) → bay-tribune container, one document per article, tagged journalist + cycle + INTAKE metadata. Not edition-combined. Idempotent via the engine.91 customId scheme.
6. **Sheet ingest.** INTAKE-derived rows write via the Phase 1 parser.

**Acceptance:** one Saturday run end-to-end unattended: scorecard emitted with a %-to-90 verdict; edition in the permanent notebook; every cleared article individually retrievable in Supermemory by journalist tag and by cycle tag; usage rows landed; nothing from `flagged/` touched any surface.

## Phase 4 — autonomy graduation *(Mike-gated switch)*

- **Metric:** EIC weekly accuracy ≥ **90%** for **3 consecutive Saturdays** (N=3 proposed — Mike's call).
- **The flip:** Rhea clearance = publication. Cleared articles ingest to canon + Supermemory at clearance (daily), not on Saturday. Saturday keeps: accuracy report (now a regression watch), curation-of-canon, narration, permanent-notebook edition.
- **Regression rule:** accuracy < 90% for 2 consecutive weeks → the staging wall returns automatically; Mags flags it in the scorecard.
- Turning the flip on is Mike's explicit go, not a threshold auto-fire.

## Out of scope, riding alongside

- **Civic chain `--apply` graduation** — civic.15's own switch; Mon–Thu datawakes already feed this funnel unchanged.
- **C102 gap-log triage** — the moot/survives table in [[../research/2026-08-04-mags-as-narrator]] now resolves: G-DR3/G-DR4 confirmed moot (dispatch wrapper deleted with the compile layer); G-DR5 (per-article slug identity) is now Phase 1/3 load-bearing work; D-4's daily rotation is the Phase 2 feed.

## Changelog

- 2026-08-04 — Initial plan (research-build, remote session). Ignited by Mike completing the narrator design — the adopt-trigger in the research file. Phase order = dependency order: INTAKE contract first (everything downstream reads it), Saturday run third, graduation last.
- 2026-08-04 (same session) — Phase 1 spec detail added: INTAKE line grammar + enums, parser contract, four consumer contracts, `extractBylineMeta` per-article seam. Grounded against live staged artifacts.
- 2026-08-05 — Phase 3 seats BUILT (research-build): audit/curate/narrate/publish live in `cron-saturday-run.js`, full chain proven on c102 staged set. Open: Saturday cron install (Mike's go) + ingestPublishedEntities INTAKE adaptation + audit verdict-stability watch.
- 2026-08-04 (engine-sheet) — Phase 1 Task 2 shipped: `lib/articleIntake.js` parser + 37-assertion suite. BIZ `-` → `bizId: null` (gate decides clearance). Tasks 1/3/4 open.
- 2026-08-04 (engine-sheet) — Phase 1 Task 1 shipped: INTAKE spec into STORY_TEMPLATE §5 + wake-3 prompt tail in `cron-desk-run.js`. Build amendment: model emits 2-field (no-id) lines; gate resolves ids (see §spec detail).
- 2026-08-05 (engine-sheet) — Phase 1 Task 3 shipped: gate INTAKE pre-check (4 deterministic blocker classes, `--packet` backing check), `resolveCitizens` in canon-name-check, id-enriched `intake:` in the staged sidecar. Smoke pending next unattended M–F run.
- 2026-08-05 (engine-sheet) — Phase 2 shipped: `yesterdaysFilings` in wake state (≤3 same-desk filings, headline + id-free INTAKE + 600-char excerpt, never-canon label). Sourced from article text, never the id-bearing sidecar. 14-assertion suite.
- 2026-08-05 (engine-sheet) — Phase 3 spine shipped: `cron-saturday-run.js` — steps 5+6 live (dry-run default), steps 1–4 loud seams blocked on the narrator session. Crontab NOT wired. Bind detail in the script header.
- 2026-08-05 (engine-sheet, Mike-direct) — INTAKE is the universal article standard: `ingestEdition.js` now parses INTAKE→metadata, enforces via `--require-intake` (legacy warns), gains engine.91 T1 customId upsert; in-tree diff reviewed (kept .md + c-prefix, reversed silent cycle-100 default).
- 2026-08-05 (engine-sheet, Mike-direct) — storyline door opened without pigeonholing: Saturday step 6b aggregates free-form INTAKE storyline signals → `output/storyline_signal_c<N>.json`; Storyline_Tracker write deferred on header drift (ENGINE_REPAIR row 35).
- 2026-08-05 (engine-sheet, Mike-direct) — old Storyline_Tracker DISCONTINUED; slim `Storyline_Ledger` created live (12 cols) + step 6b upsert wired (verb-driven status, derived dormancy, reporter-slug keys). Row 35 closed-superseded; docs trued same commit.
