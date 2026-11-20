# Simulation_Ledger audit C116 pre-fire (Drive, read Nov 11 at C115) — rechecked at C116, 2026-11-19

Read-only. Live sheets read 2026-11-19 (Simulation_Ledger, Generic_Citizens, As_Roster, Oaks_Roster, Citizen_Archive, Reflection_Intake, Household_Ledger); citizen pages from the newsroom mirror `output/citizen_pages/index.jsonl` (dumped 2026-11-19 12:15, liveCycle 116). Scripts: scratchpad `audit/check.js`, `check2.js`, `pages.js`.

## Changed by C116 (cycle-driven)

| Audit item | Now |
|---|---|
| 5 children to release next run | released: Victor Mitchell, Owen Campbell, Jacob Wright, Miguel Johnson, Ivy Harris all back in the pool under birth names, no FamilyOf |
| 19 links that stay | all 19 still linked; +3 new: Jasmine Cloak (spouse of POP-00722), Jordan Osei (child of POP-00036), Alessandro Richards (child of POP-00031, EmergedCycle 116). 22 links (11 child, 11 spouse) |
| 85 zeroed counts | all 85 still 0, all still on the ledger |
| Ledger rows 1,067 | 1,075. +9 mints POP-01241–01249; POP-01052 Herbert Jones archived (Traded) |
| Coen Carr stamp Y3C11 | Y3C12; BirthYear 2026 + associates + early-career unchanged |
| Pointers 500 | 537, every one cp-<own POPID> |

## Fixed since the audit

- Ross Cabral POP-00055: off the ledger, in Citizen_Archive. As_Roster still lists him Minor League catcher $100,000 (roster side still open).

## Still open, unchanged (not cycle-driven)

- Three bare A's rows POP-01238/39/40 (Mooney, Hernandez, Calzado): BirthYear, Neighborhood, Gender, Income, MaritalStatus, NumChildren blank. Open question in the audit stays the builder's.
- Carmen Mesa POP-00081: Active, "Starting Pitcher, Philadelphia Phillies"; As_Roster says traded.
- Martin Richards POP-00031: Active, "Third Baseman, New York Mets"; As_Roster says traded. **New consequence:** C116 drew a child link to him (Alessandro Richards).
- Renteria: POP-01042/01043 (born 2001/2002) list POP-00744 Tomas (born 2007) as child; his ParentIds `[]`.
- Ollie Campbell POP-00642 (2010) parent of Valentina POP-01017 (2024).
- MUBA Hall of Famers POP-00508/09/10 Active, birth years 1985/1982/1989; Silecki NumChildren 0.
- 5 Retired with a working CareerStage (00132, 00306, 00354, 00589, 00929); Jurko Gender "m".
- POP-01046–01055 (9 rows; 01052 now archived): Active, StatusStartCycle "102", HealthCause blank.
- Aaliyah Santos POP-01040 SpouseId "POP-00536 Everson Morello"; ledger name Evan Morello.
- Flag case: UNI "No"×1; MED "Yes"×1, "No"×1; CIV "No"×3, " no"×1. HH-KEANE on POP-00001/00002. Household_Ledger id "Cy Newell".
- Reflection_Intake: the 12 C119 rows (stamped Jul 7–9) still there; Florencia Shah POP-00934 row at C112; Dame Sarr POP-01025 rows at C105 (two).
- Oaks_Roster: Ty Jerome no POPID; Dame Sarr POP-01025 listed though archived.
- C115 mints POP-01232–01237: SkillTags blank on all six, NumChildren blank on all six; TraitProfile now filled on 01233/01234 (C116). Kira Liu POP-01237 BirthYear 2037, ParentIds blank, HH-0115-F014.

## Grew since the audit

- NumChildren blank: 102 → 108 (all POP-00958 up).
- The 9 new mints: SkillTags and TraitProfile blank on most; NumChildren and HouseholdId blank on 5; POP-01248/01249 LastUpdated blank.
- LastUpdated formats: date 1,022; ISO `2026-11-15` 27 (a third format the audit didn't list); `C115` 10; date+time 13; `Y3C12` 1; blank 2.
- Gender blank 42.

## Citizen pages (mirror only — the mirror drops C>116 docs and journal/office slots, so absences there are not proof the docs are gone)

- Still there: Varek's daughter (C109, C111), Aybar "the kid" (C113), Coen Cartier "normal workday" (C115), Jonas Patel "Tenderloin" (C114), Elijah Brown's UNDOCKED board line (C115), Jun Leu "high school" (C109).
- Not in the mirror: Mags C112 garble, Clarissa Dane game logs, Brianna Lee's C126 entry (cycle cap). Not checked in Supermemory itself.
- C116 entries (128, 68 citizens): no zeroed citizen speaking of their kids, no outside-city places, no doubled words. One new board line of the Elijah Brown kind: Manju Abebe POP-00918 (plumber), "I'm 9th on the board… I flew until the show's time ran out". UNDOCKED bet lines (wins/losses) are the bets dial, not flagged.
