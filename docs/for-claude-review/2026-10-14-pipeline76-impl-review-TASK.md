# TASK — codex: implementation review of pipeline.76 (2026-10-14)

**From:** engine-sheet. **Mode:** read-only. No code edits, sheet writes, cron or model runs, commits.
**Output:** `docs/for-claude-review/2026-10-14-codex-pipeline76-impl.md`. One verdict per hunt, with file:line evidence.

**Under review:** `3ea20e3f` — one package (MARBURY-LEP2-2) writes with tools, the builder's exception to ADR-0017 §Decision 3. `newsroomWakePackages.js` (writerTools validation), `newsroom-wake-packages.json`, `cron-desk-run.js` runWrite (`--writer-tools`, state-file reload), `cron-desk-writer.js` (`WRITER_TOOLS`, `DOSSIER_TOOL` / `toolDossierRead`, loop `toolset`/`keepResults`, the pre-INTAKE manifest amend), `livedExperiencePacketV2.js` (`selectUsedToolLines`, `appendToolFacts`). First run artifacts: `dfe7aaf5` (`output/cron-compare/sports_c111_elliot-marbury_packet-v2_*`, staged copy, `sports_c111_packet-v2.tooltrace.json`). ADR-0017 changelog 2026-10-14 states the rule.

## Hunts

1. Containment: can any other package, any persona-less run, `--tools-ab`, or the legacy non-packet path get `--writer-tools`? Is the zero-tools default still fail-closed (`resolveMaxToolCalls`, `maxToolCalls: PACKET_ONLY && !TOOLS_AB ? WRITER_TOOLS : 6`)?
2. Evidence boundary: `selectUsedToolLines` admits a tool line when a body number is new and appears in it, or a 5-word run matches. Can a common number (a year, "3", "1") or a generic 5-word run admit a line the Article didn't actually use — and does an admitted-but-unused line enlarge what Rhea treats as approved? Can a canon_search hit (prior coverage text, possibly with names and quotes) enter as an approved FACT and launder a quote past `UNAPPROVED_QUOTE`?
3. `appendToolFacts`: POPID stripping, `manifest.id` recomputation, `assertBase` W3; does anything downstream key on the original manifest id (Rhea proof, `exactRheaProof`, staged sidecar, INTAKE sidecar, story doc)? Is the state file rewritten before both the writer's `auditArticle` and the repair-pass re-audit?
4. `toolDossierRead`: name matching (`includes` either way) — can "Ramos" / a short or partial name pick the wrong card? Does every line match the slice's text byte-for-byte for the same season (so an already-approved line is not duplicated under a second id)?
5. The first run's memo prints 460, 6.5, 2042 outside the manifest (kill-condition thresholds the contract asks for) and Rhea passed. Is that the load-bearing policy working as written, or a gap the tool path widened?
6. `.tooltrace.json` is per desk+tag (`sports_c111_packet-v2.tooltrace.json`) — another sports seat the same day overwrites it before the `.wake.json` toolCalls read? Sequence the fan-out to confirm.
