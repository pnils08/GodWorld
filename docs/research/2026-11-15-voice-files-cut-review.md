---
title: Voice files cut to who the reporter is — agy's adverse review, and what was done with it
created: 2026-11-15
type: research
tags: [newsroom, reporters, voice-files, review]
sources:
  - output/antigravity/2026-11-15-review-voice-files-cut.md — agy's review (HOLD; brief docs/archive/for-claude-review/2026-11-15-es-brief-agy-voice-files-cut.md)
  - docs/media/voices/*.md (30 files), scripts/reporterIdentity.js, output/simulation_ledger_snapshot.jsonl
pointers:
  - "[[../reference/AGENT_BOOT_TEMPLATES]] §4 and Changelog 2026-11-15 — the template page and the dated changes"
  - "[[../plans/2026-11-10-role-citizens-wake-as-themselves]] — pipeline.110, the job"
  - "[[../research/index]] — registered here"
---

# Voice files cut to who the reporter is — agy's adverse review

**Verdict: adopt.** Every ledger claim agy made was checked against the snapshot and held. A reporter's written identity holds what shaped how they report; age, home and family come from the sheet load; real-world names come out; calendar years stand (the fork from reality is 2026).

| Finding (agy) | Disposition |
|---|---|
| Two Hal Richmond example lines left without their subject; a real bar in Jax Caldera's examples; a dropped real holiday in Maria Keen's Essence; "(solo)" on Nia Rook's header | cut, commit `162a5b84a` |
| Character lines that went out with the do-not lists (Kai, Mint, Torres, Graye, Hal, six smaller) | back as `## Traits`, read by both wakes (builder: "i think these are what make them report in character right?") |
| How-they-write lines inside Essences | kept as prose or Traits (builder: "whatever works") |
| Examples that work as a form | never read by a wake; Tanya's and Farrah's kept as a trait (builder: access, and "opinion is the job") |
| Ledger contradictions: Graye's origin, Navarro's second title, Sorensen's and Pruitt's career years, Carmen's 2018 | the sheet aligned to canon (four cells, builder "go as proposed"); 2018 moved to 2033 |
| Real-world names (a college, a video-call brand, an author, a wire service, an NBA team) | out (builder: "real world comes out, unless its landmass, landmarks, or allowed real world entites") |
| Farrah's "she is not a reporter" against the sheet | one thing: the opinion columnist, in the file and both roster copies |

Left alone, by the builder's word: calendar years in Essences and examples.

## Ignited plans

- [[../plans/2026-11-10-role-citizens-wake-as-themselves]] — Task 9 reporter half.
