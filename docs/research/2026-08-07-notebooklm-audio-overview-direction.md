---
title: NotebookLM Audio Overview Direction — research
created: 2026-08-07
updated: 2026-08-07
type: reference
tags: [research, media, active]
sources:
  - Drive folder 1QQQ_LE4NA28pWucCsAv-cboS1AQzit2D (User provided via Gemini chat)
  - 00_AUDIO_DIRECTION_GUIDE (Drive Doc)
  - Explore NotebookLM audio overview prompts (Drive Doc)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home"
  - "[[index]] — register here, same commit"
---

# NotebookLM Audio Overview Direction — research

**Source:** User-provided Gemini chat output in Drive folder `1QQQ_LE4NA28pWucCsAv-cboS1AQzit2D` (contains `00_AUDIO_DIRECTION_GUIDE` and `Explore NotebookLM audio overview prompts`).

**What this addresses:** The user wants to improve the quality of the NotebookLM-generated audio overviews for both the "daily news run" (listening brief) and the "weekly drop" (Saturday edition compilation) by leaning on Gemini prompt injection techniques.

**What it does:** The source explains that NotebookLM's Text-to-Dialogue engine is heavily influenced by "meta-instructions" embedded directly in the source documents. By creating a `00_AUDIO_DIRECTION_GUIDE.md` document (or injecting prompt blocks into existing documents), you can dictate the hosts' persona (e.g., investigative audio journalists), tone, pacing, and thematic allocation (e.g., 40% macro-structural tension, 40% micro-narratives, 20% philosophical implications).

**Extraction — what's usable:**
- **Source-Prep Injection → Audio Overview Engine**: The `--focus` argument in the CLI is insufficient for deep character/tone control. We must inject explicit `[AUDIO HOST DIRECTION: ...]` blocks or include a dedicated `00_AUDIO_DIRECTION_GUIDE` source in the `--source-ids` list when calling `nlm audio create`.
- **Thematic Allocations → Daily/Weekly audio constraints**: The AI respects percentage allocations (e.g., "Dedicate at least 70% of the conversation to...").
- **Structured Headings → Audio segment pacing**: Clear markdown headings (e.g., `### Key Conflict`) signal deep discussion segments to the Audio Overview parser.

**Not applicable / hazard:** We cannot rely on the NotebookLM UI to "check" and "uncheck" sources because our pipelines (`scripts/notebooklmDailyNews.js` and `scripts/notebooklmPush.js`) are automated CLI scripts. Therefore, any source injection must be handled programmatically by passing the correct comma-separated list to `--source-ids` during `nlm audio create`, or by directly prepending the prompt into the generated source text before upload. 

**Verdict:** `adopt`
- We need to integrate an `AUDIO_DIRECTION_GUIDE` into both the Daily News Run and the Weekly Drop.
- This will require creating a plan to update `scripts/notebooklmDailyNews.js` and `scripts/notebooklmPush.js` to support this programmatic source injection.

**Ignited plans:** landed direct (S358, engine-sheet) — no separate plan doc; implementation notes below.

---

## Applications (living)

- 2026-08-07 — Initial extraction.
- 2026-08-07 (S358) — **Landed.** Two guide files: `config/audio_direction_daily.md` (in-world Bay Tribune hosts — the Drive archivist persona would break the daily's in-world news frame) + `config/audio_direction_weekly.md` (Drive `00_AUDIO_DIRECTION_GUIDE` near-verbatim). Both scripts upload the guide as a notebook source with a content-hash title (edit → auto-re-upload, unchanged → reuse) and append its ID to `--source-ids` on **audio create only** — written brief/summary queries stay unscoped to it. `--focus` gains a pointer sentence binding hosts to the guide. Guards: push.js only attaches the guide when the edition source ID resolved (guide-only scope would podcast the directive itself); all guide failures are non-blocking. SOURCE_VERSION 1.4→1.5. **Accepted hazard (Mike, S358):** the weekly guide lives as a permanent source in the canon archive notebook — unscoped archive queries can see it. Mitigation: meta first-line tells the model to ignore it for research/summary queries. **Watch:** next scheduled daily run + Saturday edition run; fine-tune if the canon notebook surfaces the guide in query answers.

---

## Changelog

- 2026-08-07 — Initial extraction (Antigravity).
