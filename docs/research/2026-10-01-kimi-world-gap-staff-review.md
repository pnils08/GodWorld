---
title: Kimi review — world-gap authored staff table (OPD/OFD/OARI, 30 rows)
created: 2026-10-01
updated: 2026-10-01
type: reference
tags: [citizens, civic, draft]
sources:
  - docs/plans/2026-09-07-beat-slices-from-sheets-plan.md
  - output/simulation_ledger_snapshot.jsonl
  - docs/canon/INSTITUTIONS.md
  - .claude/agents/civic-project-oari/RULES.md
  - output/civic-voice/oari_c109.json
pointers:
  - "[[plans/2026-09-07-beat-slices-from-sheets-plan]] — owning plan, §Builder rulings 2026-10-01 23:25"
---

# Kimi review — 30 authored OPD/OFD/OARI staff (§Builder rulings 2026-10-01 23:25)

**Verdict: SHIP-WITH-FIXES** — the table is mintable; four named-row items below, one of which (fix 1) is a builder judgment call, none structural.

Scope: the 30-row table only. Checked against `output/simulation_ledger_snapshot.jsonl` (963 citizens, tonight's snapshot), the live `Advancement_Intake1` tab (read-only via `lib/sheets.getSheetData` after `require lib/env` — 70 pending non-empty rows), `docs/canon/INSTITUTIONS.md`, `lib/canonNeighborhoods.js` MAP_NEIGHBORHOODS (the Neighborhood_Map cache), `.claude/agents/civic-project-oari/RULES.md`, `output/civic-voice/oari_c109.json`, and `output/beats/Business_Ledger.jsonl`.

## Check results

**(1) Name collisions — PASS.** Zero exact First+Last collisions against all 963 ledger citizens and zero against the 70 pending intake rows (scanned on normalized first/last, hyphenation-insensitive). Surname-level overlaps exist and are small families, consistent with the "large families avoided" rule: Achebe ×2 (Marisol POP-00526, Desmond POP-01092), Adeyemi ×2 (Akua POP-00803, Quinn POP-01113), Lindqvist ×2 (Farah POP-00257, Theodore POP-01097), plus singles Ibarra, Castellanos, Marchetti, Asante. See fixes 1–3 for the three rows where a surname overlap is load-bearing.

**(2) Hoods — PASS.** All 30 hood strings match MAP_NEIGHBORHOODS exactly (22-name roster verified in `lib/canonNeighborhoods.js`): West Oakland ×7, East Oakland ×7, Fruitvale ×5, and one each of Laurel, Chinatown, Dimond, Eastlake, San Antonio, Downtown, Glenview, Rockridge, Temescal, KONO, Brooklyn, Ivy Hill. No off-roster tokens.

**(3) BirthYear — PASS.** Sim year 2042, Montez 1997 = 45 as the anchor. Command band runs 42–50 (Ferreira-Nash 1992/50 Deputy Fire Chief, Achebe 1994/48 Captain, Solberg 1996/46 Battalion Chief, Haddad 2000/42 Fire Captain, Quintanilla 1999/43 Team Lead). Line band runs 24–41; youngest is Hana Petrosyan 2018 = 24, a plausible police-officer entry age. Every rank sits in a credible age window; the gradient (command older, line younger) is consistent.

**(4) Rank mix — PASS.** Command Tier 3 / line Tier 4 as ruled: OPD 2 command (Captain, Lieutenant) + 8 line; OFD 3 command (Deputy Chief, Battalion Chief, Fire Captain — company officer, legitimately command) + 8 line; OARI 3 Team Leads + 6 line. Counts fit the 22:52 ruling (10–15 each): OPD 10, OFD 11; OARI 9 per the 23:25 "staff the OARI response teams too". Hoods spread across the call-generating flats (West Oakland, East Oakland, Fruitvale, Downtown, Chinatown) with the hills represented. Headcount claims verified against Business_Ledger: OPD 701, OFD 452, OARI 46 — all exact.

**(5) OARI count of nine — PASS with a wording caveat (fix 4).** Canon: RULES.md states 18 total responder positions (C85 operational table); `oari_c109.json` has teams dispatch-live in West Oakland (the "District 1 evaluation" — INSTITUTIONS anchors West Oakland to D1) and East Oakland deployment authorized with `NextActionCycle: 110`. Nine minted responders = half of 18, matching the plan's arithmetic. Mint timing at C110 lands exactly on the East Oakland responder-training cycle the voice file schedules. The Fruitvale team is consistent with pilot district D5 even though c109 names only West Oakland as live.

**(6) Real-world public figures — two reads worth a ruling (fixes 1–2).** The rest of the 30 are clear (Volkov, Quintanilla, Solberg, Rasmussen etc. are common surnames; no full-name match to any public figure found).

## Fix list

1. **Row 1 — Dolores Achebe (OPD Police Captain).** Achebe reads as Chinua Achebe, one of the most famous African writers — exactly the "reads as a real-world public figure" class. Mitigation: two ledger citizens already carry the surname (POP-00526, POP-01092), so it is established in-sim and this row extends an existing family. Builder call: keep (family precedent) or rename (public-figure surname). My recommendation: rename — a high-visibility Police Captain carries the surname into print far more than two background citizens do.
2. **Row 21 — Calvin Mbeki (OPD 911 Dispatcher).** Mbeki reads as Thabo Mbeki (former South African president). Lower-severity than fix 1 (dispatcher, surname-only association, no existing Mbeki family). Recommend rename of the surname; cheap now, impossible after the mint.
3. **Row 3 — Kendra Okafor-Lyle (OPD Police Sergeant).** Hyphenated form is collision-clean, but it reads as kin to the existing Okafor family — and Sharon Okafor (POP-00159) is a seated Bay Tribune journalist who will cover this police department. If she is meant to be unrelated, swap the hyphenate (e.g. Kendra Lyle-Okonkwo shape) before the mint locks the name into canon.
4. **Plan text, not a row — "three teams of three across the three dispatch-live hoods".** Overstates c109 canon: the voice file has West Oakland live and East Oakland *deploying* (live within two cycles, training at C110); Fruitvale is pilot-district D5 but is never named dispatch-live in c109. The mint itself is correctly timed and placed — this is a one-line wording correction in the plan section so the next reader doesn't cite "three dispatch-live hoods" as canon.

## Not flagged

- EmployerBizId headcount room: verified (701/452/46 stated, all match the ledger dump).
- Tier-3-never-pool-drawn rule: table is fully authored, no pool dependence.
- INSTITUTIONS.md: only constraint is OPD Chief Rafael Montez (canon) — untouched by this table; no OFD/OARI staffing rows exist to conflict with.

Filing note: written as the single authorized file per the review request; `docs/research/index.md` registration left for the landing lane.
