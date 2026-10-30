---
title: Owed responses — a listed event hitting a named citizen reserves that citizen a wake
created: 2026-10-29
updated: 2026-10-29
type: plan
tags: [media, citizens, wakes, draft]
sources:
  - output/cron-compare/culture_c113_tamsin-pruitt_packet-v2_angle.json (C113 Lives slice — 4 mood lines, 0 milestone events)
  - output/world_summary_c113.md ## Chaos Events (4 chaos cars named citizens)
  - lib/wakePerception.js:847 (wake draw weight 1 + 2·eventMag) · utilities/citizenDialMap.js nudgesForEvent_
  - scripts/citizen-wake.js:200 (voiceOnce — deepseek-v4-flash, reasoning off, 260 tokens, no tools; 3 wakes/day)
  - scripts/buildLivesSlice.js (LIFE_TAGS — stance lines no longer lead, 253cdde4)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.93"
  - "[[2026-10-11-media-extension]] — pipeline.73, the slice layer this feeds"
---

# Owed responses

**Problem (builder 2026-10-29).** Tamsin (Lives) covers citizens living events; other desks cover the event with a quote. A citizen the event hit often has no recorded response, so the Lives slice has nothing true to carry. C113: 4 chaos cars hit named citizens (train signal failure, medical hold on board, parking ticket, mail delivery); each left one line (Friction/Setback tag) and no wake. 0 of 4 woke. Wake draw is weight 1 + 2·eventMag over 1,039 citizens at 3 wakes/day: Friction ×5, Setback ×11 against ×1 — a better chance, still a small one.

**Direction (builder, 2026-10-29).** Events we want canon depth on record a response: chaos cars, casino or UNDOCKED win over a stake, a hospital stay of N cycles, a citizen in the judicial system for an offense type.

## Design (not built)

1. A listed event hitting a named citizen marks them *owed* a wake.
2. Each cycle reserves R wakes for owed citizens, most severe first; the rest stay the normal weighted draw.
3. An owed mark lapses after M cycles unreached.

## Builder's rulings (2026-10-29)

Thresholds, from measured rates (chaos: 11 cycles of world_summary; casino: 164 settled wagers C107–C113; hospital: 3 stays; court ledger empty):

| Event | Owes a response | Expected / cycle |
|---|---|---|
| Chaos car | the engine's `severity: 'high'` citizen outcomes (arrested, medical_emergency, workplace_accident, substance_intervention, deescalated, mail_theft_reported) | ~0.7 |
| Casino / UNDOCKED | wager over 1,000, or winnings over 500 (builder, second pass: not a 500 stake) | ~0.5 (3 wagers ≥1,000 and 2 net wins ≥500 in C107–C113) |
| Hospital stay | any admission | ~0.4 |
| Court case | any detention, any offense | ~0.2 |

- **Reserved wakes R = 6** a cycle (builder raised it from 3; agreed), most severe first. At ~2 owed a cycle on these bars, R=6 is headroom plus room for absorbed tickets.
- **Expiry M = 2 cycles.**
- **Absorption (builder):** a cycle where no high-severity event fired lets the low-severity citizen-hit chaos events (tickets, warnings, delays) take the reserved wakes, severity then recency. Read as: zero severe events → low ones absorbed (builder: "how you set it is fine"). Leftover-slots-every-cycle would be a one-line change.
- Casino volume tripled C107→C113 (12→40 settled); revisit the 1,000 wager bar in ~5 cycles. The engine rates a train held for a medical emergency low; it is not in the high class.

Build not started. Wake selection is `lib/` (engine substrate): bench proof, review, PROD.

## What the citizen is shown (builder, 2026-10-29)

Owed changes who wakes, never what the citizen is told. No line says "you owe a response." The event or the draw wakes them; they see their own life, the city and the events, and speak freely, which makes them interviewable. They may not reflect on the event; that is theirs to decide. Guardrails and commands shape the LLM call; the citizen gets it as their life. The dials give the voice a structured personality and must move with events and wakes.

Read against the code (2026-10-29): `buildVoicePrompts` (`scripts/citizen-wake.js:146`) already shows only life — LifeHistory tail, arc, lived line, health, family, bonds, paper, hood texture — and the user turn is a provocation latched to a real signal. Temperament + trajectory come from DialState (`dials.disposition(c.cur)`); the TraitProfile column is read only for journalist matching (`lib/wakePerception.js:444`), not in the wake prompt. Dial loop exists: LifeHistory tag → `nudgesForEvent_` at the cycle; wake affect → Reflection_Intake (applied=no) → `nudgesForReflection_` at the next cycle. Build check: each owed class (chaos, casino, hospital, court) must reach the owed citizen's perception, or the wake has nothing to reflect on.

## Build (2026-10-29, research-build)

Derived each wake from the record that proves the event; the state file holds receipts only.

| Piece | Where | What |
|---|---|---|
| Owed list | `lib/wakePerception.js` `owedFrom` | Chaos_Cars `TargetScope=citizen`, severity read from `utilities/chaosCarsConfig.js` by vehicle+outcome (derived set = the ruled six; test pins it); Casino_Ledger settled-win/loss with `Stake > 1000` or `Payout − Stake > 500` (void-gate, void-house, open never owe — nothing settled); Hospital_Ledger `AdmitCycle`; Judicial_Ledger `ArrestCycle` (a civil case with no arrest never owes). Window: the event's Cycle and the next (`OWED_WINDOW = 2`) |
| Tiers | `owedCandidates` | Tier 1 = the ruled classes. Tier 2 = low chaos citizen hits, eligible only from a Cycle in which no tier 1 fired (absorption per Cycle). Order: tier, the citizen's own `eventMag` (the engine's dial-nudge magnitude — no hand severity table), newest, id. One place per citizen; an owed citizen outside the wake pool is logged, never dropped silently |
| Draw | `selectWakeCitizen` | forced → owed (while `owedWakes[cycle] < R`) → the weighted lottery |
| What the citizen sees | `lifeTailOf` + `citizen-wake.js` | The event's own LifeHistory line (stamp + exact chaos text, or the casino/arrest line) is pinned in the five-line life block. No new words, no instruction. Hospital rides the existing lived line. No pin = the old block (1,053/1,053 live rows identical) |
| Spend | `recordOwedSpend` | After the landed page write: each of the woken citizen's window events is receipted (any slot); an `owed` slot counts one reserved wake. Receipts age out with the window |
| Gate | `OWED_RESERVE = 0` | The crons run this working tree, so R is held at 0 until codex review passes; `--owed-reserve=N` is the replay override. PROD = `OWED_RESERVE = 6` + its test line |

**Bench (C113 live, read-only, 2026-10-29):** 6 owed — tier 1 from C112: POP-00121 (mail theft), POP-00646 (UNDOCKED win, net 733); tier 2 absorbed from C113 (no severe event fired): POP-00494 (parking ticket), POP-01160, POP-00518 (train delays), POP-00787 (document delivered). Every event line found and in the block. Full `--dry-run --owed-reserve=6`: slot `owed`, POP-00121, the theft line in perception, no instruction; he reflected on two friends, not the theft (the rule working). Unit: Test O in `lib/wakePerception.test.js`, 30 asserts. Not proven until a live fire: marks forming at C114 and lapsing at C116.

**Codex HOLD fold (review `docs/for-claude-review/2026-10-29-codex-pipeline93-owed-diff-review.md`, all six verified against the code):** F1 a hospital mark is shown only by its own admission as the lived line (`livedFor` prefer); F2 casino pins split by settled status, so a win never stands in for a loss (two same-status slips in one Cycle write one identical line — the record cannot tell them apart); F3 a Judicial `SourceSystem=reconcile` row is bookkeeping, skipped out loud; F4 + all kinds: only events whose evidence is in the final perception are receipted (`owedShown`), the rest stay owed, and an event with nothing in the record to show is never reserved (`unshowable`, logged); F5 one read per tab (`allSettled`), a failed tab or missing column is logged by name and the others still owe; F6 receipts aged on every owed-on wake, and read back after `saveState` (`OWED STATE NOT SAVED` on a miss, as the lived spend). Remaining limits: a tab failing every wake for two Cycles loses its marks (logged each wake); a state write that fails is loud, not retried.

Known, not this build: `--dry-run` appends to `logs/citizen-wake-offered.jsonl` (keyed `pop|cycle|daypart`; replay used `evening`, which no cron runs).

## Measured volume (C113)

4 chaos cars on citizens, 2 casino losses, 0 open hospital stays (3 rows, all discharged), 0 judicial rows → ~6–8 owed per cycle against ~21 wakes.

## Cost note

A wake is one call: deepseek-v4-flash-0731 via OpenRouter, reasoning off, 260 max tokens, no tools. OpenRouter has no batch tier; the Anthropic Batch API (50%) covers Claude models only. Batching these wakes saves little and adds a wait; not pursued. Desk writers on Claude models are where batch cost is worth measuring (separate question).

## Other desks (survey, read 2026-10-29)

Chaos Events read by: CivicOffice, CivicDomain, Jax, Transit. Hospital_Ledger: Health, Neighborhood, Lives. Judicial_Ledger: CivicDomain, Neighborhood, Safety. Casino_Ledger: Economic, Lives. Citizen pages/reflections: CivicOffice, Lives, Pulse, PSlayer, Voices. Lives reads no chaos events. Each desk that covers an event gains a recorded response once this lands; which desks carry it is a per-slice call after the build.

## Process

Wake selection is `lib/` — engine substrate: bench proof on the candidate, review, then PROD. Row opened on the builder's word 2026-10-29.

## Changelog

- 2026-10-29 (research-build) — Codex HOLD (6 findings) folded: shown-only receipts, admission-preferred lived line, status-split casino pins, reconcile rows skipped, per-tab reads, ageing + read-back. C113 replay unchanged (6 owed, all shown). Re-review sent.
- 2026-10-29 (research-build) — Built (§Build): owed list, per-Cycle absorption, owed slot, pinned event line, receipts; reserve held at 0 pending codex review. C113 live replay: 6 owed, all lines in perception.
- 2026-10-29 (research-build) — Builder: owed picks who wakes, the citizen is never told it owes a response (§What the citizen is shown). Proof plan: overnight dry replay of the owed draw on C113 hits, no writes; mark formation/expiry across cycles waits for the C114 fire.
- 2026-10-29 (research-build) — Builder ruled thresholds (casino: wager over 1,000, winnings over 500), R=6, M=2, absorption as set; row ready, build not started.
- 2026-10-29 (research-build) — Plan opened from the Tamsin C113 flag (stance lines quoted as speech; slice fed moods on a thin day). Slice side shipped same day: 7c5f390a, b26a4184, cf0e995f, bd1f0c28, 253cdde4.
