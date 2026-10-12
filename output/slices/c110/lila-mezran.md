# Dr. Lila Mezran — health slice

Cycle **C110** · kind `beat-health` · hood **Chinatown**

## THE SLICE
- Angle: Chinatown carries the most sick residents (145) | 6 named on the hospital and cause records
- Hook: Yu Zen is one of 6 residents on the record this cycle; Chinatown carries the most illness; 77 in hospital care citywide, 76 beds occupied; illness is up in Chinatown — Millicent Kumar and Daphne Stafford can speak for the block.
- Prior cycle: PRIOR_CYCLE_ON_DISK (C109)

## FACTS (each line is a row on the record)
- Sick residents by neighborhood: Chinatown 145 (+3 vs C109), East Oakland 125 (+3 vs C109), Ivy Hill 122 (+3 vs C109), Fruitvale 121 (+2 vs C109), San Antonio 114 (-1 vs C109), Laurel 113 (-1 vs C109), Rockridge 110 (+2 vs C109), Grand Lake 109 (+1 vs C109) — 1,947 across 22 neighborhoods  _[output/beats/Neighborhood_Demographics.jsonl Sick @C110]_
- Yu Zen (Rockridge) — in hospital care, active, admitted C105 after a workplace accident  _[output/beats/Hospital_Ledger.jsonl POP-00194]_
- Maurice Franklin (Rockridge) — in hospital care, recovering, admitted C106 after severe seasonal flu  _[output/beats/Hospital_Ledger.jsonl POP-00801]_
- The city illness rate stands at 4.5%, with 1 in hospital care at 1% of capacity.  _[output/world_summary_c110.md "## City State"]_
- Jackson Sift dealt with a seasonal health concern (West Oakland).  _[output/world_summary_c110.md "## Who Lived It ### Health"]_
- Ron Arenson recovered from a winter illness (Baylight District).  _[output/world_summary_c110.md "## Who Lived It ### Health"]_
- Jessie Hess finally shook the cold that had been hanging around (Downtown).  _[output/world_summary_c110.md "## Who Lived It ### Recovering"]_
- Jett Walker finally shook the cold that had been hanging around (Rockridge).  _[output/world_summary_c110.md "## Who Lived It ### Recovering"]_
- Citywide hospital this cycle: 38 admissions (0 tracked, 38 other residents); 77 in care at the close, 76 beds occupied  _[output/beats/Care_Justice_Census.jsonl hospital @C110 city]_
- Chinatown: 145 sick residents → 3 admissions → 6 in care at the close (0 tracked, 6 other residents) → 6 beds occupied; tracked: none tracked  _[output/beats/Care_Justice_Census.jsonl hospital @C110 Chinatown]_
- East Oakland: 125 sick residents → 3 admissions → 6 in care at the close (0 tracked, 6 other residents) → 6 beds occupied; tracked: none tracked  _[output/beats/Care_Justice_Census.jsonl hospital @C110 East Oakland]_
- Rockridge: 110 sick residents → 2 admissions → 5 in care at the close (1 tracked, 4 other residents) → 4 beds occupied; tracked: Maurice Franklin  _[output/beats/Care_Justice_Census.jsonl hospital @C110 Rockridge]_
- Adams Point: 90 sick residents → 2 admissions → 4 in care at the close (0 tracked, 4 other residents) → 4 beds occupied; tracked: none tracked  _[output/beats/Care_Justice_Census.jsonl hospital @C110 Adams Point]_
- Brooklyn: 79 sick residents → 2 admissions → 4 in care at the close (0 tracked, 4 other residents) → 4 beds occupied; tracked: none tracked  _[output/beats/Care_Justice_Census.jsonl hospital @C110 Brooklyn]_
- Chinatown: 145 sick of 2,185 residents, 6.6% — at or over the 6% watch bar  _[output/beats/Neighborhood_Demographics.jsonl Sick/Students+Adults+Seniors @C110]_

## PEOPLE ON THE RECORD (your sources — real; never invent another)
- Yu Zen — Commercial Insurance Broker — Rockridge — on Hospital_Ledger this cycle
- Maurice Franklin — Drone Fleet Coordinator — Rockridge — on Hospital_Ledger this cycle
- Jackson Sift — Ex-Offender Reentry Counselor — West Oakland — named in the cycle health record
- Ron Arenson — Maintenance Tech — Baylight District — named in the cycle health record
- Jessie Hess — Barista — Downtown — named in the cycle health record
- Jett Walker — Plumber — Rockridge — named in the cycle health record
- Millicent Kumar — Plumber — Chinatown — lives in Chinatown, where illness is up this cycle — a neighbour to quote, not a patient
- Daphne Stafford — Home Health Aide — Chinatown — lives in Chinatown, where illness is up this cycle — a neighbour to quote, not a patient

## ENGINE HOOKS FOR YOU (colour, not fact)
- Illness rates in KONO up 13%. Public health concern? Investigation warranted. (public health coverage)

## THE ROOM IS YOURS
the waiting room, the walk to the clinic, what a household does when one person is sick, who covers the shift

## APPROACH
Health approach: this slice is the illness count by neighborhood, every resident named on the hospital and live cause records, the residents the cycle summary names under Health/Recovering, and the care trail — sick residents to admissions to who is in a bed, hood by hood, tracked and other residents apart. A person listed as living in a neighborhood where illness is up is a neighbour to quote about the block, not a patient — nothing on the record says they are sick. Clinical calm, human cost, no diagnosis beyond what the record says. When the named rows are few, write the neighborhood, not a ward. Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent people or places. Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint.

## FORBIDDEN
- Do not invent a named person, place, station, school, clinic, congregation or number that is not on this slice
- Do not contradict a role, employer or neighborhood listed here
- Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose

## POINTERS
- output/beats/Neighborhood_Demographics.jsonl Sick @C110 + Hospital_Ledger.jsonl + Health_Cause_Queue.jsonl
- output/beats/Story_Hook_Deck.jsonl (hooks for Dr. Lila Mezran this cycle)
- docs/plans/2026-09-07-beat-slices-from-sheets-plan.md Task 4

_Generated by scripts/buildHealthSlice.js — no LLM. Facts are the rows; the room is the reporter's._
