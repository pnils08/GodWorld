---
title: Rhea is the gate — strip pre-Rhea word tests
created: 2026-08-29
updated: 2026-08-29
type: plan
tags: [media, newsroom, evaluation, active]
sources:
  - docs/ENGINE_CRON_LOOP.md §4.7
  - docs/engine/ROLLOUT_PLAN.md §pipeline.54
  - docs/plans/2026-08-20-s344-human-story-template-pressure-test.md
  - output/grok/media-audit-c104-proposed-fixes.md
  - logs/newsroom-fanout.log 2026-08-28T23:15Z write
pointers:
  - "[[../ENGINE_CRON_LOOP]] — §4.7 exhaustive fail list (Mike-direct)"
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.62"
  - "[[2026-08-20-s344-human-story-template-pressure-test]] — skipRhea was landed as Tasks 5–8; this plan reverses that skip"
  - "[[../SCHEMA]] — doc conventions"
  - "[[../index]] — registered in the same commit"
---

# Rhea is the gate — strip pre-Rhea word tests

**Goal:** Scheduled W3 drafts reach Rhea. Only §4.7 fails skip her or kill the writer. Word lists, missing `?`, assignment-token overlap, `"I've heard"`, and initiative-phase words in a lede do not.

**Architecture:** The newsroom cron is a newspaper, not a unit test. Rhea (`scripts/cron-rhea-gate.js`) is the contradiction gate. `cb5c20c6` put `s344ArticleGate` / `isSummaryArticle` in front of her as `skipRhea`, so Friday 2026-08-28 Hal/Elliot/Jordan wrote and never got a Rhea look (`rheaPass: null`, `"no rhea verdict"`). Carmen/Luis died inside the writer on regex audits before that skip. That is fake evaluation: a regex pass/fail so the wake looks gated. Strip it. Keep empty-W2 fail-closed (no answers → no article). Keep POPID-in-prose, fabricated quotes with no interview record, box-score contradiction, “simulation.”

**Terminal:** engine-sheet (Claude lands). Grok authored the diagnosis; does not land the code unless the builder names that.

**Pointers:**
- Prior work: [[2026-08-20-s344-human-story-template-pressure-test]] Tasks 5–8 (`cb5c20c6`)
- Writer refuse: `ecc99b3b` (`isSummaryArticle` throw)
- Empty W2: `34cace97`
- LEP `"I've heard"`: Codex `3c074933`
- Doctrine: [[../ENGINE_CRON_LOOP]] §4.7
- Friday evidence: `logs/newsroom-fanout.log` L3100–3340; `output/cron-compare/fanout-2026-08-28.write.results.json`

**Acceptance criteria:**

1. A Packet-active W3 draft with no `?` in the last graf still invokes `cron-rhea-gate.js`. `rheaPass` is true or false, never skipped for slot trivia.
2. A civic draft that contains `I've heard` is not thrown from `cron-desk-writer.js`. Rhea may still fail fabricated speech.
3. A lede that uses `construction-planning` / `disbursement-active` does not throw `summary article refused: phase-lede`.
4. `"For Lease"` as signage is not `UNAPPROVED_QUOTE` fatal. A quote with no interview record still is.
5. Empty W2 still throws `zero publishable answers` and does not open W3.
6. Friday-class fixtures (Hal lede-token miss, Jordan missing `?`, Elliot quote-span, Luis `I've heard`) do not `skipRhea`. A second Almanzar no-hitter that the sports feed contradicts still fails Rhea.
7. No crontab edit.

---

## Evidence (2026-08-28 write)

Seven seats. Four drafts. One staged (Nia). Three flagged with empty contamination and `rheaPass: null`:

| Seat | Stop | Exact log |
|---|---|---|
| Carmen | writer throw | `UNAPPROVED_QUOTE: "For Lease"` repaired; then `Fatal: summary article refused: phase-lede` (`cron-desk-writer.js` L1192–1194, `livedArticleShape.js` L91–93) |
| Luis | writer throw | `LEP/2 Article manifest audit failed … INVESTIGATION_EPISTEMIC_OVERREACH=I've heard` (`livedExperiencePacketV2.js` L589, hard-fatal L611–614; throw L1183–1185) |
| Simon | no W3 | `W2: zero publishable answers — fail closed` (`cron-desk-run.js` L517–525, L2288) — **keep** |
| Hal | s344 skip | `lede-misses-assignment`; `intake-misses-assignment` |
| Elliot | s344 skip | `missing-packet-quote` (4 W2 quotes landed) |
| Jordan | s344 skip | `missing-unanswered-question` |
| Nia | staged | only Friday W3 that reached a Rhea path / stage |

`skipRhea` is `cron-desk-run.js` L2489:

```js
const skipRhea = contamination.fail || (PACKET_ACTIVE && (shape.fail || s344Gate.fail));
```

Landed `cb5c20c6` (grok, pipeline.54 Tasks 5–8) as “Rhea last.” It is Rhea never.

---

## What a gate may fail (exhaustive, do not extend)

From [[../ENGINE_CRON_LOOP]] §4.7:

1. Fabricated speech — quote no interview produced.
2. Direct contradiction of recorded state — wrong initiative type, `As_Roster` conflict, two places at one recorded moment.
3. Fourth-wall — “simulation” and kin. Not cycle, packet, Civis numbers.

Never fail: presence/scenes, “I've heard,” missing `?`, assignment-token overlap, initiative phase words in a lede, BART (train), allotted in-world rooms.

---

## Tasks

### Task 1: `skipRhea` only on doctrine hits

- **Files:**
  - `scripts/cron-desk-run.js` — modify `runWrite` L2466–2492
  - `scripts/cronDeskStoryTemplate.test.js` — modify
- **Steps:**
  1. Stop OR-ing `shape.fail` and `s344Gate.fail` into `skipRhea`.
  2. `skipRhea` only if contamination (or a new helper) reports §4.7 class: `popid-leak`, `simulation`/fourth-wall, leftover repair chrome, fabricated-speech already caught as contamination. Slot findings (`lede-misses-assignment`, `missing-unanswered-question`, `intake-misses-assignment`, `missing-packet-quote`) `log()` only.
  3. Packet-active W3 always calls `cron-rhea-gate.js` unless that doctrine helper fails.
- **Verify:** fixture draft with no `?` still execs `cron-rhea-gate.js` in a unit test (mock or spy). Friday Jordan-class draft does not produce `disposition: flagged` from s344 alone.
- **Status:** [x] done

### Task 2: Demote s344 slot checks to observations

- **Files:**
  - `scripts/s344ArticleGate.js` — `evaluate`, `assignmentBind`
  - `scripts/livedArticleShape.js` — `s344Slots`
  - `scripts/cronDeskStoryTemplate.test.js` — Luis `intake-misses-assignment` pin
- **Steps:**
  1. Delete `lede-misses-assignment` token overlap (`s344Slots` L62, `assignmentBind` L20).
  2. Delete `intake-misses-assignment` token overlap (`assignmentBind` L29). Keep faith-vs-transit swap L31–33 as a **logged observation**, not `fail`, unless it is a real assignment swap (faith INTAKE on a transit Article) — that swap may stay a fail as contradiction of the assigned story.
  3. `missing-unanswered-question`: do not set `fail`. Optional log if last two grafs have neither `?` nor a question clause.
  4. `missing-packet-quote`: do not set `fail` when W2 quotes exist. Italics and INTAKE count as landed.
- **Verify:** `node scripts/cronDeskStoryTemplate.test.js` — Luis near-pass is not `fail` for INTAKE token miss; Jax faith/transit swap still detectable.
- **Status:** [x] done

### Task 3: Writer must not throw on `isSummaryArticle`

- **Files:**
  - `scripts/cron-desk-writer.js` L1192–1194
  - `scripts/livedArticleShape.js` `isSummaryArticle` L76–98 (`phase-lede` L91–93)
  - `scripts/cron-desk-writer.test.js`
- **Steps:**
  1. Remove the `throw new Error('summary article refused: ' + …)` at L1194. Log the reasons. Keep the draft.
  2. `phase-lede` matching `disbursement-active|construction-planning|pilot-active|…` is tracker vocabulary, not a summary. Delete that branch or demote to log. Civic desks must be able to name a phase.
  3. Auditor-lede / packet-voice / feed-dump may stay as **logs** for Rhea context, not writer fatals.
- **Verify:** a fixture lede containing `construction-planning` exits 0 and writes a draft. Carmen Friday class no longer `Command failed`.
- **Status:** [x] done

### Task 4: LEP hard-fatal must not include hedges or signage

- **Files:**
  - `scripts/livedExperiencePacketV2.js` `auditArticle` L587–614
  - `scripts/cron-desk-writer.js` L1183–1185
  - `scripts/livedExperiencePacketV2.test.js` (Luis overreach pins L385, L391)
- **Steps:**
  1. Remove `I've heard` / `I have heard` from the overreach regex at L589 (`heard` in the looked/asked/heard list). Journalists hedge. Citizens hedge.
  2. `UNAPPROVED_QUOTE` must not treat a 1–3 word sign (`For Lease`, `Open`, `Closed`) as a citizen quote. Require quote length ≥ 12 or a speaker, or exclude all-caps/title-case signs.
  3. Keep `UNAPPROVED_QUOTE` fatal for a long attributed sentence with no W2/Packet quote record (fabricated speech).
  4. `INVESTIGATION_EPISTEMIC_OVERREACH` must not be in the `hard` array at L611–612 for load-bearing packets, **or** drop `heard` so Luis Friday does not throw. Route remainder to Rhea observations (comment at L605–609 already says that for lexical color).
- **Verify:** `node scripts/livedExperiencePacketV2.test.js` — `I've heard` is not a hard fail; a fake long quote with no Packet support still is.
- **Status:** [x] done

### Task 5: Keep empty W2 fail-closed

- **Files:**
  - `scripts/cron-desk-run.js` L517–525, L2288, L2370
- **Steps:**
  1. Do not change `assertPublishableQuotes`. Zero publishable answers → no W3. That is not a word list.
- **Verify:** existing `cronDeskStoryTemplate.test.js` L19–21 still throws on `[]`.
- **Status:** [x] done — no-op confirmed; `assertPublishableQuotesStrict([])` still throws (`cronDeskStoryTemplate.test.js` L19–21, green).

### Task 6: Tests against Friday fixtures

- **Files:**
  - `scripts/cron-desk-run.js` tests if present, else `scripts/cronDeskStoryTemplate.test.js`
  - Frozen drafts: `output/cron-compare/flagged/*-2319.md` (Hal), `*-2320.md` (Elliot), `*-2321.md` (Jordan) — copy into `scripts/__fixtures__/newsroom/` if tests must not depend on live cron-compare
- **Steps:**
  1. Hal/Elliot/Jordan Friday drafts: `s344ArticleGate.evaluate` may log; `skipRhea` helper is false.
  2. A synthetic second-no-hitter that contradicts `Oakland_Sports_Feed` still fails Rhea (or a packet contradiction fixture).
- **Verify:** `node scripts/cronDeskStoryTemplate.test.js && node scripts/livedExperiencePacketV2.test.js && node scripts/livedArticleShape.test.js`
- **Status:** [x] done

---

## Out of scope

- Crontab.
- Sports slice / Hal DESK APPROACH “era echo only if Packet names the legend” — Claude/sports.
- Saturday INTAKE strip / mint — separate ops hole.
- Invented presence, banning “cycle,” dropping `corrections-needed`, restricting storylines.

---

## Open questions

- [x] `isSummaryArticle` auditor-lede strings — **log-only, kept**. They still populate `reasons`, but nothing fatal reads them on the Packet-active path: the writer throw is gone and `skipRhea` no longer consults shape. They survive as Rhea context, which is what they were for.
- [x] Faith/transit assignment swap — **kept as the one `assignment-bind` fail, and re-wired so the fail means something.** It is a contradiction of the assigned story (a faith coverage-gap INTAKE stapled to a transit article), not a wording miss, and Rhea reads the draft rather than the assignment pairing, so she cannot catch it herself. `runWrite` now ORs that single issue id into `skipRhea`. Caught on review: with `s344Gate.fail` cut out of `skipRhea`, nothing downstream read it — the historical Jax fixture only blocked because it also trips `frank-ogawa` contamination, so a clean swap would have ridden through. Pinned both ways (gate fixture + a source pin that `runWrite` still reads the id).

---

## Changelog

- 2026-08-30 (research-build) — Reviewed against live code and executed, Tasks 1–6. Every claim in the diagnosis verified at file:line first. `skipRhea` is now `contamination.fail` alone; slot findings and `phase-lede` are `observations`; the writer's `summary article refused` throw is a log; `heard` is out of the overreach wall and short Title-Case signage is exempt from `UNAPPROVED_QUOTE`. Empty W2 untouched. `cron-rhea-gate.js` untouched. Five suites green.
- 2026-08-29 (grok) — Plan filed for Claude review. Friday write: 3 writer/W2 deaths + 3 s344 skips, Rhea never ran on the skips. `skipRhea` at `cron-desk-run.js` L2489 is the fake test. Doctrine is §4.7. Empty W2 stays.
