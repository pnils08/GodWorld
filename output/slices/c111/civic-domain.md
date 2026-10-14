# Civic Domain Slice — C111

- Shared source entries: 116
- Empty: no

## Carmen Delaine (`carmen-delaine`)
- Domain: civic-ledger
- Pulse: West Oakland Stabilization Fund | Status passed | phase disbursement-active
- Ref: Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c111.json snapshots.Initiative_Tracker; storyline INIT-001:disbursement-active
- Candidates:
  - [55] West Oakland Stabilization Fund | Status passed | phase disbursement-active — Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c111.json snapshots.Initiative_Tracker; storyline INIT-001:disbursement-active
  - [55] West Oakland Stabilization Fund | Month-ten disbursement review C111 — Initiative_Tracker (InitiativeID INIT-001); storyline INIT-001:disbursement-active
  - [55] Oakland Alternative Response Initiative | Status passed | phase dispatch-live — Initiative_Tracker (InitiativeID INIT-002); snapshot: engine_audit_c111.json snapshots.Initiative_Tracker; storyline INIT-002:dispatch-live
  - [55] Oakland Alternative Response Initiative | Quarterly outcome report C112 — Initiative_Tracker (InitiativeID INIT-002); storyline INIT-002:dispatch-live
  - [55] Temescal Community Health Center | Status passed | phase operational — Initiative_Tracker (InitiativeID INIT-005); snapshot: engine_audit_c111.json snapshots.Initiative_Tracker; storyline INIT-005:operational
  - [55] Temescal Community Health Center | First quarter utilization review C113 — Initiative_Tracker (InitiativeID INIT-005); storyline INIT-005:operational
- TrackerFacts (beat dump, record facts):
  - Fruitvale Transit Hub Phase II — Visioning — status passed, phase design-phase, VoteCycle 86, outcome COMPLETED, budget $230M [Initiative_Tracker]
  - Oakland Youth Apprenticeship Pipeline — status announced, phase implementation-active, budget $12.5M [Initiative_Tracker]
  - Commercial Stabilization for Grand Lake — status proposed, phase legislation-filed, budget $2.5M [Initiative_Tracker]
  - West Oakland Tenant Defense Fund — status pending-vote, phase vote-scheduled, VoteCycle 112, budget $4.2M [Initiative_Tracker]
  - Ivy Hill Revitalization Initiative — status proposed, phase announced, budget $2.5M [Initiative_Tracker]
  - Mayor — Avery Santana — approval 69 — active [Civic_Office_Ledger]
  - District Attorney — Clarissa Dane — approval 65 — active [Civic_Office_Ledger]
  - Public Defender — Caleb Reyes — approval 65 — active [Civic_Office_Ledger]
- The city's money (beat dump, record facts):
  - City treasury this cycle took in $5.1M: $5M the weekly budget allocation, $135,242 court money on 30 cleared charges [City_Treasury]
  - City treasury balance at the close: $110.3M (from $105.2M) [City_Treasury]
- Engine hooks (colour, not fact):
  - Multiple neighborhood demographic shifts detected this cycle. City-wide population dynamics story. — angle: investigative angle

## Luis Navarro (`luis-navarro`)
- Domain: accountability-anomaly
- Pulse: stuck-initiative (medium) | Initiative "Oakland Youth Apprenticeship Pipeline" in phase "operational" for 4 cycles
- Ref: output/engine_audit_c111.json patterns[1]; evidence: Initiative_Tracker row(s) 7
- Candidates:
  - [80] stuck-initiative (medium) | Initiative "Oakland Youth Apprenticeship Pipeline" in phase "operational" for 4 cycles — output/engine_audit_c111.json patterns[1]; evidence: Initiative_Tracker row(s) 7
  - [80] repeating-event (medium) | Issue "strain" (+ 1 co-occurring tokens) recurred 3 cycles — output/engine_audit_c111.json patterns[2]; evidence: Riley_Digest row(s)
  - [80] math-imbalance (low) | Downtown: decay [Sentiment -0.160, RetailVitality -1.79, HousingPressure +1.000] — Sentiment now 0.46 (5 of 22, city median 0.32); RetailVitality now 11.9 (3 of 22, city median 8.275); HousingPressure now 8 (21 of 22, city median 0) — despite 1 active mitigator(s) [INIT-006] — output/engine_audit_c111.json patterns[3]; evidence: Neighborhood_Map row(s) 2
  - [80] math-imbalance (medium) | Laurel: decay [Sentiment -0.260, RetailVitality -1.04] — Sentiment now 0.32 (11 of 22, city median 0.32); RetailVitality now 6.47 (15 of 22, city median 8.275) — with no matching active initiative — output/engine_audit_c111.json patterns[4]; evidence: Neighborhood_Map row(s) 4
  - [80] math-imbalance (low) | West Oakland: decay [Sentiment -0.150, RetailVitality -1.36, HousingPressure +0.500] — Sentiment now 0.51 (2 of 22, city median 0.32); RetailVitality now 8.65 (10 of 22, city median 8.275); HousingPressure now 1 (14 of 22, city median 0) — despite 1 active mitigator(s) [INIT-001] — output/engine_audit_c111.json patterns[5]; evidence: Neighborhood_Map row(s) 5
  - [80] math-imbalance (high) | Fruitvale: decay [Sentiment -0.170, RetailVitality -2.04, HousingPressure +1.000] — Sentiment now 0.52 (1 of 22, city median 0.32); RetailVitality now 10.55 (5 of 22, city median 8.275); HousingPressure now 4.5 (17 of 22, city median 0) — with no matching active initiative — output/engine_audit_c111.json patterns[6]; evidence: Neighborhood_Map row(s) 6
- Stalling initiatives (unchanged vs prev cycle, colour):
  - West Oakland Stabilization Fund — still passed / disbursement-active (unchanged since C110) [Initiative_Tracker]
  - Oakland Alternative Response Initiative — still passed / dispatch-live (unchanged since C110) [Initiative_Tracker]
  - Temescal Community Health Center — still passed / operational (unchanged since C110) [Initiative_Tracker]
  - Baylight District — Final Council Vote — still passed / construction-active (unchanged since C110) [Initiative_Tracker]
  - Downtown Economic Revitalization — still proposed / legislation-filed (unchanged since C110) [Initiative_Tracker]
- Faction standings (colour):
  - OPP: 6 offices (5 voting) — Avery Santana, Caleb Reyes, Denise Carter [Civic_Office_Ledger]
  - IND: 3 offices (2 voting) — Clarissa Dane, Leonard Tran, Ramon Vega [Civic_Office_Ledger]
  - CRC: 3 offices (3 voting) — Elliott Crane, Warren Ashford, Nina Chen [Civic_Office_Ledger]
  - STAFF: 27 offices — Laila Cortez, Marcus Osei, Brenda Okoro [Civic_Office_Ledger]
- Engine hooks (colour, not fact):
  - Notable event: "Medium-severity civic spike in Fruitvale". Follow-up recommended. — angle: investigative angle [Fruitvale]

## Trevor Shimizu (`trevor-shimizu`)
- Domain: infrastructure-transit
- Pulse: The civic initiative carrying Downtown has not advanced in 1 cycles.
- Ref: output/engine_audit_c111.json patterns[3]; evidence: Neighborhood_Map row(s) 2
- Candidates:
  - [45] math-imbalance (low) | Downtown: decay [Sentiment -0.160, RetailVitality -1.79, HousingPressure +1.000] — Sentiment now 0.46 (5 of 22, city median 0.32); RetailVitality now 11.9 (3 of 22, city median 8.275); HousingPressure now 8 (21 of 22, city median 0) — despite 1 active mitigator(s) [INIT-006] — output/engine_audit_c111.json patterns[3]; evidence: Neighborhood_Map row(s) 2
  - [45] math-imbalance (high) | Fruitvale: decay [Sentiment -0.170, RetailVitality -2.04, HousingPressure +1.000] — Sentiment now 0.52 (1 of 22, city median 0.32); RetailVitality now 10.55 (5 of 22, city median 8.275); HousingPressure now 4.5 (17 of 22, city median 0) — with no matching active initiative — output/engine_audit_c111.json patterns[6]; evidence: Neighborhood_Map row(s) 6
  - [45] math-imbalance (low) | Jack London: decay [Sentiment -0.140, HousingPressure +1.000] — Sentiment now 0.5 (3 of 22, city median 0.32); HousingPressure now 6.5 (20 of 22, city median 0) — despite 1 active mitigator(s) [INIT-006] — output/engine_audit_c111.json patterns[7]; evidence: Neighborhood_Map row(s) 7
  - [45] Baylight District — Final Council Vote | Status passed | phase construction-active — Initiative_Tracker (InitiativeID INIT-006); snapshot: engine_audit_c111.json snapshots.Initiative_Tracker; storyline INIT-006:construction-active
  - [45] Baylight District — Final Council Vote | Remediation completion and construction milestone review C112 — Initiative_Tracker (InitiativeID INIT-006); storyline INIT-006:construction-active
  - [45] retail/nightlife/traffic/sentiment | Baylight District — Final Council Vote is construction-active — ongoing sports effects in Jack London, Downtown — Ripple_Ledger cycle 111 (CauseType initiative-implementation); rendered: world_summary_c111.md "## What Moved" > "### initiative-implementation"; storyline INIT-006:construction-active

## Dr. Lila Mezran (`lila-mezran`)
- Domain: health
- Pulse: Ariana Lee nursed a sore back after overdoing it around the house (Piedmont Ave).
- Ref: output/world_summary_c111.md "## Who Lived It ### Health"
- Candidates:
  - [80] Ariana Lee — nursed a sore back after overdoing it around the house — output/world_summary_c111.md "## Who Lived It ### Health"
  - [80] Sammie Soft — took time to recover from the flu — output/world_summary_c111.md "## Who Lived It ### Health"
  - [45] sentiment/communityEngagement/publicSpaces | Temescal Community Health Center is operational — ongoing health effects in Temescal — Ripple_Ledger cycle 111 (CauseType initiative-implementation); rendered: world_summary_c111.md "## What Moved" > "### initiative-implementation"; storyline INIT-005:operational
  - [45] approval/district-sentiment | Temescal Community Health Center sitting (0, capped); level target 61 (mood +1.65 (district 1.66, city 1.64), district +0.25 vs middle, press -1) → -1; integrity band 1 scales scandal chance x0.75 — Ripple_Ledger cycle 111 (CauseType approval-shift); rendered: world_summary_c111.md "## What Moved" > "### approval-shift"
  - [45] Warren Ashford (council d7): Enforce post-occupancy clinical intake audits and line-item expenditure reconciliations on remaining facility allocations. — "Operational status is merely a baseline—District 7 will audit eve — output/civic-voice/council_d7_c111.json
  - [45] Bobby Chen-Ramirez (health center): Implement pre-opening clinical intake workflow audits and expenditure reconciliations. — "The 51st Street bench crowd knows the pharmacy hours by heart—now they'll know where every dol — output/civic-voice/health_center_c111.json

## Noah Tan (`noah-tan`)
- Domain: environment
- Pulse: Javier Robertson — limited social activity due to winter mood
- Ref: output/world_summary_c111.md ## Who Lived It
- Candidates:
  - [80] Javier Robertson — limited social activity due to winter mood — output/world_summary_c111.md ## Who Lived It
  - [80] FAITH — community_program — East Oakland: Masjid An-Nur Oakland: food pantry serves neighbors in need — output/world_summary_c111.md ## World Events
  - [80] FAITH — community_program — Chinatown: Bay Pure Land Buddhist Temple: community health fair hosted — output/world_summary_c111.md ## World Events
  - [80] FAITH — community_program — Montclair: Bharat Mandir of the East Bay: after-school tutoring program expands — output/world_summary_c111.md ## World Events
  - [80] FAITH — community_program — Grand Lake: Or Hashalom Renewal Community: seniors lunch program marks milestone — output/world_summary_c111.md ## World Events
  - [80] FAITH — community_program — Lake Merritt: Lakeshore Unitarian Universalist Fellowship: seniors lunch program marks milestone — output/world_summary_c111.md ## World Events

## Angela Reyes (`angela-reyes`)
- Domain: education-youth
- Pulse: stuck-initiative (medium) | Initiative "Oakland Youth Apprenticeship Pipeline" in phase "operational" for 4 cycles
- Ref: output/engine_audit_c111.json patterns[1]; evidence: Initiative_Tracker row(s) 7
- Candidates:
  - [45] stuck-initiative (medium) | Initiative "Oakland Youth Apprenticeship Pipeline" in phase "operational" for 4 cycles — output/engine_audit_c111.json patterns[1]; evidence: Initiative_Tracker row(s) 7
  - [45] Oakland Youth Apprenticeship Pipeline | Status announced | phase operational — Initiative_Tracker (InitiativeID INIT-007); snapshot: engine_audit_c111.json snapshots.Initiative_Tracker; storyline INIT-007:operational
  - [45] Oakland Youth Apprenticeship Pipeline | First training cohort placement review C112 — Initiative_Tracker (InitiativeID INIT-007); storyline INIT-007:operational
  - [45] sentiment/communityEngagement/retail | Oakland Youth Apprenticeship Pipeline is operational — ongoing workforce effects in West Oakland, East Oakland, Fruitvale — Ripple_Ledger cycle 111 (CauseType initiative-implementation); rendered: world_summary_c111.md "## What Moved" > "### initiative-implementation"; storyline INIT-007:operational
  - [45] approval/district-sentiment | Oakland Alternative Response Initiative sitting (0, capped); Oakland Youth Apprenticeship Pipeline sitting (0, capped); level target 60 (mood +1.67 (district 1.70, city 1.64), district -0.04 vs middle, press -1) → -1 — Ripple_Ledger cycle 111 (CauseType approval-shift); rendered: world_summary_c111.md "## What Moved" > "### approval-shift"
  - [45] Avery Santana (mayor gavel): mandate first cohort placement report by Cycle 112 — "150 apprentices by spring — I'm demanding the first cohort placement report by Cycle 112." — output/civic-voice/mayor_gavel_c111.json

_Generated by scripts/buildCivicDomainSlice.js — local records only._
