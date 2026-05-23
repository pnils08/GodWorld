---
title: dispatch.json Schema — /sift v2 → /write-edition + djDirect handoff
created: 2026-05-23
updated: 2026-05-23
type: reference
tags: [media, pipeline, sift, write-edition, format-contract, active]
contract_class: strict-schema
sources:
  - "[[../plans/2026-05-22-sift-v2]] §Task 4 + §v2 Step List Step 8"
  - "[[../adr/0006-parser-validator-format-contracts]] — Contract A canonical-exemplar requirement"
  - "[[../../output/sift_v2_gap_map.md]] G-W30 (dispatch.json not emitted)"
  - "[[../../.claude/skills/write-edition/SKILL.md]] §Reporter→desk-agent routing (S215)"
  - "[[../../.claude/agents/REPORTER_DESK_INDEX]] — reporter → desk_agent routing table"
pointers:
  - "[[brief_template_v2]] — articles[].briefFile points at files of this shape"
  - "[[brief_template_v2_exemplar]] — paired exemplar"
  - "docs/media/examples/dispatch_canonical_example.json — canonical exemplar (placeholders, committed path per ADR-0006 Contract A stable-path requirement)"
  - "docs/media/examples/dispatch_c94_worked_example.json — real-cycle worked example"
  - "[[index]] — registered same commit"
---

# dispatch.json Schema — /sift v2 → /write-edition + djDirect handoff

**Contract class:** STRICT SCHEMA. dispatch.json is consumed mechanically by /write-edition Step 1 (launches desk agents per articles[] entry) and by djDirect.js Step 0 (photo mapping by section+slot+headline). Wrong-shape input here breaks both downstream consumers. Per ADR-0006 Contract A + B: ship canonical exemplar (placeholder-filled), parser fails loud on schema violation.

**Producer:** /sift v2 SKILL.md (pipeline.24 Task 6) emits this at locked-slate time, after Mike's approval gate (§v2 Step List Step 6 → Step 8).

**Consumers:**
1. **`/write-edition` Step 1** — reads `articles[]` to launch desk agents; reads `letters.candidatesFile` for letters-desk launch; reads `quickTakes[]` for QT compose.
2. **`djDirect.js` Step 0** (engine-sheet, pipeline.29) — reads `articles[].section + slot + headline` for photo-to-article mapping. Falls back to slot-order if title-match fails (defense in depth).
3. **Reviewer lanes** (Rhea / cycle-review / Mara / capability / Final Arbiter) — read `articles[]` for sourcing-vs-slate verification.

---

## File location + naming

```
output/dispatch_c{XX}.json
```

- `{XX}` — cycle number (e.g., `94` → `output/dispatch_c94.json`).
- One dispatch.json per edition cycle.
- /sift v2 emits this AT step 8, after `output/sift_proposals_c{XX}.json` reaches `proposalState: locked`.
- /write-edition fails loud if dispatch.json is missing for the cycle being compiled (no more REPORTER_DESK_INDEX fallback once /sift v2 is live — closes G-W30 structurally).

---

## Top-level shape

```json
{
  "cycle": <int>,
  "edition": "E<XX>",
  "generatedAt": "<ISO-8601 timestamp>",
  "siftSkillVersion": "<v2.x.y>",
  "proposalsFile": "output/sift_proposals_c<XX>.json",
  "slateLockedBy": "<user name>",
  "slateLockedAt": "<ISO-8601 timestamp>",
  "articles": [ /* one entry per article slot — see §articles[] */ ],
  "letters": {
    "candidatesFile": "output/letters/c<XX>_candidates.md",
    "deskAssigned": "letters-desk",
    "secondStageHandoff": "/write-edition Step 3.5b"
  },
  "quickTakes": [ /* one entry per QT — see §quickTakes[] */ ],
  "spine": "<one-line: cycle's spine summary>",
  "engineSignalsCovered": [ /* string array — engine signals the slate threads */ ],
  "engineSignalsUncovered": [ /* string array — engine signals deliberately not surfaced */ ],
  "notes": "<free-text editorial notes; optional>"
}
```

---

## `articles[]` shape

One entry per article slot (NOT per reporter — multi-slot reporters get multiple entries).

```json
{
  "slot": "<SLOT_CODE>",
  "section": "<SECTION_TAG>",
  "briefFile": "output/reporters/<reporter-slug>/c<XX>_<SLOT>_brief.md",
  "reporter": "<Reporter Full Name>",
  "desk": "<desk-slug>",
  "headline": "<working headline string>",
  "outputPath": "output/reporters/<reporter-slug>/articles/c<XX>_<SLOT>.md",
  "voiceDirective": "<one-line voice-direction summary pulled from brief>",
  "spine": "<one-line: cycle thread this piece sits inside>",
  "threeLayerKeys": {
    "engine": "<one-line engine layer>",
    "simulation": "<one-line simulation layer>",
    "userActions": "<one-line user-actions layer>"
  },
  "initsTouched": ["<INIT-NNN>", "..."]
}
```

### Field rules

| Field | Type | Constraint | Closes gap |
|-------|------|------------|------------|
| `slot` | string | Uppercase slot code from [[EDITION_FORMAT_TEMPLATE]] §ARTICLE TABLE (`FP1`, `ED1`, `C1`, `C2`, `CU1`, `B1`, `S1`, `S2`, `S3`, `O1`). NOT QT slots — those go to `quickTakes[]`. NOT `L1` letter slots — letters use `letters.candidatesFile`. | G-W31 (per-slot naming) |
| `section` | string | One of: `FRONT_PAGE` `EDITORS_DESK` `CIVIC` `CULTURE` `BUSINESS` `SPORTS` `OPINION`. Underscored routing form. NOT `NEIGHBORHOODS`, NOT `QUICK_TAKES`, NOT `LETTERS` (letters use their own field). NOT spaced form (`FRONT PAGE`). | G-PR6 (section name mismatch) |
| `briefFile` | string | Relative path from repo root. MUST resolve to an existing file at dispatch-emit time. One brief per article slot. Filename pattern: `output/reporters/{reporter-slug}/c{XX}_{SLOT}_brief.md`. | G-W30 + G-W31 |
| `reporter` | string | Full canonical name from [[../../.claude/agents/REPORTER_DESK_INDEX]]. NOT a slug. Must be `role: reporter` in that index (no Mags / DJ / Rhea / Arman bylines). | G-S14 (byline filter) |
| `desk` | string | Desk-agent slug: `civic-desk`, `sports-desk`, `culture-desk`, `business-desk`, `chicago-desk`, `freelance-firebrand`, `podcast-desk`. Single value (not array). Resolved from REPORTER_DESK_INDEX. | — |
| `headline` | string | REAL working headline — NOT `untitled` / `TBD` / `placeholder` / empty. djDirect.js title-matches against this. Length ≤ 80 chars. | G-PR2 (untitled titles) |
| `outputPath` | string | Where the desk agent writes the finished article. Convention: `output/reporters/{reporter-slug}/articles/c{XX}_{SLOT}.md`. | — |
| `voiceDirective` | string | One-line summary of the brief's VOICE DIRECTION (first bullet or compressed). For /write-edition launch parameter. ≤ 200 chars. | — |
| `spine` | string | Same value as top-level `spine`, OR the cycle thread this piece sits inside if different. Helps reviewer lanes contextualize. | — |
| `threeLayerKeys` | object | `{engine, simulation, userActions}` — one line per layer. Anchor pieces (FP1, C1, S1) require all three; texture pieces may have empty strings on the unused layer. NOT engine grammar in the strings (no "tension score" etc.) — plain language. | — |
| `initsTouched` | array of strings | `INIT-NNN` IDs this piece advances or references. Empty array if non-civic. | — |

### Validation rules

- Every `articles[].briefFile` MUST resolve to an existing file at dispatch-emit time. Parser fails loud (non-zero exit + named missing files) if any briefFile path is unresolved.
- `slot` codes within `articles[]` MUST be unique within the dispatch — no two articles share a slot.
- `section` count MUST respect per-section caps from [[../plans/2026-05-22-sift-v2]] §v2 Step List Step 6: CIVIC ≤ 3, SPORTS ≤ 3, others ≤ 2-3. Parser warns on cap violation.
- `reporter` count MUST respect per-reporter cadence caps from REPORTER_DESK_INDEX. Parser warns on cap violation.

---

## `quickTakes[]` shape

One entry per QT. Slimmer than articles[] — QTs route into parent section at compile.

```json
{
  "slot": "<QT_SLOT>",
  "section": "<PARENT_SECTION_TAG>",
  "briefFile": "output/quick-takes/c<XX>_<QT_SLOT>_brief.md",
  "headline": "<working headline string>",
  "reporter": "<Reporter Full Name OR null>",
  "desk": "<desk-slug>",
  "outputPath": "output/quick-takes/c<XX>_<QT_SLOT>.md"
}
```

### Field rules

| Field | Type | Constraint |
|-------|------|------------|
| `slot` | string | `QT1`, `QT2`, etc. |
| `section` | string | Parent section the QT routes into at compile — `CIVIC`, `SPORTS`, `CULTURE`, etc. NOT `QUICK_TAKES` (no such section per [[EDITION_FORMAT_TEMPLATE]]). |
| `briefFile` | string | `output/quick-takes/c{XX}_{QT_SLOT}_brief.md`. Resolves at dispatch-emit time. |
| `headline` | string | Real working headline. Same rules as articles[].headline. |
| `reporter` | string OR null | Optional — QTs may be reporter-less (desk default voice writes them). When null, desk default voice handles. |
| `desk` | string | Always set, even when reporter is null. Identifies the desk-agent that compiles the QT. |
| `outputPath` | string | `output/quick-takes/c{XX}_{QT_SLOT}.md`. |

---

## `letters` shape

One letters object per dispatch. Letters-desk LENS owns final selection; this is candidate-pool pointer + second-stage handoff note.

```json
{
  "candidatesFile": "output/letters/c<XX>_candidates.md",
  "deskAssigned": "letters-desk",
  "secondStageHandoff": "/write-edition Step 3.5b"
}
```

### Field rules

| Field | Type | Constraint |
|-------|------|------------|
| `candidatesFile` | string | `output/letters/c{XX}_candidates.md`. Resolves at dispatch-emit time. Contains FILTERED candidate pool (rest-cycle excluded — closes G-W39). |
| `deskAssigned` | string | Always `"letters-desk"`. |
| `secondStageHandoff` | string | Always `"/write-edition Step 3.5b"`. Indicates the post-compile regeneration step where letters brief gets re-emitted with named-piece references. Closes G-W33. |

---

## Downstream consumer requirements

Each consumer reads a specific subset of fields. Producers MUST emit all required fields for all consumers.

### `/write-edition` Step 1

**Required:** `articles[]` (every field), `letters` (every field), `quickTakes[]` (every field), `cycle`, `edition`.

**Optional:** `notes`, `spine`, `engineSignalsCovered`, `engineSignalsUncovered`.

**Failure mode:** missing `articles[].briefFile` → launch aborts. Missing `articles[].desk` → no fallback (REPORTER_DESK_INDEX fallback retired with /sift v2). Missing `letters.candidatesFile` → letters-desk launch aborts.

### `djDirect.js` Step 0 (photo mapping)

**Required:** `articles[].section`, `articles[].slot`, `articles[].headline`. Plus `cycle`.

**Optional:** everything else.

**Failure mode:** title-match against compiled edition fails → fall back to slot-order mapping (pipeline.29 §djDirect — defense in depth). Underscored `section` form prevents G-PR6 silent-drop.

### Reviewer lanes (Rhea / cycle-review / Mara / capability / Final Arbiter)

**Required:** `articles[]` (slot, section, reporter, headline, briefFile), `cycle`, `proposalsFile`.

**Optional:** everything else.

**Failure mode:** missing `articles[].briefFile` → can't cross-verify brief against produced article.

---

## Exemplars

### Canonical exemplar (placeholders)

`docs/media/examples/dispatch_canonical_example.json` — placeholder-filled per ADR-0006 Contract A. When a producer fills the placeholders with real values, the result parses clean against this schema's regex (when parser ships). Lives at a committed path per ADR-0006 §Decision Contract A stable-path requirement (NOT in gitignored `output/`).

### Worked example (C94 real values)

`docs/media/examples/dispatch_c94_worked_example.json` — derived from `output/sift_proposals_c94.json` S221 locked slate. Real reporter names, real headlines, real INITs. Shows the schema in action for a human reader. NOT the canonical exemplar — the placeholders version is.

---

## Validation script (Contract B — fail loud)

Future tooling reference. NOT shipped this commit — Task 6 (SKILL.md v2.0 rewrite) decides whether to ship a `scripts/validateDispatch.js` companion at v2 cutover, or whether /write-edition Step 1 carries inline validation.

Either way, per ADR-0006 Contract B:

- Validator MUST exit non-zero on missing required fields.
- Validator MUST exit non-zero on `briefFile` paths that don't resolve.
- Validator MUST exit non-zero on `section` value off-allowlist.
- Validator MUST exit non-zero on `headline` set to `untitled` / `TBD` / `placeholder` / empty.
- Validator MUST surface expected-vs-got snippets with file paths + line numbers (where applicable) in stdout.

---

## What this schema explicitly removes from C94's ad-hoc shape

The C94 `sift_proposals_c94.json` (S221 hand-run) carried these structural quirks that v2 dispatch.json must NOT inherit:

1. **`headline_working` field** — renamed to `headline`. Working-vs-final distinction lives in the brief, not in dispatch.
2. **`section: "FRONT PAGE"` (spaced display label)** — replaced by `section: "FRONT_PAGE"` (underscored routing form).
3. **`section: "CITY"`** — replaced by `section: "CIVIC"` (CIVIC is the [[EDITION_FORMAT_TEMPLATE]] canonical label).
4. **`leadReporter` field** — renamed to `reporter`. v2 has no "lead" vs "secondary" — one reporter per slot.
5. **`leadReporter: "culture-desk default (Maria Keen if available; Jax Caldera fallback)"`** — fallback chain in a single string. v2 resolves at /sift time and emits the single resolved name. If no reporter is assignable, dispatch fails loud.
6. **`baselineDecisions[]`** — that's `sift_proposals_c{XX}.json` content, not dispatch.json. Dispatch carries the LOCKED slate only; baseline triage stays in proposals JSON.
7. **`slateMath` object** — stays in `sift_proposals_c{XX}.json`. dispatch.json is the launch contract, not the slate analytics.
8. **`e93_errata_applied` array** — same: editorial commentary belongs in proposals JSON, not in dispatch.

---

## Changelog

- 2026-05-23 (S228, research-build) — Schema initial draft. pipeline.24 Task 4. Top-level + articles[] + quickTakes[] + letters shape locked. Section enum aligns with [[brief_template_v2]] underscored routing form. Reconciled plan's `{briefFile, reporter, desk, section, slot, headline}` with existing /write-edition Step 1 `{brief_path, reporter, desk_agent, voice_directive, output_path}` expectations — v2 names are canon, deprecated names mapped per consumer requirements section. Closes G-W30 (dispatch.json not emitted) and G-PR2 (untitled-title break of djDirect.js) structurally. Canonical exemplar + C94 worked example ship same commit per ADR-0006 Contract A.
