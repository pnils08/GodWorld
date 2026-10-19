# TASK — codex: review the wakes-have-no-rules build plan before any code

Read-only: code + `output/` dumps; no cron, model, Sheet write, bench or canon run. Write to `docs/for-claude-review/2026-10-17-codex-wake-no-rules-plan-review.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~100 lines.
Plan: `docs/plans/2026-09-10-inactivity-is-regression.md` §Wakes have no rules — build plan. Builder 2026-10-17, verbatim: "Any citizen can wake whenever , there are no rules"; "the most curated citizen isn't even getting all I've paid for" (Mags, POP-00005).

## Hunts
1. **Completeness.** Is the W-table every condition in `lib/wakePerception.js` `buildPool` (:376-) and the `scripts/citizen-wake.js` picker that keeps a citizen from waking? Anything missed (e.g. a filter in `pickLived`, the voiced slot, tier/status, Inactive rows)? Are the two "stays" rows really data preconditions, or exclusions in disguise?
2. **W1/W2 at the wake call only.** With `shapedMin: 0, lifeMinChars: 0` at `citizen-wake.js:300`, what does `livedOnly` / the lived slot / the posture slot do — any path that now double-picks or starves? Pool size on the C111 snapshot vs today's?
3. **W3 blast radius.** Removing `:421` admits POP-00005 to all six `buildPool` calls. Anything downstream (exchange pairing, citizenVoice, page writes, Ines's Voices reading pages) that breaks or leaks with her in?
4. **W4 reading.** The ruling names the dial-distance weight; the plan keeps `eventMag`. Right reading, or is eventMag also a rule?
5. **M1.** Is stripping the `### Nightly Reflection — <date>` header in `loadOwnPageReadback` enough to keep real-world dates out of a wake prompt that reads her page? Any other real-world or builder text path from `discord-reflection.js` (Discord conversations, Moltbook, claude-mem) into her page?
6. **M2.** Row shape, classifier call, idempotency per night, bondTarget, the petition-pool reader (`buildCivicOfficeSlice.js:993-1001`), and the drain (`citizenMemory.js:185`): does the snippet reach any ledger cell? Name the per-Cycle row count and what it does to her base at `REFLECTION_MULT` 0.45 × `REFLECTION_ACCRETION_FRAC` 0.5 — the number goes to the builder, not a cap.

Done = the md exists.
