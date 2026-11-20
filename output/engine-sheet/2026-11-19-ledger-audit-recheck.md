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

## Item 1 closed (builder 2026-11-19)

The builder had filled the three A's rows by hand after the first read (BirthYear, Gender, Mooney's Income); "What was there was accurate … nothing I added needed to be looked at". Only the employer was owed: EmployerBizId = BIZ-00005 (Oakland Athletics) written to Simulation_Ledger AS1065:AS1067 (POP-01238/01239/01240) through the Sheets connector, read back. Dials were already flat (every base 50).
- Then filled from the records, read back: CareerStage AH (early / early / mid — the A's rows' own age pattern, ≤26 early, 27–31 mid), EconomicProfileKey AR = SPORTS_OVERRIDE (every other A's row), SkillTags BB = coach (Mooney; the 2042 coaching-staff card lists the farm director with the coaches) / athlete / athlete.
- Not in any record (ledger, As_Roster, sports feed, the Drive cards `Henry Calzado_2041.txt`, `Giancarlo Hernandez FULL STAT TRUE SOURCE — BATTER — 2042.txt`, `COACHING_STAFF_2042.txt`, `SCOUTING_STAFF_2041.txt`): Neighborhood, HouseholdId, MaritalStatus, NumChildren on all three; pay for Hernandez (contract RNW 2042–44, no figure) and Calzado (ARB 2042–44, "No salary figure shown"). Left blank.
- Calzado's two Drive cards carry POPID POP-01232; the ledger has him at POP-01240 (POP-01232 is Owen Davis).
- Engine arrival rules (processAdvancementIntake.js mint, engine.339 / engine.162), read back: MaritalStatus single, NumChildren 0, ParentIds/ChildrenIds `[]`, UsageCount 0 on all three; Income 100000 (SPORTS_BASE_SALARY) on Hernandez and Calzado.
- From the cards, read back: YearsInCareer from the draft year to 2042 (builder: "Clearly says when they were drafted"): Hernandez 2036 → 6, Calzado 2029 → 13. CitizenBio for Mooney (COACHING_STAFF_2042: Denver, $1,666,666, one year left) and Calzado (2041 card + C115 feed: draft, trade, 2040/2041 lines, contract, options).
- Still blank: Neighborhood, HouseholdId, NetWorth, DebtLevel, InheritanceReceived, SchoolQuality, LastPromotionCycle; Mooney's YearsInCareer; SMPageId on Mooney and Calzado; and the none-fields (MaidenName, SpouseId, Migration*, MemoryRegisters, StatusStartCycle, HealthCause, LineageId, Famous).
- The engine's own arrival derivation (utilities/citizenDerivation.js deriveCitizenProfile_ / deriveDebtLevel_ / deriveNetWorth_, seed First|Last|POPID, ledger frequency from live, simYear 2042, run offline in a vm), read back: Neighborhood Uptown / West Oakland / Fruitvale; NetWorth 162000 / 18000 / 89000; DebtLevel 2 / 4 / 0; Mooney YearsInCareer 2.4. Its career stages match the ones written.
- Blank by the engine's own rules: HouseholdId (no one-person households; engine.57 P2), SchoolQuality (set for minors only), InheritanceReceived and LastPromotionCycle (written only when those happen), SMPageId (made on the first page write), and the none-fields.

## Item 2 (builder 2026-11-19)

Carmen Mesa POP-00081: Status Active → Traded (Simulation_Ledger L61, read back), on the builder's word "Mesa was traded". The sports feed's traded trigger writes life lines only, never Status; the archive step (utilities/archiveCitizenExits.js, Traded → traded-away) moves the row at the next fire. Richards stays Active (builder: lives in Oakland while playing on the Mets).

## Item 3 (builder 2026-11-19: "all we need to do is make Tomas and Isaac brothers")

Cause: Isaac POP-01042 and Mei POP-01043 arrived at C101 in household HH-0101-K001 with Tomas POP-00744 (C84, own household HH-0084-525) as their child; no engine code or script in repo history writes a -K household; the link is in the oldest snapshot (2026-08-12). Not an active code path. Canon: Tomas, 34 at C84, line cook at the family taqueria his grandmother opened in 2009; podcast host / line cook at Harborline (C106); no canon names Isaac or Mei. Pages: Isaac and Mei none; Tomas 15 (C102–C108), one family line "My dad used to complain about it at dinner sometimes" (C102).
Written, read back: Simulation_Ledger ChildrenIds Y871:Y872 → `[]`; Family_Relationships G19 (Child1 "POP-00744 Tomas Renteria") → blank. Kept: NumChildren 1 on both (the family lottery's slot); the Tomas–Isaac and Tomas–Mei family bonds (Relationship_Bond_Ledger, family 8, origin household) — the ledger and both relationship tabs have no sibling type, so the family bond is the brother link.

## Item 4 (builder 2026-11-20: "Sure idk I'll take your word" — Valentina is Ollie's younger sister)

Cause: same off-repo batch as item 3 — link in the oldest snapshot (2026-08-12), Family_Relationships row 23 SinceCycle 102 "married" with no Wife, HH-0084-425 typed "couple" (Ollie + Valentina), family bond C102 origin household; POP-01017 sits beside POP-01018 Salma (Hector Campbell's child, same pattern). Canon: no age or family printed for either (Ollie C106 Leary, Valentina C111 Velez server at Green & Gold). Pages: Ollie C112 "She's at that age where she's testing everything", C113 "Valentina's getting to that age where she's finding her own thing"; Valentina C112 CONVO "Hey, Ollie…", tension "Should I take Ollie up on his offer if the house budget gets too tangled?". Ollie 2010 / Valentina 2024: a parent at 14 does not fit; an older brother does.
Written, read back: Simulation_Ledger Y480 (Ollie ChildrenIds) → `[]`; X846 (Valentina ParentIds) → `[]`; Family_Relationships G23 (Child1) → blank. Kept: Ollie NumChildren 1, the shared household, the family bond (the sibling link). Not touched: Ollie's MaritalStatus "married" with no spouse and the household typed "couple" — noted, not in the item.

## Items 5 and 6 (builder 2026-11-20)

Item 5 closed, nothing written: the MUBA rows' +16 BirthYears, Active status and title were engine.338 C5 on the builder's go (9b74fa7ce, 2026-11-07); Silecki's NumChildren 2 → 0 (between 2026-11-12 and 11-14) is one of the 85 counts ruled correct on Nov 11 (builder: "I probably removed the kids since they had no spouse"). Item 4 note corrected: "married" with no SpouseId is by design (the spouse is off-screen).
Item 6: Jurko POP-00132 Gender "m" → "male" (AU85, read back). Ages at 2042: Jurko 51, Loop 52, Jile 52, Creighton 60, Diop 34. No retirement in any LifeHistory cell; LifeHistory_Log (beats window) has only Jile's C115 PostCareer texture line (written because the row was Retired); pages: Loop 1 entry, no retirement talk, the other four never woke. Snapshots: 2026-08-12 four were Active with CareerStage "retired" (Creighton Retired/senior); by 2026-08-17 all five Retired with working stages — the week of the engine.82 career-stage column repair; no record names the writer. Builder: "Make them active". Status → Active at L85, L258, L305, L443, L759 (written, success). Income stays 0: the career engine reads an Active adult on $0 with no employer as out of work (unemployed pressure, hiring windows).
- Pay, corrected after reading the code: no hand write. generationalWealthEngine runs both floors every fire for Active rows — applyTrackedEmployerFloor_ (D3: Jurko BIZ-00089, Creighton BIZ-00030 → employer's pay) and applyUntrackedJobReference_ (D4: SELF_EMPLOYED / UNTRACKED → jobReferencePay_ for the role: Loop, Jile, Diop), raise-only. The earlier reply's "the engine doesn't re-price" for the self-employed was wrong; the Retired status was what kept all five at 0.

## Item 7 (builder 2026-11-20)

The nine (POP-01046–01051, 01053–01055): Active, StatusStartCycle "102", HealthCause blank. No Hospital_Ledger admission for any of them, no health line in any LifeHistory, no health on their pages, none in canon (Elliot Abraham: Haiti-born, MIT, pickleball league, Oaks GM; Hal Richmond C102 profile). 102 is the cycle the batch arrived. The engine stamps StatusStartCycle only at a health admission (generationalEventsEngine) and the wake shows it only under a health status (lib/wakePerception.js loadHealthState); the health crons read Hospital_Ledger. Cleared AY857 and AY875:AY882 (was "102" each, read before and after) so the rows carry no health status the world never had. Restore value if wanted: 102 on each.
Item 8 note: the reply after closing item 6 named the next item as "nine citizens … no health status" — that is item 7 here.

## Item 8

Aaliyah Santos POP-01040 SpouseId "POP-00536 Everson Morello" → "POP-00536 Evan Morello" (P869, read back). POP-00536's ledger name is Evan Morello and his SpouseId points back to her; canon C44 names "Evan Morello … the actor, local"; "Everson" appears nowhere in canon or pages. The id was already right; only the name text in her cell changed.

## Item 9 — checked, nothing trips the engine, nothing written

- Flag spellings (UNI "No"×1; MED "Yes"×1, "No"×1; CIV "No"×3, " no"×1): every engine reader lowercases before comparing to yes/y (educationCareerEngine 274–288, runRelationshipEngine 389–391, civicInitiativeEngine 1028, generateMonthlyCivicSweep 90, generationalWealthEngine 3083); " no" untrimmed still reads as not-yes.
- HH-KEANE (Keanes POP-00001/00002, Household_Ledger row 531, couple, Piedmont Ave, owned): an authored id; householdFormationEngine AUTO_HH_ID marks HH-<cycle>-<n> as formation-minted and the spouse-merge prefers authored ids — by design.
- "Cy Newell" (Household_Ledger row 631): head POP-00050 (now Ernesto Quintero, in HH-0106-F002), Members [], formed C103, dissolved C104. No ledger row points to it; a dissolved empty row is history.

## Item 10 (builder 2026-11-20: "change them to match the cycle they are sandwiched in … that was before we got the dry runs figured out")

Reflection_Intake C96:C107 (POP-00182, 00240, 00246, 00186, 00175, 00170, 00248, 00259, 00201, 00304, 00269, 00286; stamped 2026-07-07 to 07-09) Cycle 119 → 100, read back. Neighbors rows 94–95 and 108–109 are C100 with the same dates. All twelve already Applied = yes, so no reader re-applies them. The C119/C126 docs in the citizens' Supermemory pages are not touched (the newsroom mirror already drops cycles above live).

## Items 11–12

- Item 11: Florencia Shah POP-00934 (row 1989, C112) and Dame Sarr POP-01025 (rows 978, 1075, C105) — their own words from before they left, all Applied = yes. History; nothing written.
- Item 12: Oaks_Roster (Ty Jerome no POPID, Dame Sarr listed) — builder 2026-11-20: "Oaks roster is mine and isn't the sim ledger". The team rosters (Oaks_Roster, As_Roster) are the builder's own tabs; a ledger audit does not flag them. Same for the As_Roster lines in items 1–2 (Cabral, Mesa, Richards).

Audit closed 2026-11-20: items 1–4, 6–8, 10 written on the live sheet and read back; 5, 9, 11 checked, nothing to change; 12 out of scope.
