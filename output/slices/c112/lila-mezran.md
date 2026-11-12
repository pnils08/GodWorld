# Dr. Lila Mezran — health slice

Cycle **C112** · kind `beat-health` · hood **Chinatown**

## THE SLICE
- Angle: Chinatown carries the most sick residents (142) | 6 named on the hospital and cause records
- Hook: Yu Zen is one of 6 residents on the record this cycle; Chinatown carries the most illness; 73 in hospital care citywide, 73 beds occupied; illness is up in Chinatown — Kenji Tanaka and Matra Woven can speak for the block.
- Prior cycle: PRIOR_CYCLE_ON_DISK (C111)

## FACTS (each line is a row on the record)
- Sick residents by neighborhood: Chinatown 142 (-2 vs C111), East Oakland 123 (+0 vs C111), Ivy Hill 121 (-1 vs C111), Fruitvale 115 (-3 vs C111), San Antonio 111 (-1 vs C111), Laurel 109 (-2 vs C111), Grand Lake 106 (+0 vs C111), Rockridge 105 (-2 vs C111) — 1,874 across 22 neighborhoods  _[output/beats/Neighborhood_Demographics.jsonl Sick @C112]_
- Yu Zen (Rockridge) — in hospital care, active, admitted C105 after a workplace accident  _[output/beats/Hospital_Ledger.jsonl POP-00194]_
- Deacon Seymour (Lake Merritt) — in hospital care, active, admitted C105 after a workplace accident  _[output/beats/Hospital_Ledger.jsonl POP-00528]_
- Maurice Franklin (Rockridge) — in hospital care, active, admitted C106 after severe seasonal flu  _[output/beats/Hospital_Ledger.jsonl POP-00801]_
- The city illness rate stands at 4.3%, with 36 hospital admissions this cycle and 73 in care at the close.  _[output/world_summary_c112.md "## City State"]_
- Jonas Patel dealt with a seasonal health concern (Chinatown).  _[output/world_summary_c112.md "## Who Lived It ### Health"]_
- Elle Lilo cooked healthier meals all week and felt the difference (Jack London).  _[output/world_summary_c112.md "## Who Lived It ### Recovering"]_
- Elena Leon cooked healthier meals all week and felt the difference (Jack London).  _[output/world_summary_c112.md "## Who Lived It ### Recovering"]_
- Citywide hospital this cycle: 36 admissions (0 tracked, 36 other residents); 73 in care at the close, 73 beds occupied; 38 left  _[output/beats/Care_Justice_Census.jsonl hospital @C112 city]_
- Chinatown: 142 sick residents → 3 admissions → 6 in care at the close (0 tracked, 6 other residents) → 6 beds occupied; tracked: none tracked  _[output/beats/Care_Justice_Census.jsonl hospital @C112 Chinatown]_
- Adams Point: 87 sick residents → 2 admissions → 4 in care at the close (0 tracked, 4 other residents) → 4 beds occupied; tracked: none tracked  _[output/beats/Care_Justice_Census.jsonl hospital @C112 Adams Point]_
- Dimond: 96 sick residents → 2 admissions → 4 in care at the close (0 tracked, 4 other residents) → 4 beds occupied; tracked: none tracked  _[output/beats/Care_Justice_Census.jsonl hospital @C112 Dimond]_
- Downtown: 80 sick residents → 2 admissions → 4 in care at the close (0 tracked, 4 other residents) → 4 beds occupied; tracked: none tracked  _[output/beats/Care_Justice_Census.jsonl hospital @C112 Downtown]_
- East Oakland: 123 sick residents → 2 admissions → 4 in care at the close (0 tracked, 4 other residents) → 4 beds occupied; tracked: none tracked  _[output/beats/Care_Justice_Census.jsonl hospital @C112 East Oakland]_
- Chinatown: 142 sick of 2,193 residents, 6.5% — at or over the 6% watch bar  _[output/beats/Neighborhood_Demographics.jsonl Sick/Students+Adults+Seniors @C112]_

## PEOPLE ON THE RECORD (your sources — real; never invent another)
- Yu Zen — Commercial Insurance Broker — Rockridge — on Hospital_Ledger this cycle
- Deacon Seymour — Manager, Oakland A's — Lake Merritt — on Hospital_Ledger this cycle
- Maurice Franklin — Drone Fleet Coordinator — Rockridge — on Hospital_Ledger this cycle
- Jonas Patel — MEDICAL EXAMINER — Chinatown — named in the cycle health record
- Elle Lilo — Harbor Tugboat Captain — Jack London — named in the cycle health record
- Elena Leon — Longshoreman (Port of Oakland) — Jack London — named in the cycle health record
- Kenji Tanaka — Senior Pastor / Faith Leader — Chinatown — lives in Chinatown, where illness is up this cycle — a neighbour to quote, not a patient
- Matra Woven — Janitor — Chinatown — lives in Chinatown, where illness is up this cycle — a neighbour to quote, not a patient

## THE ROOM IS YOURS
the waiting room, the walk to the clinic, what a household does when one person is sick, who covers the shift

## APPROACH
Health approach: this slice is the illness count by neighborhood, every resident named on the hospital and live cause records, the residents the cycle summary names under Health/Recovering, and the care trail — sick residents to admissions to who is in a bed, hood by hood, tracked and other residents apart. A person listed as living in a neighborhood where illness is up is a neighbour to quote about the block, not a patient — nothing on the record says they are sick. Clinical calm, human cost, no diagnosis beyond what the record says. When the named rows are few, write the neighborhood, not a ward. Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent people or places. Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint.

## FORBIDDEN
- Do not invent a named person, place, station, school, clinic, congregation or number that is not on this slice
- Do not contradict a role, employer or neighborhood listed here
- Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose

## POINTERS
- output/beats/Neighborhood_Demographics.jsonl Sick @C112 + Hospital_Ledger.jsonl + Health_Cause_Queue.jsonl
- docs/plans/2026-09-07-beat-slices-from-sheets-plan.md Task 4

_Generated by scripts/buildHealthSlice.js — no LLM. Facts are the rows; the room is the reporter's._
