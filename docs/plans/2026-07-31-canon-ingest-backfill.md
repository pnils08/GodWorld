---
title: Canon Ingest Backfill & Sweep Plan
created: 2026-07-31
updated: 2026-07-31
type: plan
tags: [engine, canon, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md engine.91
  - S345 container audit (claude-mem) — bay-tribune coverage verified live via /v3/documents/list
  - docs/SUPERMEMORY.md — container map + search/save matrix
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout (engine.91)"
  - "[[../SUPERMEMORY]] — container architecture this plan writes into"
  - "[[../OAKLAND_SPORTS_FEED]] — adjacent codex-lane intake work; no overlap, sweep is Supermemory-only"
---

# Canon Ingest Backfill & Sweep

**Goal:** every published artifact is searchable in `bay-tribune`, and ingestion never again depends on a session remembering to run it.

## Why (S345 findings)

Ingest scripts are deterministic and correct; invocation was the failure. 28+ published files (editions 78–82, nearly all supplementals, both C94 interviews) sat on disk un-ingested — the Discord bots' canon-depth gaps traced directly to this. Editions/ is now 100% backfilled (S345: 31 files, 39 docs, 0 errors; E89 6× dupe cut to 1). Remaining exposure: the reporter corpus, Gemini Drive-only pieces, and every FUTURE publish.

## State (verified S345)

- `bay-tribune`: 1,201 docs; `edition-ingest` full-text covers editions 78–101 + all supplementals/interviews/dispatch in `editions/`.
- `ingestEdition.js` sets **no `customId`** → re-runs duplicate (E89 got 6 copies). Fix before any sweep automation.
- Un-ingested sources: `output/reporters/**` (~20 reporter dirs — mix of published articles and drafts/briefs), Deep Canon Drive folder `1qC0tJKCYlpe98sZ2BTRt8GA4OPLIQekt` (Gemini-written, Drive-only).
- `output/drive-files/` (680+ files): **scope call owed by Mike** — searchable canon or archive-only?

## Tasks

| # | Task | Owner |
|---|------|-------|
| T1 | Idempotency: `ingestEdition.js` derives `customId` from `<type>-<cycle>-<slug>-<chunk>`; re-ingest upserts instead of duplicating | engine-sheet |
| T2 | `scripts/sweepCanonIngest.js`: walk configured sources → derive customId per file → diff against `/v3/documents/list` (bay-tribune) → run `ingestEdition.js` per missing → summary report. Deterministic, no LLM. `--dry-run` default | engine-sheet |
| T3 | Published-vs-draft marker for `output/reporters/**`: only files with the engine-intake footer (NAMES INDEX + ARTICLE TABLE) sweep as published; everything else skipped and listed | engine-sheet |
| T4 | Wire sweep as `/post-publish` tail step + weekly cron (dry-run report to Discord; `--apply` on Mike's go until trust is earned) | engine-sheet |
| T5 | Scope decision: `output/drive-files/` in or out of canon search | Mike |
| T6 | Backfill run over T3-qualified reporter corpus + Deep Canon Drive folder once T1–T3 land | engine-sheet |
| T7 | Single-artifact ingest path (kimi P5, 2026-08-03 — `output/kimi/deep-dispatch-guardrail-proposals.md`): the deep-dispatch fork ends at per-desk artifacts with no clean ingest route — post-publish is edition/dispatch-scoped, bulk archiver has no idempotency. Provide a customId-keyed, tag-schema'd single-file ingester (likely `ingestEdition.js` single-file mode on top of T1). Until it lands: no hand-rolled ingest of fork artifacts | engine-sheet |

## Verification

Re-run the S345 container audit (documents/list diff = zero missing for in-scope sources); probe one deep fact per backfilled source via `search_canon`; confirm re-running the sweep twice produces zero new docs (idempotency proof).

## Changelog

- 2026-07-31 — created (S345, engine-sheet) after the editions/ backfill shipped inline.
- 2026-08-03 — T7 added (S353, research-build): single-artifact ingest path for deep-dispatch fork artifacts, from kimi P5.

## Builder ruling 2026-09-27 — T5 scope
"drive files are canon, all pre cycle articles and articles saved pre cron runs are established canon." T5 is
decided: Drive files IN; the backfill (T6) and cron wiring (T4) are unblocked.

## S502 (engine-sheet, 2026-09-28) — T2 rewritten, T6 done; T4 held for the builder's go
Re-survey: the plan's `output/drive-files/` and `output/reporters/` no longer exist; editions and the Saturday
per-article sweep already land with deterministic customIds; the real gap was the two Drive canon folders (none of
their pieces existed as documents — spot-checked by title). **T2:** `scripts/sweepCanonIngest.js` rewritten —
lists every text/Doc file under the Tribune Media Archive (`10Y-X48H…`) and Deep Canon (`1qC0tJKC…`) folders,
diffs `drive-<fileId>-1` against one org-wide `/v3/documents/list` pull, dry-run by default, `--apply` ingests
missing files chunked on paragraph breaks (customId `drive-<fileId>-<n>`, metadata source `drive-canon`), exits 1
on any partial ingest. **T6:** `--apply` ran: 125 files (98 archive + 27 deep canon), 129 chunks, 0 failed; the
re-run reports present 125 / missing 0 (idempotent); a probe search returns the archive piece. **T4 (held):** add
`sweepCanonIngest.js --apply` as a weekly cron so new files dropped in those Drive folders become canon without a
session — needs the builder's go (the plan's own gate). Known follow-ups outside T2: `ingestEditionWiki.js` and
`ingestCivicWiki.js` write bay-tribune with no customId (reruns duplicate).
- 2026-09-28 (engine-sheet S502) — T4 live on the builder's go: crontab `30 17 * * 6 … sweepCanonIngest.js --apply >> logs/canon-sweep.log`, after the 16:00 Saturday run.
