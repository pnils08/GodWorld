# Civic Domain Slice — C109

- Shared source entries: 96
- Empty: no

## Carmen Delaine (`carmen-delaine`)
- Domain: civic-ledger
- Pulse: West Oakland Stabilization Fund | Status passed | phase disbursement-active
- Ref: Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c109.json snapshots.Initiative_Tracker
- Candidates:
  - [55] West Oakland Stabilization Fund | Status passed | phase disbursement-active — Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c109.json snapshots.Initiative_Tracker
  - [55] West Oakland Stabilization Fund | Month-eight disbursement completion and Downtown outreach impact assessment C109 — Initiative_Tracker (InitiativeID INIT-001)
  - [55] Oakland Alternative Response Initiative | Status passed | phase dispatch-live — Initiative_Tracker (InitiativeID INIT-002); snapshot: engine_audit_c109.json snapshots.Initiative_Tracker
  - [55] Oakland Alternative Response Initiative | District 1 evaluation completion and potential expansion decision C109 — Initiative_Tracker (InitiativeID INIT-002)
  - [55] Fruitvale Transit Hub Phase II — Visioning | Status proposed | phase design-phase — Initiative_Tracker (InitiativeID INIT-003); snapshot: engine_audit_c109.json snapshots.Initiative_Tracker
  - [55] Fruitvale Transit Hub Phase II — Visioning | Design consultant selection C109 — Initiative_Tracker (InitiativeID INIT-003)
- TrackerFacts (beat dump, record facts):
  - Temescal Community Health Center — status passed, phase operational, VoteCycle 80, outcome PASSED, budget $45M [Initiative_Tracker]
  - Baylight District — Final Council Vote — status passed, phase construction-active, VoteCycle 83, outcome PASSED, budget $2.1B [Initiative_Tracker]
  - Mayor — Avery Santana — approval 69 — active [Civic_Office_Ledger]
  - District Attorney — Clarissa Dane — approval 65 — active [Civic_Office_Ledger]
  - Public Defender — Caleb Reyes — approval 65 — active [Civic_Office_Ledger]
  - City Council District 1 — Denise Carter — approval 62 — active [Civic_Office_Ledger]
  - City Council District 2 — Leonard Tran — approval 65 — active [Civic_Office_Ledger]
  - City Council District 3 — Rose Delgado — approval 64 — active [Civic_Office_Ledger]

## Luis Navarro (`luis-navarro`)
- Domain: accountability-anomaly
- Pulse: repeating-event (medium) | Issue "strain" (+ 1 co-occurring tokens) recurred 4 cycles
- Ref: output/engine_audit_c109.json patterns[0]; evidence: Riley_Digest row(s)
- Candidates:
  - [80] repeating-event (medium) | Issue "strain" (+ 1 co-occurring tokens) recurred 4 cycles — output/engine_audit_c109.json patterns[0]; evidence: Riley_Digest row(s)
  - [80] math-imbalance (medium) | Downtown: decay [Sentiment -0.050, HousingPressure +1.000] — Sentiment now 0.28 (10 of 22, city median 0.28); HousingPressure now 6 (20 of 22, city median 0) — with no matching active initiative — output/engine_audit_c109.json patterns[1]; evidence: Neighborhood_Map row(s) 2
  - [80] math-imbalance (medium) | Fruitvale: decay [Sentiment -0.020, HousingPressure +1.000] — Sentiment now 0.42 (2 of 22, city median 0.28); HousingPressure now 2.5 (15 of 22, city median 0) — with no matching active initiative — output/engine_audit_c109.json patterns[2]; evidence: Neighborhood_Map row(s) 6
  - [80] math-imbalance (medium) | Grand Lake: decay [Sentiment -0.050, HousingPressure +1.000] — Sentiment now 0.28 (12 of 22, city median 0.28); HousingPressure now 4 (17 of 22, city median 0) — with no matching active initiative — output/engine_audit_c109.json patterns[3]; evidence: Neighborhood_Map row(s) 10
  - [80] coverage-gap (medium) | Domain "faith" produced 5 events this cycle with zero Tribune coverage last cycle — output/engine_audit_c109.json patterns[4]; evidence: WorldEvents_V3_Ledger row(s)
  - [80] writeback-drift (medium) | 8 council approvals unchanged from last cycle despite edition coverage — output/engine_audit_c109.json patterns[5]; evidence: Civic_Office_Ledger row(s)
- Stalling initiatives (unchanged vs prev cycle, colour):
  - West Oakland Stabilization Fund — still passed / disbursement-active (unchanged since C108) [Initiative_Tracker]
  - Oakland Alternative Response Initiative — still passed / dispatch-live (unchanged since C108) [Initiative_Tracker]
  - Fruitvale Transit Hub Phase II — Visioning — still proposed / design-phase (unchanged since C108) [Initiative_Tracker]
  - Oakland Youth Apprenticeship Pipeline — still announced / operational (unchanged since C108) [Initiative_Tracker]
  - Downtown Economic Revitalization — still proposed / announced (unchanged since C108) [Initiative_Tracker]
- Faction standings (colour):
  - OPP: 6 offices (5 voting) — Avery Santana, Caleb Reyes, Denise Carter [Civic_Office_Ledger]
  - IND: 3 offices (2 voting) — Clarissa Dane, Leonard Tran, Ramon Vega [Civic_Office_Ledger]
  - CRC: 3 offices (3 voting) — Elliott Crane, Warren Ashford, Nina Chen [Civic_Office_Ledger]
  - STAFF: 27 offices — Laila Cortez, Marcus Osei, Brenda Okoro [Civic_Office_Ledger]
- Engine hooks (colour, not fact):
  - Multiple neighborhood demographic shifts detected this cycle. City-wide population dynamics story. — angle: investigative angle

## Trevor Shimizu (`trevor-shimizu`)
- Domain: infrastructure-transit
- Pulse: The transit initiative carrying Fruitvale has not advanced in 2 cycles.
- Ref: output/engine_audit_c109.json patterns[2]; evidence: Neighborhood_Map row(s) 6
- Candidates:
  - [45] math-imbalance (medium) | Fruitvale: decay [Sentiment -0.020, HousingPressure +1.000] — Sentiment now 0.42 (2 of 22, city median 0.28); HousingPressure now 2.5 (15 of 22, city median 0) — with no matching active initiative — output/engine_audit_c109.json patterns[2]; evidence: Neighborhood_Map row(s) 6
  - [45] improvement (low) | Initiative "Temescal Community Health Center" advanced: construction-active → operational — output/engine_audit_c109.json patterns[6]; evidence: Initiative_Tracker row(s) 5
  - [45] Fruitvale Transit Hub Phase II — Visioning | Status proposed | phase design-phase — Initiative_Tracker (InitiativeID INIT-003); snapshot: engine_audit_c109.json snapshots.Initiative_Tracker
  - [45] Fruitvale Transit Hub Phase II — Visioning | Design consultant selection C109 — Initiative_Tracker (InitiativeID INIT-003)
  - [45] Baylight District — Final Council Vote | Status passed | phase construction-planning — Initiative_Tracker (InitiativeID INIT-006); snapshot: engine_audit_c109.json snapshots.Initiative_Tracker
  - [45] retail/traffic/sentiment | Fruitvale Transit Hub Phase II — Visioning is design-phase — ongoing transit effects in Fruitvale — Ripple_Ledger cycle 109 (CauseType initiative-implementation); rendered: world_summary_c109.md "## What Moved" > "### initiative-implementation"

## Dr. Lila Mezran (`lila-mezran`)
- Domain: health
- Pulse: Tiu Xiong skipped plans to rest off a stubborn bug (Uptown).
- Ref: output/world_summary_c109.md "## Who Lived It ### Health"
- Candidates:
  - [80] Tiu Xiong — skipped plans to rest off a stubborn bug — output/world_summary_c109.md "## Who Lived It ### Health"
  - [65] Colin Soria — fought off a head cold that lingered all week — output/world_summary_c109.md "## Who Lived It ### Health"
  - [45] improvement (low) | Initiative "Temescal Community Health Center" advanced: construction-active → operational — output/engine_audit_c109.json patterns[6]; evidence: Initiative_Tracker row(s) 5
  - [45] sentiment/communityEngagement/publicSpaces | Temescal Community Health Center is construction-active — ongoing health effects in Temescal — Ripple_Ledger cycle 109 (CauseType initiative-implementation); rendered: world_summary_c109.md "## What Moved" > "### initiative-implementation"
  - [45] approval/district-sentiment | West Oakland Stabilization Fund sitting (0, capped); Oakland Alternative Response Initiative sitting (0, capped); Fruitvale Transit Hub Phase II — Visioning sitting (0, capped); Temescal Community Health Center advanced (+2); Baylight District — Final Council Vote sitting (0, capped); Oakland Youth… — Ripple_Ledger cycle 109 (CauseType approval-shift); rendered: world_summary_c109.md "## What Moved" > "### approval-shift"
  - [45] Avery Santana (mayor gavel): celebrated — "Two weeks early and $1.2M under budget—that's how Oakland builds public health infrastructure." — output/civic-voice/mayor_gavel_c109.json

## Noah Tan (`noah-tan`)
- Domain: environment
- Pulse: Colin Soria — fought off a head cold that lingered all week
- Ref: output/world_summary_c109.md ## Who Lived It
- Candidates:
  - [80] Colin Soria — fought off a head cold that lingered all week — output/world_summary_c109.md ## Who Lived It
  - [80] FAITH — crisis_response — Chinatown: Bay Pure Land Buddhist Temple: congregation opens doors for community support — output/world_summary_c109.md ## World Events
  - [80] FAITH — holy_day — Downtown: Telegraph Presbyterian Fellowship observes Epiphany — output/world_summary_c109.md ## World Events
  - [80] FAITH — holy_day — Lake Merritt: Cathedral of the Living Word observes Epiphany — output/world_summary_c109.md ## World Events
  - [80] FAITH — community_program — East Oakland: Foothill Baptist Tabernacle: community health fair hosted — output/world_summary_c109.md ## World Events
  - [80] FAITH — community_program — West Oakland: New Covenant Pentecostal Assembly: community health fair hosted — output/world_summary_c109.md ## World Events

## Angela Reyes (`angela-reyes`)
- Domain: education-youth
- Pulse: Oakland Youth Apprenticeship Pipeline has been announced, and the supplied implementation state is operational.
- Ref: Initiative_Tracker (InitiativeID INIT-007); snapshot: engine_audit_c109.json snapshots.Initiative_Tracker
- Candidates:
  - [45] Oakland Youth Apprenticeship Pipeline | Status announced | phase operational — Initiative_Tracker (InitiativeID INIT-007); snapshot: engine_audit_c109.json snapshots.Initiative_Tracker
  - [45] Oakland Youth Apprenticeship Pipeline | First training cohort placement review C110 — Initiative_Tracker (InitiativeID INIT-007)
  - [45] sentiment/communityEngagement/retail | Oakland Youth Apprenticeship Pipeline is operational — ongoing workforce effects in West Oakland, East Oakland, Fruitvale — Ripple_Ledger cycle 109 (CauseType initiative-implementation); rendered: world_summary_c109.md "## What Moved" > "### initiative-implementation"
  - [45] approval/district-sentiment | West Oakland Stabilization Fund sitting (0, capped); Oakland Alternative Response Initiative sitting (0, capped); Fruitvale Transit Hub Phase II — Visioning sitting (0, capped); Temescal Community Health Center advanced (+2); Baylight District — Final Council Vote sitting (0, capped); Oakland Youth… — Ripple_Ledger cycle 109 (CauseType approval-shift); rendered: world_summary_c109.md "## What Moved" > "### approval-shift"
  - [45] Janae Rivers: First training cohort placement review isn't just about hitting targets—it's about lives transformed. We set the bar high: East Oakland youth will not be last in line. — output/cron-civic/datawake/civic-office-council-d5_2026-09-29.json

_Generated by scripts/buildCivicDomainSlice.js — local records only._
