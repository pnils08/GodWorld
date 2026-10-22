---
title: Codex engine.310 diff gate 3
created: 2026-10-21
updated: 2026-10-21
type: plan
tags: [engine, draft]
sources: [docs/research/2026-10-21-engine310-diff-gate3-TASK.md]
---
- **1 Push — FIX:** No control-flow bypass of the post-dry-run C113 gate; wrong top-level Cycle/vs and nonempty `hold` are rejected. But `need.every(k => k in d)` accepts every required readback as `null` (verified against the exact expression), so a C113-shaped file with no usable EA/business/spot evidence still authorizes push. Require typed, nonempty/finite readbacks and C112/C113 component keys before the existing pinned deployment and pull-back path. `output/engine-sheet/2026-10-21-push-e310-prod.sh:31-51`; `output/engine-sheet/2026-10-21-e306-livewatch.js:119-125,191-197`.
- **2 Watch — FIX:** Pinned `ffad3bf8` regexes and the C112 dry run are sound; map EA blanks/NaN and non-list WorldEvents now register missing. `StorySeedCount=null` still passes as numeric zero (`Number(null)===0`), and a missing Neighborhood_Map header returns `s` before `ea` exists, so `diff` throws at `Object.keys(s.ea)` instead of writing HOLD. Reject null/counts below zero, keep a complete missing-state shape, and call HookText output an observed estimate: `h.hook` can override a matching saved `h.text`, so `baseLow` is not necessarily a lower bound. `output/engine-sheet/2026-10-21-e310-c114watch.js:21-22,30-53,61-70,82-102`; `phase08-v3-chicago/v3NeighborhoodWriter.js:331-334`; `output/engine-sheet/2026-10-21-e310-c114watch-c112-dryrun.json:29-49`.
