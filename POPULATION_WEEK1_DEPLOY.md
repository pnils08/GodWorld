# Population Week 1: Household Formation & Family Trees - Quick Deploy Guide

**Status:** Ready to deploy
**Time to deploy:** ~5 minutes
**Difficulty:** Easy

---

## What This Does

Adds household structure tracking, family relationships, and household lifecycle mechanics to GodWorld.

**Impact:**
- 2 new sheets created (Household_Ledger, Family_Relationships)
- 5 new columns added to Simulation_Ledger
- Household formation/dissolution mechanics
- Young adults forming independent households
- Rent burden crisis detection
- Zero breaking changes (backwards compatible)

---

## Deployment Steps

### 1. Run Migration (2 minutes)

```bash
cd ~/GodWorld

# See what will be added (safe, no changes)
node scripts/addHouseholdFamilyColumns.js --dry-run

# Apply migration
node scripts/addHouseholdFamilyColumns.js
```

**Expected output:**
```
Sheets created: 2
  - Household_Ledger (14 columns)
  - Family_Relationships (5 columns)
Columns added: 5 (to Simulation_Ledger)

✅ Migration complete!
```

### 2. Deploy to Apps Script (1 minute)

```bash
cd ~/GodWorld
git pull origin main
npm install
npx clasp push
```

**That's it!** The household formation engine is already wired into Phase 05 in godWorldEngine2.js - no manual editing needed.

### 3. Test (1 minute)

Run this in Apps Script:

```javascript
function testHouseholdFormation() {
  var ss = openSimSpreadsheet_();
  var ctx = {
    ss: ss,
    config: { cycleCount: 100 },
    summary: { cycleId: 100, storyHooks: [] },
    now: new Date()
  };

  var results = processHouseholdFormation_(ctx);
  Logger.log('Processed: ' + results.processed);
  Logger.log('Households formed: ' + results.householdsFormed);
  Logger.log('Households dissolved: ' + results.householdsDissolved);
  Logger.log('Rent burden crisis: ' + results.rentBurdenCrisis);
}
```

**Expected output:**
```
Processed: 500 (total citizens)
Households formed: 0-3
Households dissolved: 0-1
Rent burden crisis: 0-2
```

Done! Next cycle will auto-form/dissolve households.

---

## Verify It's Working

After next cycle runs, check Household_Ledger for:
- New rows (HouseholdId, HeadOfHousehold, Members)
- HouseholdType: "single", "couple", "family"
- MonthlyRent estimated by neighborhood
- Status: "active"

Check Simulation_Ledger for:
- HouseholdId populated for citizens
- MaritalStatus values
- NumChildren counts

Check logs for:
```
processHouseholdFormation_ v1.0: Complete.
Processed: 500, Formed: 2, Dissolved: 0, Births: 0
```

---

## What If It Breaks?

**Rollback:**
```bash
cd ~/GodWorld
node scripts/rollbackHouseholdFamilyColumns.js
```

Then remove from Apps Script:
1. Delete householdFormationEngine.js
2. Remove processHouseholdFormation_() call from Phase 05
3. Re-deploy

---

## Files Added

1. `scripts/addHouseholdFamilyColumns.js` - Migration
2. `phase05-citizens/householdFormationEngine.js` - Household engine
3. `scripts/rollbackHouseholdFamilyColumns.js` - Rollback

**Files Modified:**
1. Phase 05 processing (manual edit required)

---

## Household Formation Triggers

```
Young adult (Age 22-28) + No household → 15% chance/cycle
  → Creates single household
  → Estimates rent by neighborhood
  → Links citizen to household

Future enhancements (Weeks 2-4):
  → Couples forming households (marriage)
  → Births adding to family households
  → Economic hardship dissolving households
```

---

## Rent Estimates by Neighborhood

| Neighborhood | Monthly Rent |
|--------------|-------------|
| Rockridge | $2,400 |
| Piedmont Ave | $2,200 |
| Lake Merritt | $2,000 |
| Temescal | $1,900 |
| Uptown | $1,850 |
| Downtown | $1,800 |
| Jack London | $1,750 |
| KONO | $1,700 |
| Laurel | $1,650 |
| Chinatown | $1,600 |
| Fruitvale | $1,500 |
| West Oakland | $1,450 |

---

## Household Types

```
single → One person living independently
couple → Two adults, married or partnered
family → Parents + children
multigenerational → Extended family (3+ generations)
roommates → Unrelated adults sharing housing
```

---

## Rent Burden Thresholds

```
<30% of income → Affordable
30-40% of income → Moderate burden
40-50% of income → High burden (WARNING)
>50% of income → Severe burden (CRISIS)
```

---

## Story Hooks Generated

### HOUSEHOLD_FORMED (severity 2)
When young adult forms independent household:
- "New single household formed in Temescal"
- Signals economic mobility, independence

### HOUSEHOLD_DISSOLVED (severity 3)
When household breaks up due to economic stress:
- "Household dissolved in Fruitvale due to economic hardship"
- Signals displacement, crisis

### RENT_BURDEN_CRISIS (severity 6)
When household spending >50% income on rent:
- "Household in West Oakland spending 58% of income on housing"
- Signals housing affordability crisis

---

## Schema Reference

### Household_Ledger

| Column | Type | Description |
|--------|------|-------------|
| HouseholdId | String | Primary key (HH-CCCC-NNN) |
| HeadOfHousehold | String | POPID of primary member |
| HouseholdType | Enum | single/couple/family/multigenerational/roommates |
| Members | JSON | Array of POPIDs |
| Neighborhood | String | Where household is located |
| HousingType | Enum | owned/rented/subsidized |
| MonthlyRent | Number | If rented ($) |
| HousingCost | Number | If owned ($) |
| HouseholdIncome | Number | Aggregated annual income ($) |
| FormedCycle | Number | When created |
| DissolvedCycle | Number | When ended (if applicable) |
| Status | Enum | active/dissolved |

### Family_Relationships

| Column | Type | Description |
|--------|------|-------------|
| RelationshipId | String | Primary key |
| Citizen1 | String | POPID |
| Citizen2 | String | POPID |
| RelationshipType | Enum | parent-child/spouse/sibling/grandparent-grandchild |
| SinceCycle | Number | When established |
| Status | Enum | active/dissolved |

### Simulation_Ledger (+5 columns)

| Column | Type | Description |
|--------|------|-------------|
| HouseholdId | String | Link to Household_Ledger |
| MaritalStatus | Enum | single/married/partnered/divorced/widowed |
| NumChildren | Number | Count of children |
| ParentIds | JSON | Array of parent POPIDs |
| ChildrenIds | JSON | Array of children POPIDs |

---

## Next: Week 2

**Generational Wealth & Inheritance** 💰
- Wealth tracking (0-10 scale)
- Inheritance on death
- Wealth mobility
- Home ownership mechanics

---

**Ready to deploy? Just run the 4 commands above!**

**Note:** Don't forget step 3 - manual edit to Phase 05 processing
