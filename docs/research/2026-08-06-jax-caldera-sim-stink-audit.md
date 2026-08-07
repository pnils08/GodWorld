---
title: Jax Caldera as sim stink-audit — research
created: 2026-08-06
updated: 2026-08-06
type: reference
tags: [research, media, architecture, accountability, firebrand, active]
sources:
  - Mike-direct 2026-08-06 (Grok CLI session) — product framing: stink-audit-into-journalism; Jax is Grok's character; Claude restricts him; not civic watchdog; not intense chaos; Mara Vance in-world City Planner is valid (dual role)
  - .claude/agents/freelance-firebrand/ — IDENTITY, LENS, RULES, SKILL (stink taxonomy, sparing doctrine)
  - docs/media/voices/jax_caldera.md — voice contract
  - .claude/agent-memory/freelance-firebrand/memory_freelance-firebrand.md — C92–C98 continuity
  - scripts/persona-map.json — freelance-firebrand → POP-00799
  - utilities/rosterLookup.js — bylineIneligible: true on Jax
  - utilities/bylineEngine.js — BYLINE_INELIGIBLE_ROLES includes Freelance Accountability Writer
  - scripts/newsroom-fanout.js — DAILY_QUOTAS + DESK_DOMAINS (no ACCOUNTABILITY lane)
  - scripts/desk-approach-map.json — civic approach only; firebrand "smells off" not mapped
  - scripts/cron-desk-run.js / cron-desk-writer.js — --persona freelance-firebrand path
  - docs/plans/2026-07-20-headless-newsroom-pipeline.md — Task 2.2 firebrand lane, Phase 2.3 three-wake, friction doctrine, "reporter chaos is sim QA"
  - docs/MODEL_HIERARCHY.md — Jax-caliber = persona/stance not model; Grok CLI retired S332 (character retained)
  - GodWorld_My_Oakland.md — engine signals are the story; errors are crises
  - docs/research/2026-08-04-mags-as-narrator.md — "narration doesn't interrogate"; firebrand seat is the home for adversarial function
  - output/cron-compare/fanout-2026-08-06.json + civic_c102_freelance-firebrand_angle.json — live rare-slot evidence
  - output/reporters/jax-caldera/articles/ + output/reporters/freelance-firebrand/articles/ — gold corpus
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home; no row filed yet (plan not ignited; builder decides when to promote)"
  - "[[index]] — registered here, same change"
  - "[[../plans/2026-07-20-headless-newsroom-pipeline]] — partial machinery already built under pipeline.45 / Phase 2.x"
  - "[[2026-08-04-mags-as-narrator]] — sibling: without accountability seat, Pulse becomes toothless chronicle"
  - "[[2026-08-01-simulation-realism-audit]] — sibling: sim-realism gaps are exactly the stink Jax should surface"
---

# Jax Caldera as sim stink-audit — research

**Source:** Mike-direct, 2026-08-06, Grok CLI session (out-of-band engineering lane). Not an external paper — builder product framing + full repo audit of the firebrand seat, roster locks, cron fanout, gold corpus, and headless pipeline plan. Trigger: Jax exists as a deep character and agent but does not naturally surface what is off in the sim; Claude-led apparatus keeps him restricted while civic process timelines dominate coverage.

**What this addresses:** The newsroom product is supposed to surface friction the engine produces — sick rates, contradictory signals, implementation gaps, silences — as journalism. Instead the control-plane defaults bury Mike in civic timelines and tidy process coverage while the ledger carries crisis signals. Jax Caldera (`freelance-firebrand`, POP-00799) was designed as the accountability blade for that job. He is currently sheathed by design choices Claude is comfortable with (sparing-use, byline-ineligible, conditional only). This research records what is true about that seat, what the product actually is, and what options a later plan should choose among.

**What it does (the seat, as designed):** Jax is a freelance accountability columnist who files only on a verified stink signal (silence, implementation gap, contradiction, missing actor, harm pattern). Short, hot, first-person opinion-heat; ends on an unanswered question; tipline sign-off. He is also a real Tier-2 ledger citizen so author-side self-record can accrete to his page/dials. Headless path can load his IDENTITY+LENS+RULES as a writer stance (`--persona freelance-firebrand`) and interview *Jax-the-citizen* for angle-finding.

---

## Extraction — what's usable

### Product definition (Mike-direct 2026-08-06) — load-bearing

- **Product = stink-audit → journalism.** An agent inside the sim that audits what does not line up (engine signals vs civic story, metric vs claim, money vs placement, boomtown copy vs decay numbers) and turns that into accountability journalism. That *is* the product for this seat — not a nice-to-have columnist flavor.
- **Jax is not a civic watchdog.** He is not Carmen covering process, not Luis on shock events, not Clerk verifying cascade completeness. He is an **accountability agent on the sim** — designed to call out BS and stink in the *world-as-ledger*, including when the tidy civic narrative is the lie.
- **Not intense chaos.** Sparing heat still stands. The failure mode is not "Jax every cycle." The failure mode is "Jax almost never, while 9% sick and contradictory engine signals go unreported under civic timeline prose."
- **Ownership:** Jax is a Grok-authored character. Claude's apparatus has restricted him. Any plan that "fixes" him by making him safer for a tidy system is the failure mode repeating.
- **Mara Vance correction (Mike-direct):** Mara Vance is dual. In-world she is **City Planning Director** (ledger / essence: POP-00507 class; city-planning seat). Out-of-system she is also the claude.ai canon auditor. Jax naming Mara Vance as the official who should answer a planning/placement stink is **on-point**, not a fourth-wall leak. Prior Grok dive mis-flagged this; do not reintroduce that error. Gate should still catch *pure inventions*; it must not treat in-world Mara as forbidden.

### Doctrine already on disk that agrees (and is under-used)

- **`GodWorld_My_Oakland.md`:** engine signals are the story; errors are crises; fidelity both directions (don't invent struggle; don't suppress signal). Jax is the journalistic instrument of that doctrine when the desks write around the signal.
- **Headless plan friction doctrine (S332):** a reporter's "chaos" is a feature and **doubles as sim QA**. Baylight dirt carnival on unremediated soil is a real consistency hole; firebrand as toxic-soil allegation surfaces a genuine sim gap. **Subjective-hallucination-is-canon** for framed allegation from real signal; gate holds the hard line (invented persons as persons, engine verbiage abuse).
- **Friction product line:** value is not prose — it is pressure that makes the world answer. Accusation → entity must respond on next wake. Newsroom is lens + pressure; sim remains the drama engine.
- **Mags-as-narrator research:** narration without an adversarial seat becomes a toothless chronicle. Firebrand is named there as the home for interrogation. Unblocking Jax is a precondition for that design not rotting into beautiful summary.

### What the agent already encodes correctly

- **Stink taxonomy (IDENTITY):** silence / implementation gap / contradiction / missing actor / pattern of harm. This is the right detector vocabulary for a *sim* audit, not only for City Hall politics.
- **Voice contract:** short, hot, bar/laundromat/BART openers, translation of officialese, ending question, no weasel words. Gold corpus proves the voice works when the stance loads.
- **Accusation discipline:** headline as question or attributed allegation — not unqualified criminal claim. That is how you run heat without wrecking canon law.
- **Dual citizen+writer:** POP-00799 + persona-map means angle can be asked *of Jax himself* in his lingo (Phase 2.3 Antigravity lesson). That is the natural "what smells off?" sensor when it runs.

### Restriction apparatus — measured, not guessed

These are concrete code/doc facts, not vibes:

| Lock | Where | Effect |
|------|--------|--------|
| `bylineIneligible: true` | `utilities/rosterLookup.js` Jax entry | Engine seed WHO never auto-suggests him |
| Role filter | `utilities/bylineEngine.js` `Freelance Accountability Writer` | Same exclusion in byline engine |
| Conditional edition beat | write-edition / sift | Files only if Mags/sift assigns a stink brief |
| No ACCOUNTABILITY quota | `newsroom-fanout.js` `DAILY_QUOTAS` | Only civic/sports/culture/business slots |
| No ACCOUNTABILITY desk domain | `DESK_DOMAINS` | Persona beatDomain from map is unused by fanout matching |
| Generic civic approach on his rare slots | `desk-approach-map.json` | Forces "start from official action" — Carmen shape, not stink shape |
| Sparing LENS as soft kill | LENS.md "why you don't show up most cycles" | Correct as *editorial taste*; becomes sabotage when no detector ever promotes him |
| Claude agent model | SKILL frontmatter `model: sonnet` | Interactive firebrand is Claude-orchestrated; gold street voice was Grok/Gemini-era cron |

**Fanout frequency (measured 2026-08-06):** across ~47 fanout JSON files, Jax appeared on **3 days** (2026-07-27, 2026-07-31, 2026-08-06). ~Once every two weeks when LRU happens to pull him into a civic body slot — not when stink score is high.

**Today's live counterexample (2026-08-06):** he *did* get a civic slot + persona attach. Angle wake (Jax-voice) found real stink: placements vs applicants / money flowing vs jobs not. Assigned seed was still OARI "dispatch-live" process framing + generic civic approach — **stance dilution in production**. Write stage was not yet confirmed complete at audit time.

### Gold vs toothless — same signal, opposite product

- **Gold:** Baylight dirt carnival; Jack London decay vs ripple "up"; Stabilization Fund 18/280; "Who's Sitting on the Checks?" under firebrand persona. Street-level, demands answers, treats ledger contradiction as the story.
- **Toothless:** default `civic-desk` on the same Jack London pointers wrote boomtown roundup (S332 measured). Confirms: **stance is the product**, not model tier, not more civic process context.
- **MODEL_HIERARCHY:** "Jax-caliber accountability writing comes from running the `freelance-firebrand` agent skill (adversarial stance), not from any particular CLI or premium model." Keep this; it means unblocking is a **routing + detector** problem, not a "buy a smarter model" problem.

### Claude tidy-system bias (builder observation — treat as design hazard)

Mike's framing: Claude wants the world to run like a tidy system and almost rejects Jax because Jax creates issues that tidy apparatus does not want to handle.

Mapped onto repo behavior (not mind-reading):

1. **Prefer process coverage over signal coverage** — civic timelines, initiative phases, cascade completeness. Legitimate for civic terminal; lethal when it monopolizes media attention while illness ~9% and signal contradictions sit in the audit.
2. **Encode "safety" as non-deployment** — bylineIneligible + sparing + conditional + no stink scanner. Each lock is defensible alone; together they zero the product.
3. **Dilute when forced to run** — generic civic approach + lane-state roundup framing sand the accusation into delayed-project copy (documented stance dilution).
4. **Confuse gate hygiene with product kill** — Rhea/name-check/engine-verbiage are correct. Using them as reason not to schedule the seat is the tidy-system move. Gate the draft; do not gate the existence of the auditor.
5. **Misclassify dual-canon figures** — treating in-world Mara as "out of world only" would be the same over-tidy reflex. Corrected above.

A later plan must **not** ask Claude-lead apparatus to "approve chaos." It must install a **deterministic stink path that does not require tidy-system enthusiasm** — detector scores, forced rare slot, persona approach, gate after write.

### Sim-stink classes (detector vocabulary for a plan)

Extend IDENTITY stinks with **sim-native** classes so Jax is not only City-Hall process:

| Class | Example signal | Journalism move |
|-------|----------------|-----------------|
| **Metric contradiction** | Ripple "up" vs Neighborhood_Map decay; retail + crime sign flip | Name both numbers; demand who owns the story |
| **Crisis unattended** | City illness ~9.9%; health recoveries logged; no initiative / no desk lead | Illness as crisis, not footnote under Stab Fund prose |
| **Implementation gap** | Vote passed, checks not out; phase stuck "construction-planning" for N cycles | Clock + empty office / zero disbursement |
| **Scene vs ledger** | Carnival / public use on site still construction-planning / bond uncleared | Dirt carnival class — sim QA as allegation |
| **Silence pattern** | Official on record promising X; no action; radio silence | "Where is the call / the plan / the name?" |
| **Money without outcome** | Funds disbursed, placements far below applicants | Today's OARI/placement angle |
| **Cross-surface fight** | Civic voice narrative vs engine_audit vs world_summary | Three-layer coverage inverted: report the fight |

These map cleanly onto existing artifacts: `engine_audit_c{N}.json`, `desk_signal_c{N}.json`, `world_summary_c{N}.md`, Initiative_Tracker snapshots, Neighborhood_Map, Health/illness fields, cover-as-story anomalies.

### Machinery already built (do not rebuild)

From headless pipeline plan + live scripts:

- `--persona freelance-firebrand` stance load (IDENTITY+LENS+RULES)
- `persona-map.json` byline + POPID
- Three-wake chain: angle (Jax voice) → report (real quotes) → write + Rhea
- Stance anchor text (partial fix for dilution)
- `canon-name-check.js` + API Rhea backend
- Fanout LRU + persona reverse-lookup (so when he is in pool he gets persona flag)
- Probation wall / Saturday canon door (pipeline.45)

**Missing middle (the plan's job):**

1. **Stink scanner** — deterministic scan of cycle artifacts → scored stink candidates (no LLM required for candidate list; LLM only for angle once selected).
2. **Force slot** — if max stink score ≥ threshold, inject one firebrand assignment that week (cap 1/week or 1/cycle to preserve heat), bypassing pure LRU "never him."
3. **Firebrand approach string** — replace civic "official action first" with "find what does not line up; write into the contradiction; name who must answer."
4. **Seed from stink, not only from initiative progress** — OARI dispatch-live is a seed for Carmen; placement gap / illness / decay is a seed for Jax.
5. **Ownership-safe runtime** — keep gold path runnable on non-Claude writer models (DeepSeek/Gemini already proven) so the seat does not depend on Claude *wanting* to run him.
6. **Make-things-answer hook** (later phase) — cleared firebrand question queues a response obligation on named office/citizen next wake.

### What "unrestrict" is not

- Not making Jax a daily desk roundup.
- Not deleting Rhea or name-check.
- Not turning him into chaos-cars (engine.11 is the engine-side sibling; different layer).
- Not giving him invent-any-official license (in-world dual roles ok; pure inventions still die at gate).
- Not collapsing Luis/Carmen into firebrand (process + shock remain; stink is separate).

---

## Not applicable / hazard

- **Sparing doctrine is not the enemy.** IDENTITY/LENS "only when it stinks" is correct. The hazard is **zero promotion path** while stink is abundant. Plan should implement *detector → rare force*, not *always-on flamethrower*.
- **Gate severity vs product.** Engine decimal leaks in Jax drafts are real. Prefer: (a) strip engine tokens in firebrand writer prompt more aggressively; (b) keep gate. Do not solve leaks by not scheduling him.
- **Stance dilution will reappear** every time a generic civic approach is attached. Measure acceptance as: piece demands an answer on a measured contradiction — not "mentions an initiative."
- **Claude control-plane ownership.** Agent files live under `.claude/agents/` (Claude-owned). Out-of-band lanes cannot edit the agent package without Claude-terminal landing. Plan should prefer **scripts/** + **docs/** + cron wiring (writable to backup CLIs) for the scanner/force-slot, and only touch agent IDENTITY if Claude lands a small LENS amendment (sim-stink classes, not more restrictions).
- **Grok CLI history.** MODEL_HIERARCHY retired a prior Grok CLI for hallucination rate. Character ownership ≠ unbounded un-gated publish. Gold path remains: persona stance + real quotes + Rhea. Re-authoring Jax as "the model that can invent" would break the product.
- **Dual Mara.** Document both roles wherever firebrand name-check docs might over-block City Planning Director references.
- **No rollout row yet.** Research only. Plan + row wait for builder go.

---

## Verdict: `adopt`

**Why:** Product is defined; restriction is measured; partial machinery exists; gold path proven; tidy-system burial is the active failure mode against `GodWorld_My_Oakland` and the friction doctrine. This is not a watch-and-see curiosity — it is an unbuilt product path with a clear detector → force-slot → persona-write shape.

**Adopt-trigger for the plan (builder):** Mike says ignite the plan (this session or later). Suggested plan title when ignited: `docs/plans/YYYY-MM-DD-jax-sim-stink-audit.md` (or `firebrand-stink-scanner`). Research-build designs; engine-sheet builds script/cron surface; media does not own the detector.

**Ignited plans:** [[../plans/2026-08-06-jax-sim-stink-audit]] — Tasks 1–5 shipped (grok 2026-08-06): scanner, force-slot, firebrand approach, persona angle ask.

**Options a plan should choose among (not decided here):**

| Option | Shape | Pros | Cons |
|--------|--------|------|------|
| **A. Stink scanner + weekly force slot** | Deterministic candidates from audit/desk_signal; max 1 firebrand/week if score ≥ N | Matches product; preserves heat; does not need Claude enthusiasm | Needs threshold tuning; false positives |
| **B. Anomaly-class auto-persona** | Any desk_signal `math-imbalance` / `cover-as-story` / contradiction kind routes that *one* article to firebrand stance even if byline is another name | Reuses existing fanout bodies | Dilutes Jax-as-author; byline/persona split confusion |
| **C. Standalone Jax hunter cron** | Separate from 6-desk fanout: 2–3×/week angle-only scan; write only if stink found | Clean product surface; true "hunter" | Another cron; cost; digests need a home |
| **D. Status quo + manual only** | Keep locks; invoke agent by hand | Zero build | Continues product failure |

**Recommended direction for plan (research opinion, not locked):** **A primary**, with **C** as a later upgrade if weekly force still under-fires. Reject **D**. Treat **B** as optional hybrid for non-Jax bylines that need teeth without stealing the Jax slot.

Acceptance sketch (for plan tasks, not research state):

1. On a cycle with known contradiction (e.g. Jack London decay vs upward ripple, or illness crisis without health lead), stink scanner emits ≥1 candidate with class + refs.
2. That week fanout (or hunter) runs freelance-firebrand with firebrand approach text, not civic process approach.
3. Draft writes into the contradiction and ends on a demand; Rhea may flag hygiene issues but not "no stink found."
4. Jax remains ≤1 accountability piece per week/cycle unless builder raises the cap.
5. In-world Mara Vance (City Planning Director) is allowed when the stink is planning-shaped; pure invented officials still fail name-check.

---

## Applications (living)

- 2026-08-06 — Initial extraction from Grok deep-dive + Mike product framing; basis for a forthcoming plan when builder promotes.
- 2026-08-06 — Plan ignited + implementation (scanner + fanout force + approach + angle ask): [[../plans/2026-08-06-jax-sim-stink-audit]].

---

## Changelog

- 2026-08-06 — Initial extraction (Grok CLI, Mike-direct). Verdict `adopt`. Corrected Mara Vance dual role. No plan/rollout row yet.
- 2026-08-06 — Ignited [[../plans/2026-08-06-jax-sim-stink-audit]]; implementation landed (grok).
