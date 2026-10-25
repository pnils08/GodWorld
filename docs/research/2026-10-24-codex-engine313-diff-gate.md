---
title: engine.313 candidate diff gate
created: 2026-10-25
updated: 2026-10-25
type: reference
tags: [engine, media, reference]
sources:
  - docs/research/2026-10-24-engine313-diff-gate-TASK.md
  - commit 962b7547
  - docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md
pointers:
  - "[[2026-10-23-codex-engine313-plan-review]]"
---

# engine.313 — candidate diff gate

**Final gate: HOLD for PROD.** F1's committed-row selection is corrected in source, but F2's role-derived fame/summary effects, F3's untyped POPID receipt join, and F4's insufficient final-window proof need fixes or explicit narrower acceptance. This is a review of commit `962b7547` at HEAD `63bae176`, not a bench, Sheet, clasp, or live result. The three candidate files were clean in the checkout; unrelated dirt was left alone.

## F1 — SHIP, for the committed-row identity contract

The target resolves before registry lookup: first exact Name, then the highest-FameScore non-institution row linked to the uniquely resolved POPID; the strict `>` comparison keeps the earlier row on a tie (`phase07-evening-media/culturalLedger.js:384-418`, `:664-686`). UPDATE uses `targetIdx` without a Name rescan (`:468-473`), the row's `row:<n>` registry key (`:417-418`, `:540-552`), and that `rowNum` for all three helpers (`:528-536`). The same-row repeat mutates the first intent objects and returns before helper calls (`:424-440`).

The synthetic checks cover a shared label already registered on the earlier conflicting row, another POPID on that row, same-POPID rows at different scores, a dynasty row ahead of the personal target, and an equal-score tie (`scripts/sportsWeekCity.test.js:505-524`). The different-score and dynasty cases do **not** preload the conflicting row into the registry; source order and row keys show why they still resolve independently, but add that combined regression case if the claim is meant to cover it directly. Exact-name precedence can still update a row linked to a different POPID (`scripts/sportsWeekCity.test.js:529-533`); that is the expressly preserved old behavior, not a repair of historical mislinks. Pending creates remain keyed by Name (`culturalLedger.js:417`, `:619-630`), so this is not a global one-row-per-POPID invariant for two new aliases in one Cycle.

## F2 — FIX, category cells protected but role-derived effects remain

On the new POPID path, FameCategory and CulturalDomain cell intents are correctly skipped (`phase07-evening-media/culturalLedger.js:492-499`). The actual bridge reads the highest-fame linked row without excluding dynasty (`culturalLedger.js:119-130`) and passes its category as the citizen's role (`phase07-evening-media/buildEveningFamous.js:229-244`, `:552-556`). Registration classifies that role before selecting the personal row (`culturalLedger.js:226-236`, `:384-404`); `fam` still controls calendar fame bonuses (`:274-331`) and the update summary's category/domain (`:555-567`).

I ran an in-memory, synthetic/non-canon registrar case with a dynasty row at fame 80 and a linked artist row at 40 on First Friday. A citizen-name call selected the differently named artist CUL-ID and queued no category/domain writes, but gave it only +5 fame and reported `unknown`/`Other` in `culturalEntityUpdates`; the artist bonus path at `:288-300` did not run. With an exact citizen-name personal row, the same bridge role queued `unknown`/`Other` **into** its category/domain cells. That exact-name refresh predates this diff and is filed separately as engine.315 (`docs/engine/ROLLOUT_PLAN.md:138`); the incorrect bonus and summary on the newly opened POPID path are this candidate's gap. Preserve the selected personal row's category/domain for those effects too, or explicitly document and test a different rule.

## F3 — FIX, receipt predicates need a valid POPID

The duplicate check excludes `dynasty`/`Institution` symmetrically on baseline and new rows, ignores blank links, and compares each new personal row against baseline and preceding new personal rows (`output/engine-sheet/2026-10-22-e297-check.js:52-76`). Its HOLD names the new CUL-ID, linked text, and prior CUL-ID/name (`:73-75`). A new dynasty beside a baseline personal row and a new person beside a dynasty-only baseline therefore pass this predicate, as intended.

`popOf` accepts every string beginning `POP-`, including `POP-`, `POP-X`, and `POP-99101 extra` (`:54`). The first two can falsely join malformed links; the last can miss a duplicate of valid `POP-99101`. Require the canonical full POPID form before either side enters the join. The commit mentions six synthetic receipt fixtures, but none is in its changed files; the 82 local tests below do not execute this receipt. Add committed fixtures covering both dynasty directions, blank and malformed links, and personal duplicates.

## F4 — FIX, coverage HOLD works; a positive hit is not path proof

With `--e313 --final`, no baseline mismatched personal row seen under its citizen's ledger spelling produces a coverage HOLD (`output/engine-sheet/2026-10-22-e297-check.js:94-115`). The bench procedure supplies `--e313` on each Cycle and `--final` at C116 (`output/engine-sheet/2026-10-25-e313-bench.sh:42-47`, `:70-75`). This is an effective no-hit guard, if that procedure is run.

A positive `out.e313` uses a name in `Riley_Digest.FamousPeople` and final-snapshot `LastSeenCycle >= sighting Cycle` (`2026-10-22-e297-check.js:97-112`). The digest is a joined name list (`phase01-config/godWorldEngine2.js:2001-2002`), while the registrar's POPID-resolution Logger line contains the actual selected CUL-ID (`phase07-evening-media/culturalLedger.js:400-403`). At C116, a row first updated in C114 satisfies a C113 hit by `>=`; another sighting of its Cultural label in C113 could also have updated it without proving that the citizen-name call reached it. The planned per-Cycle checks reduce the first risk if their receipts are retained and pass, but the final snapshot cannot by itself certify the causal path. Bind a citizen-name call to selected CUL-ID/row and its queued intent or typed per-Cycle readback; treat the current `e313.ok` as corroboration, not fallback proof. `FamousPeople` can also contain the ledger name through the legend/player pools (`phase07-evening-media/buildEveningFamous.js:189-218`), so the receipt comment that only the fame bridge sights that spelling is too narrow (`2026-10-22-e297-check.js:11-12`).

## Tests and engine.314

**Tests — FIX for coverage, source behavior partly SHIP.** I ran `node scripts/sportsWeekCity.test.js`: **82 passed, 0 failed**. `node --check` passed on the registrar and receipt; `git diff --check 962b7547^ 962b7547` passed for the three reviewed files. The suite uses the real registrar, intent queue and helpers on a mutable fake sheet (`scripts/sportsWeekCity.test.js:450-479`). It verifies the chosen row for the one-call mismatch, score/tie/dynasty cases, and first-call helper targets (`:484-492`, `:513-524`). In the two-call tests it checks one MediaCount/FameScore/LastSeen intent and helper calls at row 2, but never asserts **every** cell intent's row (`:494-503`); the shared-label test checks both MediaCount rows but not FameScore or helper targets for its second call (`:505-512`). Wrong-row writes in those unchecked fields could pass those particular assertions. Add complete per-row intent and helper assertions, plus the F2 bridge-driven case and receipt fixtures. I did not independently reproduce the commit's parent-version “8 failures” claim.

**Engine.314 — separate, no aggravation shown.** Pending-create repeat still writes array positions 18/19 (`phase07-evening-media/culturalLedger.js:443-462`), while CREATE now fills calendar fields by header name (`:600-615`). The candidate changes neither repeat branch nor new-row shape. It remains a distinct tracked defect (`docs/engine/ROLLOUT_PLAN.md:139`), and this diff does not show a new worsening of it.

The source and local test verdicts do not establish a sandbox leg, deployment, or live Sheet effect. No receipt script, bench, engine Cycle, or external state was run for this review.
