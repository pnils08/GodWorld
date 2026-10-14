# Dr. Lila Mezran — health slice

Cycle **C111** · kind `beat-health` · hood **Chinatown**

## THE SLICE
- Angle: Chinatown carries the most sick residents (144) | 4 named on the hospital and cause records
- Hook: Yu Zen is one of 4 residents on the record this cycle; Chinatown carries the most illness; 75 in hospital care citywide, 75 beds occupied; illness is up in Chinatown — Niani Oakley and Mai Tse can speak for the block.
- Note: named rows are few (4) — write the neighborhood, not a ward
- Prior cycle: PRIOR_CYCLE_ON_DISK (C110)

## FACTS (each line is a row on the record)
- Sick residents by neighborhood: Chinatown 144 (-1 vs C110), East Oakland 123 (-2 vs C110), Ivy Hill 122 (+0 vs C110), Fruitvale 118 (-3 vs C110), San Antonio 112 (-2 vs C110), Laurel 111 (-2 vs C110), Rockridge 107 (-3 vs C110), Grand Lake 106 (-3 vs C110) — 1,907 across 22 neighborhoods  _[output/beats/Neighborhood_Demographics.jsonl Sick @C111]_
- Yu Zen (Rockridge) — in hospital care, active, admitted C105 after a workplace accident  _[output/beats/Hospital_Ledger.jsonl POP-00194]_
- Maurice Franklin (Rockridge) — in hospital care, active, admitted C106 after severe seasonal flu  _[output/beats/Hospital_Ledger.jsonl POP-00801]_
- The city illness rate stands at 4.4%, with 0 in hospital care at 0% of capacity.  _[output/world_summary_c111.md "## City State"]_
- Ariana Lee nursed a sore back after overdoing it around the house (Piedmont Ave).  _[output/world_summary_c111.md "## Who Lived It ### Health"]_
- Sammie Soft took time to recover from the flu (West Oakland).  _[output/world_summary_c111.md "## Who Lived It ### Health"]_
- Citywide hospital this cycle: 37 admissions (0 tracked, 37 other residents); 75 in care at the close, 75 beds occupied; 39 left  _[output/beats/Care_Justice_Census.jsonl hospital @C111 city]_
- Chinatown: 144 sick residents → 3 admissions → 6 in care at the close (0 tracked, 6 other residents) → 6 beds occupied; tracked: none tracked  _[output/beats/Care_Justice_Census.jsonl hospital @C111 Chinatown]_
- East Oakland: 123 sick residents → 2 admissions → 5 in care at the close (0 tracked, 5 other residents) → 5 beds occupied; tracked: none tracked  _[output/beats/Care_Justice_Census.jsonl hospital @C111 East Oakland]_
- Adams Point: 87 sick residents → 2 admissions → 4 in care at the close (0 tracked, 4 other residents) → 4 beds occupied; tracked: none tracked  _[output/beats/Care_Justice_Census.jsonl hospital @C111 Adams Point]_
- Brooklyn: 76 sick residents → 2 admissions → 4 in care at the close (0 tracked, 4 other residents) → 4 beds occupied; tracked: none tracked  _[output/beats/Care_Justice_Census.jsonl hospital @C111 Brooklyn]_
- Dimond: 96 sick residents → 2 admissions → 4 in care at the close (0 tracked, 4 other residents) → 4 beds occupied; tracked: none tracked  _[output/beats/Care_Justice_Census.jsonl hospital @C111 Dimond]_
- Chinatown: 144 sick of 2,193 residents, 6.6% — at or over the 6% watch bar  _[output/beats/Neighborhood_Demographics.jsonl Sick/Students+Adults+Seniors @C111]_

## PEOPLE ON THE RECORD (your sources — real; never invent another)
- Yu Zen — Commercial Insurance Broker — Rockridge — on Hospital_Ledger this cycle
- Maurice Franklin — Drone Fleet Coordinator — Rockridge — on Hospital_Ledger this cycle
- Ariana Lee — Biotech Lab Assistant — Piedmont Ave — named in the cycle health record
- Sammie Soft — Community Organizer — West Oakland — named in the cycle health record
- Niani Oakley — Plumber — Chinatown — lives in Chinatown, where illness is up this cycle — a neighbour to quote, not a patient
- Mai Tse — student — Chinatown — lives in Chinatown, where illness is up this cycle — a neighbour to quote, not a patient

## THE ROOM IS YOURS
the waiting room, the walk to the clinic, what a household does when one person is sick, who covers the shift

## APPROACH
Health approach: this slice is the illness count by neighborhood, every resident named on the hospital and live cause records, the residents the cycle summary names under Health/Recovering, and the care trail — sick residents to admissions to who is in a bed, hood by hood, tracked and other residents apart. A person listed as living in a neighborhood where illness is up is a neighbour to quote about the block, not a patient — nothing on the record says they are sick. Clinical calm, human cost, no diagnosis beyond what the record says. When the named rows are few, write the neighborhood, not a ward. Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent people or places. Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint.

## FORBIDDEN
- Do not invent a named person, place, station, school, clinic, congregation or number that is not on this slice
- Do not contradict a role, employer or neighborhood listed here
- Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose

## POINTERS
- output/beats/Neighborhood_Demographics.jsonl Sick @C111 + Hospital_Ledger.jsonl + Health_Cause_Queue.jsonl
- docs/plans/2026-09-07-beat-slices-from-sheets-plan.md Task 4

_Generated by scripts/buildHealthSlice.js — no LLM. Facts are the rows; the room is the reporter's._
