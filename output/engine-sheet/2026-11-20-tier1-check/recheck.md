# Tier 1 citizen integrity check (Drive doc 1UXU1nnm…) — rechecked item by item, 2026-11-20

The doc dates ages as 2041 − BirthYear; the sim year is 2042 from C105 on (simYearFromCycle_: C104 2041, C108 2042, C116 2042).

## Item 1 — Marcus Skenes POP-01114: closed, nothing written
BirthYear 2042 = the sim year of his C108 birth; RoleType "student", EducationLevel "Pre-K", MaritalStatus youth are exactly the newborn mint (generationalEventsEngine.js ~1194–1210). Paul Skenes NumChildren 4 with one ChildrenId: off-screen children, the pattern the doc leaves unflagged.

## Item 2 — Adash Stanley POP-01023 (builder: "Delete the college events, and make his row him")
Cause (engine, not fixed here): runYouthEngine.js draws every living citizen aged MIN_AGE–22 (YOUTH_EVENT_LIMITS.MAX_AGE 22, youthStage_ 18–22 = "college") with no in-school test; the game-night Sports-PlayedWin pool carries baseball wording for an Oaks player. His pages (15, C103–C116) are all a point guard's; no school, no baseball.
Written, read back:
- Simulation_Ledger O852 LifeHistory: five lines removed (campus job Y3C6, lab slot Y3C8, final out Y3C9, two pitches Y3C10, midterm Y3C11); 48 → 43 lines. Before-copy: `adash-stanley-lifehistory-before.txt`.
- N852 OrginCity blank → "Kraków, Poland" (Adash Stanley_background.txt, Drive).
- AT852 CitizenBio "Signed by The Oaks and 6th man of the year with The Bulls" → card facts (Kraków; undrafted; G League; Bulls sixth man; Paulson, $75M at nineteen per Hal Richmond's "Vision in the Margins"; 6'2", 180; 99 hustle; reads Polish literature).
- LifeHistory_Log rows 12946, 18017, 18191, 20607, 25466 cleared (A:G). Contents: [Y3C6 Community|youth-clubs "worked the campus job…" C110], [Y3C8 Education|youth-academic "got the lab slot…" C112], [Y3C9 Sports-PlayedWin "got home still wired from the final out…" C113], [Y3C10 Sports-PlayedWin "stayed up rewatching two pitches…" C114], [Y3C11 Education|youth-academic "pulled an all-nighter for the midterm…" C115], each POP-01023 Adash Stanley, Downtown.
Left as is: EducationLevel "associates" (no record says otherwise). The engine fix is a new ROLLOUT row on the builder's word.

## Item 2 follow-on — the other GAME-clock players (builder 2026-11-20: "Yes remove those school lines")
engine.353 (PROD stage 61 @196) stops new ones. Removed, read back: youth-engine lines from the LifeHistory cells of Richie Haynes POP-00080 (O60, 28 → 24), Chad Tipre POP-00083 (O62, 21 → 19), Kevin Ham POP-00103 (O66, 21 → 20), Coen Carr POP-01026 (O854, 21 → 11); and their 18 LifeHistory_Log rows (6309, 8147, 8172, 10354, 10358, 10363, 12928, 15683, 15703, 18014, 22945, 22956, 25441, 25465, 25476, 27914, 27927, 27934) cleared. Before-copies (cells and log rows): `four-players-before.json`. 0 youth lines left in the log for the five. An earlier batch of these writes was refused by the permission check and one sat at a prompt for ~10 hours; nothing was written then, and the rows were re-read unchanged before this write.

## Item 3 — birth years vs the current cards (TrueSource_Cards folder 13Ft4uQx…, read off the game screens 2026-11-17, contracts from 2042, so the card age is the age now)
Builder 2026-11-20: "Their birth year is what the card says"; "they are born when they were born and the sim year is 2042". Each row made the player one year younger than his card. Written, read back: Aitken POP-00003 M4 2009 → 2008 (card 34); Horn POP-00022 M22 2012 → 2011 (card 31; his 2040 DataPage also prints "Birth Year: 2011"); Quintero POP-00050 M48 2018 → 2017 (card 25). Dillon POP-00018 M18 2005 → 2004 (card 38): first write refused by the permission check, written after the builder's "You correct", read back. Cause of the gap: buildPlayerIndex.js (March, Phase 15) set computedBirthYear = 2041 − card age.
Builder confirmed after the fact: "You correct , I see why you're saying , just some bad adds initially".

## Item 4 — "Oakland native" bios (builder 2026-11-20: "Those cities are correct")
OrginCity and the cards agree; the bios were wrong. Written, read back: CitizenBio opening "Born <year>, Oakland native." → "Born <row BirthYear>, <OrginCity> native." for Kelley AT19 (Mississippi), Davis AT21 (Ohio; "Born 2010" → 2009, the row's year), Horn AT22 (New Jersey; "Born 2012" → 2011 after item 3), Ramos AT25 (Puerto Rico), Richards AT30 (Maryland). Rest of each bio unchanged. Before/after: `bios-before-after.json`. Not touched, still in the audit: Davis "Lives in Laurel" vs Piedmont Ave, Ramos "$8.2M" vs 8.1M, Richards "$750K" vs 20.6M.

## Bio rule (builder 2026-11-20): "Bios should not repeat what a row already gives a cron , age and salary don't fit the purpose of this bio space , it's to flag key details about their life that should be know upfront"
Rewritten to the rule, read back (birth year/origin, salary/contract, neighborhood, team/position and stat lines dropped; life details kept): Kelley AT19, Davis AT21, Horn AT22, Ramos AT25, Richards AT30, Adash Stanley AT852, Calzado AT1067; Mooney AT1065 cleared (his bio held only row facts). The three item-4 mismatches (Davis Laurel, Ramos $8.2M, Richards $750K) are gone with them. The other ledger bios have not been swept to this rule.

Builder 2026-11-20 on bios: "the bios is an unbuilt commodity rn, it may have some type of writer for it but it's not set" — the rule stands; no bio sweep or writer is in scope here.

## Item 5 — Rick Walker POP-00198 (builder: "change him to a college degree is necessary")
"K-8 Teacher,Former Line cook", EducationLevel hs-diploma → bachelors (AF150, read back). Vocabulary from credentialRank_ (educationCareerEngine.js). Teachers on the ledger before the write: bachelors 14, masters 2, hs-diploma 3 (Walker and two others, listed in the reply).
Then (builder: "Yes"): Sage Yamamoto POP-01126 (Teacher, 20) AF953 and Daniela Kapoor POP-01209 (Teacher, 39) AF1036, hs-diploma → bachelors, read back.

## Item 6 — pay vs the cards (builder 2026-11-20: "Yes but mark Aitken is next cycle news he sim doesn't know he signed with Rockies yet")
- Travis Coles POP-00533 Income AA422 24000000 → 21000000 (card: $21.0M 2042–2043), read back.
- Mark Aitken POP-00003 Income left at 21400000 (his A's pay). Found: his RoleType K4 already reads "First Baseman, Colorado Rockies" — changed between the 2026-11-14 and 2026-11-17 snapshots, ahead of the sim; before it read "First Baseman, Oakland A's Legend — Player Rep, Community Liaison". Builder: "The sim doesn't known his on the Rockies" → K4 restored to "First Baseman, Oakland A's Legend — Player Rep, Community Liaison" (the 11-14 value), read back.
- Mike Kinder POP-00114 (Former Manager, Retired, Tier 1) Income "-": Tier 1–2 retirees are exempt from the engine's retired → 0 rule (generationalWealthEngine D5: "a retired star's $220k is Paulson's call"); put to the builder.
Correction (builder 2026-11-20: "I added it after the cycle ran"): the Rockies title was the builder's own entry, made after C116 for the sim to pick up at the next fire. My restore undid it; K4 put back to "First Baseman, Colorado Rockies", read back.

## Item 7 — open (put to him, no answer yet)
EconomicProfileKey vs RoleType: Elio Perez POP-00201 "Server" / key "Solar Installer"; Daniel Cloak POP-00722 "Bakery Worker" / key "Community Organizer" (old-job leftovers; both current roles are in the catalog). Council: City Hall is BIZ-00017 City of Oakland and Civic_Office_Ledger holds every seat; the job catalog has "City Council President" and "City Council Aide" only, so 8 of 9 district members carry key "City Council Aide" (Vega: President). Kinder (builder: "He's retired"): Income AA69 "-" → 0, read back.
Item 7 closed, nothing written (technical call): 503 of the 735 rows with a non-sports EconomicProfileKey carry a key that differs from their RoleType — the key is the profile stamped when applyEconomicProfiles.js seeded the row (or a career move) and is not kept in step with later role text; pay reads RoleType first (generationalWealthEngine applyUntrackedJobReference_: roleText = RoleType, key only when RoleType is blank). Perez and Cloak are two of the 503; fixing two changes nothing. The council "City Council Aide" key is the catalog's only council entry; CIVIC rows price off City of Oakland. A catalog "City Council Member" entry would be a job-list design change, not a fix.
