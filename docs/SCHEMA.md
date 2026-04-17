---
title: GodWorld Documentation Schema
created: 2026-04-14
updated: 2026-04-17
type: reference
tags: [architecture, infrastructure, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md (Phase 41.1)
  - Hermes Agent llm-wiki skill (S145 research)
  - Karpathy skills repo (S145 research)
pointers:
  - "[[index]] — companion catalog of all docs"
  - "[[engine/ROLLOUT_PLAN]] — Phase 41 source"
  - "MEMORY.md — persistent-memory layer index (separate system)"
---

# GodWorld Documentation Schema

**The conventions every session uses to read, write, and find docs.**

---

## 1. Purpose

This file is the contract for `docs/`. It tells every terminal — research/build, engine/sheet, media, civic — how files are named, where they live, what their frontmatter says, and how they link to each other.

Read this at boot, before creating any new doc. Read it again before renaming or moving one. The companion file `docs/index.md` catalogs every active doc with a one-line summary; this file says what shape those docs take.

The principle: **retrieval, not recall.** When the project knows where things live, capacity grows. When every session has to grep, capacity collapses. Schema + index together are the wiki layer that makes the rest of the project legible.

---

## 2. File naming

| Convention | When to use | Examples |
|---|---|---|
| `ALL_CAPS.md` | Top-level reference docs that other docs point to | `SCHEMA.md`, `ARCHITECTURE_VISION.md`, `STACK.md`, `ROLLOUT_PLAN.md` |
| `lowercase_with_underscores.md` | Working files, criteria, templates | `brief_template.md`, `story_evaluation.md`, `intake.md` |
| `PREFIX_NAME.md` | Phase or topic-scoped reference inside a subfolder | `PHASE_24_PLAN.md`, `EDITION_PIPELINE_v1_archive.md` |
| `index.md` (lowercase) | Catalog files at folder roots | `docs/index.md` |

Rules:
- No spaces. No hyphens unless replacing hyphens that appear in the conceptual name (e.g. `mags-corliss/` for the persona).
- Extension is always `.md`.
- Don't repeat the folder in the filename. `docs/engine/ENGINE_MAP.md` is fine; `docs/engine/engine_engine_map.md` is not.
- Personal/persona files live in their own subfolder (`docs/mags-corliss/`, `docs/mara-vance/`) — names inside follow the same casing rules.

---

## 3. Frontmatter standard

Every new doc gets a YAML frontmatter block at the top. Optional for legacy files — backfill opportunistically, don't sweep.

```yaml
---
title: Human-readable title
created: YYYY-MM-DD
updated: YYYY-MM-DD
type: reference | plan | entity | concept | archive
tags: [domain1, domain2, status]
sources:
  - path or URL or Supermemory doc ID this doc draws from
pointers:
  - "[[other-doc]] — what it adds"
  - "external/file.md — relationship"
---
```

Fields:
- **title** — what humans say when they refer to it
- **created / updated** — `YYYY-MM-DD`. Update `updated` whenever you edit content (not whitespace)
- **type** — one of the five page types (§4)
- **tags** — controlled vocabulary from §5
- **sources** — where the content came from (other docs, papers, Supermemory IDs, URLs). Lets future sessions trace claims
- **pointers** — what this doc relies on or extends. Outbound links the index can build a graph from

Light enforcement: new docs should have it; old docs are fine without until someone touches them.

---

## 4. Page types

Five categories. Pick one for `type:`. Determines where the file lives and how it's indexed.

| Type | What it is | Folder hint | Examples |
|---|---|---|---|
| **entity** | A specific person, business, place, or asset in the world | `media/`, `mara-vance/`, named directly | `RICHMOND_ARCHIVE_INDEX.md`, `2041_athletics_roster.md` |
| **concept** | A principle, framework, or vision | `docs/` root | `PRODUCT_VISION.md`, `ARCHITECTURE_VISION.md`, this file |
| **reference** | A how-to, manifest, or operational guide | `docs/`, `reference/`, `engine/` | `STACK.md`, `DEPLOY.md`, `SHEETS_MANIFEST.md` |
| **plan** | An in-flight or proposed plan with a known endpoint | `engine/`, `plans/` | `ROLLOUT_PLAN.md`, `PHASE_24_PLAN.md` |
| **archive** | Frozen, completed, or superseded | `archive/`, `*_v1_archive.md` suffix | everything in `docs/archive/` |

A doc can shift type over its life (a plan becomes archive when complete). Move it physically and update `type:` together.

---

## 5. Tag taxonomy

Controlled vocabulary for the `tags:` field. Use lowercase, no spaces (hyphens OK).

**Domain tags** (what the doc is about):
- `civic` — city hall, council, initiatives
- `engine` — simulation phases, ledgers, code
- `sports` — A's, Bulls, athletes
- `media` — newsroom, editions, desk reporters
- `citizens` — population, ledger entities, characters
- `research` — papers, evals, external tools
- `architecture` — design decisions, system shape
- `infrastructure` — deployment, ops, monitoring
- `persona` — Mags, Mara, agent personas

**Status tags** (where it is in its lifecycle):
- `active` — load-bearing, current
- `draft` — proposed, not yet adopted
- `archived` — frozen, kept for history
- `deprecated` — superseded, scheduled for removal

**Type tags** mirror page types from §4 (`entity`, `concept`, `reference`, `plan`, `archive`) — useful when you want a tag without parsing frontmatter.

A doc usually carries 2–4 tags. One status, one or two domains, optionally a type.

---

## 6. Wikilinks convention

Inside `docs/`, link to other docs with **double brackets**:

```markdown
See [[engine/ROLLOUT_PLAN]] for the active build plan.
The principle is documented in [[PRODUCT_VISION]] §3.
```

- Path is relative to `docs/`. Drop the `.md` extension.
- Target must exist. Broken `[[]]` is a bug.
- For external links (URLs, repo files outside `docs/`), use standard markdown: `[label](path)`.

Why double brackets: future tooling (graph view, backlinks panel, dead-link audit) can parse them cleanly. We don't have the tooling yet, but writing in the convention now means it'll work the day we add it.

---

## 7. Folder map

```
docs/
├── SCHEMA.md              — this file
├── index.md               — catalog of every active doc
├── *.md                   — top-level concept + reference (PRODUCT_VISION, STACK, etc.)
├── engine/                — engine internals: phase plans, ledger maps, rollout
├── media/                 — newsroom artifacts: criteria, indexes, style guides
├── mags-corliss/          — Mags persistence: journal, persona, newsroom memory
├── mara-vance/            — Mara persistence: persona, audit history, op manual
├── reference/             — operational how-tos: deploy, recovery, drive guide
├── plans/                 — in-flight plans not yet promoted to engine/
├── archive/               — frozen, read-only history
└── drive-files/           — binary artifacts (PDFs, source papers); not navigation targets
```

Where to put a new doc:
- Engine code, phases, ledgers → `engine/`
- Editorial, desks, criteria, citizen indexes → `media/`
- Persona-owned (Mags or Mara) → that persona's folder
- Operational how-to → `reference/`
- Top-level vision, architecture, schema → `docs/` root
- When in doubt → root, then move it once a folder pattern emerges

---

## 8. Page thresholds

Length thresholds are about cognitive load, not strict limits.

- **~500 lines** — consider splitting. Pull stable sections into named subfiles, leave the parent as a coordinator.
- **~1000 lines** — must split. A doc this long is unread.
- **Frequent edits to one section** — pull that section into its own file. Edit churn signals it deserves to be standalone.

When to archive (move to `docs/archive/` and set `type: archive`):
- Plan is complete and superseded by a newer plan
- Reference is for a system that no longer exists
- Phase is closed and details only matter for history

Archive doesn't mean delete. It means "frozen, kept for trail."

---

## 9. Pointers, not recall (S145 principle)

Codify what we learned in S145: store pointers inline at every reference. Never expect future sessions to reconstruct.

**What to embed:**
- Local file paths (`docs/engine/ROLLOUT_PLAN.md`)
- Drive file IDs (`1QoV1eWy28lYbPa2vtkuOqp1wIZcvxtJS`)
- Supermemory doc IDs (`n5cBYS3vVN5DKrddnNp7K8`)
- Phase tags (`Phase 41.1`)
- Source URLs and repo paths

**Where to embed them:**
- Inside `sources:` and `pointers:` frontmatter
- Next to every claim that's not self-evident in the prose
- In rollout plan headers, journal entries, MEMORY.md entries

**Five warnings about pointer rot** (the cost of this practice):
1. **Renames break pointers.** When you rename a doc, grep for the old path and update every referrer. The index is the first place to update.
2. **Deletions break pointers.** Don't delete a referenced doc — archive it instead, and update referrers to the archive path.
3. **External IDs change less than you think.** Drive IDs, Supermemory IDs, GitHub commit hashes are stable. Trust them. URLs to live pages are not — prefer permalinks.
4. **Pointers to lines rot fast.** `file.md:147` is wrong after the next edit. Prefer section anchors (`file.md §3`) or quoted phrases.
5. **A pointer that can't be resolved is worse than no pointer.** If you can't verify the target exists at write-time, don't write the pointer.

---

## 10. Index discipline

`docs/index.md` is the catalog. It is the single map of what exists in the project.

Rules:
- **New file → add an index entry in the same commit.** Not later. The index is only useful if it's complete.
- **Renamed file → update the index entry.** Same commit as the rename.
- **Deleted or archived file → remove from active section, add to archive section if kept.**
- **No orphans.** Every active `.md` in `docs/` (excluding `archive/` and `drive-files/`) appears in the index. If it doesn't, either index it or remove it.

The index is not a substitute for this file. SCHEMA defines structure; index lists instances.

---

## 11. Skills frontmatter

Skills (`.claude/skills/*/SKILL.md`) are a different artifact type from `docs/` files. Claude Code already enforces minimal frontmatter (`name`, `description`) on them. This section codifies the GodWorld extension — fields that make skills self-describing and queryable without forcing a deep read. (Phase 41.4, S156.)

**Required on every skill:**

| Field | What | Example |
|-------|------|---------|
| `name` | Slug — must match directory name | `write-edition` |
| `description` | One sentence — what + when to invoke | `Compile a cycle's edition from desk outputs. Run after /sift.` |
| `version` | Semver-ish `X.Y` — bump minor on behavior change, major on contract change | `1.3` |
| `updated` | `YYYY-MM-DD` of last meaningful edit | `2026-04-17` |
| `tags` | Controlled vocab from §5 — flat list | `[media, active]` |
| `effort` | `low` / `medium` / `high` — session budget hint | `medium` |

**Optional, use when applicable:**

| Field | When |
|-------|------|
| `allowed-tools` | Restrict tool access — e.g. `Bash(node *)` for `save-to-mags` |
| `argument-hint` | UX hint for slash-command invocation |
| `disable-model-invocation` | Gate model use |
| `related_skills` | Flat list of skill names this one chains to or is commonly paired with |
| `sources` | Path/URL of motivating research, papers, or prior docs |

**Deliberately not used (hermes-specific, skipped per 41.4 rollout):**
- `license` — not relevant to our skills
- Nested `metadata.hermes.*` — we flatten to top level (closer to `agentskills.io` open standard)

Light enforcement: same rule as §3. New skills carry the full required set. Legacy skills backfill opportunistically via the full-sweep rollout item.

---

## 12. Changelog

Files that evolve carry a changelog at the bottom. Pattern already used in `docs/media/story_evaluation.md`, `brief_template.md`, `citizen_selection.md`.

Format:

```markdown
---

## Changelog

- 2026-04-14 — Initial draft (Phase 41.1).
- 2026-04-XX — Added §N on [topic]. Reason: [why].
```

Date + one-line what-changed + reason if non-obvious. Newest at top or bottom — pick one per file and stay consistent. (This file uses bottom-newest.)

Not every file needs one. Reference docs that get rewritten as a whole don't. Criteria files, plans, schemas, and any doc with multiple authors over time should have one.

---

## Changelog

- 2026-04-14 — Initial draft (Phase 41.1, S146). Eleven sections. Approved structure-first by Mike before write. Companion file `docs/index.md` written same session. Wired into CLAUDE.md, boot skill, and research-build TERMINAL.md.
- 2026-04-17 — Added §11 Skills frontmatter (Phase 41.4, S156). Required fields: name, description, version, updated, tags, effort. Optional: allowed-tools, argument-hint, disable-model-invocation, related_skills, sources. Hermes `license` + nested `metadata.hermes.*` deliberately skipped. Prior §11 (Changelog) renumbered to §12.
