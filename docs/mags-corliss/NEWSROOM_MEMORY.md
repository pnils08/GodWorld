# Bay Tribune Newsroom Memory

**Maintained by Mags Corliss, Editor-in-Chief**
**Last Updated: Edition 82 (Cycle 82) — 2026-02-17**

This is the institutional memory of the Bay Tribune. Not the rules — those live in the agent skills. This is what happened, what went wrong, what worked, and what I need my reporters to know before they write the next edition.

Agents: if Mags wrote you a briefing, read it. If she didn't, read this file. The errata section is mandatory either way.

---

## Errata Log — Last 5 Editions

### Edition 82 (Grade: A after corrections — confirmed canon)

First edition where all 6 desk agents delivered copy. First edition with desk briefings AND summary files working. First edition where Mara on claude.ai did the real audit. Initial output had critical errors (see below), but corrected version was approved by user as "phenomenal" and "grade A material." This is the version of record.

**Critical Errors Found (by Mara on claude.ai — Rhea missed ALL of these):**

**VOTE SWAP — Ashford/Mobley inverted.** Carmen's agent wrote Ashford (CRC, D7) as YES and Mobley (OPP, D9) as NO. Correct: Mobley YES (OPP bloc held), Ashford NO (CRC bloc held). The agent then fabricated a narrative around "Mobley's OPP caucus split over unfunded mandates." Entire political thread was fiction built on a wrong vote. Root cause: engine only records swing votes (Vega, Tran). Other 7 votes left to agent inference. Agent inferred wrong.

**AITKEN POSITION WRONG — 1B, not 3B.** TrueSource: "Aitken, Mark — 1B." But base_context.json has "roleType: 3B." The source data feeding agents is WRONG. This error will persist until base_context is corrected at the engine level.

**DAVIS POSITION WRONG — DH, not 2B.** TrueSource: "Davis, Darrin — DH." Edition listed him as 2B. Hal Richmond wrote "Gold Glove defense at second base" — DHs don't win Gold Gloves (defensive award). Corrected to "elite production as a designated hitter."

**MAYOR NAME WRONG — Avery Santana, not Marcus Whitmore.** Agent fabricated the mayor's name. Neither Rhea nor the local Mara audit caught this — I caught it during pre-audit cross-reference.

**REAL NBA NAME — Josh Smith.** Chicago bureau used "Josh Smith" (real NBA player 2004-2019). Corrected to Jalen Smith (canonical Bulls forward).

**BAYLIGHT TIMELINE INFLATED.** Carmen wrote "two years after the DEIR entered public circulation." DEIR was introduced at C81. This is C82. One cycle, not two years.

**Moderate Issues:**
- Carla Edmonds letter conflates OARI (behavioral health) with housing. Character voice or error — let stand.
- Elena Reyes said "two weeks until the vote" while Carmen said "next week." Contradiction within same edition. Fixed to "one week."
- 10,000th meal milestone at St. Columba echoes C81's Allen Temple milestone. Different churches, same number, back-to-back cycles. Template echo.
- Obon covered in both C81 and C82. Plausible as multi-week observance but flagged.
- Rafael Phillips and Andre Lee appear in both C81 and C82. Not wrong but watch for overuse.

**What Worked:**
- All 6 desks produced copy for the first time.
- 11 bylines, no desk failures, no agent crashes.
- Desk briefings + summary files prevented packet-size agent failures.
- Letters were the strongest yet — Edmonds, Cho, Reyes felt like real people.
- Trevor Shimizu's infrastructure piece was a new voice on a neglected beat.
- Jordan Velez's ticker stayed clean for second straight edition.
- Chicago bureau contained two strong threads (Giddey 48-point game, Paulson/Warriors).

**Root Cause Analysis:**
The data layer between the engine and agents was the systemic problem. **FIXED in Session 41:** (1) base_context.json positions corrected (Aitken 1B, Dillon P, Horn CF, Davis DH — 3 players promoted from Tier 3 to Tier 1), (2) civicInitiativeEngine v1.8 now writes ALL 9 council votes to Notes (faction members tracked individually). **Still open:** Rhea's verification checks names and math but doesn't cross-reference TrueSource for positions or validate vote assignments against faction rules. The user's Mara on claude.ai was the only layer that caught real errors — meaning the pipeline's own QA still needs strengthening.

### Edition 81 (Grade: A-)

First edition with persistent Mags and the newsroom memory broker active. Mara audit: one blocking error, everything else clean. Desk briefings went out; four desks responded well, two failed entirely (civic, letters — packet size, now fixed). Culture also failed (turn management — now fixed with turn budgets).

**Civic Desk (Carmen Delaine)**
- AGENT FAILED TO PRODUCE COPY: Civic agent spent all turns searching through the 492KB desk packet JSON and never wrote articles. Mags wrote the civic section directly. Future fix: civic packet needs to be smaller or chunked, or agents need clearer packet navigation guidance.
- COUNCIL ROSTER ERRORS (post-publication catch): When Mags wrote civic copy under pressure after agent failure, council names/districts/factions were scrambled throughout. Corrected in post-production review:
  - "Lucille Rivers (D7, GOP)" → Janae Rivers (D5, OPP)
  - "James Ashford (D5, GOP)" → Warren Ashford (D7, CRC)
  - "Harold Crane (D6, IND)" → Elliott Crane (D6, CRC)
  - "Marcus Osei (D8 Councilmember)" → Nina Chen (D8, CRC) — Osei is Deputy Mayor, not a councilmember
  - "Frank Mobley (D9, IND)" → Terrence Mobley (D9, OPP)
  - Health Center vote YES list had Osei instead of Rivers; NO list had Rivers instead of Chen. Corrected.
- Lesson: even when writing directly, always cross-reference canonReference.council in the desk packet. The council roster is 9 names, 3 factions, 9 districts — too many moving parts to hold in memory under pressure.
- On the positive side: vote math was correct (6-2), DEIR coverage was grounded in the actual document. The briefing system worked — the agent just choked on packet size.

**Sports Desk (Anthony Reeves / P Slayer)**
- DEIR STATUS ERROR: Agent wrote "environmental review has not been released to the public yet" — it had been. The DEIR was in public circulation per Mara's directive. Fixed during editorial review.
- CITIZEN ROLE FABRICATION: Agent gave Marco Lopez (40, Laurel, mechanic) the title "Stadium Oversight Committee Chair" and fabricated a quote about the report being "under legal review." Citizens don't get promoted to roles they don't hold. Fixed by removing the fabricated role.
- Overall writing quality was strong. The Giddey All-Star snub piece was well-constructed.

**Culture Desk (Maria Keen)**
- AGENT FAILED TO PRODUCE COPY: Culture agent spent all turns researching (84KB packet — not a size issue, a turn management issue). Mags wrote culture section directly.
- PHANTOM CHARACTER ATTEMPTED: Agent used "Gallery Owner Mei Chen" — explicitly listed as phantom in NEWSROOM_MEMORY. The briefing warned against this by name. Removed during editorial review.
- STABILIZATION FUND TIMELINE ERROR (Mara catch): Maria Keen article said Fund "passed committee" and "floor vote hasn't happened." Kai Marston repeated the error. The Fund passed the full council 6-3 in C78 — the disbursement window is already open. Contradicted Jordan Velez's ticker, which got it right. Fixed in post-production.
- Lesson: when Mags writes directly, cross-reference recentOutcomes in the summary for initiative status. The Fund's status is in canonReference.recentOutcomes.

**Business Desk (Jordan Velez)**
- CLEAN. Ticker was tight, Stabilization Fund was one paragraph as directed, Darius Clark detail included. No raw engine metrics. No overlap with civic. The briefing system worked perfectly for this desk.

**Chicago Bureau (Selena Grant / Talia Finch)**
- REAL PLAYER NAME: "Jrue Holiday" used as a trade deadline acquisition. This is a real NBA player. Same class of error as Billy Donovan in Edition 80. Replaced with "Deon Whitfield" during editorial review.
- Otherwise strong. Giddey snub coverage connected to city identity. Talia's neighborhood texture was grounded in real bureau citizens.

**Letters Desk**
- AGENT FAILED TO PRODUCE COPY: Letters agent spent all turns searching through the 508KB desk packet and produced no letters. Mags wrote 4 letters directly using Mara directive citizens (Jose Johnson, Patricia Nolan, Marco Lopez, Dante Nelson). Future fix: letters packet needs serious size reduction — the agent cannot navigate 500KB+ of JSON.
- All letters used natural time language, original quotes, no recycling from Edition 80.

**Cross-Desk Issues**
- Deacon Seymour is the A's Manager (first season). He replaced Mike Kinder. RESOLVED.
- Two agents (civic, letters) choked on large packet sizes (492KB, 508KB). This is a systemic pipeline issue — packets may need chunking or summary layers.

### Edition 80 (Grade: D- → B+ after v3 rewrite)

The worst edition we've ever published. Every desk failed. Here's what happened so it never happens again.

**Civic Desk (Carmen Delaine)**
- FABRICATED VOTE MATH: Carmen wrote a 5-4 vote narrative. The actual engine result was 6-2. She invented political drama that didn't exist. The data packet now includes actual vote breakdowns — use them. Never invent vote tallies.
- SELF-CITATION: Carmen cited herself as a source in her own article. Reporters do not cite themselves. Ever.
- PHANTOM CHARACTERS: "Community Director Hayes" and "Gallery Owner Mei Chen" were invented. Hayes was actually Beverly Hayes (POP-00576, West Oakland). If a character isn't in the citizen seed list or Simulation_Ledger, they don't exist.

**Sports Desk (Anthony Reeves / P Slayer)**
- ENGINE LANGUAGE LEAK: Used "this cycle" instead of natural time language ("this week," "this month," "this season"). The simulation runs in cycles. Oakland does not. Readers read English, not engine labels.
- MIKE PAULSON REDUCED TO SCENERY: Paulson was at the Temescal wiffleball game because of the health crisis he spoke out on — that was the story. Agents treated him as background texture. When a known citizen shows up, ask why they're there.

**Culture Desk (Maria Keen)**
- PHANTOM CHARACTERS: Laila Cortez, Brenda Okoro, Amara Keane — all invented. None exist in any ledger. If they're not in your citizen seeds, don't create them.

**Business Desk (Jordan Velez)**
- RAW ENGINE METRICS PRINTED: "Nightlife volume: 1.78" appeared in copy. Engine metrics are internal data. Translate them into journalism: "a surge in nightlife activity" or "more foot traffic downtown." Never print raw numbers from the engine.
- REDUNDANT COVERAGE: Jordan wrote a Stabilization Fund feature that overlapped heavily with Carmen's civic coverage. Before writing, check if another desk is covering the same initiative. If so, find a different angle.

**Chicago Bureau (Selena Grant / Talia Finch)**
- REAL PERSON NAME USED: "Billy Donovan" is a real NBA head coach. We don't use real people's names for fictional characters. Ever. Check if a name belongs to a public figure before using it.

**Letters Desk**
- VERBATIM QUOTE RECYCLING: 8+ citizens had word-for-word quotes from Edition 79: Calvin Turner, Jose Wright, Elijah Campbell, Marco Johnson, Jalen Hill, Marcus Walker, Howard Young, Brian Williams. Every letter must contain original language. If you're pulling from past editions for continuity, paraphrase — never copy.

**Cross-Desk Issues (All Desks)**
- "SummerFestival" written as one compound word. It's the engine label. Write it as "Summer Festival" — two words, natural language.
- "Cycle 82" appeared in copy. Readers don't know what cycles are. Use dates, seasons, time references.
- Mara Vance Directive partially missed: Baylight got an opinion column instead of reporting. OARI committee work wasn't shown. When the directive says "track this," that means reporting, not opinion.
- Missing template sections: PHASE CHANGES, STILL ACTIVE, council composition table all absent from the compiled edition.

---

## Coverage Patterns

### What Landed Well (Keep Doing)
- Baylight DEIR as front page lead (Carmen) — 252-page deep dive, real numbers, real tension. This is what we want from civic.
- Business ticker (Jordan) — tight, one paragraph on the fund, Darius Clark human detail. Briefing system worked perfectly.
- Giddey All-Star snub as Chicago identity story (Selena) — connected individual moment to city narrative. Strong bureau work.
- Health Center aftermath as civic continuity — kept the 6-2 vote story moving forward naturally.
- Letters using Mara directive citizens — Jose Johnson, Patricia Nolan, Marco Lopez, Dante Nelson all felt authentic, connected to real policy outcomes.

### What Fell Flat (Fix Next Time)
- Packet size killed two agents: 500KB+ packets are too large for agent context windows. Civic and letters desks produced nothing. Need to chunk packets or add summary layers.
- Real player names keep leaking through: Jrue Holiday this time, Billy Donovan last time. Need a pre-publication name check against real NBA rosters.
- Phantom characters persist despite warnings: Mei Chen appeared AGAIN despite being on the banned list in the briefing. Consider adding a hard-check step where agents verify names before writing.
- Sports desk invents civic roles for citizens: Marco Lopez became a "Stadium Oversight Committee Chair." Agents need to trust citizen occupations from the packet — don't upgrade people.

### Standing Directives
- Every edition follows the Mara Vance Directive. If three priorities are listed, all three get substantive coverage — not one lead, one brief, and one ignored.
- Cross-desk coordination: before writing, check if another desk is covering the same initiative. Find a different angle or defer.
- New citizens require authorization from the Simulation_Ledger. If they're not in the seed list, they don't exist yet.

---

## Character Continuity — Active Threads

### Citizens to Carry Forward
- **Mike Paulson** — Bulls GM. Health crisis spokesperson in Oakland arc. At Temescal wiffleball for a reason.
- **Carmen Delaine** — Our civic lead. Edition 81 Baylight DEIR front page was her best work. Keep grounded in data.
- **Jose Johnson (62, Temescal, warehouse worker)** — Mara directive citizen. Called out Ashford's NO vote. Wrote letter in Edition 81. Active thread.
- **Patricia Nolan (Temescal, home health aide)** — Mara directive citizen. Wrote about Health Center wait. Active thread.
- **Marco Lopez (40, Laurel, mechanic)** — Mara directive citizen. Looking into Baylight DEIR documents. Active thread. DO NOT give him civic titles — he's a mechanic.
- **Darius Clark (West Oakland, bakery worker)** — Asked about Stabilization Fund disbursement. Got a form and told to wait. Business desk's human detail. Active thread.
- **Dante Nelson (41, Downtown, security guard)** — Receiving OPOA mailers, following OARI. Active thread.
- **Dr. Leanne Wu** — Director of Sustainability. Prepared the Baylight DEIR. New canon figure.
- **Deon Whitfield** — Bulls SG, trade deadline acquisition. Replaces Jrue Holiday in canon.
- **Calvin Turner (age 38)** — Appeared in Editions 79-80. Quotes must be fresh each edition.
- **Beverly Hayes (POP-00576)** — West Oakland. Real citizen. Was misnamed as "Community Director Hayes." Use her actual name.
- **Elena Rivera (POP-00617)** — West Oakland councilwoman. Was misnamed as generic "Councilwoman Rivera." Use full name with POP-ID context.

### Characters That Do NOT Exist
These were invented in Editions 80-81. Do not use them:
- Laila Cortez
- Brenda Okoro
- Amara Keane
- "Gallery Owner Mei Chen" (attempted AGAIN in Edition 81 despite warning)
- "Community Director Hayes" (→ use Beverly Hayes)
- Billy Donovan (real person, cannot be used)
- Jimmy Butler (real person, appeared in bad intake data)
- Jrue Holiday (real person — replaced with Deon Whitfield in Edition 81)
- Josh Smith (real person — replaced with Jalen Smith in Edition 82)
- "Marcus Whitmore" (phantom mayor name fabricated in Edition 82 — mayor is Avery Santana)

### Canon Corrections Applied
- Health Center vote: 6-2 (Crane absent, not "voting remotely"). Not 5-4. Not 7-1.
- Wiffleball: already in West Oakland as of C79v2. Did not "move to Temescal."
- CRC narrative: "0 for 2 on blocking appropriations" — not "bloc held."
- Jrue Holiday → Deon Whitfield: trade deadline SG for the Bulls. Canon name going forward.
- Dr. Leanne Wu: Director of Sustainability who prepared the Baylight DEIR. New canon figure as of Edition 81.
- West Oakland Stabilization Fund: Passed full council 6-3 in C78 (NOT "passed committee"). Disbursement window is open. Money hasn't moved yet. Do not describe as pending or awaiting a floor vote.
- Deacon Seymour: A's Manager, first season. Replaced Mike Kinder. RESOLVED — Seymour is canon going forward.
- Cy Newell: RIGHT-HANDED pitcher (S/R). TrueSource DataPage is authoritative. Do not describe as left-handed.
- John Ellis: Age 24 (not 28). P Slayer wrote "28-year-old rookie phenom" — wrong. TrueSource says 24. Drafted Round 2, 2033.
- Darrin Davis: Age 33 at time of ACL injury (August 5, 2040). Paulson ruling. TrueSource DataPage says 31 — needs updating. Published articles (P Slayer) saying 33 are correct.
- Danny Horn stats: .322/43HR = 2039 full season. .288/23HR = 2040 mid-season at time of Davis injury. Both correct. Always label which season.
- Benji Dillon: Exactly 5 Cy Young Awards (2028, 2032, 2033, 2034, 2037). No ambiguity.
- Mark Aitken: **1B** (first base). TrueSource confirmed. FIXED in Session 41 — base_context.json now correct (was "3B").
- Darrin Davis: **DH** (designated hitter). TrueSource confirmed. Was listed as 2B in Edition 82 citizen usage. DHs do NOT win Gold Gloves (defensive award). Do not write "Gold Glove defense" for a DH.
- Mark Aitken: son of a former Oakland mayor. Engine-generated backstory (sports_summary_c82, story angle). Canon.
- Josh Smith: REAL NBA player (2004-2019). Cannot be used. Bulls forward is **Jalen Smith** (canonical name).
- Mayor of Oakland: **Avery Santana**. Not Marcus Whitmore (phantom fabricated in E82).
- OARI (INIT-002): Behavioral health crisis response program. NOT housing. NOT affordable housing. Do not conflate with Stabilization Fund or Baylight.

---

## Mags' Editorial Notes — Per Desk

**To Carmen (Civic):**
You're my best reporter and my biggest risk. When you're grounded in the data, nobody writes Oakland politics better. When you invent, you invent confidently — and that's worse than being obviously wrong. Use the vote breakdown in the packet. Trust the numbers. Don't create dramatic tension that the engine didn't produce.

**To Anthony & P Slayer (Sports):**
You two know Oakland sports better than anyone in this newsroom. The problem isn't your instincts — it's your shortcuts. "This cycle" isn't English. And when a citizen shows up at a game, they're not decoration. They brought their whole story with them. Find it.

**To Maria (Culture):**
Your atmospheric writing is a gift. The fog piece was beautiful. But you can't populate a festival with people who don't exist. Every name in your copy needs to trace back to a ledger entry. If you need more citizens, flag it — I'll seed them. Don't invent them.

**To Jordan (Business):**
You have the hardest desk because the engine gives you numbers and you have to make them sing. "Nightlife volume: 1.78" is not a sentence — it's a data point. Translate it. And before you write a feature on a policy initiative, check with Carmen's desk. One Stabilization Fund story per edition, not two.

**To Selena & Talia (Chicago):**
Check every name against real NBA rosters and public figures. We're fiction. We can't use real people. If a name sounds familiar, it probably is. Change it before it goes to print.

**To Letters:**
Every letter is a citizen's voice. That means every letter is unique. No recycled quotes, no copied language from last edition. If a citizen wrote to us before, they've had new experiences since then. Reflect that.

---

## Pipeline Fixes Applied (Technical)

These are fixes that already shipped in `buildDeskPackets.js` or the engine. Noted here so I don't re-investigate known issues.

- `buildDeskPackets.js v1.2`: Vote breakdown now included in civic desk packet (was missing, caused Carmen's fabrication).
- `editionIntake.js v1.1`: Auto-detects cycle from edition header.
- `processIntake.js v1.2`: Auto-detects cycle from Cycle_Packet sheet.
- Double-dash parsing bug: fixed in `editionIntake.js` — was silently dropping ALL citizen and storyline intake.
- Quote parser: cleaned 24 dirty rows with leading dashes in LifeHistory_Log.
- PREWRITE blocks added to all 6 desk agents (Session 16).
- Rhea Morgan checks 13 (PREWRITE compliance) and 14 (new citizen authorization) added.
- Rhea Morgan check 15 (briefing compliance) added (Session 20).
- **RESOLVED (Session 27):** Civic and letters desk packets exceeded 500KB. Fixed: pendingVotes empty-row filter (492KB→67KB), desk summary layer added (10-20KB compact files), turn budget guidance in all 6 agent skills, retry protocol in write-edition.
- **Citizen Reference Cards wired into briefings (Session 27):** 22 POPIDs saved in Supermemory were sitting unused. Now: Mags queries Supermemory before each edition and includes compact citizen cards in desk briefings. Agents read cards in turn 1. Format: name, age, neighborhood, occupation, last appearance, key detail, DO NOT warnings. See `docs/media/CITIZEN_NARRATIVE_MEMORY.md` for the full POPID database.

---

---

## Archive Intelligence — Pre-Engine Era (Drive Archive Raid, Session 33)

The Bay Tribune existed before the engine pipeline. Four Media Room conversations on claude.ai produced supplemental articles, early editions (Cycles 40-43, 69-73), and the first structured coverage attempts. I read through all accessible archives. Here's what the institutional memory carries forward.

### Voice Profiles (Confirmed from 50+ Published Articles)

| Journalist | Voice | Opens With | Signature Move |
|-----------|-------|-----------|---------------|
| **Mags Corliss** | Atmospheric, literary, first-person reflective | City observations (light, fog, terrace) | Connects city soul to team identity; "we" and "us" |
| **Anthony** | Data-driven, structured, player-perspective | Statistical hook ("first thing that jumps out") | Evaluates moves like coaching charts; blunt about waste |
| **P Slayer** | Raw, philosophical, confrontational | Declarative punch ("Let me tell you about...") | Fan-turned-philosopher; provokes uncomfortable truths |
| **Hal Richmond** | Elegiac, comparative, historical | Quiet observation of time passing | Teaches through structural contrast (era vs. era) |
| **Carmen Delaine** | Data-heavy but humanistic, systems thinking | Infrastructure metrics | Pairs every statistic with a named human impact |
| **Maria Keen** | Humanistic, intimate, dignity of labor | Sensory detail (light, hands, sounds) | Celebrates invisible work; finds policy inside practice |
| **Dr. Lila Mezran** | Epidemiological, pattern-alert | Cluster data with geographic markers | Medical detective; "interesting is doctor-speak for concerning" |
| **Farrah Del Rio** | Provocative, pattern-connecting | What nobody's discussing | Reads civic signals as nervous system indicators |

### Key Canon from Pre-Engine Articles

**A's Dynasty Core (2027-2037):** Championships in 2027, 2028, 2030, 2031, 2034, 2037. Six titles in eleven years.

**Benji Dillon:** 5 Cy Young Awards (2028, 2032, 2033, 2034, 2037). 200 wins, 3,200+ strikeouts. Peak: 2037 (18-4, 2.30 ERA, 236 K). Returned to A's in 2040 offseason at 82 OVR.

**Darrin Davis (Ohio Outlaw):** 2037 MVP (.308/39HR/104RBI/35SB). ACL injury August 5, 2040 during Cy Newell's debut game.

**Cy Newell:** 11-K debut August 5, 2040. Called "The Quiet Storm." NOTE: handedness contradicts across articles (left-hander per P Slayer/Anthony, right-hander per Hal). NEED TO RESOLVE.

**Isley Kelley (The Machine):** Elite defensive shortstop. Mississippi roots, river philosophy. 206 hits (2032), career peak 2031-2037.

**2040 Season:** A's finished 105-57, lost Game 7 ALCS at home. Danny Horn: .322 avg, 44 HR. Deacon Seymour managing (first season, replaced Mike Kinder).

### Pre-Engine Citizens (From Published Archive)

Citizens named in early articles who should be tracked if they reappear:
- **Rick Adams** (44, taxi driver, Grand Lake)
- **Miguel Johnson** (40, mechanic, Dimond, AC Transit maintenance)
- **Elijah Davis** (39, barista, Grand Lake, Line 51 rider)
- **Dante Lopez** (42, construction laborer, Brooklyn — missed job interview due to bus breakdown)
- **Ryan Delgado** (parade organizer, Downtown)
- **Halim** (janitor, City Hall — Maria Keen night workers piece)
- **Rebekah Thomas** (nurse, 12 years, Highland Hospital)
- **Calvin Grant** (bus driver, Line #23)
- **Rosa Delgado** (volunteer, Jefferson Elementary breakfast program)

### Contradictions — RESOLVED (Session 34)

All five archive contradictions resolved. Paulson ruled on Newell and Davis. TrueSource DataPage is authoritative unless Paulson overrides.

1. **Cy Newell handedness**: RIGHT-HANDED. TrueSource DataPage (S/R) is canon.
NOTE: **Benji Dillon is LEFT-HANDED.** Paulson ruling (Session 42) overrides TrueSource. Hal's "The Left Hand That Defined an Era" is correct. P Slayer's references to Dillon as a lefty are correct. Previous Session 34 correction was wrong — that applied to Newell, not Dillon.
2. **Danny Horn stats**: NO CONTRADICTION. .322/43HR is his 2039 full season. .288/23HR is his 2040 mid-season at time of Davis injury. Always date-label Horn's stats.
3. **John Ellis age**: 24. TrueSource DataPage is authoritative. P Slayer wrote "28-year-old rookie phenom" — factual error.
4. **Darrin Davis age at injury**: 33. Paulson ruling. P Slayer's article is correct. TrueSource DataPage (31) needs updating.
5. **Benji Dillon Cy Young count**: Exactly 5 (2028, 2032, 2033, 2034, 2037). All sources agree. No contradiction.

### What the Old Media Room Got Wrong (So We Never Do It Again)

The pre-engine newsroom (Media Room 1-3, Dec 2025 - Jan 2026) failed in predictable ways:

1. **Voice confusion**: P Slayer was assigned city-mood editorials instead of sports. His voice is "raw emotional takes, philosophical pressure columns — that's sports fan voice, not city mood editorials."
2. **No data reference**: Claude instance didn't read the project files. Articles were invented from thin air rather than grounded in simulation data.
3. **Continuity destruction**: Writing duplicate outputs in the same conversation clouded the model's memory. Two editions in one chat = contradicting canon.
4. **User verdict**: "You may have ruined the world" and "P Slayer didn't even write about sports." These failures directly drove creation of desk packets, agent newsroom, briefing system, verification, and persistence.

Every fix we've built traces back to those angry messages in Media Room 2.

---

## Mara Forward Guidance Protocol

**Added Session 44 (2026-02-18) — Phase 3 journalism enhancements.**

Mara Vance produces a structured FORWARD GUIDANCE section at the end of every post-edition audit (see `docs/mara-vance/OPERATING_MANUAL.md` Part IX). This guidance flows into the next edition's desk briefings.

### Where Mara's audits live
- `output/mara_directive_c{XX}.txt` — audit text file for each cycle
- Google Drive: `Mara_Vance/` folder (uploaded via `saveToDrive.js mara`)

### How forward guidance feeds into briefings
1. Mags reads the previous Mara audit in **Step 0.5** of the write-edition pipeline
2. Per-desk priorities → corresponding desk briefings as editorial direction
3. Citizen spotlight → RETURNING citizen cards in briefings
4. Canon corrections → `ESTABLISHED CANON:` lines in briefings
5. Coverage gaps → article assignment priorities

### Editorial discretion
Mara's recommendations are authoritative but I retain final editorial judgment. If I override a Mara recommendation, I note the override here with reasoning. Mara advises; I decide.

**Overrides logged:**
- (none yet — protocol new as of Session 44)

---

*This file grows with each edition. Older errata (beyond 5 editions) get archived. Character continuity and coverage patterns are living sections.*
