---
title: Culture lane — engine routing cuts (raw-carried hooks, deskMap holes)
created: 2026-09-15
updated: 2026-09-15
type: reference
tags: [research, culture, newsroom, pipeline68, active]
sources:
  - S441/S443+ kimi sessions — culture-lane audit + scripts-side fix (builder-directed lane program; scope FULL COURSE ruled 2026-09-14)
  - docs/plans/2026-09-07-beat-slices-from-sheets-plan.md — pipeline.68
  - docs/research/2026-09-10-kimi-faith-lane-routing.md — storyHook deskMap card (engine.189)
  - docs/research/2026-09-10-kimi-business-lane-lifecycle.md — engine.190
pointers:
  - "[[../plans/2026-09-07-beat-slices-from-sheets-plan]] — the plan this extends"
  - "[[../SIM_DOCTRINE]] §13 — gate the facts, not the color"
---

# Culture lane — engine routing cuts

**Verdict: adopt.** Cut 1 is the single highest-leverage engine fix found
across all four lanes audited this program: one normalization gap silently
drops the engine's richest per-cycle signals for faith, education, culture,
and neighborhood coverage at once.

## What landed scripts-side (kimi, this session)

- `scripts/dumpBeatTabs.js` — `Cultural_Ledger` added as an OPTIONAL tab
  (20 cols; exists live — the wd-cultural cards mirror it).
- Three per-seat slices (the S434 "every journalist gets their own slice"
  ruling extended to the culture desk), each riding **alongside** the shared
  evening pack — the pack keeps the nightlife/TV/sighting texture, the slice
  leads the typed packet (`selectTypedSlice` reads `beatSlice` first):
  - `scripts/buildArtsSlice.js` (Kai, POP-00158) — Cultural_Ledger movers:
    rising/surging by fame, new-on-record this/last cycle, high-fame fading;
    universe-linked figures resolve to ledger citizens; culture-desk seeds;
    ARTS/CULTURE/NIGHTLIFE/CULTURAL/FESTIVAL hooks by domain.
  - `scripts/buildLifestyleSlice.js` (Sharon, POP-00159) — the fame record:
    fading-first (the where-are-they-now file), then top-fame, then new;
    CELEBRITY/FAME_WATCH/LIFESTYLE hooks by domain.
  - `scripts/buildNeighborhoodSlice.js` (Maria, POP-00013) — Community_Programs
    by rotating hood with founders resolved; hood population movement vs
    `prev/`; NEIGHBORHOOD_*/CITIZEN_RELOCATED/RENT_BURDEN_CRISIS/COMMUNITY
    hooks by domain (capped at 8 — the COMMUNITY class alone is 13+/cycle).
- Wiring: `newsroom-fanout.js` BEAT_BUILDERS += the three (the evening enrich
  auto-skips beat-sliced seats; pack texture still reaches the write-stage
  prompt via the existing inject). `cron-desk-run.js`: BEAT_BUILDERS /
  BEAT_NAME_RE / beatSlugForName += the three, plus an after-chain beat-slice
  load for evening-pack seats (the slice leads story/approach; the pack branch
  keeps firing for texture).
- `beatSliceKit.js` gains `domainHooks()` (name match + domain fallback with
  dedupe) — the shared form of the workaround first written for faith.

## Proposed engine cuts (gated — phase*/utilities land through engine-sheet)

**Cut 1 — the raw-carried hook normalization drops desk and journalist.**
`phase07-evening-media/storyHook.js:1384-1394` normalizes Phase-5 raw hooks
(`FAME_WATCH`, `NEIGHBORHOOD_BOOM/RISING/COOLING`, `CITIZEN_RELOCATED`,
`RENT_BURDEN_CRISIS`, `DROPOUT_WAVE`) with text/priority/domain only — never
`suggestedDesks` or `suggestedJournalist`. Live evidence at C106–C107: 38
desk-empty rows, including the entire neighborhood-movement and fame-watch
signal set. They reach no desk packet and no journalist. Proposed: run the
normalization THROUGH the same deskMap + journalist-match path as `makeHook`
(domain → deskMap → roster signal match). One cut heals four lanes.
(Same root as the education DROPOUT_WAVE finding —
`docs/for-claude-review/2026-09-14-kimi-education-lane.md`.)

**Cut 2 — deskMap holes: ARTS, CELEBRITY, FESTIVAL.**
`storyHook.js:99-116` maps CULTURE/NIGHTLIFE/CULTURAL to "Culture Desk" but
lacks ARTS/CELEBRITY/FESTIVAL → they fall to `'City Desk'` (:119). Live: the
C107 CELEBRITY hook carries `SuggestedDesks: "City Desk", SuggestedJournalist:
"Dana Reeve"` (metro generalist). Note also that the filled string "Culture
Desk" matches no roster desk in `utilities/rosterLookup.js:343-352` (roster
desks: business, sports, chicago, metro, culture, opinion, wire) — same
phantom-desk class as "Education Desk". Consider normalizing the deskMap
values to roster desk keys (`culture`, `metro`, …) in one pass.

**Cut 3 — migration/trajectory ripples route to the business lane.**
`buildWorldSummary.js:743-753` RIPPLE_LANE_MAP sends `trajectory`/`migration`
ripples to `lanes.business` — that is a trends reporter's material (Celeste
Tran's unseated seat) on Jordan Velez's lane. Worth a `trends` lane or a
culture-lane home when/if Celeste is seated; noted, not urgent.

## Wiring card status

The Cultural_Ledger wiring-card run DIED at turn 29 on an OpenRouter 403
(key limit, 2026-09-14 ~21:00 UTC) — no card attached. The tab contract was
instead verified by direct code read: schema (20 cols) at
`scripts/buildCulturalCards.js:55-60`; writers `registerCulturalEntity_` +
per-cell updates at `phase07-evening-media/culturalLedger.js:132, 503-514, 584`;
trajectory writer `phase07-evening-media/updateTrendTrajectory.js:36-42`;
readers engine-side only pre-fix (`culturalStatusByPop_` :73, fame map :103,
`scripts/buildCulturalCards.js:566-579`). Re-run the card when quota resets if
the reviewer wants it.
