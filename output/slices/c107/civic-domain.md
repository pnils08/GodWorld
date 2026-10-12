# Civic Domain Slice — C107

- Shared source entries: 114
- Empty: no

## Carmen Delaine (`carmen-delaine`)
- Domain: civic-ledger
- Pulse: West Oakland Stabilization Fund | Status passed | phase disbursement-active
- Ref: Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c107.json snapshots.Initiative_Tracker
- Candidates:
  - [55] West Oakland Stabilization Fund | Status passed | phase disbursement-active — Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c107.json snapshots.Initiative_Tracker
  - [55] West Oakland Stabilization Fund | Month-eight disbursement review and Downtown canvass deployment C107 — Initiative_Tracker (InitiativeID INIT-001)
  - [55] Oakland Alternative Response Initiative | Status passed | phase implementation-active — Initiative_Tracker (InitiativeID INIT-002); snapshot: engine_audit_c107.json snapshots.Initiative_Tracker
  - [55] Oakland Alternative Response Initiative | East Oakland dispatch protocol deployment C107 — Initiative_Tracker (InitiativeID INIT-002)
  - [55] Fruitvale Transit Hub Phase II — Visioning | Status visioning-complete | phase design-phase — Initiative_Tracker (InitiativeID INIT-003); snapshot: engine_audit_c107.json snapshots.Initiative_Tracker
  - [55] Fruitvale Transit Hub Phase II — Visioning | Merchant covenant signing and design RFP release C107 — Initiative_Tracker (InitiativeID INIT-003)
- TrackerFacts (beat dump, record facts):
  - West Oakland Stabilization Fund — status passed, phase disbursement-active, VoteCycle 78, outcome PASSED, budget $28M [Initiative_Tracker]
  - Oakland Alternative Response Initiative — status passed, phase dispatch-live, VoteCycle 82, outcome PASSED, budget $12.5M [Initiative_Tracker]
  - Fruitvale Transit Hub Phase II — Visioning — status visioning-complete, phase design-phase, VoteCycle 94, outcome COMPLETED, budget $230M [Initiative_Tracker]
  - Temescal Community Health Center — status passed, phase construction-active, VoteCycle 80, outcome PASSED, budget $45M [Initiative_Tracker]
  - Baylight District — Final Council Vote — status passed, phase construction-planning, VoteCycle 83, outcome PASSED, budget $2.1B [Initiative_Tracker]
  - Mayor — Avery Santana — approval 65 — active [Civic_Office_Ledger]
  - District Attorney — Clarissa Dane — approval 65 — active [Civic_Office_Ledger]
  - Public Defender — Caleb Reyes — approval 65 — active [Civic_Office_Ledger]

## Luis Navarro (`luis-navarro`)
- Domain: accountability-anomaly
- Pulse: repeating-event (medium) | Issue "strain" (+ 1 co-occurring tokens) recurred 4 cycles
- Ref: output/engine_audit_c107.json patterns[0]; evidence: Riley_Digest row(s)
- Candidates:
  - [80] repeating-event (medium) | Issue "strain" (+ 1 co-occurring tokens) recurred 4 cycles — output/engine_audit_c107.json patterns[0]; evidence: Riley_Digest row(s)
  - [80] repeating-event (medium) | Issue "world" (+ 6 co-occurring tokens) recurred 3 cycles — output/engine_audit_c107.json patterns[1]; evidence: Riley_Digest row(s)
  - [80] math-imbalance (medium) | Downtown: decay [Sentiment -0.080, HousingPressure +1.000] — Sentiment now 0.33 (20 of 22, city median 0.46499999999999997); HousingPressure now 4 (18 of 22, city median 0) — with no matching active initiative — output/engine_audit_c107.json patterns[2]; evidence: Neighborhood_Map row(s) 2
  - [80] math-imbalance (low) | Temescal: decay [Sentiment -0.050, HousingPressure +1.000] — Sentiment now 0.46 (12 of 22, city median 0.46499999999999997); HousingPressure now 5.5 (22 of 22, city median 0) — despite 1 active mitigator(s) [INIT-005] — output/engine_audit_c107.json patterns[3]; evidence: Neighborhood_Map row(s) 3
  - [80] math-imbalance (low) | West Oakland: decay [Sentiment -0.090, RetailVitality -1.48] — Sentiment now 0.34 (19 of 22, city median 0.46499999999999997); RetailVitality now 3.53 (22 of 22, city median 7.29) — despite 2 active mitigator(s) [INIT-001, INIT-002] — output/engine_audit_c107.json patterns[4]; evidence: Neighborhood_Map row(s) 5
  - [80] math-imbalance (medium) | Rockridge: decay [RetailVitality -0.70, HousingPressure +1.000] — RetailVitality now 9.19 (5 of 22, city median 7.29); HousingPressure now 4 (19 of 22, city median 0); Sentiment now 0.45 (13 of 22, city median 0.46499999999999997) — with no matching active initiative — output/engine_audit_c107.json patterns[5]; evidence: Neighborhood_Map row(s) 8
- Faction standings (colour):
  - OPP: 6 offices (5 voting) — Avery Santana, Caleb Reyes, Denise Carter [Civic_Office_Ledger]
  - IND: 3 offices (2 voting) — Clarissa Dane, Leonard Tran, Ramon Vega [Civic_Office_Ledger]
  - CRC: 3 offices (3 voting) — Elliott Crane, Warren Ashford, Nina Chen [Civic_Office_Ledger]
  - STAFF: 23 offices — Laila Cortez, Marcus Osei, Brenda Okoro [Civic_Office_Ledger]
- Engine hooks (colour, not fact):
  - SHOCK EVENT: Unexpected disruption detected. Breaking news potential. All desks alert. — angle: investigative angle

## Trevor Shimizu (`trevor-shimizu`)
- Domain: infrastructure-transit
- Pulse: The civic initiative carrying Temescal has not advanced in 4 cycles.
- Ref: output/engine_audit_c107.json patterns[3]; evidence: Neighborhood_Map row(s) 3
- Candidates:
  - [45] math-imbalance (low) | Temescal: decay [Sentiment -0.050, HousingPressure +1.000] — Sentiment now 0.46 (12 of 22, city median 0.46499999999999997); HousingPressure now 5.5 (22 of 22, city median 0) — despite 1 active mitigator(s) [INIT-005] — output/engine_audit_c107.json patterns[3]; evidence: Neighborhood_Map row(s) 3
  - [45] improvement (low) | Initiative "Fruitvale Transit Hub Phase II — Visioning" advanced: visioning-complete → design-phase — output/engine_audit_c107.json patterns[11]; evidence: Initiative_Tracker row(s) 4
  - [45] Fruitvale Transit Hub Phase II — Visioning | Status visioning-complete | phase design-phase — Initiative_Tracker (InitiativeID INIT-003); snapshot: engine_audit_c107.json snapshots.Initiative_Tracker
  - [45] Fruitvale Transit Hub Phase II — Visioning | Merchant covenant signing and design RFP release C107 — Initiative_Tracker (InitiativeID INIT-003)
  - [45] Temescal Community Health Center | Status passed | phase construction-active — Initiative_Tracker (InitiativeID INIT-005); snapshot: engine_audit_c107.json snapshots.Initiative_Tracker
  - [45] Baylight District — Final Council Vote | Status passed | phase construction-planning — Initiative_Tracker (InitiativeID INIT-006); snapshot: engine_audit_c107.json snapshots.Initiative_Tracker

## Dr. Lila Mezran (`lila-mezran`)
- Domain: health
- Pulse: Winston Clarke took time to recover from the flu (Laurel).
- Ref: output/world_summary_c107.md "## Who Lived It ### Health"
- Candidates:
  - [80] Winston Clarke — took time to recover from the flu — output/world_summary_c107.md "## Who Lived It ### Health"
  - [65] Teri Mitchell — recovered from a winter illness — output/world_summary_c107.md "## Who Lived It ### Health"
  - [60] Adams Point health cluster (crisis-spike) | HEALTH event (impactScore 15) — output/world_summary_c107.md "## World Events"
  - [45] math-imbalance (low) | Temescal: decay [Sentiment -0.050, HousingPressure +1.000] — Sentiment now 0.46 (12 of 22, city median 0.46499999999999997); HousingPressure now 5.5 (22 of 22, city median 0) — despite 1 active mitigator(s) [INIT-005] — output/engine_audit_c107.json patterns[3]; evidence: Neighborhood_Map row(s) 3
  - [45] sentiment/communityEngagement/publicSpaces | Temescal Community Health Center is construction-active — ongoing health effects in Temescal — Ripple_Ledger cycle 107 (CauseType initiative-implementation); rendered: world_summary_c107.md "## What Moved" > "### initiative-implementation"
  - [45] approval/district-sentiment | West Oakland Stabilization Fund sitting (0, capped); Oakland Alternative Response Initiative sitting (0, capped); Fruitvale Transit Hub Phase II — Visioning advanced (+2); Temescal Community Health Center sitting (0, capped); Baylight District — Final Council Vote sitting (0, capped); Oakland Youth… — Ripple_Ledger cycle 107 (CauseType approval-shift); rendered: world_summary_c107.md "## What Moved" > "### approval-shift"

## Noah Tan (`noah-tan`)
- Domain: environment
- Pulse: Teri Mitchell — recovered from a winter illness
- Ref: output/world_summary_c107.md ## Who Lived It
- Candidates:
  - [80] Teri Mitchell — recovered from a winter illness — output/world_summary_c107.md ## Who Lived It
  - [80] Lonzo Jailon — limited social activity due to winter mood — output/world_summary_c107.md ## Who Lived It
  - [80] FAITH — crisis_response — Downtown: Telegraph Presbyterian Fellowship: congregation opens doors for community support — output/world_summary_c107.md ## World Events
  - [80] FAITH — holy_day — Lake Merritt: Cathedral of the Living Word observes Epiphany — output/world_summary_c107.md ## World Events
  - [80] FAITH — holy_day — Fruitvale: St. Esperanza Parish observes Epiphany — output/world_summary_c107.md ## World Events
  - [80] FAITH — community_program — Downtown: Telegraph Presbyterian Fellowship: seniors lunch program marks milestone — output/world_summary_c107.md ## World Events

## Angela Reyes (`angela-reyes`)
- Domain: education-youth
- Pulse: improvement (low) | Initiative "Oakland Youth Apprenticeship Pipeline" advanced: implementation-active → operational
- Ref: output/engine_audit_c107.json patterns[12]; evidence: Initiative_Tracker row(s) 7
- Candidates:
  - [45] improvement (low) | Initiative "Oakland Youth Apprenticeship Pipeline" advanced: implementation-active → operational — output/engine_audit_c107.json patterns[12]; evidence: Initiative_Tracker row(s) 7
  - [45] Oakland Youth Apprenticeship Pipeline | Status announced | phase operational — Initiative_Tracker (InitiativeID INIT-007); snapshot: engine_audit_c107.json snapshots.Initiative_Tracker
  - [45] Oakland Youth Apprenticeship Pipeline | Public town hall enrollment event C107 — Initiative_Tracker (InitiativeID INIT-007)
  - [45] sentiment/communityEngagement/retail | Oakland Youth Apprenticeship Pipeline is operational — ongoing workforce effects in West Oakland, East Oakland, Fruitvale — Ripple_Ledger cycle 107 (CauseType initiative-implementation); rendered: world_summary_c107.md "## What Moved" > "### initiative-implementation"
  - [45] approval/district-sentiment | West Oakland Stabilization Fund sitting (0, capped); Oakland Alternative Response Initiative sitting (0, capped); Fruitvale Transit Hub Phase II — Visioning advanced (+2); Temescal Community Health Center sitting (0, capped); Baylight District — Final Council Vote sitting (0, capped); Oakland Youth… — Ripple_Ledger cycle 107 (CauseType approval-shift); rendered: world_summary_c107.md "## What Moved" > "### approval-shift"
  - [45] approval/district-sentiment | West Oakland Stabilization Fund sitting (0, capped); Oakland Alternative Response Initiative sitting (0, capped); Oakland Youth Apprenticeship Pipeline advanced (+2); level target 57 (mood +1.43 (district 1.38, city 1.48), district -0.84 vs middle) → +0 — Ripple_Ledger cycle 107 (CauseType approval-shift); rendered: world_summary_c107.md "## What Moved" > "### approval-shift"

_Generated by scripts/buildCivicDomainSlice.js — local records only._
