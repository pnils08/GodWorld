---
title: Brief Template v2 — Canonical Exemplar
created: 2026-05-23
updated: 2026-05-23
type: reference
tags: [media, pipeline, sift, active]
contract_class: exemplar
sources:
  - "[[brief_template_v2]] — spec this exemplar instantiates"
  - "[[../adr/0006-parser-validator-format-contracts]] — Contract A canonical-exemplar requirement"
  - "[[../plans/2026-05-22-sift-v2]] §Task 3"
pointers:
  - "[[brief_template_v2]] — the spec"
  - "[[dispatch_schema]] — dispatch.json articles[].briefFile points at files shaped like these"
  - "[[index]] — registered same commit"
---

# Brief Template v2 — Canonical Exemplar

**Purpose.** Per [[../adr/0006-parser-validator-format-contracts]] Contract A: this file is the contract /sift v2 produces against. Placeholders below — when filled with real values, a brief in this shape passes any future structural check.

**Three variants below:** (1) Main article brief, (2) Quick-take brief, (3) Letters-desk candidate pool.

**Placeholder convention.** `{ALL_CAPS_DESCRIPTIVE}` for fields a producer fills; `{lowercase descriptive}` for prose-shape guidance the producer adapts. Sections beginning with `[note: ...]` are exemplar-only annotations, NOT part of the emitted brief.

---

## Variant 1 — Main article brief

[note: This is the load-bearing variant. Used for FP1, EDITORS_DESK columns (when Mags isn't writing them directly), CIVIC pieces, CULTURE pieces, BUSINESS pieces, SPORTS pieces, OPINION pieces. NOT used for letters or quick-takes.]

[note: Filename when filled: `output/reporters/{reporter-slug}/c{XX}_{slot}_brief.md`]
[note: Example real path: `output/reporters/maria-keen/c94_C2_brief.md`]

```markdown
# {REPORTER_FULL_NAME} — C{CYCLE_NUMBER} {SLOT_CODE}: {WORKING_HEADLINE}

**Section:** {SECTION_TAG}
**Spine:** {one-line: which cycle thread this piece sits inside — names the spine + this piece's role in it}

---

## SIGNAL

{One paragraph, 4-7 sentences, ~80-150 words. State: what happened this cycle, why this is the angle now, and which three layers thread through (engine state, simulation event, user/citizen actions). Direct prose. Include load-bearing engine numbers, dated quotes, or canonical phrases that ARE the angle — reporter shouldn't have to fish for the load-bearing fact. Do NOT prescribe prose structure. Do NOT name an opener. Do NOT list quotes as menu items.}

## VOICE DIRECTION

- {Bullet 1 — typically tone or pacing direction. Cycle-specific only; don't repeat what the reporter's identity layer already knows.}
- {Bullet 2 — typically lean-into: what's load-bearing this piece, what the reporter should let carry the frame.}
- {Bullet 3 — typically avoid: drift areas, common formula traps for this beat this cycle.}
- {Bullet 4 OPTIONAL — structural-turn-suggestion: scene-first vs argument-first vs narrative-arc, only if the cycle warrants direction.}
- {Bullet 5 OPTIONAL — errata-applied: prior-edition correction this piece carries forward, OR S215 brief-led-mode override note.}

## CANON POINTERS

- **Citizens:** {POPID} — {Full Name} — {one-line role context if needed}.
- **Citizens:** {POPID} — {Full Name} — {context}.
- **Businesses:** {BIZID} — {Business Name} — {sector / neighborhood}.
- **Initiatives:** {INIT-NNN} — {Initiative Name} — {current phase}.
- **Council/Officials:** {District or Office} — {Full Name} — {faction or role}.
  [note: For civic vote coverage, list all 9 council members (D1-D9) + Mayor as FROZEN canon block — see [[../mags-corliss/NEWSROOM_MEMORY]] §Standing Directives. For non-vote civic pieces, list only officials actually referenced.]

## NEIGHBORHOOD STATE
[note: S245 — include only when the piece is set in a neighborhood; omit for citywide pieces. Worked example below uses the C95 West Oakland slice — the exact case the fix addresses. Source: baseline brief `neighborhoodState` + `neighborhoodResidents` (lib/neighborhoodSlice), or get_neighborhood_state().]

- **West Oakland:** crime 4 (+3), retail 5.64 (+0.14), sentiment -0.04 (+0.02), median income $81,072, displacement pressure: none, gentrification: none.
- **Residents:** Elias Varek (Founder, Civis Systems), Brenda Okoro (Deputy Mayor), Ernesto Quintero (A's DH), Gregory Mims.
- Ground neighborhood texture in these figures. Do NOT assert a condition absent from them — displacement, blight, decline, struggle, recovery the engine didn't report does not exist this cycle.

## WHAT NOT TO COVER

- {topic owned by another slot} — {SLOT_CODE} {Reporter Name}.
- {topic owned by another slot} — {SLOT_CODE} {Reporter Name}.
- {OPTIONAL: known drift area for this reporter on this beat. Sparing use.}

## CANONICAL EXEMPLAR

See [[brief_template_v2_exemplar]] for the placeholder-filled reference brief.
```

[note: Word-count target for the whole filled brief: 250-500 words. Most of the words land in SIGNAL.]

---

## Variant 2 — Quick-take brief

[note: Used for QT1, QT2, etc. QTs route into a parent SECTION at compile time — they are NOT a standalone section. Brief is slimmer than main variant. Closes pipeline.26 §QT routing.]

[note: Filename when filled: `output/quick-takes/c{XX}_QT{N}_brief.md` — NOT under a reporter dir. QTs may be reporter-less (desk default voice) — separate path keeps assignment optional.]
[note: Example real path: `output/quick-takes/c94_QT1_brief.md`]

```markdown
# C{CYCLE_NUMBER} QT{N}: {WORKING_HEADLINE}

**Section:** {SECTION_TAG — the parent section this QT routes into}
**Reporter:** {REPORTER_FULL_NAME OR "{desk}-desk default"}
**Spine:** {one-line — same spine as main piece this QT folds into, or standalone topical}
**Form:** Quick take (50-150 words)

---

## SIGNAL

{One paragraph, 2-4 sentences. Just the topical fact + why now. ~30-60 words.}

## VOICE DIRECTION

- {1-2 bullets max. QTs are tight.}

## CANON POINTERS

- **Citizens:** {POPID} — {Full Name} — {context}.
  [note: Or **Businesses:** / **Initiatives:** / **Council/Officials:** as needed. Usually 1-2 entities total for a QT.]

## CANONICAL EXEMPLAR

See [[brief_template_v2_exemplar]] §Variant 2 — Quick-take brief.
```

[note: Word-count target for the whole filled brief: 50-150 words.]

---

## Variant 3 — Letters-desk candidate pool

[note: Letters-desk gets a CANDIDATE POOL not a per-slot assignment. Letters-desk LENS owns final selection. Pool is FILTERED through rest-cycle pre-emission (closes G-W39).]

[note: Filename when filled: `output/letters/c{XX}_candidates.md` — NOT under `output/reporters/letters-desk/`.]
[note: Letters-desk reads this canonical path; /write-edition Step 3.5b regenerates letters brief from compiled edition + relaunches letters-desk for final selection.]

```markdown
# Letters-Desk — C{CYCLE_NUMBER} Candidate Pool

**Cycle theme summary** (3-5 lines from approved slate):

- {Theme 1 — one line, what slate's spine is about, e.g. "Ownership ecosystem — Civis Systems names stadium, Varek pursues Paulson"}
- {Theme 2 — one line, e.g. "Transit Hub 8-0, the vote that converted from C93's failed-fire"}
- {Theme 3 — one line}

**Rest-cycle status** ({date stamp from `.claude/agent-memory/letters-desk/MEMORY.md §Rest Cycle Tracking`}):
- {N citizens currently REST through C{XX-1}}: {comma-separated POPID list — excluded from pool}

---

## Candidate pool

- {POPID} — {Full Name} ({Neighborhood}) — {one-line why-they-might-write this cycle}.
- {POPID} — {Full Name} ({Neighborhood}) — {context}.
- {POPID} — {Full Name} ({Neighborhood}) — {context}.
- {... 3-5 candidates minimum. Pass full pool per plan Q2 resolution.}

---

## Notes

- Letters-desk LENS owns final selection. This is pool, not assignment.
- /write-edition Step 3.5b regenerates this brief from the compiled edition + relaunches letters-desk with named-piece references — second-stage handoff.
- Cycle-cadence: prefer NEW citizen voices when slate dominated by returning reporters; mix returning + new when cycle is texture-heavy.
- Returning letter-writers carry rest cycles; check `.claude/agent-memory/letters-desk/MEMORY.md` BEFORE proposing.
```

[note: No word-count target — letters-desk LENS prunes the pool.]

---

## Cross-variant rules

These apply to ALL three variants:

**Headline (`{WORKING_HEADLINE}` slot):**
- MUST be real working text, not "untitled" / "TBD" / "placeholder" / empty (closes G-PR2 — djDirect.js title-matching depends on real headlines).
- May be the headline used in the rendered article OR a working frame the reporter refines. Either way, NEVER a placeholder.
- Length: ≤ 80 characters.

**Section tag (`{SECTION_TAG}` slot):**
- From the canonical allowlist: `FRONT_PAGE | EDITORS_DESK | CIVIC | CULTURE | BUSINESS | SPORTS | OPINION | LETTERS`.
- Underscored form for routing. /write-edition compile maps to display label.
- `QUICK_TAKES` and `NEIGHBORHOODS` are NOT valid section tags. QTs use parent section. Neighborhood pieces route to CULTURE.

**Slot code (`{SLOT_CODE}` slot):**
- From [[EDITION_FORMAT_TEMPLATE]] §ARTICLE TABLE convention: `FP1`, `ED1`, `C1`, `C2`, `CU1`, `B1`, `S1`, `S2`, `S3`, `O1`, `L1`, `QT1`, `QT2`...
- Uppercase. Section prefix + sequence number within section.
- One slot = one brief file. Multi-slot reporters get multiple briefs.

**POPID / BIZID / INIT-NNN format:**
- `POP-NNNNN` (5-digit, zero-padded; e.g., `POP-00772`).
- `BIZ-NNNNN` (5-digit, zero-padded; e.g., `BIZ-00052`).
- `INIT-NNN` (3-digit, zero-padded; e.g., `INIT-003`).
- `CUL-NNNNNNN` (7-digit for cultural figures; e.g., `CUL-0000040`).
- `FAITH-NEW` / `BIZ-NEW` / `POP-pending` for new canon entries.

**Wikilinks:**
- `[[file-name]]` for docs/ references (drop `.md`, relative to docs/).
- See [[SCHEMA]] §6.

---

## Anti-patterns (do NOT emit these)

The producer (/sift v2) MUST NOT emit briefs containing:

1. **Prose body skeleton.** "Paragraph 1: introduce X. Paragraph 2: explain Y." That's v1 over-curation.
2. **Citizens-to-use table.** Multi-column table with Name / POPID / Role / Age / Gender / Neighborhood / Why-in-story. v1 shape. v2 uses CANON POINTERS one-line per entity.
3. **Specific-data dump.** Pasting full voice-output JSON / engine-review excerpt / sports-feed extract into the brief. Reporter fetches; brief points.
4. **Multi-article packed brief.** One file containing C2 + N1 under different `##` headers. v2 = one brief per article slot. Maria's C94 (S221) `c94_brief.md` is the v1 anti-pattern.
5. **Placeholder headline.** "untitled" / "TBD" / "{Headline}" / empty. Real working text required.
6. **Off-allowlist section tag.** `NEIGHBORHOODS`, `QUICK_TAKES`, `CITY`, `FRONT PAGE` (with space). Underscored routing form only.
7. **Pre-prescribed scene.** "Beverly Hayes is at the corner of 47th and Adeline at 6am" — that's the reporter's choice. Brief names the angle, reporter writes the scene.
8. **Memory-Fence bypass.** Embedded canon excerpts without `wrap(text, 'bay-tribune')` markers. SKILL.md v2.0 Step 9 enforces; producers should treat wrap as default not optional.

---

## Changelog

- 2026-05-23 (S228, research-build) — Exemplar initial draft. Ships alongside [[brief_template_v2]] per ADR-0006 Contract A. Three variants: main article / quick-take / letters candidate pool. Cross-variant rules + anti-patterns named explicitly. Placeholders only — no real C94 content (per advisor: canonical exemplar uses placeholders, real cycles are worked examples not exemplars).
