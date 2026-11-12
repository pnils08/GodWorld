# Civic Domain Slice — C114

- Shared source entries: 134
- Empty: no

## Carmen Delaine (`carmen-delaine`)
- Domain: civic-ledger
- Pulse: West Oakland Stabilization Fund | Status passed | phase disbursement-active
- Ref: Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c114.json snapshots.Initiative_Tracker; storyline INIT-001:disbursement-active
- Candidates:
  - [55] West Oakland Stabilization Fund | Status passed | phase disbursement-active — Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c114.json snapshots.Initiative_Tracker; storyline INIT-001:disbursement-active
  - [55] West Oakland Stabilization Fund | Month-12 disbursement execution and charter renewal drafting C114 — Initiative_Tracker (InitiativeID INIT-001); storyline INIT-001:disbursement-active
  - [55] Oakland Alternative Response Initiative | Status passed | phase dispatch-live — Initiative_Tracker (InitiativeID INIT-002); snapshot: engine_audit_c114.json snapshots.Initiative_Tracker; storyline INIT-002:dispatch-live
  - [55] Oakland Alternative Response Initiative | D3 community briefing execution C114 — Initiative_Tracker (InitiativeID INIT-002); storyline INIT-002:dispatch-live
  - [55] Fruitvale Transit Hub Phase II — Visioning | Preliminary schematics community review C114 — Initiative_Tracker (InitiativeID INIT-003); storyline INIT-003:design-phase
  - [55] Temescal Community Health Center | Status passed | phase operational — Initiative_Tracker (InitiativeID INIT-005); snapshot: engine_audit_c114.json snapshots.Initiative_Tracker; storyline INIT-005:operational
- TrackerFacts (beat dump, record facts):
  - Commercial Stabilization for Grand Lake — status failed, phase vote-ready, outcome FAILED, budget $2.5M [Initiative_Tracker]
  - Ivy Hill Community Support Initiative — status proposed, phase announced, budget $2.5M [Initiative_Tracker]
  - Mayor — Avery Santana — approval 73 — active [Civic_Office_Ledger]
  - District Attorney — Clarissa Dane — approval 65 — active [Civic_Office_Ledger]
  - Public Defender — Caleb Reyes — approval 65 — active [Civic_Office_Ledger]
  - City Council District 1 — Denise Carter — approval 64 — active [Civic_Office_Ledger]
  - City Council District 2 — Leonard Tran — approval 69 — active [Civic_Office_Ledger]
  - City Council District 3 — Rose Delgado — approval 60 — active [Civic_Office_Ledger]
- The city's money (beat dump, record facts):
  - City treasury this cycle took in $5.2M: $5M the weekly budget allocation, $193,849 court money on 43 cleared charges [City_Treasury]
  - City treasury balance at the close: $121.5M (from $116.3M) [City_Treasury]
- City hooks (colour, not fact):
  - Multiple neighborhood demographic shifts detected this cycle. City-wide population dynamics story. — angle: investigative angle

## Luis Navarro (`luis-navarro`)
- Domain: accountability-anomaly
- Pulse: math-imbalance (medium) | Laurel: decay [Sentiment -0.030, RetailVitality -3.00] — Sentiment now -0.03 (20 of 22, city median 0.085); RetailVitality now 4.34 (22 of 22, city median 8.265) — with no matching active initiative
- Ref: output/engine_audit_c114.json patterns[0]; evidence: Neighborhood_Map row(s) 4
- Candidates:
  - [80] math-imbalance (medium) | Laurel: decay [Sentiment -0.030, RetailVitality -3.00] — Sentiment now -0.03 (20 of 22, city median 0.085); RetailVitality now 4.34 (22 of 22, city median 8.265) — with no matching active initiative — output/engine_audit_c114.json patterns[0]; evidence: Neighborhood_Map row(s) 4
  - [80] math-imbalance (high) | Rockridge: decay [Sentiment -0.030, RetailVitality -2.16, HousingPressure +1.000] — Sentiment now 0.03 (17 of 22, city median 0.085); RetailVitality now 10.98 (8 of 22, city median 8.265); HousingPressure now 5 (17 of 22, city median 0) — with no matching active initiative — output/engine_audit_c114.json patterns[1]; evidence: Neighborhood_Map row(s) 8
  - [80] coverage-gap (medium) | Domain "faith" produced 5 events this cycle with zero Tribune coverage last cycle — output/engine_audit_c114.json patterns[2]; evidence: WorldEvents_V3_Ledger row(s)
  - [80] cascade-failure (medium) | Initiative "Oakland Youth Apprenticeship Pipeline" active but 2/3 affected neighborhoods show no signal — output/engine_audit_c114.json patterns[3]; evidence: Initiative_Tracker row(s) 7; storyline INIT-007:implementation-active
  - [80] improvement (low) | Initiative "Downtown Economic Revitalization" advanced: legislation-filed → vote-scheduled — output/engine_audit_c114.json patterns[4]; evidence: Initiative_Tracker row(s) 8; storyline INIT-008:vote-scheduled
  - [80] improvement (low) | Initiative "Commercial Stabilization for Grand Lake" advanced: legislation-filed → announced — output/engine_audit_c114.json patterns[5]; evidence: Initiative_Tracker row(s) 9; storyline INIT-009:announced
- Stalling initiatives (unchanged vs prev cycle, colour):
  - West Oakland Stabilization Fund — still passed / disbursement-active (unchanged since C113) [Initiative_Tracker]
  - Oakland Alternative Response Initiative — still passed / dispatch-live (unchanged since C113) [Initiative_Tracker]
  - Fruitvale Transit Hub Phase II — Visioning — still passed / design-phase (unchanged since C113) [Initiative_Tracker]
  - Temescal Community Health Center — still passed / operational (unchanged since C113) [Initiative_Tracker]
  - Baylight District — Final Council Vote — still passed / construction-active (unchanged since C113) [Initiative_Tracker]
  - Oakland Youth Apprenticeship Pipeline — still announced / implementation-active (unchanged since C113) [Initiative_Tracker]
  - Downtown Economic Revitalization — still failed / vote-scheduled (unchanged since C113) [Initiative_Tracker]
  - West Oakland Tenant Defense Fund — still failed / announced (unchanged since C113) [Initiative_Tracker]
  - Ivy Hill Revitalization Initiative — still failed / announced (unchanged since C113) [Initiative_Tracker]
  - Dimond Revitalization Initiative — still failed / announced (unchanged since C113) [Initiative_Tracker]
  - Ivy Hill Community Revitalization — still failed / announced (unchanged since C113) [Initiative_Tracker]
- Faction standings (colour):
  - OPP: 6 offices (5 voting) — Avery Santana, Caleb Reyes, Denise Carter [Civic_Office_Ledger]
  - IND: 3 offices (2 voting) — Clarissa Dane, Leonard Tran, Ramon Vega [Civic_Office_Ledger]
  - CRC: 3 offices (3 voting) — Elliott Crane, Warren Ashford, Nina Chen [Civic_Office_Ledger]
  - STAFF: 27 offices — Laila Cortez, Marcus Osei, Brenda Okoro [Civic_Office_Ledger]
- City hooks (colour, not fact):
  - Multiple civic signals detected. Could be coincidence or early pattern. — angle: investigative angle

## Trevor Shimizu (`trevor-shimizu`)
- Domain: infrastructure-transit
- Pulse: INIT-006 posted a positive, named-cause result; a milestone worth covering, not burying.
- Ref: output/engine_audit_c114.json patterns[16]; evidence: Neighborhood_Map row(s) ; storyline INIT-006:construction-active
- Candidates:
  - [45] improvement (low) | Remedy overshot expectation on Neighborhood_Map.EventAttractiveness: observed 0.24 (expected 0.02) — from prior "math-imbalance" — output/engine_audit_c114.json patterns[16]; evidence: Neighborhood_Map row(s) ; storyline INIT-006:construction-active
  - [45] improvement (low) | Remedy overshot expectation on Neighborhood_Map.EventAttractiveness: observed 0.24 (expected 0.02) — from prior "math-imbalance" — output/engine_audit_c114.json patterns[17]; evidence: Neighborhood_Map row(s) ; storyline INIT-006:construction-active
  - [45] Fruitvale Transit Hub Phase II — Visioning | Preliminary schematics community review C114 — Initiative_Tracker (InitiativeID INIT-003); storyline INIT-003:design-phase
  - [45] Baylight District — Final Council Vote | Construction milestone review C115 — Initiative_Tracker (InitiativeID INIT-006); storyline INIT-006:construction-active
  - [45] retail/traffic/sentiment | Fruitvale Transit Hub Phase II — Visioning is design-phase — ongoing transit effects in Fruitvale; the city feels it through these neighborhoods — Ripple_Ledger cycle 114 (CauseType initiative-implementation); rendered: world_summary_c114.md "## What Moved" > "### initiative-implementation"; storyline INIT-003:design-phase
  - [45] retail/nightlife/traffic/sentiment | Baylight District — Final Council Vote is construction-active — ongoing sports effects in Jack London, Downtown; the city feels it through these neighborhoods — Ripple_Ledger cycle 114 (CauseType initiative-implementation); rendered: world_summary_c114.md "## What Moved" > "### initiative-implementation"; storyline INIT-006:construction-active

## Dr. Lila Mezran (`lila-mezran`)
- Domain: health
- Pulse: Jacob King nursed a sore back after overdoing it around the house (Rockridge).
- Ref: output/world_summary_c114.md "## Who Lived It ### Health"
- Candidates:
  - [80] Jacob King — nursed a sore back after overdoing it around the house — output/world_summary_c114.md "## Who Lived It ### Health"
  - [45] sentiment/communityEngagement/publicSpaces | Temescal Community Health Center is operational — ongoing health effects in Temescal; the city feels it through these neighborhoods — Ripple_Ledger cycle 114 (CauseType initiative-implementation); rendered: world_summary_c114.md "## What Moved" > "### initiative-implementation"; storyline INIT-005:operational
  - [45] approval/district-sentiment | West Oakland Stabilization Fund sitting (0, capped); Oakland Alternative Response Initiative sitting (0, capped); Fruitvale Transit Hub Phase II — Visioning sitting (0, capped); Temescal Community Health Center completed (+3); Baylight District — Final Council Vote sitting (0, capped); Oakland Yout… — Ripple_Ledger cycle 114 (CauseType approval-shift); rendered: world_summary_c114.md "## What Moved" > "### approval-shift"
  - [45] approval/district-sentiment | Temescal Community Health Center completed, opposed (0); level target 57 (mood +0.84 (district 0.88, city 0.81), district +0.03 vs middle) → -2; integrity band 1 scales scandal chance x0.75 — Ripple_Ledger cycle 114 (CauseType approval-shift); rendered: world_summary_c114.md "## What Moved" > "### approval-shift"
  - [45] Warren Ashford (council d7): Attribute Temescal's positive sentiment to frontline shopkeepers and healthcare staff while maintaining strict quarterly clinical verification benchmarks on the facility's remaining operation — output/civic-voice/council_d7_c114.json
  - [45] Roberta "Bobby" Chen-Ramirez (health center): File the C114 quarterly clinical verification packet covering C112–C114 intake by service line (primary care, behavioral health, dental, pharmacy), staffing ratios against li — output/civic-voice/health_center_c114.json

## Noah Tan (`noah-tan`)
- Domain: environment
- Pulse: FAITH — interfaith_dialogue — Chinatown: dialogue series addresses shared concerns at Chinatown
- Ref: output/world_summary_c114.md ## World Events
- Candidates:
  - [80] FAITH — interfaith_dialogue — Chinatown: dialogue series addresses shared concerns at Chinatown — output/world_summary_c114.md ## World Events
  - [80] FAITH — community_program — Lake Merritt: Cathedral of the Living Word: job training workshop begins new session — output/world_summary_c114.md ## World Events
  - [80] FAITH — community_program — Piedmont Ave: B'nai Tikvah Synagogue: seniors lunch program marks milestone — output/world_summary_c114.md ## World Events
  - [80] FAITH — community_program — East Oakland: Masjid An-Nur Oakland: after-school tutoring program expands — output/world_summary_c114.md ## World Events
  - [80] FAITH — community_program — Montclair: Bharat Mandir of the East Bay: food pantry serves neighbors in need — output/world_summary_c114.md ## World Events
  - [80] Restaurants: Grand Avenue Wine Bar (Lake Merritt), Montclair Patisserie (Piedmont Ave), Green & Gold Tavern (Jack London) — output/world_summary_c114.md ## Evening Texture

## Angela Reyes (`angela-reyes`)
- Domain: education-youth
- Pulse: cascade-failure (medium) | Initiative "Oakland Youth Apprenticeship Pipeline" active but 2/3 affected neighborhoods show no signal
- Ref: output/engine_audit_c114.json patterns[3]; evidence: Initiative_Tracker row(s) 7; storyline INIT-007:implementation-active
- Candidates:
  - [45] cascade-failure (medium) | Initiative "Oakland Youth Apprenticeship Pipeline" active but 2/3 affected neighborhoods show no signal — output/engine_audit_c114.json patterns[3]; evidence: Initiative_Tracker row(s) 7; storyline INIT-007:implementation-active
  - [45] Oakland Youth Apprenticeship Pipeline | Placement gap analysis and program adjustment C114 — Initiative_Tracker (InitiativeID INIT-007); storyline INIT-007:implementation-active
  - [45] sentiment/communityEngagement/retail | Oakland Youth Apprenticeship Pipeline is implementation-active — ongoing workforce effects in West Oakland, East Oakland, Fruitvale; the city feels it through these neighborhoods — Ripple_Ledger cycle 114 (CauseType initiative-implementation); rendered: world_summary_c114.md "## What Moved" > "### initiative-implementation"; storyline INIT-007:implementation-active
  - [45] approval/district-sentiment | West Oakland Stabilization Fund sitting (0, capped); Oakland Alternative Response Initiative sitting (0, capped); Oakland Youth Apprenticeship Pipeline sitting (0, capped); West Oakland Tenant Defense Fund advanced (+2); level target 58 (mood +0.90 (district 0.99, city 0.81), district +0.16 vs midd… — Ripple_Ledger cycle 114 (CauseType approval-shift); rendered: world_summary_c114.md "## What Moved" > "### approval-shift"
  - [45] approval/district-sentiment | Oakland Alternative Response Initiative sitting (0, capped); Fruitvale Transit Hub Phase II — Visioning sitting (0, capped); Oakland Youth Apprenticeship Pipeline sitting (0, capped); level target 58 (mood +0.90 (district 0.99, city 0.81), district +0.08 vs middle) → -1 — Ripple_Ledger cycle 114 (CauseType approval-shift); rendered: world_summary_c114.md "## What Moved" > "### approval-shift"
