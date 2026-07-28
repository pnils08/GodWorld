---
title: Civic cron city-hall — autonomous civic decision wakes — research
created: 2026-07-28
updated: 2026-07-28
type: reference
tags: [research, civic, architecture, active]
sources:
  - .claude/skills/city-hall/SKILL.md v2.1 + .claude/skills/city-hall-prep/SKILL.md v1.11 — current interactive flow (read S343)
  - scripts/cron-desk-run.js + scripts/cron-desk-writer.js + scripts/cron-rhea-gate.js — the media M-F fanout pattern (read S343)
  - docs/plans/2026-07-20-headless-newsroom-pipeline.md — Phase 3 names the civic analog as undesigned
  - Mike-direct S343 (2026-07-28) — "civic citizens are the nodes that make decisions on the sim with no human interaction … run it in crons like how media does now"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home (civic.15)"
  - "[[index]] — registered same commit"
  - "[[../mara-vance/INITIATIVE_TRACKER_CONTRACT]] — the canon write contract any auto-apply must honor"
---

# Civic cron city-hall — autonomous civic decision wakes — research

**Source:** Internal-design research (like [[2026-07-11-desk-slice-fork]]): the two systems being married are our own. (A) `/city-hall` + `/city-hall-prep` — the interactive civic run. (B) The media M-F cron fanout — `cron-desk-run.js` three-wake pipeline. Both read in full S343.

**What this addresses:** Civic decisions today require an interactive Claude session with Mike in the loop. Mike's direction (S343): civic citizens become autonomous decision nodes — the sim's government runs itself on crons, M-F, like the newsroom does. This file establishes what exists, what transfers, and what must be designed. It ignites the plan; it is not the plan.

**What exists (the two mechanisms):**

*A. The interactive civic run.* `/city-hall-prep` builds per-office `pending_decisions.md` packets from world_summary + engine review + Initiative_Tracker (deterministic reads; `lintCivicPackets.js` hard-gates the packets). `/city-hall` then dispatches ~13 agents in a strict cascade — Mayor first (Layer 1), council voices parallel (Layer 2, mayor's decisions injected into their packets), project directors + Baylight (Layer 3), City Clerk last as closer/verifier. Outputs: `output/civic-voice/{office}_c{XX}.json` → `assembleDecisions.js` → `applyTrackerUpdates.js` dry-run → **USER APPROVAL GATE** → `--apply` writes the live Initiative_Tracker sheet + emits `civic_sentiment_c{XX}.json`. Interactive ingredients: Mike's-pressure confirm (has an AUTO fallback already — engine HIGH ailments + Mara AUTO directive), "show Mike" checkpoints, anomaly escalation, and the apply gate.

*B. The media cron fanout.* Three cron wakes M-F (angle 06:15 / report 13:15 / write 18:15), state passed between wakes as JSON files in `output/cron-compare/`. Personas load headlessly — `cron-desk-writer.js` just `readFileSync`s the same `.claude/agents/` IDENTITY/RULES files into a raw system prompt, no Claude Code session. Cheap providers per `desk-model-map.json` (DeepSeek ~$0.003/write; full gated article $0.25–1.17). Gate: `cron-rhea-gate.js --gate-backend api` (gemini-3.5-flash ~$0.06) with a hard model-family **independence rule** (self-grading proved blind) + deterministic prechecks (canon-name check, engine-verbiage scan). Output stays behind a probation wall (`staged/`/`flagged/` local files, zero canon writes). Failures → Discord webhook, per-run isolation, weekly budget cap.

**Extraction — what's usable:**
- Headless persona loading → the 12 civic voices + Clerk already carry IDENTITY/RULES files and are Haiku-tier by frontmatter; a `cron-civic-run.js` can dispatch them exactly as `cron-desk-writer.js` does desks — no session, pennies per office per wake.
- Three-wake state-on-disk → the cascade maps onto wake stages naturally: wake 1 = prep + Mayor (packets built deterministically, mayor decides), wake 2 = council voices with mayor-cascade injected, wake 3 = projects + Clerk + gated tracker apply. The cascade's ordering problem IS the multi-wake sequence.
- Prep is already near-headless → `/city-hall-prep` is mostly deterministic reads + packet writes with a mechanical linter; the interactive "Mike's pressure" input has an existing AUTO derivation path — in cron mode the fallback becomes the default.
- Independence-rule gate → replaces the USER APPROVAL GATE the way Rhea's api gate replaced human review in media: fail-closed deterministic checks (`lintCivicPackets.js`, `validateTrackerUpdates.js`, the 20-value ImplementationPhase vocabulary from [[../mara-vance/INITIATIVE_TRACKER_CONTRACT]]) + a different-model-family sanity gate before `applyTrackerUpdates.js --apply`. Anomaly → Discord + skip, never silently proceed.
- Probation wall → decisions stage as local JSON (`decisions_c{XX}.json` already is that shape); only the gated apply touches the sheet. `utilities/cycleRollback.js` already exists as the undo path.
- Digest + alerts + budget cap → `newsroom-digest.js` pattern gives Mike an after-the-fact morning review instead of an in-loop gate; Discord webhook on failure; weekly civic spend cap.
- Reserved slot → headless-newsroom plan Phase 3 explicitly lists the civic analog (per-office packet builder, office wiring, reporter-demand→office-answer handshake) as undesigned. This project fills that slot — and the handshake gives the newsroom cron real civic sources to quote.

**Not applicable / hazard:**
- **Initiative_Tracker is canon substrate.** Auto-apply removes the last human gate on a live sheet write. Mike's S343 direction is the authorization, but the gate must be *replaced by mechanism, not deleted*: fail-closed validation + independence gate + rollback + digest review. The S332 lesson (21-row incident) and the DeepSeek world-state contamination (2026-07-07) are the two precedents that define the bar.
- **M-F cadence vs per-cycle decisions.** The engine fires weekly (Sun); `/city-hall` is per-cycle. What does a Tuesday civic wake DO? Candidate answer: decision wakes run post-cycle-fire; the other weekdays are *operational* wakes — project directors emit progress (hiring, milestones, disbursements) between decisions, feeding entity protagonism and the newsroom's M-F reporters. This is the central design question the plan must settle with Mike.
- **Model-map discrepancy.** city-hall SKILL.md says voices dispatch at sonnet; agent frontmatter says haiku. Headless mode sets its own per-office model map anyway — resolve in the plan, don't inherit the ambiguity.
- **No headless anomaly escalation or source-search dispatch.** The interactive skill's escalation moments must become fail-loud-and-skip, and any cross-file verification digs either get a deterministic script or are dropped from the cron path.

**Verdict:** `adopt` — Mike-directed project. Ignites a plan (cadence model, wake→cascade mapping, gate design for the tracker apply, per-office model map, cost budget). ROLLOUT row civic.15.

**Ignited plans:** [[../plans/2026-07-28-civic-cron-city-hall]] (S343 — the core build: office map, per-faction model bake-off, Sunday chain, Mon–Thu datawakes, dry runs).

---

## Direction log (Mike, think-tank mode — append as the design evolves)

*Mike's standing method for this project (S343): keep discussing, keep the attempts logged, learn what works and what doesn't. This section is that log. Entries are dated direction, not settled contract — the plan doc is where things get locked.*

- **2026-07-28 (S343) — the frame.** Civic voices are the **"city-workers" — the nodes that make systems work.** Today citizens mostly *react* to deterministic engine events; this project changes that: LLM choices feed not just a civic initiative but **the engines and city behavior itself**. Where the sim becomes an interconnected system. (Mechanism note: the wire half-exists — `applyTrackerUpdates.js --apply` writes the tracker, and `phase02-world-state/applyCityDynamics.js` + `phase05-citizens/civicInitiativeEngine.js` already read tracker state back into engine behavior. The new part is the decision side going autonomous and the feedback loop being designed on purpose.)
- **2026-07-28 (S343) — Sunday chain.** While crons are in test, the engine fires Sundays. Sequence: `run-cycle` runs → **forks off to a new city-hall-prep** (not the current interactive one) → **Mara voice directive** happens there — and the directive can almost certainly be **an agent, not Mara on claude.ai**; it is essentially "what the offices need to answer on this cycle" → city-hall runs **same Sunday** → **Monday media wakes open with all lanes set** (civic decisions become Monday's desk-signal material). Details explicitly not ironed out — sloppy-think-tank stage by design.
- **2026-07-28 (S343) — mid-week answered: offices voice their data.** ~35 citizens sit on the Civic_Office_Ledger, and each holds a job tied to a **city-data domain**: Rafael Montez (Police Chief) goes to work at police headquarters and the sim tracks crime data — that's his M-F material; Shawn Delgado (Emergency Management Director) ties to OARI/crisis data — same. **"They voice data for the civic service they serve"** — that is how the city-workers tie to the sim. A mid-week civic wake = an office-holder reading their domain's current numbers and speaking/acting on them. (Mechanism note: this is the civic analog of the newsroom's `desk_signal` lanes — each office needs a data lane + an office→POPID→domain map, the civic sibling of `persona-map.json`.)
- **2026-07-28 (S343) — cadence: Sun–Thu on duty, Fri–Sat off.** Civic offices work Sunday (decision day, post-engine-fire) through Thursday. Friday/Saturday are off — if an office-holder catches a wake those days it's about their **life events, not work events**: they're citizens first, so off-day wakes route through the citizen-loop path, not the office path. Work-self and life-self on the same POPID, separated by day-of-week.
- **2026-07-28 (S343) — why elections and political bonds matter: the mayor is the city's biggest amplifier.** Media covers her → affects neighborhoods → ripples through life. Her decisions move the civic initiative ledger → ripple to neighborhoods → life. Her choices constrain district council members → their choices ripple. **A bad mayor with low approval can literally make everyone's life worse** — so these choices must carry weight, and the **approval system needs refining so nothing is just handed to officials easily.** Replacement pressure: a mayor with a bad bond to an appointed office + that office holding low approval → pushes toward replacement. All of this is FINE-TUNE territory: **build the basic core first, dry-run it, then tune** — the goal of the core is all civic offices doing city work M–F (Sun–Thu duty).
- **2026-07-28 (S343) — model diversity IS political friction.** Test OpenRouter models for civic office voices, and use **separate models for separate factions** — different models arguing with each other produce more genuine friction than one model debating itself. (Same insight as the Rhea gate independence rule, pointed at drama instead of fabrication-catching: model-family diversity as a structural property, here generating politics.)

---

## Applications (living)

- 2026-07-28 — Ignition record (S343). No reuse yet.

---

## Changelog

- 2026-07-28 — Initial extraction (S343). Three parallel readers (city-hall skills, media cron scripts, civic agent roster + sheet write paths) → synthesis.
