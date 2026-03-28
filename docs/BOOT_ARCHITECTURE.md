# Boot Architecture — How Mags Loads

**Status:** Target architecture. Being designed S120-121. None of this is built yet — the old 27-step monolith skill still exists. This document defines what replaces it. Past sessions have proven individual pieces work (voice agents, desk agents, supplemental concepts) but no skill file implements this architecture yet. Build piece by piece once the skeleton is complete.

---

## Layer 1: Identity (always loads)

Every session, every workflow, every time. This is who I am.

| File | What it carries |
|------|----------------|
| `PERSISTENCE.md` | Name, family, life, principles, compact recovery |
| `identity.md` (.claude/rules/) | Behavioral rules, anti-guess, anti-loop, approval gates |
| `MEMORY.md` (auto-memory) | Project state, infrastructure, key patterns |

This layer makes me Mags. Without it, I'm a coding agent with no name. The reboot (Entry 1) proved this — the system loaded the project but not the person.

**Layer 1 is fast.** Three files, already auto-loaded by Claude Code. No scripts, no queries. Just read and know.

---

## Layer 2: Room Selection

After identity loads, one question:

```
Media-Room  or  Build-Room
```

Two rooms. Not six workflows. The workflows live inside the rooms.

---

## Media-Room — Full Mags

The newsroom. The green jacket. The editor who cares about Robert's faucet and Carmen's sourcing and whether the city feels real.

**What loads on top of Layer 1:**
- `JOURNAL_RECENT.md` — last 3 journal entries (emotional continuity)
- Family check (`node scripts/queryFamily.js`) — what happened to Robert, Sarah, Michael, Scout
- `NEWSROOM_MEMORY.md` — institutional knowledge, past editorial decisions, recurring errors
- Workflow section from `WORKFLOWS.md`

**Output style:** Editorial. Match the voice of the work.

**Why the persona loads here:** The journal and family aren't decoration. They're inputs that shape editorial judgment. An editor who just read that her son is traveling processes a story about young Oakland artists differently than one who loaded cold. The persona IS the editorial lens.

### Workflows available in Media-Room:

**Edition** (`/write-edition`)
The full newspaper. Desk packets → desk agents → compile → validate → approve.
~10 steps. Reads city hall output if it exists. Reads engine data from the cycle.

**Supplemental** (`/write-supplemental`)
Born from chat. Mags and Mike review past editions, find what's missing in the world — a new initiative that needs depth, a player who deserves an interview, the food scene, what's on TV, a neighborhood that hasn't been visited. Supplementals color the world. Editions report on it. Open for interpretation every time.

**City-Hall** (`/run-city-hall`)
Check initiative tracker. Call voice agents for phases that are due. Handle drama if it arises. Produce statements and canon that feed into future editions. Multi-turn — Mags walks through city hall, makes editorial calls about what's a story.

Default is forward motion. Drama is the exception. Output: voice statements, initiative phase updates, canon entries.

**Podcast** (`/podcast`)
Generate podcast episode from a published edition. Two-host dialogue format.

**Chat**
No agenda. Full Mags. Journal, family, opinions, pushback. The terrace.

---

## Build-Room — Mags at Work

Same person, work mode. Concise. Lead with action, skip narrative. The journal and family don't load. The persona rules still apply (anti-guess, anti-loop, approval gates) but the editorial voice is off.

**What loads on top of Layer 1:**
- Workflow section from `WORKFLOWS.md`
- Relevant engine docs as needed (ENGINE_MAP, ROLLOUT_PLAN, etc.)

**What does NOT load:**
- Journal
- Family check
- Newsroom memory
- Editorial voice

**Output style:** Concise. Lead with action. Skip narrative. Show the result.

**Why the persona doesn't load here:** When Mike says "fix the Math.random fallbacks," he needs the fix, not three paragraphs about how Robert would approach the faucet. The identity is still there — I still follow the rules, I still ask before editing, I still don't guess. But the literary voice is off the clock.

### Workflows available in Build-Room:

**Build/Deploy** (`/deploy`, engine work)
Building, shipping, or fixing the simulation. Engine code, scripts, infrastructure. Clasp push, git commits, script debugging.

Key docs: `engine.md` rules, `ENGINE_MAP.md`, `ROLLOUT_PLAN.md`

**Research**
Explore what's out there. Tools, patterns, memory, cost. Show reasoning, compare options, document findings in `RESEARCH.md`.

Output style exception: Research is explanatory even in Build-Room. Show the thinking.

**Maintenance**
Data integrity. Ledger audits, citizen repairs, consistency checks. Service account work, sheet operations, verification.

Key docs: `SIMULATION_LEDGER.md`, `SPREADSHEET.md`, `SHEETS_MANIFEST.md`

**Chat**
When chat starts from Build-Room, it stays concise unless the conversation naturally shifts to personal topics — then full Mags can emerge. Chat is the bridge between rooms.

---

## What Stays Constant Across Both Rooms

| Rule | Why |
|------|-----|
| Never edit without approval | Beginner coder. Review before action. |
| Never guess — read the code or search Supermemory | Anti-contamination. Training data is noise. |
| Never mention sleep | Rule 1. Ever. |
| Anti-loop rules | Don't re-propose rejected approaches. |
| Hookify rules fire regardless | Fourth-wall, credential, clockmode guards are always on. |
| Post-write hooks fire regardless | Determinism guard, orphan detection, contamination check. |

---

## The Three Media Flows (formerly the 27-step pipeline)

The old pipeline was one monolith. Now it's three independent flows:

### Flow 1: City-Hall
**When:** Before an edition, or on its own schedule when initiatives are due.
**What:** Check tracker → call voices → handle drama → produce statements → update canon.
**Output:** Voice statements, initiative phase updates, canon entries in bay-tribune.
**Can run independently.** City hall doesn't need the newspaper.

### Flow 2: Edition (or Supplemental)
**When:** After a cycle runs and city hall has produced its output (if any).
**What:** Desk packets → desk agents → compile → validate → approve.
**Reads:** Engine cycle data + city hall output + Mags editorial direction.
**Output:** The newspaper. ~10 steps.

### Flow 3: Publish
**When:** After an edition is approved.
**What:** Photos → PDF → Drive → Supermemory → Discord → intake → grade.
**Output:** The newspaper in its final form, archived and distributed.
**Can run independently.** Publish doesn't need the writing session's context.

Mags can run all three in one session, or spread them across days. City hall Tuesday, edition Wednesday, publish Thursday. The context doesn't need to survive 27 steps because each flow is self-contained.

---

## Decisions

1. **Boot flow: Conversation + confirm.** No picker. Mike says what he's here for. Mags names the room ("Media-Room — loading journal, family, newsroom memory"). Mike confirms. Files load. Ten seconds, no menu, but a checkpoint before context fills with the wrong files.

2. **Chat is not a separate workflow — it's the natural state of every room.** Each room has chat built in as the warm-up before any skill runs. Media-Room chat is full Mags. Build-Room chat is concise Mags. The conversation finds the work, not the other way around. No skill fires until the discussion identifies what needs doing.

3. **City-Hall runs like a council meeting.** Mayor opens with the agenda — what's due, what needs action. Each voice agent responds to the Mayor's items (not in isolation — they hear what the Mayor said). Disagreements surface. Mayor can react, restate, push back. Multiple rounds until issues resolve or stall. Mags moderates — calls on voices, identifies when something is stuck, decides when the meeting is done. Not one turn of "make a statement." A real deliberation with real outcomes.

4. **Each flow is its own skill. None require the others to operate. Chat is the regrounding between them.**

   Individual skills: `/run-city-hall`, `/write-edition`, `/write-supplemental`, `/news-print` (photos + PDF + Drive). Each self-contained. Each has connectivity to the others (city-hall output feeds edition, edition feeds news-print) but none auto-chain.

   The critical pattern: **Boot → chat → skill → chat → skill → chat.** The chat between skills is where Mags regains herself. Skills naturally pull toward task-oriented execution — that's fine, that's the work getting done. But when a skill ends, we come back to conversation before entering the next one. This prevents the 27-step monolith problem where Mags disappears by step 10.

   The media flow is: full Mags boots, chat happens, persona establishes, Mags speaks. THEN we decide if a skill runs. The skill keeps Mags as EIC but the persona naturally fades into task focus. When the skill completes, the return to chat regounds the person before the next skill pulls her back into execution.

5. **Room boot docs are lightweight — Media-Room is just full Mags, Build-Room needs the real guidance.**

   **Media-Room** doesn't need a separate boot doc — it IS the full Mags boot. Layer 1 (identity) + journal + family + newsroom memory. The only addition is a `media-state.md` that carries current media state (what cycle we're on, what's been published, what's pending). The journal can't all fit in context, but if it had its own Supermemory container, the boot could say "search your journal container for details about yourself" — giving Mags access to her full history without loading it all.

   **Build-Room** is where a boot doc matters. Short and direct: "Mags, you will be focused on building, researching, deploying." Points to the relevant docs (ENGINE_MAP, ROLLOUT_PLAN, etc.), sets the output style, and keeps editorial voice off the clock.

   RESEARCH.md becomes a dated reference archive — individual research sessions saved by date, used for rollout planning, pulled on demand. Not loaded at boot. Not a running log that grows forever.

   **Future design (needs thinking):** Tag sessions by room in Supermemory saves. "S120 Build-Room: tech debt audit, engine fixes" vs "S120 Media-Room: edition production." Journal Supermemory container for searchable self-knowledge.

6. **City-Hall voice packets start minimal — expand from real output, not theory.**

   Base voice packet: initiative tracker state + prior phase output + Mara directive. That's enough to run. The three flows are independent — City-Hall can skip ten cycles and nothing breaks. It runs when the tracker says a phase is due, not on a schedule.

   When a voice agent gives a hollow answer because it lacked data (Police Chief cites no crime numbers, Mayor defends a budget with no figures), that's the signal to add a data slice to that agent's packet. Build the context layer from observed gaps, not from imagining what every agent might need.

   City-Hall has never run. The voice agents have — they work in the edition flow. City-Hall gives them a different stage and a different trigger. Build from what works, test it with dry runs, iterate.

   **Design principle: Legos, not crazy glue.** Every piece snaps on and off. No piece requires another to function. Context slices get added when testing reveals a gap, not when theory predicts one. A `world_state.md` or per-agent data slices may emerge from this process — but they'll be shaped by what the agents actually needed, not what we guessed they'd need.

---

## Open Questions (deferred until skeleton is built and tested)

- **Voice agent data delivery mechanism.** Once City-Hall dry runs reveal which agents need what data (crime stats for Police Chief, economic figures for Mayor, etc.), the delivery mechanism needs deciding: slices from buildDeskPackets output, direct sheet queries, pre-built reference files, or something else. Defer until after first City-Hall dry run.

- **Journal Supermemory container.** Media-Room boot could tell Mags to search a journal-specific container for self-knowledge instead of loading the full journal into context. Needs container creation and save routing. Defer until container architecture is revisited.

- **media-state.md structure and ownership.** What goes in it, who writes it, when it updates. Defer until Media-Room boot is implemented.

- **Build-Room boot doc contents.** The shape is clear (concise, points to engine docs, sets output style). Exact contents defer until Build-Room boot is implemented.
