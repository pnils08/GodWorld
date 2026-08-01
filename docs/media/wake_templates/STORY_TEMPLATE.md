# Story Template — the one growing document per cron story

Task 2.5.3 of [[../../plans/2026-07-20-headless-newsroom-pipeline]] (Mike-direct S344).
Uniformity rule: scripts and searches work only if what each wake completes is
UNIFORM — every reporter, every desk, same artifact shape. `cron-desk-run.js`
materializes this template as `output/cron-compare/<stem>story.md`: wake 1
opens it, wakes 2–3 append in order. The doc is the per-story audit trail the
Saturday compile reads.

| Section | Wake | Written by | Content |
|---|---|---|---|
| §1 ASSIGNMENT | 1 | script (deterministic, from the fanout entry) | Assigned angle + hook + affected citizens + source ref + desk approach (`scripts/desk-approach-map.json`). Open-beat marker when the seed pool was exhausted. |
| §2 THE REPORTER'S PLAN | 1 | reporter (citizenVoice, their own words) | How they chase the assigned angle today — what to verify, who to talk to. Personas keep their authored smells-off stance instead. |
| §3 INTERVIEWS | 2 | script (real citizenVoice quotes) | The assignment's affected citizens first (Task 2.5.4), lane popids as fallback. No quotes landed → an explicit do-not-invent marker. |
| §4 THE ARTICLE | 3 | script | Draft path + disposition + Rhea verdict. The article itself is the draft file; the wall (canon facts immutable, color free) is injected in the writer state. |

**The color doctrine carried by every wake** (S344, reaffirms
`project_subjective-hallucination-is-canon`): facts from the record — names,
ages, roles, neighborhoods, numbers, events — are load-bearing and immutable;
scene texture, weather, unnamed street life are the reporter's to invent freely
so long as nothing contradicts. Additive invention IS the product; contradiction
and real-world import are the only sins.

**All 2.5.3 mechanics live (S347):** §2b canon research — the script gathers the
floor (edition grep + world-summary slices + evidence ref), the model selects
≥3 facts through the bounded tool loop, and a deterministic validator enforces
count / resolving refs / ≥2 sources / ≥1 pre-cycle deep thread (script-fallback
on double failure, never blocks the wake). Wire pulse — staged filings prepend
one line under `## Newsroom wire` in `production_log_c{XX}.md`; wake 3 reads it
(don't re-report). Self-scoring footer — the `<!-- SELF-SCORE: … -->` comment,
checked deterministically into `wake.json` (`footerPresent`); the Saturday
compile scores against it. Wake-1 validated facts also ride into the Rhea gate
(`--canon-facts`) as verified prior coverage — cited history is not a
current-cycle contradiction.
