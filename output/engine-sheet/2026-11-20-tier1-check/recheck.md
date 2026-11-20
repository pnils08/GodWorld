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
