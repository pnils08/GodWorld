# Civic Domain Slice — C113

- Shared source entries: 138
- Empty: no

## Carmen Delaine (`carmen-delaine`)
- Domain: civic-ledger
- Pulse: West Oakland Stabilization Fund | Status passed | phase disbursement-active
- Ref: Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c113.json snapshots.Initiative_Tracker; storyline INIT-001:disbursement-active
- Candidates:
  - [55] West Oakland Stabilization Fund | Status passed | phase disbursement-active — Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c113.json snapshots.Initiative_Tracker; storyline INIT-001:disbursement-active
  - [55] West Oakland Stabilization Fund | Month-twelve disbursement review C113 — Initiative_Tracker (InitiativeID INIT-001); storyline INIT-001:disbursement-active
  - [55] Oakland Alternative Response Initiative | Status passed | phase dispatch-live — Initiative_Tracker (InitiativeID INIT-002); snapshot: engine_audit_c113.json snapshots.Initiative_Tracker; storyline INIT-002:dispatch-live
  - [55] Oakland Alternative Response Initiative | District-level data report and D3 community briefing C113 — Initiative_Tracker (InitiativeID INIT-002); storyline INIT-002:dispatch-live
  - [55] Fruitvale Transit Hub Phase II — Visioning | Status passed | phase design-phase — Initiative_Tracker (InitiativeID INIT-003); snapshot: engine_audit_c113.json snapshots.Initiative_Tracker; storyline INIT-003:design-phase
  - [55] Fruitvale Transit Hub Phase II — Visioning | Preliminary schematics community review C114 — Initiative_Tracker (InitiativeID INIT-003); storyline INIT-003:design-phase
- TrackerFacts (beat dump, record facts):
  - Downtown Economic Revitalization — status proposed, phase vote-scheduled, VoteCycle 114, budget $15M [Initiative_Tracker]
  - Commercial Stabilization for Grand Lake — status proposed, phase vote-ready, budget $2.5M [Initiative_Tracker]
  - West Oakland Tenant Defense Fund — status passed, phase operational, VoteCycle 112, outcome PASSED, budget $4.2M [Initiative_Tracker]
  - Ivy Hill Revitalization Initiative — status proposed, phase legislation-filed, budget $2.5M [Initiative_Tracker]
  - Ivy Hill Community Revitalization — status proposed, phase announced, budget $2M [Initiative_Tracker]
  - Mayor — Avery Santana — approval 69 — active [Civic_Office_Ledger]
  - District Attorney — Clarissa Dane — approval 65 — active [Civic_Office_Ledger]
  - Public Defender — Caleb Reyes — approval 65 — active [Civic_Office_Ledger]
- The city's money (beat dump, record facts):
  - City treasury this cycle took in $5.1M: $5M the weekly budget allocation, $322 1 ticket, $131,369 court money on 29 cleared charges [City_Treasury]
  - City treasury paid out $4.2M: $4.2M to West Oakland Tenant Defense Fund [City_Treasury]
  - City treasury balance at the close: $116.3M (from $115.4M) [City_Treasury]

## Luis Navarro (`luis-navarro`)
- Domain: accountability-anomaly
- Pulse: math-imbalance (low) | Downtown: decay [RetailVitality -2.18, HousingPressure +1.000] — RetailVitality now 11.31 (6 of 22, city median 7.165); HousingPressure now 10 (21 of 22, city median 0); Sentiment now 0.16 (5 of 22, city median 0.03) — despite 1 active mitigator(s) [INIT-006]
- Ref: output/engine_audit_c113.json patterns[0]; evidence: Neighborhood_Map row(s) 2
- Candidates:
  - [80] math-imbalance (low) | Downtown: decay [RetailVitality -2.18, HousingPressure +1.000] — RetailVitality now 11.31 (6 of 22, city median 7.165); HousingPressure now 10 (21 of 22, city median 0); Sentiment now 0.16 (5 of 22, city median 0.03) — despite 1 active mitigator(s) [INIT-006] — output/engine_audit_c113.json patterns[0]; evidence: Neighborhood_Map row(s) 2
  - [80] math-imbalance (medium) | Temescal: decay [Sentiment -0.060, RetailVitality -1.11] — Sentiment now 0.08 (6 of 22, city median 0.03); RetailVitality now 5.29 (17 of 22, city median 7.165) — with no matching active initiative — output/engine_audit_c113.json patterns[1]; evidence: Neighborhood_Map row(s) 3
  - [80] math-imbalance (low) | West Oakland: decay [RetailVitality -1.87, HousingPressure +1.000] — RetailVitality now 9.68 (8 of 22, city median 7.165); HousingPressure now 2.5 (16 of 22, city median 0); Sentiment now 0.25 (1 of 22, city median 0.03) — despite 2 active mitigator(s) [INIT-001, INIT-007] — output/engine_audit_c113.json patterns[2]; evidence: Neighborhood_Map row(s) 5
  - [80] math-imbalance (low) | Fruitvale: decay [RetailVitality -1.48, HousingPressure +1.000] — RetailVitality now 11.35 (5 of 22, city median 7.165); HousingPressure now 6.5 (18 of 22, city median 0); Sentiment now 0.24 (2 of 22, city median 0.03) — despite 1 active mitigator(s) [INIT-007] — output/engine_audit_c113.json patterns[3]; evidence: Neighborhood_Map row(s) 6
  - [80] math-imbalance (low) | Jack London: decay [RetailVitality -1.79, HousingPressure +1.000] — RetailVitality now 13.4 (1 of 22, city median 7.165); HousingPressure now 8.5 (20 of 22, city median 0); Sentiment now 0.17 (4 of 22, city median 0.03) — despite 1 active mitigator(s) [INIT-006] — output/engine_audit_c113.json patterns[4]; evidence: Neighborhood_Map row(s) 7
  - [80] math-imbalance (medium) | Grand Lake: decay [RetailVitality -1.18, HousingPressure +1.000] — RetailVitality now 11.57 (4 of 22, city median 7.165); HousingPressure now 6.5 (19 of 22, city median 0); Sentiment now -0.03 (17 of 22, city median 0.03) — with no matching active initiative — output/engine_audit_c113.json patterns[5]; evidence: Neighborhood_Map row(s) 10
- Stalling initiatives (unchanged vs prev cycle, colour):
  - West Oakland Stabilization Fund — still passed / disbursement-active (unchanged since C112) [Initiative_Tracker]
  - Oakland Alternative Response Initiative — still passed / dispatch-live (unchanged since C112) [Initiative_Tracker]
  - Fruitvale Transit Hub Phase II — Visioning — still passed / design-phase (unchanged since C112) [Initiative_Tracker]
  - Temescal Community Health Center — still passed / operational (unchanged since C112) [Initiative_Tracker]
  - Baylight District — Final Council Vote — still passed / construction-active (unchanged since C112) [Initiative_Tracker]
  - Oakland Youth Apprenticeship Pipeline — still announced / implementation-active (unchanged since C112) [Initiative_Tracker]
  - Dimond Revitalization Initiative — still proposed / announced (unchanged since C112) [Initiative_Tracker]
- Faction standings (colour):
  - OPP: 6 offices (5 voting) — Avery Santana, Caleb Reyes, Denise Carter [Civic_Office_Ledger]
  - IND: 3 offices (2 voting) — Clarissa Dane, Leonard Tran, Ramon Vega [Civic_Office_Ledger]
  - CRC: 3 offices (3 voting) — Elliott Crane, Warren Ashford, Nina Chen [Civic_Office_Ledger]
  - STAFF: 27 offices — Laila Cortez, Marcus Osei, Brenda Okoro [Civic_Office_Ledger]
- City hooks (colour, not fact):
  - Multiple neighborhood demographic shifts detected this cycle. City-wide population dynamics story. — angle: investigative angle

## Trevor Shimizu (`trevor-shimizu`)
- Domain: infrastructure-transit
- Pulse: The civic initiative carrying Downtown has not advanced in 3 cycles.
- Ref: output/engine_audit_c113.json patterns[0]; evidence: Neighborhood_Map row(s) 2
- Candidates:
  - [45] math-imbalance (low) | Downtown: decay [RetailVitality -2.18, HousingPressure +1.000] — RetailVitality now 11.31 (6 of 22, city median 7.165); HousingPressure now 10 (21 of 22, city median 0); Sentiment now 0.16 (5 of 22, city median 0.03) — despite 1 active mitigator(s) [INIT-006] — output/engine_audit_c113.json patterns[0]; evidence: Neighborhood_Map row(s) 2
  - [45] math-imbalance (low) | Fruitvale: decay [RetailVitality -1.48, HousingPressure +1.000] — RetailVitality now 11.35 (5 of 22, city median 7.165); HousingPressure now 6.5 (18 of 22, city median 0); Sentiment now 0.24 (2 of 22, city median 0.03) — despite 1 active mitigator(s) [INIT-007] — output/engine_audit_c113.json patterns[3]; evidence: Neighborhood_Map row(s) 6
  - [45] math-imbalance (low) | Jack London: decay [RetailVitality -1.79, HousingPressure +1.000] — RetailVitality now 13.4 (1 of 22, city median 7.165); HousingPressure now 8.5 (20 of 22, city median 0); Sentiment now 0.17 (4 of 22, city median 0.03) — despite 1 active mitigator(s) [INIT-006] — output/engine_audit_c113.json patterns[4]; evidence: Neighborhood_Map row(s) 7
  - [45] Fruitvale Transit Hub Phase II — Visioning | Status passed | phase design-phase — Initiative_Tracker (InitiativeID INIT-003); snapshot: engine_audit_c113.json snapshots.Initiative_Tracker; storyline INIT-003:design-phase
  - [45] Fruitvale Transit Hub Phase II — Visioning | Preliminary schematics community review C114 — Initiative_Tracker (InitiativeID INIT-003); storyline INIT-003:design-phase
  - [45] Baylight District — Final Council Vote | Status passed | phase construction-active — Initiative_Tracker (InitiativeID INIT-006); snapshot: engine_audit_c113.json snapshots.Initiative_Tracker; storyline INIT-006:construction-active

## Dr. Lila Mezran (`lila-mezran`)
- Domain: health
- Pulse: Victor King nursed a sore back after overdoing it around the house (Rockridge).
- Ref: output/world_summary_c113.md "## Who Lived It ### Health"
- Candidates:
  - [80] Victor King — nursed a sore back after overdoing it around the house — output/world_summary_c113.md "## Who Lived It ### Health"
  - [65] Cee Lee — dealt with a seasonal health concern — output/world_summary_c113.md "## Who Lived It ### Health"
  - [65] Elle Lilo — finally shook the cold that had been hanging around — output/world_summary_c113.md "## Who Lived It ### Recovering"
  - [60] Chinatown health cluster (crisis-spike) | Low-severity health spike in Chinatown (impactScore 16) — output/world_summary_c113.md "## World Events"
  - [45] sentiment/communityEngagement/publicSpaces | Temescal Community Health Center is operational — ongoing health effects in Temescal; the city feels it through these neighborhoods — Ripple_Ledger cycle 113 (CauseType initiative-implementation); rendered: world_summary_c113.md "## What Moved" > "### initiative-implementation"; storyline INIT-005:operational
  - [45] approval/district-sentiment | West Oakland Stabilization Fund sitting (0, capped); Oakland Alternative Response Initiative sitting (0, capped); Fruitvale Transit Hub Phase II — Visioning sitting (0, capped); Temescal Community Health Center sitting (0, capped); Baylight District — Final Council Vote sitting (0, capped); Oakland… — Ripple_Ledger cycle 113 (CauseType approval-shift); rendered: world_summary_c113.md "## What Moved" > "### approval-shift"

## Noah Tan (`noah-tan`)
- Domain: environment
- Pulse: Cee Lee — dealt with a seasonal health concern
- Ref: output/world_summary_c113.md ## Who Lived It
- Candidates:
  - [80] Cee Lee — dealt with a seasonal health concern — output/world_summary_c113.md ## Who Lived It
  - [80] Johhny Necklar — recovered from a winter illness — output/world_summary_c113.md ## Who Lived It
  - [80] Elle Lilo — finally shook the cold that had been hanging around — output/world_summary_c113.md ## Who Lived It
  - [80] Rafael Brannie — limited social activity due to winter mood — output/world_summary_c113.md ## Who Lived It
  - [80] Kwame Fitzgerald — limited social activity due to winter mood — output/world_summary_c113.md ## Who Lived It
  - [80] Omar Amici — relied on familiar social circles during cold period — output/world_summary_c113.md ## Who Lived It

## Angela Reyes (`angela-reyes`)
- Domain: education-youth
- Pulse: math-imbalance (low) | Fruitvale: decay [RetailVitality -1.48, HousingPressure +1.000] — RetailVitality now 11.35 (5 of 22, city median 7.165); HousingPressure now 6.5 (18 of 22, city median 0); Sentiment now 0.24 (2 of 22, city median 0.03) — despite 1 active mitigator(s) [INIT-007]
- Ref: output/engine_audit_c113.json patterns[3]; evidence: Neighborhood_Map row(s) 6
- Candidates:
  - [45] math-imbalance (low) | Fruitvale: decay [RetailVitality -1.48, HousingPressure +1.000] — RetailVitality now 11.35 (5 of 22, city median 7.165); HousingPressure now 6.5 (18 of 22, city median 0); Sentiment now 0.24 (2 of 22, city median 0.03) — despite 1 active mitigator(s) [INIT-007] — output/engine_audit_c113.json patterns[3]; evidence: Neighborhood_Map row(s) 6
  - [45] cascade-failure (medium) | Initiative "Oakland Youth Apprenticeship Pipeline" active but 2/3 affected neighborhoods show no signal — output/engine_audit_c113.json patterns[9]; evidence: Initiative_Tracker row(s) 7
  - [45] Oakland Youth Apprenticeship Pipeline | Status announced | phase implementation-active — Initiative_Tracker (InitiativeID INIT-007); snapshot: engine_audit_c113.json snapshots.Initiative_Tracker; storyline INIT-007:implementation-active
  - [45] sentiment/communityEngagement/retail | Oakland Youth Apprenticeship Pipeline is implementation-active — ongoing workforce effects in West Oakland, East Oakland, Fruitvale; the city feels it through these neighborhoods — Ripple_Ledger cycle 113 (CauseType initiative-implementation); rendered: world_summary_c113.md "## What Moved" > "### initiative-implementation"; storyline INIT-007:implementation-active
  - [45] approval/district-sentiment | West Oakland Stabilization Fund sitting (0, capped); Oakland Alternative Response Initiative sitting (0, capped); Oakland Youth Apprenticeship Pipeline silence (-3); West Oakland Tenant Defense Fund advanced (+2); level target 62 (mood +1.14 (district 1.21, city 1.08), district -0.04 vs middle, pre… — Ripple_Ledger cycle 113 (CauseType approval-shift); rendered: world_summary_c113.md "## What Moved" > "### approval-shift"
  - [45] approval/district-sentiment | Oakland Alternative Response Initiative sitting (0, capped); Fruitvale Transit Hub Phase II — Visioning sitting (0, capped); Oakland Youth Apprenticeship Pipeline silence (-3); level target 63 (mood +1.16 (district 1.25, city 1.08), district +0.12 vs middle, press +1) → +0 — Ripple_Ledger cycle 113 (CauseType approval-shift); rendered: world_summary_c113.md "## What Moved" > "### approval-shift"

