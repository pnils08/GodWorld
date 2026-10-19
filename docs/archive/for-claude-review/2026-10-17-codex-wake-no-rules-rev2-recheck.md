---
title: Wakes have no rules — Revision 2 recheck
created: 2026-10-17
updated: 2026-10-17
type: reference
tags: [engine, citizens, reference]
sources:
  - docs/for-claude-review/2026-10-17-wake-no-rules-rev2-recheck-TASK.md
  - docs/for-claude-review/2026-10-17-codex-wake-no-rules-plan-review.md
  - docs/plans/2026-09-10-inactivity-is-regression.md
pointers:
  - "[[plans/2026-09-10-inactivity-is-regression]]"
---

# Verdict: HOLD before build

Read-only source review; only this requested artifact written. No tests, cron, model, Sheet, bench, or canon runs; no commit. Dirty concurrent work untouched. Below, **P** means `docs/plans/2026-09-10-inactivity-is-regression.md`. Plan approval is distinct from implemented or live proof.

## 1. Rev 1 Build-gate accounting — FIX / HOLD

- **Inventory/order: mostly closed** by P:502-514 (explicit recent, voiced, lived, posture, forced and data gates). Still open: D1's “prompt needs” neighborhood and “log prints ledger rows vs pool” claims. The prompt can omit unavailable location; current `scripts/citizen-wake.js:301` prints pool size only, and `lib/wakePerception.js:406-420` silently skips bad/missing state/name/hood. Specify rejected-row diagnostics rather than claim them present.
- **Selection-policy interpretation: closed for recent/priority/event weight** by verbatim ruling P:488 and cuts P:505-510. **HOLD** remains explicitly at P:494: four authored voices versus four lottery wakes/day. This review cannot choose that interpretation for the builder.
- **Rate: partly closed** by one Central-night row, P:520-527. “≤7 rows/Cycle” is still false as an unconditional cap: it is ≤one/day, hence ≤7 only for a seven-day interval between drains. P:496's exposure arithmetic also uses the 1,028 pool rather than the final four-Corliss-inclusive pool; label it accordingly.
- **Body provenance: partly closed** by bounded scrub P:518, with limitations honestly stated; overmatching and ordering remain in Hunt 4.
- **Source-night recovery: partly closed** by P:522; sequential same-night retry improves, but concurrency/rollover remain in Hunt 5.
- **Bond/tension and missing Cycle: closed as plan decisions** by P:523-526,528: canonical bond match, empty resolves, no intake on unknown Cycle. Tension is audit-only, not a persistent open-tension register.
- **Acceptance coverage: partly closed** by P:530-532: pure picker, reachability, scrub, UTC boundary and serial upsert are specified. Still missing explicit caller-wiring/lived-spend checks, classifier throw/empty handling, page-failure boundaries, drain/write interleavings, petition excerpt checks and actual ledger-effect assertions. These were requested by the Rev 1 Build gate; naming downstream effects at P:528 is not testing them.

## 2. Draw + SEED — FIX (pure extraction SHIP)

P:514's exported `drawCitizen(pool, seedKey)` can be tested without importing the executable IIFE (`scripts/citizen-wake.js:486`); `lib/wakePerception.js:793` already exports helpers. Test the caller too: pure-helper tests cannot prove removal of the old precedence branches or correct date forwarding.

Within a valid, zero-floor pool, deleting R1/S1–S3 leaves only the specified event weight; D1 still excludes missing/unparseable state/name/hood (`wakePerception.js:406-420`), and forced POPID bypasses the lottery (`citizen-wake.js:166-170`). Other `buildPool` callers retain their own floors; this is a wake-call change, not universal admission. No separate reader of `citizen-wake-state.json` was found; same-named `state.recent` in `cron-work-wake.js:233,321` is its own work-wake selection state, not this rotation state.

**Retry claim needs qualification:** same seed yields the same pick only with identical ordered pool and weights (`citizen-wake.js:204-213`; `wakePerception.js:403-434`). A ledger/event change between retries can change the selected person. Persist the selection if retry identity is required, or state the fixed-input limit. Different dates need different seeds, not guaranteed different citizens. Slot is also consumed for rendering/spending/readback verification (`citizen-wake.js:307,473-483`), not just logging (`:381`).

## 3. Lived event perception — FIX

P:516's direction is coherent, but existing `pickLived` is not reusable unchanged: it picks a person globally, caps at seven, enforces age, and suppresses household births (`lib/wakePerception.js:761-777`). Specify a post-draw lookup restricted to the drawn POPID, unspent event IDs, deterministic event choice and recipient relation; clarify current-only versus existing current/previous-Cycle window (`:655,670`; P:516 says “this Cycle”). Forced selections should receive the same perception lookup.

Remove the `slot === 'lived'` guards at `scripts/citizen-wake.js:307,473,482`; otherwise rotation never renders or spends an attached event. Keep `livedSpent` and its expiry/save/readback; `livedCount` becomes dead state. `include` is no longer needed for admission at zero floors; its extra `birthYear/householdIdRaw` fields (`wakePerception.js:450`) are only necessary if retained event matching uses them. Define any household-dedup policy explicitly rather than inherit it through `pickLived`.

**Consumers SHIP at source level:** `dumpBeatTabs.js:102-112,215-220` derives events independently through `livedEventsFrom`; `buildLivesSlice.js:30,106,163` reads that dump, not picker slot/state. Preserve this shared event producer and its window. Losing guaranteed priority reduces voice coverage as P:516 acknowledges. Page-write → local spent-state remains a crash window (`citizen-wake.js:404-408,473-483`), so “once per event” is not crash-safe exactly-once proof.

## 4. M1 scrub — FIX

The three quoted forms at P:518 are covered by Moltbook, unqualified agent, and denylist respectively. Free-agent canon is concrete (`editions/cycle_pulse_edition_101.txt:35,278`); whitelist tests must include case/plural/hyphen variants. A bare occupational reference such as “my agent called” is a **synthetic non-canon counterexample**: the proposed rule deletes it even when the referent is an in-world job. Require infrastructure context for ambiguous agent uses, or explicitly accept that loss; the compound whitelist cannot disambiguate ordinary follow-up references.

Scrub the full body **before** `loadOwnPageReadback` truncates it at 320 chars (`lib/wakePerception.js:283-295`), then score/drop empty candidates. Otherwise a leak keyword beyond the cutoff leaves its sentence prefix behind, or headers consume all usable memory. Hook-string equality alone does not test behavior: `.claude/hooks/canon-leak-guard.sh:14-18,28` uses case-sensitive PCRE, including Mike Paulson's exception; preserve/test flags, sentence segmentation and exception semantics. The task references five live sentences but P:518 quotes only three fragments; all five are not independently evidenced here.

**Named paths covered:** exchange (`scripts/citizen-exchange.js:103-120`), citizenVoice (`scripts/citizenVoice.js:128`) and work wake (`scripts/cron-work-wake.js:264`) use `loadOwnPageReadback`. **Not a global choke point:** `lib/personaProvider.js:276-287` recalls page bodies directly; `scripts/discord-reflection.js:354-363` recursively recalls raw NIGHTLY bodies; `scripts/cron-desk-writer.js:685-696` directly reads recent/search page text. These prove bypasses, not that every bypass currently selects Mags or forwards her page to another citizen. Scope the guarantee to the named callers; a repository-wide boundary needs those consumers audited separately.

## 5. M2 upsert — FIX (drain compatibility SHIP)

The timezone intent is correct: use `America/Chicago` for both row timestamp and target date (`lib/mags.js:326-327`); 00:00Z at CDT is the prior Central day. Capture one source-night key for the whole operation. P:522's “today” cannot recover yesterday's uncertain append after Central midnight without the original key. Also, the page is keyed by **Cycle + daypart + date**, not date alone (`lib/citizenPage.js:64-66`): same-date Cycle changes create multiple page docs, and null Cycle removes customId. Correct P:521's one-page-per-night claim.

For a successful append followed by a same-night crash, a fresh successful scan can find the row; sequential unapplied overwrite/applied skip is sound. **High: scan then write is not atomic.** Two writers can both see absent and append (`lib/sheets.js:210-218`). An updater can read `no`, the engine drain can apply it, then `updateRange` can replace A–K including G=`no`, enabling a second application. Or the engine snapshots the morning row, the updater installs evening text, and the drain marks that row yes after consuming morning text: evening is silently lost (`utilities/compressLifeHistory.js:294-311,665-669`; `lib/sheets.js:248-257`). This is an added mutable-row race, distinct from the accepted ledger/applied-write non-atomicity at `compressLifeHistory.js:658-663`.

Specify serialization with the drain or a versioned claim/reconciliation protocol, retained source-night identity, fail-closed handling of read errors/malformed applied values/duplicate matches, and interleaving acceptance cases. A pure planner alone cannot establish these I/O guarantees. Later scrub-empty/classification-empty runs also need an explicit policy for the earlier unapplied row: P:524 currently leaves it intact, so “intake follows latest page” is conditional.

**Resolves/tension SHIP:** empty resolves avoids interpreting a classifier index as maneuver prose (`compressLifeHistory.js:675-678`); J is audit-only (`:310`). A tension-only result with no event/affect should produce no row: the drain skips it (`:300-302`). Preserve classifier-exception isolation so a failed classifier does not prevent the page write (`scripts/citizen-wake.js:396-408`).

**Final gate:** HOLD pending P:494's explicit ruling ambiguity and the FIX items above. No implementation, deployment or live persistence approval is implied.
