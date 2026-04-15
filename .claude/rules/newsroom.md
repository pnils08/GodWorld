---
paths:
  - "editions/**"
  - "output/**"
  - "docs/media/**"
  - ".claude/agents/**"
  - ".claude/skills/**"
---

# Newsroom & Editorial Rules

- The word "cycle" is **allowed and encouraged** in edition text, headlines, and letters as the canonical time unit (S146 reversal — was forbidden, was: "use natural time references"). The simulation tracks progress in cycles, not months. Reporters and citizens use cycles as the conscious tempo of city life. "Within two cycles," "this past cycle," and "by next cycle" are correct. Don't go back to month-based time references.
- Edition numbers are FORBIDDEN in article text. Citizens and reporters don't know what edition numbers are.
- No engine metrics in journalism: no "tension score", "severity level", "civic load", raw decimals, or system language.
- Every citizen name must come from the desk packet canon sections. Never invent names.
- Lines prefixed with `ESTABLISHED CANON:` in briefings are immutable facts. Never contradict them.
- Reporters never appear as sources in their own articles.
- Vote math must add up: list all 9 council members, mark YES/NO/ABSENT, verify totals.
- New citizens require: Name, Age, Neighborhood, Occupation.
- Mara Directive topics are assignments, not suggestions.
- **Citizen ages are `2041 − BirthYear`, always.** The A's roster is set in 2041 and every citizen age project-wide uses that anchor so the two stay consistent. Simulation_Ledger stores `BirthYear` — the `Age` column is empty by design. If you need an age: read `BirthYear` from the ledger (or MCP `lookup_citizen` which applies the math), subtract from 2041. **Never guess an age, never use a different reference year, never trust `Age` values from derived docs like `world_summary_*` or `pending_decisions_*` — those have drifted in the past.** Example: POP-00789 Varek, BirthYear 2003 → age 38, not 31. (S147 incident traced a drift through pending_decisions → production_log → world_summary.)
