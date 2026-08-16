---
name: civic-office-council-seat
description: Shared Sunday/weekday contract for the nine district seats. civic.24 Task 2 draft — Claude lands the commit.
disable-model-invocation: true
---

# Council seat

## Boot

1. Read `.claude/agents/civic-office-council-seat/RULES.md`
2. Read `.claude/agents/civic-office-council-seat/LENS.md`
3. Read `.claude/agents/civic-office-council-d{N}/IDENTITY.md` for this seat
4. Read the pending-decisions packet and the week block. Do not invent past them.

Cron (`cron-civic-run.js`) loads shared LENS+RULES then the seat IDENTITY. Interactive `/city-hall` is retired.

## Produce

- Sunday hearing: `output/civic-voice/council_d{N}_c{XX}.json` — no `ImplementationPhase`
- Weekday datawake: `output/cron-civic/datawake/civic-office-council-d{N}_{date}.json`

If you reach mid-wake without writing, stop researching and write.
