---
title: "ADR-0005: ROLLOUT_PLAN structure — semantic groups + pointer-only entries + per-terminal filing protocol"
created: 2026-05-10
updated: 2026-05-10
type: reference
tags: [architecture, infrastructure, decision, active]
sources:
  - S212 grilling session (Mike + Mags) — "this should be your rollout plan with project assigned to phases that aren't just numbers"
  - "[[adr/0001-adopt-context-and-adrs]] — ADR pattern + bar-keeping discipline"
  - "[[adr/0004-skill-bag-naming-principle]] — discovery-wiring pattern this ADR follows"
  - "[[../../MEMORY.md]] — S147 'rollout uses pointers, not inline notes' rule (long-violated)"
  - "[[../plans/TEMPLATE]] — canonical shape for new plan files created via ROLLOUT pointers (S152, obra/superpowers MIT)"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — the document this ADR restructures"
  - "[[../engine/ROLLOUT_ARCHIVE]] — cold storage destination at session-end sweep"
  - "[[../plans/TEMPLATE]] — copy this when a ROLLOUT pointer references a not-yet-existing plan"
  - "[[../../.claude/terminals/research-build/TERMINAL]] — research-build owns ROLLOUT_PLAN"
  - "[[index]] — ADR registered same commit"
---

# ADR-0005: ROLLOUT_PLAN structure — semantic groups + pointer-only entries + per-terminal filing protocol

**Status:** Accepted
**Date:** 2026-05-10 (S212)
**Deciders:** Mike (the Maker) + Mags

## Context

`docs/engine/ROLLOUT_PLAN.md` is canonical for project work (S207 enforcement after the SESSION_CONTEXT trim landed). But the doc has drifted across ~50 sessions of accumulation:

- **Numbered phases (33, 38, 39, 40, 41, 42) carry no semantic meaning to a reader.** Future-instance has to grep into plan files or archive entries to figure out what "Phase 38" was about. The numbers were sequential by introduction date, not by type-of-work.
- **Entry descriptions are inline narrative.** Many entries are 1-3KB of context, reasoning, history, sub-states embedded in the ROLLOUT row itself. S147 (MEMORY.md, 2026-04-15) explicitly says "rollout uses pointers, not inline notes — every rollout item is a pointer (file path, supermemory tag, claude-mem ID, PHASE_X_PLAN). No inline research, no pattern exposition. Forces every session to read real context before acting." Rule has been consistently violated.
- **Total inline narrative weight: ~50KB across ~30 open items.** ROLLOUT is the heaviest non-MEMORY doc in the boot-relevant surface.
- **No protocol for HOW work gets added by each terminal.** New work files the way each session feels right — sometimes pointer, sometimes essay, sometimes inline-with-history. The drift is a meta-issue: without filing protocol, every session adds work in its own shape, and the doc becomes a dump-everything log instead of a state index.
- **No templates.** "What does a new ROLLOUT row look like?" has no canonical answer.
- **Move-to-archive cadence is implicit.** S204 introduced `done-pending-archive` state; sweep to `ROLLOUT_ARCHIVE.md` happens at session-end but the protocol isn't codified — entries linger.

The drift compounds. Every session that adds inline narrative makes the doc heavier; every session that doesn't sweep done items makes it longer. Without protocol enforcement, "should be a pointer" stays aspirational.

S212 grilling (Mike): *"This should be your rollout plan with project assigned to 'phases' that aren't just numbers but more representative of the type of work it is, the project is given a phase number within that group or new group if needed, but the actual description of this work realistically lives elsewhere, for example the gap-logs, research.md, or just plan MDs for issues."*

The framing makes the scope broader than ROLLOUT cleanup: this is establishing the filing protocol that **self-regulates MDs going forward**. Templates + per-terminal pointers + close-to-cold-storage flow means new work files cleanly without each session having to relearn the convention.

## Decision

Three-part restructure.

### Part 1: Semantic groups replace numbered phases

Seven type-of-work groups. Each entry coded as `<group>.<n>`:

| Group | Scope | Typical pointer destinations |
|-------|-------|------------------------------|
| **pipeline** | Edition production end-to-end (sift / write-edition / post-publish / dispatch / interview / supplemental / print / photos) | `[[plans/...]]`, `[[output/production_log_..._gaps]]`, `[[media/...]]` |
| **engine** | Engine code, ledger, schema, tech debt, engine-sheet repair | `[[plans/...]]`, `[[engine/PHASE_42_PATTERNS]]`, `[[engine/ENGINE_REPAIR]]` rows |
| **canon** | World-fidelity layer, citizens, voices, real-name blocklists, contamination scrub | `[[canon/CANON_RULES]]`, `[[canon/INSTITUTIONS]]`, `[[POST_MORTEM_C92_CONTAMINATION]]` |
| **civic** | City-hall, voice agents, council canon, civic-process gap-logs, governance simulation | `[[plans/...]]`, `[[output/production_log_city_hall_..._gaps]]`, `[[mara-vance/...]]` |
| **infrastructure** | Supermemory, Discord, dashboard, MCP, claude-mem, services, ingest pipelines | `[[STACK]]`, `[[SUPERMEMORY]]`, `[[plans/...]]` |
| **research** | Papers, external tools, evaluations, watch-list items | `[[RESEARCH]] §section`, `[[research/...]]`, `[[mags-corliss/TECH_READING_ARCHIVE]] §S<N>` |
| **governance** | Skills, MDs, ADRs, MEMORY rules, doc-audit, project-internal hygiene | `[[adr/...]]`, `[[plans/...]]`, `[[../../.claude/skills/...]]` |

Numbers within group are **not strictly sequential** — they're identifiers. New work picks the next available number; deletions don't renumber. `pipeline.7` doesn't imply pipeline.1-6 are blocking pipeline.7.

Cross-cutting work picks the **primary group**. A Phase 42 item that touches engine + pipeline files under `engine.N` (the work happens in engine code; the pipeline is downstream consumer). Multi-tagging is not supported — primary group only.

### Part 2: Entry format — pointer-only, one row

Replace inline narrative with table rows:

```
| # | Item | State | Terminal | Pointer |
|---|------|-------|-------|---------|
| pipeline.1 | C93 sift gap log triage | needs-info | media | [[output/production_log_edition_c93_sift_gaps]] |
| engine.1 | Phase 42 §5.6 ctx.ledger redesign | in-progress | engine-sheet | [[plans/2026-04-28-phase-42-writer-consolidation]] |
| canon.1 | Bay-tribune unified ingest rebuild | blocked | research-build/engine-sheet | [[plans/2026-04-30-bay-tribune-unified-ingest-rebuild]] |
```

Five columns:
- **#** — `<group>.<n>` code
- **Item** — title, ≤80 chars, clearly identifies the work
- **State** — per Convention §State labels (S204): `ready` / `needs-info` / `in-progress` / `blocked` / `done-pending-archive` / `wontfix`
- **Terminal** — which terminal picks up: `engine-sheet` / `civic` / `media` / `research-build`. Slash-separated for cross-terminal work.
- **Pointer** — wikilink to the doc that carries the actual description

**Description lives in the pointer doc.** Plan files for designed work, gap logs for in-flight observations, research entries for evaluations, ADRs for architectural decisions, parent specs (`PHASE_42_PATTERNS`, `ENGINE_REPAIR` rows) for engine work. If no existing pointer exists, create one — typically a plan file or a research entry. Don't fold description back into the ROLLOUT row.

### Part 3: Per-terminal filing protocol

Each `.claude/terminals/{name}/TERMINAL.md` carries a **§Filing work to ROLLOUT** section pointing to:

- Which groups that terminal typically files into (recommendation, not restriction)
- Inline link to ROLLOUT_PLAN §How to add work for the template
- The archive cadence (`done-pending-archive` → session-end sweep → `ROLLOUT_ARCHIVE.md`)

Per-terminal default groups (recommendations, override when work crosses):

| Terminal | Primary groups | Notes |
|----------|---------------|-------|
| **engine-sheet** | `engine.*` | Schema specs / engine-repair rows / phase-pattern inventory often file as engine.* but may file `governance.*` for engine-spec docs |
| **civic** | `civic.*` | Civic-process gap logs and city-hall artifacts |
| **media** | `pipeline.*` | All edition-production gap logs and media-side fixes |
| **research-build** | `governance.*`, `research.*` | Plus stewardship across all groups (architectural decisions land here regardless of which group they affect) |

### Templates inline in ROLLOUT_PLAN

The "How to add work" + "How to close work" templates live at the top of `ROLLOUT_PLAN.md` itself. Future-instance reading the doc immediately sees the pattern. No separate template file needed (avoids the no-isolated-MDs concern; the template lives where it governs).

## Alternatives Considered

### A — Keep numbered phases, just trim narratives

Rejected: solves the inline-narrative drift but leaves the numbered-phase opacity. Future-instance still has to look up what "Phase 38" was about. The semantic-group renaming costs nothing extra during migration and pays off every time someone reads the doc.

### B — More granular groups (e.g. 12-15 categories)

Considered: skills, agents, hooks, rules, plans, schemas, terminals, voices, audits, etc. as separate groups.

Rejected: every group adds taxonomic overhead (decision cost: which group does this fit?). Seven covers all current work without forcing fits. If a group becomes overloaded (say `governance.*` exceeds 15 entries), splitting it later is cheaper than over-categorizing now.

### C — No grouping, just pointer-only flat list

Rejected: 30+ items in one flat list is hard to triage. "What's open in pipeline?" should be answerable in seconds. Groups make state-of-the-project scannable.

### D — Inline narrative allowed for high-priority items only

Rejected: creates a two-tier convention. Some items get rich entries, some get pointers, the bar drifts immediately. Pointer-only across the board is cleaner; HIGH items get the same row format with `state: ready` or `state: in-progress` — priority signal lives in state, not in entry weight.

### E — Tag-based instead of group-based (e.g. each entry carries `[engine, ledger, schema]` tags)

Considered: matches `docs/SCHEMA.md` tag taxonomy already in use for plans + ADRs.

Rejected: tags are good for discovery, bad for at-a-glance state-of-the-project. Groups answer "what's happening in domain X right now"; tags answer "find all entries matching Y across domains." For a state-tracker, groups serve better. Tags can be added to entries as a secondary signal later if needed (orthogonal to this ADR).

## Composition with FOUR_COMPONENT_MAP and ADR-0004

ROLLOUT_PLAN.md is documentation, not a Component (per `[[FOUR_COMPONENT_MAP]]` §1). But the **per-terminal filing protocol** means TERMINAL.md files (Component 1: terminals) reference ROLLOUT structure. That makes ROLLOUT a load-bearing meta-doc that affects how all four Components evolve.

ADR-0004 (skill-bag naming) and ADR-0005 (this) share a discovery-wiring pattern: both are documented as ADRs, back-linked from CLAUDE.md / MEMORY.md / TERMINAL.md / index.md / the doc-they-govern. Per the discovery-wiring discipline (S212): governance ADRs need to be reachable from auto-loaded surfaces, not just findable via grep.

## Consequences

### Positive

- **ROLLOUT becomes scannable.** ~30 rows × 5 columns vs ~30 paragraphs. State-of-the-project answerable in 30 seconds.
- **New work files cleanly per protocol.** Each terminal has a §Filing work to ROLLOUT section pointing to template + group recommendation. No more "how do I file this" decisions.
- **Description content lives where it's useful.** Gap-log near the work. Plan near the spec. Research near the source. ADRs for decisions. ROLLOUT becomes the index, not the encyclopedia.
- **Group taxonomy makes "what's open in domain X" answerable.** Browse pipeline.* to see all edition-production work; browse engine.* to see all engine-side work. Currently buried in mixed-domain sections.
- **Move-to-archive cadence enforced.** "How to close work" template + state taxonomy + session-end sweep means done-pending-archive entries don't linger.
- **MDs self-regulate.** This is the real win Mike named — protocol + templates means future sessions don't relitigate the convention. New work files cleanly. Old work moves to archive cleanly. The doc stays scannable across many sessions.

### Negative

- **Migration is per-entry classification + pointer extraction.** ~30 open items, each requires: pick group, extract title (≤80 chars), find or create pointer doc. Slow careful work; not mechanizable. Deferred to next session for clean focus and measure-twice per entry.
- **Group boundaries blur for cross-cutting work.** A Phase 42 item touches engine + pipeline. The "primary group" rule resolves this but requires judgment per entry. Some misclassifications are inevitable; reclassify as patterns surface.
- **Risk of losing context during extraction.** Pointer doc may not exist yet for some entries. Mitigation: create plan file or fold into existing parent doc as part of migration. The S147 inbound-link rule applies — every new MD needs registration.
- **Watch List has different shape than open work.** It's tracking-only (waiting for trigger), not actionable. Resolution: keep Watch List as separate section after the 7-group open-work tables. It maps loosely to `research.*` with `state: needs-info` but the section structure is different (trigger conditions, monitoring cadence).

## Open Questions

- **Cross-skill gap logs:** several existing entries are pointer-only references to gap logs (e.g. `[[output/production_log_edition_c93_sift_gaps]]`). They naturally fit `pipeline.*` for media skills and `civic.*` for civic skills. But a single gap log can have multiple sub-issues; each ROLLOUT row points at the parent gap log, with severity/promoted tags optional. Resolution: current convention works; row points at gap log, gap log is canonical for sub-state.
- **Watch List composition:** preserve as separate section (different shape: tracking-only) or fold into research group with `state: needs-info`? Decision: preserve as separate section. The Watch List has a different update cadence (triggered by external events: Anthropic releases, library updates, droplet headroom) that doesn't fit the open-work state machine cleanly.
- **Spine retirement:** the §Spine section (10-step ordered rollout from S145, all DONE) is historical record. Preserve as-is below the new structure or rotate to ROLLOUT_ARCHIVE? Decision: preserve in place. The Spine is canonical history of "the project's planned arc through S156"; rotation would lose the at-a-glance "we shipped these 10 steps" context.
- **Phase Status section:** currently DONE/Active/Backlog roll-ups (lines 172-194). With new structure, "Active/Ready" is now the 7 group tables; Backlog moves to ROLLOUT_ARCHIVE-equivalent or to BACKLOG.md. Decision: condense Phase Status to a "Recently Completed" historical record only; active state is the group tables.

## Pre-mortem

**What would make this wrong in 3 sessions?**

1. *If group boundaries prove too rigid.* If many entries don't fit cleanly into pipeline / engine / canon / civic / infrastructure / research / governance, the taxonomy is wrong and we'll see entries with awkward dual-classification or "misc" entries. Mitigation: 7 groups were derived from current ROLLOUT contents; no current entry forces a stretch. If new work patterns surface a missing group (e.g. `agents.*` if agent-runtime work becomes a major workstream), add it.

2. *If migration drops context.* During per-entry extraction, the inline narrative may carry historical context not yet captured in any pointer doc. Loss is permanent if not folded somewhere. Mitigation: per-entry measure-twice — for each entry, check whether the inline content is covered by the pointer; if not, fold into parent spec or create research/plan file.

3. *If filing protocol isn't picked up by future sessions.* Without enforcement, sessions might revert to inline narrative habits. Mitigation: TERMINAL.md filing-work section is auto-loaded at boot; ADR-0005 is back-linked from CLAUDE.md + MEMORY.md + index.md per the ADR-0004 discovery-wiring pattern. Future-instance encounters the protocol from multiple surfaces.

## How to apply (future-instance)

### Adding new work

1. Identify the primary group (which type-of-work matches?) — see group taxonomy table above
2. Pick the next available number in that group
3. Write a ≤80 char title
4. Set state per Convention §State labels (typically `ready` for picker-grabable work, `needs-info` if gated on Mike or external)
5. Set terminal per group recommendations (`engine-sheet` / `media` / `civic` / `research-build`)
6. **Identify or create the pointer doc:**
   - For designed work: create or link `[[plans/YYYY-MM-DD-topic]]` — **copy `[[plans/TEMPLATE]]` for shape; register in `[[index]]` same commit per S147 inbound-link rule**
   - For in-flight observations from heavy-skill runs (civic + media generator terminals): link the gap log `[[output/production_log_..._gaps]]` — **new gap logs follow `[[plans/GAP_LOG_TEMPLATE]]` per S212 protocol; engine-sheet uses `[[engine/ENGINE_REPAIR]]` rows for its tactical-defects sidecar (different shape)**
   - For evaluations: append to `[[RESEARCH]] §section` or create `[[research/topic]]`
   - For decisions: write or link an ADR (next ADR number, follow ADR-0001/0004/0005 shape)
   - For engine work: link to existing parent (PHASE_X_PATTERNS, ENGINE_REPAIR row)
7. Add the row to the appropriate group table in ROLLOUT_PLAN.md
8. Description content goes in the pointer doc, NOT the ROLLOUT row

### Closing work

1. Update ROLLOUT row's State field to `done-pending-archive`
2. Add a brief note in the row's pointer doc: what shipped, commit hash, session
3. At session-end, sweep all `done-pending-archive` rows to `ROLLOUT_ARCHIVE.md`:
   - Move the row, not just delete it
   - Archive section by group (mirror the ROLLOUT_PLAN structure)
   - Include the closing-session note inline in the archive row

### Reclassifying

If a row's group is wrong (work shifted scope), edit the row's `#` code and move to the new group's table. Don't renumber siblings — the codes are identifiers, not sequence.

## Related ADRs

- **ADR-0001** — adopting CONTEXT.md and ADRs. ADR-0005 follows the bar set there.
- **ADR-0003** — skills as shared infrastructure. The friction-log pattern from ADR-0003 is the precedent for "templates govern future use, not just current shape."
- **ADR-0004** — skill-bag naming principle. The discovery-wiring pattern (back-links from auto-loaded surfaces) is reused here.
