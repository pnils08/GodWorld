---
title: District map reconciliation — three drifted copies, one world
created: 2026-08-15
updated: 2026-08-15
type: plan
tags: [civic, engine, architecture, active]
sources:
  - lib/districtMap.js — civic-side map, 25 hoods, all 9 districts
  - phase05-citizens/updateCivicApprovalRatings.js §DISTRICT_HOODS — approval-side map, 24 hoods, independently drifted
  - phase08-v3-chicago/v3NeighborhoodWriter.js §NEIGHBORHOOD_DISTRICT_MAP — engine writer, 8 hoods mapped, 14 blank
  - output/world_summary_c103.md §City State — live Neighborhood_Map, 22 rows
  - docs/canon/INSTITUTIONS.md §336 — Baylight = 65-acre former-Coliseum site, D5 successor
pointers:
  - "[[engine/ROLLOUT_PLAN]] — civic.18, engine.108"
  - "[[2026-08-15-civic-office-lived-packets]] — civic.17, the pack layer this unblocks"
  - "[[../canon/INSTITUTIONS]] §Neighborhoods — canon authority for district anchors"
  - "[[index]] — registered same commit"
---

# District map reconciliation

**Problem:** three independent copies of the district→neighborhood map exist. They disagree. The disagreement silently zeroes council approval feedback for the flagship district.

## 1. The three copies

| Copy | File | Hoods | District coverage |
|---|---|---|---|
| A — civic packets | `lib/districtMap.js` | 25 | all 9 |
| B — approval engine | `phase05-citizens/updateCivicApprovalRatings.js` §`DISTRICT_HOODS` | 24 | all 9 |
| C — engine writer | `phase08-v3-chicago/v3NeighborhoodWriter.js` §`NEIGHBORHOOD_DISTRICT_MAP` | 8 | partial; 14 hoods write blank District |

Live world (`Neighborhood_Map`, c103): **22 rows**.

## 2. Divergences (verified c103)

- `Montclair`, `Coliseum`, `Elmhurst` — present in A and B, **absent from the live world**. Never present in any surviving world summary; absent from writer C's map entirely.
- `KONO` — A places it D7 (Ashford, CRC) per canon S256. B still places it **D2** (Tran, IND). Approval and packets credit different members for the same turf.
- `Baylight District` — exists live, mapped D5 in A and C. **Absent from B entirely.**
- Writer C maps only 8 of 22 live hoods; the other 14 write a blank `District` column.

## 3. The hiding error (Mike-flagged, confirmed)

Two failure paths in `updateCivicApprovalRatings.js`:

**Path A — initiative attribution** (L354–372). An initiative counts toward a council member's approval only if `init.neighborhoods` intersects `DISTRICT_HOODS[district]`. INIT-006 Baylight carries `neighborhoods: ["Baylight District"]`. D5 = `['East Oakland','Coliseum','Elmhurst']`. **No match.** Rivers' approval never moves on the $2.1B build in her own district.

**Path B — sentiment ripple** (L670–682). Approval deltas write `S.approvalNeighborhoodEffects[hood]`, keyed by name. Entries created for hoods with no `Neighborhood_Map` row have nothing downstream to apply to — silent no-op, no error.

Per-district live reachability of the approval ripple:

| District | Member | B's hoods | Reach live |
|---|---|---|---|
| D5 | Rivers (OPP) | East Oakland, Coliseum, Elmhurst | **1 of 3** — and Baylight, which is D5, receives nothing |
| D6 | Crane (CRC) | Montclair, Piedmont Ave | **1 of 2** |
| D7 | Ashford (CRC) | Temescal, Rockridge | 2 of 2, but KONO is credited to D2 |
| all others | — | — | full |

D6 compounds: Crane is the `recovering` seat (`.claude/rules/civic.md` §status enum) — a non-voting member whose approval feedback also runs at half turf.

## 4. Rulings

- **Montclair — bring aboard (Mike-direct 2026-08-15).** Add to writer C mapped `D6`; needs a live `Neighborhood_Map` row. Restores Crane to a two-neighborhood district.
- **Coliseum — remove from A and B.** Canon (`INSTITUTIONS.md` §336) makes Baylight the "Coliseum-site successor" on the 65-acre former-Coliseum grounds. Carrying both double-counts the same land — the exact error flagged. `Oakland Coliseum` survives as a **venue** (§310), not a neighborhood.
- **Elmhurst — remove from A and B.** Canon names it only as *adjacent context* for the Baylight LENS, never as an anchored neighborhood in its own right, and it has never had a world row. Not a land-mass conflict; a name that only ever lived in the lookup tables. Re-add later via canon expansion if a real hood is wanted there.
- **KONO — B conforms to A (D7).** Canon S256 is the authority; B is stale.
- **Baylight District — add to B under D5.** Closes Path A.

## 5. Tasks

| # | Task | Terminal | Acceptance |
|---|---|---|---|
| 1 | `Montclair` → writer C map as D6; seed `Neighborhood_Map` row | engine-sheet | Montclair appears in `world_summary` hood table at next cycle |
| 2 | `DISTRICT_HOODS` (B): drop Coliseum/Elmhurst/Montclair-if-unseeded, move KONO D2→D7, add Baylight District→D5 | engine-sheet | B matches A exactly; diff test asserts equality |
| 3 | `lib/districtMap.js` (A): drop Coliseum + Elmhurst | engine-sheet | A = 23 hoods (22 live + Montclair pending seed) |
| 4 | Single-source the map — B and C import A rather than re-declaring | engine-sheet | grep finds one literal district→hood table in the repo |
| 5 | Verify: Rivers' approval responds to an INIT-006 phase move | engine-sheet | approval delta reasons[] cites Baylight |

Task 4 is the durable fix; 1–3 are the immediate correctness restore. Do not ship 1–3 without 5.

## 6. Out of scope

Per-member individual voices (bloc collapse), rotation/attendance policy, and council-authored initiatives are design work under civic.17 + a successor row — not this reconciliation. This plan does not write `Initiative_Tracker`; civic.15 owns that stamp.

### civic.19 — Council as actors (Mike-direct 2026-08-15, design, blocked)

Direction as stated, held for design once the map is trustworthy:

- All 9 districts involved; each member **responsible for their own approval rating**.
- Bloc merge is accepted as a moving-pieces reduction, not as the end state.
- If city-hall filters to HIGH-severity involvement only, the rotation should instead give **consistent attendance** — the filter becomes a rota, not an exclusion.
- Packet split: the 9 districts + Mayor + voiced seats get **decision packets**; the remaining office-holders get **job-domain data only**.
- End state: councilmembers **author their own initiatives and vote on them**. The 9 are the voters.

**Blocked on:** civic.18 tasks 1–5 (a member cannot own an approval rating computed off phantom turf), and civic.17 pack landing so per-district input exists before per-district accountability is asserted.

**Verified 2026-08-15 (no change needed):** every city-hall participant already has a heat-slice pack — 14/14 voiced offices + 4/4 projects, including all 9 `COUNCIL-D1..D9` individually. The 15 offices without packs are exactly the non-participant municipal seats (CHIEF-FIRE, DCOP-OPS, DCOP-COMM, IAD-LEAD, EMS-DIR, MED-EXAM, EMERG-DIR, ADA-MAJOR, ADA-SAFETY, DPD-DEPUTY, COURT-LIAISON, CPRB-CHAIR, OMBUDSMAN, REENTRY-DIR, PLANNING-DIR).
