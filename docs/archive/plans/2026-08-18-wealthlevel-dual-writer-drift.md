---
title: WealthLevel Dual-Writer Drift Plan
created: 2026-08-18
updated: 2026-08-18
type: plan
tags: [engine, citizens, economy, active]
sources:
  - phase05-citizens/generationalWealthEngine.js:594 (deriveWealthLevel_, v15, S363 Mike-direct — pure NetWorth bands)
  - lib/economicLookup.js:107 (deriveWealthLevel, old income-proxy formula — same formula v15 replaced, still live here)
  - scripts/applyEconomicProfiles.js:173 (calls the stale lib formula, writes WealthLevel)
  - Mike-direct 2026-08-18 (research-build session): asked whether the WealthLevel scale is appropriate given most athletes and a $10B founder both land at 10
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout, engine.120"
  - "[[../SIMULATION_LEDGER]] §Economics (Z-AE) — WealthLevel column"
---

# WealthLevel Dual-Writer Drift Plan

**Goal:** one formula, one writer, for WealthLevel — right now two contradictory formulas both write the same column, and one is stale data sitting live in the ledger today.

**Architecture:** `generationalWealthEngine.js`'s `deriveWealthLevel_` (v15, S363) is the correct, current formula — pure NetWorth bands, wired into the cycle path (`Phase5-GenerationalWealth`, runs every cycle, unconditionally overwrites every active citizen's WealthLevel). `lib/economicLookup.js`'s `deriveWealthLevel` is the OLD income-proxy formula the v15 rewrite was explicitly written to replace (its own code comment says so) — but it's still live, still exported, and `scripts/applyEconomicProfiles.js` still calls it and writes WealthLevel with it. The v15 fix only patched the cycle-path writer; it never touched or retired the second one.

**Terminal:** engine-sheet (substrate fix — two `phase05`/`lib` writers, no apparatus-level decision needed, this is a routine align-the-writers bug).

**Evidence (verified 2026-08-18, live ledger read):** 23 citizens currently carry `WealthLevel=10`. Only 6 are correctly banded under the v15 NetWorth formula (Dalton Rushing $90M, Orion Kerkering $100M, Mason Miller $160M, Kris Bubic $180M, Paul Skenes $245M, Elias Varek $10.0B). The other 17 — including Mayor Avery Santana ($6.5M), three "AI Safety Researcher (Anthropic)" citizens ($1.8M-$4.6M), harbor tugboat captains, ship repair foremen, a public defender, an OPOA president, and two retired athletes with $15-18M — have NetWorth values ($345K-$18M) that band to 6-9 under v15, not 10. Their WealthLevel is stale at the old formula's output (`effectiveIncome >= $300K -> 10`), which several of the professional-role citizens cross on salary alone. The AI-Safety-Researcher overlap with the Aug 10 "85 of 336 citizens below role-floor income" fix (claude-mem) is circumstantial but suggestive: a salary-floor backfill likely ran `applyEconomicProfiles.js` and stamped WealthLevel with the stale formula at/after that point.

**Why this hasn't self-healed:** `processGenerationalWealth_` (the correct writer) runs every cycle unconditionally, so it WOULD overwrite these stale values on the next cycle advance. It hasn't, because no cycle has advanced since — C104 has been on hold since S380 (citizens-before-cycles). This is silently correct data drift, not an active bug corrupting new data every cycle; it will self-heal for these 17 the moment C104+ fires **unless `applyEconomicProfiles.js` gets run again first**, which would re-stamp fresh victims with the same stale formula.

**Acceptance criteria:**
1. `lib/economicLookup.js`'s `deriveWealthLevel` either calls through to `generationalWealthEngine.js`'s `deriveWealthLevel_` (needs a shared-module extraction, since the phase05 file isn't currently requirable as a plain lib) or is deleted and `applyEconomicProfiles.js` stops writing WealthLevel at all (deferring entirely to the cycle-path writer, since seeded citizens get their NetWorth set once and the v15 engine will band it correctly on the next cycle pass regardless).
2. `scripts/applyEconomicProfiles.js` no longer writes a WealthLevel value that can diverge from the v15 NetWorth-band formula.
3. The 17 currently-stale rows land back on their correct band next time `processGenerationalWealth_` runs (either via a manual bench run or the next real cycle) — spot-check a few (e.g. Avery Santana, the 3 AI Safety Researchers) post-fix.

---

## Tasks

### Task 1: Retire or redirect the stale formula

- **Files:**
  - `lib/economicLookup.js` — modify (delete `deriveWealthLevel`, or make it delegate)
  - `scripts/applyEconomicProfiles.js` — modify (stop writing WealthLevel, or call the correct formula)
- **Steps:**
  1. Decide: delete-and-defer (simpler — `applyEconomicProfiles.js` sets Income/NetWorth/SavingsRate only, leaves WealthLevel for the cycle-path engine to band on its next pass) vs delegate (extract `deriveWealthLevel_` into a shared lib both files import). Delete-and-defer is the lower-blast-radius option since the cycle path already unconditionally recomputes WealthLevel every cycle for every active citizen — a seed-time value would just get overwritten on the next cycle anyway.
  2. Implement the chosen option.
  3. Grep for any other caller of `economicLookup.js`'s `deriveWealthLevel` before deleting it (`grep -rn "deriveWealthLevel\b" --include="*.js"` excluding the phase05 4-param version) to confirm nothing else depends on the 2-param signature.
- **Verify:** re-run `applyEconomicProfiles.js` in dry-run/bench mode against a test citizen — confirm it no longer writes a WealthLevel value that disagrees with `deriveWealthLevel_`'s NetWorth-band output for that citizen.
- **Status:** [ ] not started

### Task 2: SUPERSEDED — do not hand-backfill

- **Status:** SUPERSEDED (engine-sheet, 2026-08-18, commit `ee92e5bf`). Original scope (17 rows) was wrong: full-ledger check found 551/940 WealthLevel rows match the stale v14.2 formula, only 243/940 match v15, 146 match neither — the 23-at-WL=10 sample was a slice, not the scope.
  Root cause is OPEN, not settled. First theory (deploy lag — v15 never reached the live Apps Script until 2026-08-17) was checked and retracted by engine-sheet same day: the actual live-deploy commit for `generationalWealthEngine.js` is `f87a001c` (2026-08-10 22:41), BEFORE C103 ran (Aug 11/12) — so v15 WAS live during C103, and "never persisted" is false. Back to the original hypothesis: something re-wrote WealthLevel with the old formula after v15 ran, possibly a salary-audit script (artifacts in `output/` dated Aug 11 13:30-13:31, inside the C103 window) — engine-sheet is investigating, not yet confirmed.
  **Do not hand-edit WealthLevel.** Not because a cycle is guaranteed to fix it (that justification no longer holds) — because the actual overwriting mechanism is still unknown, and a hand-edit would just get overwritten by whatever is doing this, unverified either way. Task 1 (already shipped) removes one known contributor regardless of what the investigation finds.

---

## Open questions

- [ ] Separate from the dual-writer bug: even under the corrected v15 formula, band 10 itself spans $50M to $10B+ uncapped — a retired athlete and an actual billionaire share the top bucket. Mike flagged this as a real open design question, not yet ruled on: does the scale need a band above 10, or is "10 = ultra-wealthy, undifferentiated" acceptable given how few citizens ever reach it (6 of 862 with NetWorth set, pre-fix)? Not blocking Task 1/2 — those fix a real bug regardless of where this lands.

---

## Proof (S381 discriminating test — drained from the rollout row 2026-08-19)

On rows where the two formulas disagree, script-written rows (EconomicProfileKey set) split 508 v14.2 / 11 v15, while SPORTS_OVERRIDE rows (the branch that never writes WealthLevel) split 29 v15 / 10 v14.2 — the script was the last writer and overwrote the engine. Real scope 551/940 rows on v14.2 (not 17). With the writer deleted (`ee92e5bf`), the engine's unconditional per-cycle write repairs all rows on the first clean cycle; no hand-backfill.

---

## Changelog

- 2026-08-19 — Rollout-row detail drained to §Proof above; row trimmed to pointer budget.
- 2026-08-18 — engine-sheet retracted the deploy-lag root cause same day (v15 was live before C103 ran); real cause open, investigation ongoing. Corrected here — do not cite deploy-lag as settled.
- 2026-08-18 — Task 1 shipped (engine-sheet, `ee92e5bf`, local/unpushed). Task 2 superseded — real scope 551/940 rows; no manual backfill. Mike-direct: don't hand-edit WealthLevel.
- 2026-08-18 — Initial draft (research-build session). Filed off a live-ledger check triggered by Mike asking whether the WealthLevel top band is appropriate.
