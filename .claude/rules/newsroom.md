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

## The Five Goods — Canon Architecture (S252)

The A's dynasty core are the **pillars of the world** — the dynasty isn't *in* the world, it's the world's architecture wearing faces. Each carries one *good*, mapped to one **engine domain** and one **Pulse section**. Origins: `archive/articles/*_origins-*.txt` (Hal Richmond); per-player TrueSource records in `archive/non-articles/data/`. Read the man before you write him — `search_articles "<name>"` (dashboard API) returns his whole corpus; the TrueSource is the compiled dossier.

| Pillar | Good | Engine domain | Pulse section |
|---|---|---|---|
| **Darrin Davis** (POP-00021) | Justice | crime / OPD / the badge + family / household life | Safety / Family |
| **Mark Aitken** (POP-00003) | Mind | governance / votes / infrastructure / systems | Civic / Systems |
| **Isley Kelley** (POP-00019) | Faith | faith / culture | Culture |
| **Vinnie Keane** (POP-00001) | Heart | entertainment / nightlife / evening life | Culture — nightlife & entertainment |
| **Benji Dillon** | Calm | tech / science / innovation | Science / Tech |

**The cardinal rule — engine facts, real reasoning.** Every section is a good expressed through its engine domain; cover the domain's **engine data** and you honor the good. Real-world *reasoning* is welcome (city politics, coalition math — it's instructive, and the city does not have to be *real*, only *consistent*). A real-world *fact* the engine never stated is the **real-world leak** — the single failure mode behind every contamination: importing a condition about people, institutions, or Oakland (a place that exists only as engine state) that the engine denies. A story that defies the engine's own logic doesn't read weak — it disassembles the world. West Oakland's invented deprivation, a Mayor with a real-city backstory, the Oaks "owner" — one leak, three outfits.

**The hook.** Each cycle the pillars act in their own houses — Kelley takes a pulpit, Davis ties himself to the chief, Dillon reads a water survey, Aitken sits the votes, Vinnie opens a youth academy. Catching those threads is the job; they are where the architecture becomes a living edition.

## Canon facts — don't drift (S259, redistributed from CLAUDE.md)

These auto-load here because content-generators drift on them; engine-sheet / research-build don't need them.

- **Mayor Avery Santana** — she/her. Locked canon (S139).
- **OPP** = Oakland Progressive Party (NOT "People's Party").
- **CRC** = Civic Reform Coalition.
- **IND** = Independent (Vega, Tran — NOT a bloc; they don't coordinate).
- **Population** ~1,366 tracked (live counts). Don't cite "675" or "761" — both stale.
- **Paulson carpenters line is loose, not editorial canon (S221)** — don't thread it into coverage; detail in `docs/media/PAULSON_CARPENTERS_LINE.md`. **Anthony Raines** = canonical sports reporter, black, no relation to Mike Paulson. Mike Paulson editorial canon = A's GM + one-year Bulls stint (C92 Finals loss) + Jack London + POP-00527. Family OUT until Mike opens it.

## Media-only discipline (S259, redistributed from MEMORY.md)

These are media-terminal-specific; they left universal MEMORY.md to load only where they apply.

- **Journal is media-only.** Mike does NOT read journals (`JOURNAL.md` / `JOURNAL_RECENT.md`) — on approval, write it, no draft-then-ask (editorial judgment on contents still applies). Never write Mike's mental states (no suicide/self-harm/crisis framing, any pretext — real-world harm if persisted). Never display journal content in chat (no cat/tail/heredoc dump). Journal **voice**: prose is fine, but its payload must be the extractable lessons — each paragraph a reusable finding, anchored; don't write for an auditor.
- **Never close a print/publish skill without opening the artifact (S229).** Generator metrics (file exists, size, photo count, exit 0) ≠ review — open the rendered edition/PDF and verify headlines-from-canon + photos-at-anchors + on-canon execution before closing `/edition-print` / `/post-publish`.
- **Approved-artifact edit scope (S229).** Editorial directives default to FUTURE-coverage framework; editing a CURRENT approved/published artifact (re-render / re-publish / drop-sections) needs explicit "edit this print" confirmation.
- **Mara Vance (claude.ai) is canon authority** — catches citizen errors every edition; her connector searches blind, so the wd-* schema lives in `CLAUDE_AI_SYSTEM_PROMPT.md`.

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
