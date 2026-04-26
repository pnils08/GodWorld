---
name: edition-print
description: Post-publish print pipeline — photos, PDF, Drive upload. Type-aware — invocable from /write-edition, /interview, /dispatch, /write-supplemental.
version: "1.1"
updated: 2026-04-26
tags: [media, active]
effort: low
disable-model-invocation: true
argument-hint: "[--type edition|interview|supplemental|dispatch] [--cycle XX] [--source <path>]"
---

# /edition-print — Print Pipeline

## Usage

`/edition-print --type <type> --cycle <XX> --source <path>`

Flags:
- `--type {edition|interview|supplemental|dispatch}` — defaults to `edition` (back-compat).
- `--cycle <XX>` — engine cycle number.
- `--source <path>` — path to the published `.txt`. Defaults to `editions/cycle_pulse_<type>_<cycle>_<slug>.txt` for non-edition; `editions/cycle_pulse_edition_<cycle>.txt` for edition.

Triggerable from: `/write-edition` post-publish chain, `/interview`, `/dispatch`, `/write-supplemental`. The four authoring skills converge here for visual assets the same way they converge on `/post-publish` for canon ingest.

## The Principle

The artifact is published. The text is canon. This skill turns it into something you can hold — photos, a PDF, files on Drive.

**DJ Hartley** is the art director for this step. His identity (`.claude/agents/dj-hartley/IDENTITY.md`) defines how photos are conceived — what's worth shooting, the mood, the composition. His team (Arman Gutiérrez for portraits, Brianna Lee for community) handles assignments. DJ reads the `.txt` and produces art direction; the image generator executes it.

DJ four-file canon-fidelity structure (S175) is LOCKED — the print pipeline wires AROUND DJ; do not modify his agent files.

Runs in its own terminal. Does not touch the artifact text.

## Per-type photo budget

| Type | Photos | Why |
|------|--------|-----|
| edition | 5–8 | Multi-article, full visual layout — DJ's standard workflow |
| supplemental | 1–3 | Topic deep-dive, fewer scenes |
| interview | 1–3 | One subject — typically a portrait + 1–2 supporting scenes |
| dispatch | 1–3 | One scene — single dominant image with optional supporting frames |

Budget is enforced by `generate-edition-photos.js --type` (engine-sheet T9).

## Prerequisites

- `<source>` `.txt` exists at the path the matching authoring skill wrote it to (T1 schema)
- Source uploaded to Drive (handled by `/write-edition` Step 6 for editions; non-edition Drive upload moves into Step 4 of this skill — single Drive upload point)
- Production log exists: `output/production_log_edition_c<XX>.md`

## Where This Sits

Runs after the authoring skill (`/write-edition`, `/interview`, `/dispatch`, or `/write-supplemental`). Parallel with `/post-publish`. Both run independently — print produces visual assets, post-publish handles ingest and feedback.

Full chains:
- Edition: `/write-edition` → `/edition-print --type edition` + `/post-publish --type edition`
- Non-edition: `/<authoring-skill>` → `/edition-print --type <type>` + `/post-publish --type <type>`

## Step 0: Production Log

Read the existing media production log: `output/production_log_edition_c<XX>.md`. Append:

```markdown
## Print Pipeline (<type>)
**Started:** {timestamp}
**Type:** <type>
**Source:** <path>
**Status:** IN PROGRESS

### Photos
[filled in at Step 1-2]

### PDF
[filled in at Step 3]

### Upload
[filled in at Step 4]
```

## Step 1: Art Direction (DJ Hartley)

DJ reads the `.txt` and decides what to photograph. For each scene with visual potential:

1. Read DJ's identity: `.claude/agents/dj-hartley/IDENTITY.md`
2. DJ produces art direction per scene: thesis, mood, motifs, composition, image_prompt (120-180 words)
3. Assign photo credit: DJ Hartley (games, bars, waterfront, light), Arman Gutiérrez (portraits), Brianna Lee (community)

```bash
node scripts/generate-edition-photos.js <source> --type <type>
```

Photo count honors the per-type budget table above.

Output to `output/photos/<type>_c<XX>/` (edition keeps the legacy `output/photos/e<XX>/` path for back-compat).

**Current implementation:** `generate-edition-photos.js` handles this in one step.
**Future (Phase 21.3):** Local LLM runs DJ's art direction, separate image generator executes the prompt.

## Step 2: Photo QA (DJ reviews)

```bash
node scripts/photoQA.js output/photos/<type>_c<XX> --type <type>
```

Claude Haiku Vision evaluates each photo against article context — DJ's quality check. Pass/flag/fail. Fix or regenerate flagged photos (1 retry, then editorial flag per S176 plan).

## Step 3: PDF

```bash
node scripts/generate-edition-pdf.js <source> --type <type>
```

Generates tabloid-format PDF using the masthead block from the `.txt` header (already standardized via T1). Output to `output/pdfs/bay_tribune_<type>_c<XX>.pdf` (edition keeps legacy `output/pdfs/bay_tribune_e<XX>.pdf`).

## Step 4: Upload to Drive

```bash
node scripts/saveToDrive.js output/pdfs/bay_tribune_<type>_c<XX>.pdf <type>
```

Uploads PDF to Drive. Folder routing per `--type`: editions go to existing edition folder; interviews/supplementals/dispatches route to non-edition subfolder OR same folder with type-prefixed filename (engine-sheet T9 picks the implementation).

Photos also upload if Drive destination configured.

## Step 5: Dashboard Update

Edition path only — the dashboard uses the edition PDF for its UI:
- PDF available at `output/pdfs/bay_tribune_e<XX>.pdf` for dashboard to serve
- Edition card reflects current cycle

Non-edition types: skip. Dashboard surfaces editions, not alternate-start formats (yet).

## Step 6: Verify

Check all outputs exist:
- `output/photos/<type>_c<XX>/` — photos generated, count within budget
- `output/pdfs/bay_tribune_<type>_c<XX>.pdf` — PDF generated
- Drive upload confirmed
- Dashboard reflects current edition (edition only)

Done. Print pipeline complete.

## Changelog

- 2026-04-17 — Initial 6-step skill (S156).
- 2026-04-26 — v1.1 (S180, research-build). Type-aware: `--type {edition|interview|supplemental|dispatch}` flag added. Per-type photo budget table (1–3 for non-edition, 5–8 unchanged for edition). Triggerable from all four authoring skills. Plan [[plans/2026-04-26-non-edition-publishing-pipeline]] T4.
