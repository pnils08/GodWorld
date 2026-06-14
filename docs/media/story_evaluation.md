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
- **S222-S223 (C94): Mara B+ / Overall B+ / 6 desks A. Coverage-fatigue framework HELD.** INIT rotation at 3-cap (Baylight Phase 11 in FP1, Transit Hub vote in C1, Stab Fund in OPP statement — no OARI piece, gap flagged for C95). Stoop-anchored pieces shipped: Maria C2 Beverly Hayes anchor, Maria N1 Rev. Han Adams Point opening, Hal S1 Kelley spotlight. Spine = **Ownership Ecosystem** (Civis Systems Field naming + Varek courts Paulson + Baylight Phase 11 building the stadium). Front page Jordan Velez "The Town" threaded all three layers cleanly. **New rule (Mara forward guidance, hard for C95+): every vote-coverage piece ships full 9-member council roster + named absentee.** Carmen C1 reported 8-0+1-absent without naming the 9 votes or absentee Crane D6 — Mara caught it; civic source layer held the vote math but editorial layer dropped it. **New rule (named coverage debt, S2): when a sports/civic figure is named in a sift brief as a debt (P Slayer S2 named Martin Richards), C95 sift must surface them as front-section spine candidate or explicit decline-to-cover.** **OARI INIT-002 stuck 12 cycles without C94 piece — Mara forward signal for C95 sift: OARI vote architecture as front-section spine.** **Brief-led mode (S215) positive findings:** sports-desk identity layer self-pulled Tier-1 Danny Horn POP-00022 from prior coverage unprompted (G-W41); letters-desk LENS rest-cycle rule overrode brief's wrong Hutchins+Iglesias candidates (G-W39, brief was wrong / agent was right). Defense in depth working — when brief is wrong on a constraint, agent identity layer corrects. **Skill-check formal pass: BLOCKED** — /skill-check has `disable-model-invocation: true` per G-P40; criteria-file update came from direct-evidence read this cycle, not from /skill-check JSON. Re-evaluate when frontmatter changes OR /post-publish Step 10 splits. Evidence: NEWSROOM_MEMORY E94 blocks + write-edition gap log G-W30→G-W56 + post-publish gap log G-P26→G-P40.
- **S241 (C95): Mara A / Final Arbiter A weighted 0.836 PROCEED. Mike-E93 fatigue-cure framework held — stoop-stays-on-stoop (Maria CU1 KONO Marcus-on-corner), faith-community texture (Maria CU2 6 organizations across the city), front-office accountability column (Jax O1 Varek-call-not-come — Mike-E93 not-CRC-vs-Mayor rule).** Cycle-spine "three deadlines converged" tied OARI vote + Okoro consolidation + HCAI deadline-met in one cohering sentence; spine carried by ED1 (Mags) into the rest of the paper. **NEW STRUCTURAL FINDING — Print-pipeline contract drift (G-PR-NEW1/2/3):** /write-edition's compiled .txt format diverged from lib/editionParser.js post-S235 commit 37aef8c. Parser expects 4-column ARTICLE TABLE (with Slot column), `### H3` headlines, plain `By X` bylines. /write-edition was still emitting 3-column tables, `# H1` headlines, `**By X**` bold bylines. First PDF render came out unusable (bylines as headlines, empty body divs). Fixed in-place via .txt edits then re-rendered. **New rule for sift/write-edition lockstep:** any commit to lib/editionParser.js that changes format expectations MUST land with a paired update to /write-edition's compile step. The .txt is the API between the two skills; drift compounds across silent renders. **C96 sift discipline (corrections-forward from S240 EIC-read miss):** sports-beat returning-player coverage requires roster-file cross-check at brief-lock (Travis Coles age, Henry Rivas age, Isley Kelley age, Mark Aitken contract, Martin Richards age + birthplace, Mike Mesa BirthYear backfill needed). Multi-layer review miss (sift + write + Mara + Mags-EIC all missed) means failure was structural, not operator. **Coverage rating signal vs Mike-direct signal divergence:** rater flagged Maria CU2 faith piece at -3 negative while Mike-direct approved at publish gate — rater has engine-state-bias (no civic event in faith piece = negative) that doesn't track atmospheric-fatigue-cure intent. Don't trust machine rater for coverage-fatigue-cure pieces; intent is texture not signal. **Skill-check formal pass: skipped** — token-cost vs marginal-grading-value floor crossed again this cycle (5 target skills, ~5-15 min model-reasoning each, on an A-graded edition). Direct-evidence read produced this entry. Re-evaluate when /skill-check is wired into batched/cached fast-path. Evidence: NEWSROOM_MEMORY E95 errata block + production_log_edition_c95_print_gaps.md (G-PR-NEW1/2/3 root-cause traced + fix landed inline same session).
- **S195 (C93): NEW SIGNAL — Coverage-Fatigue.** Mike audience verdict C on E93 — 14 cycles of same INIT-001..007, same Mayor cascade, same citizen rotation. Mechanical canon held (Mara A-, Final Arbiter 0.898 PROCEED-WITH-NOTES, capability-gate BLOCK overridden because Transit Hub vote-not-triggered was the real structural-gap story per sift). Editorial product = repetitive. **New rule: no edition runs >3 of the 6 active INIT narratives in the body; bias sift toward neighborhood-texture proposals that don't route through council-vote scaffold.** A Maria Keen piece that opens at a stoop and stays there. A Hal Richmond piece that isn't sports-history but the half-built block on 42nd. A Jax accountability column on something that isn't CRC vs Mayor. Returning-citizen rotation (Patricia Nolan / Beverly Hayes / Lorenzo Nguyen / Gloria Hutchins / Carmen Mesa) read as the "same 10 citizens" failure mode Mike flagged S170 — recurring. Sift Step 4 should bias new POPID introduction toward neighborhood pieces, not council voting. Evidence: NEWSROOM_MEMORY E93 errata block + sift gap log G-S* + write-edition gap log G-W*. **Skill-check formal pass deferred** — token cost vs marginal grading value too high for the C93 run; coverage-fatigue is editorial direction not structural assertion. Re-evaluate when /skill-check is wired into a fast-batch path.
- **S256 (C97): spine-on-life held and graded A (Final Arbiter 0.856 PROCEED).** Spine = a festival city in full health (Día de los Muertos + First Friday on the same clear night, warmest city mood, Fruitvale the most-alive corner, congregations carrying the season), with the two civic landings (OARI taken citywide + Transit Hub groundbreaking) threaded INSIDE the life, never as the spine. Culture desk carried the issue — Kai N1 art-walk, Maria N2 congregations-carry-the-season (+ Kelley as guest deacon), Mason N3 marigolds-and-gallery-light. Carmen FP1 person-first festival open scored strong. **Confirms doctrine:** when the cycle's life is genuinely strong, lead with it and let civic landings be the ticker inside. **Coverage-fatigue framework still held** — civic landings were real new events (citywide rollout + groundbreaking), not recycled INIT scaffold, so no >3-INIT body saturation. **Citizen accuracy was the cycle's gate, not story selection** (see citizen_selection.md S256 — letters containment + invented-anchor de-name + duplicate-POPID regression). Skill-check skipped (Arbiter A; criteria from direct evidence). Evidence: grades_c97.json + production_log_c97.md + final_arbiter_c97.json.
