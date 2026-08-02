---
title: Sports Intake Independent Security Review (Opus, Task 9)
created: 2026-08-02
updated: 2026-08-02
type: reference
tags: [sports, engine, security, review, active]
sources:
  - Opus 5 adversarial review of commit ce2a7d11 (S349) — Task 9 of the sports stat/event intake plan
  - docs/plans/2026-08-02-sports-stat-event-intake.md — the plan under review
  - docs/plans/2026-07-30-oakland-sports-workspace.md — underlying workspace security decisions
pointers:
  - "[[../plans/2026-08-02-sports-stat-event-intake]] — Task 9 consumes this verdict"
  - "[[../engine/ROLLOUT_PLAN]] — engine.40 / engine.77 rows"
  - "[[../index]] — registered same commit"
---

# Sports Intake Independent Security Review (Opus, Task 9)

**Subject:** commit `ce2a7d11` — codex engine.40+77 sports stat/event intake.
**Verdict: FIX-BEFORE-DEPLOY.** The source is safe on main — gate genuinely
cold, no write path with the gate off, no token forgery, no confirmation or
capability bypass. But four defects would corrupt canon or brick the writer on
the first approved live proof. Landing was fine; **enabling is not**, until the
fix list below clears.

## Must fix before deployment

1. **Feed header row never validated in the write path (critical on schema
   drift).** Reads are by header name but the append writes 20 values
   positionally into A..T, and read-back compares what-we-wrote to
   what-we-wrote. A column insert/reorder in `Oakland_Sports_Feed` lands every
   subsequent append one column off, read-back green. Every other surface
   enforces exact headers; the feed — the one written on every confirmation —
   doesn't. (`sportsFeedWriter.js:156-158, 306-314, 664, 779-787`)
2. **`updateCells` with `stringValue` silently destroys formulas.** Preview,
   before-match, and read-back all see FORMATTED_VALUE, so a formula cell in
   any allowlisted stat/citizen column is replaced with static text,
   permanently, undetected. Also types every written stat cell as text.
   (`sportsFeedWriter.js:316-328, 627-637, 801-808`)
3. **Any batch-phase error latches the writer into permanent `uncertain`.** A
   quota 429, transient 503, or oversized-cell 400 (no draft field has a
   length cap; effective body cap is express's 100kb default because the
   route-level `64kb` limit never applies — finding 8) is treated as possible
   canon damage: process-wide write-block until restart + token burned +
   audit record demanding review of writes that never happened. Google's
   batchUpdate contract makes a structured 400 provably no-op — the code
   should distinguish. (`sportsFeedWriter.js:497-509, 530-536, 776, 865-886`)
4. **Concurrent engine cycles guarantee a false `uncertain`.** LifeHistory_Log
   / Ripple_Ledger append targets are computed row numbers; any engine append
   or archive-trim during a confirmation shifts them → wrong read-back row →
   permanent latch (finding 3). Also the precondition hashes ALL ~10,500
   LifeHistory_Log rows, so one engine append during the 15-min preview window
   409s every pending preview. Code must make "no proving run during a cycle"
   mandatory, not advisory.

## Resolve before first live proof

5. **Roster↔Ledger name join unsatisfiable when `As_Roster.Middle` is
   populated** — roster builds `First Middle Last`, ledger `First Last`; both
   compared to the same `participant.name`. Latent (MCP roster view shows
   two-part names); check the live sheet before proving.

## Hardening (take opportunistically)

6. **Prototype-chain keys pass the stat-field allowlist** (`constructor`,
   `__proto__` return valid; contained only by an incidental identity check —
   if ever relaxed, the write lands on column A/POPID). One-line
   `hasOwnProperty` fix; roster-event path already does it right.
   (`sportsFeedContract.js:479-485`)
7. **TOCTOU on physical-row binding is unclosable** (no compare-and-set in
   Sheets); read-back catches our citizen but the collateral row is already
   overwritten. Fix the forensics: audit should capture the pre-image of every
   cell it writes.
8. **HTTPS/same-origin are proxy attestations, not controls** — every peer is
   loopback; the real controls are `DASHBOARD_PASS` + capability header. The
   deployment gate must not count same-origin as a defense.
9. Audit file mode 0600 only at creation; directory umask default. Nit.

## Held under attack (verified, not assumed)

Gate-off writes (403 pre-dependency; unconfigured auth → 401 even with all
env vars), token forgery/replay (HMAC timing-safe; server-side idempotency key
inside the token closes the S348 double-append), formula injection (closed by
construction — stringValue never evaluates), unicode homoglyphs (anchored to
sheet content both sides → 422 denial), the duplicate `SO` header (positional
frozen schema + exactly-one-header guard), secret handling (closure-held, five
safe fields exposed, no console leaks, hashed timing-safe compares), and the
negative-path test coverage is genuine (12 distinct rejection cases asserted).

## Changelog

- 2026-08-02 — Filed from the Opus Task 9 review of `ce2a7d11` (S349).
  Verdict FIX-BEFORE-DEPLOY: items 1–4 gate deployment, 5 gates first live
  proof, 6–9 hardening.
