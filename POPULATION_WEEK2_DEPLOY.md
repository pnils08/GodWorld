# Population Week 2: Generational Wealth & Inheritance - Deploy Guide

**Status:** Ready to deploy
**Time to deploy:** ~5 minutes
**Difficulty:** Easy

---

## What This Does

Adds wealth tracking, inheritance mechanics, and economic mobility to GodWorld.

**Impact:**
- 14 new columns added (6 to Simulation_Ledger, 6 to Household_Ledger, 2 to Family_Relationships)
- Real income calculation from career data
- Inheritance distribution on death
- Household income aggregation (replaces estimates with real data)
- Zero breaking changes (backwards compatible)

---

## Deployment Steps

### 1. Run Migration (2 minutes)

```bash
cd ~/GodWorld

# See what will be added (safe, no changes)
node scripts/addGenerationalWealthColumns.js --dry-run

# Apply migration
node scripts/addGenerationalWealthColumns.js
```

**Expected output:**
```
Columns added: 14
  - Simulation_Ledger: 6
  - Household_Ledger: 6
  - Family_Relationships: 2

✅ Migration complete!
```

### 2. Deploy to Apps Script (1 minute)

```bash
git pull origin main
clasp push
```

**That's it!** The wealth engine is already wired into Phase 05 in godWorldEngine2.js - no manual editing needed.

### 3. Test (1 minute)

Run this in Apps Script:

```javascript
function testGenerationalWealth() {
  var ss = openSimSpreadsheet_();
  var ctx = {
    ss: ss,
    config: { cycleCount: 100 },
    summary: {
      cycleId: 100,
      storyHooks: [],
      generationalEvents: []
    },
    now: new Date()
  };

  var results = processGenerationalWealth_(ctx);
  Logger.log('Income updated: ' + results.incomeUpdated);
  Logger.log('Wealth updated: ' + results.wealthUpdated);
  Logger.log('Inheritance processed: ' + results.inheritanceProcessed);
  Logger.log('Households updated: ' + results.householdsUpdated);
}
```

**Expected output:**
```
Income updated: 500-600 (total citizens)
Wealth updated: 500-600
Inheritance processed: 0 (no deaths yet)
Households updated: 0-5 (if households exist from Week 1)
```

Done! Next cycle will auto-calculate wealth, process inheritance, and track mobility.

---

## Verify It's Working

After next cycle runs, check Simulation_Ledger for:
- **Income** populated with dollar amounts ($35k-$150k range)
- **WealthLevel** calculated (0-10 scale)
- **InheritanceReceived** (0 initially, increases on death events)
- **NetWorth** tracked
- **SavingsRate** assigned by wealth level

Check Household_Ledger for:
- **HouseholdIncome** now using REAL citizen income (no more estimates!)
- **HouseholdWealth** aggregated from members
- **SavingsBalance** estimated

Check logs for:
```
processGenerationalWealth_ v1.0: Complete.
Income: 594, Wealth: 594, Inheritance: 0, Households: 3
```

---

## What If It Breaks?

**Rollback:**
```bash
cd ~/GodWorld
node scripts/rollbackGenerationalWealthColumns.js
```

Then remove from Apps Script:
1. Delete generationalWealthEngine.js
2. Remove processGenerationalWealth_() call from Phase 05
3. Revert householdFormationEngine.js income changes
4. Re-deploy

---

## Files Added/Modified

**Created:**
1. `scripts/addGenerationalWealthColumns.js` - Migration
2. `phase05-citizens/generationalWealthEngine.js` - Wealth engine
3. `scripts/rollbackGenerationalWealthColumns.js` - Rollback

**Modified:**
1. `phase05-citizens/householdFormationEngine.js` - Now uses real income instead of estimates
2. `phase01-config/godWorldEngine2.js` - Wired wealth engine into Phase 05

---

## Wealth Mechanics

### Income Calculation
```
Income Band → Dollar Amount:
  low  → $35,000 (Tier modifiers ±20%)
  mid  → $62,000
  high → $110,000
```

### Wealth Levels (0-10)
```
0-2:  Poverty/Low (<$45k income)
3-4:  Working class ($45k-$60k)
5:    Middle class ($60k-$85k)
6-7:  Upper-middle ($85k-$120k)
8-9:  Wealthy ($120k-$200k)
10:   Elite ($200k+)
```

### Inheritance Distribution
```
Parent dies → NetWorth × 0.8 distributed to children
No children → wealth goes to siblings/spouse
Estate tax: 20% on amounts >$1M
```

---

## Story Hooks Generated

### GENERATIONAL_WEALTH_TRANSFER (severity 5-7)
When significant inheritance distributed:
- "$250,000 inheritance distributed to 2 heirs"
- Signals wealth transfer, family dynamics

### HOME_OWNERSHIP_ACHIEVED (severity 4)
When citizen purchases home:
- "First-time homebuyer in Temescal"
- Signals economic success, wealth building

### DOWNWARD_MOBILITY (severity 6)
When wealth drops 3+ levels:
- "Citizen wealth dropped from 7 to 3"
- Signals economic hardship, crisis

---

## Integration with Other Systems

**Week 1 (Household Formation):**
- Household income now calculated from REAL citizen income
- Rent burden calculations are now accurate
- No more income estimates!

**Generational Events Engine:**
- Death events trigger inheritance distribution
- Wealth transferred to heirs automatically

**Career Engine:**
- Income derived from incomeBand in CareerState
- Promotions/job changes update income → wealth updates

---

## Next: Week 3

**Education Pipeline & Career Pathways** 🎓
- School quality tracking
- Education → career pathways
- Skill development
- Career mobility by education level

---

**Ready to deploy? Just run the 2 commands above!**

**Note:** Week 2 depends on Week 1 (household tracking). Deploy Week 1 first if you haven't already.
