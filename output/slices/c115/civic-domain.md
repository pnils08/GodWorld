# Civic Domain Slice — C115

- Shared source entries: 111
- Empty: no

## Carmen Delaine (`carmen-delaine`)
- Domain: civic-ledger
- Pulse: West Oakland Stabilization Fund | Status passed | phase disbursement-active
- Ref: Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c115.json snapshots.Initiative_Tracker; storyline INIT-001:disbursement-active
- Candidates:
  - [55] West Oakland Stabilization Fund | Status passed | phase disbursement-active — Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c115.json snapshots.Initiative_Tracker; storyline INIT-001:disbursement-active
  - [55] West Oakland Stabilization Fund | Publish C114 closeout and complete charter renewal draft C115 — Initiative_Tracker (InitiativeID INIT-001); storyline INIT-001:disbursement-active
  - [55] Oakland Alternative Response Initiative | Status passed | phase dispatch-live — Initiative_Tracker (InitiativeID INIT-002); snapshot: engine_audit_c115.json snapshots.Initiative_Tracker; storyline INIT-002:dispatch-live
  - [55] Oakland Alternative Response Initiative | Execute and document D3 East Oakland community briefing C115 — Initiative_Tracker (InitiativeID INIT-002); storyline INIT-002:dispatch-live
  - [55] Fruitvale Transit Hub Phase II — Visioning | Deliver schematics and conduct documented Fruitvale community review C115 — Initiative_Tracker (InitiativeID INIT-003); storyline INIT-003:design-phase
  - [55] Temescal Community Health Center | Status passed | phase operational — Initiative_Tracker (InitiativeID INIT-005); snapshot: engine_audit_c115.json snapshots.Initiative_Tracker; storyline INIT-005:operational
- TrackerFacts (beat dump, record facts):
  - Fruitvale Transit Hub Phase II — Visioning — status passed, phase complete, VoteCycle 86, outcome COMPLETED, budget $230M [Initiative_Tracker]
  - Baylight District — Final Council Vote — status passed, phase complete, VoteCycle 83, outcome PASSED, budget $2.1B [Initiative_Tracker]
  - Oakland Youth Apprenticeship Pipeline — status passed, phase implementation-active, budget $12.5M [Initiative_Tracker]
  - Commercial Stabilization for Grand Lake — status failed, phase vote-scheduled, VoteCycle 116, outcome FAILED, budget $2.5M [Initiative_Tracker]
  - West Oakland Tenant Defense Fund — status failed, phase vote-scheduled, VoteCycle 112, outcome FAILED, budget $4.2M [Initiative_Tracker]
  - Ivy Hill Community Support Initiative — status pending-vote, phase vote-scheduled, VoteCycle 116, budget $2.5M [Initiative_Tracker]
  - Laurel Neighborhood Patch and Clean-Up — status proposed, phase announced, budget $6M [Initiative_Tracker]
  - Mayor — Avery Santana — approval 72 — active [Civic_Office_Ledger]
- The city's money (beat dump, record facts):
  - City treasury this cycle took in $5.1M: $5M the weekly budget allocation, $107,362 court money on 24 cleared charges [City_Treasury]
  - City treasury balance at the close: $126.6M (from $121.5M) [City_Treasury]

## Luis Navarro (`luis-navarro`)
- Domain: accountability-anomaly
- Pulse: stuck-initiative (low) | Initiative "Oakland Youth Apprenticeship Pipeline" in phase "implementation-active" for 3 cycles
- Ref: output/engine_audit_c115.json patterns[0]; evidence: Initiative_Tracker row(s) 7; storyline INIT-007:implementation-active
- Candidates:
  - [80] stuck-initiative (low) | Initiative "Oakland Youth Apprenticeship Pipeline" in phase "implementation-active" for 3 cycles — output/engine_audit_c115.json patterns[0]; evidence: Initiative_Tracker row(s) 7; storyline INIT-007:implementation-active
  - [80] math-imbalance (low) | West Oakland: decay [Sentiment -0.100, HousingPressure +1.000] — Sentiment now 0.31 (1 of 22, city median -0.015); HousingPressure now 4.5 (16 of 22, city median 0) — despite 2 active mitigator(s) [INIT-001, INIT-007] — output/engine_audit_c115.json patterns[1]; evidence: Neighborhood_Map row(s) 5
  - [80] math-imbalance (low) | Fruitvale: decay [Sentiment -0.030, HousingPressure +1.000] — Sentiment now 0.29 (2 of 22, city median -0.015); HousingPressure now 8.5 (19 of 22, city median 0) — despite 1 active mitigator(s) [INIT-007] — output/engine_audit_c115.json patterns[2]; evidence: Neighborhood_Map row(s) 6; storyline INIT-007:implementation-active
  - [80] math-imbalance (low) | Jack London: decay [Sentiment -0.070, HousingPressure +0.500] — Sentiment now 0.2 (3 of 22, city median -0.015); HousingPressure now 10 (21 of 22, city median 0) — despite 1 active mitigator(s) [INIT-006] — output/engine_audit_c115.json patterns[3]; evidence: Neighborhood_Map row(s) 7; storyline INIT-006:construction-active
  - [80] math-imbalance (medium) | San Antonio: decay [Sentiment -0.200, RetailVitality -1.21] — Sentiment now -0.16 (22 of 22, city median -0.015); RetailVitality now 5.22 (21 of 22, city median 8.945) — with no matching active initiative — output/engine_audit_c115.json patterns[4]; evidence: Neighborhood_Map row(s) 18
  - [80] math-imbalance (medium) | KONO: decay [Sentiment -0.180, HousingPressure +0.500] — Sentiment now -0.02 (12 of 22, city median -0.015); HousingPressure now 0.5 (14 of 22, city median 0) — with no matching active initiative — output/engine_audit_c115.json patterns[5]; evidence: Neighborhood_Map row(s) 19
- Stalling initiatives (unchanged vs prev cycle, colour):
  - West Oakland Stabilization Fund — still passed / disbursement-active (unchanged since C114) [Initiative_Tracker]
  - Oakland Alternative Response Initiative — still passed / dispatch-live (unchanged since C114) [Initiative_Tracker]
  - Temescal Community Health Center — still passed / operational (unchanged since C114) [Initiative_Tracker]
  - Downtown Economic Revitalization — still failed / vote-scheduled (unchanged since C114) [Initiative_Tracker]
  - Ivy Hill Revitalization Initiative — still failed / announced (unchanged since C114) [Initiative_Tracker]
  - Dimond Revitalization Initiative — still failed / announced (unchanged since C114) [Initiative_Tracker]
  - Ivy Hill Community Revitalization — still failed / announced (unchanged since C114) [Initiative_Tracker]
- Faction standings (colour):
  - OPP: 6 offices (5 voting) — Avery Santana, Caleb Reyes, Denise Carter [Civic_Office_Ledger]
  - IND: 3 offices (2 voting) — Clarissa Dane, Leonard Tran, Ramon Vega [Civic_Office_Ledger]
  - CRC: 3 offices (3 voting) — Elliott Crane, Warren Ashford, Nina Chen [Civic_Office_Ledger]
  - STAFF: 27 offices — Laila Cortez, Marcus Osei, Brenda Okoro [Civic_Office_Ledger]
- City hooks (colour, not fact):
  - Multiple neighborhood demographic shifts detected this cycle. City-wide population dynamics story. — angle: investigative angle

## Trevor Shimizu (`trevor-shimizu`)
- Domain: infrastructure-transit
- Pulse: The transit initiative carrying Fruitvale has not advanced in 3 cycles.
- Ref: output/engine_audit_c115.json patterns[2]; evidence: Neighborhood_Map row(s) 6; storyline INIT-007:implementation-active
- Candidates:
  - [45] math-imbalance (low) | Fruitvale: decay [Sentiment -0.030, HousingPressure +1.000] — Sentiment now 0.29 (2 of 22, city median -0.015); HousingPressure now 8.5 (19 of 22, city median 0) — despite 1 active mitigator(s) [INIT-007] — output/engine_audit_c115.json patterns[2]; evidence: Neighborhood_Map row(s) 6; storyline INIT-007:implementation-active
  - [45] math-imbalance (low) | Jack London: decay [Sentiment -0.070, HousingPressure +0.500] — Sentiment now 0.2 (3 of 22, city median -0.015); HousingPressure now 10 (21 of 22, city median 0) — despite 1 active mitigator(s) [INIT-006] — output/engine_audit_c115.json patterns[3]; evidence: Neighborhood_Map row(s) 7; storyline INIT-006:construction-active
  - [45] Fruitvale Transit Hub Phase II — Visioning | Deliver schematics and conduct documented Fruitvale community review C115 — Initiative_Tracker (InitiativeID INIT-003); storyline INIT-003:design-phase
  - [45] Baylight District — Final Council Vote | C115 construction milestone review against the assembled evidence file C115 — Initiative_Tracker (InitiativeID INIT-006); storyline INIT-006:construction-active
  - [45] INFRASTRUCTURE coverage reaction | Citywide reaction: last week's Tribune INFRASTRUCTURE coverage rated -3 (negative, 1 article, Trevor Shimizu). — Ripple_Ledger cycle 115 (CauseType coverage-reaction); rendered: world_summary_c115.md "## What Moved" > "### coverage-reaction"
  - [45] retail/traffic/sentiment | Fruitvale Transit Hub Phase II — Visioning is design-phase — ongoing transit effects in Fruitvale; the city feels it through these neighborhoods — Ripple_Ledger cycle 115 (CauseType initiative-implementation); rendered: world_summary_c115.md "## What Moved" > "### initiative-implementation"; storyline INIT-003:design-phase

## Dr. Lila Mezran (`lila-mezran`)
- Domain: health
- Pulse: Howard Travis caught up on sleep and woke up feeling like themselves again (Piedmont Ave).
- Ref: output/world_summary_c115.md "## Who Lived It ### Recovering"
- Candidates:
  - [80] Howard Travis — caught up on sleep and woke up feeling like themselves again — output/world_summary_c115.md "## Who Lived It ### Recovering"
  - [45] sentiment/communityEngagement/publicSpaces | Temescal Community Health Center is operational — ongoing health effects in Temescal; the city feels it through these neighborhoods — Ripple_Ledger cycle 115 (CauseType initiative-implementation); rendered: world_summary_c115.md "## What Moved" > "### initiative-implementation"; storyline INIT-005:operational
  - [45] approval/district-sentiment | West Oakland Stabilization Fund sitting (0, capped); Oakland Alternative Response Initiative sitting (0, capped); Fruitvale Transit Hub Phase II — Visioning sitting (0, capped); Temescal Community Health Center sitting (0, capped); Baylight District — Final Council Vote sitting (0, capped); Oakland… — Ripple_Ledger cycle 115 (CauseType approval-shift); rendered: world_summary_c115.md "## What Moved" > "### approval-shift"
  - [45] approval/district-sentiment | Temescal Community Health Center sitting (0, capped); level target 56 (mood +0.73 (district 0.76, city 0.70), district -0.00 vs middle) → -1; integrity band 1 scales scandal chance x0.75 — Ripple_Ledger cycle 115 (CauseType approval-shift); rendered: world_summary_c115.md "## What Moved" > "### approval-shift"
  - [45] Warren Ashford (council d7): Enforce intake audits on the Temescal Community Health Center balance and demand commercial support for Rockridge. — "Clinical dollars require clinical proof, and Rockridge's commercial vital — output/civic-voice/council_d7_c115.json
  - [45] Bobby Chen-Ramirez (health center): Formalize the quarterly intake audit as a standing filing to HCAI and the Council Clerk, paired with a recurring merchant-and-clinic-staff verification walkthrough at Telegraph & 47th, — output/civic-voice/health_center_c115.json

## Noah Tan (`noah-tan`)
- Domain: environment
- Pulse: FAITH — interfaith_dialogue — Adams Point: interfaith prayer breakfast brings leaders together at Adams Point
- Ref: output/world_summary_c115.md ## World Events
- Candidates:
  - [80] FAITH — interfaith_dialogue — Adams Point: interfaith prayer breakfast brings leaders together at Adams Point — output/world_summary_c115.md ## World Events
  - [80] FAITH — community_program — Lake Merritt: Cathedral of the Living Word: after-school tutoring program expands — output/world_summary_c115.md ## World Events
  - [80] FAITH — community_program — East Oakland: Masjid An-Nur Oakland: seniors lunch program marks milestone — output/world_summary_c115.md ## World Events
  - [80] FAITH — community_program — Chinatown: Bay Pure Land Buddhist Temple: job training workshop begins new session — output/world_summary_c115.md ## World Events
  - [80] FAITH — outreach — Downtown: Telegraph Presbyterian Fellowship: prison ministry team visits facility — output/world_summary_c115.md ## World Events
  - [80] Civic Watch Patio in Glenview is quiet; movement restricted on this weather. — output/world_summary_c115.md ## Evening Texture

## Angela Reyes (`angela-reyes`)
- Domain: education-youth
- Pulse: stuck-initiative (low) | Initiative "Oakland Youth Apprenticeship Pipeline" in phase "implementation-active" for 3 cycles
- Ref: output/engine_audit_c115.json patterns[0]; evidence: Initiative_Tracker row(s) 7; storyline INIT-007:implementation-active
- Candidates:
  - [45] stuck-initiative (low) | Initiative "Oakland Youth Apprenticeship Pipeline" in phase "implementation-active" for 3 cycles — output/engine_audit_c115.json patterns[0]; evidence: Initiative_Tracker row(s) 7; storyline INIT-007:implementation-active
  - [45] math-imbalance (low) | Fruitvale: decay [Sentiment -0.030, HousingPressure +1.000] — Sentiment now 0.29 (2 of 22, city median -0.015); HousingPressure now 8.5 (19 of 22, city median 0) — despite 1 active mitigator(s) [INIT-007] — output/engine_audit_c115.json patterns[2]; evidence: Neighborhood_Map row(s) 6; storyline INIT-007:implementation-active
  - [45] cascade-failure (medium) | Initiative "Oakland Youth Apprenticeship Pipeline" active but 2/3 affected neighborhoods show no signal — output/engine_audit_c115.json patterns[7]; evidence: Initiative_Tracker row(s) 7; storyline INIT-007:implementation-active
  - [45] Oakland Youth Apprenticeship Pipeline | Publish placement-gap analysis and program adjustment plan C115 — Initiative_Tracker (InitiativeID INIT-007); storyline INIT-007:implementation-active
  - [45] sentiment/communityEngagement/retail | Oakland Youth Apprenticeship Pipeline is implementation-active — ongoing workforce effects in West Oakland, East Oakland, Fruitvale; the city feels it through these neighborhoods — Ripple_Ledger cycle 115 (CauseType initiative-implementation); rendered: world_summary_c115.md "## What Moved" > "### initiative-implementation"; storyline INIT-007:implementation-active
  - [45] approval/district-sentiment | West Oakland Stabilization Fund sitting (0, capped); Oakland Alternative Response Initiative sitting (0, capped); Oakland Youth Apprenticeship Pipeline sitting (0, capped); West Oakland Tenant Defense Fund sitting (0, capped); level target 57 (mood +0.80 (district 0.89, city 0.70), district +0.12 v… — Ripple_Ledger cycle 115 (CauseType approval-shift); rendered: world_summary_c115.md "## What Moved" > "### approval-shift"
