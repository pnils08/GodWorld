# Population & Demographics Enhancement Plan — GodWorld v3

**Created:** 2026-02-11
**Current System:** applyMigrationDrift.js v2.6, Simulation_Ledger (500 citizens)
**Approach:** Incremental enhancement (4 weeks, similar to Story & Narrative)

---

## 🚀 Implementation Status

| Week | Feature | Status | Deployed | Files |
|------|---------|--------|----------|-------|
| Week 1 | Household Formation & Family Trees | 🔜 Planned | — | — |
| Week 2 | Generational Wealth & Inheritance | 🔜 Planned | — | — |
| Week 3 | Education Pipeline & Career Pathways | 🔜 Planned | — | — |
| Week 4 | Gentrification Mechanics & Migration Reasons | 🔜 Planned | — | — |

---

## Current State Analysis

### ✅ What Already Works Well

**Migration System (applyMigrationDrift.js v2.6)**
- City-level migration drift (-50 to +50)
- Neighborhood-level migration flows
- Economic mood integration
- Neighborhood metrics (crime, sentiment, retail, events)
- Economic feedback loops (migration → economy → migration)
- Holiday/sports season effects
- Weather/chaos displacement

**Citizen Tracking**
- Simulation_Ledger (~500 Oakland named citizens)
- Generic_Citizens (~300 Tier 4 pool)
- Cultural_Ledger (~50 cultural figures)
- Chicago_Citizens (~100 satellite citizens)
- LifeHistory_Log (3,320 rows, 27 columns)
- Basic demographics (Age, Gender, Neighborhood, Occupation)

**Neighborhood Data**
- Neighborhood_Map (metrics per neighborhood)
- Neighborhood_Ledger (detailed tracking)
- CrimeIndex, Sentiment, RetailVitality, EventAttractiveness

---

## ❌ What's Missing or Weak

### 1. Household Formation & Family Structures

**Problem:** Citizens exist as individuals. No household/family tracking.

**Missing:**
- No Household ledger (who lives together?)
- No parent-child relationships
- No marriage/partnership tracking
- No household income aggregation
- No household formation triggers (graduation, job, relationship)
- No household dissolution triggers (divorce, death, economic hardship)

### 2. Generational Wealth Tracking

**Problem:** No wealth accumulation or inheritance. Citizens don't have family wealth context.

**Missing:**
- No wealth column on Simulation_Ledger
- No family wealth accumulation
- No inheritance mechanics
- No generational wealth gaps
- No wealth transfer on death
- No downward mobility tracking

### 3. Education Pipeline

**Problem:** Citizens have Occupation but no education → career pathway.

**Missing:**
- No education level tracking
- No school quality by neighborhood
- No graduation/dropout mechanics
- No career advancement tied to education
- No education → income correlation
- No school → career pipeline visualization

### 4. Gentrification Mechanics

**Problem:** Neighborhoods change but no systematic gentrification tracking.

**Missing:**
- No demographic shift tracking (income, education, race)
- No displacement pressure indicators
- No housing cost escalation
- No "at-risk of displacement" flagging
- No gentrification phase tracking (early/accelerating/advanced)
- No anti-displacement policy effects

### 5. Individual Migration Decisions

**Problem:** Migration is aggregate drift. No individual-level decisions.

**Missing:**
- No "migration trigger" events for citizens
- No destination choice (Oakland → SF → NYC)
- No migration reasons logged (job, family, cost, crime)
- No "planning to leave" vs. "just left" states
- No return migration (left Oakland, came back)

---

## 📋 Enhancement Plan (4 Weeks)

### Week 1: Household Formation & Family Trees 👨‍👩‍👧‍👦

**Goal:** Add household tracking, family relationships, and household lifecycle.

**New Sheets:**

**Household_Ledger** (new sheet)
- HouseholdId (primary key)
- HeadOfHousehold (POPID)
- HouseholdType (single, couple, family, multigenerational, roommates)
- Members (JSON array of POPIDs)
- Neighborhood
- HousingType (owned, rented, subsidized)
- MonthlyRent (if rented)
- HousingCost (if owned - mortgage/taxes)
- HouseholdIncome (aggregated from members)
- FormedCycle (when household created)
- DissolvedCycle (when household ended, if applicable)
- Status (active, dissolved)

**Family_Relationships** (new sheet)
- RelationshipId (primary key)
- Citizen1 (POPID)
- Citizen2 (POPID)
- RelationshipType (parent-child, spouse, sibling, grandparent-grandchild)
- Since Cycle (when established)
- Status (active, dissolved - for marriages/partnerships)

**New Columns (Simulation_Ledger):**
- HouseholdId (link to Household_Ledger)
- MaritalStatus (single, married, partnered, divorced, widowed)
- NumChildren (count)
- ParentIds (JSON array - who are this citizen's parents?)
- ChildrenIds (JSON array - who are this citizen's children?)

**Engine Updates:**
- New file: phase05-citizens/householdFormationEngine.js v1.0
  - formNewHouseholds_() - Young adults form households
  - dissolveHouseholds_() - Divorce, death, economic hardship
  - updateHouseholdIncome_() - Aggregate member incomes
  - detectHouseholdStress_() - High rent burden, overcrowding
  - generateBirths_() - Add children to families
  - trackMarriages_() - Form partnerships
  - trackDivorces_() - Dissolve partnerships

**Household Formation Triggers:**
- Young adult (Age 22-28) + Income > $30k → form single household
- Couple (2 adults, relationship) → form couple household
- Birth event → add child to household
- Death event → dissolve or restructure household
- Income loss → household dissolves (move in with family or roommates)

**Household Dissolution Triggers:**
- Divorce → split into 2 households
- Death of sole member → household dissolves
- Eviction (rent burden >50% income) → move in with family
- Migration → household dissolves (members leave Oakland)

**Story Hooks Generated:**
- HOUSEHOLD_FORMED (severity 2): New household established
- HOUSEHOLD_DISSOLVED (severity 3): Household breakup (divorce, eviction)
- MULTIGENERATIONAL_HOUSEHOLD (severity 4): Extended family living together (economic stress signal)
- RENT_BURDEN_CRISIS (severity 6): Household spending >50% income on rent

**Total:** 2 new sheets, 5 new columns (Simulation_Ledger), 1 new engine file, 4 hook types

---

### Week 2: Generational Wealth & Inheritance 💰

**Goal:** Track wealth accumulation, family wealth, and inheritance.

**New Columns (Simulation_Ledger):**
- WealthLevel (0-10 scale: 0=poverty, 5=middle, 10=wealthy)
- FamilyWealth (inherited/family context wealth level)
- InheritanceReceived (total inheritance received, $)
- NetWorth (estimated: savings + home equity - debts)
- SavingsRate (% of income saved per cycle)
- DebtLevel (0-10 scale: 0=debt-free, 10=severe debt)

**New Columns (Household_Ledger):**
- HouseholdWealth (aggregated wealth level)
- HomeOwnership (bool)
- HomeValue ($, if owned)
- MortgageBalance ($, if owned)
- SavingsBalance ($)
- DebtBalance ($)

**New Columns (Family_Relationships):**
- InheritanceAmount ($, for parent-child relationships)
- InheritanceCycle (when inheritance transferred)

**Engine Updates:**
- New file: phase05-citizens/generationalWealthEngine.js v1.0
  - calculateWealth_() - Derive wealth from income, savings, assets
  - processInheritance_() - Transfer wealth on death
  - trackWealthMobility_() - Upward/downward mobility
  - detectWealthGaps_() - Racial/geographic wealth disparities
  - calculateSavingsRate_() - Based on income and expenses
  - trackHomeOwnership_() - Purchase/sell homes based on wealth

**Wealth Calculation:**
```javascript
WealthLevel = f(Income, Occupation, HomeOwnership, Savings, Inheritance)

Income thresholds:
  <$30k: 0-2 (poverty/low)
  $30k-$60k: 3-5 (working/middle)
  $60k-$100k: 6-7 (upper-middle)
  $100k+: 8-10 (wealthy)

HomeOwnership: +2 wealth levels
Inheritance >$50k: +1-3 wealth levels
```

**Inheritance Mechanics:**
- Parent dies → NetWorth × 0.8 distributed to children
- No children → wealth distributed to siblings/spouse
- Estate tax simulation (>$1M: 20% tax)
- Inheritance creates wealth mobility opportunities

**Wealth Mobility:**
- Upward: Education + high-income job + home purchase
- Downward: Job loss + medical crisis + foreclosure
- Sticky: Wealth tends to persist across generations

**Story Hooks Generated:**
- GENERATIONAL_WEALTH_TRANSFER (severity 5): Large inheritance received
- WEALTH_GAP_WIDENING (severity 7): Neighborhood wealth disparity increasing
- DOWNWARD_MOBILITY (severity 6): Citizen drops 3+ wealth levels
- HOME_OWNERSHIP_ACHIEVED (severity 4): First-time homebuyer

**Total:** 6 new columns (Simulation_Ledger), 6 new columns (Household_Ledger), 3 new columns (Family_Relationships), 1 new engine file, 4 hook types

---

### Week 3: Education Pipeline & Career Pathways 🎓

**Goal:** Track education → career progression and neighborhood school quality.

**New Sheets:**

**School_Quality** (new sheet)
- Neighborhood
- SchoolQualityIndex (0-10: 0=failing, 5=adequate, 10=excellent)
- GraduationRate (%)
- CollegeReadinessRate (%)
- TeacherQuality (0-10)
- Funding ($ per student)
- LastUpdatedCycle

**New Columns (Simulation_Ledger):**
- EducationLevel (none, hs-dropout, hs-diploma, some-college, bachelor, graduate)
- SchoolQuality (quality of school attended, 0-10)
- CareerStage (student, entry-level, mid-career, senior, retired)
- YearsInCareer (tracking career progression)
- CareerMobility (stagnant, advancing, declining)
- LastPromotion Cycle

**Engine Updates:**
- New file: phase05-citizens/educationCareerEngine.js v1.0
  - processGraduations_() - Students graduate based on school quality
  - processDropouts_() - Poor school quality → higher dropout rate
  - processCareerAdvancement_() - Education + experience → promotions
  - updateSchoolQuality_() - Neighborhood economy affects schools
  - matchEducationToIncome_() - Education → income correlation
  - trackSocialMobility_() - Education as mobility pathway

**Education → Career Pipeline:**

```
No HS diploma → low-wage jobs ($25k-$35k)
  - Occupations: retail, food service, manual labor
  - Career ceiling: supervisor (~$40k)

HS diploma → working-class jobs ($35k-$55k)
  - Occupations: trades, office work, service
  - Career ceiling: manager (~$65k)

Some college → mid-tier jobs ($45k-$70k)
  - Occupations: technician, coordinator, specialist
  - Career ceiling: senior specialist (~$85k)

Bachelor → professional jobs ($60k-$100k)
  - Occupations: engineer, analyst, teacher, nurse
  - Career ceiling: director (~$150k)

Graduate → high-earning jobs ($80k-$200k+)
  - Occupations: lawyer, doctor, exec, professor
  - Career ceiling: C-suite (~$300k+)
```

**School Quality Effects:**

| Quality | Graduation Rate | College Readiness | Career Impact |
|---------|----------------|-------------------|---------------|
| 0-2 (failing) | 50-60% | 10% | -2 career levels |
| 3-5 (adequate) | 70-80% | 30% | No modifier |
| 6-8 (good) | 85-92% | 50% | +1 career level |
| 9-10 (excellent) | 95%+ | 75% | +2 career levels |

**Career Advancement:**
- Entry → Mid: 5-10 cycles + adequate performance
- Mid → Senior: 10-15 cycles + high education/performance
- Stagnation: No advancement in 20+ cycles
- Decline: Demotion due to industry collapse or age discrimination

**Story Hooks Generated:**
- SCHOOL_QUALITY_CRISIS (severity 8): Neighborhood school quality <3
- DROPOUT_WAVE (severity 6): Graduation rate <65%
- CAREER_BREAKTHROUGH (severity 4): Citizen promoted 2+ levels
- EDUCATION_MOBILITY (severity 5): First in family to graduate college

**Total:** 1 new sheet, 6 new columns (Simulation_Ledger), 1 new engine file, 4 hook types

---

### Week 4: Gentrification Mechanics & Migration Reasons 🏘️

**Goal:** Track gentrification phases, displacement pressure, and individual migration decisions.

**New Columns (Neighborhood_Ledger):**
- GentrificationPhase (none, early, accelerating, advanced, stable-affluent)
- DisplacementPressure (0-10: 0=none, 10=severe)
- MedianIncome ($ per household)
- MedianIncomeChange5yr (% change)
- MedianRent ($)
- MedianRentChange5yr (% change)
- DemographicShiftIndex (0-10: rapid demographic change)
- WhitePopulationPct (%)
- WhitePopulationChange5yr (% change)
- HighEducationPct (% with bachelor+)
- GentrificationStartCycle

**New Columns (Simulation_Ledger):**
- DisplacementRisk (0-10: likelihood of forced move)
- MigrationIntent (staying, considering, planning-to-leave, left)
- MigrationReason (job, family, cost, crime, opportunity, displaced)
- MigrationDestination (if left: "SF", "NYC", "Atlanta", etc.)
- MigratedCycle (when left Oakland)
- ReturnedCycle (if came back)

**New Sheet: Migration_Events** (new sheet)
- EventId (primary key)
- POPID
- EventType (moved-in, moved-out, moved-within, returned)
- FromNeighborhood
- ToNeighborhood (or city if moved-out)
- Reason (job, family, cost, crime, opportunity, displaced)
- Cycle
- PushFactors (JSON: what drove them away)
- PullFactors (JSON: what attracted them)

**Engine Updates:**
- phase06-analysis/applyMigrationDrift.js v2.6 → v3.0
  - Add individual migration decisions (not just aggregate)
  - Log migration events to Migration_Events sheet
  - Track migration reasons

- New file: phase05-citizens/gentrificationEngine.js v1.0
  - detectGentrification_() - Calculate gentrification phase
  - calculateDisplacementPressure_() - Rent burden + income mismatch
  - trackDemographicShift_() - Income/education/race changes
  - flagAtRiskCitizens_() - High displacement risk
  - processForcedMoves_() - Evictions, rent increases
  - trackNeighborhoodTransition_() - Early → accelerating → advanced

**Gentrification Detection:**

```javascript
GentrificationPhase = f(
  MedianIncomeChange5yr,
  MedianRentChange5yr,
  DemographicShiftIndex,
  WhitePopulationChange5yr,
  HighEducationPct
)

Early gentrification:
  - Median income rising 10-20%/5yr
  - Median rent rising 15-25%/5yr
  - White population rising 5-10%
  - High-education population rising 10-15%

Accelerating gentrification:
  - Median income rising 25-40%/5yr
  - Median rent rising 30-50%/5yr
  - White population rising 15-25%
  - Displacement pressure 6-8

Advanced gentrification:
  - Median income up 50%+/5yr
  - Median rent up 60%+/5yr
  - White population up 30%+
  - Displacement pressure 8-10
  - Original residents <30% of population
```

**Displacement Risk Factors:**

| Factor | Risk Weight |
|--------|------------|
| Rent burden >50% income | +4 |
| Renter (not owner) | +2 |
| Income <neighborhood median | +3 |
| No college degree | +2 |
| Black/Latino in gentrifying area | +2 |
| Senior citizen (Age >65) | +1 |
| Rent increase >20% in 1 year | +5 |

**Migration Reasons Tracking:**

**Push factors (why leave):**
- cost: Rent >60% income
- crime: Neighborhood CrimeIndex >1.5
- job: Lost job + no local opportunities
- displaced: Evicted or priced out
- quality-of-life: Sentiment <-0.5

**Pull factors (why destination):**
- job: Job offer in new city
- family: Relatives in destination
- opportunity: Better schools/economy
- affordability: Lower cost of living
- return: Coming back to Oakland (nostalgia/family)

**Story Hooks Generated:**
- GENTRIFICATION_ACCELERATING (severity 8): Neighborhood enters accelerating phase
- DISPLACEMENT_CRISIS (severity 9): 10+ citizens at severe displacement risk
- FORCED_MIGRATION (severity 7): Citizen evicted/displaced
- NEIGHBORHOOD_TRANSFORMATION (severity 6): Demographics shift dramatically

**Total:** 11 new columns (Neighborhood_Ledger), 6 new columns (Simulation_Ledger), 1 new sheet (Migration_Events), 2 engine files (1 new, 1 updated), 4 hook types

---

## 📊 Implementation Summary

### Total New Columns

| Sheet | New Columns | Existing | New Total |
|-------|-------------|----------|-----------|
| Simulation_Ledger | 23 | 27 | 50 |
| Household_Ledger | 14 | 0 | 14 (new sheet) |
| Family_Relationships | 5 | 0 | 5 (new sheet) |
| School_Quality | 7 | 0 | 7 (new sheet) |
| Migration_Events | 9 | 0 | 9 (new sheet) |
| Neighborhood_Ledger | 11 | ~20 | ~31 |

**Total: 69 new columns across 6 sheets (4 new sheets created)**

### New Engine Files

1. `phase05-citizens/householdFormationEngine.js` v1.0 (Week 1)
2. `phase05-citizens/generationalWealthEngine.js` v1.0 (Week 2)
3. `phase05-citizens/educationCareerEngine.js` v1.0 (Week 3)
4. `phase05-citizens/gentrificationEngine.js` v1.0 (Week 4)

### Updated Engine Files

1. `phase06-analysis/applyMigrationDrift.js` v2.6 → v3.0 (Week 4)

---

## 🎯 Story Hook Types Added

| Week | Hook Types | Severity Range | Purpose |
|------|------------|----------------|---------|
| 1 | HOUSEHOLD_FORMED, HOUSEHOLD_DISSOLVED, MULTIGENERATIONAL_HOUSEHOLD, RENT_BURDEN_CRISIS | 2-6 | Household lifecycle |
| 2 | GENERATIONAL_WEALTH_TRANSFER, WEALTH_GAP_WIDENING, DOWNWARD_MOBILITY, HOME_OWNERSHIP_ACHIEVED | 4-7 | Wealth dynamics |
| 3 | SCHOOL_QUALITY_CRISIS, DROPOUT_WAVE, CAREER_BREAKTHROUGH, EDUCATION_MOBILITY | 4-8 | Education/career |
| 4 | GENTRIFICATION_ACCELERATING, DISPLACEMENT_CRISIS, FORCED_MIGRATION, NEIGHBORHOOD_TRANSFORMATION | 6-9 | Gentrification |

**Total: 16 new story hook types**

---

## 🚀 Rollout Strategy

**Week 1:**
1. Create Household_Ledger and Family_Relationships sheets
2. Add 5 columns to Simulation_Ledger
3. Create householdFormationEngine.js v1.0
4. Integrate into Phase 05
5. Test household formation triggers

**Week 2:**
1. Add 6 columns to Simulation_Ledger
2. Add 6 columns to Household_Ledger
3. Add 3 columns to Family_Relationships
4. Create generationalWealthEngine.js v1.0
5. Integrate into Phase 05
6. Test inheritance mechanics

**Week 3:**
1. Create School_Quality sheet
2. Add 6 columns to Simulation_Ledger
3. Create educationCareerEngine.js v1.0
4. Integrate into Phase 05
5. Test education → career pipeline

**Week 4:**
1. Create Migration_Events sheet
2. Add 11 columns to Neighborhood_Ledger
3. Add 6 columns to Simulation_Ledger
4. Create gentrificationEngine.js v1.0
5. Update applyMigrationDrift.js to v3.0
6. Integrate into Phase 05 and Phase 06
7. Test gentrification detection

**Each week:** Migration script + rollback script (like Story & Narrative)

---

## 📚 Documentation Needed

**For Mara Vance:**
- POPULATION_DEMOGRAPHICS_MASTER_REFERENCE.md
- Household lifecycle guide
- Gentrification storytelling guide
- Wealth gap narratives

**For Media Room:**
- Displacement crisis coverage guide
- Generational wealth feature stories
- Education inequality angles
- Migration pattern analysis

**For Engineers:**
- Technical specs for each week
- Migration scripts
- Testing scenarios
- Performance optimization (new sheets = more data)

---

## 🔧 Example Use Cases

### Use Case 1: Household Formation

**Scenario:** Emma Chen (Age 25, Income $55k) graduates, gets job.

**Week 1 Processing:**
1. Detect: Age 25 + Income >$30k → trigger household formation
2. Create HouseholdId: HH-00123
3. HouseholdType: "single"
4. Neighborhood: Emma's current neighborhood
5. HousingType: "rented"
6. MonthlyRent: $1,800 (based on neighborhood)
7. Generate HOUSEHOLD_FORMED hook

**Media Room Action:** Profile on young professionals forming households in Oakland

### Use Case 2: Generational Wealth Transfer

**Scenario:** Robert Martinez (Age 72, NetWorth $850k) dies. Has 2 children.

**Week 2 Processing:**
1. NetWorth $850k × 0.8 = $680k to distribute
2. 2 children → $340k each
3. Child 1 (Maria): WealthLevel 4 → 7 (+inheritance)
4. Child 2 (Jose): WealthLevel 3 → 6 (+inheritance)
5. Generate GENERATIONAL_WEALTH_TRANSFER hook

**Media Room Action:** Feature on inheritance wealth gaps in Oakland

### Use Case 3: Education Mobility

**Scenario:** Jamal Robinson (Age 22, SchoolQuality 3, EducationLevel "hs-diploma") in West Oakland.

**Week 3 Processing:**
1. Low school quality (3) → limited career options
2. EducationLevel "hs-diploma" → $35k-$55k jobs
3. Enrolled in community college (some-college)
4. After 4 cycles: graduates with associate degree
5. CareerStage: entry-level → mid-career
6. Income: $42k → $58k
7. Generate EDUCATION_MOBILITY hook

**Media Room Action:** Story on community college as pathway to middle class

### Use Case 4: Gentrification Displacement

**Scenario:** Fruitvale neighborhood showing gentrification signs.

**Week 4 Processing:**
1. MedianIncome: $45k → $62k (+38% in 5 years)
2. MedianRent: $1,400 → $2,100 (+50% in 5 years)
3. WhitePopulation: 8% → 18% (+10% in 5 years)
4. GentrificationPhase: "none" → "accelerating"
5. Flag 15 citizens with DisplacementRisk >7
6. Generate GENTRIFICATION_ACCELERATING hook
7. Track 3 forced migrations (MigrationReason: "displaced")

**Media Room Action:** Deep dive on Fruitvale gentrification and displacement

---

## ❓ Open Questions

1. **Household formation rate:** How many new households per cycle?
2. **Inheritance tax simulation:** Flat 20% or progressive?
3. **School quality updates:** How often? Based on what factors?
4. **Gentrification thresholds:** Are 5yr change rates appropriate?
5. **Migration destination modeling:** Which cities? Bay Area only or national?
6. **Computational load:** 4 new sheets + 69 columns = performance impact?

---

## 📊 Success Metrics

**After Week 1:**
- Households formed/dissolved each cycle (expect 2-5)
- Average household size (expect 2.3 people)
- Rent burden distribution (expect 20% >40% income)

**After Week 2:**
- Wealth distribution by decile
- Inheritance events per cycle (expect 1-2)
- Wealth mobility rate (upward vs. downward)

**After Week 3:**
- Education → income correlation (expect 0.7+)
- School quality variance by neighborhood
- Career advancement rate (expect 10-15% promotions/year)

**After Week 4:**
- Gentrifying neighborhoods flagged (expect 2-4)
- Displacement events per cycle (expect 1-3)
- Migration reasons distribution
- Individual migration event logging (expect 5-10/cycle)

---

**Status:** Ready for Week 1 design
**Next:** Review plan, design Week 1 implementation approach
