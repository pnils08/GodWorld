# Civic Domain Slice — C116

- Shared source entries: 148
- Empty: no

## Carmen Delaine (`carmen-delaine`)
- Domain: civic-ledger
- Pulse: West Oakland Stabilization Fund | Status passed | phase disbursement-active
- Ref: Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c116.json snapshots.Initiative_Tracker; storyline INIT-001:disbursement-active
- Candidates:
  - [55] West Oakland Stabilization Fund | Status passed | phase disbursement-active — Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c116.json snapshots.Initiative_Tracker; storyline INIT-001:disbursement-active
  - [55] West Oakland Stabilization Fund | Council consideration of the charter renewal ordinance C116 — Initiative_Tracker (InitiativeID INIT-001); storyline INIT-001:disbursement-active
  - [55] Oakland Alternative Response Initiative | Status passed | phase dispatch-live — Initiative_Tracker (InitiativeID INIT-002); snapshot: engine_audit_c116.json snapshots.Initiative_Tracker; storyline INIT-002:dispatch-live
  - [55] Oakland Alternative Response Initiative | Execute and publish the D3 briefing record with district-level and Fruitvale data C116 — Initiative_Tracker (InitiativeID INIT-002); storyline INIT-002:dispatch-live
  - [55] Fruitvale Transit Hub Phase II — Visioning | Status passed | phase complete — Initiative_Tracker (InitiativeID INIT-003); snapshot: engine_audit_c116.json snapshots.Initiative_Tracker; storyline INIT-003:complete
  - [55] Temescal Community Health Center | Status passed | phase operational — Initiative_Tracker (InitiativeID INIT-005); snapshot: engine_audit_c116.json snapshots.Initiative_Tracker; storyline INIT-005:operational
- TrackerFacts (beat dump, record facts):
  - Fruitvale Transit Hub Phase II — Visioning — status passed, phase design-phase, VoteCycle 86, outcome COMPLETED, budget $230M [Initiative_Tracker]
  - Baylight District — Final Council Vote — status passed, phase construction-active, VoteCycle 83, outcome PASSED, budget $2.1B [Initiative_Tracker]
  - Oakland Youth Apprenticeship Pipeline — status passed, phase stalled, budget $12.5M [Initiative_Tracker]
  - Downtown Economic Revitalization — status proposed, phase vote-scheduled, budget $15M [Initiative_Tracker]
  - Commercial Stabilization for Grand Lake — status proposed, phase vote-scheduled, budget $2.5M [Initiative_Tracker]
  - West Oakland Tenant Defense Fund — status passed, phase operational, VoteCycle 112, outcome PASSED, budget $4.2M [Initiative_Tracker]
  - Ivy Hill Revitalization Initiative — status proposed, phase legislation-filed, budget $2.5M [Initiative_Tracker]
  - Dimond Revitalization Initiative — status proposed, phase announced, budget $2.5M [Initiative_Tracker]
- The city's money (beat dump, record facts):
  - City treasury this cycle took in $5.1M: $5M the weekly budget allocation, $917 2 tickets, $108,884 court money on 24 cleared charges [City_Treasury]
  - City treasury balance at the close: $131.8M (from $126.6M) [City_Treasury]

## Luis Navarro (`luis-navarro`)
- Domain: accountability-anomaly
- Pulse: stuck-initiative (medium) | Initiative "Oakland Youth Apprenticeship Pipeline" in phase "implementation-active" for 4 cycles
- Ref: output/engine_audit_c116.json patterns[0]; evidence: Initiative_Tracker row(s) 7; storyline INIT-007:implementation-active
- Candidates:
  - [80] stuck-initiative (medium) | Initiative "Oakland Youth Apprenticeship Pipeline" in phase "implementation-active" for 4 cycles — output/engine_audit_c116.json patterns[0]; evidence: Initiative_Tracker row(s) 7; storyline INIT-007:implementation-active
  - [80] math-imbalance (medium) | Piedmont Ave: decay [RetailVitality -1.45, HousingPressure +0.500] — RetailVitality now 12.94 (7 of 22, city median 9.21); HousingPressure now 0.5 (13 of 22, city median 0); Sentiment now 0.21 (5 of 22, city median 0.06) — with no matching active initiative — output/engine_audit_c116.json patterns[1]; evidence: Neighborhood_Map row(s) 11
  - [80] math-imbalance (medium) | KONO: decay [RetailVitality -1.06, HousingPressure +1.000] — RetailVitality now 8.68 (12 of 22, city median 9.21); HousingPressure now 1.5 (15 of 22, city median 0); Sentiment now 0.05 (15 of 22, city median 0.06) — with no matching active initiative — output/engine_audit_c116.json patterns[2]; evidence: Neighborhood_Map row(s) 19
  - [80] coverage-gap (medium) | Domain "faith" produced 5 events this cycle with zero Tribune coverage last cycle — output/engine_audit_c116.json patterns[3]; evidence: WorldEvents_V3_Ledger row(s)
  - [80] production-imbalance (medium) | 18 neighborhoods report migration flow with zero economic events this cycle — output/engine_audit_c116.json patterns[4]; evidence: Neighborhood_Map row(s)
  - [80] improvement (low) | Initiative "Fruitvale Transit Hub Phase II — Visioning" advanced: design-phase → complete — output/engine_audit_c116.json patterns[5]; evidence: Initiative_Tracker row(s) 4; storyline INIT-003:complete
- Stalling initiatives (unchanged vs prev cycle, colour):
  - West Oakland Stabilization Fund — still passed / disbursement-active (unchanged since C115) [Initiative_Tracker]
  - Oakland Alternative Response Initiative — still passed / dispatch-live (unchanged since C115) [Initiative_Tracker]
  - Temescal Community Health Center — still passed / operational (unchanged since C115) [Initiative_Tracker]
  - Laurel Neighborhood Patch and Clean-Up — still proposed / announced (unchanged since C115) [Initiative_Tracker]
- Faction standings (colour):
  - OPP: 6 offices (5 voting) — Avery Santana, Caleb Reyes, Denise Carter [Civic_Office_Ledger]
  - IND: 3 offices (2 voting) — Clarissa Dane, Leonard Tran, Ramon Vega [Civic_Office_Ledger]
  - CRC: 3 offices (3 voting) — Elliott Crane, Warren Ashford, Nina Chen [Civic_Office_Ledger]
  - STAFF: 27 offices — Laila Cortez, Marcus Osei, Brenda Okoro [Civic_Office_Ledger]
- City hooks (colour, not fact):
  - Multiple civic signals detected. Could be coincidence or early pattern. — angle: investigative angle
  - INITIATIVE FAILED: "Ivy Hill Community Support Initiative" rejected by council. Political fallout, opposition reaction, what's next angles. — angle: investigative angle

## Trevor Shimizu (`trevor-shimizu`)
- Domain: infrastructure-transit
- Pulse: Fruitvale Transit Hub Phase II — Visioning advanced from design-phase to complete; a milestone worth covering, not burying.
- Ref: output/engine_audit_c116.json patterns[5]; evidence: Initiative_Tracker row(s) 4; storyline INIT-003:complete
- Candidates:
  - [45] improvement (low) | Initiative "Fruitvale Transit Hub Phase II — Visioning" advanced: design-phase → complete — output/engine_audit_c116.json patterns[5]; evidence: Initiative_Tracker row(s) 4; storyline INIT-003:complete
  - [45] improvement (low) | Initiative "Baylight District — Final Council Vote" advanced: construction-active → complete — output/engine_audit_c116.json patterns[6]; evidence: Initiative_Tracker row(s) 6; storyline INIT-006:complete
  - [45] Fruitvale Transit Hub Phase II — Visioning | Status passed | phase complete — Initiative_Tracker (InitiativeID INIT-003); snapshot: engine_audit_c116.json snapshots.Initiative_Tracker; storyline INIT-003:complete
  - [45] retail/traffic/sentiment | Fruitvale Transit Hub Phase II — Visioning is complete — ongoing transit effects in Fruitvale; the city feels it through these neighborhoods — Ripple_Ledger cycle 116 (CauseType initiative-implementation); rendered: world_summary_c116.md "## What Moved" > "### initiative-implementation"; storyline INIT-003:complete
  - [45] retail/nightlife/traffic/sentiment | Baylight District — Final Council Vote is complete — ongoing sports effects in Jack London, Downtown; the city feels it through these neighborhoods — Ripple_Ledger cycle 116 (CauseType initiative-implementation); rendered: world_summary_c116.md "## What Moved" > "### initiative-implementation"; storyline INIT-006:complete
  - [45] gridlock | Gridlock day — traffic index 79, worst on I-880 South with game-day crowds — Ripple_Ledger cycle 116 (CauseType transit-event); rendered: world_summary_c116.md "## What Moved" > "### transit-event"

## Dr. Lila Mezran (`lila-mezran`)
- Domain: health
- Pulse: Piedmont Ave is carrying a recorded health cluster this Cycle: Medium-severity health spike in Piedmont Ave (impactScore 25).
- Ref: output/world_summary_c116.md "## World Events"
- Candidates:
  - [60] Piedmont Ave health cluster (crisis-spike) | Medium-severity health spike in Piedmont Ave (impactScore 25) — output/world_summary_c116.md "## World Events"
  - [45] sentiment/communityEngagement/publicSpaces | Temescal Community Health Center is operational — ongoing health effects in Temescal; the city feels it through these neighborhoods — Ripple_Ledger cycle 116 (CauseType initiative-implementation); rendered: world_summary_c116.md "## What Moved" > "### initiative-implementation"; storyline INIT-005:operational
  - [45] approval/district-sentiment | West Oakland Stabilization Fund sitting (0, capped); Oakland Alternative Response Initiative sitting (0, capped); Fruitvale Transit Hub Phase II — Visioning completed (+3); Temescal Community Health Center sitting (0, capped); Baylight District — Final Council Vote completed (+3); Oakland Youth App… — Ripple_Ledger cycle 116 (CauseType approval-shift); rendered: world_summary_c116.md "## What Moved" > "### approval-shift"
  - [45] approval/district-sentiment | Temescal Community Health Center sitting (0, capped); level target 58 (mood +0.54 (district 0.56, city 0.52), district +0.07 vs middle, press +1) → -1; integrity band 1 scales scandal chance x0.75 — Ripple_Ledger cycle 116 (CauseType approval-shift); rendered: world_summary_c116.md "## What Moved" > "### approval-shift"
  - [45] Avery Santana (mayor gavel): Require the Q3 clinical intake audit filing with HCAI and the Council Clerk and completion of the Telegraph and 47th merchant walkthrough before certifying operational oversight. — "Temescal' — output/civic-voice/mayor_gavel_c116.json
  - [45] Brenda Okoro (okoro): Request public status reports from the responsible departments on Glenview's medium-severity public-works spike and Piedmont Avenue's medium-severity health spike — what happened, what's resolved, n — output/civic-voice/okoro_c116.json

## Noah Tan (`noah-tan`)
- Domain: environment
- Pulse: FAITH — community_program — Fruitvale: St. Esperanza Parish: job training workshop begins new session
- Ref: output/world_summary_c116.md ## World Events
- Candidates:
  - [80] FAITH — community_program — Fruitvale: St. Esperanza Parish: job training workshop begins new session — output/world_summary_c116.md ## World Events
  - [80] FAITH — community_program — West Oakland: New Covenant Pentecostal Assembly: seniors lunch program marks milestone — output/world_summary_c116.md ## World Events
  - [80] FAITH — community_program — Rockridge: Temple Beth Or: food pantry serves neighbors in need — output/world_summary_c116.md ## World Events
  - [80] FAITH — community_program — Piedmont Ave: B'nai Tikvah Synagogue: food pantry serves neighbors in need — output/world_summary_c116.md ## World Events
  - [80] FAITH — community_program — Grand Lake: Or Hashalom Renewal Community: job training workshop begins new session — output/world_summary_c116.md ## World Events
  - [80] Bridge & Barrel in Jack London is quiet; movement restricted on this weather. — output/world_summary_c116.md ## Evening Texture

## Angela Reyes (`angela-reyes`)
- Domain: education-youth
- Pulse: stuck-initiative (medium) | Initiative "Oakland Youth Apprenticeship Pipeline" in phase "implementation-active" for 4 cycles
- Ref: output/engine_audit_c116.json patterns[0]; evidence: Initiative_Tracker row(s) 7; storyline INIT-007:implementation-active
- Candidates:
  - [45] stuck-initiative (medium) | Initiative "Oakland Youth Apprenticeship Pipeline" in phase "implementation-active" for 4 cycles — output/engine_audit_c116.json patterns[0]; evidence: Initiative_Tracker row(s) 7; storyline INIT-007:implementation-active
  - [45] Oakland Youth Apprenticeship Pipeline | Status passed | phase implementation-active — Initiative_Tracker (InitiativeID INIT-007); snapshot: engine_audit_c116.json snapshots.Initiative_Tracker; storyline INIT-007:implementation-active
  - [45] Oakland Youth Apprenticeship Pipeline | Publish the placement-gap analysis and program adjustment plan C116 — Initiative_Tracker (InitiativeID INIT-007); storyline INIT-007:implementation-active
  - [45] sentiment/communityEngagement/retail | Oakland Youth Apprenticeship Pipeline is implementation-active — ongoing workforce effects in West Oakland, East Oakland, Fruitvale; the city feels it through these neighborhoods — Ripple_Ledger cycle 116 (CauseType initiative-implementation); rendered: world_summary_c116.md "## What Moved" > "### initiative-implementation"; storyline INIT-007:implementation-active
  - [45] approval/district-sentiment | West Oakland Stabilization Fund sitting (0, capped); Oakland Alternative Response Initiative sitting (0, capped); Fruitvale Transit Hub Phase II — Visioning completed (+3); Temescal Community Health Center sitting (0, capped); Baylight District — Final Council Vote completed (+3); Oakland Youth App… — Ripple_Ledger cycle 116 (CauseType approval-shift); rendered: world_summary_c116.md "## What Moved" > "### approval-shift"
  - [45] approval/district-sentiment | West Oakland Stabilization Fund sitting (0, capped); Oakland Alternative Response Initiative sitting (0, capped); Oakland Youth Apprenticeship Pipeline sitting (0, capped); West Oakland Tenant Defense Fund advanced (+2); level target 59 (mood +0.63 (district 0.74, city 0.52), district +0.26 vs midd… — Ripple_Ledger cycle 116 (CauseType approval-shift); rendered: world_summary_c116.md "## What Moved" > "### approval-shift"
