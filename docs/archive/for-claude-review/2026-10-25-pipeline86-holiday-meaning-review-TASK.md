# TASK — adversarial review: world-born holidays reach the desks with their meaning (pipeline.86)

- **Lane:** antigravity (read-only; write only `output/antigravity/2026-10-25-review-pipeline86-holiday-meaning.md`)
- **Owner / lander:** research-build
- **Target:** the UNCOMMITTED working-tree diff saved at `/tmp/claude-0/-root-GodWorld/78b343cd-2ce6-49d7-ac3f-26f773f60c33/scratchpad/pipeline86.patch` — `scripts/beatSliceKit.js`, `scripts/buildWorldSummary.js`, `scripts/livedExperiencePacket.js`, and their tests. Review that patch, not HEAD.
- **Ruling:** builder 2026-10-07 approved two meaning sentences as working lines (`docs/plans/2026-09-29-sim-holiday-calendar.md` line ~257, verbatim in the patch); plan §247 names the carrier as newsroom-side. ROLLOUT pipeline.86.

## What the change does

1. `beatSliceKit.js`: `HOLIDAY_MEANING` (two sentences, keyed by the SIM_HOLIDAYS flag), `holidayMeaning(flagOrLabel)` (only `type: 'godworld'` rows carry one), `calendarContext(cycle, root)` (reads the `**Calendar context:**` line back from `output/world_summary_c<cycle>.md`; null when no summary).
2. `buildWorldSummary.js` `emitHeader`: `holiday=<label>` becomes `holiday=<label> — <meaning>` for Creation Day and Second Dawn only.
3. `livedExperiencePacket.js` `buildAnglePacket`: pushes `Calendar: Y<n>C<m>, <season>, holiday=…` as a known FACT for every seat, src = the summary line. Before this the packet carried no calendar at all (verified: 0 "holiday"/"season"/"Y3C8" in `culture_c112_ines-sorensen_…state.json`).

## Hunts

1. **Regex on the summary line.** `calendarContext` uses `/^\*\*Calendar context:\*\*\s*(.+?)\s*(?:\|\s*Sports season:.*)?$/m`. Break it: a meaning sentence containing `|`, a summary line without the Sports season field, CRLF, a second `**Calendar context:**` line. Does the lazy group ever swallow the Sports season part?
2. **Fact-id / manifest contract.** `attachFactIds` and the V2 auditor approve numbers only from `known`. Does a `Calendar:` fact with `Y3C8` / `C112` tokens change what the auditor treats as an approved number, or collide with the existing `Current cycle: C112` claim (`livedExperiencePacketV2.js:130`)? Does `chaseReplacesAssignment` (lEP ~512) now admit "winter"/"holiday"/"calendar" as on-assignment tokens and loosen the off-assignment check?
3. **Ordering and caps.** Any consumer that reads `known[0]` or caps `known` length (cron-desk-writer.js:479 takes `facts[0]` for the INTAKE CLAIM line — is the calendar fact ever first? `task.assignment` cap 500?). Would the calendar fact displace a story fact anywhere?
4. **Require cycle.** `livedExperiencePacket.js` now requires `beatSliceKit.js` lazily inside a function; `beatSliceKit` requires `buildEconomicSlice` (top) and `../phase02-world-state/getSimHoliday` (top). `buildEconomicSlice` requires `beatSliceKit` lazily (line 605). Prove there is no load-order problem for the cron entry points (`cron-desk-run.js`, `buildWorldSummary.js` CLI, `buildEconomicSlice.js` CLI).
5. **Canon leak.** The two sentences name Civis Systems and the Tribune. Anything real-world or builder-facing in them, or in the FACT src string?
6. **Test honesty.** Test 4b writes a scratch summary under `os.tmpdir()` — does it ever touch `output/`? Are the assertions anchored on the real strings, or only on their presence?

## Format

Findings numbered, file:line in the patch, severity, verified repro or "could not verify". End SHIP / SHIP-WITH-FIXES / HOLD. No code edits, no Sheets, no cron, no network.
