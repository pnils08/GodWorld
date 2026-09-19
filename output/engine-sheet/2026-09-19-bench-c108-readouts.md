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
