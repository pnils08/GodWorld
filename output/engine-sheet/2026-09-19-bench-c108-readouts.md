# Bench C108 readouts, 2026-09-19 (SANDBOX 0908, each on a fresh live-synced C107)

## CONTROL — PROD @100 b58d8a2b (bench @60)
BENCH cycleCount 108
Engine_Errors rows total 0 | mentioning 108: 0
hood | cyc | retail | night | noise | event | sent | crime | traj | hp | demo
Rockridge | 108 | 10 | 0.78 | 3.86 | 8.4 | 0.14 | 0.44 | growth | 5 | Inflow surge
KONO | 108 | 9.68 | 1.01 | 6.29 | 10.25 | -0.09 | 0.62 | steady | 0 | Stable
Downtown | 108 | 9.41 | 1.1 | 8.73 | 11.37 | 0.07 | 1 | growth | 5 | Civic pressure zone
Uptown | 108 | 8.8 | 1.15 | 7.58 | 11.44 | 0.02 | 0.66 | growth | 5 | Stable
Jack London | 108 | 8.45 | 1.47 | 7.44 | 18.73 | 0.1 | 0.78 | growth | 3.5 | Mild inflow
Grand Lake | 108 | 8.13 | 0.89 | 5.02 | 9 | 0.03 | 0.47 | growth | 3 | Inflow surge
Temescal | 108 | 8.07 | 1.03 | 5.59 | 10.33 | 0.2 | 0.69 | growth | 6.5 | Mild inflow
Chinatown | 108 | 7.22 | 1.1 | 8.28 | 10.43 | 0.05 | 0.78 | steady | 0 | Mild outflow
Fruitvale | 108 | 7.05 | 0.96 | 6.17 | 10 | 0.19 | 0.9 | steady | 0 | Mild outflow
Piedmont Ave | 108 | 6.92 | 0.69 | 3.32 | 5.35 | 0.06 | 0.33 | steady | 0 | Stable
Lake Merritt | 108 | 6.92 | 0.82 | 4.55 | 9.73 | 0.11 | 0.74 | steady | 3.5 | Mild inflow
Dimond | 108 | 6.14 | 0.7 | 3.7 | 5 | 0 | 0.62 | steady | 0 | Stable
Eastlake | 108 | 6.05 | 0.8 | 4.5 | 9.44 | 0.11 | 0.55 | decay | 0 | Stable
Laurel | 108 | 5.99 | 0.69 | 4.61 | 7.67 | 0.17 | 0.4 | steady | 0 | Mild outflow
East Oakland | 108 | 5.7 | 0.69 | 6.48 | 7.25 | 0.03 | 0.97 | steady | 0 | Stable
San Antonio | 108 | 5.59 | 0.87 | 6.22 | 7.25 | -0.04 | 0.73 | steady | 0 | Mild inflow
Adams Point | 108 | 5.46 | 0.79 | 4.6 | 6.21 | 0.06 | 0.59 | steady | 0 | Mild inflow
Glenview | 108 | 4.99 | 0.6 | 3.17 | 5 | 0.07 | 0.39 | decay | 0 | Inflow surge
Brooklyn | 108 | 4.69 | 0.69 | 5.18 | 5.08 | 0.01 | 0.47 | decay | 0 | Inflow surge
Ivy Hill | 108 | 3.81 | 0.44 | 2.49 | 4 | 0.03 | 0.45 | steady | 0 | Mild inflow
Baylight District | 108 | 3.6 | 0.48 | 8.35 | 5 | 0.07 | 0.8 | decay | 0 | Mild outflow
West Oakland | 108 | 3.42 | 0.78 | 6.96 | 6.73 | 0.06 | 0.95 | decay | 0 | Civic pressure zone

## TREATMENT 1 — 536684df engine.235/237/239 (bench @59)
Jack London | 10.51 | 0.07 | 0.78 | growth | 3.5
Rockridge | 9.78 | 0.03 | 0.44 | growth | 5
Downtown | 9.74 | 0.06 | 1 | growth | 5
Grand Lake | 9.42 | 0.07 | 0.47 | growth | 3
Uptown | 9.41 | 0 | 0.66 | growth | 5
Fruitvale | 9.35 | 0.2 | 0.9 | steady | 0
Piedmont Ave | 9.27 | 0.01 | 0.33 | steady | 0
Chinatown | 8.2 | 0.05 | 0.78 | steady | 0
West Oakland | 7.92 | 0.09 | 0.95 | decay | 0
KONO | 7.51 | -0.13 | 0.62 | steady | 0
Lake Merritt | 7.36 | 0.05 | 0.74 | steady | 3.5
Brooklyn | 7.12 | 0.07 | 0.47 | decay | 0
Dimond | 6.61 | 0 | 0.62 | steady | 0
Laurel | 5.86 | 0.15 | 0.4 | steady | 0
East Oakland | 5.52 | 0.19 | 0.97 | steady | 0
Adams Point | 5.35 | 0.13 | 0.59 | steady | 0
Eastlake | 5.1 | 0.15 | 0.55 | decay | 0
Temescal | 4.97 | 0.16 | 0.69 | growth | 6.5
Glenview | 4.67 | 0.1 | 0.39 | decay | 0
Ivy Hill | 4.58 | 0.03 | 0.45 | steady | 0
Baylight District | 4.56 | 0.11 | 0.8 | decay | 0
San Antonio | 4.45 | 0.04 | 0.73 | steady | 0

## TREATMENT 2 — 2cd142a9 +239b (bench @61)
BENCH cycleCount 108
Engine_Errors rows total 0 | mentioning 108: 0
hood | cyc | retail | night | noise | event | sent | crime | traj | hp | demo
Jack London | 108 | 10.51 | 1.83 | 7.73 | 21.7 | 0.07 | 0.78 | growth | 3.5 | Mild inflow
Rockridge | 108 | 9.82 | 0.78 | 3.62 | 9.54 | 0.03 | 0.44 | growth | 5 | Mild inflow
Downtown | 108 | 9.74 | 0.82 | 8.23 | 11.89 | 0.06 | 1 | growth | 5 | Civic pressure zone
Grand Lake | 108 | 9.47 | 0.85 | 5.6 | 12 | -0.16 | 0.47 | growth | 3 | Inflow surge
Uptown | 108 | 9.41 | 1.08 | 7.56 | 14.56 | 0 | 0.66 | growth | 5 | Mild outflow
Fruitvale | 108 | 9.35 | 0.93 | 6.79 | 11.44 | 0.2 | 0.9 | steady | 0 | Stable
Piedmont Ave | 108 | 9.27 | 0.61 | 3.76 | 7.33 | 0.01 | 0.33 | steady | 0 | Outflow pressure
Chinatown | 108 | 8.24 | 0.89 | 7.74 | 12.6 | 0.05 | 0.78 | steady | 0 | Mild outflow
West Oakland | 108 | 7.92 | 0.75 | 6.96 | 9.74 | 0.09 | 0.95 | decay | 0 | Civic pressure zone
KONO | 108 | 7.51 | 1.15 | 6.47 | 13 | -0.13 | 0.62 | steady | 0 | Stable
Lake Merritt | 108 | 7.36 | 0.6 | 3.4 | 6.53 | 0.05 | 0.74 | steady | 3.5 | Mild inflow
Brooklyn | 108 | 7.16 | 0.51 | 3.32 | 6.08 | -0.14 | 0.47 | decay | 0 | Mild inflow
Dimond | 108 | 6.65 | 0.65 | 4.14 | 8 | -0.24 | 0.62 | steady | 0 | Mild outflow
Laurel | 108 | 5.89 | 0.79 | 4.86 | 9.53 | 0.15 | 0.4 | steady | 0 | Mild outflow
Adams Point | 108 | 5.35 | 0.51 | 3.51 | 6.21 | -0.11 | 0.59 | steady | 0 | Mild inflow
East Oakland | 108 | 5.28 | 0.79 | 6.88 | 8.5 | -0.03 | 0.97 | steady | 0 | Mild outflow
Eastlake | 108 | 5.11 | 0.71 | 5.15 | 11.44 | -0.08 | 0.55 | decay | 0 | Stable
Temescal | 108 | 4.92 | 0.75 | 5.48 | 10.36 | 0.16 | 0.69 | growth | 6.5 | Inflow surge
Glenview | 108 | 4.67 | 0.55 | 3.29 | 6 | -0.14 | 0.39 | decay | 0 | Mild outflow
Ivy Hill | 108 | 4.58 | 0.58 | 3.37 | 6 | -0.2 | 0.45 | steady | 0 | Mild inflow
Baylight District | 108 | 4.56 | 0.47 | 8.35 | 7.5 | -0.13 | 0.8 | decay | 0 | Mild outflow
San Antonio | 108 | 4.47 | 0.82 | 6.77 | 9 | -0.17 | 0.73 | steady | 0 | Inflow surge

## TREATMENT 3 — a1f973a3 +239c = PROD @101 (bench @62)
BENCH cycleCount 108
Engine_Errors rows total 0 | mentioning 108: 0
hood | cyc | retail | night | noise | event | sent | crime | traj | hp | demo
Jack London | 108 | 10.51 | 1.83 | 7.73 | 21.7 | 0.07 | 0.78 | growth | 3.5 | Mild inflow
Rockridge | 108 | 9.78 | 0.78 | 3.62 | 9.54 | 0.03 | 0.44 | growth | 5 | Mild inflow
Downtown | 108 | 9.74 | 0.82 | 8.23 | 11.89 | 0.06 | 1 | growth | 5 | Civic pressure zone
Grand Lake | 108 | 9.42 | 0.85 | 5.6 | 12 | 0.07 | 0.47 | growth | 3 | Inflow surge
Uptown | 108 | 9.41 | 1.08 | 7.56 | 14.56 | 0 | 0.66 | growth | 5 | Mild outflow
Fruitvale | 108 | 9.35 | 0.93 | 6.79 | 11.44 | 0.2 | 0.9 | steady | 0 | Stable
Piedmont Ave | 108 | 9.27 | 0.61 | 3.76 | 7.33 | 0.01 | 0.33 | steady | 0 | Outflow pressure
Chinatown | 108 | 8.2 | 0.89 | 7.74 | 12.6 | 0.05 | 0.78 | steady | 0 | Mild outflow
West Oakland | 108 | 7.92 | 0.75 | 6.96 | 9.74 | 0.09 | 0.95 | decay | 0 | Civic pressure zone
KONO | 108 | 7.51 | 1.15 | 6.47 | 13 | -0.13 | 0.62 | steady | 0 | Stable
Lake Merritt | 108 | 7.36 | 0.6 | 3.4 | 6.53 | 0.05 | 0.74 | steady | 3.5 | Mild inflow
Brooklyn | 108 | 7.12 | 0.51 | 3.32 | 6.08 | 0.07 | 0.47 | decay | 0 | Mild inflow
Dimond | 108 | 6.61 | 0.65 | 4.14 | 8 | 0 | 0.62 | steady | 0 | Mild outflow
Laurel | 108 | 5.86 | 0.79 | 4.86 | 9.53 | 0.15 | 0.4 | steady | 0 | Mild outflow
East Oakland | 108 | 5.52 | 0.79 | 6.88 | 8.5 | 0.19 | 0.97 | steady | 0 | Mild outflow
Adams Point | 108 | 5.35 | 0.51 | 3.51 | 6.21 | 0.13 | 0.59 | steady | 0 | Mild inflow
Eastlake | 108 | 5.1 | 0.71 | 5.15 | 11.44 | 0.15 | 0.55 | decay | 0 | Stable
Temescal | 108 | 4.97 | 0.75 | 5.48 | 10.36 | 0.16 | 0.69 | growth | 6.5 | Inflow surge
Glenview | 108 | 4.67 | 0.55 | 3.29 | 6 | 0.1 | 0.39 | decay | 0 | Mild outflow
Ivy Hill | 108 | 4.58 | 0.58 | 3.37 | 6 | 0.03 | 0.45 | steady | 0 | Mild inflow
Baylight District | 108 | 4.56 | 0.47 | 8.35 | 7.5 | 0.11 | 0.8 | decay | 0 | Mild outflow
San Antonio | 108 | 4.45 | 0.82 | 6.77 | 9 | 0.04 | 0.73 | steady | 0 | Inflow surge

## TREATMENT 4 — PROD @101 on live AFTER the engine.241 recalibration (bench @62, fresh sync)
cycleCount 108
Engine_Errors rows 0
Crime_Metrics cols: Neighborhood,PropertyCrimeIndex,ViolentCrimeIndex,ResponseTimeAvg,ClearanceRate,IncidentCount,LastUpdated,PropertyLevel,ViolentLevel,QolLevel,Trend,Hotspot,PressureRatio
Downtown           idx 34/20 (pre 37/21) lvl 37.06/21.04 | trend steady | hot  | ratio 0.91 | clr 0.18 | resp 10.5
Temescal           idx 43/22 (pre 46/25) lvl 45.81/24.9 | trend steady | hot  | ratio 1.09 | clr 0.21 | resp 10.6
Rockridge          idx 34/20 (pre 38/24) lvl 37.7/23.9 | trend steady | hot  | ratio 0.91 | clr 0.16 | resp 10.4
Fruitvale          idx 37/27 (pre 39/30) lvl 38.7/30.31 | trend steady | hot  | ratio 1.08 | clr 0.18 | resp 10.5
West Oakland       idx 34/24 (pre 37/27) lvl 37.2/26.9 | trend steady | hot  | ratio 0.97 | clr 0.19 | resp 10.3
East Oakland       idx 34/32 (pre 41/33) lvl 40.9/33.31 | trend falling | hot  | ratio 1.11 | clr 0.21 | resp 10.7
Lake Merritt       idx 32/20 (pre 36/22) lvl 35.99/22.1 | trend steady | hot  | ratio 0.87 | clr 0.2 | resp 11.2
Jack London        idx 36/17 (pre 38/20) lvl 38.2/19.6 | trend steady | hot  | ratio 0.89 | clr 0.18 | resp 10.7
Piedmont Ave       idx 31/23 (pre 37/24) lvl 36.6/24.3 | trend falling | hot  | ratio 0.91 | clr 0.18 | resp 10.1
Grand Lake         idx 38/25 (pre 40/27) lvl 40.4/26.9 | trend steady | hot  | ratio 1.06 | clr 0.21 | resp 11.2
Chinatown          idx 36/24 (pre 41/27) lvl 40.52/26.9 | trend falling | hot  | ratio 1.01 | clr 0.17 | resp 10.4
Adams Point        idx 39/23 (pre 41/24) lvl 40.5/24.29 | trend steady | hot  | ratio 1.04 | clr 0.21 | resp 10.4
Dimond             idx 40/26 (pre 41/28) lvl 41.41/28.1 | trend steady | hot  | ratio 1.11 | clr 0.21 | resp 10.4
Glenview           idx 34/27 (pre 41/30) lvl 40.8/29.6 | trend falling | hot  | ratio 1.03 | clr 0.16 | resp 10.7
Laurel             idx 36/22 (pre 41/27) lvl 40.5/26.9 | trend falling | hot  | ratio 0.97 | clr 0.18 | resp 9.8
Uptown             idx 32/20 (pre 37/23) lvl 37/22.6 | trend falling | hot  | ratio 0.87 | clr 0.2 | resp 11.1
KONO               idx 40/21 (pre 41/24) lvl 40.5/24.33 | trend steady | hot  | ratio 1.03 | clr 0.2 | resp 10.7
Brooklyn           idx 33/24 (pre 38/28) lvl 38.3/28.1 | trend falling | hot  | ratio 0.96 | clr 0.18 | resp 11.1
Eastlake           idx 36/25 (pre 41/27) lvl 40.61/26.9 | trend falling | hot  | ratio 1.03 | clr 0.18 | resp 11.1
Ivy Hill           idx 36/23 (pre 41/27) lvl 40.5/27.3 | trend falling | hot  | ratio 0.99 | clr 0.16 | resp 11.2
San Antonio        idx 38/27 (pre 42/30) lvl 42.2/29.81 | trend steady | hot  | ratio 1.09 | clr 0.18 | resp 11
Baylight District  idx 31/24 (pre 33/26) lvl 32.7/26.3 | trend steady | hot  | ratio 0.92 | clr 0.16 | resp 10.3
hoods with a >=5 shift vs the recalibrated baseline: 9 | hotspot hoods: none
Civis storyline rows in tracker: 1
   {"CycleAdded":"108","StorylineType":"new","Neighborhood":"","RelatedCitizens":"Elias Varek","Priority":"high","Status":"active","StorylineId":"","Title":"","AssignedReporter":""}
Neighborhood_Map CrimeIndex C108: Downtown 0.54 | Temescal 0.65 | Laurel 0.52 | West Oakland 0.58 | Fruitvale 0.64 | Jack London 0.53 | Rockridge 0.54 | Adams Point 0.6 | Grand Lake 0.6 | Piedmont Ave 0.54 | Chinatown 0.6 | Brooklyn 0.57 | Eastlake 0.61 | Glenview 0.56 | Dimond 0.66 | Ivy Hill 0.59 | San Antonio 0.65 | KONO 0.61 | Lake Merritt 0.52 | Uptown 0.52 | Baylight District 0.55 | East Oakland 0.66

Previous readings were then rewritten on live as level + each hood's own C107 swing (writeCrimePrevReadings.js): against this C108 output, 2 hoods cross the 5-point shift threshold (East Oakland violent +5, Dimond property +5) instead of 9 all-falling.

## MULTI-CYCLE — bench @62 (= PROD @101) C109–C111 continuing from treatment 4 (answers kimi final review B2/B3)

### C109 Neighborhood_Map
BENCH cycleCount 109
Engine_Errors rows total 0 | mentioning 108: 0
hood | cyc | retail | night | noise | event | sent | crime | traj | hp | demo
Jack London | 109 | 11.4 | 0.92 | 4.63 | 8.1 | -0.05 | 0.52 | growth | 4.5 | Mild inflow
Uptown | 109 | 10.1 | 0.98 | 4.83 | 8.21 | -0.17 | 0.53 | steady | 4.5 | Mild inflow
Fruitvale | 109 | 10.08 | 0.69 | 4.49 | 6.41 | 0.01 | 0.62 | growth | 0.5 | Inflow surge
Piedmont Ave | 109 | 10 | 0.46 | 2.32 | 4.53 | -0.18 | 0.51 | steady | 0 | Stable
Rockridge | 109 | 9.62 | 0.66 | 2.54 | 5.18 | -0.2 | 0.56 | growth | 6 | Civic pressure zone
Grand Lake | 109 | 9.58 | 0.72 | 3.64 | 7 | -0.15 | 0.57 | growth | 4 | Inflow surge
Downtown | 109 | 9 | 0.59 | 5.18 | 9.2 | 0.02 | 0.52 | steady | 4.5 | Civic pressure zone
Chinatown | 109 | 8.08 | 0.74 | 4.6 | 7.32 | -0.11 | 0.62 | steady | 0 | Mild inflow
West Oakland | 109 | 7.78 | 0.58 | 4.38 | 5.21 | -0.01 | 0.6 | steady | 0 | Civic pressure zone
Lake Merritt | 109 | 7.46 | 0.39 | 2.14 | 3.33 | -0.07 | 0.53 | steady | 3 | Mild outflow
Brooklyn | 109 | 7.14 | 0.46 | 2.16 | 3.04 | -0.2 | 0.59 | steady | 0 | Mild outflow
KONO | 109 | 6.85 | 0.89 | 3.99 | 7.25 | -0.29 | 0.58 | steady | 0 | Stable
Dimond | 109 | 6.43 | 0.5 | 2.51 | 4.25 | -0.31 | 0.65 | decay | 0 | Mild outflow
Laurel | 109 | 5.84 | 0.53 | 2.82 | 5.45 | -0.08 | 0.62 | steady | 0 | Mild inflow
Eastlake | 109 | 5.51 | 0.6 | 3.03 | 6.72 | -0.13 | 0.57 | growth | 0.5 | Mild inflow
Temescal | 109 | 5 | 0.7 | 3.4 | 5.2 | -0.05 | 0.64 | steady | 6 | Stable
Adams Point | 109 | 4.96 | 0.44 | 2.23 | 3.1 | -0.14 | 0.58 | steady | 0 | Stable
East Oakland | 109 | 4.89 | 0.58 | 4.49 | 4.25 | -0.06 | 0.67 | steady | 0 | Mild outflow
Baylight District | 109 | 4.74 | 0.37 | 4.99 | 4 | -0.13 | 0.5 | decay | 0 | Mild outflow
Glenview | 109 | 4.47 | 0.43 | 2.1 | 3 | -0.14 | 0.65 | steady | 0 | Mild outflow
Ivy Hill | 109 | 4.39 | 0.42 | 2.28 | 3 | -0.22 | 0.6 | decay | 0 | Outflow accelerating
San Antonio | 109 | 2.09 | 0.73 | 4.27 | 5.25 | -0.34 | 0.63 | decay | 0 | Outflow accelerating

### C109 LifeHistory neighborhood lines (source:nbhdState), by hood
papered      0 {}
notMuchOpen  0 {}
newShop      11 {"Rockridge":3,"Jack London":1,"Downtown":1,"Piedmont Ave":1,"Uptown":2,"Fruitvale":3}
rentNotes    32 {"Lake Merritt":6,"Rockridge":6,"Temescal":9,"Uptown":4,"Downtown":4,"Jack London":3}
goodStretch  0 {}
heaviness    0 {}
locks        0 {}
  e.g. {"Timestamp":"9/19/2026","POPID":"POP-00019","Name":"Isley Kelley","EventTag":"Neighborhood|source:nbhdState|state:housing|occupation:Shortstop, Oakland A's Legend|ageGroup:youngAdult|neighborhood:Rockridge|tier:1|archetype:Striver","EventText":"compared rent 

### C110 Neighborhood_Map
BENCH cycleCount 110
Engine_Errors rows total 0 | mentioning 108: 0
hood | cyc | retail | night | noise | event | sent | crime | traj | hp | demo
Uptown | 110 | 12.06 | 1.03 | 6.13 | 35.76 | 0 | 0.56 | growth | 5.5 | Inflow surge
Jack London | 110 | 11.6 | 1.02 | 5.79 | 46.53 | 0.03 | 0.48 | growth | 5.5 | Inflow surge
Fruitvale | 110 | 11.38 | 0.84 | 5.6 | 27.46 | 0.09 | 0.64 | growth | 1.5 | Inflow surge
Rockridge | 110 | 10.47 | 0.83 | 3.06 | 23.93 | -0.08 | 0.57 | steady | 5.5 | Civic pressure zone
Piedmont Ave | 110 | 10.47 | 0.66 | 3.02 | 16.4 | -0.04 | 0.54 | steady | 0 | Mild inflow
Grand Lake | 110 | 10.36 | 0.84 | 4.35 | 30.25 | -0.08 | 0.63 | growth | 5 | Inflow surge
West Oakland | 110 | 10.3 | 0.82 | 5.49 | 22.29 | 0.13 | 0.58 | steady | 0 | Civic pressure zone
Chinatown | 110 | 9.81 | 0.79 | 5.9 | 30.67 | 0.01 | 0.47 | growth | 0.5 | Inflow surge
Lake Merritt | 110 | 8.3 | 0.53 | 2.88 | 15.68 | 0 | 0.52 | steady | 2.5 | Inflow surge
KONO | 110 | 8.17 | 1.02 | 4.93 | 33 | -0.1 | 0.61 | steady | 0 | Mild inflow
Downtown | 110 | 8.01 | 0.83 | 6.62 | 43.45 | 0.07 | 0.54 | growth | 5.5 | Civic pressure zone
Laurel | 110 | 7.58 | 0.74 | 3.81 | 22.64 | -0.05 | 0.59 | steady | 0 | Mild inflow
Dimond | 110 | 7.2 | 0.65 | 3.02 | 19.25 | -0.22 | 0.67 | decay | 0 | Mild outflow
Brooklyn | 110 | 7.09 | 0.54 | 2.57 | 15.02 | -0.22 | 0.6 | decay | 0 | Mild outflow
Glenview | 110 | 7.02 | 0.49 | 2.87 | 15.5 | -0.17 | 0.61 | decay | 0 | Mild outflow
Adams Point | 110 | 6.19 | 0.56 | 2.64 | 15.55 | -0.06 | 0.6 | decay | 0 | Mild inflow
Eastlake | 110 | 5.8 | 0.75 | 3.81 | 20.86 | -0.05 | 0.58 | steady | 0 | Mild inflow
Temescal | 110 | 5.78 | 1.15 | 4.6 | 44.58 | 0.05 | 0.56 | steady | 5.5 | First Friday arts walk zone
East Oakland | 110 | 5.76 | 0.75 | 5.42 | 19.75 | 0.01 | 0.68 | steady | 0 | Mild inflow
Baylight District | 110 | 5.38 | 0.4 | 6.29 | 16.5 | -0.09 | 0.53 | decay | 0 | Mild outflow
Ivy Hill | 110 | 5.05 | 0.5 | 2.75 | 15 | -0.13 | 0.6 | decay | 0 | Stable
San Antonio | 110 | 2.77 | 0.86 | 5.08 | 22 | -0.28 | 0.65 | decay | 0 | Civic pressure zone

### C110 LifeHistory neighborhood lines (source:nbhdState), by hood
papered      0 {}
notMuchOpen  1 {"Temescal":1}
newShop      7 {"Uptown":2,"Rockridge":4,"Fruitvale":1}
rentNotes    32 {"Jack London":6,"Rockridge":7,"Uptown":4,"Temescal":4,"Lake Merritt":6,"Downtown":4,"Grand Lake":1}
goodStretch  5 {"Downtown":5}
heaviness    0 {}
locks        0 {}
  e.g. {"Timestamp":"9/19/2026","POPID":"POP-00121","Name":"Otis Redd","EventTag":"Neighborhood|source:nbhdState|state:housing|holiday:BlackHistoryMonth|holidayPriority:cultural|firstFriday|occupation:Scout, Oakland A's|ageGroup:adult|neighborhood:Rockridge|tier:4","

### C111 Neighborhood_Map
BENCH cycleCount 111
Engine_Errors rows total 0 | mentioning 108: 0
hood | cyc | retail | night | noise | event | sent | crime | traj | hp | demo
Jack London | 111 | 15.33 | 1.26 | 5.04 | 10.76 | 0.24 | 0.49 | growth | 6.5 | Inflow surge
Fruitvale | 111 | 13.66 | 1.09 | 4.4 | 8.24 | 0.31 | 0.63 | growth | 2.5 | Inflow surge
Piedmont Ave | 111 | 13.6 | 0.7 | 2.38 | 5.31 | 0.15 | 0.58 | steady | 0 | Mild inflow
Uptown | 111 | 12.68 | 1.28 | 5.06 | 10.56 | 0.16 | 0.55 | growth | 6.5 | Inflow surge
Grand Lake | 111 | 12.58 | 0.97 | 3.71 | 9.25 | 0.14 | 0.58 | growth | 6 | Inflow surge
Chinatown | 111 | 12.26 | 0.95 | 4.92 | 9.38 | 0.19 | 0.52 | growth | 1.5 | Inflow surge
Rockridge | 111 | 12.13 | 0.94 | 2.45 | 7.18 | 0.1 | 0.57 | steady | 5 | Civic pressure zone
West Oakland | 111 | 11.97 | 0.86 | 4.4 | 6.33 | 0.36 | 0.59 | growth | 0.5 | Mild inflow
Downtown | 111 | 11.6 | 0.83 | 5.33 | 9.55 | 0.22 | 0.56 | growth | 6.5 | Shock event zone
East Oakland | 111 | 9.71 | 0.79 | 4.48 | 6.25 | 0.2 | 0.7 | steady | 0 | Mild inflow
Dimond | 111 | 9.7 | 0.69 | 2.6 | 6 | -0.03 | 0.61 | decay | 0 | Mild outflow
Brooklyn | 111 | 9.65 | 0.62 | 2.18 | 4 | 0.03 | 0.36 | decay | 0 | Mild outflow
Lake Merritt | 111 | 9.31 | 0.56 | 2.46 | 4.38 | 0.13 | 0.53 | steady | 2 | Stable
KONO | 111 | 9.04 | 1.11 | 4.15 | 10.25 | 0.12 | 0.57 | steady | 0 | Stable
Laurel | 111 | 8.57 | 0.8 | 3.25 | 6.71 | 0.14 | 0.5 | steady | 0 | Stable
Eastlake | 111 | 8.11 | 0.84 | 3.22 | 6.68 | 0.07 | 0.59 | steady | 0 | Mild outflow
Adams Point | 111 | 7.68 | 0.64 | 2.08 | 4.03 | 0.09 | 0.57 | decay | 0 | Mild outflow
Temescal | 111 | 7.47 | 0.96 | 3.72 | 7.2 | 0.25 | 0.64 | growth | 6.5 | Mild inflow
Baylight District | 111 | 7 | 0.48 | 5.31 | 5 | 0.16 | 0.53 | decay | 0 | Mild outflow
Glenview | 111 | 6.92 | 0.58 | 2.48 | 4 | 0.07 | 0.65 | decay | 0 | Outflow accelerating
Ivy Hill | 111 | 6.74 | 0.65 | 2.33 | 4 | 0.04 | 0.62 | decay | 0 | Outflow pressure
San Antonio | 111 | 5.03 | 0.98 | 4.33 | 6.25 | -0.09 | 0.64 | decay | 0 | Civic pressure zone

### C111 LifeHistory neighborhood lines (source:nbhdState), by hood
papered      0 {}
notMuchOpen  4 {"Temescal":3,"Ivy Hill":1}
newShop      13 {"Uptown":2,"Brooklyn":1,"Jack London":3,"Fruitvale":2,"Piedmont Ave":3,"Chinatown":1,"West Oakland":1}
rentNotes    25 {"Rockridge":8,"Jack London":7,"Downtown":2,"Temescal":4,"Uptown":4}
goodStretch  0 {}
heaviness    0 {}
locks        0 {}
  e.g. {"Timestamp":"9/19/2026","POPID":"POP-00016","Name":"Simon Leary","EventTag":"Neighborhood|source:nbhdState|state:housing|holiday:Valentine|holidayPriority:minor|occupation:Journalist, The Long View Columnist|ageGroup:adult|neighborhood:Rockridge|tier:3|archet

Ten newly tracked hoods, per-cycle Sentiment deltas: C109→C110 [0.07,0.04,0.06,0.09,-0.03,0.09,0.08,0.07,0.08,-0.02] sd 0.041; C110→C111 [0.19,0.25,0.19,0.17,0.24,0.19,0.15,0.22,0.12,0.25] sd 0.041 (a citywide Valentine/First Friday rise, each hood by its own amount). Before engine.239b these ten carried the identical city value (sd 0). 0 Engine_Errors C109–C111.

## PRE-DECLARED — bench C108 on HEAD 17233d75 (engine.242a–c + engine.240a–g), fresh live-synced C107 (written BEFORE the fire)
1. ok:true, 0 Engine_Errors.
2. City Sentiment (World_Population.sentiment) above the control's 0.02 — expect roughly 0.2–0.3 (winter −0.05, fog ≈ −0.03 instead of −0.25 / −0.10). Max hood Sentiment < 1.0.
3. RetailVitality per hood within ~0.85–1.15 of treatment 3's value (bench @62) except a hood with a closure this cycle; ranking still canon-shaped (Jack London / Rockridge / Downtown / Grand Lake / Uptown high; Temescal / San Antonio / Glenview / Ivy Hill / Baylight low).
4. LifeHistory C108 neighborhood QoL lines carry qol-cause tags, and not every low-QoL line is a safety line.
5. Ripple_Ledger C108 rows (engine-written, not the 3 recalibration rows): no hood from a retired template — neighborhood is an event/business hood or blank; MAJOR_LAYOFFS / WORKFORCE_GROWTH not 'Downtown' unless jobs moved there.
6. WorldEvents_V3_Ledger C108 texture rows: SAFETY / HEALTH / INFRASTRUCTURE hoods spread over core-sim hoods, not only West Oakland / Downtown / Fruitvale / Chinatown.
7. No city event named for a stereotype hood by condition (no "West Oakland Neighborhood Watch Meet", "Fruitvale Job Fair", "Rockridge Investment Summit" …).
