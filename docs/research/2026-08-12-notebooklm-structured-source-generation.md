---
title: NotebookLM Source Templates — research
created: 2026-08-12
updated: 2026-08-12
type: reference
tags: [research, media, active]
sources:
  - Drive folder 1KolPdb8qDmrUyXZiHYS70OWguWEaZTGH (NotebookLM_Source_Templates.md)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home"
  - "[[index]] — register here, same commit"
---

# NotebookLM Source Templates — research

**Source:** User-provided Drive link `1KolPdb8qDmrUyXZiHYS70OWguWEaZTGH` containing `NotebookLM_Source_Templates.md`.

**What this addresses:** We currently push raw edition/dispatch text and world summaries into NotebookLM. This provides facts, but NotebookLM struggles to infer hard canon boundaries, character arcs, and systemic rules from raw narrative alone, leading to hallucinations in Audio Overviews and Q&A.

**What it does:** The source provides three strict Markdown templates (Characters, Worldbuilding, Technical Systems). These templates force strict structure (Key Relationships, Hard Limitations, Axioms) to boundary-box NotebookLM's parsing engine. 

**Extraction — what's usable:**
- **Character Templates → Narrative Architecture:** NotebookLM needs more than the `Simulation_Ledger` stats (Age, Wealth, Skills). It needs Appearance, Tone, and Trajectory. We must build a pipeline to fuse ledger stats with past published appearances to populate this template.
- **Technical/Lore Templates → Guardrails:** Audio Overviews often hallucinate how the city operates (e.g., claiming the Mayor controls a private army). Feeding it structured System Laws acts as a hard boundary against narrative drift.
- **Explicit Formatting → Parsing Optimization:** The use of structured Markdown headings (`## 2. Axioms & Laws`) guarantees NotebookLM categorizes the data correctly instead of treating it as narrative prose.

**Not applicable / hazard:** 
**The Canon Invention Hazard:** The Character Template requires fields like "Appearance" and "Inciting Incident." If we run a script to generate these templates for citizens who have *never* appeared in a story, the LLM will hallucinate their appearance and history. If we push that to NotebookLM, that hallucination effectively becomes canon. We must strictly control the generation prompt to either rely *only* on published text, or explicitly allow controlled invention for Tier-1 citizens.

**Verdict:** `adopt`
- We need a plan to build `scripts/generateNlmSource.js` to systematically populate these templates from ledger data + canon grep.

**Ignited plans:** [Pending Plan Approval]

---

## S367 correction + original-doc read (Mike-direct, 2026-08-12)

Mike's corrections to the framing above, after the original template pack (`NotebookLM_Source_Templates.md`, Drive `1KolPdb8qDmrUyXZiHYS70OWguWEaZTGH`) was pulled and read in full:

**Corrected frame.** NotebookLM does not generate story or canon — *we* generate the stories; NotebookLM is the generic newsroom, the consumption/presentation layer ("a cheap way to send me curated media, until we figure out how to send me articles with a reader" — the reader app is the endgame). Empirically it never hallucinates beyond its sources; the doc's "prevents hallucination" pitch has the failure mode backwards for us. Curation is scripted now: editions + daily news are sent in by skill, no hand-review gate on ingestion.

**The real observed failure is faithfulness, not invention.** A guardrail/meta doc was tried before and NotebookLM *added its content to the media output* — it treats every source as content. The original pack makes this worse, not better: its fields carry meta-language ("Crucial for preventing AI hallucinations", "key takeaways for audio generation") and Template 3's classification literally includes "Simulation Engine" — builder-layer language that must never surface in sim-facing media.

**The design law this yields: every source must be safe to quote on air.** Since ingestion has no review gate and NotebookLM will faithfully surface anything it's given, the structure must be carried by *in-world documents* — a Tribune stylebook/almanac, a citizen dossier — so that when it leaks into an Audio Overview it sounds like the world, not like instructions. The templates' value is the **field checklist** (relationships, hard limitations, trajectory, representative quotes to prime audio tone), never the headings or frame.

**Adopted shape (Mike-agreed where noted):**
1. **Tier-1 character files only** (Mike-agreed) — written as in-world Tribune profile dossiers, built from published text + ledger identity; purpose is depth for the notebook, not guardrails.
2. **World/civic reference** — Mike: "sounds similar to a world summary we do, but including the key parts of our sim and the civic initiatives." An in-world city-desk almanac (neighborhoods, council, initiatives, institutions), sent through the existing edition/daily-news send skill — no new pipeline.
3. **Template 3 (System Specification) — do not use verbatim** (Mike cautioned; prior leak). Any system facts ride inside the almanac as in-world description.

**Revised verdict:** `adopt` the checklist-fields + Tier-1 depth files + in-world almanac; `reject` the meta-doc/guardrail framing and Template 3 as-is. Build stays gated on Mike (new script = FIX-don't-ADD gate).

**Ignition trigger (Mike-direct, 2026-08-12):** both send pipelines already exist and are working — the daily-news one is landing especially well (cron-wake writes arrive as citizen quotes; Mike laughed out loud twice at the output). This design "takes true form when the 2 pipelines are reviewed" — i.e., the dossier + almanac shape gets folded in at the next review of the edition-send and daily-news-send pipelines, not as a standalone build.
