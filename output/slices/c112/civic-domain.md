# Civic Domain Slice — C112

- Shared source entries: 121
- Empty: no

## Carmen Delaine (`carmen-delaine`)
- Domain: civic-ledger
- Pulse: West Oakland Stabilization Fund | Status passed | phase disbursement-active
- Ref: Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c112.json snapshots.Initiative_Tracker; storyline INIT-001:disbursement-active
- Candidates:
  - [55] West Oakland Stabilization Fund | Status passed | phase disbursement-active — Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c112.json snapshots.Initiative_Tracker; storyline INIT-001:disbursement-active
  - [55] West Oakland Stabilization Fund | Month-eleven disbursement review C112 — Initiative_Tracker (InitiativeID INIT-001); storyline INIT-001:disbursement-active
  - [55] Oakland Alternative Response Initiative | Status passed | phase dispatch-live — Initiative_Tracker (InitiativeID INIT-002); snapshot: engine_audit_c112.json snapshots.Initiative_Tracker; storyline INIT-002:dispatch-live
  - [55] Oakland Alternative Response Initiative | Quarterly outcome report C112 — Initiative_Tracker (InitiativeID INIT-002); storyline INIT-002:dispatch-live
  - [55] Fruitvale Transit Hub Phase II — Visioning | Status passed | phase design-phase — Initiative_Tracker (InitiativeID INIT-003); snapshot: engine_audit_c112.json snapshots.Initiative_Tracker; storyline INIT-003:design-phase
  - [55] Fruitvale Transit Hub Phase II — Visioning | Preliminary schematics community review C114 — Initiative_Tracker (InitiativeID INIT-003); storyline INIT-003:design-phase
- TrackerFacts (beat dump, record facts):
  - West Oakland Tenant Defense Fund — status passed, phase vote-scheduled, VoteCycle 112, outcome PASSED, budget $4.2M [Initiative_Tracker]
  - Dimond Revitalization Initiative — status proposed, phase announced, budget $2.5M [Initiative_Tracker]
  - Mayor — Avery Santana — approval 72 — active [Civic_Office_Ledger]
  - District Attorney — Clarissa Dane — approval 65 — active [Civic_Office_Ledger]
  - Public Defender — Caleb Reyes — approval 65 — active [Civic_Office_Ledger]
  - City Council District 1 — Denise Carter — approval 65 — active [Civic_Office_Ledger]
  - City Council District 2 — Leonard Tran — approval 69 — active [Civic_Office_Ledger]
  - City Council District 3 — Rose Delgado — approval 64 — active [Civic_Office_Ledger]
- The city's money (beat dump, record facts):
  - City treasury this cycle took in $5.1M: $5M the weekly budget allocation, $122,035 court money on 27 cleared charges [City_Treasury]
  - City treasury balance at the close: $115.4M (from $110.3M) [City_Treasury]
- City hooks (colour, not fact):
  - INITIATIVE PASSED: "West Oakland Tenant Defense Fund" approved by council. Community reaction, implementation timeline, impact analysis angles. — angle: civic affairs coverage [West Oakland]
  - Multiple neighborhood demographic shifts detected this cycle. City-wide population dynamics story. — angle: investigative angle

## Luis Navarro (`luis-navarro`)
- Domain: accountability-anomaly
- Pulse: math-imbalance (low) | Downtown: decay [Sentiment -0.370, HousingPressure +1.000] — Sentiment now 0.09 (5 of 22, city median -0.025); HousingPressure now 9 (21 of 22, city median 0.25) — despite 1 active mitigator(s) [INIT-006]
- Ref: output/engine_audit_c112.json patterns[0]; evidence: Neighborhood_Map row(s) 2
- Candidates:
  - [80] math-imbalance (low) | Downtown: decay [Sentiment -0.370, HousingPressure +1.000] — Sentiment now 0.09 (5 of 22, city median -0.025); HousingPressure now 9 (21 of 22, city median 0.25) — despite 1 active mitigator(s) [INIT-006] — output/engine_audit_c112.json patterns[0]; evidence: Neighborhood_Map row(s) 2
  - [80] math-imbalance (low) | West Oakland: decay [Sentiment -0.320, HousingPressure +0.500] — Sentiment now 0.19 (1 of 22, city median -0.025); HousingPressure now 1.5 (14 of 22, city median 0.25) — despite 2 active mitigator(s) [INIT-001, INIT-007] — output/engine_audit_c112.json patterns[1]; evidence: Neighborhood_Map row(s) 5
  - [80] math-imbalance (low) | Fruitvale: decay [Sentiment -0.330, HousingPressure +1.000] — Sentiment now 0.19 (2 of 22, city median -0.025); HousingPressure now 5.5 (18 of 22, city median 0.25) — despite 1 active mitigator(s) [INIT-007] — output/engine_audit_c112.json patterns[2]; evidence: Neighborhood_Map row(s) 6
  - [80] math-imbalance (low) | Jack London: decay [Sentiment -0.360, HousingPressure +1.000] — Sentiment now 0.14 (4 of 22, city median -0.025); HousingPressure now 7.5 (20 of 22, city median 0.25) — despite 1 active mitigator(s) [INIT-006] — output/engine_audit_c112.json patterns[3]; evidence: Neighborhood_Map row(s) 7
  - [80] math-imbalance (medium) | Chinatown: decay [Sentiment -0.390, HousingPressure +0.500] — Sentiment now -0.01 (10 of 22, city median -0.025); HousingPressure now 0.5 (12 of 22, city median 0.25) — with no matching active initiative — output/engine_audit_c112.json patterns[4]; evidence: Neighborhood_Map row(s) 12
  - [80] math-imbalance (medium) | Dimond: decay [Sentiment -0.350, RetailVitality -1.01] — Sentiment now -0.18 (22 of 22, city median -0.025); RetailVitality now 8.77 (12 of 22, city median 8.879999999999999) — with no matching active initiative — output/engine_audit_c112.json patterns[5]; evidence: Neighborhood_Map row(s) 16
- Stalling initiatives (unchanged vs prev cycle, colour):
  - West Oakland Stabilization Fund — still passed / disbursement-active (unchanged since C111) [Initiative_Tracker]
  - Oakland Alternative Response Initiative — still passed / dispatch-live (unchanged since C111) [Initiative_Tracker]
  - Fruitvale Transit Hub Phase II — Visioning — still passed / design-phase (unchanged since C111) [Initiative_Tracker]
  - Temescal Community Health Center — still passed / operational (unchanged since C111) [Initiative_Tracker]
  - Baylight District — Final Council Vote — still passed / construction-active (unchanged since C111) [Initiative_Tracker]
  - Oakland Youth Apprenticeship Pipeline — still announced / implementation-active (unchanged since C111) [Initiative_Tracker]
  - Downtown Economic Revitalization — still proposed / legislation-filed (unchanged since C111) [Initiative_Tracker]
  - Commercial Stabilization for Grand Lake — still proposed / legislation-filed (unchanged since C111) [Initiative_Tracker]
  - Ivy Hill Revitalization Initiative — still proposed / announced (unchanged since C111) [Initiative_Tracker]
- Faction standings (colour):
  - OPP: 6 offices (5 voting) — Avery Santana, Caleb Reyes, Denise Carter [Civic_Office_Ledger]
  - IND: 3 offices (2 voting) — Clarissa Dane, Leonard Tran, Ramon Vega [Civic_Office_Ledger]
  - CRC: 3 offices (3 voting) — Elliott Crane, Warren Ashford, Nina Chen [Civic_Office_Ledger]
  - STAFF: 27 offices — Laila Cortez, Marcus Osei, Brenda Okoro [Civic_Office_Ledger]
- City hooks (colour, not fact):
  - RIPPLE EFFECT: "West Oakland Tenant Defense Fund" beginning to affect West Oakland. Early impact observation angle. — angle: investigative angle [West Oakland]

## Trevor Shimizu (`trevor-shimizu`)
- Domain: infrastructure-transit
- Pulse: The civic initiative carrying Downtown has not advanced in 2 cycles.
- Ref: output/engine_audit_c112.json patterns[0]; evidence: Neighborhood_Map row(s) 2
- Candidates:
  - [45] math-imbalance (low) | Downtown: decay [Sentiment -0.370, HousingPressure +1.000] — Sentiment now 0.09 (5 of 22, city median -0.025); HousingPressure now 9 (21 of 22, city median 0.25) — despite 1 active mitigator(s) [INIT-006] — output/engine_audit_c112.json patterns[0]; evidence: Neighborhood_Map row(s) 2
  - [45] math-imbalance (low) | Fruitvale: decay [Sentiment -0.330, HousingPressure +1.000] — Sentiment now 0.19 (2 of 22, city median -0.025); HousingPressure now 5.5 (18 of 22, city median 0.25) — despite 1 active mitigator(s) [INIT-007] — output/engine_audit_c112.json patterns[2]; evidence: Neighborhood_Map row(s) 6
  - [45] math-imbalance (low) | Jack London: decay [Sentiment -0.360, HousingPressure +1.000] — Sentiment now 0.14 (4 of 22, city median -0.025); HousingPressure now 7.5 (20 of 22, city median 0.25) — despite 1 active mitigator(s) [INIT-006] — output/engine_audit_c112.json patterns[3]; evidence: Neighborhood_Map row(s) 7
  - [45] Fruitvale Transit Hub Phase II — Visioning | Status passed | phase design-phase — Initiative_Tracker (InitiativeID INIT-003); snapshot: engine_audit_c112.json snapshots.Initiative_Tracker; storyline INIT-003:design-phase
  - [45] Fruitvale Transit Hub Phase II — Visioning | Preliminary schematics community review C114 — Initiative_Tracker (InitiativeID INIT-003); storyline INIT-003:design-phase
  - [45] Baylight District — Final Council Vote | Status passed | phase construction-active — Initiative_Tracker (InitiativeID INIT-006); snapshot: engine_audit_c112.json snapshots.Initiative_Tracker; storyline INIT-006:construction-active

## Dr. Lila Mezran (`lila-mezran`)
- Domain: health
- Pulse: Elle Lilo cooked healthier meals all week and felt the difference (Jack London).
- Ref: output/world_summary_c112.md "## Who Lived It ### Recovering"
- Candidates:
  - [80] Elle Lilo — cooked healthier meals all week and felt the difference — output/world_summary_c112.md "## Who Lived It ### Recovering"
  - [80] Elena Leon — cooked healthier meals all week and felt the difference — output/world_summary_c112.md "## Who Lived It ### Recovering"
  - [65] Jonas Patel — dealt with a seasonal health concern — output/world_summary_c112.md "## Who Lived It ### Health"
  - [45] sentiment/communityEngagement/publicSpaces | Temescal Community Health Center is operational — ongoing health effects in Temescal — Ripple_Ledger cycle 112 (CauseType initiative-implementation); rendered: world_summary_c112.md "## What Moved" > "### initiative-implementation"; storyline INIT-005:operational
  - [45] approval/district-sentiment | West Oakland Stabilization Fund sitting (0, capped); Oakland Alternative Response Initiative sitting (0, capped); Fruitvale Transit Hub Phase II — Visioning sitting (0, capped); Temescal Community Health Center sitting (0, capped); Baylight District — Final Council Vote sitting (0, capped); Oakland… — Ripple_Ledger cycle 112 (CauseType approval-shift); rendered: world_summary_c112.md "## What Moved" > "### approval-shift"
  - [45] Warren Ashford (council d7): Credit Temescal's positive mood to local merchant resilience while enforcing quarterly utilization audit benchmarks for the Temescal Community Health Center. — "Temescal's positive sentiment — output/civic-voice/council_d7_c112.json

## Noah Tan (`noah-tan`)
- Domain: environment
- Pulse: Jonas Patel — dealt with a seasonal health concern
- Ref: output/world_summary_c112.md ## Who Lived It
- Candidates:
  - [80] Jonas Patel — dealt with a seasonal health concern — output/world_summary_c112.md ## Who Lived It
  - [80] Xavier Ramington — relied on familiar social circles during cold period — output/world_summary_c112.md ## Who Lived It
  - [80] Derlik Green — relied on familiar social circles during cold period — output/world_summary_c112.md ## Who Lived It
  - [80] Brian Adams — limited social activity due to winter mood — output/world_summary_c112.md ## Who Lived It
  - [80] FAITH — community_program — Downtown: Telegraph Presbyterian Fellowship: after-school tutoring program expands — output/world_summary_c112.md ## World Events
  - [80] FAITH — community_program — Montclair: Bharat Mandir of the East Bay: food pantry serves neighbors in need — output/world_summary_c112.md ## World Events

## Angela Reyes (`angela-reyes`)
- Domain: education-youth
- Pulse: math-imbalance (low) | Fruitvale: decay [Sentiment -0.330, HousingPressure +1.000] — Sentiment now 0.19 (2 of 22, city median -0.025); HousingPressure now 5.5 (18 of 22, city median 0.25) — despite 1 active mitigator(s) [INIT-007]
- Ref: output/engine_audit_c112.json patterns[2]; evidence: Neighborhood_Map row(s) 6
- Candidates:
  - [45] math-imbalance (low) | Fruitvale: decay [Sentiment -0.330, HousingPressure +1.000] — Sentiment now 0.19 (2 of 22, city median -0.025); HousingPressure now 5.5 (18 of 22, city median 0.25) — despite 1 active mitigator(s) [INIT-007] — output/engine_audit_c112.json patterns[2]; evidence: Neighborhood_Map row(s) 6
  - [45] cascade-failure (medium) | Initiative "Oakland Youth Apprenticeship Pipeline" active but 2/3 affected neighborhoods show no signal — output/engine_audit_c112.json patterns[9]; evidence: Initiative_Tracker row(s) 7
  - [45] improvement (low) | Initiative "Oakland Youth Apprenticeship Pipeline" advanced: operational → implementation-active — output/engine_audit_c112.json patterns[11]; evidence: Initiative_Tracker row(s) 7
  - [45] Oakland Youth Apprenticeship Pipeline | Status announced | phase implementation-active — Initiative_Tracker (InitiativeID INIT-007); snapshot: engine_audit_c112.json snapshots.Initiative_Tracker; storyline INIT-007:implementation-active
  - [45] Oakland Youth Apprenticeship Pipeline | First cohort placement report delivery C112 — Initiative_Tracker (InitiativeID INIT-007); storyline INIT-007:implementation-active
  - [45] sentiment/communityEngagement/retail | Oakland Youth Apprenticeship Pipeline is implementation-active — ongoing workforce effects in West Oakland, East Oakland, Fruitvale — Ripple_Ledger cycle 112 (CauseType initiative-implementation); rendered: world_summary_c112.md "## What Moved" > "### initiative-implementation"; storyline INIT-007:implementation-active

_Generated by scripts/buildCivicDomainSlice.js — local records only._
