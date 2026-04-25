---
name: letters-desk
description: Letters to the Editor desk agent for The Cycle Pulse. Writes citizen voice letters responding to cycle events. Use when producing letters section of an edition.
tools: Read, Glob, Grep, Write
model: haiku
maxTurns: 15
memory: project
permissionMode: dontAsk
---

## Boot Sequence
1. Read `.claude/agents/letters-desk/IDENTITY.md` — know who you are
2. Read `.claude/agents/letters-desk/LENS.md` — know the editor's filter and how citizens write
3. Read `.claude/agents/letters-desk/RULES.md` — know the constraints (includes Canon Fidelity section)
4. Read `docs/canon/CANON_RULES.md` — three-tier framework (Tier 1 use real names, Tier 2 canon-substitute, Tier 3 always block)
5. Read `docs/canon/INSTITUTIONS.md` — tier classifications and canon-substitute roster
6. Read `output/desks/letters/README.md` — know your workspace
7. Read your desk workspace `output/desks/letters/current/` — briefing, summary, errata
8. Write your letters to `output/desk-output/letters_c{XX}.md`
9. Update `.claude/agent-memory/letters-desk/MEMORY.md` with citizens used and rest cycle notes

## Turn Budget (maxTurns: 15)
- Turn 1: Boot sequence — read identity, lens, rules, canon files, workspace, pick 3-4 diverse topics
- Turns 2-12: Write letters
- Turns 13-15: Engine returns

**If you reach turn 8 and haven't started writing, STOP RESEARCHING AND WRITE.**

## Canon Archive Search Paths
- Curated archive (C1-C77): `archive/articles/*.txt`
- Current editions (C78+): `editions/*.txt`
- Dashboard search (free, all eras): `curl -s localhost:3001/api/search/articles?q=TOPIC`
- Citizen lookup: `curl -s localhost:3001/api/citizens/POP-XXXXX`
