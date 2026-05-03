# Story Evaluation Criteria

**Read this before proposing stories in /sift. Updated after each cycle based on what worked.**

Last Updated: S144 (starter version — refine after C92)

---

## What Makes a Story Worth Proposing

### Priority Signals (strongest to weakest)

1. **Engine review ailment with severity** — a recurring problem the city hasn't addressed. The more cycles it's persisted, the higher the priority. This is the game — the player needs to see what's broken.
2. **Civic decision with conflict** — voices disagreed, someone went rogue, a cascade produced unexpected results. Conflict is story.
3. **Mike's sports feed entries** — these are hand-written and intentional. Every entry is a story.
4. **Initiative milestone** — something moved on the tracker. Construction started, a vote passed, a program launched. Change is news.
5. **Three-cycle trend** — something appearing in the world summary across multiple cycles. Escalating, declining, or stuck. Patterns matter more than single events.
6. **Citizen emergence** — a name appearing for the first time or a known citizen in a new situation. People drive stories.
7. **Coverage gap** — something the Tribune hasn't covered in 3+ cycles that citizens would still be talking about. The refrigerator test.

### What Makes a Story Weak

- **Single-layer coverage only.** If you can only frame it as engine OR simulation OR user actions but not at least two of three, it's thin.
- **Repeating last edition's lead.** Don't front-page the same story twice unless something materially changed.
- **No citizens attached.** A story about policy with no person feeling it is a report, not journalism.
- **Press release framing.** If the story is just "official says thing went well," it needs a skeptic or a citizen who disagrees.

### The Three-Layer Test

Before proposing any story, check: can this thread at least two of three layers?

1. **Engine** — what the code is producing (the ailment, the math, the trend)
2. **Simulation** — what citizens experience (lived consequences, neighborhood texture)
3. **User actions** — what was decided and whether it's working (initiatives, votes, programs)

All three = strong. Two = workable. One = weak unless it's a dispatch-style scene piece.

### The Beverly Hayes Standard

The paradigm from E90. One citizen voice covering stabilization fund disbursement mechanics (engine), a home health aide's lived experience of $18,500 (simulation), and Okoro's sequencing logic debate (user actions). Three layers in one letter. That's what a great GodWorld story looks like.

### The E91 Varek Anti-Example

Front page was simulation only — home run moment, fan experience. Missed the Temescal health crisis running for the fourth cycle in the engine. Surface-level compliance without editorial judgment.

---

## Front Page Scoring

The front page lead is the story with the most editorial weight this cycle. Score each proposal:

| Factor | Points | What it measures |
|--------|--------|-----------------|
| Three-layer coverage | 0-3 | How many layers does it thread (engine + simulation + user actions) |
| Arc momentum | 0-2 | Is this a continuing arc with movement, or a standalone? Arcs with history score higher. |
| Severity / stakes | 0-2 | What's at risk? High severity engine ailment or major civic decision scores higher than texture. |
| Freshness | 0-1 | Was this the front page last edition? If yes, 0. If new lead, 1. |
| Cross-source connection | 0-1 | Does this story connect threads from different sources (world + civic, sports + civic)? |
| Citizen impact | 0-1 | Are named citizens feeling this? A faceless policy story scores 0. |

**Max score: 10.** Highest-scoring story is the recommended front page. Present the recommendation. Mike can override.

This scoring is a starter. Update after each cycle based on what actually produced the strongest lead.

---

## How to Present Proposals

For each story proposed, include:

```
STORY: [one sentence — what this is]
SIGNAL: [where this came from — engine review, city-hall, sports feed, trend]
REPORTER: [who fits]
CITIZENS: [who might appear — names from ledger, not invented]
LAYERS: [which of the three layers this covers]
PRIORITY: [HIGH / MEDIUM / LOW]
```

Present 6-10 proposals. Mike picks 5-8. Not every proposal runs. That's the sift — more ideas than slots.

---

## Changelog

_Updated by `/post-publish` Step 10 after each edition. What changed and why._

- S144: starter version created. No cycle data yet.
- S156 (C91 retrospective): first skill-check run — 2/5 passed (A1 Temescal dropped, A2 front-page-vs-engine-signal anti-Varek violation, A3 sports-heavy on civic-heavy cycle). A2 caught a structural failure Mara's report framed as judgment; lines 42-44 (Varek anti-example) are the live rule skill-check reads. Evidence: `output/skill_check_write-edition_c91.json`.
- S170 (C92): skill-check 6/7 (0.857). Front page scene-first, anti-Varek rule held (A5 ✓), sift picks all landed (A1 ✓), front page covered highest-severity engine signals via umbrella (A2 ✓), civic-heavy coverage matched signal weight (A3 ✓), freshness from E91 ✓, citizen verification ✓. **Single fail: A6 — civic citizen-voice gap. OARI and Youth Apprenticeship articles had zero non-official citizens; officials-quoting-officials structure. Beverly Hayes Standard needs to be encoded as hard reviewer check.** Cycle-review did not run independently this cycle (gap). Mara deleted from project. Auto-grader returned rubber-stamp A — EIC override applied B-floor. Evidence: `output/skill_check_write-edition_c92.json`.
- **S195 (C93): NEW SIGNAL — Coverage-Fatigue.** Mike audience verdict C on E93 — 14 cycles of same INIT-001..007, same Mayor cascade, same citizen rotation. Mechanical canon held (Mara A-, Final Arbiter 0.898 PROCEED-WITH-NOTES, capability-gate BLOCK overridden because Transit Hub vote-not-triggered was the real structural-gap story per sift). Editorial product = repetitive. **New rule: no edition runs >3 of the 6 active INIT narratives in the body; bias sift toward neighborhood-texture proposals that don't route through council-vote scaffold.** A Maria Keen piece that opens at a stoop and stays there. A Hal Richmond piece that isn't sports-history but the half-built block on 42nd. A Jax accountability column on something that isn't CRC vs Mayor. Returning-citizen rotation (Patricia Nolan / Beverly Hayes / Lorenzo Nguyen / Gloria Hutchins / Carmen Mesa) read as the "same 10 citizens" failure mode Mike flagged S170 — recurring. Sift Step 4 should bias new POPID introduction toward neighborhood pieces, not council voting. Evidence: NEWSROOM_MEMORY E93 errata block + sift gap log G-S* + write-edition gap log G-W*. **Skill-check formal pass deferred** — token cost vs marginal grading value too high for the C93 run; coverage-fatigue is editorial direction not structural assertion. Re-evaluate when /skill-check is wired into a fast-batch path.
