---
title: Citizen-Loop Deepening — wake audit + upgrade extractions — research
created: 2026-07-06
updated: 2026-07-06
type: reference
tags: [research, citizens, citizen-loop, voice-agents, active]
sources:
  - logs/citizen-wake.log + rotated .gz (live wake history, 2026-06-25 → 2026-07-06, ~80 wakes)
  - scripts/citizen-wake.js (selection, slices, prompts — read end-to-end S298)
  - utilities/compressLifeHistory.js §readPendingReflections_ (drain filter verified S298)
  - lib/reflectionClassifier.js (Dual vs Triple export surface)
  - scripts/mags-discord-bot.js + lib/personaProvider.js (Discord persona flow)
  - docs/plans/2026-07-04-voice-dial-sync-contract-build.md (engine.43, pressure-tested S298)
  - Mike-direct S298 — "this is the flagship now of this sim"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home"
  - "[[index]] — register here, same commit"
  - "[[2026-07-04-voice-dial-sync-contract]] — sibling audit this extends"
---

# Citizen-Loop Deepening — wake audit + upgrade extractions — research

**Source:** Internal audit, S298. Live wake logs (~80 wakes, 2026-06-25 → 2026-07-06), `citizen-wake.js` read end-to-end, drain + classifier + Discord-bot code verified at the line level. Trigger: Mike-direct S298 — the citizen loop is the flagship; pressure-test engine.43, assess depth/slices/coverage, find the next-level upgrades.

**What this addresses:** Whether the 24/7 citizen loop is deep enough to carry the sim's flagship role — and what specifically limits it today. Also: how the Mags/Vinnie Discord bots tie into the loop, and whether citizen-to-citizen conversation is feasible on existing infrastructure.

**What it does (state of the loop, measured):** 5 wakes/day, pool of 212 shaped citizens (of 903 ledger rows; the rest fail the deviation-60 floor or lack lived history). Per-wake perception stack: life tail + milestone + co-residents + bonds + A's line + neighborhood texture + fenced own-page read-back + open tensions. Reflection → page append → triple-classify → tension register → `Reflection_Intake` (gated) → cycle drain into base dials. Single-reflection quality is genuinely good — interiority, tension capture, cross-citizen texture.

**Extraction — what's usable:**

- **Rotation orbit cap → selection fix.** Only 55 of 212 shaped citizens have ever woken; top citizen has 11 wakes. Cause is structural: `ROTATION_MEMORY=25` + fully deterministic max-eventMag sort = a stable orbit of ~30–50 citizens recycling forever. 74% of the shaped pool has never spoken. Fix class: raise rotation memory to ~100 and/or seeded weighted sampling over the eventMag ranking.
- **Disposition monotony → same selection fix.** Max-deviation selection harvests extreme dials → the same poles → near-identical temperament strings (top string appears 6× in ~90 wakes). Weighted sampling that reaches mid-deviation citizens diversifies voice for free.
- **Voiced-flagship starvation → guaranteed wake slots.** 3 of 4 voiced citizens (Benji POP-00018, Deacon POP-00528, Elias POP-00789) have NEVER woken; only Vinnie (6×). engine.43 syncs surfaces to live dials, but a citizen who never wakes accrues no live drift to sync. A periodic reserved slot (e.g. 1 wake in N goes to a voiced citizen, round-robin) makes the sync contract worth building.
- **Edition read-back slice → wake perception (the flywheel).** Citizens never perceive the Bay Tribune. Canon direction is safe: the wall blocks subjective→canon; editions ARE canon, so canon→subjective is clean. Two tiers: (a) neighborhood tier — one line when this cycle's edition covered the citizen's hood; (b) named tier — if the citizen appears in the edition's NAMES INDEX, they know they were written about and react to their own coverage. Closes the loop engine → newsroom → citizen perception → dials → engine. Data already exists in every published edition + NAMES INDEX; slice pattern identical to `loadNeighborhoodTexture`.
- **Cross-citizen ripple → new slice.** When A's reflection is classified about a bonded citizen B (Depak woke anxious about Vinnie; Vinnie never finds out), B's next wake can perceive one grounded line ("you ran into Depak recently; he seemed anxious") sourced from A's own `Reflection_Intake` event/affect tag + the bond row. No invention — tag + bond are both canon-side data.
- **Tension register unification → engine.43 amendment.** Wakes use `classifyTripleReflection_` (opens/resolves tensions); plan Tasks 4/5 specify `classifyDualReflection_` — so Discord/interview would never touch the tension register, and a tension resolved in conversation stays falsely open at the next wake. Amend Tasks 4/5 to Triple + shared tension state file.
- **Discord flush durability → engine.43 amendment.** Task 4's idle-flush buffer is in-memory in the bot process; session-close runs `pm2 restart` routinely — an unflushed conversation is silently dropped. Amend: flush-on-shutdown hook or persisted buffer.
- **Classifier input scope → engine.43 amendment.** Task 5 classifies only the citizen's answers; Task 4 classifies "the accumulated exchange" including the human side. Amend Task 4 to citizen-messages-only so the other party's words never color the dial nudge.
- **Discord bots are half-wired already → Track B is the missing half.** Verified in code: Vinnie's channel provider (`lib/personaProvider.js:citizenVoiceProvider`) READS his citizen page at augment-time — wake reflections already feed his chat voice — but `persistResponse()` is a v1 no-op: nothing said on Discord persists anywhere. Mags' bot is a separate provider (persists to Supermemory; nightly `discord-reflection.js` anchor) and stays out of citizen-loop scope. engine.43 Task 4 is exactly the missing write half for citizen channels.
- **Citizen-to-citizen conversation → feasible on existing parts (Mike's ask).** All components exist: `citizenVoiceProvider` builds a grounded persona per citizen (works for any POPID with page + identity source; pool citizens could get a lighter DeepSeek build from the same wake perception stack); `Relationship_Bonds` supplies who-talks-to-whom + warmth; the wake's slice assembly supplies each side's private perception; transcript → both pages + one classified `Reflection_Intake` row each (same gated shape as everything else). Natural trigger: a wake reflection classified about a bonded citizen (the ripple, upgraded to full duplex — Depak worries about Vinnie → they talk next day → both carry it). Bounded N-turn exchange, one script, no new subsystem class.
- **Tensions → newsroom seam.** The tension register is a live story-seed surface ("How do I ask for permission to slow down without collapsing?"). `/sift` reading `logs/citizen-tension-state.json` gives reporters doors to knock on. Cheap: read-only, media-terminal skill edit.

**Not applicable / hazard:**
- **Texture staleness is NOT a defect to fix.** The c100 texture artifact has been identical for 10 days only because no cycle has run since Jun 26; perception self-heals when cycles resume. Don't build a workaround.
- **Dormant slices (trajectory, bias readback) are NOT re-build targets.** Both are wired and waiting on other rows (mood/streak surviving in DialState; the MemoryRegisters Task-8 fold). Building around them duplicates existing work.
- **Cost hazard (conversation engine):** citizen-to-citizen conversation is 2 LLM calls/turn × N turns; keep it event-triggered (ripple-fired), never scheduled bulk, and on DeepSeek-class pricing.
- **Canon hazard (conversation engine):** transcripts are subjective-page material only — they must never write LifeHistory/dials directly; the gated intake path is the only canon-facing exit, same as wakes.

**Verdict:** `adopt` — three lanes: (1) amend engine.43 (three fixes fold into the existing not-yet-built plan — free); (2) wake coverage + selection fix (rotation memory / weighted sampling / voiced-slot guarantee); (3) edition read-back slice, cross-citizen ripple, and the conversation engine as the new-depth lane. Tension→/sift seam files as a small media-terminal row.

**Ignited plans:** [[../plans/2026-07-04-voice-dial-sync-contract-build]] (amendments, S298) + [[../plans/2026-07-06-citizen-loop-deepening]] (lanes 2+3 — coverage, edition slice, ripple, conversation engine, sift seam; engine.48 + pipeline.41).

---

## Applications (living)

- 2026-07-06 — engine.43 plan amendments (Tasks 4/5 Triple classifier + flush durability + classifier scope) sourced from this audit.
- 2026-07-06 — [[../plans/2026-07-06-citizen-loop-deepening]] drafted from lanes 2+3; conversation engine upgraded feasibility→build (Mike-direct S298); filed as engine.48 + pipeline.41.

---

## Changelog

- 2026-07-06 — Initial extraction (S298). Live-log + line-level code audit; all claims verified against running system.
