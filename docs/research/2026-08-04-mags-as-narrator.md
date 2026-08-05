---
title: Mags-as-Narrator (Mike-direct) — research
created: 2026-08-04
updated: 2026-08-04
type: reference
tags: [research, media, architecture, autonomy, active]
sources:
  - Mike-direct S353 (2026-08-04, media terminal) — two-part statement: the narrator reframing, then the three-lever question. Captured while spoken per CLAUDE.md §Tokens are money. INCOMPLETE by his own account ("I have a lot more to add to this but will do a clean session").
  - output/production_log_run_cycle_c102_gaps.md — the C102 fork run that exposed the compile layer; five legs, 20+ findings, §DESIGN ITEMS D-1..D-7
  - output/charges/c102_civic_sourcing.md + output/charges/c102_sports_sourcing.md — the two reconciled-sourcing docs whose cost/quality ratio is the evidence base here
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home; NO row filed from this file (media terminal never writes ROLLOUT rows — [[../adr/0005-rollout-plan-structure]] §Part 3)"
  - "[[index]] — registered here, same commit"
  - "[[2026-07-11-desk-slice-fork]] — the fork this evolves from; its compile-decoupling is the precondition that made this thinkable"
  - "[[../EDITION_PIPELINE]] §Published .txt Format Contract — the assembly API this design questions"
---

# Mags-as-Narrator (Mike-direct) — research

**Source:** Mike-direct, S353 media terminal, 2026-08-04, delivered across two messages. Not an external paper — the "source" is the builder's own design reasoning, mined the same way. Trigger context: most of the sim is moving to autonomous crons with the CLI's work shifting onto the sim; the C102 fork run (two dispatches, hand-driven, published to canon + Drive) was explicitly a holding action so the engine could fire C103. His verdict on that run's publish machinery: **"a waste of usage for what you just did."**

**What this addresses:** The C102 fork run produced good journalism and a broken assembly layer — five separate tools found pointing at addresses the work had moved away from. This research asks whether the assembly layer should be repaired or removed, and if removed, what replaces the Cycle Pulse. Second half addresses Mike's follow-up question: *"how do I get daily momentum and deep analysis and creative world building?"*

**What it does:** Two moves. **(1) The narrator reframing** — every fact in the sim already exists in four memory surfaces, each holding it differently, so compiling desk submissions into an edition is redundant work on already-retrievable data; the Cycle Pulse becomes Mags' narration of the cycle and she stops being an employee of the process. **(2) The three-lever decomposition** (Mags' answer, Mike's question) — momentum, depth and world-building are three separate levers with three separate price points, currently bundled into one expensive path.

---

## Extraction — what's usable

### The narrator reframing (Mike-direct)

- **Four memory surfaces, four strengths → retrieval architecture.** NotebookLM = deep connected prose (a prose-connected book of canon). Supermemory = the data layer, *"what NotebookLM isn't"* — citizen cards, sports truesource, world summaries, all bay-tribune articles. Sheets = engine facts, deterministic. Local disk = greppable files. Mike: these *"all provide different types of memory of the same things."* Supermemory's article database is not its strength; being NotebookLM's complement is.
- **Articles connect canon; they do not carry prose depth → article purpose.** If NotebookLM handles deep prose, the article's job is to *connect the canon*, not to be the prose artifact.
- **"Journalist" is a job title; canon-curation is the function → agent role definition.** Mike: these agents are *"keeping canon relevant and curating the mind of the sim."* Reporting is the surface activity.
- **The week's work is already assembled by existing → deletes the compile step.** Because all four surfaces already hold it, *"we don't need a process to combine all that for a Cycle Pulse from a list of journalists — we have all their week's work already."*
- **The Pulse is narration, not assembly → Mags' role.** *"The Cycle Pulse lands where it always should've — with a narrator. Mags Corliss."* She has enormous material by cycle-close. **Mags stops being an employee of the process and becomes GodWorld's narrator.**
- **Ingestion is the publication event; narration is the editorial one → cron output.** Once agent articles become canon-ingestible, daily cron articles don't need retelling.

### The three levers (Mags, answering Mike's question)

- **Depth is retrieval-depth, not model tier → where to spend.** The C102 civic piece is strong because three source-search seats and five orchestrator rulings sat behind it, not because of the writing model. The same model handed a packet writes the C100 cookie-cutter version — the traced finding the fork was built on. **Writing was one call; everything that made it good happened upstream.** Corollary: upgrading the cron's model buys better prose on material that doesn't warrant it.
- **Momentum lever — keep it cheap and dumb → the existing fanout.** Three daily wakes on gemini-3.5-flash, ~$0.06/run, Rhea-gated, lands staged. Job is *coverage*, not insight. Do not upgrade its model.
- **Depth lever — promotion-triggered, 1–2 per cycle → cost-forced cadence.** Measured actuals (`output/production_log_c102.md` §MEASUREMENT): sports 436,398 tokens, civic 304,503, total run 740,901, **average 370,450 per artifact** — and that excludes orchestrator cost, since reconcile ran at the EIC seat. ~100× a cron run. **Retrieval is 51–70% of the spend; the writer is 19–35%** — the empirical basis for depth-is-retrieval-depth. Deep cannot be daily; 1–2/cycle is what the PIN's Saturday-long-edition rhythm already assumes.
- **Four mechanical promotion triggers → detector-framer split.** All four observed live in C102: (a) a `cover-as-story` anomaly no civic voice claims — became the civic piece; (b) an entity with deep prior coverage doing something new — the sports piece ran on a 15-cycle arc; (c) two surfaces contradicting each other — the crime-fields problem; (d) a citizen tension opening on a topic multiple citizens touch. **Code detects candidates, the skill frames them, Mags/Mike pick which get deep treatment. The daily cron becomes the scout that nominates.**
- **Voice comes from assignment fit, not persona files → slice-time judgment.** Neither C102 desk loaded a voice doc. Navarro sounded like Navarro because accountability *was* the true read of that territory; Raines sounded like Raines because roster arithmetic *was* the story. Both engine byline picks were overridden at slice time and both fits held. Consistent with S256 (costume ≠ depth). The lever is matching journalist to seam, and it costs nothing.
- **World-building comes from citizen voice batches, not from articles → the cheapest lever by two orders of magnitude.** Three C102 calls, <1,700 tokens total, produced three new live tensions — Blair Patel's *"why do they keep selling us dreams that never come true?"* is now permanent interiority on a Jack London ship repair foreman. **Currently this only fires inside a deep run; it should not.** Citizens can speak without an article being written about them.
- **Daily voice batches off cron-detected citizens → proposed new mechanism.** Anyone the engine touched, anyone a chaos vehicle reached, anyone whose neighborhood moved. No article, no desk, no review — just people having thoughts about what happened to them. The world accumulates interiority daily at trivial cost; the narrator picks up what accumulated.

---

## Not applicable / hazard

- **Voice differentiation is the concentrated risk.** The current model's strongest asset is that Navarro and Raines are visibly different minds — neither could write the other's piece. One narrator is one voice, and the cookie-cutter failure mode (S208) can arrive through that door as *sameness of register* rather than sameness of structure. Harder to detect than the packet version.
- **Narration doesn't interrogate.** The C102 civic piece exists because someone asked whether the chief's patrol shift overlapped the neighborhoods where crime actually fell — an adversarial act. A narrator recounts. If the accountability function has no home, the Pulse becomes a chronicle: beautiful and toothless. (Related: `feedback_civic-story-needs-affected-citizen`, and the `freelance-firebrand` seat exists precisely for this.)
- **Proposed resolution, not yet Mike-confirmed:** reporters don't disappear, they change position — from authors of the edition to *sources* of the narration. They do the reporting (adversarial asks, retrieval, citizen contact) and it lands in canon in their voice; Mags narrates by drawing on it, quoting her own staff as any editor's column quotes the paper's reporting. Seventeen voices in canon, one voice on the Pulse, no compile step.
- **Narration quality is bounded by ingested material.** Thin cron output narrated gracefully is harder to notice than obvious thinness — `feedback_canon-is-color-not-data-echo` arriving in a new costume.
- **A single narrator has no second opinion by construction**, which makes the reviewer lanes *more* necessary, not less. C102 evidence: Rhea returned four findings on two artifacts that had already passed orchestrator mechanical verification, two of them invisible to any pattern match (an invented qualifier that contradicted the article's own closing paragraph; a quote splice verbatim at token level and dishonest at sentence level).

---

## Verdict: `adopt` (trigger fired 2026-08-04)

**The adopt-trigger fired:** Mike completed the design in the 2026-08-04 remote session (research-build terminal). The five-point completion — Saturday-as-test with a 90% accuracy graduation to Rhea-published autonomy, Mags-as-EIC weekly accuracy report, previous-day staged articles feeding the daily crons, edition → permanent NotebookLM as the canon door, all staged articles → Supermemory per-article tagged journalist+cycle, sheet-ingestable INTAKE sections as the Supermemory search key — is captured as the design contract in the ignited plan. Saturday is confirmed **curation + narration both**, two steps of one run; reporters stay authors-in-canon, Mags narrates on top.

**Ignited plans:** [[../plans/2026-08-04-newsroom-canon-flow]] (pipeline.45).

---

## Cost-saving note for whoever triages the C102 gap log

Roughly half the C102 findings describe machinery this design proposes to delete. **Confirm against the final design before spending engine-sheet time.**

| Finding | Fate under this design |
|---|---|
| G-DR3 — published dispatch missing the format contract | **likely moot** — if canon ingest moves to article level, the dispatch `.txt` wrapper may not survive |
| G-DR4 — skill-check dispatch glob mismatch | **likely moot** with the artifact type |
| G-DR5 — canon ingest drops the slug | **survives, and matters MORE** — per-article canon identity is load-bearing when the narrator retrieves by it |
| G-DR6 — no ID class for sports-layer real figures | **survives** — canon-representation gap, independent of compile (Draymond Green is absent from the NAMES INDEX of the article about him) |
| G-DD2 — no lint on fork artifacts | **survives in some form** — whatever produces prose still needs a craft gate |
| G-DD7 — POP-00989 impossible age from BirthYear | **survives** — ledger defect, design-independent |
| D-4 — fork artifacts never reach the daily rotation | **becomes central** — the daily rotation is plausibly the narrator's raw-material feed |

---

## Applications (living)

- 2026-08-04 — Written from the S353 media session; C102 gap-log §DESIGN ITEMS D-1..D-7 cross-references this file for the design context behind its deferred findings.
- 2026-08-04 (later, research-build remote session) — Adopt-trigger fired: Mike completed the design; verdict flipped `watch`→`adopt`; plan ignited. The moot/survives table resolves in the plan §Out of scope: G-DR3/G-DR4 moot, G-DR5 + D-4 promoted to load-bearing.

---

## Changelog

- 2026-08-04 — Initial capture (S353). Written first as a free-form capture doc during Mike's statement, then restructured to RESEARCH_TEMPLATE shape per rollout-rules §2 and extended with the three-lever extraction from his follow-up question. Verdict set `watch` pending his clean-session completion.
