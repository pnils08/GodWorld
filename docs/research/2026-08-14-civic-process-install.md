---
title: Civic process install — one research, three later plans — research
created: 2026-08-14
updated: 2026-08-15
type: reference
tags: [research, civic, architecture, active]
sources:
  - Mike-direct 2026-08-14 — crons are the world Sun–Thu; Sunday city-hall writes Initiative_Tracker; Mon–Thu is living reaction + district heat with constituents; decide / don't decide / whisper affects them and is not always a win; election/chair-change parked; one research not three bouncing plans
  - docs/research/2026-07-28-civic-cron-city-hall.md — civic.15 cron/city-hall
  - docs/plans/2026-07-28-civic-cron-city-hall.md — Sunday chain + Mon–Thu datawake already built, --apply still dry
  - docs/mara-vance/INITIATIVE_TRACKER_CONTRACT.md — tracker write contract
  - docs/research/2026-08-14-civic-seat-change-election.md — parked replacement valve
  - docs/plans/2026-07-31-per-hood-political-consequence.md — engine.93 hood fold
  - docs/research/2026-08-08-journalist-heat-slice-architecture.md — pack shape only; newsroom civic desks are not civic offices
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — civic.15 is the live install row; seat-change has no row yet (parked)"
  - "[[index]] — registered same change"
  - "[[../index]] — catalog pointer same change"
  - "[[2026-07-28-civic-cron-city-hall]] — existing cron research"
  - "[[2026-08-14-civic-seat-change-election]] — parked"
  - "[[../plans/2026-07-28-civic-cron-city-hall]] — civic.15 plan"
  - "[[../mara-vance/INITIATIVE_TRACKER_CONTRACT]] — tracker schema"
---

# Civic process install — one research, three later plans

**Source:** Internal-design. Mike 2026-08-14. This file is the umbrella. civic.15 already built the Sunday chain and a Mon–Thu datawake. This records what those days are *for*, what consequence means, and what stays parked. It is not a plan.

**What this addresses:** We started three separate conversations (Sunday tracker write, Mon–Thu living/heat, replacement/election) as if they were different products. They are one civic process. The offices are workers. Their week is the install.

**What they are:** Not a civic soap. They get a question, they decide or they don't, the world is supposed to move because *they* chose. Initiative_Tracker is build-or-reject, not daytime drama. Replacement is a rare fire button when a worker is broken. Retirement is the likelier exit.

**Cadence (locked beats):**

| Day | Job | Already on disk | Gap |
|---|---|---|---|
| **Sunday** | City-hall packets. Decide. Arrive already layered with the week. Write Initiative_Tracker when stamped. | civic.15 chain. `--apply` still off. | Pack + wiki week not injected into Sunday yet (civic.17 Task 5). |
| **Mon–Thu** | District packages. Live with last decisions and the people in the turf. Each wake reads/writes the office wiki so thought carries. | Datawake + civic.16 wall already save/inject lines. | District pack (people + projects + limits) not built yet (civic.17 Tasks 2–4). |
| **Fri–Sat** | They are citizens. Life wakes, not office work. | Guard already skips datawake. | Leave it. |
| **Later / rare** | Chair change if continued failure. | November `Election_Log` seater. Unsaved approval leftover. | **Parked.** See [[2026-08-14-civic-seat-change-election]]. |

**Consequence (locked beat):** What they decide, what they refuse, and what they only whisper about all feed back onto them. A decision is not automatically a win. If it does not help that district, it can hurt the hood and the office. That is why a bad stretch can eventually reach replacement — not because we want an election show.

**What exists vs that beat (facts only, no fix in this file):**

- Initiative work can already fold into more hood fields (traffic, retail, nightlife, parks, sentiment) in Phase 2. That is the "did the choice help" pipe for *projects*.
- Approval score writes a tiny sentiment/engagement nudge for the district, but Phase 5 writes it after Phase 2 already folded and cleared the bag. Live cycles miss it. Dose is small. Not "every element of the neighborhood."
- Civic Sunday can still fail to land on the tracker if `--apply` stays off.

**Extraction — three later plans, one parent:**

Do not start three unrelated plans. When we leave research, each plan cites this file and only one slice:

1. **Sunday ingest** — city-hall decisions become Initiative_Tracker rows under the existing contract. civic.15 close: dry Sundays done, `--apply` flip, fail-closed gate. This is the world-moving switch.
2. **Mon–Thu living + district heat** — office sees constituent impact and a heat slice of their district. Not a second newsroom. Reuse heat-slice *shape* from [[2026-08-08-journalist-heat-slice-architecture]], pointed at the office's people, not a byline.
3. **Consequence** — decide / don't / whisper changes the office and the hood, and is allowed to go badly. Includes the missed approval→hood bag if we ever touch that engine. Replacement stays out until this and (1) are real.

**Parked (do not plan now):**

- Election / campaign / challenger fill / voice-file for a new chair. Recorded in [[2026-08-14-civic-seat-change-election]]. Catalogued. No engine.

**Not applicable / hazard:**

- Do not grow civic coverage so the paper "cares who they are." The paper may report a chair flip if it happens. That is not the product.
- Do not treat datawake-as-media-source as done for beat 2. Same cron stage, different job.
- Do not move `applyCityDynamics_` after Phase 5. Load-bearing.
- Do not land the unsaved fire-the-mayor leftover.
- Three plans later, one at a time, each proposed before any code.

**Verdict:** `adopt`

Umbrella for the civic process install. civic.15 remains the Sunday/datawake implementation plan. New child plans wait for a propose-then-build gate. Seat-change stays parked.

**Ignited plans:** [[../plans/2026-07-28-civic-cron-city-hall]] (civic.15). [[../plans/2026-08-15-civic-office-lived-packets]] (civic.17 — office packs).

---

## Applications (living)

- 2026-08-14 — filed as the parent for Sunday ingest / Mon–Thu living / consequence. Election parked under it.
- 2026-08-15 — Heat-slice checklist civic (pipeline.52 Task 6) is **reporters** (Carmen, Luis, Trevor, Lila, Noah, Angela). `buildCivicDomainSlice.js` is disk-only (`desk_signal` + leftover datawakes); **never queries Sheets**. Civic *offices* still get datawake `domainSlice`: world_summary hood lines + a few INIT ids. No Civic_Office_Ledger, no constituent rows, no ADR-0017 Packet. Codex left office adoption until after the newsroom proof. That proof shipped; office pack did not.
- 2026-08-16 — Sunday invite/hearing findings: [[2026-08-16-sunday-city-hall-invite]]. civic.17 week block is on the packet; cascade shape unchanged.

---

## Changelog

- 2026-08-15 (grok) — Civic ADR-0017 is the real work. Heat-slice Task 6 ≠ office pack. Sheets not parsed for what offices should get.
- 2026-08-14 (grok) — Initial extraction. Mike cadence + consequence + park election. No plan ignited.
