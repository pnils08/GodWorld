---
title: engine.299 second re-review — migration fixes and prose boundary
created: 2026-10-18
updated: 2026-10-18
type: reference
tags: [engine, citizens, events]
sources:
  - 7f48c5e6b8578be32a5c94a1aea3d102d0d60432
  - c8235de3e775cc0fea2a00e6692e30bea30192ed
  - 43c2457d6717d03ff57efd3d7d1efe7caae7967c
  - 3d10fd05bc26a7ebeae7b700eb9b2fae00347d57
  - 8df5dd2eec28a6c7f38002fc0ff7a738e27037fb
  - docs/plans/2026-10-18-event-engines-move-dials.md
pointers:
  - 2026-10-18-codex-engine299-rereview.md
---

# Codex verdict — FIX, one remaining scanner defect

Reviewed HEAD `c8235de3`, its repair diff, and the named additions `43c2457d`, `3d10fd05`, and `8df5dd2e`. The Relocation reader integration and settled-in verdict findings are closed. ECL one-word prose now blocks acceptance correctly. The code-string classifier still exempts ordinary authored pool entries, object text values and output-call arguments merely because they occupy containers also used for identifiers.

Only this requested inbox review file was added. No engine edits, Sheet operation, model call, deployment, Cycle fire, commit or push. Existing concurrent dirt and the prior verdict files were left untouched.

## Remaining MEDIUM — generic syntax positions still hide code prose from acceptance

`scripts/deadBranchScan.js:240` treats an opening array/call delimiter, colon, or following comma/closing delimiter as an identifier context. Those are also the normal positions of authored event text. `:241` treats any dot in a single-token string as identifier shape, including sentence punctuation. `:242` therefore exempts the following synthetic examples in a known emitter file, even with an otherwise-clean graded log:

| Source | Reported prose | acceptanceEmpty |
|---|---|---|
| `var pool = ["blight"];` | false | true |
| `var event = { text: "displaced" };` | false | true |
| `writeLine("blight");` | false | true |
| `var line = "blight.";` | false | true |
| `var line = "displaced";` | true | false |
| `var col = idx("DisplacementRisk");` | false | true |

All hits remain visible in premise, but the first four no longer block acceptance at `deadBranchScan.js:284`. Visibility does not establish a correct exemption. The new test exercises a bare assignment and an actual identifier lookup/comparison; it misses the text-array/object/call sites used by the engine's authoring patterns.

**Bounded fix:** exempt known identifier uses (such as column lookup arguments, recognized enum comparisons and object keys), not every value inside arrays, objects and calls. Treat unknown value contexts conservatively as prose. A terminal period is not a dotted identifier. Add these cases to the clean-report boundary tests while retaining the passing idx/enum/comment cases. This does not require an engine-words gate: genuine identifiers can remain reported/nonblocking.

The ECL half of the previous defect is **closed**: `deadBranchScan.js:270` marks ledger Text prose:true unconditionally. Fresh clean-report probes for active Text=`blight` and Text=`displaced` both return acceptanceEmpty=false. Owner-pool life-verb exceptions remain visibly annotated and independent of premise matching. Do not reopen that working portion.

## Closed HIGH — graded moves reach branch memory and wake summary

`utilities/compressLifeHistory.js:1663-1672` recognizes the graded suffix, looks up the kind, and stores that kind in newly captured registers. Existing displacementmove read-alias behavior remains. `lib/citizenDials.js:114-119` similarly normalizes the graded tag before its summary-word lookup.

Independent end-to-end local probes parsed the actual graded cell form, executed the real Phase 9 fold, serialized the resulting registers into `lib/resonanceRecall.unlivedCandidates`, and invoked `citizenDials.thrown`:

| Cell tag | Folded delta | Stored branch tag | Wake/recall result |
|---|---|---|---|
| Relocation-Drive-Up-M | drive +2 | Relocation | “a move”; relocation-specific recall |
| Relocation-Composure-Down-M | composure −2 | Relocation | “a move”; relocation-specific recall |
| Relocation-Composure-Up-M | composure +2 | Relocation | “a move”; relocation-specific recall |

The recall uses “the version of you that stayed,” not its unknown-kind fallback. Existing unlivedFold and unlivedEcho tests also pass. This closes both exact-kind reader failures without rewriting stored historical rows. Regex recognition is consistent with the current nine-dial graded form. The source comment's reference to baseTag_ describes the intended normalization; implementation uses an equivalent local regex rather than calling that helper.

## Closed HIGH — settled-in reads the enum and skips unavailable inputs

`phase05-citizens/migrationTrackingEngine.js:511-523` now accepts only finite numeric pressure for cost/displaced moves and only decay/steady/growth for the other trajectory branch. Decay is Down; steady and growth are Up. The old substring test and pressure=5 fallback are gone.

Fresh actual-function probes verified opportunity/decay → Down, opportunity/steady and growth → Up, unknown/blank trajectory → no write, and absent/NaN/Infinity/string pressure → no write. Cost pressure 8 → Down and pressure 2 → Up. Rejected probes leave history and ledger.dirty untouched. The existing ten-Cycle/destination gates remain; no new log or direct Sheet write was introduced. This closes the previously identified enum and missing pressure/trajectory defects, not a population-wide assessment of every move verdict.

## Other requested commits

| Commit | Verdict | Evidence and limits |
|---|---|---|
| 43c2457d — crime table reset | SHIP retained | Current source still has the empty table and boom-derived profile. Fresh crimeCarryForward 55/55 and hoodIdentityRemainder 38/38 pass. The earlier read-only live check in this conversation, at 2026-10-18 16:51:39 UTC, found 22/22 matching hoods with no component needing seed fallback; it was not repeated this turn and is a time-bounded observation. Caller search, normal loader order and the missing-adjacency fail-loud boundary are documented in the preceding review. No change here reintroduces table reads. |
| 3d10fd05 — named sports pool | SHIP retained | Fresh gameNightMoments test passes. The route still writes Sports-Sociability-Up-S to the cell and log primary. Earlier actual-pool probes covered all three texts and Phase 9 sociability +1; the scoped repair does not alter that writer. Public recognition → sociability is consistent with the existing resolver policy. |
| 8df5dd2e — fixture pair T10 | SHIP as bounded fixture evidence | Fresh engine299Graded run: 14/14. The real generator receives the same hood/Cycle/seed sequence with stretched DebtLevel 5, WealthLevel 2 versus comfortable DebtLevel 0, WealthLevel 9. It produces the asserted Down-only versus Up-only money-line subsets, with debt lines absent for comfortable rows. Source gates confirm WealthLevel ≤3/≥8 (`generateCitizensEvents.js:2913-2918`) and DebtLevel ≥4 (`:2924-2927`). This is a composite pair varying both money fields and synthetic identity, not a test isolating DebtLevel alone or proving every family, live persistence, or S > M > L frequency. |

T10 selects its money-line subset by text matching and runs 600 seeds per fixture. It verifies the stated subset's signs and admission, not all possible generator output. The plan edits in 8df5dd2e describe the reduced cleanup scope and hold rate machinery for the builder; they are not implementation of a new rate system. A “done” proof row does not upgrade the bounded tests to all of Task 9's broader acceptance claims.

## Validation and evidence boundaries

Fresh checks at c8235de3:

- migrationRelocation: **87 passed, 0 failed**. The supplied “+8” count understates the literal assertions added: the current script reports ten more than the earlier 77 (six settled-in, three capture variants, one wake-summary assertion). No behavior concern follows from the counting difference.
- engine299Graded: **14 passed, 0 failed**, including both T10 assertions.
- deadBranchScan.offenders: PASS, including its new clean-report tests; additional adversarial code-prose probes above still expose the gap.
- unlivedFold: **26 passed, 0 failed**; unlivedEcho: **10 passed, 0 failed**; cronStance: **32 passed, 0 failed**.
- gameNightMoments: all assertions pass; crimeCarryForward **55/55**; hoodIdentityRemainder **38/38**.
- Syntax checks pass on all six JS files changed by c8235de3 and the T10 test changed by 8df5dd2e. Both commits pass whitespace checks.

One test limitation is worth preserving: migrationRelocation's wake assertion permits `words === null` if the export is absent. The independent probe called the real exported thrown function directly and required exactly “a move,” so the present closure does not rely on that fail-open branch.

No full-suite rerun or fresh external verification this turn. The recorded @48 bench remains pre-43c2457d/pre-3d10fd05/pre-c8235de3 evidence: 2,249 lines, one inert Sports line, seven bookkeeping markers, and zero unallowed prose/life-verb hits under its then-current classifier. It is not a post-repair zero-inert run or proof that the revised classifier is sound. Local tests establish the repaired reader/verdict behavior; they do not establish deployment, next-Cycle persistence, or current live effects.

**Final gate: FIX only the remaining code-prose exemption before accepting the combined cut.** The Relocation integration, settled-in repair, ECL-text boundary, crime reset, sports tag and T10 fixture pass within the scopes above. Keep those findings closed; no further migration or crime rewrite is requested by this review.

## Addendum — 7f48c5e6: SHIP for the scanner finding

The prior code-prose exemption is closed. `scripts/deadBranchScan.js:243-257` now defaults unknown one-word value positions to prose; arrays, object values, ordinary call arguments and terminal periods block a clean report. Lookup, comparison and case operands, object keys and compound identifier shapes remain reported with `prose:false`. The six new source-word exceptions remain visible with `allowed:true` and reasons; current source confirms two unlived-rhyme keywords, the migration reason enum and three drift factors humanized before readable text. The refreshed C111 report (`output/engine299/offenders.json`, generated 2026-10-18 17:12 UTC) has zero unallowed prose-premise hits and zero unallowed life verbs; its 2,342 inert lines are the pre-engine.299 live baseline, so `acceptanceEmpty:false` is expected. This is source/report evidence, not a post-PROD Cycle result.

Fresh `deadBranchScan.offenders.test.js`, `node --check` and commit whitespace checks pass. The new test covers every counterexample from this review, plus identifier positions. **Low, nonblocking limit:** the 12-character source lookback cannot recognize longer listed lookup calls such as `getSheetByName("blight")`; a synthetic clean-report probe marks that argument `prose:true` while `idx("blight")` is `prose:false`. This fails closed and creates no hidden prose in the reviewed source. Expand the lookback and test a long lookup name if the scanner later needs that exemption. **Final gate for this reviewed finding: SHIP.**
