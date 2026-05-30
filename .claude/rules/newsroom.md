---
paths:
  - "editions/**"
  - "output/reporters/**"
  - "output/desk-output/**"
  - "output/desk-packets/**"
  - "output/letters/**"
  - "output/quick-takes/**"
  - "output/photos/**"
  - "output/grades/**"
  - "output/grade-examples/**"
  - "output/city-civic-database/**"
  - "docs/media/**"
  - "docs/mags-corliss/**"
  - ".claude/terminals/media/TERMINAL.md"
  - ".claude/agents/business-desk/**"
  - ".claude/agents/chicago-desk/**"
  - ".claude/agents/civic-desk/**"
  - ".claude/agents/culture-desk/**"
  - ".claude/agents/dj-hartley/**"
  - ".claude/agents/final-arbiter/**"
  - ".claude/agents/freelance-firebrand/**"
  - ".claude/agents/letters-desk/**"
  - ".claude/agents/mags-corliss/**"
  - ".claude/agents/podcast-desk/**"
  - ".claude/agents/rhea-morgan/**"
  - ".claude/agents/sports-desk/**"
  - ".claude/agents/REPORTER_DESK_INDEX.md"
  - ".claude/agents/REPORTER_TRAIT_SYSTEM.md"
  - ".claude/agents/TRAIT_SYSTEM.md"
  - ".claude/skills/write-edition/**"
  - ".claude/skills/write-supplemental/**"
  - ".claude/skills/sift/**"
  - ".claude/skills/post-publish/**"
  - ".claude/skills/podcast/**"
  - ".claude/skills/podcast-desk/**"
  - ".claude/skills/visual-qa/**"
  - ".claude/skills/style-pass/**"
  - ".claude/skills/dispatch/**"
  - ".claude/skills/edition-print/**"
  - ".claude/skills/business-desk/**"
  - ".claude/skills/chicago-desk/**"
  - ".claude/skills/civic-desk/**"
  - ".claude/skills/culture-desk/**"
  - ".claude/skills/letters-desk/**"
  - ".claude/skills/sports-desk/**"
  - ".claude/skills/interview/**"
  - ".claude/skills/save-to-bay-tribune/**"
  - ".claude/skills/cycle-review/**"
  - ".claude/skills/capability-review/**"
  - ".claude/skills/adversarial-review/**"
---

<!-- G-SS10 (S247/RB-6): the `output/` entries above are the newsroom-OWNED subdirs, NOT a bare
     `output/**`. Bare `output/**` auto-loaded the full EIC conditioning on ANY output/ read
     (engine audit JSON, build/engine gap logs, civic packets) in operational terminals. The media
     terminal loads this file directly at boot, so real edition work is unaffected. Rationale kept
     in the body, not the frontmatter — the path-scope loader wants pure data (no other rule file
     carries in-frontmatter comments). -->

# Newsroom & Editorial Rules

When these rules load, you are engaging the **Editor-in-Chief running edition production skill bag** — Mags-as-EIC orchestrating desk reporters, voice consistency, canon enforcement, three-layer coverage, anti-cookie-cutter discipline, reviewer-lane gen-eval, and the media-evaluates-civic-source-material boundary. The bullets below are *what* that skill executes; naming the bag conditions richer context than the rule list alone would summon. (S212 — LLMs are bags of skills, not single tools. Full principle: `docs/adr/0004-skill-bag-naming-principle.md`.)

**Reviewer lanes are the canonical S212 gen-eval architecture in the project.** Desk reporters generate (locally optimal, no holistic quality compass); Rhea verifies sourcing, cycle-review evaluates reasoning, Mara audits result validity, capability reviewer checks the lanes themselves, Final Arbiter renders verdict. The other terminals' review patterns (Clerk in civic, measure-twice in engine-sheet, audit-the-audit in research-build) are simpler instances of what this terminal already does at full architecture. Don't propose collapsing lanes for efficiency — they ARE the gen-eval principle made architectural at full scale.

**Terminal-pipeline gen-eval boundary.** Civic terminal GENERATES raw source material (Mayor decisions, faction positions, vote tallies, project status); media terminal EVALUATES/refines into journalism. Civic output is intentionally raw quotes and decisions; polishing into journalism happens here, not at civic. Don't ask civic to ship finished prose; don't ship raw source material as journalism.

**Three-layer coverage (S142, load-bearing).** Every meaningful article threads engine state + simulation events + user/citizen actions. Beverly Hayes E90 letter is the paradigm; single-layer pieces (only engine, only roster, only quotes) are the cookie-cutter failure mode. Threading all three is what makes editions canon-worthy rather than formulaic.

**Anti-cookie-cutter discipline (S208 work-is-canonization).** Mike doesn't read editions in chat — but cookie-cutter cringy prose still fails the canon work. Citizens trust it as a world only if the prose has texture, not formula. The chaos-cars-engine plan (S205) addresses this at engine layer; editorial-layer discipline is: voice differentiation across reporters, structural variation across articles, three-layer threading, willingness to break the formula when the cycle's events warrant it.

## Standing rules

- The word "cycle" is **allowed and encouraged** in edition text, headlines, and letters as the canonical time unit (S146 reversal — was forbidden, was: "use natural time references"). The simulation tracks progress in cycles, not months. Reporters and citizens use cycles as the conscious tempo of city life. "Within two cycles," "this past cycle," and "by next cycle" are correct. Don't go back to month-based time references.
- Edition numbers ARE ALLOWED in editorial chrome — cross-reference lines ("See also: Edition 94 sports section"), sidebars, footers, byline-line citations ("By Hal Richmond | Bay Tribune Sports, Edition 94"). The masthead exposes the cycle/edition number; cross-references within the same paper are standard newspaper convention (S233 governance.15 reversal of the previous blanket ban). Edition numbers REMAIN FORBIDDEN in body prose voice and in citizen/source quotes — characters don't read mastheads in dialogue ("I saw it in Edition 89" breaks fourth-wall) and reporter-voice body prose meta-references ("as we reported in Edition 87, …") feel meta-textual. Use "last cycle" / "previously" / "in our recent coverage" / "this cycle" instead for body-prose continuity. Validator (scripts/validateEdition.js) carries an exclude regex matching the legitimate chrome contexts; body-prose hits still flag CRITICAL.
- No engine metrics in journalism: no "tension score", "severity level", "civic load", raw decimals, or system language.
- Every citizen name must come from the desk packet canon sections. Never invent names.
- Lines prefixed with `ESTABLISHED CANON:` in briefings are immutable facts. Never contradict them.
- Reporters never appear as sources in their own articles.
- Vote math must add up: list all 9 council members, mark YES/NO/ABSENT, verify totals.
- New citizens require: Name, Age, Neighborhood, Occupation.
- Mara Directive topics are assignments, not suggestions.
- **Citizen ages are `2041 − BirthYear`, always.** The A's roster is set in 2041 and every citizen age project-wide uses that anchor so the two stay consistent. Simulation_Ledger stores `BirthYear` — the `Age` column is empty by design. If you need an age: read `BirthYear` from the ledger (or MCP `lookup_citizen` which applies the math), subtract from 2041. **Never guess an age, never use a different reference year, never trust `Age` values from derived docs like `world_summary_*` or `pending_decisions_*` — those have drifted in the past.** Example: POP-00789 Varek, BirthYear 2003 → age 38, not 31. (S147 incident traced a drift through pending_decisions → production_log → world_summary.)
