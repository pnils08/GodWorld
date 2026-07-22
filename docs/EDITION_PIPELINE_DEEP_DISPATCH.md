---
title: Deep-Dispatch Pipeline — the fork path (pipeline.44)
created: 2026-07-11
updated: 2026-07-11
type: reference
tags: [media, pipeline-44, fork, architecture, active]
sources:
  - docs/research/2026-07-11-desk-slice-fork.md — the one-doc (design decisions + Task 1 forensics + task states)
  - docs/adr/0012-autonomous-deep-dispatch-write-edition.md — the accepted decision + S289 side-fork addendum
  - docs/EDITION_PIPELINE.md — the frozen sibling this forks from
pointers:
  - "[[EDITION_PIPELINE]] — the FROZEN edition path (kept runnable, no new investment)"
  - "[[research/2026-07-11-desk-slice-fork]] — why every seam is shaped the way it is"
  - "[[engine/archive/ROLLOUT_PLAN]] — pipeline.44 state"
  - "[[index]] — registered same commit"
---

# Deep-Dispatch Pipeline — the fork path

**This is the flagship path (Mike-direct S313).** The monolithic edition pipeline ([[EDITION_PIPELINE]]) is **frozen, not retired** — it keeps publishing until this fork proves itself on four criteria: quality parity, token burn down, moves the world, per-article wiki taggability. Nothing upstream of the fork point changes.

## Architecture

Upstream (shared with the frozen path, unchanged):

```
engine cycle → /engine-review → /build-world-summary → /city-hall
```

The fork begins after city-hall — the point where the frozen path runs `/sift` → `/write-edition`:

```
/desk-slice                 Mags-as-EIC curation. Reads world summary + city-hall
   │                        (sift's surviving job: world summary lacks city-hall).
   │                        Writes one slice per desk: LANE, storylines + attached
   │                        citizens, pointers-not-figures, assigned journalist.
   ▼
/deep-dispatch {desk}       One desk at a time, DEEP. Charge from the slice;
   │                        desk proposes pick+angle → Mags cheap OK → ≤3 bounded
   │                        search agents → orchestrator reconcile → citizen voices
   │                        (citizenVoice --batch --record) → desk writes to its
   │                        own corpus. ENDS AT ARTIFACTS-ON-DISK.
   ▼
/desk-review                Decoupled floor, own cadence, ~2 artifacts at a time.
   │                        EIC read → Rhea (+ heavier lanes) → verdict → package
   │                        into dispatch .txt contract → USER APPROVAL GATE →
   ▼
/post-publish --type dispatch   Existing convergence point, unchanged matrix:
                                wiki ingest, citizen cards, intake, NotebookLM.
```

## What changed vs the frozen path — and why

| Seam | Frozen path | Fork | Why (forensic basis) |
|------|-------------|------|----------------------|
| Curation | Mags-monolith `/sift`: full briefs, citizen tables, slate lock | `/desk-slice`: territory + citizens + pointers, no authoring | Packet prescription is what walked past the C100 buried story; pointers-not-data is why the deep test found it |
| Dispatch | All desks parallel against packets | One desk deep, subject latitude within its slice | One desk holding whole territory finds seams parallel desks walk past (Threshold Season proof) |
| Quotes | Desk invents in reporter-range (S227) / pipeline.43 packet | Supplied voices only + REAL-ASKS-ONLY; invention is fallback | Citizens actually speak (pipeline.43); claimed asks that never happened are a fabrication class (Task 1 new find) |
| Freshness | Charge prose | Structural orchestrator reconcile before the write | The one real S272 error was a stale return charge-prose didn't catch |
| Review | Inside production (write-edition Step 2 + lanes at compile) | Own flow, after; same lanes, 2-at-a-time | Mike-direct S313: "same process just decoupled"; 9-at-once is where review effectiveness died |
| Output | One compiled edition .txt | Per-desk dispatch .txt artifacts | Per-article ingest = the wiki-query gain; Mike reads civic without waiting on sports |
| Cadence | ~2-day monolithic production run | Desk-by-desk, review on its own clock | Desks keep up with their own work; Mike paces with the output |

## Artifact & path conventions

| Artifact | Path |
|----------|------|
| Slices | `output/slices/c{XX}/{desk}.md` |
| Charges | `output/charges/c{XX}_{desk}.md` |
| Voice packets | `output/voices/voices_c{XX}_{desk}.json` |
| Desk artifacts (unpublished) | `output/desks/{desk}/articles/c{XX}_{slug}.md` |
| Published dispatches | `editions/cycle_pulse_dispatch_{XX}_{slug}.txt` (frozen path's format contract, dispatch variant) |
| Run logs | `output/production_log_c{XX}.md` §`/desk-slice`, §`/deep-dispatch`, §`/desk-review` |

## Locked rules (carry into every run)

1. **Orchestrator spawns; desks write.** Desk agents never get Agent capability (LOCKED, ADR-0012).
2. **Pointers, never pre-assembled data.** A charge or slice that pastes figures IS the bone-filtered packet again (LOCKED, ADR-0012).
3. **Bug-is-event.** Every `cover-as-story` anomaly gets a home desk at slice time and is covered as an event, never scrubbed as an artifact.
4. **Mags curates; desks choose within the slice.** Her newsroom — she picks what's on each desk; the desk picks what it writes and how (subject latitude stands, S313 grill).
5. **REAL ASKS ONLY.** A claimed query or "did not respond" must trace to an ask that happened.
6. **The floor is unchanged in force, decoupled in cadence.** Recalibrated targets (specifics + civic invention, not reach) per ADR-0012.
7. **USER APPROVAL GATE unchanged.** Nothing saves to Drive / publishes without Mike's OK.
8. **Caps:** ≤3 search agents per desk run; ≤2 artifacts per desk per cycle.

## Open (parked, not decided)

- **Cycle-close combine** — whether per-desk dispatches also compile into a paper at cycle end (photos/print ride this decision). Discussion with Mike pending; nothing in the fork blocks either answer.
- **Pilot** (T6, media): civic + sports first, measured against the four proof criteria + the ADR-0012 cost gate.

## Skill files (authoritative)

| Skill | File | State |
|-------|------|-------|
| /desk-slice | `.claude/skills/desk-slice/SKILL.md` | v1.0 (S313) |
| /deep-dispatch | `.claude/skills/deep-dispatch/SKILL.md` | v2.0 (S313; v0.1 edition-coupled harness in git history) |
| /desk-review | `.claude/skills/desk-review/SKILL.md` | v1.0 (S313) |
| /post-publish | `.claude/skills/post-publish/SKILL.md` | shared with frozen path (dispatch type in matrix) |

---

## Changelog

- 2026-07-11 — Created (S313, pipeline.44, Mike-direct). Fork map at skill-complete state (T1–T4 done; T5 engine-sheet + T6 media pilot open). Sibling to the now-frozen [[EDITION_PIPELINE]].
