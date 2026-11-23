---
title: Engine Out Of The Sim's Mouth Plan
created: 2026-11-22
updated: 2026-11-22
type: plan
tags: [civic, media, active]
sources:
  - output/production_log_run_cycle_c117_gaps.md G-EC41
  - output/cron-civic/packets/*_pending_decisions_c117.md (what the seats read this week)
  - output/desk_signal_c117.json, output/slices/c116/{civic-domain,economic,firebrand}.md (what the desks read)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.115"
---

# Engine Out Of The Sim's Mouth Plan

**Builder's words (2026-11-22):** "we also dont want to hand 4th wall logic to the sim, engine audit gets handed to the sim along with world-summary, we also dont want to puppet the crons too much, presenting the \"headlines\" and allowing the slices to allow the media crons to write" · on the cut: "Facts, no engine frame" then "Narrow cut" (remove the engine as a speaker, the move-or-fail order, engine-audit paths on reporter tips, the checker-written remedy/angle lines; the record's words and numbers stay) · on Jax: "Jax you can make facts" · on Varek: "Elias article I thought he did speak on it as his “civis systems” engine and took accountability and make the council accountable".

**Standing rulings this cut sits inside:** 2026-10-18 "There is no such gate as engine words … ledger terms are not contamination" (record words, metric names, pattern names, severities and IDs stay); 2026-11-03 civic.47 M1 item 12 "a program moves when its deadlines call for it" — a stuck reading carries no demand; 2026-11-12 "a cron built to report the engine back … is a build defect"; 2026-10-28 slice Angle/Hook are scaffolding, loosened on his word (this is his word for the checker-written ones only).

**Goal:** no city hall seat, reporter or Jax reads the engine as a speaker, an order from it, or a pointer into its own review file; each still gets every fact the record holds.

**Rows:** pipeline.115 · **Owner:** engine-sheet

## Where it stands (read 2026-11-22, C117 files)

1. Seats — `scripts/cron-civic-run.js`: `:627` every flagged initiative note opens "The engine's own review flags this: "; `:638` topic title suffix " — engine-flagged"; `:662` HIGH topic title "Engine review HIGH: <type>"; `:383` the stuck sentence ends "The ledger already says that — this cycle you move the phase or take a fail phase." (8 of the C117 packets carry these). The order outlived its gate: `scripts/civicMustDecide.js` has no caller left.
2. Desks — `scripts/buildWorldSummary.js:1283-1320`: every audit pattern enters the desk signal with `ref` = `output/engine_audit_c{N}.json patterns[i]; evidence: <sheet> row(s) …`; the civic entry carries the checker's `tribuneFraming.storyHandles.civic` angle/hookLine (C117: 27 entries, e.g. "… stalled in vote-scheduled — remedy path + responsible office"); business/culture/sports entries exist only through the checker's angle and use it as their label ("economic ailment — economic footprint, affected businesses, workforce impact in West Oakland").
3. Tips — the path reaches reporter text: `scripts/buildCivicDomainSlice.js` (`src: top.ref`, C116 civic-domain 19 lines) and `scripts/buildJaxSlice.js` (`:340`, `:594`; C116 firebrand 7 lines). Other slices cite `output/beats/*` source rows by design ("The desk reaches the raw material itself") — untouched.
4. Varek (Civis journal) — `scripts/civisJournal.js:79-110` already turns each pattern into Civis's own words ("the instrument"); no labels reach him. Untouched; his risk is the checker's false findings (C117 G-EC39, item 5 of the gap list), not this frame.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Seats: drop the `:627` prefix, the `:638` suffix, the `:383` order sentence; `:662` title = where + the pattern's own words; default and improvement sentences carry the record's fact; weekday-pack source labels name the tab (`buildCivicOfficeSlice.js`, `civicBrief.js`). Verified: `ailmentPerception` lifted and printed over the 16 C117 patterns | es | done `8230195fe` `3f016a164` |
| 2 | Desk signal: source written in the record form (`<sheet> row(s) N; finding C<cycle>-<i>; storyline …`); civic handle keeps `citizens` only; desk lanes labelled by the record; `framed` (no words) keeps the stink +3 and the fanout lead. Verified: C117 rebuild, same entries per lane, 27 → 0 checker angle lines | es | done `8230195fe` `3f016a164` |
| 3 | Tips: `beatSliceKit.recordRef` converts an old ref to the identical record form (C117: 144/144); civic-domain, Jax (`toRecordRefs`, pattern lookup by either form), the desk run's SOURCE line and research evidence ref (`storyRecordRef`; validator checked on the lifted function); writer-brief filter drops the record-form source. Verified: C117 old code + old signal vs new code + new signal in scratch roots — stink ranking, Jax pick, six civic-domain picks, economic pick identical; 0 `engine_audit` in civic-domain and firebrand | es | done `8230195fe` `3f016a164` |
| 4 | One adversarial review (agy) of both commits; fold; proof = the unattended runs (see §What lands when) | es | in progress — brief sent 2026-11-22 |

## What lands when

- **Now (the crons run from the tree):** seat wording on the weekday datawakes; every reporter-facing source from the Mon 2026-11-23 06:15 desk run (old C117 refs are converted on read).
- **C118 fire (Sun 2026-11-29):** the desk signal itself carries no checker angle lines. `output/desk_signal_c117.json` on disk still holds the 27 C117 angle lines; this week's tips read them through the converted labels only where the code above touches them (civic lane handles feed `buildCivicDomainSlice` / Jax angle fallbacks). Regenerating the C117 file waits on the builder's word.
- **This week only:** the fanout compares raw C117 desk-signal refs with converted civic-domain refs, so one finding could reach two desks once. Gone at C118 (one form).
- **Tests:** not run or read (test guard); the tests pinning `handle.angle` / audit refs are owed at the builder's unlock.

## Acceptance

1. C118 seat packets: 0 lines naming the engine as a speaker, 0 move-or-fail orders; the same initiatives and HIGH topics reach the same seats — proven by the C118 Sunday chain packets.
2. Desk signal C118: entry counts per lane equal to a C118 rebuild of the old code; 0 checker-written angle/hookLine strings — proven by diff at the C118 fire.
3. Reporter slices from Mon 2026-11-23: 0 `engine_audit` paths in civic-domain and firebrand; their fact lines unchanged — proven by the slice files.

## Reviews reconciled

| Review | Verdict | Pointer |
|---|---|---|
| agy diff read of `8230195fe` + `3f016a164` | SHIP-WITH-FIXES | `output/antigravity/2026-11-22-review-pipeline115.md` |

### Agreed

- #1 `loadJaxSlice` built on demand returned the raw slice (`buildJaxSlice.js` loadJaxSlice) — `buildJaxSlice` now returns the record-form slice to every consumer (fanout, desk run, file). Verified: C117 on both signals, 0 `engine_audit`, story.ref `Neighborhood_Map row(s) 10; finding C117-5`.
- #2 incoherence contradiction: `aSrc`/`bSrc` from `patternBase` lost sheet + storyline, and `b` always said "no prior audit" — now `top.ref`, and `b` credits Civis and states the measurement only as it is.
- #3 Trevor's C117 pick does change (agy is right; my scratch diff compared label text and read the change as wording). Old pick: finding C117-4 (Fruitvale mood/housing) won only because the checker's hook said "The transit initiative carrying Fruitvale has not advanced"; new pick: INIT-003 Fruitvale Transit Hub (a transit record). The commit message `3f016a164` overstates "identical"; the other five seats, stink ranking, fanout order and economic hold.
- #4 the leftover-improvement measurement is the prior audit's C115→C116 number read at C117 as "since the last reading" — false (real C116→C117: −0.01 / −1.15 / +1.22). It is the checker grading its own expectation: off the seats (`cron-civic-run.js` flagNotes filter).
- #5b Mara's directive header "ENGINE REVIEW HIGH READINGS" → "CIVIS SYSTEMS HIGH READINGS".

### Needs proof

- none.

### New concepts

- #5a Jax's agent rulebook tags claims `FACT(engine)` and asks for "Engine Returns" (`.claude/agents/freelance-firebrand/RULES.md:72,91,94,109`, `SKILL.md:32`) — builder 2026-11-22 "yes rename": now `FACT(Civis)`, "Civis Returns"; the row owns the file for this edit. The same tags in the frozen multi-voice desk files (civic-desk, business-desk, culture-desk, sports-desk, letters-desk) untouched.
- #5c world_summary §Engine Review Findings — already §Surfaced; held.

## Surfaced, not this job

- The checker's own faults ("none" as a recurring issue, a stall filed as an improvement, one measurement filed twice) still reach seats, desks and Varek as findings: C117 gap log G-EC39, its own row.

- `scripts/civicMustDecide.js` + its test: dead (no caller). Removal is its own row.
- world_summary §Engine Review Findings is passed whole to `cron-rhea-gate.js` and `scripts/djDirect.js`; not in the narrow cut.

## Changelog

- 2026-11-22 (engine-sheet) — Builder "yes you can take those out": "cycle" and "ledger" off Jax's forbidden words (record words, 2026-10-18 ruling); "engine" and "simulation" stay (fourth wall).
- 2026-11-22 (engine-sheet) — Builder "yes rename": Jax's rulebook tags `FACT(engine)` → `FACT(Civis)`, "Engine Returns" → "Civis Returns" (RULES.md, SKILL.md); no script parses either.
- 2026-11-22 (engine-sheet) — agy SHIP-WITH-FIXES folded (§Reviews reconciled): Jax slice record-form for every consumer, incoherence source + Civis-true B line, the stale leftover-improvement number off the seats, Mara's header to Civis. Trevor's C117 pick changes (correcting `3f016a164`'s "identical").
- 2026-11-22 (engine-sheet) — Builder: "We kind of mask our engine as Elias Varek company system so it doesn't come off as contaminant"; chose "Credit Civis Systems". Seat readings now read "Civis Systems' readings flag this: …", HIGH topics "Civis Systems reading — <hood>: <type>", the Mayor's pulse heading "Civis Systems readings this cycle".
- 2026-11-22 (engine-sheet) — Built `8230195fe`; advisor fold `3f016a164`: one source form at the source and on read (C117 144/144), `framed` keeps picks identical (scratch-root diff), record-fact seat sentences, weekday-pack labels. agy brief sent.
- 2026-11-22 (engine-sheet) — Created on the builder's word after the C117 run (gap log G-EC41); scope read from the C117 packets, desk signal and C116 slices.
