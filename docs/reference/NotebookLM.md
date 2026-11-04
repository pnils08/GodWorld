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
| `GodWorld — Daily Newsroom (clean)` (working) | `newsroomNotebookId` | One bounded source per day (today's pack) + the audio-direction guide; older daily sources pruned each run | **Never.** `canonStatus: NOT_CANON` on every manifest. Includes staged and sample drafts by design |

Canon itself is whatever the ingest paths send; an ingest path's gate decides it (CLAUDE.md §Fact sources). NotebookLM is the slow, strong-prose way to ask it; Supermemory `search_canon` is the fast way and what crons use. Exact current values (POPID, initiative status, vote, metric) come from the live sheet, not NotebookLM.

## Who feeds it / who reads it

| Direction | Piece | What it does |
|---|---|---|
| in | `scripts/notebooklmPush.js` | Adds an artifact as a source to the permanent notebook (`--audio` also renders audio → Drive + Discord; `--kind lore` for lore). Non-blocking by contract: failure prints `NOTEBOOKLM PUSH FAILED (non-blocking)` and exits 0 |
| in | `cron-saturday-run.js` (publish step), `/post-publish`, `loreIngest.js` | Callers of the push |
| in | `scripts/notebooklmDailyNews.js` | Builds and adds the daily bounded source to the working notebook (cron 08:00, below) |
| read | `scripts/notebooklmCanonSearch.js` | Read-only, fail-closed query wrapper over the permanent notebook; policy in `notebooklmCanonSources.json` (validated by `notebooklmCanonSourcesValidate.js`). The `source-search` agent's `prior-published-arc` lane may call only this |
| read | MCP server `notebooklm` (`mcp__notebooklm__*`) | Interactive queries, studio (audio/report) tools. Needs a reconnected session to appear; the CLI is the fallback |
| read | Skills that name it | `deep-dispatch`, `sift`, `city-hall-prep`, `desk-review`, `post-publish`, `lore-writer`, `lore-ingest`, `run-cycle` |
| both | CLI `.venv/nlm/bin/nlm` | Version 0.15.5 on this box (checked 2026-11-04). Persistent-profile Chrome login; auth and root-patch recovery in [[notebookLM-CLI]] |

## The daily news (cron 08:00 Central, every day)

`0 8 * * * node scripts/notebooklmDailyNews.js >> logs/notebooklm-daily-news.log`

1. Latest `output/world_summary_c<N>.md` + the last 36 hours of staged/sample newsroom drafts for that Cycle (`hours: 36`) + the citizen day digest.
2. Queries the permanent notebook for published continuity, scoped to the last two Editions (query timeout 420 s; one retry only for non-timeout failures; on failure it degrades to a no-continuity brief and the next run retries).
3. Builds one bounded source (hash-named run folder `output/notebooklm/daily/c<N>/<hash>/`), adds it to the working notebook, prunes stale daily sources, queries only that source for the written brief (`daily-brief.md`).
4. Renders the audio overview in the router's format, drops it to Drive and Discord, deletes the local audio. The ops-report step is non-blocking and has timed out at 15 minutes recently.
5. Writes `manifest.json`: `routingShadow`, `newsroomPulse` counts, `audioPresentation`, source ids, `canonStatus`.

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

- 2026-11-04 — Page created from the operator guide, `config/notebooklm.json`, the daily/router/push scripts and the daily-news manifests C112–C114. Recorded the Nov 3 brief: the router chose `CYCLE_OPEN` (0 passed, no first-morning credit) because the Mon Nov 2 and Tue Nov 3 18:15 write wakes died on a UTC-date lookup after the Nov 1 clock change (no fanout file for the next UTC day). Fixed the same day in `cron-desk-run.js` / `newsroom-fanout.js` via `scripts/centralDate.js` (Central date). Mon/Tue filings were not re-run.
