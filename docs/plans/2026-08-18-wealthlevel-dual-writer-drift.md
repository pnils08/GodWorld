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

- **Status:** SUPERSEDED (engine-sheet, 2026-08-18, commit `ee92e5bf`). Original scope (17 rows) was wrong on two counts: (1) full-ledger check found 551/940 WealthLevel rows match the stale v14.2 formula, not 17 — the 23-at-WL=10 sample was a slice, not the scope; (2) root cause isn't `applyEconomicProfiles.js` re-corrupting rows, it's deploy lag — v15 shipped in git `eda94abd` (2026-08-09) but didn't reach the live Apps Script deployment until S378's `2ee0f19b` (2026-08-17 17:56). C103's own cycle ran 2026-08-11/12, before that deploy, on the old formula. The only engine fires since the live deploy are the two C104 crash attempts, both 0/28 intents persisted. **v15 has never once run against the live ledger.** A hand backfill of any row count would be re-run wholesale (and differently) by the first cycle that actually completes — do not manually edit WealthLevel. The real fix is Task 1 (already shipped) plus a cycle successfully completing; nothing else is needed.

---

## Open questions

- [ ] Separate from the dual-writer bug: even under the corrected v15 formula, band 10 itself spans $50M to $10B+ uncapped — a retired athlete and an actual billionaire share the top bucket. Mike flagged this as a real open design question, not yet ruled on: does the scale need a band above 10, or is "10 = ultra-wealthy, undifferentiated" acceptable given how few citizens ever reach it (6 of 862 with NetWorth set, pre-fix)? Not blocking Task 1/2 — those fix a real bug regardless of where this lands.

---

## Changelog

- 2026-08-18 — Task 1 shipped (engine-sheet, `ee92e5bf`, local/unpushed). Task 2 superseded — real scope 551/940 rows, root cause is deploy lag not re-corruption; no manual backfill, fix rides the next completed cycle. Mike-direct: don't hand-edit WealthLevel.
- 2026-08-18 — Initial draft (research-build session). Filed off a live-ledger check triggered by Mike asking whether the WealthLevel top band is appropriate.
