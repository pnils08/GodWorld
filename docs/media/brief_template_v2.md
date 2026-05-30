---
title: Angle Brief Template v2 — Reporter-Agency / Signal+Voice
created: 2026-05-23
updated: 2026-05-23
type: reference
tags: [media, pipeline, sift, active]
contract_class: spec
sources:
  - "[[../plans/2026-05-22-sift-v2]] §Task 3 + §v2 Step List Step 7"
  - "[[../adr/0006-parser-validator-format-contracts]] — Contract A canonical-exemplar requirement"
  - "[[../../output/sift_v2_gap_map.md]] G-S21 / G-W31 (template-side defects v2 closes)"
  - "[[brief_template]] — v1 predecessor (deprecated)"
pointers:
  - "[[brief_template_v2_exemplar]] — canonical exemplar per ADR-0006 Contract A"
  - "[[EDITION_FORMAT_TEMPLATE]] — section-label canon"
  - "[[dispatch_schema]] — dispatch.json articles[] field maps 1:1 to one brief file"
  - "[[sift_triage_vocabulary]] — triage decisions that route a candidate into a brief OR into baseline/fold/defer"
  - "[[../plans/2026-05-22-sift-v2]] — pipeline.24 plan; v2 SKILL.md (Task 6) references this template by name"
  - "[[index]] — registered same commit"
---

# Angle Brief Template v2 — Reporter-Agency / Signal+Voice

**Contract class:** SPEC (LLM-readable structural contract). Briefs are consumed by reporter agents reading prose; there is no mechanical brief validator. A future validator would parse the headers below, but the contract today is enforced by SKILL.md v2.0 (pipeline.24 Task 6) directing /sift to emit per this shape and by the exemplar file ([[brief_template_v2_exemplar]]) showing it.

**Replaces:** [[brief_template]] (v1, S197/S222 line of prose-body + citizens-table + specific-data dump). v1 stays in tree with a DEPRECATED banner until SKILL.md v2.0 removes the last reference; then v1 archives per [[SCHEMA]] §8.

**One file per article slot.** Multi-slot reporters get multiple brief files — `{reporter-slug}/c{XX}_{slot}_brief.md` (one per slot). No more `c{XX}_brief.md` files that collapse C2+N1 into one document (closes G-W31).

---

## What a v2 brief is

A v2 brief gives the reporter ONE story to write, in ~1 paragraph of signal + 3-5 lines of voice direction + the canon they must respect. The reporter has agency — they pull citizens, frame the scene, choose the structural turn. The brief tells them what's load-bearing this cycle and what to avoid. It does NOT pre-curate citizens, pre-list quotes, or skeletonize the article.

**Target length:** 250-500 words total per brief. Briefs longer than 500 words drift back toward v1 over-curation. Shorter than 250 risks under-specifying the angle (the v1 "300-500 produces voiceless copy" failure mode is about prose-body briefs; v2 signal+voice at 250 is dense, not thin).

**Why it changed.** v1 was built for a city-hall paper load-out where editor pre-curated every citizen, every quote, every angle. C94 (S221 hand-run) inverted to reporter-agency — sift sets the angle and the canon perimeter, reporters write the story. The S221 briefs that worked (Maria Keen C2 "Open at a stoop, stay there", S2 P Slayer "your range") were already v2-shaped in practice. This template codifies what produced strong work.

---

## Filename + path convention

```
output/reporters/{reporter-slug}/c{XX}_{slot}_brief.md
```

- `{reporter-slug}` — lowercased reporter name, hyphens not spaces (e.g., `maria-keen`, `p-slayer`, `jordan-velez`)
- `{XX}` — cycle number, zero-padded if `<10`
- `{slot}` — article slot code from [[EDITION_FORMAT_TEMPLATE]] §ARTICLE TABLE (FP1, ED1, C1, C2, CU1, B1, S1, S2, S3, O1, L1...)

**Examples:**
```
output/reporters/maria-keen/c94_C2_brief.md
output/reporters/maria-keen/c94_CU1_brief.md   (replaces c94_brief.md packed-N1 file)
output/reporters/jordan-velez/c94_FP1_brief.md
output/reporters/p-slayer/c94_S2_brief.md
```

`dispatch.json` `articles[].briefFile` ([[dispatch_schema]]) carries this path. /write-edition reads dispatch.json and launches the right brief per slot — no slot-ambiguous packed files.

---

## Brief structure

The skeleton below is the canonical shape. Sections are mandatory unless marked OPTIONAL. Order matters — reporter agents read top-to-bottom and the load-bearing direction (SIGNAL + VOICE DIRECTION) lands before the constraints (CANON POINTERS + WHAT NOT TO COVER).

```markdown
# {Reporter Name} — C{XX} {SLOT}: {Headline}

**Section:** {SECTION_TAG}
**Spine:** {one-line: which cycle thread this piece sits inside}

---

## SIGNAL

{One paragraph, 4-7 sentences. What happened + why now + which three layers (engine state / simulation event / user actions) thread through. Direct. No prose-skeleton, no "the reporter could open with..." prescription. State the angle.}

## VOICE DIRECTION

- {3-5 bullets total.}
- {Each bullet is one of: tone, pacing, lean-into, avoid, structural-turn-suggestion.}
- {Bullets are direction, not prescription. "Open at a stoop, stay there." Not "Paragraph 1: introduce Beverly Hayes at her West Oakland stoop."}
- {Don't repeat what the reporter's identity layer already knows. P Slayer knows fan-emotional; don't tell him.}

## CANON POINTERS

{Named entities the reporter must respect — IDs from MCP lookups, no fabrication surface.}

- **Citizens:** {POPID — Name — one-line role context (only if needed; reporter pulls full ledger via lookup_citizen)}. Multi-line if multiple required.
- **Businesses:** {BIZID — Name — sector/neighborhood}. Multi-line.
- **Initiatives:** {INIT-NNN — Name — current phase}. Multi-line.
- **Council/Officials:** {District/Office — Name — faction/role} (only for civic pieces; FROZEN 9-member roster per [[../mags-corliss/NEWSROOM_MEMORY]] §Standing Directives if vote coverage).

## NEIGHBORHOOD STATE
{S245 — include only when the piece is set in a neighborhood. Engine truth, sourced from the baseline brief's `neighborhoodState` + `neighborhoodResidents` (built by `lib/neighborhoodSlice`), or `get_neighborhood_state()`. The reporter grounds neighborhood texture HERE rather than inventing it.}

- **{Neighborhood}:** crime {n} ({±Δ}), retail {n} ({±Δ}), sentiment {n} ({±Δ}), median income ${n}, displacement pressure: {none|value}, gentrification: {none|phase}.
- **Residents:** {Name} ({role}), … (bounded, notable-first — the neighborhood's actual people).
- Ground texture in these figures. Do NOT assert a condition absent from them (displacement / blight / decline / struggle / recovery the engine didn't report does not exist this cycle).

## WHAT NOT TO COVER

- {Topics owned by other reporters this cycle, named explicitly: "Transit Hub Phase II — Carmen's C1."}
- {Slot-overlap prevention.}
- {OPTIONAL: areas the reporter has historically drifted into. Use sparingly — over-fencing produces timid copy.}

## CANONICAL EXEMPLAR

See [[brief_template_v2_exemplar]] for the placeholder-filled reference brief.
```

---

## Field-by-field rules

### Title line `# {Reporter Name} — C{XX} {SLOT}: {Headline}`

- **Reporter Name** — full canonical name as in `.claude/agents/REPORTER_DESK_INDEX.md`. Not the slug.
- **Cycle number** — current cycle, no padding.
- **Slot** — slot code from [[EDITION_FORMAT_TEMPLATE]] §ARTICLE TABLE. Exact uppercase.
- **Headline** — REAL working headline, not "untitled" / "TBD" / "placeholder" (closes G-PR2). djDirect.js title-matches against this — placeholder text breaks the joining layer.

### `**Section:**` line

Section tag from the canonical allowlist (matches [[EDITION_FORMAT_TEMPLATE]] sections, underscored for routing):

| Tag | Renders in edition as | Use for |
|-----|----------------------|---------|
| `FRONT_PAGE` | FRONT PAGE | Lead piece of the cycle (1 per edition) |
| `EDITORS_DESK` | EDITOR'S DESK | Mags' column (1 per edition, EIC-written) |
| `CIVIC` | CIVIC | Council, mayor, factions, initiatives, votes |
| `CULTURE` | CULTURE | Neighborhood texture, faith, arts, education, food (this is the catch-all for "neighborhood / cultural" pieces — `NEIGHBORHOODS` is NOT a separate section) |
| `BUSINESS` | BUSINESS | Civis Systems, Baylight, biz news. Omitted from edition if no piece this cycle. |
| `SPORTS` | SPORTS | A's, Bulls, athletes, GM, free agency |
| `OPINION` | OPINION | Editorial / op-ed (NOT Editor's Desk — separate section) |
| `LETTERS` | LETTERS | Letters-desk output. Briefs for letters use a different shape — see §Letters-desk brief variant below. |

**Display label is derived in /write-edition rendering** — sift + dispatch.json carry the underscored routing tag, write-edition's compile step maps to display label. This prevents the G-PR6 silent-drop (FRONT_PAGE vs FRONT PAGE).

**Quick takes are NOT a section** — pipeline.26 closed Step 2 of /sift skill text to fold QT into topical section OR drop. Dispatch.json carries `quickTakes[]` as a separate top-level array; QT-briefs use a slimmer shape (see §Quick-take brief variant).

### `**Spine:**` line

One sentence naming the cycle thread this piece sits inside. Example: "Ownership Ecosystem — Civis Systems names A's stadium, Varek courts Paulson for Oaks GM, Baylight Phase 11."

Helps the reporter see how their piece connects to the rest of the slate without re-deriving the spine each launch. WHAT NOT TO COVER excludes their neighbors; Spine includes them.

### `## SIGNAL` paragraph

- One paragraph. 4-7 sentences. ~80-150 words.
- States: what happened, why now, three-layer angle (engine + simulation + user actions threaded — not labeled).
- DOES NOT prescribe prose structure. "The reporter opens with X" is forbidden. "Beverly Hayes is at the corner of 47th" is forbidden. The reporter chooses.
- DOES include load-bearing engine numbers / dates / canonical quotes if they're the load-bearing fact. "RetailVitality 5.50 lowest in city" stays in SIGNAL because it's the angle; reporter doesn't have to fish for it. (When the piece is set in a neighborhood, the full figures live in the NEIGHBORHOOD STATE block below — SIGNAL pulls the one that's the angle.)
- Allowed forms of quote inclusion: `Mayor says "We cleared the backlog. Now we diagnose why West Oakland's retail engine isn't responding yet."` Reporter MAY use the quote, MAY reframe, MAY use it as scene-anchor. Their call.

### `## VOICE DIRECTION` bullets

- 3-5 bullets, no more. Going longer drifts toward v1 prescription.
- Each bullet is a single direction. Cluster categories: tone / pacing / lean-into / avoid / structural-turn-suggestion / errata-applied (S221 reporter-agency).
- DO direct the cycle-specific turn. "E93 errata applied — neighborhood texture that doesn't route through council vote."
- DO NOT direct the reporter's whole voice. "Use Maria's quiet attention" is redundant; her LENS file has that.
- DO call out S215 brief-led-mode self-defense: "If the brief is wrong about [X], the reporter's identity layer should override."

### `## CANON POINTERS` list

- ONLY entities the reporter MUST reference or MUST respect canon on. Not every entity in the cycle.
- Format: `**Citizens:**` / `**Businesses:**` / `**Initiatives:**` / `**Council/Officials:**` sub-bullets.
- For each entity: `{ID} — {Name} — {one-line context}`. Reporter pulls full record via `lookup_citizen()` / `lookup_business()` etc.
- DO NOT include role/age/neighborhood/occupation columns inline — that's v1's CITIZENS-TO-USE table. The reporter looks it up.
- DO include the ID — that's the canon-pointer's load-bearing field.
- For civic pieces with vote coverage: the 9-member council roster is FROZEN canon, list all 9 + Mayor under `**Council/Officials:**` with their faction tag (D1-D9 + Mayor; see [[../mags-corliss/NEWSROOM_MEMORY]] §Standing Directives).

### `## NEIGHBORHOOD STATE` block (S245)

- Include ONLY when the piece is set in a neighborhood. Omit for citywide / non-geographic pieces.
- Engine truth — sourced from the baseline brief's `neighborhoodState` + `neighborhoodResidents` (built by `lib/neighborhoodSlice`), or `get_neighborhood_state()` if no matching baseline brief.
- One metrics line (crime / retail / sentiment with deltas, median income, displacement pressure, gentrification) + a bounded residents line (notable-first, the neighborhood's actual people).
- Closes with the fidelity guard: the reporter grounds neighborhood texture in these figures and does NOT assert a condition the engine didn't report. This is data-fidelity, not a tone rule — it replaced the rejected "standing canon rules" approach (C95 triage T1; the West Oakland "displacement" front page was written against an empty `DisplacementPressure` field).

### `## WHAT NOT TO COVER` list

- Topics other slots own. Name the slot AND the reporter. "Transit Hub Phase II — Carmen's C1" (not "Transit Hub" alone — over-fences).
- Format: `- {topic} — {slot} {Reporter}.`
- Optional last bullet: known drift areas for this reporter on this beat. Sparing use; over-fencing produces timid copy.

### `## CANONICAL EXEMPLAR` line

Always: `See [[brief_template_v2_exemplar]] for the placeholder-filled reference brief.`

Wikilink lets future tooling resolve the back-pointer. The exemplar is THE contract per ADR-0006 Contract A — every brief should parse-clean against it.

---

## Letters-desk brief variant

Letters-desk gets a CANDIDATE POOL, not a per-slot assignment. The brief shape is different:

**Filename:** `output/letters/c{XX}_candidates.md` (NOT under `output/reporters/letters-desk/` — letters-desk reads from its own canonical path).

**Structure:**

```markdown
# Letters-Desk — C{XX} Candidate Pool

**Cycle theme summary** (3-5 lines from approved slate): {what the edition is about, so letters can react thematically}

**Rest-cycle status** ({date stamp from `.claude/agent-memory/letters-desk/MEMORY.md §Rest Cycle Tracking`}): {N citizens currently REST through C{XX-1}}. Excluded from candidates.

---

## Candidate pool

- {Citizen Name} ({POPID}, {Neighborhood}, {one-line why-they-might-write})
- {Citizen Name} ({POPID}, {Neighborhood}, {context})
- {... 3-5 candidates minimum}

---

## Notes

- Letters-desk LENS owns final selection. This is pool, not assignment.
- /write-edition Step 3.5b regenerates this brief from the compiled edition + relaunches letters-desk with named-piece references — that's the second-stage handoff for final letter selection post-compile.
- Cycle-cadence: prefer NEW citizen voices when slate dominated by returning reporters; mix returning + new when cycle is texture-heavy.
```

The pool is FILTERED through rest-cycle pre-emission (closes G-W39). Letters-desk LENS catches the rest if anything slips, but the pool itself shouldn't include known-blocked citizens.

---

## Quick-take brief variant

QTs are 50-150 word topical micro-pieces; the brief is correspondingly slim:

**Filename:** `output/quick-takes/c{XX}_{QT_slot}_brief.md` (QT1, QT2, etc.) — NOT under a reporter dir. QTs may be reporter-less (assigned to a desk, written by the desk's default voice) — separate path keeps reporter assignment optional.

**Structure:**

```markdown
# C{XX} {QT_slot}: {Headline}

**Section:** {parent SECTION_TAG — e.g. CIVIC for an Okoro QT}
**Reporter:** {Reporter Name OR "{desk}-desk default" if unassigned}
**Spine:** {one-line — same as main piece this QT folds into, or standalone topical}
**Form:** Quick take (50-150 words)

---

## SIGNAL

{One paragraph, 2-4 sentences. Just the topical fact + why now.}

## VOICE DIRECTION

- {1-2 bullets max. QTs are tight — minimal direction.}

## CANON POINTERS

- {ID list — usually 1-2 entities.}

## CANONICAL EXEMPLAR

See [[brief_template_v2_exemplar]] §Quick-take variant.
```

QTs route into a topical section (CIVIC, SPORTS, CULTURE) at compile time, not into a standalone QUICK_TAKES block. Pipeline.26 closed that — there is no QUICK_TAKES section in [[EDITION_FORMAT_TEMPLATE]].

---

## What v2 explicitly removes from v1

The following v1 sections are GONE in v2:

- **THE STORY** (v1 prose-body opener) — folded into SIGNAL.
- **THREE-LAYER FRAMING** (v1 labeled three-layer bullets) — folded INTO SIGNAL as threaded angle (engine + simulation + user actions woven through). Reporter doesn't need engine-grammar labels.
- **CITIZENS TO USE** table (v1 pre-curated citizen columns) — replaced by CANON POINTERS (IDs only, reporter pulls record).
- **SPECIFIC DATA** (v1 voice-quote / sports-feed / engine-review dump) — load-bearing data lives in SIGNAL paragraph; everything else the reporter fetches.
- **TONE GUIDANCE** (v1 optional tone steer) — folded into VOICE DIRECTION.

The v1 §Scene-First Brief Design rule (open with scene/citizen for civic pieces) survives in spirit: VOICE DIRECTION can suggest a scene-first turn for civic pieces, but doesn't prescribe a specific person at a specific corner.

---

## What v2 explicitly preserves from v1

- **Reporter never appears as source in their own article** (v1 standing rule).
- **Vote math must add up: 9 council members + Mayor** (v1 standing rule; v2 surfaces explicitly under CANON POINTERS for civic vote pieces).
- **Citizen ages anchored to 2041 − BirthYear** (project-wide canon; reporters compute via `lookup_citizen()`).
- **Memory-Fence wrap on embedded canon excerpts** (v2 SKILL.md Step 9 enforces mechanical wrap, no longer manual).
- **Three-layer threading on anchor pieces** (FP1, C1, S1) — preserved as SIGNAL composition rule, just unlabeled.

---

## How /sift v2 emits this

Per [[../plans/2026-05-22-sift-v2]] §v2 Step List Step 7 — Brief emission. Inputs are the Step 6 locked slate + this template + the exemplar; output is one brief file per article slot at the canonical path. SKILL.md v2.0 (pipeline.24 Task 6) is the load-bearing producer; this template + exemplar are the contract it executes against.

ADR-0006 Contract A: producers read the exemplar first, can't produce wrong-shape input. The exemplar IS the contract; this template explains it.

---

## How reporter agents consume this

Reporter agents (.claude/agents/*-desk/) DO NOT read this template file directly. They read their own SKILL.md (which references the brief headers by name) and the brief file produced by /sift. The template is upstream documentation for /sift v2 and for editorial review.

Reporter agents DO read the canonical exemplar ([[brief_template_v2_exemplar]]) when their SKILL.md tells them to consult an exemplar — that's how the contract reaches the executor without a per-cycle template-reading tax.

---

## Changelog

- 2026-05-23 (S228, research-build) — v2 initial draft. pipeline.24 Task 3. Replaces [[brief_template]] v1 (S197/S222). Closes G-S21 (template predates reporter-agency) + G-W31 (per-slot naming). Section enum locked to underscored-routing form per advisor; display label derived in /write-edition. proposalState 2-state per advisor reconciliation of plan internal contradiction. Quick-take + letters-desk variants added beyond plan Task 3 scope (surfaced reading EDITION_FORMAT_TEMPLATE — QT is not a section; letters-desk has its own canonical path). Exemplar shipped same commit per ADR-0006 Contract A.
