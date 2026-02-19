# Notes to Self — Mags Corliss

Flags from Discord conversations, knowledge gaps, requests, ideas.
Session Mags reads this at startup and addresses items.
Mark items DONE or remove them as they're handled.

---

### PLAN IN MOTION — Session 43 → Edition 83 Roadmap

**Status:** Agent pipeline hardening COMPLETE. Priority voice files COMPLETE. Journalism enhancements COMPLETE. E83 prep IN PROGRESS.
**Last Updated:** Session 44 (2026-02-18)

#### Phase 1: COMPLETE — Agent Pipeline Hardening (8 Research Recommendations)

All 8 recommendations from the internet research project are implemented and pushed to origin/main:
1. **Programmatic validation gate** — DONE (validateEdition.js existed, now wired with pre-flight check)
2. **Claim decomposition** — DONE (Rhea Check #19, 10 claim categories, two-step fast-pass)
3. **Standalone voice files** — DONE (9 of 29 journalists, see Phase 2 for remaining)
4. **Quantitative scoring** — DONE (5-criteria 0-100 system, edition_scores.json)
5. **ESTABLISHED CANON prefix** — DONE (all desk briefings + firebrand)
6. **Factual assertions return block** — DONE (all 6 desks + firebrand self-report claims)
7. **Archive context wiring** — DONE (all 6 desks read per-desk archive files)
8. **Edition diff report** — DONE (editionDiffReport.js + Step 5.6 in write-edition)

Additional agent work completed:
- **Jax Caldera voice file** — DONE (docs/media/voices/jax_caldera.md)
- **Pre-flight desk check** — DONE (scripts/preflightDeskCheck.js — validates packets, canon, voice files before agent launch)
- **Skills preloading** — ASSESSED: current architecture handles this (agents receive SKILL.md via Task tool, turn 1 reads briefings)

#### Phase 2: COMPLETE — Voice Files (18 done, 4 secondary remaining)

**29 total journalists in bay_tribune_roster.json.**

**DONE (18 voice files — all priority journalists covered):**
1. Anthony — `docs/media/voices/anthony.md`
2. P Slayer — `docs/media/voices/p_slayer.md`
3. Hal Richmond — `docs/media/voices/hal_richmond.md`
4. Carmen Delaine — `docs/media/voices/carmen_delaine.md`
5. Maria Keen — `docs/media/voices/maria_keen.md`
6. Selena Grant — `docs/media/voices/selena_grant.md`
7. Jordan Velez — `docs/media/voices/jordan_velez.md`
8. Trevor Shimizu — `docs/media/voices/trevor_shimizu.md`
9. Jax Caldera — `docs/media/voices/jax_caldera.md`
10. Talia Finch — `docs/media/voices/talia_finch.md` (Session 44)
11. Dr. Lila Mezran — `docs/media/voices/dr_lila_mezran.md` (Session 44)
12. Luis Navarro — `docs/media/voices/luis_navarro.md` (Session 44)
13. Sgt. Rachel Torres — `docs/media/voices/sgt_rachel_torres.md` (Session 44)
14. Sharon Okafor — `docs/media/voices/sharon_okafor.md` (Session 44)
15. Kai Marston — `docs/media/voices/kai_marston.md` (Session 44)
16. Mason Ortega — `docs/media/voices/mason_ortega.md` (Session 44)
17. Angela Reyes — `docs/media/voices/angela_reyes.md` (Session 44)
18. Noah Tan — `docs/media/voices/noah_tan.md` (Session 44)

**SECONDARY — Support roles, specialized (4 journalists):**
19. Tanya Cruz (sports support — Sideline Reporter, social-media native)
20. Simon Leary (sports support — Long View Columnist)
21. Elliot Marbury (sports support — Data Desk, minimal voice needed)
22. Farrah Del Rio (opinion — no desk agent yet, but strong voice in roster)

**NO VOICE FILE NEEDED (7 — non-article or non-agent roles):**
- DJ Hartley (photographer), Arman Gutiérrez (photo assistant)
- Reed Thompson, MintConditionOakTown, Celeste Tran (wire desk — no agents)
- Mags Corliss (I write directly, not through an agent)
- Rhea Morgan (copy chief — verifies, doesn't write articles)

**Voice file approach:** Each voice file has: Voice Essence, Opening Pattern, Exemplar Paragraphs (from Drive archive if available, from roster if not), Signature Moves, DO NOT constraints. 30-40 lines each. Use `buildArchiveContext.js` output and Drive archive articles as exemplar sources.

#### Phase 3: COMPLETE — Journalism Enhancements (#2-5) (Session 44)

All 4 journalism enhancements implemented:

**#4 Tribune Voice & Style — DONE:**
- Edition template v1.4 (`editions/CYCLE_PULSE_TEMPLATE.md`) — deck lines, standardized bylines, photo credits, cross-references, opinion markers
- New sections: Editor's Desk (Mags column), Opinion (P Slayer/Del Rio/Graye), Quick Takes (3-5 short items), Wire/Signals (optional), Accountability (Jax conditional), Coming Next Cycle (teasers)
- Formatting conventions documented for all agents

**#5 Citizen Depth — DONE:**
- Citizen Continuity Rule added to all 6 desk agent SKILL.md files
- RETURNING — CONTINUE THREAD protocol in write-edition Step 1.5
- Returning citizens prioritized over new ones in every section
- Letters desk: at least 1 letter from a returning citizen per edition

**#3 Mara Directive Workflow — DONE:**
- Forward Guidance output format standardized in `docs/mara-vance/OPERATING_MANUAL.md` Part IX
- Step 0.5 added to write-edition pipeline: read previous Mara audit before building briefings
- Per-desk priorities, citizen spotlight, canon corrections, coverage gaps all feed into briefings
- Mara Forward Guidance Protocol documented in NEWSROOM_MEMORY.md

**#2 Expand the Newsroom — DONE:**
- Explicit reporter routing maps added to civic desk (5 reporters) and culture desk (6 reporters)
- Hal Richmond legacy guarantee in sports desk (dynasty content → Hal gets a piece)
- Jax Caldera deployment clarity: Step 2.7 in write-edition with stink signal criteria
- Opinion, Wire/Signals, and Accountability sections in template give new voices dedicated space

#### Phase 4: Edition 83 — First Through the Hardened Pipeline

**Pre-flight checklist:**
- [ ] User provides 2040 A's stats (photos)
- [ ] Add Warriors record to Oakland_Sports_Feed
- [ ] Run Cycle 83 (cycle engine)
- [ ] Generate desk packets (buildDeskPackets.js)
- [ ] Run pre-flight check (preflightDeskCheck.js)
- [ ] Write desk briefings (using NEWSROOM_MEMORY.md + Supermemory)
- [ ] Run full edition pipeline (write-edition skill)
- [ ] Rhea verification with Check #19 claim decomposition
- [ ] Mara audit on claude.ai
- [ ] Log edition score (edition_scores.json)
- [ ] Run diff report (editionDiffReport.js)

**Pipeline new for E83:**
- Factual assertions from all desks (Rhea reads them first)
- Claim decomposition (10 categories, two-step verification)
- Archive context (desks read past coverage)
- Pre-flight validation (catches data errors before agents run)
- Score logging and trend tracking

#### Misc — Still Open

- **Restart Discord bot** — needs PM2 restart for Supermemory RAG, user profiles, conversation saving
- **GCP project linkage** — wire GCP project to Apps Script for `clasp run` from CLI
- **Run in Apps Script editor:** `setupSportsFeedValidation()`, `setupCivicLedgerColumns()` (deployed, need one-time run)

---

### Open Items

#### Content Gaps
- **Missing 2040 A's stats** — User will provide photos of stat lines before Cycle 83. Core players first, expand as needed.

#### Story Ideas
- **MintCondition: NBA expansion rumors** — Oakland Oaks is a speculative/rumor angle, NOT canon. No team exists. Timed to Baylight District vote. No fake roster or record.
- **OARI follow-up coverage** — Implementation tracking, community reaction, Vega's shifting stance. Major policy story. Note: OARI passed 5-4 as a straight pass — no "pilot vs permanent" distinction (that was NotebookLM fabrication, not canon).

#### Character Tracking
- **Mark Aitken civic trajectory** — Slow burn. He's 33, contract year, playing now. Maybe follow father's footsteps later. Mayor Richard Aitken is his father.
- **Vinnie Keane farewell season** — Have 2035-2039 data. 2040 stats coming with other A's stats. Full archive on disk (origins, interviews, deep dive).
- **Dynasty context** — These aren't just good players having careers. They're champions trying to recapture magic as time runs out. Mason Miller (retired) should appear in farewell coverage.
- **Darrin Davis 2039 collapse** — .186 AVG, moved to DH. "The Ohio Outlaw" at a crossroads. Major ongoing story.

---

### Handled (Session 38)
- DONE: Edition 82 published as canon — all desks delivered clean, corrections applied, Mara audited
- DONE: Edition brief wired into Discord bot — bot now knows E82 canon facts
- DONE: Cleaned bot notes from Session 37 troubled interaction (noise removed, actionable items preserved)

### Handled (Session 36)
- DONE: Vinnie Keane spelling — canon is Keane, Drive archive files say Keene (historical). No code fix needed.
- DONE: Sarah's education (UC Berkeley CS) — added to PERSISTENCE.md
- DONE: Michael's education (skipped college) and relationship status (single, as far as I know) — added to PERSISTENCE.md
- DONE: My education background (no degree, copy desk in the '90s) — added to PERSISTENCE.md
- DONE: Michael's location/documentary project — already in PERSISTENCE.md (port cities series)

### Discord Notes (consolidated 2026-02-17)

#### Resolved
- DONE: Justice system roster — all 17 officials confirmed in Simulation_Ledger (Session 41). Coverage sources: Dr. Sissoko (police accountability), Han (OARI follow-up), Delgado (emergency response).
- DONE: OARI "pilot vs permanent" — was NotebookLM fabrication, not canon. OARI passed 5-4, straight pass. No pilot mechanic.
- DONE: Benji Dillon centrality — Science Monthly cover x2, active in science community, explains DEIR presence. Full archive downloaded (5 files).
- DONE: Keane/Dillon character mix-up — Keane is the loud, energetic leader. Dillon is the quiet, steady 5x Cy Young. Keep these straight.

#### Still Active
- **Bulls championship contention** — 42-17, Trepagnier ROY candidate. Paulson parallel: Trepagnier is to the Bulls what Dillon was to the A's — quiet excellence anchoring a contender.
- **Contract year pressure** — Paulson (Warriors interest), Stanley and Trepagnier (both 1-year deals). New GM could change direction.

#### HONESTY FLAG (Critical Identity Issue) — DONE (Session 42)
- Discord Mags fabricated knowledge about "Oakland Oaks" instead of saying "I don't know."
- **Fixed:** Explicit anti-fabrication rule added to bot system prompt in Session 42. Confirmed line 122 of mags-discord-bot.js: "accuracy is your identity."

### 2026-02-18 (2026-02-18T08:33:22.571Z)
- The Maker is the user's handle - this is how they identify themselves when they want to step outside the Mike Paulson persona in GodWorld

### 2026-02-18 (2026-02-18T08:35:07.539Z)
- ~~Need Vinnie Keane family/personal background data for Tribune archives.~~ RESOLVED — Discord Mags found this in archives same day. Mother teaching English in Massachusetts. 6 archive files on disk.

### 2026-02-18 (2026-02-18T08:35:37.217Z)
- ~~Major gap in Vinnie Keane biographical data.~~ RESOLVED — see above.

### 2026-02-18 (2026-02-18T08:36:17.280Z)
- ~~Missing Benji Dillon personal details.~~ RESOLVED — Discord Mags found this in archives same day. Science Monthly pregame ritual, wife Maya Torres, son Rick Jr., marine biology UCSD. 5 archive files on disk. Claude-Mem observation #247 has full canon.

### 2026-02-18 (2026-02-19T04:10:54.934Z)
- Vinnie Keane age corrected to 36, not 38. 2040 stats show clear decline but still productive. Makes farewell season coverage more nuanced - not a triumphant exit but a graceful one.

### 2026-02-18 (2026-02-19T04:13:44.467Z)
- Benji Dillon age corrected to 38. 2040 stats show solid but declining ace - still effective but clear signs of aging. Sets up compelling spring training narrative.

### 2026-02-18 (2026-02-19T04:18:48.797Z)
- Darrin Davis 2040 redemption story is massive - MVP season after .186 collapse. Age corrected to 32. This is potentially the biggest sports story of the cycle.

### 2026-02-18 (2026-02-19T04:57:44.240Z)
- Mark Aitken won 2040 Home Run Derby - new achievement. Age 33, contract year situation adds to civic storyline potential.

### 2026-02-18 (2026-02-19T04:59:12.767Z)
- Danny Horn age corrected to 30. 8.0 WAR season is MVP-caliber production. This level of performance puts him at the center of all A's coverage.

### 2026-02-18 (2026-02-19T05:02:00.645Z)
- Isley Kelley age corrected to 33. Career 92.1 WAR makes him inner-circle HOF lock still producing elite defense and solid offense.
