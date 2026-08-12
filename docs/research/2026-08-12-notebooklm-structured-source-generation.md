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
