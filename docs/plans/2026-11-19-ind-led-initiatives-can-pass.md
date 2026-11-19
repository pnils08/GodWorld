---
title: IND-led initiatives can pass Plan
created: 2026-11-19
updated: 2026-11-19
type: plan
tags: [civic, engine, active]
sources:
  - phase05-citizens/civicInitiativeEngine.js (resolveCouncilVote_)
  - scripts/civicInitiativeVote.test.js
  - Google Doc "Initiative_Tracker restore plan (C114 vs C116)" (read 2026-11-19; its cell list is the next step)
pointers:
  - "[[2026-09-24-initiatives-in-the-world]] — the civic.38 tracker this vote sits in"
  - "[[2026-11-04-engine-330-sandbox-generic-feeds]] — the bench feeds a bench fire needs"
---

# IND-led initiatives can pass Plan

**Builder's words (2026-11-19):** "agree on this , go" — to: hold the restored votes until the vote fix ships; void INIT-014's C116 vote as an invalid roll call; the seats that are neither lead nor opposition vote by mood and need when the independents lead.

**Goal:** an initiative led by the independents can pass or fail by a council vote that counts each of the nine seats once, so the tracker is repaired by votes and not by hand.

**Rows:** none claimed (builder 2026-11-19: no ROLLOUT row for this) · **Owner:** engine-sheet

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | `resolveCouncilVote_`: an IND member the lead or opposition block already counted is not rolled again as a swing voter; OPP/CRC seats that are neither lead nor opposition vote at the unnamed-IND probability (mood + need), rolled after the IND loop. Tests `scripts/civicInitiativeVote.test.js` (11) | es | built, unbenched |
| 2 | Parity proof, old code vs new, same dice: OPP-led (CRC opposition, named swing), OPP-led blank opposition, school board — identical in 18,000 runs; IND-led blank opposition: 0 of 4,000 pass → 712 / 1,245 / 1,893 of 4,000 at mood −0.6 / 0 / +0.6 | es | done (scratch run, this session) |
| 3 | Bench: SANDBOX 1004 on live-synced C116 state, a bench-only IND-led proposed row with a VoteCycle, fire C117, read the roll call (nine seats once, OPP seats voted) and the other rows unchanged | es | waiting on the shared sandbox |
| 4 | PROD `clasp push` with the smoke-test note | es | after 3 |
| 5 | Tracker restore of INIT-003/006/007?/008–014 to the C114 natural path (the Google Doc's cell list), written through the sheet library, each row read back; INIT-008 and 009 restored with VoteCycle blank until Task 4 is live; INIT-014's C116 vote voided | es | choices B, C, D not yet ruled |

## Acceptance

1. A bench vote on an IND-led row prints a roll call of nine seats, each once — proven by the bench fire's Notes cell.
2. A bench vote on an OPP-led row is the vote it was — proven by the parity run (done) and an unchanged INIT-001/002/005/006 on the bench.
3. After the restore, no tracker row carries a hand-written Outcome — proven by a read of the sheet against the doc.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| Restore plan (Google Doc) | other lane | the doc, read 2026-11-19 | facts verified against the live tracker, the Nov 1 snapshot and the code |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | An IND-led initiative can never pass today: both IND seats counted yes by faction, rolled again as swing voters, the 4 OPP seats never vote — 4 yes at most against 5 | es · doc | `civicInitiativeEngine.js` `resolveCouncilVote_` (faction block, swing block, unnamed-IND loop) |

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|
| P1 | The council vote reads the same on the bench as in the parity run | es | Task 3 | — |

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|
| N1 | `processOverrideVote_` has the same shape (lead + IND rolled again; a vetoed IND-led initiative cannot reach the 6 an override needs) | es · code read | a passed IND-led initiative that the mayor vetoes cannot be overridden | held for builder |
| N2 | `OppositionFaction` blank defaults to CRC even when the lead is CRC (a faction counted yes and no) | es · code read | no CRC-led row exists on the tracker today | held for builder |

## Open questions

- B (which Ivy Hill proposals are restored), C (the INIT-010 / 003 / 006 note lines), D (INIT-010's next action wording) — the doc's suggestions, not yet ruled.

## Changelog

- 2026-11-19 (es) — plan written; Task 1 built and parity-proven; the bench waits on research-build's use of the sandbox.
