---
title: Gemini Notebook Deep Research Integration Plan
created: 2026-08-02
updated: 2026-08-20
type: plan
tags: [infrastructure, archived]
sources:
  - docs/engine/ROLLOUT_PLAN.md §infrastructure.7
  - docs/research/2026-08-02-notebooklm-deep-research.md
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — add entry in same commit"
---

# Gemini Notebook Deep Research Integration Plan

> **CLOSED / SUPERSEDED 2026-08-20 (Mike-direct; codex verified). Do not
> execute this plan or cite it as current architecture.** Its proposed daily
> path would import autonomous web/Drive research into an in-world broadcast,
> violating GodWorld's canon boundary. Its CLI-version premise and integration
> points were also not verified against the installed client and repository.
> Current research and implementation sequence:
> [[../research/2026-08-20-notebooklm-daily-branching]] and
> [[2026-07-10-notebooklm-bridge-deploy]] §Phase 6.

**Goal:** Upgrade the local `notebooklm-mcp-cli` to `0.9.4+`, apply the root-Chrome `--no-sandbox` patch, and deploy the new `source add-research --mode deep` capability to push contextual research into Google Drive for the daily newsroom brief.

**Architecture:** We are replacing the `0.8.5` pinned version in `/root/GodWorld/.venv/nlm/bin/nlm` with the latest version. This will unlock the `--mode deep` flag and export options. We will then write a wrapper script (`scripts/notebooklmDeepResearch.js`) that takes a topic, runs the autonomous deep research, exports the synthesized artifact (JSON/markdown), and pushes it to the designated Google Drive folder for the newsroom cron to consume.

**Terminal:** engine-sheet

**Pointers:**
- Prior work: [[../reference/notebookLM-CLI]]
- Related plan: [[2026-07-25-notebooklm-source-search-wiring]]
- Research basis: [[../research/2026-08-02-notebooklm-deep-research]]

**Acceptance criteria:**
1. `notebooklm-mcp-cli` upgraded to latest version with `--no-sandbox` working.
2. `nlm source add-research "test" --mode deep` executes successfully and generates a notebook.
3. New script `scripts/notebooklmDeepResearch.js` can output the synthesized research artifact to Google Drive.

---

## Tasks

### Task 1: Upgrade CLI and Apply Patch

- **Files:**
  - `docs/reference/notebookLM-CLI.md` — read
  - `/root/GodWorld/.venv/nlm/lib/python3.*/site-packages/notebooklm_tools/utils/cdp.py` — modify
- **Steps:**
  1. Activate virtual environment: `source /root/GodWorld/.venv/nlm/bin/activate`
  2. Upgrade package: `pip install --upgrade notebooklm-py`
  3. Re-apply the `--no-sandbox` patch to `cdp.py` to allow headless Chrome to run as root.
- **Verify:** `/root/GodWorld/.venv/nlm/bin/nlm --version` → [expected output `0.9.4` or higher]
- **Status:** [x] closed without implementation — superseded 2026-08-20

### Task 2: Write Deep Research Wrapper

- **Files:**
  - `scripts/notebooklmDeepResearch.js` — create
- **Steps:**
  1. Write a script that wraps `nlm source add-research <topic> --mode deep`.
  2. Have the script extract the research notebook and save the output as a Markdown file.
- **Verify:** `node scripts/notebooklmDeepResearch.js "Oakland maritime logistics"` → [creates local markdown file]
- **Status:** [x] closed without implementation — superseded 2026-08-20

### Task 3: Drive Integration for Daily Brief

- **Files:**
  - `scripts/notebooklmDailyNews.js` — modify
  - `scripts/notebooklmDeepResearch.js` — modify
- **Steps:**
  1. Extend `notebooklmDeepResearch.js` to upload the markdown file to the designated Drive folder.
  2. Ensure `notebooklmDailyNews.js` can read this Drive folder when compiling the daily listening brief.
- **Verify:** `node scripts/notebooklmDeepResearch.js "topic" --upload` → [Drive upload success message]
- **Status:** [x] closed without implementation — superseded 2026-08-20

---

## Open questions

- [x] Closed with the plan; neither question authorizes work.

---

## Changelog

- 2026-08-02 — Initial draft (Antigravity).
- 2026-08-20 (codex, Mike-direct) — Closed without implementation. Replaced by
  the verified deterministic daily-branching path; retained only as historical
  evidence and explicitly barred as an architecture/truth source.
