---
title: Future Build Ideas — Economy Depth, Judicial System, AI Autonomy, God-Whisper Seam
created: 2026-09-26
updated: 2026-09-26
type: plan
tags: [engine, civic, research, draft]
sources:
  - Builder-direct 2026-09-26 — pasted architecture proposal, reviewed live against actual repo state (see verdicts below)
  - docs/plans/2026-09-21-care-and-justice-system.md — engine.254, already covers the judicial-system half of this doc
  - docs/plans/2026-08-01-business-lifecycle-generator.md — engine.96, already covers business dynamics (dial-driven, not agentic)
  - docs/plans/BACKLOG.md:447 — Phase 37 Arc State Machines, archived backlog, NOT built
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout; each verdict below has its own row"
  - "[[plans/2026-09-21-care-and-justice-system]] — engine.254, judicial ledger + mental health rulings land there, not here"
  - "[[plans/2026-08-01-business-lifecycle-generator]] — engine.96, existing dial-driven business economy"
  - "[[index]] — add entry in same commit"
---

# Future Build Ideas — 2026-09-26 direction

**Goal:** Capture the builder's 2026-09-26 architecture proposal durably and record a verdict per idea, so nothing is lost and nothing gets built twice. Half of this doc turned out to already be open, ruled work (engine.254) described back at itself; the rest is genuinely new and is filed here at the right gate.

**Terminal:** research-build (filing + design); engine-sheet (execution on `ready` items).

**Note on the source doc's own claims:** two specific claims in the pasted proposal are unverified and must not be treated as fact until checked: "the desk writer already has a bounded tool loop (max 6 calls)" and "an orphaned disposition cache" exists. `scripts/cron-desk-writer.js` exists but the tool-loop claim wasn't confirmed line-by-line; the disposition cache wasn't located. Verify before citing either as true.

---

## Verdicts

### 1. Judicial system → NOT new, already open at engine.254

The proposal's case-state-machine / judges-as-personas / jury-duty ideas overlap almost entirely with `docs/plans/2026-09-21-care-and-justice-system.md` (engine.254), which the builder already ruled 2026-09-21 to build: a condition-driven service layer resolving chaos-car arrests/OARI outcomes into a judicial ledger + mental-health care states. That plan is gated on two open rulings (judicial ledger shape, mental-health care states) — being drafted now, 2026-09-26, with the `engine-wiring` card on `Hospital_Ledger` pulled first per measure-twice.

**What's genuinely new here and folds into engine.254 as a `§Later` section, not a separate row:**
- Judges as authored personas (civic-office pattern — canon philosophy files, not dials) — reasonable once the case state machine exists; no case flow to judge yet.
- Jury duty as a Tier-4→named promotion vehicle (universal-protagonism doctrine: pulling generic citizens into a real case is exactly the kind of thing that earns a name) — good idea, sequenced after the ledger exists.
- Precedent ledger as folk-memory/institutional-memory answer — a real angle on the "folk memory gap," but it's a consequence of the case ledger existing, not a separate build.

**Phase 37 (Arc State Machines)** — the proposal's "your planned arc state machines are the natural chassis for this" is accurate: it's a real, still-unbuilt backlog item (`docs/plans/BACKLOG.md:447`, S139, NOT STARTED, archived out of active ROLLOUT). Referenced here for when a case's multi-cycle arc needs tracking; not proposed as a prerequisite.

**Verdict: fold into engine.254, no new ROLLOUT row.**

### 2. Firm agents (persistent LLM business agents) → needs-info, builder call

`engine.96` (business lifecycle generator) is **deliberately dial/formula-driven**, not agentic: `applyBusinessDynamics.js` reads `World_Config` tunables and drifts `Growth_Rate`/`Annual_Revenue` from live city state, bench-reproducible on a fixed seed (everything-is-earned doctrine, Mike 2026-08-01 — no static numbers, but also no LLM judgment call standing in for a live-state formula). It has two open tasks (8: success-pressure coupling, 9: tests/bench) still in-progress.

Promoting businesses to full LLM strategy agents (hiring/pricing/expansion negotiating each cycle) is not an extension of engine.96 — it's a different architecture: real per-cycle LLM cost (one call per business, every cycle, indefinitely) and a determinism reversal in a system currently built to be bench-provable. Legitimate idea, but it trades away a property (determinism, cheapness) the current design was built to have. Needs a builder ruling on whether that trade is worth it before any design work starts.

**Verdict: `needs-info`, filed as engine.261, owner engine-sheet (sim judgement — builder included).**

### 3. Conservation laws (double-entry money audit) → ready, no sim judgment needed

Nothing like this exists today. Extends the existing `engineAuditor` drift-detection pattern to money specifically: every dollar credited somewhere is debited somewhere, checked automatically each cycle. Pure engineering — ties directly into "no column in Simulation_Ledger is true" and gives engine.193's "economy complete" gate a real instrument instead of a judgment call.

**Verdict: `ready`, filed as engine.262, owner engine-sheet.**

### 4. Credit/default cascades → needs-info, gated

Loans, missed payments, defaults rippling through households/businesses. Legitimate depth, but downstream of engine.193's builder ruling that unemployment "stays as built until the sim economy is complete" — building cascade mechanics on top of an economy still mid-repair is premature. Revisit once engine.193 ships and the economy-complete gate is actually met.

**Verdict: `needs-info`, filed as engine.263, gated on engine.193 completion, owner engine-sheet.**

### 5. Wider AI autonomy (agentic loops for mayor/editor, cross-cycle objectives, proposal rights) → needs-info

Real per-cycle cost multiplier if applied to multiple civic-office/desk roles, and it sits close to civic.38's already-shipped move-based civic wake game loop (Jobs 1-6, LIVE PROD @132) — need to scope against what that already covers before this is additive rather than a second, more expensive mechanism doing adjacent work. Not evaluated in depth here; needs its own scoping pass before a builder ruling is even meaningful.

**Verdict: `needs-info`, filed as governance.52, owner research-build.**

### 6. God-whisper seam (whisper queue, provenance-logged nudges) → needs-info, builder call

Genuinely novel — nothing like it exists in ROLLOUT or the codebase. Not primarily an engineering question: it's the builder deciding how visible his hand should be in-world, with the hard constraint that provenance logging must never leak the builder's real identity to any agent, character, or sim entity (identity.md, non-negotiable). No mechanism should be designed before that sim-level call is made.

**Verdict: `needs-info`, filed as engine.264, owner research-build (sim judgement — builder call: how visible is the builder's hand).**

---

## Changelog

- 2026-09-26 (research-build) — Filed from builder-direct 2026-09-26 proposal. Reviewed against actual repo state: judicial-system half already open at engine.254 (folded, no new row); business-agent proposal checked against engine.96 (dial-driven, not agentic — flagged as a determinism-reversal call, not a slot-in); conservation laws, credit cascades, AI-autonomy widening, and god-whisper seam filed at their real gates. ROLLOUT rows: engine.261 (firm agents), engine.262 (conservation laws), engine.263 (credit cascades), engine.264 (god-whisper), governance.52 (AI autonomy scoping).

## engine.262 inventory — 2026-09-27 (S499, engine-sheet)

Read-only inventory of every engine money movement (file:line evidence in the S499 session record):
- **True double-entry:** casino wagers — citizen `NetWorth` ↔ `Casino_Ledger.HouseFloatAfter`, both written
  every settlement (`casinoLedgerEngine.js`). Checkable per cycle: Σ citizen deltas = −Δ house float.
- **Inequality by design:** engine.259 fund grants — `BudgetRemaining` falls by the full tranche, tracked
  households receive `plan.paid` ≤ tranche ("the untracked city is the rest of the spend"). Check `debit ≥ Σ grants`.
- **Source / sink, no counterparty:** Job 5 initiative spend (sink), Job 6 renewal credit (source), home
  purchase down payment (sink), home sale proceeds (source, market formula), inheritance 10–20% (sink),
  off-camera spouse income (source), citizen income (source — no payroll), business revenue (floating KPI).
- **Gap to check:** inheritance never zeroes the deceased's own `NetWorth` — any citywide NetWorth sum must
  exclude deceased rows or it double-counts.

So "every dollar credited somewhere is debited somewhere" does not hold for this sim by construction: there
is no city treasury, no payroll. The build that makes sense without a ruling is the two real checks
(casino balance, grant inequality) + the deceased-exclusion assertion. **Builder question:** should the city
have a treasury that initiative spend, renewals, and taxes flow through — making the civic economy conserve?

**Casino money fountain — found by this inventory, fixed `0b3e796d` (S499).** Decimal odds include the returned
stake, the stake is only debited on a loss, and a win credited the gross payout — every winner got one stake
from nothing. Live C106–C108: 34 settled wagers, citizens **+$5,224**; settled correctly **−$457** (the designed
1.83 edge). Now wins move payout − stake (NetWorth, household-savings rule, house float, cover guard); the
ledger's Payout cell keeps the gross ticket. Engine + Node twin + tests. Bench SANDBOX 0908 @130 C144: ok, 0 new
errors — no wager can settle on the bench (no sports feed rows past C108), so the settlement math is proven by
the unit tests (incl. a house-edge assertion). **Held for the builder's go before PROD** — winners gain less.
