# Brief for agy — adversarial review: Talia Finch on her seat file

**From:** research-build · **Date:** 2026-11-25 · **Your output:** `output/antigravity/2026-11-25-review-talia-seat.md` · read-only on code and docs. **Live from her Thursday 2026-11-26 06:15 wake.**

## What changed (commit `84839ec34`)

Talia Finch (POP-00592, the Oaks from the ground) moves to the mold P Slayer took last session (`docs/plans/2026-11-21-reporters-wake-as-themselves.md` §The mold, §The sports seats, the Talia read under it). Builder: remove the puppeting, tighten the instructions; bios hold deep history only; "she can inteview whom ever she wants when ever she wants".

- `.claude/agents/talia-finch/SEAT.md` (new) — replaces IDENTITY / LENS / RULES / SKILL as her boot (those stay in the folder; reporterIdentity reads IDENTITY to find her voice file).
- `scripts/buildTaliaRecord.js` (new) on `scripts/sportsRecord.js`, same shape as `scripts/buildPSlayerRecord.js`.
- `scripts/newsroom-wake-packages.json` → `talia-finch` (TALIA-OAKS-2): models, seatFile, seatMemory, writerTools, reviewProfile.
- `scripts/cron-desk-run.js` + `scripts/newsroom-fanout.js` BEAT_BUILDERS; `scripts/newsroomSourcing.js` her street branch; `scripts/newsroomWakePackages.js` WRITER_TOOLS_SEATS; `scripts/cron-desk-writer.js` OWN_TOOL_SEATS.

Compare against P Slayer's switch: `git show 602e52a9d 66ff03dc7`.

## Attack these

1. **Puppeting left in.** Any line in SEAT.md, the record, or anything still reaching her wake (old STANCE line in `cron-desk-run.js` buildLaneState ~937, desk-approach-map, persona-map note, the writer's hard blocks, the old slice) that tells her what to write, which story, how to open or close. Builder: "job lines are fine, telling them what to say is puppeting".
2. **Canon conflicts.** SEAT.md against her CitizenBio (live sheet / `output/simulation_ledger_snapshot.jsonl` POP-00592), her row, and the archive (C43–C116 Finch pieces via `archive/ARTICLE_INDEX.jsonl`). Builder: the Tribune relocated her to Oakland to follow Paulson from Chicago.
3. **Tools that do not reach her.** Each tool SEAT.md names against the morning (`seatMorningPlan`) and write (`cron-desk-writer.js` TEST_SEAT toolset) paths: citizen_lookup, memory_recall (seatMemory), canon_recall, canon_search, sheet_read with Business_Ledger and Neighborhood_Map (SHEET_READ_ALLOWLIST), ask_worker GRIDIRON (Jade Soy). Anything named that she cannot call, or callable and not named.
4. **Wiring gaps versus P Slayer.** Anything his switch touched that hers did not (or the reverse), e.g. old scored-pick branches, the fanout's sports handling, `seatDossier`, the rota, `sitsOutWhenEmpty`, roomIsYours exemption lists, the record's file names (`talia_record_slice_c{N}.json`).
5. **The record.** `buildTaliaRecord(117)` — does she get every public Oaks row, the colleagues' pieces, her own; anything an Oaks-quiet week does (sits out); private feed rows excluded.
6. **The gate profile.** reviewProfile v2 — any blocker that is not a fact check; any fact check lost from v1 that the gate still needs.

Each finding: file:line, what is wrong, severity (high / medium / low). Verify every claim against the files before you write it. Do not propose a different goal or design.
