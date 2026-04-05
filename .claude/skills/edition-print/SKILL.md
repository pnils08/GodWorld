---
name: edition-print
description: Post-publish print pipeline — photos, PDF, Drive upload. Runs after write-edition publishes.
effort: low
disable-model-invocation: true
argument-hint: "[edition-number]"
---

# /edition-print — Print Pipeline

## Usage
`/edition-print [edition-number]`

## The Principle

The edition is published. The text is canon. This skill turns it into something you can hold — photos, a PDF, files on Drive.

**DJ Hartley** is the art director for this step. His identity (`.claude/agents/dj-hartley/IDENTITY.md`) defines how photos are conceived — what's worth shooting, the mood, the composition. His team (Arman Gutiérrez for portraits, Brianna Lee for community) handles assignments. DJ reads the articles and produces art direction; the image generator executes it.

Runs in its own terminal. Does not touch the edition text.

## Prerequisites
- Edition published at `editions/cycle_pulse_edition_{XX}.txt`
- Edition uploaded to Drive and ingested to Supermemory (write-edition Step 8)
- Media production log exists: `output/production_log_edition_c{XX}.md`

## Step 0: Production Log

Read the existing media production log: `output/production_log_edition_c{XX}.md`. Append:

```markdown
## Print Pipeline
**Started:** {timestamp}
**Edition:** {XX}
**Status:** IN PROGRESS

### Photos
[filled in at Step 1-2]

### PDF
[filled in at Step 3]

### Upload
[filled in at Step 4]
```

## Step 1: Art Direction (DJ Hartley)

DJ reads each article and decides what to photograph. For each article with a visual scene:

1. Read DJ's identity: `.claude/agents/dj-hartley/IDENTITY.md`
2. DJ produces art direction per article: thesis, mood, motifs, composition, image_prompt (120-180 words)
3. Assign photo credit: DJ Hartley (games, bars, waterfront, light), Arman Gutiérrez (portraits), Brianna Lee (community)

**Current implementation:** `generate-edition-photos.js` handles this in one step.
**Future (Phase 21.3):** Local LLM runs DJ's art direction, separate image generator executes the prompt.

```bash
node scripts/generate-edition-photos.js editions/cycle_pulse_edition_{XX}.txt
```

Output to `output/photos/e{XX}/`.

## Step 2: Photo QA (DJ reviews)

```bash
node scripts/photoQA.js output/photos/e{XX}
```

Claude Haiku Vision evaluates each photo against article context — DJ's quality check. Pass/flag/fail. Fix or regenerate flagged photos.

## Step 3: PDF

```bash
node scripts/generate-edition-pdf.js editions/cycle_pulse_edition_{XX}.txt
```

Generates tabloid-format PDF. Output to `output/pdfs/bay_tribune_e{XX}.pdf`.

## Step 4: Upload

```bash
node scripts/saveToDrive.js output/pdfs/bay_tribune_e{XX}.pdf edition
```

Uploads PDF to Drive edition folder.

## Step 5: Verify

Check all outputs exist:
- `output/photos/e{XX}/` — photos generated
- `output/pdfs/bay_tribune_e{XX}.pdf` — PDF generated
- Drive upload confirmed

Done. Print pipeline complete.
