---
title: Codex engine.310 diff gate 2
created: 2026-10-21
updated: 2026-10-21
type: plan
tags: [engine, draft]
sources: [docs/research/2026-10-21-engine310-diff-gate2-TASK.md]
---
# Engine.310 diff gate 2

- **1 Push — FIX:** Fresh PROD pull and `2896c46c` writer checks target stage 18; the committed B3 manifest pins the built tree, and deployment/version/pull-back checks follow. No control-flow path reaches `push` without the post-dry-run C113 file check, but that check reads only `verdict`: a wrong-Cycle JSON carrying `ACCEPT-CANDIDATE` passes. Require `cycle===113`, `vs===112`, empty `hold`, and the expected C113 readback fields; keep stage-18 manifest as rollback target with the `2896c46c` writer. `output/engine-sheet/2026-10-21-push-e310-prod.sh:13-34,36-49`; `output/engine-sheet/2026-10-21-e306-livewatch.js:191-197`.
- **2 Watch — FIX:** Riley Q/U/M, Neighborhood_Map EA/Cycle, and HookText/Cycle match their writers, and C112 dry run reads 22 hoods and four staged names. But `read()` never validates the map header/finite EA, `StorySeedCount`, or that parsed WorldEvents is an array; missing values can become zero/NaN while `missing=[]`, allowing CLEAN. Validate those, the prior snapshot's Cycle/hood set, and scan Engine_Errors before truncating display text. The working-tree regexes currently hash-identically to `ffad3bf8`, but pin or hash-check that source so C114 uses the deployed rule. Keep DIAGNOSE as a review signal and C115 migration/trajectory as a separate read; HookText is only a conditional bound when `h.hook` can override `h.text`. `output/engine-sheet/2026-10-21-e310-c114watch.js:20-21,29-61,73-94`; `phase01-config/godWorldEngine2.js:1995-2020`; `phase08-v3-chicago/v3StoryHookWriter.js:64-80`; `output/engine-sheet/2026-10-21-e310-c114watch-c112-dryrun.json:29-49`.
- **3 Judge rerun — SHIP:** Two-sided top-level key comparison, B2t/B3t `pre5` equality, and tap/sheet hood-set equality close the previous bounded receipt gap; per-hood inputs and saved EA still compare and the rerun has zero failures. `output/engine-sheet/2026-10-21-e310-check.js:24,57-79`; `output/engine-sheet/2026-10-21-e310-check.json:239-240`.

**Gate: FIX** push and watch before PROD; bench judge SHIP. Read-only source/saved-receipt review; C113/C114 live behavior remains unverified.
