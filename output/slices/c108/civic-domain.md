# Civic Domain Slice — C108

- Shared source entries: 75
- Empty: no

## Carmen Delaine (`carmen-delaine`)
- Domain: civic-ledger
- Pulse: West Oakland Stabilization Fund | Status passed | phase disbursement-active
- Ref: Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c108.json snapshots.Initiative_Tracker
- Candidates:
  - [55] West Oakland Stabilization Fund | Status passed | phase disbursement-active — Initiative_Tracker (InitiativeID INIT-001); snapshot: engine_audit_c108.json snapshots.Initiative_Tracker
  - [55] West Oakland Stabilization Fund | Month-eight disbursement completion and Downtown outreach impact assessment C108 — Initiative_Tracker (InitiativeID INIT-001)
  - [55] Oakland Alternative Response Initiative | Status passed | phase dispatch-live — Initiative_Tracker (InitiativeID INIT-002); snapshot: engine_audit_c108.json snapshots.Initiative_Tracker
  - [55] Oakland Alternative Response Initiative | District 1 evaluation completion and potential expansion decision C108 — Initiative_Tracker (InitiativeID INIT-002)
  - [55] Fruitvale Transit Hub Phase II — Visioning | Status visioning-complete | phase design-phase — Initiative_Tracker (InitiativeID INIT-003); snapshot: engine_audit_c108.json snapshots.Initiative_Tracker
  - [55] Fruitvale Transit Hub Phase II — Visioning | Design consultant selection C108 — Initiative_Tracker (InitiativeID INIT-003)
- TrackerFacts (beat dump, record facts):
  - Fruitvale Transit Hub Phase II — Visioning — status proposed, phase design-phase, outcome COMPLETED, budget $230M [Initiative_Tracker]
  - Downtown Economic Revitalization — status proposed, phase announced, budget $15M [Initiative_Tracker]
  - Mayor — Avery Santana — approval 68 — active [Civic_Office_Ledger]
  - District Attorney — Clarissa Dane — approval 65 — active [Civic_Office_Ledger]
  - Public Defender — Caleb Reyes — approval 65 — active [Civic_Office_Ledger]
  - City Council District 1 — Denise Carter — approval 62 — active [Civic_Office_Ledger]
  - City Council District 2 — Leonard Tran — approval 65 — active [Civic_Office_Ledger]
  - City Council District 3 — Rose Delgado — approval 64 — active [Civic_Office_Ledger]
- Engine hooks (colour, not fact):
  - Notable event: "Medium-severity civic spike in Dimond". Follow-up recommended. — angle: investigative angle [Dimond]

## Luis Navarro (`luis-navarro`)
- Domain: accountability-anomaly
- Pulse: repeating-event (medium) | Issue "world" (+ 6 co-occurring tokens) recurred 3 cycles
- Ref: output/engine_audit_c108.json patterns[0]; evidence: Riley_Digest row(s)
- Candidates:
  - [80] repeating-event (medium) | Issue "world" (+ 6 co-occurring tokens) recurred 3 cycles — output/engine_audit_c108.json patterns[0]; evidence: Riley_Digest row(s)
  - [80] repeating-event (medium) | Issue "strain" (+ 1 co-occurring tokens) recurred 4 cycles — output/engine_audit_c108.json patterns[1]; evidence: Riley_Digest row(s)
  - [80] math-imbalance (medium) | Downtown: decay [RetailVitality -0.67, HousingPressure +1.000] — RetailVitality now 11.18 (2 of 22, city median 6.43); HousingPressure now 5 (19 of 22, city median 0); Sentiment now 0.33 (10 of 22, city median 0.33) — with no matching active initiative — output/engine_audit_c108.json patterns[2]; evidence: Neighborhood_Map row(s) 2
  - [80] math-imbalance (low) | Temescal: decay [Sentiment -0.080, RetailVitality -1.03] — Sentiment now 0.38 (5 of 22, city median 0.33); RetailVitality now 5.02 (18 of 22, city median 6.43) — despite 1 active mitigator(s) [INIT-005] — output/engine_audit_c108.json patterns[3]; evidence: Neighborhood_Map row(s) 3
  - [80] math-imbalance (high) | Fruitvale: decay [Sentiment -0.030, RetailVitality -1.32, HousingPressure +1.000] — Sentiment now 0.44 (2 of 22, city median 0.33); RetailVitality now 9.67 (5 of 22, city median 6.43); HousingPressure now 1.5 (15 of 22, city median 0) — with no matching active initiative — output/engine_audit_c108.json patterns[4]; evidence: Neighborhood_Map row(s) 6
  - [80] math-imbalance (high) | Jack London: decay [Sentiment -0.110, RetailVitality -1.07, HousingPressure +1.000] — Sentiment now 0.33 (11 of 22, city median 0.33); RetailVitality now 12.06 (1 of 22, city median 6.43); HousingPressure now 3.5 (17 of 22, city median 0) — with no matching active initiative — output/engine_audit_c108.json patterns[5]; evidence: Neighborhood_Map row(s) 7
- Stalling initiatives (unchanged vs prev cycle, colour):
  - West Oakland Stabilization Fund — still passed / disbursement-active (unchanged since C107) [Initiative_Tracker]
  - Oakland Alternative Response Initiative — still passed / dispatch-live (unchanged since C107) [Initiative_Tracker]
  - Temescal Community Health Center — still passed / construction-active (unchanged since C107) [Initiative_Tracker]
  - Baylight District — Final Council Vote — still passed / construction-planning (unchanged since C107) [Initiative_Tracker]
  - Oakland Youth Apprenticeship Pipeline — still announced / operational (unchanged since C107) [Initiative_Tracker]
- Faction standings (colour):
  - OPP: 6 offices (5 voting) — Avery Santana, Caleb Reyes, Denise Carter [Civic_Office_Ledger]
  - IND: 3 offices (2 voting) — Clarissa Dane, Leonard Tran, Ramon Vega [Civic_Office_Ledger]
  - CRC: 3 offices (3 voting) — Elliott Crane, Warren Ashford, Nina Chen [Civic_Office_Ledger]
  - STAFF: 23 offices — Laila Cortez, Marcus Osei, Brenda Okoro [Civic_Office_Ledger]
- Engine hooks (colour, not fact):
  - SHOCK LIFTED: the disruption that had the city on edge eased this cycle. What it cost, and who is still catching up. — angle: investigative angle

## Trevor Shimizu (`trevor-shimizu`)
- Domain: infrastructure-transit
- Pulse: The civic initiative carrying Temescal has not advanced in 5 cycles.
- Ref: output/engine_audit_c108.json patterns[3]; evidence: Neighborhood_Map row(s) 3
- Candidates:
  - [45] math-imbalance (low) | Temescal: decay [Sentiment -0.080, RetailVitality -1.03] — Sentiment now 0.38 (5 of 22, city median 0.33); RetailVitality now 5.02 (18 of 22, city median 6.43) — despite 1 active mitigator(s) [INIT-005] — output/engine_audit_c108.json patterns[3]; evidence: Neighborhood_Map row(s) 3
  - [45] math-imbalance (high) | Fruitvale: decay [Sentiment -0.030, RetailVitality -1.32, HousingPressure +1.000] — Sentiment now 0.44 (2 of 22, city median 0.33); RetailVitality now 9.67 (5 of 22, city median 6.43); HousingPressure now 1.5 (15 of 22, city median 0) — with no matching active initiative — output/engine_audit_c108.json patterns[4]; evidence: Neighborhood_Map row(s) 6
  - [45] Fruitvale Transit Hub Phase II — Visioning | Status visioning-complete | phase design-phase — Initiative_Tracker (InitiativeID INIT-003); snapshot: engine_audit_c108.json snapshots.Initiative_Tracker
  - [45] Fruitvale Transit Hub Phase II — Visioning | Design consultant selection C108 — Initiative_Tracker (InitiativeID INIT-003)
  - [45] Temescal Community Health Center | Status passed | phase construction-active — Initiative_Tracker (InitiativeID INIT-005); snapshot: engine_audit_c108.json snapshots.Initiative_Tracker
  - [45] Baylight District — Final Council Vote | Status passed | phase construction-planning — Initiative_Tracker (InitiativeID INIT-006); snapshot: engine_audit_c108.json snapshots.Initiative_Tracker

## Dr. Lila Mezran (`lila-mezran`)
- Domain: health
- Pulse: Javier Robertson cooked healthier meals all week and felt the difference (Temescal).
- Ref: output/world_summary_c108.md "## Who Lived It ### Recovering"
- Candidates:
  - [80] Javier Robertson — cooked healthier meals all week and felt the difference — output/world_summary_c108.md "## Who Lived It ### Recovering"
  - [80] Yu Zen — Yu Zen is now recovering and expected to be released soon — output/world_summary_c108.md "## Who Lived It ### Recovering"
  - [60] KONO health cluster (crisis-spike) | Low-severity health spike in KONO (impactScore 23) — output/world_summary_c108.md "## World Events"
  - [45] math-imbalance (low) | Temescal: decay [Sentiment -0.080, RetailVitality -1.03] — Sentiment now 0.38 (5 of 22, city median 0.33); RetailVitality now 5.02 (18 of 22, city median 6.43) — despite 1 active mitigator(s) [INIT-005] — output/engine_audit_c108.json patterns[3]; evidence: Neighborhood_Map row(s) 3
  - [45] sentiment/communityEngagement/publicSpaces | Temescal Community Health Center is construction-active — ongoing health effects in Temescal — Ripple_Ledger cycle 108 (CauseType initiative-implementation); rendered: world_summary_c108.md "## What Moved" > "### initiative-implementation"
  - [45] approval/district-sentiment | West Oakland Stabilization Fund sitting (0, capped); Oakland Alternative Response Initiative advanced (+2); Fruitvale Transit Hub Phase II — Visioning sitting (0, capped); Temescal Community Health Center sitting (0, capped); Baylight District — Final Council Vote sitting (0, capped); Oakland Youth… — Ripple_Ledger cycle 108 (CauseType approval-shift); rendered: world_summary_c108.md "## What Moved" > "### approval-shift"

## Noah Tan (`noah-tan`)
- Domain: environment
- Pulse: Tyrie Groin — relied on familiar social circles during cold period
- Ref: output/world_summary_c108.md ## Who Lived It
- Candidates:
  - [80] Tyrie Groin — relied on familiar social circles during cold period — output/world_summary_c108.md ## Who Lived It
  - [80] Marc Allie — helped the kids with homework at the kitchen table — output/world_summary_c108.md ## Who Lived It
  - [80] FAITH — holy_day — Lake Merritt: Cathedral of the Living Word observes Epiphany — output/world_summary_c108.md ## World Events
  - [80] FAITH — holy_day — Fruitvale: St. Esperanza Parish observes Epiphany — output/world_summary_c108.md ## World Events
  - [80] FAITH — community_program — East Oakland: Foothill Baptist Tabernacle: youth program graduation ceremony — output/world_summary_c108.md ## World Events
  - [80] FAITH — community_program — Lake Merritt: Cathedral of the Living Word: food pantry serves neighbors in need — output/world_summary_c108.md ## World Events

## Angela Reyes (`angela-reyes`)
- Domain: education-youth
- Pulse: Oakland Youth Apprenticeship Pipeline has been announced, and the supplied implementation state is operational.
- Ref: Initiative_Tracker (InitiativeID INIT-007); snapshot: engine_audit_c108.json snapshots.Initiative_Tracker
- Candidates:
  - [45] Oakland Youth Apprenticeship Pipeline | Status announced | phase operational — Initiative_Tracker (InitiativeID INIT-007); snapshot: engine_audit_c108.json snapshots.Initiative_Tracker
  - [45] Oakland Youth Apprenticeship Pipeline | First training cohort placement review C108 — Initiative_Tracker (InitiativeID INIT-007)
  - [45] sentiment/communityEngagement/retail | Oakland Youth Apprenticeship Pipeline is operational — ongoing workforce effects in West Oakland, East Oakland, Fruitvale — Ripple_Ledger cycle 108 (CauseType initiative-implementation); rendered: world_summary_c108.md "## What Moved" > "### initiative-implementation"
  - [45] approval/district-sentiment | West Oakland Stabilization Fund sitting (0, capped); Oakland Alternative Response Initiative advanced (+2); Fruitvale Transit Hub Phase II — Visioning sitting (0, capped); Temescal Community Health Center sitting (0, capped); Baylight District — Final Council Vote sitting (0, capped); Oakland Youth… — Ripple_Ledger cycle 108 (CauseType approval-shift); rendered: world_summary_c108.md "## What Moved" > "### approval-shift"
  - [45] approval/district-sentiment | West Oakland Stabilization Fund sitting (0, capped); Oakland Alternative Response Initiative advanced (+2); Oakland Youth Apprenticeship Pipeline sitting (0, capped); level target 65 (mood +1.57 (district 1.51, city 1.62), district -0.66 vs middle, press +2) → +1 — Ripple_Ledger cycle 108 (CauseType approval-shift); rendered: world_summary_c108.md "## What Moved" > "### approval-shift"
  - [45] approval/district-sentiment | Oakland Alternative Response Initiative advanced (+2); Fruitvale Transit Hub Phase II — Visioning sitting (0, capped); Oakland Youth Apprenticeship Pipeline sitting (0, capped); level target 67 (mood +1.61 (district 1.60, city 1.62), district -0.31 vs middle, press +2) → +1 — Ripple_Ledger cycle 108 (CauseType approval-shift); rendered: world_summary_c108.md "## What Moved" > "### approval-shift"

_Generated by scripts/buildCivicDomainSlice.js — local records only._
