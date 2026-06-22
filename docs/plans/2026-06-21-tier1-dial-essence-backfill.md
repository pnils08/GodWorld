---
title: Tier-1 Dial-Essence Backfill (citizen-loop Seam A)
created: 2026-06-21
updated: 2026-06-21
type: plan
tags: [engine, citizens, dials, citizen-loop, architecture, active]
sources:
  - utilities/citizenDialMap.js (the tag→dial map; engine.31 S253)
  - scripts/backdateCitizenDials.js (the dampened-seed replay; LifeHistory_Archive → DialState)
  - scripts/citizen-wake.js (the 24/7 loop; deviation≥60 wake gate + LifeHistory-column journal material)
  - utilities/tier1EssenceEvents.js (this plan's authored canon→events data — POC: 4 faces)
  - scripts/seedTier1Essence.js (this plan's dry-run harness — proves dials land on essence)
  - .claude/agents/citizen-voice-*/IDENTITY.md ("source-of-truth for your ledger dials" disposition blocks, research.16 Phase 3)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (research.18 row)"
  - "[[2026-06-04-mags-citizen-loop]] — research.14, Seams B (classifier) + C (write-back) of the same loop"
  - "[[2026-06-16-tier1-character-voice-agents]] — research.16, the voiced faces whose disposition blocks seed the essence"
  - "[[index]] — registered same commit"
---

# Tier-1 Dial-Essence Backfill (citizen-loop Seam A)

**The loop being closed (Mike, S265):** a citizen's dials set their disposition → disposition + recent life + neighbors shape tonight's reflection → the reflection is journaled and classified into tags → the tags feed back and nudge the dials → changed dials change tomorrow's disposition. Lived experience reshapes temperament; temperament reshapes the next experience. A citizen who *grows*.

The loop is cut in three places:
- **Seam A — the door (THIS plan):** dials at neutral = `deviation 0` = below the wake pool's `SHAPED_MIN = 60` gate (`scripts/citizen-wake.js`). 13 of 21 Tier-1 read neutral "Drifter" — including the voiced faces Vinnie, Benji, Varek — so the loop never picks the richest characters. Their essence was authored (voice-file disposition blocks, research.16 Phase 3) but **never written into history**, so the dial seed (a pure function of `LifeHistory_Archive`) correctly produced a neutral citizen from empty input.
- **Seam B — the classifier:** flattens multi-theme reflections to one mild tag (all wakes → "Content"). research.14, HOLD.
- **Seam C — the write-back:** no engine phase reads `Reflection_Intake`; tags go nowhere. research.14, gated/inert.

This plan is **Seam A**. It is the input seam and the one to get right first — its output is the stable base the live write-back (Seam C) later rides mood/streak on top of.

## The mechanism (engine.31-invariant-preserving)

We do **not** special-case Tier-1 in the dial math (that would break engine.31's "dials = a pure function of history, no shielding"). We **supply the canon history that should always have existed**: each citizen's authored biography, written as the `LifeHistory_Archive` rows that — replayed through the *same* `citizenDialMap` every citizen runs — produce their authored essence. Dials stay a pure function of history; we complete the history.

**Two history stores, only one is touched:**
- `LifeHistory_Archive` (cold) → replayed by `backdateCitizenDials.js` → `DialState`. **Essence-events go here.**
- `LifeHistory` column (live, recent events) → the wake's "real things from your life recently" journal material. **Untouched** — the citizen keeps reflecting on their *real recent* life, now *colored* by the seeded temperament. Essence is the stable lens, not fake "recent" memories.

## Proof of concept — VALIDATED S265 (4 voiced faces)

`utilities/tier1EssenceEvents.js` authors each face's canon as events; `scripts/seedTier1Essence.js` replays them through the live map + the exact dampened-seed curve the deploy uses (`base = 50 + 50·tanh(net/30)`) and asserts each dial lands in its authored target band. **Result: 32/32 dial-targets met, 4/4 citizens clean.** The dispositions the wake would now read:

- **Vinnie Keane [Heart]** → driven; draws people in, deep with them; warm, tender; curious; steady; principled; close to family.
- **Benji Dillon [Calm]** → driven; warm; curious; **unshakable, calm under anything**; principled; close to family.
- **Deacon Seymour** → driven; warm; curious; steady; principled (live lands higher — already 6 real entries the dry-run didn't model).
- **Elias Varek** → relentless, can't stop working; draws people in; curious; steady; often out in the neighborhood.

All three formerly-neutral faces now clear the `deviation ≥ 60` wake gate → **into the loop.**

**Finding (carry to scaling):** the map has no pure-integrity or pure-warmth-as-temperament tag — `integrity` rides `Reputation` (which also adds `sociability`), `warmth` rides family/mentorship events. Absorbed here by a `moderate` target band (the voice files' own word for these traits), but it constrains authoring and may justify a small map addition (a principled-conduct integrity tag) before the wider roster. Same shape as the known composure/outabout limitation: the seed can't drive a dial *below* neutral from ordinary events.

## Roster — tiered by canon source (Mike's S265 guidance)

The backfill targets authored-persona citizens that read neutral (prioritise Tier-1; the wake gate is deviation-based, not tier-based, so any shaped voiced citizen benefits). Three sourcing tiers, easiest first:

| Tier | Who | Canon source | Effort |
|------|-----|--------------|--------|
| **1 — voiced agents (easy)** | The 4 faces (DONE) + civic-office voices (Mayor Santana, factions, projects) + media reporter voices (Raines, Hal Richmond, …) | Their agent `IDENTITY`/`RULES` — extract dial-targets directly, same as the 4 faces | low — extraction, not invention |
| **2 — the remaining A's** | Aitken, Isley Kelley, Davis, Horn, Rivas, A. Ramos, Richards, Ellis, Conrad, Taveras | Dynasty **background coverage** (published editions) + the voice-file cross-references ("reads a ball like he lived in the dirt", "brings the fire") | medium — author from coverage |
| **3 — family / planner / GM** | Corliss family (Robert, Michael), Mara Vance, Mike Paulson; Lucia Polito (Tier-1 protected) | `CHARACTER.md`, `docs/mara-vance/`, GM/sports canon, codex | medium — author from canon |

**Per-entity checks at authoring time:** (a) confirm a `Simulation_Ledger` POPID exists (the live write needs a row; voiced agents without one get essence-ready authoring that applies when seeded); (b) Mags POP-00005 is already shaped (16 entries) — verify, don't overwrite; (c) citizens with existing entries (Deacon 6, Conrad 5, Mara 5, Taveras 4) seed from existing **+** essence — author supplementally, don't duplicate what's already logged.

## Authoring method (per citizen)

1. Read the citizen's disposition block (voiced) or coverage/canon (A's, family) → the target band per dial.
2. Author canon-faithful events in `utilities/tier1EssenceEvents.js`, choosing tags that resolve (via `citizenDialMap.nudgesForEvent_`) onto the target dials. EventText must read as true history — it *is* permanent canon biography.
3. Run `node scripts/seedTier1Essence.js --pop=<POPID>` → iterate until ESSENCE MATCH.
4. The harness is the measure-twice gate: nothing goes live until it passes.

## Engine-sheet handoff — the live write (substrate)

Research-build authors + validates (above). Engine-sheet executes the live-ledger write:
1. Append each validated citizen's essence-events to `LifeHistory_Archive` (schema `Timestamp/POPID/Name/EventTag/EventText/Neighborhood/Cycle`; stamp Cycle as backstory/0). Copy-guard first (dry-run vs a throwaway copy), then `--live`.
2. Re-run `node scripts/backdateCitizenDials.js --apply --live` → re-derives `DialState` + `TraitProfile` for all citizens from the now-complete archive (idempotent; the seed is a pure function of history). Verify the seeded faces read their essence live + clear the wake gate.
3. **Idempotency caution:** the existing deploy clears `LifeHistory` column O → archive on `--live`. Confirm essence-events are appended to the *archive*, not column O, so a re-run doesn't double-count. Author-once: re-running the seed must not re-append duplicate archive rows (guard on POPID+EventText, or append-once-then-replay).

## Composition with Seams B & C (research.14)

The base this plan seeds is the floor; the write-back (Seam C) moves `mood`/`streak` on top of it going forward — already scoped non-conflicting in `citizenDialMap.nudgesForReflection_` (composure-as-affect-only is the write-back's axis; the objective seed keeps real-event composure). So Seam A and Seam C compose without double-counting. Seam A unblocks the *input* (faces enter the loop); Seam B (classifier reliability) + Seam C (wiring) close the *return path* — all three needed for a turning loop. This plan does not depend on B/C and can ship independently.

## Acceptance criteria

1. Every roster citizen reaches ESSENCE MATCH in `scripts/seedTier1Essence.js` before any live write.
2. Live write applied via the engine-sheet handoff; seeded faces read their essence in `DialState` and clear the `deviation ≥ 60` wake gate (verified live).
3. No double-count: archive append is author-once; column O untouched; `backdateCitizenDials --apply --live` re-derives cleanly.
4. Plan registered in `docs/index.md`; `research.18` ROLLOUT row points here.

## Status

- [x] Mechanism designed + POC validated S265 — 4 voiced faces, 32/32 (`utilities/tier1EssenceEvents.js`, `scripts/seedTier1Essence.js`).
- [ ] Tier-1 authoring (civic + media voices — extraction).
- [ ] Tier-2 authoring (remaining A's — from coverage).
- [ ] Tier-3 authoring (family / Mara / Paulson / Lucia).
- [ ] Map pure-integrity/warmth tag decision (do before Tier-2 if the coupling bites).
- [ ] Engine-sheet live write + live verify (handoff).

## Changelog

- 2026-06-21 — Initial draft + POC validated (S265, research-build). Seam A of the citizen-loop closure (Mike's loop). Mechanism: complete-the-history, not shield-Tier-1. 4 faces proven 32/32. Roster tiered by canon source per Mike's guidance (voiced agents easy / A's from coverage / family-planner-GM from canon). Filed as research.18.
