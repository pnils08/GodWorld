---
title: engine.297 fix diff gate for category precedence and linked status
created: 2026-10-23
updated: 2026-10-23
type: reference
tags: [engine, media, reference]
sources:
  - docs/archive/for-claude-review/2026-10-23-engine297-fix-diff-gate-TASK.md
  - phase07-evening-media/buildEveningFamous.js
  - scripts/sportsWeekCity.test.js
  - c933cd0b
  - 486ea61e
pointers:
  - "[[archive/for-claude-review/2026-10-23-codex-post-ship-review]]"
---

# engine.297 fix diff gate

**SHIP for all three requested source/test items. Clean F2 bench and deployment acceptance remain HOLD pending their own evidence.** No remaining defect found in this bounded diff. The category-precedence defect and missing-Status limitation from the prior review are closed at source level.

Reviewed `486ea61e..c933cd0b` on the two named paths. Checkout HEAD was `02233aa7f1b9e66f2cf3ec17dfefc83da87dc5a6`; both reviewed files matched `c933cd0b`, with no local edits. File:line references below identify that candidate. Inspection and validation were local and read-only; only this review file was written. No deploy, bench, Sheet access, cron, commit, or close-script execution occurred.

## 1a. Authored category precedence — SHIP

Both fallback expressions now execute only when the normalized category is blank or `unknown` (`phase07-evening-media/buildEveningFamous.js:76-78`). An authored category uses only its category-map entry. The final own-bucket check remains (`:79`); aliases remain finite (`:51-56`). Thus a mapped category wins over a conflicting role, while an unmapped category cannot recover through that role.

Re-ran all ten original category probes against the actual bucket function and shared classifier, in an isolated Node VM with synthetic Active Cultural rows:

| FameCategory | RoleType | Candidate result | Verdict |
|---|---|---|---|
| unknown | cultural leader | CULTURAL_LEADERS | SHIP |
| blank | cultural figure | CULTURAL_LEADERS | SHIP |
| model | model | none | SHIP |
| model | cultural leader | none | SHIP |
| model | chef | none | SHIP |
| media-personality | cultural figure | none | SHIP |
| author | chef | AUTHORS | SHIP |
| unknown | constructor | none | SHIP |
| unknown | __proto__ | none | SHIP |
| unknown | cultural leaders | none | SHIP |

**10/10 passed.** The three prior conflicting-category admissions are now excluded; the two intended cultural-role recoveries and mapped override remain intact. The new regression assertion covers all three conflicts (`scripts/sportsWeekCity.test.js:422-425`).

## 1b. Missing ledger Status — SHIP

The linked branch now rejects either an unresolved citizen or a missing Status column before evaluating the status cell (`phase07-evening-media/buildEveningFamous.js:84-87`). A present cell must still normalize to Active or Retired. The current linked neighborhood lookup remains after admission (`:89`), so rejected links cannot fall through to a stale Cultural neighborhood.

| Original status/schema probe | Candidate result | Count |
|---|---|---|
| Linked Active / Retired | ACTORS | 2/2 |
| Linked Deceased / Traded / Hospitalized / Recovering / Injured / Pending / blank | none | 7/7 |
| Unresolved POPID | none | 1/1 |
| Linked Deceased value with Status header omitted | none | 1/1 |

**11/11 passed.** An additional unlinked actor with no ledger Status header remained eligible (1/1), confirming the new schema guard applies to POP-linked rows. These are isolated synthetic probes, not current live citizen counts. The new committed regression fixture explicitly removes the header (`scripts/sportsWeekCity.test.js:426-429`).

## 3. Fixture change and regression tests — SHIP

The default ledger fixture now supplies a valid Active status (`scripts/sportsWeekCity.test.js:387`). This preserves the original positive linked-chef/current-neighborhood case (`:401-406`) under the stricter admission rule. It does not manufacture the missing POPID (`:404`, `:409`), change the unlinked mapped override or Inactive row (`:402-408`), or weaken the dedicated Active/Retired/Deceased/Hospitalized matrix, which already supplied its own complete ledger (`:410-416`).

The other old assertions retain their original scope: twelve category buckets and eleven generic pool entries (`:394-399`), cached read (`:400`), unknown-role recovery and model/model exclusion (`:417-421`), empty musician and empty ledger behavior (`:430-434`), and removal of 42 former literal names (`:435-437`). The fixture update leaves these checks meaningful. The weighting assertion verifies pool membership/count, not selection probabilities; registration and ripple checks inspect mocked calls (`:375-381`, `:395-397`), not persisted writes. Those proof limits are unchanged.

Validation performed:

- `node scripts/sportsWeekCity.test.js`: **67 passed, 0 failed**, exit 0.
- Same current test harness with only `buildEveningFamous.js` replaced in memory by `git show 486ea61e:phase07-evening-media/buildEveningFamous.js`: **65 passed, 2 failed**, exit 1. The only failures were the new 1a and 1b assertions (`:424-429`). This is a controlled implementation substitution, not a full historical checkout; other dependencies remained current. No file was replaced on disk.
- Original category/status/link/schema probes: **21/21 passed**, plus the additional unlinked/no-Status control: **1/1 passed**.

## Final gate

**1a SHIP; 1b SHIP; tests SHIP.** The candidate is ready for engine-sheet's planned clean F2 leg. This review supplies no new bench, deployed-version, first-fire, or live persistence proof and does not upgrade the prior contaminated F1 evidence. The reverted close-script check is outside this TASK. No code correction is requested by this diff gate.

## Changelog

- 2026-10-23 (codex) — Reviewed the two-file fix, reran the original probes, verified both regression checks fail against the prior implementation, and wrote only this review.
