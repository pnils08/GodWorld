---
title: Codex engine.310 diff gate 4
created: 2026-10-21
updated: 2026-10-21
type: plan
---
- **1 Push — SHIP:** The C113 gate now rejects wrong Cycle/vs, held verdicts, null/empty EA readbacks, missing 112/113 component objects, malformed spot-line lists, and nonfinite high-water values before push; the saved C112 dry-run shape matches these types. Stage-18 preimage, committed candidate manifest, version and pull-back checks remain in sequence. This is a source gate, not a C113 live read. `output/engine-sheet/2026-10-21-push-e310-prod.sh:16-18,21-29,31-59`; `output/engine-sheet/2026-10-21-e306-livewatch-diff-c112-dryrun.json:1-9,365-366`.
- **2 Watch — SHIP:** `StorySeedCount` now rejects null/blank/nonfinite/negative input; early map-header failure returns a complete snapshot, so `diff` records HOLD; `baseEstimate` correctly labels HookText as an observation rather than a bound. Regexes remain loaded from pinned `ffad3bf8`, and the saved C112 snap has 22 hoods, seed count 35 and estimate 5. C114/C115 live outcomes remain unverified. `output/engine-sheet/2026-10-21-e310-c114watch.js:6-8,21-22,28-32,53-54,67-72,84-105`; `output/engine-sheet/2026-10-21-e310-c114watch-c112-dryrun.json:29-49`.
