---
name: build-world-summary
description: Mechanical data assembly after a cycle run. Reads sheets + engine-review, produces world summary document. No editorial judgment.
effort: medium
---

# /build-world-summary — World Summary Assembly

## Purpose

Assemble a factual world summary from engine output. No editorial judgment. No story picks. Just: what happened in the world this cycle.

This document is what Mags and Mike sift from together in `/sift`.

## Inputs

Read from sheets via service account:

- **Riley_Digest** — current cycle + previous 2 cycles (3 total for trend detection)
- **Oakland_Sports_Feed** — current cycle + previous 2 cycles (Mike's hand-written entries — treat as gospel)

Read from disk:

- **Civic production log** — `output/production_log_city_hall_c{XX}.md` (if city-hall has run)
- **Engine review** — `output/engine_review_c{XX}.md` (ailments, improvements, incoherence from `/engine-review`)

## What Goes In the Summary

Follow the C91 template at `output/world_summary_c91.md`. Sections:

1. **Header** — cycle number, season, weather, cycle weight, civic load, pattern flag, shock flag
2. **City State** — population, employment, economy, sentiment, traffic, retail, tourism, nightlife, domain counts
3. **Civic Decisions** — from city-hall production log. Locked canon. Copy, don't reinterpret.
4. **Sports** — from Oakland_Sports_Feed. Mike's entries verbatim. Player stats, records, arcs.
5. **Evening Texture** — famous people, restaurants, fast food, nightlife, city events, evening media, streaming
6. **World Events** — from Riley_Digest. Health, civic, safety, faith events with severity and neighborhood.
7. **Three-Cycle Trends** — compare current + previous 2 cycles. What's recurring, escalating, improving, or new.
8. **Engine Review Findings** — from engine-review output. Ailments, improvements, incoherence. Summarize, don't repeat the full 7-field briefs.
9. **Approval Ratings** — from civic production log or Civic_Office_Ledger.

## Output

Write to `output/world_summary_c{XX}.md`

Then ingest to world-data Supermemory:
```bash
npx supermemory add "$(cat output/world_summary_c{XX}.md)" --tag world-data --metadata '{"type": "cycle_summary", "cycle": {XX}}'
```

## What This Skill Does NOT Do

- Pick stories — that's `/sift`
- Judge what matters — that's `/sift`
- Frame articles — that's `/sift` and `/write-edition`
- Check engine code — that's `/pre-mortem`
- Diagnose world state — that's `/engine-review`

## Where This Sits

Step 5 in the run-cycle chain. After engine-review. Before city-hall and sift.

## Sheet Access

Service account via `lib/sheets.js`. Spreadsheet ID from `.env`.
