---
title: NotebookLM — how GodWorld uses it, and what changed
created: 2026-11-04
updated: 2026-11-04
type: reference
tags: [infrastructure, media, active]
sources:
  - config/notebooklm.json
  - scripts/notebooklmDailyNews.js
  - scripts/notebooklmDailyRouter.js
  - scripts/notebooklmPush.js
  - scripts/notebooklmCanonSearch.js
  - scripts/notebooklmCanonSources.json
  - docs/reference/notebookLM-CLI.md
pointers:
  - "[[notebookLM-CLI]] — operator guide: install, login, root-Chrome patch, upgrade procedure, canon-search wrapper detail"
  - "[[../index]] — documentation catalog"
---

# NotebookLM — how GodWorld uses it, and what changed

One page for "what is NotebookLM doing in this system, who feeds it, who reads it, what broke last."
Operations detail (install, login, patch, upgrade) stays in [[notebookLM-CLI]]. Keep this page current: every change to a NotebookLM script, config key, cron, notebook or source policy adds a line to the Change log below in the same commit. A rule file (`.claude/rules/notebooklm.md`) points here whenever one of these files is opened.

Product name drifts (Gemini Notebook / NotebookLM); file and tool names stay `notebooklm*` / `nlm`.

## The two notebooks

IDs live in `config/notebooklm.json` only — never copy them into scripts.

| Notebook | Config key | Holds | Canon? |
|---|---|---|---|
| `GodWorld` (permanent) | `notebookId` | Published Editions (Saturday publish → `cron-saturday-run.js`, `/post-publish`), graded lore pieces (`loreIngest.js` → `notebooklmPush.js --kind lore`), TrueSource player cards | A reader over what was published and ingested. It reproduces; it promotes nothing |
| `GodWorld — Daily Newsroom (clean)` (working) | `newsroomNotebookId` | Today's sources only, each small and on its own: one per article, one per neighborhood of citizen reflections, the world record by section on a Cycle's first morning. Earlier days' sources pruned each run (pipeline.108) | **Never.** `canonStatus: NOT_CANON` on every manifest. Includes staged and sample drafts by design |

Canon itself is whatever the ingest paths send; an ingest path's gate decides it (CLAUDE.md §Fact sources). NotebookLM is the slow, strong-prose way to ask it; Supermemory `search_canon` is the fast way and what crons use. Exact current values (POPID, initiative status, vote, metric) come from the live sheet, not NotebookLM.

## Who feeds it / who reads it

| Direction | Piece | What it does |
|---|---|---|
| in | `scripts/notebooklmPush.js` | Adds an artifact as a source to the permanent notebook (`--audio` also renders audio → Drive + Discord; `--kind lore` for lore). Non-blocking by contract: failure prints `NOTEBOOKLM PUSH FAILED (non-blocking)` and exits 0 |
| in | `cron-saturday-run.js` (publish step), `/post-publish`, `loreIngest.js` | Callers of the push |
| in | `scripts/notebooklmDailyNews.js` | Builds and adds the day's sources to the working notebook, one per article (cron 08:00, below) |
| read | `scripts/notebooklmCanonSearch.js` | Read-only, fail-closed query wrapper over the permanent notebook. Scope = the live source list, fetched on every call (pipeline.103); a source not ready fails the call. Policy in `notebooklmCanonSources.json` is the audit (validated by `notebooklmCanonSourcesValidate.js`), not the scope. The `source-search` agent's `prior-published-arc` lane may call only this |
| read | MCP server `notebooklm` (`mcp__notebooklm__*`) | Interactive queries, studio (audio/report) tools. Needs a reconnected session to appear; the CLI is the fallback |
| read | Skills that name it | `deep-dispatch`, `sift`, `city-hall-prep`, `desk-review`, `post-publish`, `lore-writer`, `lore-ingest`, `run-cycle` |
| both | CLI `.venv/nlm/bin/nlm` | Version 0.15.5 on this box (checked 2026-11-04). Persistent-profile Chrome login; auth and root-patch recovery in [[notebookLM-CLI]] |

## The daily news (cron 08:00 Central, every day)

`0 8 * * * node scripts/notebooklmDailyNews.js >> logs/notebooklm-daily-news.log`

1. Collects the last 36 hours of staged/sample newsroom articles (`hours: 36`) for the Cycle, plus the previous Cycle's still in the window; an article no delivered show has carried stays eligible for 72 hours, and one a delivered show carried on an earlier day is not carried again unless its file changed. Edition day adds the printed edition, the Civis journal and the UNDOCKED digest. `buildCitizenWeekDigest` returns every reflection of the last 24 hours by citizen.
2. Builds the sources in the hash-named run folder `output/notebooklm/daily/c<N>/<hash>/sources/`: one per article (headline, `By <Reporter>, The Bay Tribune`, reader copy; the edition is split on its `====` rules), one per neighborhood of reflections (every citizen by name; `filed:` / `graded:` newsroom rows left out), and — first morning of a Cycle only — the world summary one source per `##` section, Sports cut to the current Cycle. Not sources: the world report on any other day, the permanent notebook's continuity answer (no longer queried), reporter chase notes and gathered quotes, gate-flagged drafts, any direction guide.
3. Uploads each source on its own (`The Bay Tribune Daily C<N> — <Reporter>: <headline>`; one failed upload is logged and skipped, zero landed fails the run), prunes every earlier daily source, queries today's sources for the written brief (`daily-brief.md`).
4. Renders the audio overview in the router's format with one short focus (stories by reporter, citizens by name, sources are the only truth), drops it to Drive and Discord, deletes the local audio. The ops report is non-blocking: flagged drafts and gate findings go up as one `gate desk file` source only after the audio is created; it has timed out at 15 minutes recently.
5. Writes `manifest.json`: `sources` (kind, title, hash, id, file, path), `routingShadow`, `newsroomPulse` counts, `audioPresentation`, `canonStatus`.

**It reports what the evening wake produced.** The 18:15 weekday write wake stages and gates the day's drafts; the 08:00 brief collects them about 14 hours later. If the 18:15 run writes nothing, the next morning has nothing reported.

**Router (`notebooklmDailyRouter.js`, live: `honorRouter: true`, `reportedDayThreshold: 1`).** Picks the audio format by what the newsroom passed:

| Profile | When | Audio |
|---|---|---|
| `VERIFIED_OPPOSITION` | a proven opposition packet | debate / default |
| `REPORTED_DAY` | Rhea-passed filings + published extras (+1 on the first morning after the Cycle fire, +published Edition/journal on edition day) ≥ threshold | deep_dive / default |
| `CYCLE_OPEN` | angles or material signals but under the threshold | brief / short |
| `QUIET_DESK` | nothing material | brief / short |

A "brief" morning means the router saw zero passed filings and no first-morning or edition-day credit. Check the manifest (`routingShadow.reasonCodes`, `newsroomPulse.counts`) and the evening `logs/newsroom-fanout.log` before suspecting the notebook.

## Where to look when it is wrong

| Symptom | First look |
|---|---|
| Brief where a deep dive was expected | Manifest `routingShadow` → `newsroomPulse.counts.passed`; then `logs/newsroom-fanout.log` for the 18:15 write wake (a `Fatal:` line) and `output/cron-compare/fanout-<date>.write.results.json` |
| Daily run died | `logs/notebooklm-daily-news.log`; auth expiry → [[notebookLM-CLI]] recovery; a query timeout degrades, it should not kill the run |
| Chrome will not launch as root / auth expired after an `nlm` upgrade | The root `--no-sandbox` patch was overwritten — reapply per the operator guide |
| Same pack runs again | Idempotent on the pack hash; read the manifest before `--force` |

## Stale spots in [[notebookLM-CLI]] (not yet corrected)

- §Current installation still names package 0.8.5 and §Version hold still says "hold at 0.8.5"; the box runs 0.15.5 (the guide's own hold section notes the 2026-10-17 upgrade).
- §Phase 6 routing shadow says the router does not change the live `deep_dive/default` presentation. With `honorRouter: true` it does; manifests show `audioPresentation.source: "router"`.
- The guide's Change log stops at 2026-08-20; this page carries the log from here on.

## Change log

- 2026-11-09 — Daily news v2.0 (pipeline.108, builder: "sources don't need to be on one document, no LLM reads that long of a document"). Through v1.9 the working notebook held two sources a day, one glued file of 12–29k words and the rulebook, and no article was ever its own source (Mon 11-09: 0 articles in 12,550 words). Now every article is its own source by reporter, the day's reflections are one source per neighborhood with every citizen named (was 5 citizens × 2), the world report rides only the first morning of a Cycle, and the rulebook (`config/audio_direction_daily.md`, deleted), the continuity query against the permanent notebook, reporter chase notes/quotes and gate-flagged drafts are out of the audio sources. Airs once: a piece a delivered show carried on an earlier day is skipped; an unaired piece stays eligible 72 h; the previous Cycle's late filings air on the first morning. `buildCitizenWeekDigest.buildDigest` returns `citizens`. Proof is the Tue 11-10 08:00 show.
- 2026-11-08 — `Lore: lore_c114_john-ellis-deep-dive (Y3C10)` → `efc4fe31-…` ingested on the builder's word ("Go") after three one-line fixes: the first piece from the finished pipeline.106 writer through the real Friday path (calendar + team timeline + subject dossier with card, household and page entries); 40 claims verified on grade. Notebook 154.
- 2026-11-08 — Two lore pieces by the upgraded writer (pipeline.106) passed after repair and ingested on the builder's word: `Lore: martin-richards-deep-dive (Y3C10)` → `10f17db1-…` (the builder chose the rerun over the repaired original, which is renamed `martin_richards.not-chosen.txt` so `buildArticleIndex.js` does not count it as passed lore) and `Lore: avery_santana_deep_dive (Y3C10)` → `f9225116-…`. Notebook 153.
- 2026-11-08 — Two repaired lore pieces passed and ingested on the builder's word ("send to canon"): `Lore: deep_dive_henry_rivas (Y3C8)` → `e3949d83-…`, `Lore: arturo_ramos_deep_dive (Y3C10)` → `edea3f29-…` (`loreIngest.js`: notebook + bay-tribune + policy lore bucket + newsroom staging). Notebook 151. The A's team timeline (`TrueSource_Team_Timeline_v1.1.txt`, Drive `1Bo4ZELG…`) copied byte-exact to `archive/non-articles/data/` for the lore writer (pipeline.106).
- 2026-11-08 — Removed the hand-added `Lore : deep_dive_henry_rivas.md (Y3C8)` (`50b6dde2-…`, builder "Pull it now"): the draft the lore gate failed tonight (bought vs rented, rehab cycles, the Y3C6 game), never in the policy, and searchable as canon by the lore writer's new `notebook_search` (pipeline.106). The repaired Rivas re-enters through `loreIngest.js` if it passes. Notebook 149.
- 2026-11-08 — Saturday Drive drops re-routed (pipeline.104, builder 11-08: "cycle pulse goes in" Y-003, "weekly audio goes" Weekly_News). Since the 2026-09-14 re-point the audio overview rode `driveDest: "edition"` into Y-003 (C108–C114) and the edition text went to Drive nowhere (last there: the C107 PDF from the manual print). Now `config/notebooklm.json` `driveDest: "audio"` → `saveToDrive.js` `audio` = 1_The_Cycle_Pulse/Weekly_News (the fallbacks in `cron-saturday-run.js` and `notebooklmPush.js` too); `stepPublish` uploads `editions/cycle_pulse_c<N>.txt` to `edition` = Y-003 after the notebook add, non-blocking. C114 uploaded by the same command as proof. First Saturday read: C115, Sat 2026-11-14.
- 2026-11-08 — Horn lore restored (builder "Put it back"): `output/lore-quarantine/danny_horn_deep_dive.md`, unchanged since its 2026-10-18 pass, re-added as `Lore: danny_horn_deep_dive (Y3C7)` → `583182ab-…` (status 2) by `output/engine-sheet/2026-11-08-horn-lore-restore.js` (notebooklmPush lore, no audio, no summary; bay-tribune untouched); the policy lore entry moved `3824b8b0` → `583182ab`. Notebook 150; inventory refreshed to 150. A canon search on the piece selected all 150, cited `583182ab`, verified, 30 s — the add reached scope with no hand step. The validator now passes the lore bucket and stops on 69 live sources with no policy entry; under the whole-notebook ruling (2026-10-11) that list is the audit's, not a gate, and nothing is classified.
- 2026-11-08 — Validator inventory refreshed from the live notebook (`notebooklmSourceInventory.js`): 196 → 149 sources, the 69 deleted ids gone. Builder 11-08: the deletions were mostly duplicates and older TrueSource cards replaced by newer ones. One is not: policy lore `3824b8b0-…` (`Lore: danny_horn_deep_dive (Y3C7)`) has no live copy (`POP-00022_supplemental_c98_horn_deep_dive.txt` is a different piece), and its policy entry is what `buildArticleIndex.js` and `loreTargetSelect.js` read as Horn's passed lore, so it stays; the validator stops on it (`allowedLoreSourceIds contains unknown ID`). Builder call open: re-add the piece or record it gone.
- 2026-11-08 — Canon search scope is the live notebook (pipeline.103, builder 11-07: "anytime something is added the index recreates"). `notebooklmCanonSearch.js` no longer reads `output/codex/notebooklm-source-inventory.json`: every call runs `nlm source list` (3.4 s) and scopes to every source in it, so adds and deletes on any path — scripts, MCP, this notebook's web page — are in or out at the next search. A malformed listing, or a source not ready (status ≠ 2), fails the call before the query and logs `auth_failure` / `no_result`. Live proof: 149/149 sources selected, the 22 formerly out in, the 69 dead ids out; a C114 question answered from `0f829b78-…`, verified, 37.6 s. The inventory file and `notebooklmSourceInventory.js` remain the validator's diagnostic only. Reported, not classified: 69 live sources carry no policy entry; policy lore `3824b8b0-…` (`Lore: danny_horn_deep_dive (Y3C7)`) was deleted from the notebook outside any script. Plan `docs/plans/2026-11-07-notebook-search-scope.md`.
- 2026-11-07 — C114 edition source swapped by hand (builder: "you can swap the notebook copy"). The Saturday run added the printed edition at 16:03 (`fcf9410a-…`); four of its articles carried errors the builder's fix file corrected after the compile. A corrected copy (`output/corrections/c114/cycle_pulse_c114.corrected.txt`, ten edits) went in under the same title as `0f829b78-…`, the old source was deleted, and `scripts/notebooklmCanonSources.json` moved its entry (`output/engine-sheet/2026-11-07-c114-notebook-swap.js`). `editions/cycle_pulse_c114.txt` stays as printed; the C114 audio overview was made from the old copy. Found on the way: the validator's default inventory (`output/codex/notebooklm-source-inventory.json`, 2026-10-18, 196 sources) is stale — the notebook holds 149 — so a default run fails on C112's source; against a fresh listing the strict check fails on lore `3824b8b0-…` (in the policy, not in the notebook) before and after the swap. Corrected later the same day: the canon search runs no validator — it scopes every query to that stale inventory file (`notebooklmCanonSearch.js:103-122,407`), so 22 live sources (C112–C114, a lore piece, 17 stat cards) are out of search and 69 deleted ids are in; pipeline.103 (`docs/plans/2026-11-07-notebook-search-scope.md`).
- 2026-11-04 — Page created from the operator guide, `config/notebooklm.json`, the daily/router/push scripts and the daily-news manifests C112–C114. Recorded the Nov 3 brief: the router chose `CYCLE_OPEN` (0 passed, no first-morning credit) because the Mon Nov 2 and Tue Nov 3 18:15 write wakes died on a UTC-date lookup after the Nov 1 clock change (no fanout file for the next UTC day). Fixed the same day in `cron-desk-run.js` / `newsroom-fanout.js` via `scripts/centralDate.js` (Central date). The missed Mon and Tue write wakes were replayed late on Nov 4 (01:37–01:50 CST, `--date` per day): 9 stories staged and Rhea-passed, 2 flagged (one deterministic repair-chrome blocker, one stale Oaks record the gate caught), no calendar dates in any body. Tamsin and Nia file once for the week: daily seats share one file stem per Cycle (pipeline.88), so Monday's replay used Tuesday's plan and Tuesday's was refused as spent.
