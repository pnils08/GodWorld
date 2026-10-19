---
title: Wakes have no rules — Revision 3 mechanics recheck
created: 2026-10-17
updated: 2026-10-17
type: reference
tags: [engine, citizens, reference]
sources:
  - docs/for-claude-review/2026-10-17-wake-no-rules-rev3-recheck-TASK.md
  - docs/for-claude-review/2026-10-17-codex-wake-no-rules-rev2-recheck.md
  - docs/plans/2026-09-10-inactivity-is-regression.md
pointers:
  - "[[plans/2026-09-10-inactivity-is-regression]]"
---

# Verdict: FIX before build — mechanics only

**P** = `docs/plans/2026-09-10-inactivity-is-regression.md`. Source review plus read-only schedule/timezone inspection; no tests, cron execution, model, Sheet, bench or canon runs. Only this file written; no commit. The two builder readings at P:494 are explicitly outside this gate. SHIP below means the proposed mechanism is adequate, not implemented or live-proven.

## 1. Rev 2 FIX accounting — FIX, substantially closed

- **Inventory/diagnostics, rate/exposure, picker/seed: CLOSED as plan.** P:511 replaces the false existing-log claim with reason counts and labels D1 a data precondition; P:496 labels the 1,028-person exposure denominator; P:528 qualifies seven rows by seven days. P:510 states fixed-pool determinism, and P:514 extracts forced selection plus the whole lottery and seed builder. No distinct-pick guarantee is required across dates.
- **Lived lookup, window, forced route, dead state, slot guards: CLOSED as plan** by P:503,508,516. The accepted page-to-state crash window is now explicit; see Hunt 4 for migration and stability limits.
- **M1 full-body-before-truncation, five sentences, hook flags/exceptions and bare-job loss: CLOSED as plan** by P:518-521,533. Named direct helper consumers now receive the scrub; the broader metadata-less scope and API result shapes still need precision (Hunt 3).
- **M2 mutable-row/drain race, page-key claim, rate, missing Cycle, classifier isolation, tension/resolves, empty-later-run policy: CLOSED as plan** by P:523-530. Write-once deliberately keeps the first eligible evening row; it no longer promises to follow later page edits. **Source-night/concurrent-append recovery remains OPEN** at P:525 (Hunt 2).
- **Acceptance: PARTLY CLOSED** by P:533-534: forced/pure picker, per-recipient spend, actual scrub cases, classifier failure and petition readback are named. Still add caller-level tests that attach the matching relation/event, spend only after successful page persistence, and verify the composite key on readback; pure helpers alone do not check those calls. Add overlapping-writer and midnight-crossing cases. `nudgesForReflection_` nonzero output is mapping evidence, not persistence proof; P:534 only checks the applied flag, so actual DialState/bond effects remain unverified until separately measured. No new live execution is requested here.

## 2. M2 write-once — FIX; drain interaction and normal evening selection SHIP

**Closed race:** an immutable appended row is either included in the drain snapshot or waits for the next drain; later runs cannot reset G or replace the body under a queued applied mark (`utilities/compressLifeHistory.js:294-311,665-669`). The previously accepted ledger-versus-applied non-atomicity remains (`:658-663`); do not reopen it as a new defect.

**High, duplicate path still open:** two invocations can both scan no match and then append. `lib/sheets.js:210-218` is an unconditional append, not an atomic insert-if-absent. A later duplicate scan fails closed only after both rows exist, and the drain processes both. Live user crontab lines 15-17 have three separate invocations and no `flock`; the script has no lock. Specify exclusive nightly intake writer ownership over scan through append, with reconciliation of an uncertain append before another append attempt. Add a two-writer acceptance case; a planner unit test cannot establish exclusion.

**Date identity gap:** P:525 captures the source date but P:527 leaves `ts` unspecified. If work starts before Central midnight and appends after it with the then-current timestamp, the scan cannot recover the captured source-night identity from column A. Bind A to the captured source instant (and retain that identity for replay), or persist a separate source key. A fresh next-day rerun cannot recover yesterday merely by capturing its own new start date. Same-night successful-append/crash recovery works only when the row is visible and the same key is used.

**Evening test:** inspected live schedule is 07:00 / 12:00 / 19:00, without CRON_TZ/TZ overrides; `/etc/timezone:1` is `America/Chicago` (also documented at `docs/OPERATIONS.md:52`). Thus Central hour ≥18 admits the normal 19:00 run and excludes the other two. Compute hour and date from the same captured instant with explicit `America/Chicago` and 0–23 hour semantics; `lib/mags.js:326-327` provides only the date. This predicate also admits manual 18:00–23:59 runs and cannot identify a delayed morning invocation. It is a time window, not invocation identity or a mutex.

**Lost-row limits:** P:526's isolated failure lets later saves and the Moltbook cursor advance (`scripts/discord-reflection.js:527-531`) after a failed intake append. A Moltbook-only retry can then exit for no new conversations (`:445-452`); next morning/noon intentionally append nothing. Page-write success alone therefore does not guarantee eventual intake. Define whether these are accepted missed nights or require a retained pending row/key. Read-error/malformed/duplicate skips are safe against speculative append, but likewise sacrifice delivery. The “evening covers the day” claim covers Discord, not already-consumed Moltbook interactions.

## 3. M1 page-read boundary — FIX scope/shape; named recall coverage SHIP

P:519 covers the previously named direct readers, including `lib/personaProvider.js:276-287` and `scripts/cron-desk-writer.js:685-696`, and precedes the cap at `lib/wakePerception.js:285`. The sole raw opt-out for `discord-reflection.js:354-363` is a deliberate recursive journal input; M2 still scrubs its resulting body separately.

**Not every page reader uses these functions:** `scripts/scanCitizenPages.js:96-101` GETs raw documents directly; Lives and Voices read its disk mirror (`scripts/buildLivesSlice.js:93-100`; `scripts/buildVoicesSlice.js:51`). This is not a demonstrated NIGHTLY leak: scanner admission rejects NIGHTLY/date-suffixed customIds (`scanCitizenPages.js:51-55,64-72`). Narrow P:519's universal claim and preserve that exclusion; no scanner rewrite is needed for this cut.

**Non-Mags effects are real by specification:** metadata-less results for any citizen are scrubbed, so an ordinary citizen's bare occupational “agent” sentence can disappear too. P:520 accepts that loss only “in her journal.” Decide explicitly whether fallback scrubbing is restricted to POP-00005 or whether the broader loss is accepted; test a metadata-less non-Mags job sentence. Define absent metadata versus metadata present but missing daypart; the latter currently arrives via `citizenPage.js:155` and is otherwise an unclassified gap. Known other dayparts should retain the stated byte-identical behavior.

**Search-shape requirement:** `readPage_` returns API results unchanged (`lib/citizenPage.js:114-116`), while the writer consumes `d.content || d.chunk` (`scripts/cron-desk-writer.js:696`). Scrub every exposed text carrier or normalize to one scrubbed carrier and remove raw fallbacks; scrubbing only `content` leaves `chunk` usable. Add fixtures for content, chunk, absent metadata and empty-after-scrub results. Keep string equality plus semantic tests for the hook patterns as P:533 specifies; no executable scrub exists yet to certify those tests pass.

## 4. L per-recipient spend — SHIP as plan, with explicit limits

P:516 correctly matches the drawn recipient after either route, gives one deterministic unspent event, and preserves the current/previous-Cycle source window (`lib/wakePerception.js:670`). Store/check/verify the same `eventId:POPID` key, with the matched recipient's `rel` (`:712-730,738`), at all three call sites named by P:516; replacing only the slot condition is insufficient if `:476,482` still use bare IDs. Keep spend values as Cycle numbers for existing expiry (`scripts/citizen-wake.js:478`).

Bare-key compatibility intentionally means previously unvoiced recipients of an already-spent death event will **never** receive that event; this is the conservative migration rule specified, not an accidental new gate. At three-Cycle receipt expiry the unchanged event window has already closed, so ordinary expiry does not re-render it. An undrawn citizen or an older queued event displaced by newer events can also miss the window: no delivery guarantee exists under the lottery.

Double-render remains possible after page persistence but before local state save, concurrent stale-state writes, or state loss (`citizen-wake.js:82-83,473-483`). Event IDs with `#n` are encounter-order identities (`wakePerception.js:668-685`), so reorder/removal of same-kind source rows can reassign a receipt and suppress one event while repeating another. These are inherited source/state limitations, not fixed by a recipient suffix; do not claim exactly-once. With stable event IDs and serialized successful state writes, the new recipient-key mechanism itself adds no duplicate-render path. The independent dump/Lives producer remains untouched as P:516 requires.

**Final gate: FIX** the M2 concurrent-append/source-night contract and M1 metadata/result-shape scope, with the focused caller tests above. Builder readings are not gating this mechanics review. No deployment or live proof is implied.
