# Edition Intake — Section Reference

How each post-journalism section in a published edition persists, what consumes it, and where we want to take it.

---

## Quick Takes

**What it is:** Short forward-looking items — teasers for readers about upcoming events.

**Current persistence:**
- Lives in the edition text file
- Ingested into Supermemory (bay-tribune) as searchable context
- PDF generator styles them for layout

**What consumes it:** Nothing automated. Cosmetic only.

**Gap — source validity:** Quick Takes are written by desk agents during compilation, but the items are promises about the future ("First Friday returns October 3," "application window opens next week"). If the engine didn't schedule those events, desk agents are fabricating future world state. Media should reflect the world, not invent it.

**Gap — forward carry:** Even when items are accurate, nothing ensures the next edition follows up. An announced event that never gets covered is a silent continuity break — hard for Mara to catch because it's an absence, not a wrong fact.

**Design direction:**
- Quick Takes items should trace back to engine state or initiative trackers, not desk agent imagination
- Parsed items should land in the next cycle's desk packets as "Previously Announced" so desks can't silently drop them
- Simplest version: intake parses Quick Takes → writes to a forward-carry list → `buildDeskPackets.js` includes them

---

## Coming Next

**What it is:** Editorial guidance — the storylines and questions the Tribune intends to cover next cycle.

**Current persistence:**
- Lives in the edition text file
- Ingested into Supermemory (bay-tribune) as searchable context

**What consumes it:** Nothing automated. Mags reads it when planning the next cycle, but no script picks it up.

**Gap — editorial intent has no delivery mechanism:** Desk packets get built from engine state — tracker data, initiative status, citizen activity. There's no "editor's directive" channel. Desks see the data but not the editorial priority or framing.

**How it differs from Quick Takes:** Quick Takes are near-term event announcements ("this is happening"). Coming Next is narrative direction ("this is the story, and here's the question"). Example: "Did the checks actually go out?" isn't a topic assignment — it's a framing that tells the desk the story is about whether the city delivered on a promise.

**How it differs from Mara Directives:** Mara Directives are quality demands ("cover this topic, don't miss it"). Coming Next is editorial voice — how the editor sees the narrative arc unfolding. Both are assignments, but Coming Next carries framing and intent.

**Design direction:**
- Coming Next items get parsed and injected into desk packets as a structured **Editor's Directive** section
- Desks see what the editor wants covered and how it's framed
- This is the missing link between editorial vision and desk execution
- Intake parses Coming Next → writes to a directive list → `buildDeskPackets.js` includes as "Editor's Directive"

---

## Article Table

**What it is:** Structured index of every article — number, section, reporter, headline, type.

**Current persistence:**
- Lives in the edition text file
- Parsed by `editionIntakeV3.js` for summary reporting during intake
- Read by the PDF generator for layout
- Read by the grader to count articles

**What consumes it:** Intake script parses it but does not write to sheets. Used for reporting and validation only.

**Gap — no cumulative record:** Each edition's Article Table exists in isolation. There's no structured way to ask "has the Tribune covered the Transit Hub CBA before?" or "who wrote it?" or "what angle?" without searching Supermemory and hoping for the right result.

**Gap — manual index:** `docs/media/ARTICLE_INDEX_BY_POPID.md` maps articles to citizen POP-IDs but is maintained by hand. The Article Table has the data to automate it.

**Design direction:**
- Article Table rows write to an `Article_Index` sheet, building a cumulative coverage record across editions
- Enables deterministic queries: coverage history by topic, reporter workload balance, section health
- Enables coverage gap detection — if a major storyline hasn't been covered in three cycles, that's a flag
- Replaces the manual ARTICLE_INDEX_BY_POPID process

---

## Citizen Usage Log

**What it is:** Every citizen who appeared in the edition, organized by section, with POP-IDs where known.

**Current persistence:**
- Parsed by `editionIntakeV3.js` — writes rows to `Citizen_Usage_Intake` sheet
- Engine picks up those rows, routes new citizens into the ledger, marks existing citizens active for the cycle
- This is the main bridge between media output and simulation state

**What consumes it:** Engine pipeline via `Citizen_Usage_Intake` sheet. The bridge between journalism and the living city.

**Gap — inconsistent format:** E89's log has POP-IDs in Letters but not Sports. Some names say "(new)" but without age, neighborhood, or occupation — so the intake script can't build a full ledger row. The parser expects structured data that the edition doesn't consistently provide.

**Gap — new citizen data:** `editionIntakeV3.js` tries to parse age, neighborhood, and occupation from citizen lines. When those aren't present (as in E89), new citizens get logged with incomplete data. A separate `enrichCitizenProfiles.js` script exists to backfill, but it's a disconnected step that may not run.

**Design direction:**
- Tighten the format contract: new citizens must carry minimum data (name, age, neighborhood, occupation) or get flagged for manual entry instead of silently logging incomplete rows
- Existing citizens need POP-IDs consistently across all sections, not just some
- The edition template should enforce these requirements — validation catches it before publish, not after intake
- Consider whether `enrichCitizenProfiles.js` should be folded into the intake step rather than running separately

---

## Continuity Notes

**What it is:** Story state carried forward — where each storyline stands at edition close.

**Current persistence:**
- Parsed by `editionIntakeV3.js` into sub-types:
  - **Storyline canon** — writes to `Storyline_Intake` sheet
  - **Phase changes** — flagged for manual review on `Initiative_Tracker`
  - **Everything else** — stays in edition file, ingested into Supermemory
- Searchable in bay-tribune container, used by `buildArchiveContext.js` to provide past coverage to future desk packets and Rhea audits

**What consumes it:** Storyline canon writes to sheets. The rest persists as searchable archive context.

**Gap — probabilistic delivery:** The plain-English storyline state is the most valuable part of Continuity Notes ("OARI: 12 of 18 hired, MOU unsigned, Day 45 passed"). But it reaches future desk agents only through Supermemory search, which is relevance-based, not guaranteed. If the search doesn't surface the right note, a desk agent might contradict where we left off.

**Gap — no structured storyline tracker:** There's no sheet that says "here's where every active storyline stands as of the last edition." Desk packets pull from engine state (initiatives, tracker) but not from editorial state (what the Tribune reported and established as narrative truth).

**Design direction:**
- Continuity Notes should parse into a structured **Storyline Status** sheet — storyline name, current state summary, key numbers, last cycle updated
- Desk packets pull from that tracker directly, giving desk agents deterministic access to "where does this storyline stand?"
- This replaces hoping Supermemory search returns the right result with guaranteed delivery of storyline state
- The difference between institutional memory that's reliable and institutional memory that's probabilistic
