---
title: Business_Ledger six-per-hood fill — research
created: 2026-08-29
updated: 2026-08-29
type: reference
tags: [research, engine, neighborhoods, economy, active]
sources:
  - live Business_Ledger + Neighborhood_Map read 2026-08-29 (lib/sheets.js; 103 BIZ rows, 22 hoods)
  - docs/canon/INSTITUTIONS.md §Neighborhoods (S374 essence for all 22)
  - docs/canon/CANON_RULES.md §Invention Authority (small-scale storefronts free; no real-world brands)
  - phase07-evening-media/buildContractSeeds.js CONTRACT_SEED_FILL_BIZ
  - docs/engine/ENGINE_STUB_REVERSE.json generated 2026-08-29 (Business_Ledger writers/readers)
  - output/grok/business-ledger-hood-fill-c104.json — scratch payload this file supersedes as the review copy
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home; Claude files the row on accept"
  - "[[../research/index]] — register here on accept, same commit Claude moves this file"
  - "[[../canon/INSTITUTIONS]] — hood essence this fill was written against"
  - "[[../plans/2026-08-22-engine-agent-fleet]] §9 — engine-wiring; OpenRouter Haiku path"
---

# Business_Ledger six-per-hood fill — research

**Reviewer note (grok, 2026-08-29):** Inbox copy only. Not written to sheets. Builder is reviewing the name list. On accept: move to `docs/research/2026-08-29-business-ledger-hood-fill.md`, register in `docs/research/index.md`, file the engine-sheet row. Scratch JSON: `output/grok/business-ledger-hood-fill-c104.json`.

**Source:** Live ledger inventory + S374 neighborhood essence + engine read-trace, 2026-08-29 (grok, builder-directed). No external paper. Real-world Oakland entities explicitly forbidden for this fill.

**What this addresses:** Seeds attach local businesses from `Business_Ledger` by neighborhood (`CONTRACT_SEED_FILL_BIZ = 2`). A tracked hood with zero rows looks empty to crons — they cover it as struggling. Every `Neighborhood_Map` hood needs at least six sim-native businesses, written to S374 essence, not 2026-Oakland strife.

**What it does (current verified state):** 22 live `Neighborhood_Map` rows. 103 `Business_Ledger` rows (schema A–I: BIZ_ID, Name, Sector, Neighborhood, Employee_Count, Avg_Salary, Annual_Revenue, Growth_Rate, Key_Personnel). Exact Neighborhood match only — `City-wide` is not hood texture. Seven hoods already at or above 6. Five hoods at 0 (Brooklyn, Eastlake, Glenview, Ivy Hill, San Antonio). Gap to the floor: **72**. Highest live id BIZ-00107; proposed ids BIZ-00108–BIZ-00179.

---

## Inventory vs floor 6

Canon short-form is INSTITUTIONS §Neighborhoods (S374). Counts are live sheet, 2026-08-29.

| Neighborhood | Dist | Have | Gap | Canon (short) |
|---|---|---:|---:|---|
| Adams Point | D8 | 1 | 5 | lake-ring, younger renters |
| Baylight District | D5 | 12 | 0 | sports mecca, new build |
| Brooklyn | D1 | 0 | 6 | quiet new waterfront housing |
| Chinatown | D2 | 1 | 5 | boom priced around it; family shops |
| Dimond | D4 | 1 | 5 | village strip, living down a name |
| Downtown | D2 | 19 | 0 | civic/corporate spine |
| East Oakland | D5 | 2 | 4 | Baylight money arriving |
| Eastlake | D8 | 0 | 6 | lake money thinning to flatlands |
| Fruitvale | D3 | 6 | 0 | transit-hub young professional |
| Glenview | D4 | 0 | 6 | intact, skipped, cheap by reputation |
| Grand Lake | D8 | 1 | 5 | theater / weekend market / family retail |
| Ivy Hill | D4 | 0 | 6 | smallest D4 village |
| Jack London | D2 | 7 | 0 | waterfront nightlife |
| KONO | D7 | 2 | 4 | Telegraph arts corridor |
| Lake Merritt | D8 | 6 | 0 | old-money elite, untouched |
| Laurel | D9 | 1 | 5 | reachable family belt |
| Piedmont Ave | D6 | 3 | 3 | boutique + medical corridor |
| Rockridge | D7 | 2 | 4 | earned-money professional |
| San Antonio | D3 | 0 | 6 | working core between hub and lake |
| Temescal | D7 | 7 | 0 | boom left behind; health |
| Uptown | D9 | 4 | 2 | arts / nightlife |
| West Oakland | D1 | 14 | 0 | boom born here; Civis |
| **Total** | | | **72** | |

Faith rows already on the ledger count toward the floor (seeds attach any hood row). Fill is commercial texture, not more churches.

**Mislabeled live rows — not remapped.** Commute child-folds (`COMMUTE_CHILD_HOOD_FOLD` in `commuteFlowEngine.js:58`) and ripple aliases contradict S374 district canon if these are "fixed" at the ledger without a named code change:

| ID | Name | Ledger Neighborhood | Commute fold | Do not silently remap to |
|---|---|---|---|---|
| BIZ-00010 | Portside Bio | Brooklyn Basin | Jack London | Brooklyn |
| BIZ-00011 | Tenth Street Digital | Old Oakland | Downtown | (Downtown is already ≥6) |
| BIZ-00029 | Coliseum District Development | Coliseum | East Oakland | Baylight District |
| BIZ-00062 | Dario's Bar | Telegraph corridor | Temescal | KONO |

**City-wide (not hood texture):** BIZ-00015 Hospital, 00016 OUSD string, 00021 Library, 00023 OFD, 00024 OPD, 00027 Parks, 00031 East Bay Regional Parks, 00032 PG&E, 00034 Housing Authority, 00035 Peralta string.

Existing real-world names already on the ledger (Kaiser, PG&E, real churches, OUSD/Peralta strings) were left alone.

---

## Proposed fill (72 rows)

Sim-native storefronts. No real Oakland brands. `Key_Personnel` blank (no invented citizens). `Growth_Rate` is annual percent (career hiring: `Employee_Count × Growth_Rate/100 ÷ 52`). Sector routing into `sectorCategory_`: Retail/Services → Small Business; Cafe/Restaurant/Food → Food & Culture; Healthcare → Healthcare; Nightlife & Entertainment → Creative & Arts. Midrise Athletic is Sector `Services` on purpose — Sector `Sports` is opted out of hiring.

| BIZ_ID | Name | Sector | Neighborhood | Emp | Avg_Salary | Annual_Revenue | Growth |
|---|---|---|---|---:|---:|---:|---:|
| BIZ-00108 | Spillover Cafe | Cafe / dining | Adams Point | 8 | 42000 | 620000 | 4 |
| BIZ-00109 | Ringlet Market | Retail | Adams Point | 11 | 39000 | 980000 | 3 |
| BIZ-00110 | Northshore Dental | Healthcare | Adams Point | 7 | 78000 | 910000 | 2 |
| BIZ-00111 | Lakeside Cycles | Retail | Adams Point | 5 | 41000 | 420000 | 5 |
| BIZ-00112 | Point Press Laundry | Services | Adams Point | 6 | 38000 | 310000 | 2 |
| BIZ-00113 | Quay Coffee | Cafe / dining | Brooklyn | 9 | 43000 | 710000 | 6 |
| BIZ-00114 | Basin Grocer | Retail | Brooklyn | 14 | 40000 | 1600000 | 5 |
| BIZ-00115 | Midrise Athletic | Services | Brooklyn | 12 | 44000 | 890000 | 6 |
| BIZ-00116 | Slip Street Kitchen | Restaurant & Dining | Brooklyn | 16 | 45000 | 1400000 | 5 |
| BIZ-00117 | New Stock Pharmacy | Retail | Brooklyn | 8 | 52000 | 1100000 | 4 |
| BIZ-00118 | Estuary Cleaners | Services | Brooklyn | 5 | 37000 | 280000 | 3 |
| BIZ-00119 | Third Street Kitchen | Restaurant & Dining | Chinatown | 14 | 41000 | 1200000 | 3 |
| BIZ-00120 | Continuity Market | Retail | Chinatown | 12 | 39000 | 1500000 | 2 |
| BIZ-00121 | Jade Thread Tailors | Services | Chinatown | 6 | 44000 | 390000 | 2 |
| BIZ-00122 | Lantern Pharmacy | Retail | Chinatown | 7 | 51000 | 860000 | 2 |
| BIZ-00123 | Heritage Bakehouse | Food & Beverage | Chinatown | 9 | 40000 | 720000 | 3 |
| BIZ-00124 | Hill Approach Cafe | Cafe / dining | Dimond | 7 | 40000 | 480000 | 3 |
| BIZ-00125 | Village Lock and Hardware | Retail | Dimond | 8 | 43000 | 920000 | 2 |
| BIZ-00126 | Strip Pharmacy | Retail | Dimond | 6 | 50000 | 740000 | 2 |
| BIZ-00127 | Two Tables Kitchen | Restaurant & Dining | Dimond | 11 | 41000 | 830000 | 3 |
| BIZ-00128 | Slope Cleaners | Services | Dimond | 4 | 36000 | 210000 | 1 |
| BIZ-00129 | Frontier Market | Retail | East Oakland | 13 | 38000 | 1400000 | 6 |
| BIZ-00130 | Crossing Cafe | Cafe / dining | East Oakland | 8 | 39000 | 540000 | 5 |
| BIZ-00131 | Flatlands Auto | Services | East Oakland | 9 | 46000 | 780000 | 4 |
| BIZ-00132 | Next Block Kitchen | Restaurant & Dining | East Oakland | 12 | 40000 | 960000 | 5 |
| BIZ-00133 | Thin Line Market | Retail | Eastlake | 10 | 39000 | 1100000 | 3 |
| BIZ-00134 | East Rim Kitchen | Restaurant & Dining | Eastlake | 12 | 41000 | 890000 | 3 |
| BIZ-00135 | Mixblock Barbers | Services | Eastlake | 5 | 37000 | 260000 | 2 |
| BIZ-00136 | Parkedge Diner | Restaurant & Dining | Eastlake | 9 | 40000 | 670000 | 3 |
| BIZ-00137 | Rim Pharmacy | Retail | Eastlake | 6 | 50000 | 690000 | 2 |
| BIZ-00138 | East Rim Laundry | Services | Eastlake | 5 | 36000 | 240000 | 2 |
| BIZ-00139 | Hillside Family Market | Retail | Glenview | 9 | 38000 | 860000 | 2 |
| BIZ-00140 | Glen Slope Cafe | Cafe / dining | Glenview | 6 | 40000 | 390000 | 2 |
| BIZ-00141 | Hillside Family Dental | Healthcare | Glenview | 6 | 76000 | 820000 | 1 |
| BIZ-00142 | Parkridge Cleaners | Services | Glenview | 4 | 36000 | 190000 | 1 |
| BIZ-00143 | Slopeview Hardware | Retail | Glenview | 7 | 42000 | 710000 | 2 |
| BIZ-00144 | Upper Village Kitchen | Restaurant & Dining | Glenview | 10 | 40000 | 740000 | 2 |
| BIZ-00145 | Marquee Grocer | Retail | Grand Lake | 12 | 40000 | 1300000 | 4 |
| BIZ-00146 | Intermission Cafe | Cafe / dining | Grand Lake | 8 | 41000 | 560000 | 4 |
| BIZ-00147 | Lake Ring Books | Retail | Grand Lake | 6 | 39000 | 410000 | 3 |
| BIZ-00148 | Saturday Stall Kitchen | Restaurant & Dining | Grand Lake | 14 | 42000 | 1100000 | 5 |
| BIZ-00149 | Ring Outfitters | Retail | Grand Lake | 7 | 43000 | 640000 | 3 |
| BIZ-00150 | Slope House Market | Retail | Ivy Hill | 6 | 37000 | 480000 | 1 |
| BIZ-00151 | One Block Cafe | Cafe / dining | Ivy Hill | 4 | 39000 | 220000 | 1 |
| BIZ-00152 | Ivy Cleaners | Services | Ivy Hill | 3 | 35000 | 140000 | 1 |
| BIZ-00153 | Hill Pocket Dental | Healthcare | Ivy Hill | 4 | 74000 | 510000 | 1 |
| BIZ-00154 | Hill Pocket Kitchen | Restaurant & Dining | Ivy Hill | 7 | 39000 | 430000 | 1 |
| BIZ-00155 | Fold Laundry | Services | Ivy Hill | 3 | 35000 | 130000 | 1 |
| BIZ-00156 | Gate Thirty Kitchen | Restaurant & Dining | KONO | 13 | 43000 | 1100000 | 5 |
| BIZ-00157 | Corridor Press | Services | KONO | 6 | 48000 | 390000 | 4 |
| BIZ-00158 | Thirty-Mac Bar | Nightlife & Entertainment | KONO | 11 | 40000 | 980000 | 5 |
| BIZ-00159 | North of Twentieth Gallery | Retail | KONO | 5 | 41000 | 310000 | 4 |
| BIZ-00160 | Reachable Market | Retail | Laurel | 12 | 38000 | 1200000 | 3 |
| BIZ-00161 | Schoolgate Cafe | Cafe / dining | Laurel | 8 | 39000 | 510000 | 3 |
| BIZ-00162 | Laurel Belt Pharmacy | Retail | Laurel | 7 | 50000 | 780000 | 2 |
| BIZ-00163 | Ordinary Street Kitchen | Restaurant & Dining | Laurel | 11 | 40000 | 820000 | 3 |
| BIZ-00164 | Belt Cleaners | Services | Laurel | 5 | 36000 | 230000 | 2 |
| BIZ-00165 | Avenue Specialists | Healthcare | Piedmont Ave | 14 | 82000 | 2100000 | 2 |
| BIZ-00166 | Lake Ring Clothiers | Retail | Piedmont Ave | 6 | 46000 | 540000 | 2 |
| BIZ-00167 | Steady Street Pharmacy | Retail | Piedmont Ave | 8 | 52000 | 960000 | 2 |
| BIZ-00168 | Canopy Market | Retail | Rockridge | 11 | 44000 | 1400000 | 3 |
| BIZ-00169 | Settled Table | Restaurant & Dining | Rockridge | 15 | 48000 | 1600000 | 3 |
| BIZ-00170 | Tree Line Dental | Healthcare | Rockridge | 8 | 88000 | 1300000 | 2 |
| BIZ-00171 | North Line Pharmacy | Retail | Rockridge | 7 | 53000 | 890000 | 2 |
| BIZ-00172 | Shift Change Kitchen | Restaurant & Dining | San Antonio | 12 | 39000 | 870000 | 3 |
| BIZ-00173 | Between Hub Market | Retail | San Antonio | 11 | 37000 | 1100000 | 3 |
| BIZ-00174 | Pressure Laundry | Services | San Antonio | 6 | 35000 | 250000 | 2 |
| BIZ-00175 | Working Core Pharmacy | Retail | San Antonio | 7 | 49000 | 710000 | 2 |
| BIZ-00176 | Park to Lake Cafe | Cafe / dining | San Antonio | 8 | 39000 | 490000 | 3 |
| BIZ-00177 | Crew Cut Barbers | Services | San Antonio | 5 | 36000 | 240000 | 2 |
| BIZ-00178 | First Lamp Club | Nightlife & Entertainment | Uptown | 16 | 41000 | 1500000 | 5 |
| BIZ-00179 | Night Walk Records | Retail | Uptown | 6 | 39000 | 430000 | 4 |

Mix vs essence: D4 quiet village (hardware, kitchen, dental, cleaners — not nightlife); Chinatown family continuity; East Oakland frontier not blight; Piedmont Ave small clinic + boutique + pharmacy (not Kaiser-class); Uptown nightlife on top of four existing rows.

---

## Extraction — how the sim reads these rows

- **Seeds → hood pool.** `buildContractSeeds.js` `contractSeedBackdropIndex_` indexes BIZ_ID / Name / Neighborhood. Empty pool = no named shop on the seed. Match is lowercase, strip non-alpha (`contractSeedNormHood_`). Neighborhood string must equal `Neighborhood_Map`.
- **Famous sightings → same index.** `buildEveningFamous_` `venuesByHood`. Filling empty hoods is what lets a Glenview sighting name a shop.
- **Commute → workplace hood.** `buildCommuteFlows_` maps `EmployerBizId` → `Business_Ledger.Neighborhood`. Exact names commute. Child-folds listed above. Do not remap those four live rows without naming the fold change.
- **Career / mint / settle ignore Neighborhood.** They bucket Sector, then hire by Growth_Rate × Employee_Count. Healthcare dental/clinic also hits the mint `public` keyword (`healthcare|medical`).
- **Chaos** picks a uniform-random row and writes Annual_Revenue / Employee_Count via intent. 72 new storefronts dilute hits on Civis/A's and put events in the empty hoods.
- **Heritage** can APPEND a family storefront after this fill. Next-id scan uses max existing; BIZ-00108–00179 must land before the next heritage roll or ids collide.

---

## Wiring card — Business_Ledger (tab)

Map: `ENGINE_STUB_REVERSE.json` generated 2026-08-29 / 183 files / 1171 fns. `runEngineAgent.js --agent engine-wiring` was aimed at native Anthropic (`--provider anthropic`) and died on credits. Correct path is default OpenRouter + `--model anthropic/claude-haiku-4.5`. Card below is from the same maps the agent uses. Manifest: `docs/engine/SHEETS_MANIFEST.md:22`. Writes are Phase-10 intents; no direct-write carve-out.

**Writers:** `chaosCarsEngine.js::flushBusinessFold_` (INTENT Annual_Revenue/Employee_Count); `applyChaosDecay.js::applyChaosDecay_` (INTENT Annual_Revenue); `runCareerEngine.js::runCareerEngine_` (INTENT Employee_Count); `generationalWealthEngine.js::updateHeritage_` (INTENT append).

**Readers:** `commuteFlowEngine.js::buildCommuteFlows_`; `chaosCarsEngine.js::loadBusinessRows_` / `pickBusinessTarget_`; `educationCareerEngine.js::buildSettleBizPool_`; `processAdvancementIntake.js::buildMintBizPool_`; `runCareerEngine.js` (live industry pool + rehire matcher); `economicRippleEngine.js::runEconomicRippleEngine_`; `buildContractSeeds.js::contractSeedBackdropIndex_`; `buildEveningFamous.js::buildEveningFamous_`.

---

## Not applicable / hazard — the fill does not fix these

These are why a seed can name a shop and the rest of the cycle still reads 2026 Oakland. Not this append.

1. **Economy engine only knows ~11 hoods.** `mapToCanonicalNeighborhood_` (`economicRippleEngine.js:368`) returns null for Adams Point, Brooklyn, Eastlake, Glenview, Dimond, Ivy Hill, San Antonio, Piedmont Ave — `detectCareerRipples_` then `continue`s. Uptown and KONO fold to Downtown. `NEIGHBORHOOD_ECONOMIES` keys only Downtown, Jack London, Baylight District, Rockridge, Temescal, Fruitvale, Lake Merritt, West Oakland, Laurel, Chinatown, Grand Lake. East Oakland is in the canonical map and missing from that object. Adding shops to Glenview does not give Glenview an economy card.
2. **Evening food is a second list.** `buildEveningFood.js` hardcoded pools (`Dollar Pho`, `Value Eats`, `Budget Bites`, `Crisis Coffee Co.`, `Golden Dragon`, `Lucky Dim Sum`, …). Does not read `Business_Ledger`. New names will not appear at dinner. The strife/budget names are the hardship register.
3. **Sports sightings still Jack London.** `buildEveningFamous_` OpeningDay/championship: Jack London 60% / Downtown 40% ("Athletes near stadium"). Canon stadium is Baylight. engine.131 exists to repoint this; the line is still Jack London.
4. **Character tables still 2026 Oakland.** `NEIGHBORHOOD_PROFILES`: Temescal `young professional`, Brooklyn `working class`, West Oakland `evolving industrial`. `NEIGHBORHOOD_CRIME_PROFILES`: East Oakland `working class, underserved` (violentCrimeMod 1.4, baseIncidents 11), West Oakland `industrial transition, gentrifying`. civic.23 already named this. Ledger shops attach to seeds; crime/placement can still paint the block as strife.

---

**Verdict:** `adopt` the 72-row append (live sheet write, engine-sheet, after builder sign-off on names). This is small-scale invention under CANON_RULES §Invention Authority — not a tier-2 institution mint. The four hazards above are **not** this fill; they need their own plan if Claude promotes them. No remap of the four child-fold rows. No scrub of existing real-world names already on the ledger.

**Proposed ROLLOUT row** (Claude assigns `engine.*` id; do not invent it here):

`Business_Ledger 6-per-hood fill — append 72 sim-native storefronts BIZ-00108–00179 (no real-world names, Key_Personnel blank) | ready | engine-sheet | this file once moved to docs/research/`

**Ignited plans:** none yet — this research *is* the append spec. Economy-map / evening-food / character-table / Baylight-sports-sighting work ignites only if Claude promotes those hazards.

---

## Applications (living)

- 2026-08-29 — Filed as the standing record for the 6-per-hood Business_Ledger fill; live inventory + proposed rows + engine read-trace.

---

## Changelog

- 2026-08-29 (grok) — Initial research (S394, builder-directed). Live sheet read; 72-row fill; code-trace notes; inbox copy for Claude.
