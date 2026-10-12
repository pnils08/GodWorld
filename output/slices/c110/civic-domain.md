# Civic Domain Slice — C110

- Shared source entries: 131
- Empty: no

## Carmen Delaine (`carmen-delaine`)
- Domain: civic-ledger
- Pulse: West Oakland Stabilization Fund | Status passed | phase disbursement-active
- Ref: Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c110.json snapshots.Initiative_Tracker; storyline INIT-001:disbursement-active
- Candidates:
  - [55] West Oakland Stabilization Fund | Status passed | phase disbursement-active — Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c110.json snapshots.Initiative_Tracker; storyline INIT-001:disbursement-active
  - [55] West Oakland Stabilization Fund | Month-nine disbursement review C110 — Initiative_Tracker (InitiativeID INIT-001); storyline INIT-001:disbursement-active
  - [55] Oakland Alternative Response Initiative | Status passed | phase dispatch-live — Initiative_Tracker (InitiativeID INIT-002); snapshot: engine_audit_c110.json snapshots.Initiative_Tracker; storyline INIT-002:dispatch-live
  - [55] Oakland Alternative Response Initiative | Quarterly outcome report C112 — Initiative_Tracker (InitiativeID INIT-002); storyline INIT-002:dispatch-live
  - [55] Fruitvale Transit Hub Phase II — Visioning | Status proposed | phase design-phase — Initiative_Tracker (InitiativeID INIT-003); snapshot: engine_audit_c110.json snapshots.Initiative_Tracker; storyline INIT-003:design-phase
  - [55] Fruitvale Transit Hub Phase II — Visioning | Preliminary schematics review C111 — Initiative_Tracker (InitiativeID INIT-003); storyline INIT-003:design-phase
- TrackerFacts (beat dump, record facts):
  - Downtown Economic Revitalization — status proposed, phase legislation-filed, budget $15M [Initiative_Tracker]
  - Commercial Stabilization for Grand Lake — status proposed, phase announced, budget $2.5M [Initiative_Tracker]
  - West Oakland Tenant Defense Fund — status proposed, phase announced, budget $4.2M [Initiative_Tracker]
  - Mayor — Avery Santana — approval 69 — active [Civic_Office_Ledger]
  - District Attorney — Clarissa Dane — approval 65 — active [Civic_Office_Ledger]
  - Public Defender — Caleb Reyes — approval 65 — active [Civic_Office_Ledger]
  - City Council District 1 — Denise Carter — approval 62 — active [Civic_Office_Ledger]
  - City Council District 2 — Leonard Tran — approval 66 — active [Civic_Office_Ledger]
- The city's money (beat dump, record facts):
  - The city treasury opened this cycle at $100M [City_Treasury]
  - City treasury this cycle took in $5.2M: $5M the weekly budget allocation, $500 1 ticket, $153,351 court money on 34 cleared charges [City_Treasury]
  - City treasury balance at the close: $105.2M (from $0) [City_Treasury]

## Luis Navarro (`luis-navarro`)
- Domain: accountability-anomaly
- Pulse: stuck-initiative (low) | Initiative "Fruitvale Transit Hub Phase II — Visioning" in phase "design-phase" for 3 cycles
- Ref: output/engine_audit_c110.json patterns[0]; evidence: Initiative_Tracker row(s) 4
- Candidates:
  - [80] stuck-initiative (low) | Initiative "Fruitvale Transit Hub Phase II — Visioning" in phase "design-phase" for 3 cycles — output/engine_audit_c110.json patterns[0]; evidence: Initiative_Tracker row(s) 4
  - [80] stuck-initiative (low) | Initiative "Oakland Youth Apprenticeship Pipeline" in phase "operational" for 3 cycles — output/engine_audit_c110.json patterns[1]; evidence: Initiative_Tracker row(s) 7
  - [80] repeating-event (medium) | Issue "strain" (+ 1 co-occurring tokens) recurred 3 cycles — output/engine_audit_c110.json patterns[2]; evidence: Riley_Digest row(s)
  - [80] coverage-gap (medium) | Domain "faith" produced 5 events this cycle with zero Tribune coverage last cycle — output/engine_audit_c110.json patterns[3]; evidence: WorldEvents_V3_Ledger row(s)
  - [80] production-imbalance (medium) | 19 neighborhoods report migration flow with zero economic events this cycle — output/engine_audit_c110.json patterns[4]; evidence: Neighborhood_Map row(s)
  - [80] improvement (low) | Initiative "Baylight District — Final Council Vote" advanced: construction-planning → construction-active — output/engine_audit_c110.json patterns[5]; evidence: Initiative_Tracker row(s) 6
- Stalling initiatives (unchanged vs prev cycle, colour):
  - West Oakland Stabilization Fund — still passed / disbursement-active (unchanged since C109) [Initiative_Tracker]
  - Oakland Alternative Response Initiative — still passed / dispatch-live (unchanged since C109) [Initiative_Tracker]
  - Fruitvale Transit Hub Phase II — Visioning — still proposed / design-phase (unchanged since C109) [Initiative_Tracker]
  - Temescal Community Health Center — still passed / operational (unchanged since C109) [Initiative_Tracker]
  - Baylight District — Final Council Vote — still passed / construction-active (unchanged since C109) [Initiative_Tracker]
  - Oakland Youth Apprenticeship Pipeline — still announced / operational (unchanged since C109) [Initiative_Tracker]
- Faction standings (colour):
  - OPP: 6 offices (5 voting) — Avery Santana, Caleb Reyes, Denise Carter [Civic_Office_Ledger]
  - IND: 3 offices (2 voting) — Clarissa Dane, Leonard Tran, Ramon Vega [Civic_Office_Ledger]
  - CRC: 3 offices (3 voting) — Elliott Crane, Warren Ashford, Nina Chen [Civic_Office_Ledger]
  - STAFF: 27 offices — Laila Cortez, Marcus Osei, Brenda Okoro [Civic_Office_Ledger]
- Engine hooks (colour, not fact):
  - Notable event: "small protest". Follow-up recommended. — angle: investigative angle

## Trevor Shimizu (`trevor-shimizu`)
- Domain: infrastructure-transit
- Pulse: The transit initiative carrying Fruitvale has not advanced in 3 cycles.
- Ref: output/engine_audit_c110.json patterns[0]; evidence: Initiative_Tracker row(s) 4
- Candidates:
  - [45] stuck-initiative (low) | Initiative "Fruitvale Transit Hub Phase II — Visioning" in phase "design-phase" for 3 cycles — output/engine_audit_c110.json patterns[0]; evidence: Initiative_Tracker row(s) 4
  - [45] improvement (low) | Initiative "Baylight District — Final Council Vote" advanced: construction-planning → construction-active — output/engine_audit_c110.json patterns[5]; evidence: Initiative_Tracker row(s) 6
  - [45] Fruitvale Transit Hub Phase II — Visioning | Status proposed | phase design-phase — Initiative_Tracker (InitiativeID INIT-003); snapshot: engine_audit_c110.json snapshots.Initiative_Tracker; storyline INIT-003:design-phase
  - [45] Fruitvale Transit Hub Phase II — Visioning | Preliminary schematics review C111 — Initiative_Tracker (InitiativeID INIT-003); storyline INIT-003:design-phase
  - [45] Baylight District — Final Council Vote | Status passed | phase construction-active — Initiative_Tracker (InitiativeID INIT-006); snapshot: engine_audit_c110.json snapshots.Initiative_Tracker; storyline INIT-006:construction-active
  - [45] Baylight District — Final Council Vote | First soil test results verification C110 — Initiative_Tracker (InitiativeID INIT-006); storyline INIT-006:construction-active

## Dr. Lila Mezran (`lila-mezran`)
- Domain: health
- Pulse: Yu Zen got back into a morning walk routine (Rockridge).
- Ref: output/world_summary_c110.md "## Who Lived It ### Recovering"
- Candidates:
  - [80] Yu Zen — got back into a morning walk routine — output/world_summary_c110.md "## Who Lived It ### Recovering"
  - [80] Maurice Franklin — Maurice Franklin is now recovering and expected to be released soon — output/world_summary_c110.md "## Who Lived It ### Recovering"
  - [65] Jackson Sift — dealt with a seasonal health concern — output/world_summary_c110.md "## Who Lived It ### Health"
  - [65] Ron Arenson — recovered from a winter illness — output/world_summary_c110.md "## Who Lived It ### Health"
  - [65] Jessie Hess — finally shook the cold that had been hanging around — output/world_summary_c110.md "## Who Lived It ### Recovering"
  - [65] Jett Walker — finally shook the cold that had been hanging around — output/world_summary_c110.md "## Who Lived It ### Recovering"

## Noah Tan (`noah-tan`)
- Domain: environment
- Pulse: Jackson Sift — dealt with a seasonal health concern
- Ref: output/world_summary_c110.md ## Who Lived It
- Candidates:
  - [80] Jackson Sift — dealt with a seasonal health concern — output/world_summary_c110.md ## Who Lived It
  - [80] Ron Arenson — recovered from a winter illness — output/world_summary_c110.md ## Who Lived It
  - [80] Jessie Hess — finally shook the cold that had been hanging around — output/world_summary_c110.md ## Who Lived It
  - [80] Jett Walker — finally shook the cold that had been hanging around — output/world_summary_c110.md ## Who Lived It
  - [80] FAITH — community_program — Fruitvale: St. Esperanza Parish: seniors lunch program marks milestone — output/world_summary_c110.md ## World Events
  - [80] FAITH — community_program — Rockridge: Temple Beth Or: job training workshop begins new session — output/world_summary_c110.md ## World Events

## Angela Reyes (`angela-reyes`)
- Domain: education-youth
- Pulse: stuck-initiative (low) | Initiative "Oakland Youth Apprenticeship Pipeline" in phase "operational" for 3 cycles
- Ref: output/engine_audit_c110.json patterns[1]; evidence: Initiative_Tracker row(s) 7
- Candidates:
  - [45] stuck-initiative (low) | Initiative "Oakland Youth Apprenticeship Pipeline" in phase "operational" for 3 cycles — output/engine_audit_c110.json patterns[1]; evidence: Initiative_Tracker row(s) 7
  - [45] Oakland Youth Apprenticeship Pipeline | Status announced | phase operational — Initiative_Tracker (InitiativeID INIT-007); snapshot: engine_audit_c110.json snapshots.Initiative_Tracker; storyline INIT-007:operational
  - [45] Oakland Youth Apprenticeship Pipeline | First training cohort placement review C111 — Initiative_Tracker (InitiativeID INIT-007); storyline INIT-007:operational
  - [45] sentiment/communityEngagement/retail | Oakland Youth Apprenticeship Pipeline is operational — ongoing workforce effects in West Oakland, East Oakland, Fruitvale — Ripple_Ledger cycle 110 (CauseType initiative-implementation); rendered: world_summary_c110.md "## What Moved" > "### initiative-implementation"; storyline INIT-007:operational
  - [45] approval/district-sentiment | Oakland Alternative Response Initiative sitting (0, capped); Fruitvale Transit Hub Phase II — Visioning sitting (0, capped); Oakland Youth Apprenticeship Pipeline sitting (0, capped); level target 61 (mood +1.44 (district 1.46, city 1.42), district -0.08 vs middle) → -1 — Ripple_Ledger cycle 110 (CauseType approval-shift); rendered: world_summary_c110.md "## What Moved" > "### approval-shift"
  - [45] approval/district-sentiment | Oakland Alternative Response Initiative sitting (0, capped); Oakland Youth Apprenticeship Pipeline sitting (0, capped); level target 60 (mood +1.48 (district 1.53, city 1.42), district -0.40 vs middle) → -1 — Ripple_Ledger cycle 110 (CauseType approval-shift); rendered: world_summary_c110.md "## What Moved" > "### approval-shift"

_Generated by scripts/buildCivicDomainSlice.js — local records only._
