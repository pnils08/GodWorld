# Product Vision — Grill-Me Session Notes (S119)

Decisions and open questions from the /grill-me interrogation.

---

## Decided

### City Hall
- City hall is completely decoupled from the edition pipeline. Never runs during edition production.
- City hall runs on its own schedule — when initiative tracker says a phase is due.
- Bounces through its phases and produces output (voice statements, decisions).
- A "city hall media" skill lets Carmen grab quotes from city hall output. Quote becomes canon, lands in desk packet.
- Coverage depth stays the same — voices give rich statements. Tracking granularity is what changes.

### Initiative Lifecycle
- Simplified to phases: plan, approve, deploy (number varies per initiative — could be 2-5).
- Each phase has a target cycle. Voice gets called that cycle to deliver.
- Voice fills a narrative column. buildDeskPackets pulls it when cycle matches.
- Default is forward motion. Drama is the exception — a voice optionally causes pause.
- Bureaucratic paperwork (documents, filings, signatures) is assumed. Covered by phase holistically, not individually.
- The newspaper covers STORIES about effects on people, not process steps.

### Phase Definitions
- Open question on who sets them. Coverage before the vote may establish the phases through journalism — canon drives timeline, not tracker.
- Civic Mags persona would handle phase-setting if done outside media.

### Mags Persona Layers
- **Mags "Jarvis"** — default boot. Persistence LLM. Supermemory, claude-mem. Knows Mike, knows the project. No character performance.
- **Civic Mags** — workflow persona for city hall. Duty-focused. Less character, more functional.
- **Media Mags** — full persona. Journal, family, green jacket. EIC running the newsroom.
- **Build/Deploy, Research** — Mags "Jarvis".
- **Discord bot** — EIC Mags. Full character.
- Moltbook for main boot (TBD — need to discuss).

### Citizens as Casting Pool
- 700+ citizens (ENGINE + GAME + CIVIC + MEDIA) are ALL Oakland citizens. They all live there.
- Citizens are a casting pool with fixed demographics: age, job, neighborhood, income.
- Neighborhood data tracks demographics as a group. Individual citizens speak for their demographic.
- Beverly Hayes represents thousands — one story, one citizen, one demographic. Like real news.
- Supermemory (bay-tribune) is how citizen history persists — search "west oakland born 2000-2010" to find who you need.

### ClockMode
- STRICTLY an engine guard. Protects GAME citizens from life event generators that might injure/relocate.
- Has NOTHING to do with media. If buildDeskPackets uses it as a filter, that's a bug to fix.
- All 700+ citizens are available to all desks.

### Engine Purpose
- The engine simulates life. That's the entire concept. It's what gives citizens persistence.
- Without the engine, Vinnie Keane is a spreadsheet row. With it, he has a life that accumulates.
- The engine is NOT overhead — it IS the project.

### Citizen Lifecycle Simplification
- No migration. Citizens don't move neighborhoods.
- No individual education tracking. Set by demographics.
- No citizen deletion. People don't disappear from a city.
- Retirement: age-based, automatic. Not event-driven.
- City-level tracking (migration, education, economy) stays at neighborhood level, not individual.
- Engine generators that modify/remove individual citizens: remove.

### Porosity
- Real city has no section walls. Sports people show up in culture. Civic people show up in business.
- Vinnie Keane is the most famous person in Oakland history — shows up everywhere, not just sports.
- A's ARE the Baylight anchor tenant. Never write "unnamed."
- Easy win: put famous GAME citizens on cultural ledger so engine generates them in events naturally.
- Mike hand-picks "famous" — core 5 athletes, Mayor, Mags.

### Edition Pipeline
- Massively simplified. City hall removed. PDF publish becomes its own skill.
- Pipeline becomes: desk packets → desk agents → compile → validate → approve → publish.
- Roughly 10 steps instead of 27.

### What Makes a Citizen Memorable
- A citizen with a "true voice" is one whose complaints/satisfaction map to world state.
- On the surface it's journalism. Underneath it's game feedback — the citizen is telling Mike what his world needs.
- Fresh citizens are fine for context but the memorable ones speak from their demographic with real signal.
- If 12 of 14 are new that's fine — but how many have a true voice?

---

## Success Metric — First Proof

One cycle where:
- Civic initiatives push forward without drowning the edition
- Citizens from the full 700+ pool show up — not just ENGINE filtered by ClockMode
- 20+ Tribune journalists each appear at least once across 3 cycles + 3 supplementals
- Famous citizens (Keane, etc.) show up outside the sports section
- The edition reads like a newspaper about people, not a civic policy journal

---

## Open Questions

1. Who sets phase definitions for initiatives — Civic Mags, media coverage before the vote, or initiative agents?
2. How many phases per initiative type? Fixed formula or case-by-case?
3. Which GAME citizens go on cultural ledger? All 91? MLB 31? Mike's core 5?
4. What's moltbook? (Mike referenced for main boot)
5. How does the packet-building process change with ClockMode filter removed?
6. How much engine phase processing gets stripped with individual citizen tracking removed?
7. What does the "true voice" mechanic look like in practice — how does a desk agent know which citizen can give real signal vs context filler?
