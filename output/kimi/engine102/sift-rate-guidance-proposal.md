# /sift rate-guidance proposal — engine.102 W5 Task 9 (skill half)

**Date:** 2026-08-10 (kimi) | **For:** control-plane owner (`.claude/skills/` is outside the kimi lane) | **Plan:** [[../../docs/plans/2026-08-08-engine-102-cascade-consistency]] §Task 9

## What this is

Task 9's cron half landed 2026-08-09 (`a65497b6` — `cascadeRateRule` in `scripts/cron-desk-writer.js`). The /sift skill half is the same rule written into `.claude/skills/sift/SKILL.md` so the attended sift path enforces it too. This file is the exact diff, ready to land verbatim.

## Proposed insertion

Insert one new bullet in **Step 3, section "Neighborhood state (S245 — when the piece is set in a neighborhood)"**, immediately after the existing bullet that begins "The engine is the source of truth for what a neighborhood is." (currently the last bullet of that block):

```diff
   - **The engine is the source of truth for what a neighborhood is.** A condition it did not report — displacement, blight, decline, struggle, recovery — does not exist for that neighborhood this cycle. Ground the simulation layer in the figures; do not narrate against them. (This is data-fidelity, not a tone rule: the C95 West Oakland "displacement" front page was written against a literally-empty `HousingPressure` field (pre-S315: `DisplacementPressure`).)
+
+  - **Cascade rate grounding (engine.102 W5 — hard rule, static until cascade support lands).** Never propose or frame a candidate around a bare citywide illness/employment/crisis rate as if it were census fact — the citywide dial is a model face, not ground support. Rate figures enter a brief only attributed to the layer that supports them (ledger counts, hospital census, neighborhood demographics). Migration flows may be cited with the label "city model estimate". This mirrors the `cascadeRateRule` block in `scripts/cron-desk-writer.js` (cron half, `a65497b6`); when engine.102 Tasks 6–7 ground support lands for a metric, this rule relaxes for that metric and both halves flip off together.
```

Indentation note: the target bullet in the file is a top-level `- ` list item; the added bullet keeps the same indent. No other lines change.

## Why it belongs there

- The S245 block is where /sift's numeric-grounding rules already live (engine-as-truth, baseline-brief figures, `get_neighborhood_state`). A rate-fidelity rule is the same discipline class.
- Wording mirrors the shipped cron half verbatim in substance, so attended and headless paths enforce one rule with one flip-off condition — no drift between the two.
- Static-until-support-lands is explicit, so nobody "helpfully" relaxes it early: the relaxation is tied to Tasks 6–7 ground support, not to taste.

## Landing checklist (control-plane owner)

1. Apply the diff above to `.claude/skills/sift/SKILL.md`.
2. Bump the skill's version line and add a one-line version note (pattern: existing `**v2.2 (S301):**` / `**v2.3 (S305, pipeline.42):**` entries) citing engine.102 W5 Task 9.
3. Flip engine.102's rollout row: Task 9 both halves done → row to `done-pending-archive` (rollout-rules §5 sweep).
