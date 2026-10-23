---
title: Engine.308 diff gate review
created: 2026-10-22
type: reference
tags: [engine, review]
sources: [docs/for-claude-review/2026-10-22-engine308-diff-gate-TASK.md]
---
**1. Gate — SHIP.** The standing and pre-RNG gate use the same `bizCount`: active minted IDs plus deduped active Key_Personnel ownership; line cap is living members plus tier step, floor 1. Champion and challengers exclude owners at 2, and a mint adds the ID to the staker map (`phase05-citizens/generationalWealthEngine.js:3011-3035,3062-3083,3116-3132,3220-3245,3291-3298`).
**2. Clock/schema — SHIP.** The 24th header appends on the 23-column tab before the header-resolved read; blank clocks seed from living and archived members' latest parsed stamp, and opening writes the cycle (`phase05-citizens/generationalWealthEngine.js:2581-2587,2695-2707,2751-2769,2973-2998,3209-3218,3295-3303`). The reader list missed `heritageTierByPop_` and `decrementHeritageHomesLate_`, both header-resolved (`:2407-2416,2643-2659`); Phase 4 and education/career call the former (`phase04-events/generationalEventsEngine.js:270-275`; `phase05-citizens/educationCareerEngine.js:1183`).
**3. Bench — SHIP.** H1 pullback matched its manifest and C113–C116 each exited 0/PASS with no opening; clocks 106/109/111/112 and Varek 3/2 match the receipts, while control records Varek Fellowship at C113 with four HOLDs (`output/engine-sheet/2026-10-22-e308-bench-H1.log:2-8,37-46,51-58,63-70,75-82`; `output/engine-sheet/2026-10-22-e308-check-ctl-c116.json:1-6`; `output/engine-sheet/2026-10-22-e308-check.js:50-87`). Positive opening, cooldown edge and staker handoff have local assertions, not an H1 opening receipt (`scripts/householdReconcile.test.js:575-601`).
**4. Push — SHIP.** The script requires a fresh stage-20 pull and preimage, exact benched manifest, clean C112 fire state before push/after pullback/after eight minutes, pinned deployment version and byte-identical PROD pullback (`output/engine-sheet/2026-10-22-push-e308-prod.sh:15-30,32-68`). Its dry run and live checks are reported in the task, not performed in this read-only review.
**Final PROD — SHIP for the reviewed candidate and guarded push; deployment and first live Cycle remain unverified here.**
