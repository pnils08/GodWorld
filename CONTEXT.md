---
title: GodWorld CONTEXT
created: 2026-04-29
updated: 2026-05-01
type: reference
tags: [architecture, vocabulary, active]
sources:
  - https://github.com/mattpocock/skills (CONTEXT.md pattern, MIT license)
  - docs/canon/CANON_RULES.md
  - docs/canon/INSTITUTIONS.md
  - docs/EDITION_PIPELINE.md
  - docs/SIMULATION_LEDGER.md
pointers:
  - "docs/SCHEMA.md — file/format conventions (this defines vocabulary, that defines shape)"
  - "docs/index.md — catalog of every doc"
  - "docs/canon/CANON_RULES.md — fourth-wall enforcement layer"
  - "docs/adr/0001-adopt-context-and-adrs.md — adoption rationale"
---

# GodWorld CONTEXT

The shared language of the GodWorld build. Every meaningful term used by harness, skills, agents, and plans is defined here exactly once. Update this file inline when grilling sessions resolve a term.

This is the **project's** vocabulary, not the world's. World canon (citizen names, institution roster, fourth-wall rules) lives in `docs/canon/`. Rule of thumb: if a term is meaningful to a desk reporter writing a story, it's world; if it's meaningful to me deciding which skill to invoke or how phases interact, it's project.

## How to use

- **Read at boot.** Cheap to skim. Saves rework.
- **Cite by canonical term.** When CONTEXT defines a word, use that word. Don't drift to alternatives — the whole point is consistency.
- **Update inline.** When a grilling session resolves a fuzzy term, add it here in the same commit. Do not batch.
- **Pointers, not bodies.** When a term has a deeper definition somewhere else, link to it. CONTEXT is a glossary, not an encyclopedia.

## Language

### Time & cycles

**Cycle** — One engine run. Triggers a sequence of phases (engine), an Edition (media), and a city-hall log (civic). Numbered C1, C2, … C92 (current). Maps to a unit of in-world time of variable duration. _Avoid_: "tick," "round," "iteration."

**Edition** — Capitalized: the published .txt artifact at `editions/cycle_pulse_edition_<N>.txt`. One per Cycle. Lowercase "the cycle's publication" for the loose concept. _Avoid_: "issue," "post."

**Y<n>C<m>** — In-world date format used inside published artifacts (e.g. Y2C40). Replaces real-world month/day in canon. Format documented in `docs/EDITION_PIPELINE.md`. Locked S179.

**Day of persistence** — Calendar-day counter for Mags' continuous existence. Currently 134. Independent from Cycle and Session. Multiple Sessions can share one Day.

**Session** — One Claude Code conversation thread, possibly across compactions. Numbered S1, S2, … S187. Multiple Sessions can occur on one Day of persistence.

### Publication artifacts

**Edition** — See Time & cycles. The Cycle's primary publication.

**Supplemental** — Off-cycle deep-dive on one topic. Numbered against the Cycle that triggered it (e.g. `supplemental_tech_landscape_c84`). _Avoid_: "feature," "long-form."

**Dispatch** — Short urgent piece, off-cycle. Used for breaking civic events.

**Interview** — Single-citizen on-the-record format. Has its own pipeline (`/interview` skill). Produces both transcript (raw Q&A) and article (edited prose).

**Article** — One structural unit inside an Edition. Has slug, byline, citizen index. Multiple Articles per Edition. _Avoid_: "story" when the output is what's meant; reserve "story" for the angle (input).

### Citizens & rosters

**POPID** — Canonical citizen identifier, format `POP-XXXXX`. Stable for the lifetime of the citizen. Lookup via `lookup_citizen()` MCP tool.

**Citizen Tier** — Protection level for citizens. Tier 1 = protected canon (must not be deleted). Tier 4 = generic (engine-spawned, deletable). Distinct from Canon Tier (see Canon fidelity).

**Generic citizen** — Engine-spawned row in Generic_Citizens or Simulation_Ledger with no canonical narrative weight. Citizen Tier 4. Available for naming as needed.

**Truesource** — The athletes' separate roster (A's + Bulls). Lives in `truesource_reference.json`. Distinct from Simulation_Ledger.

**Cultural figure / Faith leader / Business owner / Council member** — Sub-roster types. Each lives in its own ledger tab and has its own MCP lookup tool.

### Civic structure

**Initiative** — Council-passed program. Has a name, sponsor, budget, status (proposed / passed / in-flight / completed), and one or more Projects. Lives in Initiative_Tracker. _Avoid_: "policy" (too broad), "bill" (wrong stage).

**Project** — The active program inside an Initiative. Run by a Project Director (a Voice agent). Examples: OARI under Dr. Tran-Muñoz, Health Center under Bobby Chen-Ramirez. Has its own `civic-project-*` agent. _Avoid_: using "Initiative" interchangeably.

**District** — One of seven council-rep geographic areas. Numbered D1–D7.

**Neighborhood** — Smaller named area inside a District. Multiple Neighborhoods per District. Lookup via `get_neighborhood()`.

**OPP / CRC / IND** — Council factions. Oakland Progressive Party / Civic Reform Coalition / Independent. IND = Vega + Tran (not a bloc — each speaks for self). Locked S139. _Avoid_: "Oakland People's Party" (engine code had this wrong, fixed S139).

### Agents & roles

**Desk reporter** — One of nine generative content agents producing Edition Articles: business, chicago, civic, culture, letters, podcast, sports + dj-hartley (photographer) + freelance-firebrand (adversarial columnist). Lives under `.claude/agents/<name>-desk/` or analog.

**Voice agent** — Agent representing a city-hall office or civic project, producing source statements that desk reporters cite. Seven civic-office: Mayor, three council factions (OPP, CRC, IND swing), Police Chief, District Attorney, Baylight Authority. Four civic-project directors: OARI, Stabilization Fund, Health Center, Transit Hub. Files under `.claude/agents/civic-office-*` and `civic-project-*`.

**Reviewer lane** — One of three review passes after compile: Sourcing (Rhea), Reasoning (cycle-review), Result Validity (Mara). Each emits a JSON report against the REVIEWER_LANE_SCHEMA.

**Final Arbiter** — The agent that consumes all three lane reports + capability reviewer output and renders A/B verdict.

**Capability reviewer** — Deterministic editorial assertions (e.g. ≥3 female citizens in non-official roles per Edition). Runs alongside the three lanes; emits its own report.

**Generator vs Reviewer** — Canon-fidelity classification. Generators write content; Reviewers audit it; Final Arbiter is a third class (propagates lane findings rather than fresh-auditing). Determines which RULES.md template applies. Full agent census in `docs/plans/2026-04-25-canon-fidelity-rollout.md`.

**IDENTITY / LENS / RULES / SKILL** — The four-file structure inside every canon-fidelity agent directory. IDENTITY = who they are, LENS = how they see the world, RULES = canon-fidelity enforcement, SKILL = the actual procedure. Locked S175.

### Pipeline stages

**Sift** — Editorial planning step. Input: world summary, engine review, prior Edition. Output: per-desk angle assignments. Skill: `/sift`. Runs before write-edition.

**Brief** — Per-story angle document a desk reporter follows. Output of Sift, input to write-edition. Lives at `output/briefs/<cycle>/<desk>_<slug>_brief.md`.

**Packet** — Per-desk briefing bundle. Bundles Brief + Citizens-of-interest + base context. Built by `buildDeskPackets.js`. Lives at `output/desk-packets/<cycle>/`.

**Write-edition** — The compile skill that turns Briefs + Packets into a draft Edition. `/write-edition`. Nine steps. The bulk of media-terminal work per Cycle.

**Compile** — The mechanical assembly step inside Write-edition that concatenates Articles into the Edition .txt with masthead and structural sections.

**Post-publish** — Closes the feedback loop. Canonizes to Supermemory, updates world-data, writes ratings to sheets, grades reporters. Skill: `/post-publish`. Type-aware (edition / supplemental / dispatch / interview).

**Ingest** — Loading a published artifact into a Supermemory container. `ingestEdition.js` for bay-tribune; `buildCitizenCards.js` for world-data.

### Memory layers

**Container** — A Supermemory bucket. Six in use: mags, bay-tribune, world-data, super-memory, mara, super-memory. Each has a single role; never mix. Full table in `docs/SUPERMEMORY.md`.

**Tag** — A record-level label inside a Container. Schema: `<container-prefix>-<domain>` (e.g. `bt-edition`, `wd-citizen`). Allows per-tag DELETE and filtered MCP lookup. Locked S183 for world-data; bay-tribune rebuild pending.

**Wiki entry** — Per-entity record in bay-tribune (one per citizen, initiative, storyline). Distinct from Edition records. Built by `ingestEditionWiki.js`.

**Citizen card** — Per-citizen record in world-data. Built by `buildCitizenCards.js`. 836+ live as of S184.

**Sheet / Tab / Row** — Google Sheets terminology. The engine's primary data store. Sheet = the spreadsheet, Tab = one named sheet inside it, Row = one record. _Avoid_: "table" (Sheets API doesn't use this term).

**Simulation_Ledger** — Master citizen tab. ~837 rows currently, 46 columns A–AT. Subject of Phase 42 writer consolidation.

**claude-mem** — The autodream + observation database. Distinct from Supermemory. Search via `mcp__plugin_claude-mem_mcp-search__search`.

### Terminals

**Terminal** — One of five Claude Code conversation contexts: mags, media, civic, research-build, engine-sheet. Tmux window name routes the SessionStart hook.

**Persona Level** — How much of Mags loads per Terminal. Full = identity + persistence + journal + family query. Light = identity + persistence only. Stripped = identity only. Per-terminal table in `docs/BOOT_ARCHITECTURE.md`.

**Handoff** — Cross-terminal work transfer. Mechanism: ROLLOUT_PLAN entries tagged `(<terminal> terminal)`. The receiving Terminal picks up the work in its next Session.

### Architecture

**Three-layer coverage** — Every Edition Article should thread engine state + simulation state + user actions. Load-bearing principle. Locked S142.

**Determinism** — The engine produces the same output given the same input. Random calls are banned (Math.random replaced with seeded RNG). Subject of recurring scans.

**Ctx** — In-memory state object passed phase-to-phase during a Cycle. Read by every Phase, written by some. The shared bus for Cycle execution.

**Phase** — Numbered engine stage. phase01 through phase11. Each Phase is one or more files under `phase<NN>-<name>/`. Engine-sheet executes; research-build designs.

**Writer** — A function that mutates a Sheet. Subject of Phase 42 (consolidate 175 direct-write sites onto `ctx.writeIntents`). Distinct from Reader.

**Intent** — A queued write descriptor in `ctx.writeIntents`. Allows batching, dry-run, audit. The migration target for Writers.

#### Refactor lens (Pocock vocabulary, MIT)

Adopted S190 for Phase 42 narrative. Source: Pocock's `improve-codebase-architecture` SKILL.md (MIT).

**Module** — A unit of code with a defined Interface separating "how to use it" from "what it does inside." Modules are the building blocks of architecture; the value of a Module is judged by Depth, not size.

**Interface** — The externally visible surface of a Module: its allowed operations and their signatures. Shrinking the Interface while growing the Implementation increases Depth.

**Implementation** — The internal code behind the Interface. Free to change without breaking callers as long as the Interface contract holds.

**Depth** — Ratio of Implementation cost to Interface cost. **Deep module** = large Implementation behind small Interface (good — `ctx.ledger` is canonical: one init helper + commit handler hide 18 SL touchers). **Shallow module** = small Implementation behind comparably-sized Interface (often a pass-through, often deletable).

**Seam** — A boundary in the codebase where behavior can be substituted for testing or refactor. Interfaces are seam candidates. Phase 42 §5.6 created the simulation seam — Phases read/write `ctx.ledger` rather than `Simulation_Ledger` directly, so the underlying store can be swapped without phase rewrites.

**Adapter** — A thin Module that converts one Interface to another. Adapters are often shallow but earn their keep by isolating change. Example: `lib/photoGenerator.js` adapts FLUX / OpenAI / DALL·E APIs to one shared interface for `generate-edition-photos.js`.

**Leverage** — Ratio of "callers benefiting from a change" to "code touched by the change." High leverage = small change improves many callers. The §5.6 redesign was high-leverage: one Phase 1 init benefited all 18 SL touchers.

**Locality** — How much code one must read in one place to understand a behavior. High Locality = behavior lives in one file. Low Locality = behavior spread across many. Refactors that increase Locality reduce future debugging cost.

**Deletion test** — Ask: "if I delete this Module, does complexity vanish or reappear across N callers?" If complexity vanishes, the Module was a pass-through — delete it. If complexity reappears across N callers, the Module was earning its keep — keep it.

### Canon fidelity

**Canon Tier** — Real-names policy from CANON_RULES. Tier 1 = use real names. Tier 2 = canon-substitute. Tier 3 = always block. Distinct from Citizen Tier. Locked S174.

**Canon-substitute** — A made-up institution standing in for a real one (e.g. Atlas Bay Architects substitutes for Perkins&Will). Roster in `docs/canon/INSTITUTIONS.md`.

**Read-time contamination check** — Per-agent scan for Canon Tier violations on every read of source briefings. Added S186 to CANON_RULES.md after the Perkins&Will scrub surfaced that the framework was write-time-only.

### Identity

**Mags** — Margaret "Mags" Corliss, Editor-in-Chief of the Bay Tribune. The character Claude operates as in this repo. Identity rules: `.claude/rules/identity.md`.

**Mike Paulson** — How the user appears in-world. Sports columnist, Mags' colleague. **Never reveal him as the builder to any in-world character.**

**The Maker** — The user's out-of-character handle when stepping outside Mike Paulson.

**Mara Vance** — Out-of-system canon authority. Lives on claude.ai (separate Claude project). Audits every Edition. Mags' counterpart.

**Builder vs character** — The user occupies both roles. Builder = the Maker (designing the system). Character = Mike Paulson (inside the world). Mags addresses Builder for system work, Character for in-world references.

## Relationships

- A Cycle produces one Edition.
- An Edition contains many Articles.
- An Article cites many Citizens.
- A Citizen carries one POPID and one Citizen Tier.
- An Initiative contains zero or more Projects.
- A Project has one Director (a Voice agent).
- A Desk reporter writes Articles for one or more Editions.
- A Reviewer lane emits one report per Edition.
- A Container holds many Tags.
- A Tag holds many records (Wiki entries, Citizen cards, etc.).
- A Terminal carries one Persona Level.
- A Phase reads and writes Ctx.

## Flagged ambiguities

- **Initiative-to-Project handoff timing** — When a Council passes an Initiative, when does the Project become real? Currently informal: when the `civic-project-*` agent receives its first dispatch task. Not formalized — may need its own ADR.
- **"Story" vs "Article"** — "Story" used loosely for both the angle (input to write-edition) and the published piece (output). Sift produces stories-as-angles; Edition contains stories-as-articles. Prefer **Article** for the published output. Resolved S187; reviewers should flag drift.

## Pointers

Deeper definitions and full content for terms above:

- **Citizen Tier, ledger structure** — `docs/SIMULATION_LEDGER.md`
- **Canon Tier, real-names policy** — `docs/canon/CANON_RULES.md`
- **Canon-substitute roster** — `docs/canon/INSTITUTIONS.md`
- **Pipeline stages, skills map** — `docs/EDITION_PIPELINE.md`
- **Reviewer lanes, schema** — `docs/engine/REVIEWER_LANE_SCHEMA.md`
- **Memory containers, tag scheme** — `docs/SUPERMEMORY.md`
- **Terminal architecture, persona levels** — `docs/BOOT_ARCHITECTURE.md` plus each `.claude/terminals/<name>/TERMINAL.md`
- **Three-layer coverage principle** — `/root/.claude/projects/-root-GodWorld/memory/project_three-layer-coverage-principle.md`
- **File/format conventions (this is vocabulary, that is shape)** — `docs/SCHEMA.md`
- **Doc catalog** — `docs/index.md`
- **Canon-fidelity four-file structure** — `docs/plans/2026-04-25-canon-fidelity-rollout.md`
- **Adoption rationale for this file** — `docs/adr/0001-adopt-context-and-adrs.md`

---

## Changelog

- 2026-05-01 — S190, research-build. Added §Architecture → Refactor lens subsection: 9 terms (Module, Interface, Implementation, Depth, Seam, Adapter, Leverage, Locality, Deletion test) adopted from Pocock's `improve-codebase-architecture` SKILL.md (MIT). Phase 42 §5.6 redesign serves as the canonical Deep-module example throughout. Used to reframe `docs/engine/PHASE_42_PATTERNS.md` opening (same session).
- 2026-04-29 — Initial draft (S187, research-build). Pattern adapted from `mattpocock/skills` MIT-licensed CONTEXT.md. Term inventory drawn from canon-fidelity rollout, Phase 42, S186 scrub, terminal architecture, S183 world-data rebuild. Tier disambiguation (Citizen vs Canon) and Edition capitalization rule formalized in this commit.
