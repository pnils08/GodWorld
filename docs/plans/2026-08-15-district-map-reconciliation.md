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

**Path A — initiative attribution** (L354–372). An initiative counts toward a council member's approval only if `init.neighborhoods` intersects `DISTRICT_HOODS[district]`.

> **CORRECTED 2026-08-15 (engine-sheet, live `Initiative_Tracker` read).** The
> symptom is real; the cause stated here was not. INIT-006 does **not** carry
> `neighborhoods: ["Baylight District"]` — the live cell reads **`Jack London,
> Downtown`**, both D2. So the $2.1B Baylight build does not merely fail to reach
> Rivers, it actively **credits Tran (D2)**. Verified across all 6 live
> initiatives: the map correction changes attribution for **zero** of them —
> every row resolves identically under the old and new maps. **Fixing the
> district map cannot fix this.** Only correcting INIT-006's neighborhood tag
> can, and §6 puts `Initiative_Tracker` writes under civic.15, not this plan.
> Task 5's acceptance criterion is therefore unreachable inside civic.18 —
> see §7.

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
| 4 | ~~Single-source the map — B and C import A~~ **IMPOSSIBLE AS WRITTEN, see §7** | engine-sheet | superseded |
| 5 | ~~Verify: Rivers' approval responds to an INIT-006 phase move~~ **unreachable in this plan, see §3 correction** | engine-sheet | superseded |

Task 4 is the durable fix; 1–3 are the immediate correctness restore. Do not ship 1–3 without 5.

## 7. Reversal — Task 4 is architecturally impossible; ADR-0016 already decided this

**Measure-twice, 2026-08-15 (engine-sheet). Evidence before approach.**

Task 4 says "B and C import A." They cannot. `.claspignore:19` excludes `lib/**`
from `clasp push`, so `lib/districtMap.js` never reaches the Apps Script runtime,
and Apps Script has no module system. This is not an oversight to route around —
**ADR-0016 §Rejected alternatives names it verbatim**: *"Put the canonical list in
`lib/`. Physically cannot work — `lib/**` is claspignored and Apps Script has no
imports. This is precisely the wall that created the problem."* The same section
rejects the obvious workaround (a deploy-time generated constants file) because it
"reintroduces truth-in-code that goes stale between deploys."

Moving the literal into a clasp'd directory is the same rejected class: it makes
the literal *deployable*, but ADR-0016's ruling is that code must not hold the
truth at all — *"Code needs a truth source. The code itself can't be it."*
(builder ruling, S349). `lib/districtMap.js` is already listed in the ADR's own
85-file offender survey.

**The sanctioned mechanism already exists.** `phase01-config/canonNeighborhoodLoader.js`
(engine.99 Cohort 1, the ADR's first application) reads `Neighborhood_Map` at
Phase 1, seeds `S.canonHoods`, and fails loud rather than falling back to an
embedded list. District assignment belongs in exactly that pipe.

**The circularity that has to break first.** The `District` column cannot become
the truth source while writer C still produces it: `v3NeighborhoodWriter.js:389`
computes `NEIGHBORHOOD_DISTRICT_MAP[name] || ''` and L423 writes the whole column
every cycle, so the 14 hoods absent from C's 8-entry literal are **blank-overwritten
on every run**. That is why the live column reads 8 populated / 14 blank — the
column is a derived view of C's literal, not a ledger. C must stop writing
`District` before anything may read it as truth.

**Corrected task list:**

| # | Task | Terminal | Gate |
|---|---|---|---|
| 4a | C stops writing `District` — delete `NEIGHBORHOOD_DISTRICT_MAP` + the L417–423 write block | engine-sheet | deploy-gated |
| 4b | Seed `District` for all 22 live rows as ledger data, hand-authored like `CoreSimRank` | engine-sheet | after 4a deploys, else re-blanked |
| 4c | `canonNeighborhoodLoader` also seeds district (`S.canonHoods.district`, `byDistrict`), fail-loud | engine-sheet | deploy-gated |
| 4d | B drops `DISTRICT_HOODS`, reads the loader accessor | engine-sheet | deploy-gated |
| 4e | `auditHoodDrift.js` reconciles the live `District` column against the Node mirror | engine-sheet | Node-only |

Ordering is load-bearing: **4a before 4b**, or the seed is erased by the next cycle.

**Done 2026-08-15 (Node-only, no deploy):** Task 3 — A's Coliseum/Elmhurst removed,
header restated as an ADR-0016 *mirror* of ledger truth, 23-hood invariant
(22 live rows + Montclair) asserted. A **fourth** copy of the map, unlisted in §1,
was found in `scripts/buildCivicVoicePackets.js:43` carrying the note *"Duplicate of
lib/districtMap.js; fixed in lockstep"* — lockstep-by-comment is the drift mechanism
itself, and it is why KONO stayed current there while the approval engine sat stale
at D2 for two months. Single-sourced to A. `lib/districtMap.test.js` 28 → 38 assertions.

**Still open:** 1, 2, 4a–4e. All Apps-Script-side work is held behind the
`ab55d0d8` smoke gate (three unsmoked changes already live; S250 attribution
discipline forbids stacking a fourth).

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

**ALSO BLOCKED ON A DATA DEFECT THIS PLAN CANNOT TOUCH (escalation, 2026-08-15).**
civic.19 makes each member responsible for their own approval rating. That is only
meaningful if an initiative credits the district it actually sits in. It does not
today: INIT-006 "Baylight District — Final Council Vote" is tagged `Jack London,
Downtown`, so the flagship $2.1B build credits **Tran (D2)** while **Rivers (D5)**,
whose district holds the live `Baylight District` row, receives nothing. This is a
ledger-data defect, not a map defect — proven by the map correction changing
attribution for 0 of 6 live initiatives. Per §6 this plan does not write
`Initiative_Tracker`; civic.15 owns that stamp. **A per-district accountability
model must not ship on top of an initiative→district tag that is wrong for the
flagship project.** Needs a ruling on whether INIT-006's tag is a correctable data
error or intended canon before civic.19 leaves design.

**Verified 2026-08-15 (no change needed):** every city-hall participant already has a heat-slice pack — 14/14 voiced offices + 4/4 projects, including all 9 `COUNCIL-D1..D9` individually. The 15 offices without packs are exactly the non-participant municipal seats (CHIEF-FIRE, DCOP-OPS, DCOP-COMM, IAD-LEAD, EMS-DIR, MED-EXAM, EMERG-DIR, ADA-MAJOR, ADA-SAFETY, DPD-DEPUTY, COURT-LIAISON, CPRB-CHAIR, OMBUDSMAN, REENTRY-DIR, PLANNING-DIR).

## Changelog

- 2026-08-15 (engine-sheet) — Task 3 shipped Node-only; Task 4 reversed as
  architecturally impossible (§7, ADR-0016 names it a rejected alternative);
  §3 Path A cause corrected against live `Initiative_Tracker` (INIT-006 is
  tagged `Jack London, Downtown`, crediting Tran — the map fix moves 0 of 6);
  fourth map copy found in `buildCivicVoicePackets.js` and single-sourced;
  civic.19 escalation added (§6) — per-district accountability blocked on the
  INIT-006 tag ruling, not on the map.
- 2026-08-15 (research-build) — Initial plan: 3 drifted copies, 5 tasks.
