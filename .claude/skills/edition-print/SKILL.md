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

The edition is published. The text is canon. This skill turns it into something you can hold — photos, a PDF, files on Drive. Mechanical work, no editorial judgment.

Runs in its own terminal. Does not touch the edition text.

## Prerequisites
- Edition published at `editions/cycle_pulse_edition_{XX}.txt`
- Edition uploaded to Drive and ingested to Supermemory (write-edition Step 8)

## Step 1: Photos

```bash
node scripts/generate-edition-photos.js editions/cycle_pulse_edition_{XX}.txt
```

Generates AI photos for articles with visual scenes. Output to `output/photos/e{XX}/`.

## Step 2: Photo QA

```bash
node scripts/photoQA.js output/photos/e{XX}
```

Claude Haiku Vision evaluates each photo against article context. Pass/flag/fail. Fix or regenerate flagged photos.

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
