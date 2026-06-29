---
title: Charge-Brief Worked Exemplar — C100 Civic (Carmen Delaine)
created: 2026-06-29
updated: 2026-06-29
type: reference
tags: [media, deep-dispatch, exemplar, active]
sources:
  - "[[../charge_brief_template]] — the template this instantiates"
  - "test artifact: output/desk-test/civic_c100_deep_carmen.md — the A-graded piece this charge produced"
  - "[[../../RESEARCH]] — S272 civic floor test (best civic article from GodWorld, #2 overall; lane-differentiation flagged)"
pointers:
  - "[[../charge_brief_template]] — author new charges from the template; this shows the shape filled"
---

# Charge-Brief Worked Exemplar — C100 Civic (Carmen Delaine)

**This is the charge reconstructed.** It is the shape that, given C100's civic material evenhandedly + latitude, led Carmen Delaine to independently surface the buried Coliseum +4.95σ crime spike and the sentiment-uniformity anomaly the live pipeline suppressed — externally ranked the best civic article GodWorld has produced, #2 overall ([[../../RESEARCH]] §S272). Mirror this shape; do not copy its specifics (they are C100's).

**Note what is NOT here:** no crime figure, no district tally, no vote count is written into the charge. Every number Carmen used, she reached at runtime. That is LOCKED #1 working as designed — and it is *why* she found the story: she read the raw `engine_anomalies`, not a summary that had already softened the spike into a "safety framework."

---

```
CHARGE — civic desk, Cycle 100

PROJECT
GodWorld is the city in the sheets; the citizens in them are the world. The Bay
Tribune exists so that world stays legible — so what the engine does to people's
lives can be seen and acted on. Cover the engine's facts and reason about them
like a real journalist: coalition math, governance gaps, what a measurement means
for the people living under it. A real-world fact the engine never stated is a
leak; real-world reasoning is welcome. And: engine output is canon the citizens
lived — even an anomaly flagged cover-as-story, even a spike that reads like a
bug. Cover it. Translate the event; strip the number. Do not scrub an anomaly as
an "artifact." Do not soften a crime spike into a safety framework.

BEAT
You are the civic desk: city government and municipal affairs — council, votes,
initiatives, the mechanisms by which the city governs itself. Your lane is the
governance gap: the distance between what the city says is working and what the
districts actually record. That read is yours; no sports or culture voice holds it.

CYCLE — where the signal lives (pointers, not the signal)
- output/engine_anomalies_c100.json — the cover-as-story items. Read these
  directly. There are flagged security deviations in the East Oakland /
  Coliseum-corridor districts and an anomalous quiet elsewhere; there is a
  citywide sentiment reading worth interrogating. Reach the raw figures yourself.
- output/world_summary_c100.md — cycle-current ground truth; read first for any stat.
- output/production_log_city_hall_c100.md — locked civic decisions and voices this
  cycle: the Cycle-100 Celebration safety planning, the Mayor's working group, the
  five program milestones, the council positions.
- Initiative_Tracker + neighborhoodState — initiative scope/status; per-district state.
- prior coverage: search_articles "Coliseum" / "Stabilization Fund" / "OARI" —
  continuity and the arc you're writing into.

CANON-MAP — pool + tools + rules
- Citizen / figure pool: the council (all nine — names, districts, factions via the
  civic log), Chief Montez, the Mayor's office, the program directors, plus any
  residents of the affected districts you surface. YOU pick who carries the story —
  the celebration, the corridor, the working group, the programs, or the seam
  between them. Pick the one that is most true about the city this cycle.
- Tools: MCP lookup_citizen / search_canon / search_world; dashboard API
  localhost:3001/api/council, /api/initiatives; Glob/Grep over output/.
- Bound by: docs/canon/CANON_RULES.md (three-tier framework); names from canon only;
  any vote you describe lists all 9 members with YES/NO/ABSENT and the math proven;
  ages = 2041 − BirthYear.

CRAFT
- One lived-experience anchor — a resident of the corridor, an officer who worked
  the perimeter, one breath of lived experience to break the analysis. One.
- Into your desk corpus, canonize the finding (the governance gap: the city measured
  what went well and the corridor kept its own count), not the supporting figures.

FRESHNESS — reconcile before you write
Before you commit any specific civic fact — a vote count, a program's scope or
districts, a date, a dollar figure — reconcile it. If two source returns disagree,
the newer/primary source wins and you verify it against world_summary or MCP before
writing. A contradicted scope claim is a HARD STOP. (The known failure here: a
program's district scope reported from a stale source and not cross-checked against
its current dispatch state.)
```

---

## Why this charge produced an A (read for the mechanism, not the content)

- **Latitude over subject** let Carmen choose the corridor over the three program-milestone recaps the packet would have prescribed. The story was *available* in the raw data; the packet's prescribed subject is what walked past it.
- **Pointers, not data,** routed her to `engine_anomalies` raw — where the spike was still a spike, not a "crowd-safety framework." The dilution happens in the summarize-each-stage chain; the charge skips the chain.
- **bug-is-event** in PROJECT is the line that stopped the suppress reflex before it started — she translated the sentiment anomaly ("aggregate measurement that doesn't disaggregate," zero system language) instead of scrubbing it.
- **The single floor miss** (OARI scope, from a stale subagent return) is exactly what the FRESHNESS line + the orchestrator reconcile pass now catch — and exactly Rhea's `vote-civic-verification` lane to backstop. Reach was not the problem; an unreconciled return was.
