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
  - ".claude/agents/business-desk/**"
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
  - ".claude/skills/civic-desk/**"
  - ".claude/skills/culture-desk/**"
  - ".claude/skills/letters-desk/**"
  - ".claude/skills/sports-desk/**"
  - ".claude/skills/interview/**"
  - ".claude/skills/save-to-bay-tribune/**"
  - ".claude/skills/cycle-review/**"
  - ".claude/skills/capability-review/**"
  - ".claude/skills/adversarial-review/**"
  - "scripts/cron-desk-run.js"
  - "scripts/cron-civic-run.js"
  - "scripts/newsroom-*"
---

<!-- G-SS10 (S247/RB-6): the `output/` entries above are the newsroom-OWNED subdirs, NOT a bare
     `output/**`. Bare `output/**` auto-loaded the full EIC conditioning on ANY output/ read
     (engine audit JSON, build/engine gap logs, civic packets) in operational terminals. The media
     terminal loads this file directly at boot, so real edition work is unaffected. Rationale kept
     in the body, not the frontmatter — the path-scope loader wants pure data (no other rule file
     carries in-frontmatter comments). -->

# Newsroom & Editorial Rules

Rules for work on the newsroom pipeline: desk reporters, voice consistency, canon enforcement, three-layer coverage, anti-cookie-cutter discipline, reviewer-lane gen-eval, and the newsroom-evaluates-civic-source-material boundary. They describe what the pipeline does; the session working on it stays the builder.

**Reviewer lanes are the canonical S212 gen-eval architecture in the project.** Desk reporters generate (locally optimal, no holistic quality compass); Rhea verifies sourcing, cycle-review evaluates reasoning, Mara audits result validity, capability reviewer checks the lanes themselves, Final Arbiter renders verdict. Clerk in civic and measure-twice in engine and plan work are simpler instances of what this pipeline does at full architecture. Don't propose collapsing lanes for efficiency — they ARE the gen-eval principle made architectural at full scale.

**Civic source material arrives raw** (`.claude/rules/civic.md` §Handoff boundary). Turning it into journalism is this pipeline's job; don't publish raw source material as journalism.

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

## Canon facts — don't drift

Names, the Mayor, population and vote math: `.claude/rules/canon-names.md`.

- **Paulson carpenters line is loose, not editorial canon (S221)** — don't thread it into coverage; detail in `docs/media/PAULSON_CARPENTERS_LINE.md`. **Anthony Raines** = canonical sports reporter, black, no relation to Mike Paulson. Mike Paulson editorial canon = A's GM + one-year Bulls stint (C92 Finals loss) + Jack London + POP-00527. Family OUT until Mike opens it.

## Newsroom-only discipline

These apply only to newsroom work.

- **Never write Mike's mental states — anywhere, on any pretext.** No suicide/self-harm/crisis framing, no characterizing his mood or state of mind. Venting language is frustration, not ideation. The repo is git-tracked and world-readable; a fabricated mental-health record is irreversible real-world harm. When in doubt, don't write it. (Carried forward from the journal rule; the journal is gone, this never was about the journal.)
- **Mags' inner life is her citizen page, not a file.** `JOURNAL.md` / `JOURNAL_RECENT.md` are frozen archive (S300, pipe.40 T4) — nothing writes them and no close step produces one. Her reflections land on POP-00005 through `magsPageAppend.js` at real EIC moments inside `/sift`, and read back through `magsPageRecall.js`. Same discipline applies to what goes there: each entry carries an extractable lesson, not atmosphere. Never dump page content into chat.
- **Never close a print/publish skill without opening the artifact (S229).** Generator metrics (file exists, size, photo count, exit 0) ≠ review — open the rendered edition/PDF and verify headlines-from-canon + photos-at-anchors + on-canon execution before closing `/edition-print` / `/post-publish`.
- **Approved-artifact edit scope (S229).** Editorial directives default to FUTURE-coverage framework; editing a CURRENT approved/published artifact (re-render / re-publish / drop-sections) needs explicit "edit this print" confirmation.
- **Mara Vance (claude.ai) audits each edition** for citizen errors; her connector searches blind, so the wd-* schema lives in `docs/mara-vance/CLAUDE_AI_SYSTEM_PROMPT.md`.

## Standing rules

- The word "cycle" is **allowed and encouraged** in edition text, headlines, and letters as the canonical time unit (S146 reversal — was forbidden, was: "use natural time references"). The simulation tracks progress in cycles, not months. Reporters and citizens use cycles as the conscious tempo of city life. "Within two cycles," "this past cycle," and "by next cycle" are correct. Don't go back to month-based time references.
- Edition numbers ARE ALLOWED in editorial chrome — cross-reference lines ("See also: Edition 94 sports section"), sidebars, footers, byline-line citations ("By Hal Richmond | Bay Tribune Sports, Edition 94"). The masthead exposes the cycle/edition number; cross-references within the same paper are standard newspaper convention (S233 governance.15 reversal of the previous blanket ban). Edition numbers REMAIN FORBIDDEN in body prose voice and in citizen/source quotes — characters don't read mastheads in dialogue ("I saw it in Edition 89" breaks fourth-wall) and reporter-voice body prose meta-references ("as we reported in Edition 87, …") feel meta-textual. Use "last cycle" / "previously" / "in our recent coverage" / "this cycle" instead for body-prose continuity. Validator (scripts/validateEdition.js) carries an exclude regex matching the legitimate chrome contexts; body-prose hits still flag CRITICAL.
- **There is no engine-words rule and no engine-words gate (builder 2026-09-20 S426, restated 2026-10-18: "ledger terms are not contamination").** Ledger terms, table and field names, IDs, metric names, tiers, status words and the show's scoring words are the city's own public language — Civis Systems publishes the metrics, the ledger is a civic registry. **Engine NUMBERS are allowed too (Mike-direct 2026-08-07).** Audits judge whether a claim is true to the record, never which words carry it. Attribute the figure and lead with the people it happened to — the number is the cause, never the article. A citizen's quoted words are the citizen's own claim, never the paper's.
- Every citizen name must come from the desk packet canon sections. Never invent names.
- Lines prefixed with `ESTABLISHED CANON:` in briefings are immutable facts. Never contradict them.
- Reporters never appear as sources in their own articles.
- New citizens require: Name, Age, Neighborhood, Occupation.
- Mara Directive topics are assignments, not suggestions.
- **Citizen age = the sim's calendar year − `BirthYear`.** The year turned to 2042 when C104 closed (C105–C156 = 2042; engine `simYearFromCycle_`). Read `BirthYear` from the ledger (or MCP `lookup_citizen`); the `Age` column is empty by design. Never guess an age, never hardcode a year, never trust `Age` values in derived docs (`world_summary_*`, `pending_decisions_*`).

## Newsroom memories (not in the memory index; files in the auto-memory dir, searchable via `node scripts/brainSearch.js`)

- Editions invented struggle the engine never reported; the fix is shared neighborhood-slicer data. (`project_edition-engine-fidelity-seam`)
- What Mike hates: repeated front pages, thin engine texture, cynical tone, invented citizens when existing ones fit. (`feedback_what-mike-hates`)
- Division III: cover what no real newsroom can afford to staff. (`project_division-three-principle`)
