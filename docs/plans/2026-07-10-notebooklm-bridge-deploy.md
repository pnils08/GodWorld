---
title: NotebookLM Bridge Deploy Plan
created: 2026-07-10
updated: 2026-07-10
type: plan
tags: [media, infrastructure, active]
sources:
  - docs/research/2026-07-10-notebooklm-mcp.md — research basis (3-repo landscape, verdict adopt)
  - https://github.com/jacob-bd/notebooklm-mcp-cli — adopted client (v0.8.5, MIT)
  - https://github.com/jacob-bd/notebooklm-mcp-cli/blob/main/docs/API_REFERENCE.md — command reference
pointers:
  - "[[engine/archive/ROLLOUT_PLAN]] — parent rollout (research.23)"
  - "[[index]] — registered same commit"
---

# NotebookLM Bridge Deploy Plan

**Goal:** Every published edition lands in NotebookLM automatically — source added, audio overview generated and delivered to Mike — and the published archive becomes a grounded, citation-backed Q&A surface callable by Mags and agents.

**Architecture:** Adopt `jacob-bd/notebooklm-mcp-cli` (Python CLI `nlm` + MCP server; cookie-extract → internal-API mechanism — no DOM automation). A thin Node wrapper (`scripts/notebooklmPush.js`) shells out to `nlm` from `/post-publish` as a new step, with graceful-degrade on auth failure (warn + continue, never block the pipeline). The edition archive backfills into sharded notebooks (~50-source free-tier limit per notebook). Q&A (`nlm ask`) is a **reader-side reference over published canon** — sheets remain canon authority per ADR-0007; NotebookLM answers cite editions, they don't define world state.

**Terminal:** research-build (build) → media (runs the new /post-publish step per cycle)

**Pointers:**
- Research basis: [[research/2026-07-10-notebooklm-mcp]]
- Prior state: `docs/engine/archive/ROLLOUT_ARCHIVE.md` §Phase 12.6 (S67 NotebookLM findings; Podcastfy is a complement, not replaced)
- Integration point: `.claude/skills/post-publish/SKILL.md` (edition text ingest lives at its Step 1b; the NotebookLM push slots beside it)
- Published corpus: `editions/` — 53 artifacts (23 full editions + supplementals/interviews/dispatches)

**Acceptance criteria:**
1. From this box, `nlm ask` against a Bay Tribune notebook returns a citation-backed answer to an edition-content question.
2. On the next edition publish, /post-publish pushes the `.txt` to the current notebook, generates the audio overview, and delivers it to the agreed drop point with zero manual steps. With auth deliberately broken, the step emits a warning and every other /post-publish step still completes.
3. All 53 published artifacts are loaded into notebooks; a question spanning multiple past editions answers with citations.

---

## Tasks

### Phase 1 — Install + auth

### Task 1: Install the CLI

- **Files:** `.venv/nlm/` — create (venv pattern per Podcastfy precedent `.venv/podcastfy/`, S67)
- **Steps:**
  1. `python3 -m venv /root/GodWorld/.venv/nlm && /root/GodWorld/.venv/nlm/bin/pip install notebooklm-mcp-cli`
  2. Symlink or alias `nlm` for pipeline use: reference full path `/root/GodWorld/.venv/nlm/bin/nlm` in all scripts.
- **Verify:** `/root/GodWorld/.venv/nlm/bin/nlm --version` → prints version ≥0.8.5
- **Status:** [x] done S310 — v0.8.5 in .venv/nlm/

### Task 2: Auth on a headless box

- **Files:** none (their profile store; location confirmed during task)
- **Steps:**
  1. Read `docs/API_REFERENCE.md` + auth docs in the installed package / repo — confirm the actual `nlm login` flow (their README claims automatic cookie extraction via headless browser; UNVERIFIED on a truly headless host).
  2. Run `nlm login` with the chosen Google account (Open Q1). If it requires a display: fallback = run login on a machine with a screen and copy the profile/cookie store to this box (their named-profiles feature); document the exact fallback used inline here.
  3. Note the cookie-refresh horizon (their docs: 2–4 weeks) and the re-auth command in this plan's changelog for the ops record.
- **Verify:** `nlm notebook list` → returns (empty list is fine, no auth error)
- **Status:** [x] done S310 — Mike's cookie paste (Chromebook DevTools) → /root/.nlm/cookies.txt → `nlm login --manual -f`; profile at /root/.notebooklm-mcp-cli/profiles/default; `nlm notebook list` returns 3 notebooks

### Phase 2 — Notebook layout + backfill

### Task 3: Create the notebook

- **Files:** `config/notebooklm.json` — create (notebook ID(s), current-notebook pointer, profile name)
- **Steps:**
  1. Create one notebook via `nlm notebook create`: `Bay Tribune — Editions`. Mike's Gemini Pro plan carries NotebookLM Pro limits (~300 sources/notebook — Q3 resolved S310), so the 53-artifact archive plus years of forward cycles fit in one notebook. Verify the live cap during task; the config keeps a shard array so splitting later is a config change, not a code change.
  2. Write `config/notebooklm.json`: `{ "profile": "...", "shards": [{"range": [1,999], "id": "..."}], "current": "<id>" }`.
- **Verify:** `nlm notebook list` shows the notebook; config JSON parses (`node -e "JSON.parse(...)"`)
- **Status:** [x] done S310 — EXISTING notebook adopted instead of new: Mike already maintains "GodWorld" (417e2d29-4167-420f-a9cc-76fb6b2b7de2, 49 sources, Pro account). config/notebooklm.json written. GodWorld_Oakland (a82990bc, 35 src) left untouched

### Task 4: Backfill the archive

- **Files:** `editions/*.txt` — read only
- **Steps:**
  1. Loop the 53 artifacts, `nlm source add` each to the notebook (parse `_c<NN>` from filename for logging/order). Batch mode if their `batch` op covers source-add; otherwise sequential with a small sleep.
  2. Log per-file result; re-run is idempotent-safe only if we check `nlm source list` first — do the check.
  3. **No audio backfill** — even Pro's ~20 audio overviews/day makes a 53-artifact backfill a multi-day grind for audio Mike already heard; audio is forward-only from the next publish.
- **Verify:** `nlm source list` → count is 53
- **Status:** [x] SKIPPED S310 (Mike-direct: "bay tribune already populated nothing to back fill") — his GodWorld notebook already carries the edition corpus (49 sources); no server-side backfill

### Task 5: Grounded-ask smoke test

- **Steps:**
  1. `nlm ask "What happened with the West Oakland Stabilization Fund?"` against the notebook.
  2. Confirm the answer carries citations pointing at edition sources, and spot-check one citation against the actual edition text.
- **Verify:** cited answer; citation matches real edition content
- **Status:** [x] done S310 — Stabilization Fund question answered with 19 citations across 8 sources; spot-checked cited text matches real edition prose ($4.2M/47 approved/342 applicants, Webb, Osei→Okoro transfer). Acceptance criterion 1 PASS

### Phase 3 — /post-publish integration

### Task 6: Push wrapper script

- **Files:** `scripts/notebooklmPush.js` — create (**new .js — approved via this plan**, per FIX-don't-ADD gate)
- **Steps:**
  1. Node wrapper: args `--file <edition.txt> --cycle <NN> [--audio]`. Reads `config/notebooklm.json`, resolves shard, shells `nlm source add`; with `--audio`: `nlm audio create` (deep-dive format) then `nlm download` the artifact to `output/audio/nlm_overview_c<NN>.mp3` (exact download command per their API_REFERENCE, confirmed in Task 2).
  2. **Graceful degrade:** any `nlm` failure (auth expiry, rate limit, UI change) → print `NOTEBOOKLM PUSH FAILED (non-blocking): <reason>` and `process.exit(0)`. The pipeline never blocks on this bridge.
  3. Shard-full handling: if source-add fails on capacity, log instruction to create next shard + update config — don't auto-create.
- **Verify:** run against the latest published edition file → source visible in `nlm source list`; then rename the cookie store and re-run → warning + exit 0
- **Status:** [x] done S310 — live add path verified (test source added+deleted); source-ID parse added; audio now scoped `--source-ids <new>` + `--focus` (unscoped would podcast the whole archive). Audio/delivery live-fire on next edition publish

### Task 7: /post-publish step wiring

- **Files:** `.claude/skills/post-publish/SKILL.md` — modify
- **Steps:**
  1. Add Step 1c "NotebookLM push" after Step 1b (bay-tribune text ingest): `node scripts/notebooklmPush.js --file <artifact> --cycle <NN> --audio` for `--type edition`; without `--audio` for interview/supplemental/dispatch (source-only — audio quota is scarce, editions get it).
  2. Mark it parallel-OK (independent of the citizen/grade chain) and non-blocking by contract (Task 6 degrade rule).
  3. Add the production-log line item for Step 12's checklist.
- **Verify:** skill lint passes (`/reload-skills` clean); dry-read of the step by a fresh session is unambiguous
- **Status:** [x] done S310 — SKILL.md v1.10: Step 1c + matrix row + Parallel-OK grouping

### Task 8: Audio delivery to Mike

- **Files:** `scripts/notebooklmPush.js` — extend
- **Steps:**
  1. After download, deliver per Open Q2's answer: Drive upload (existing Drive lib used by edition-print pipeline) and/or Discord post (existing bot reply path with file attachment).
  2. Include cycle + edition title in the delivery message.
- **Verify:** audio file lands at the drop point on a real run
- **Status:** [~] built S310 — both drops in wrapper (Drive via saveToDrive.js + Discord webhook, attach <8MB else link); live verify pending auth

### Phase 4 — Maximize: summary capture + canon Q&A surface

### Task 9: Notebook summary capture

- **Files:** `scripts/notebooklmPush.js` — extend
- **Steps:**
  1. After source-add on edition runs, `nlm ask "Summarize edition C<NN> — lead stories, key citizens, decisions"` against the current shard; save to `output/nlm_summary_c<NN>.md`. (Mike-direct S310: NotebookLM chat writes the best edition summaries — capture them as artifacts instead of losing them in his browser.)
  2. Same degrade rule: failure warns, never blocks.
- **Verify:** summary file exists after a push run, content is a real summary with edition specifics
- **Status:** [~] built S310 — in wrapper (`nlm notebook query` → output/nlm_summary_c<NN>.md); live verify pending auth

### Task 10: Q&A surface for Mags + agents

- **Files:** `.mcp.json` — modify (register their MCP server for interactive sessions); `CONTEXT.md` or retrieval-tool-map memory — update pointer
- **Steps:**
  1. Register the jacob-bd MCP server in `.mcp.json` (stdio, pointed at the venv binary) so interactive Mags sessions can `ask_question` directly; pipeline keeps using the CLI.
  2. Add one line to the citizen-retrieval tool map (memory `feedback_citizen-retrieval-tool-by-question.md`): "published-edition questions with citations → `nlm ask` / NotebookLM MCP — reader-side reference only, sheets remain canon authority (ADR-0007)."
- **Verify:** fresh session lists the MCP tools; a test `ask_question` returns a cited answer
- **Status:** [x] done S310 — `notebooklm` stdio server registered in .mcp.json (venv notebooklm-mcp binary, verified launches); retrieval-tool memory updated with the published-edition-Q&A lane + ADR-0007 boundary + re-auth recipe

### Task 11: Close the loop

- **Files:** `docs/engine/archive/ROLLOUT_PLAN.md`, `docs/research/2026-07-10-notebooklm-mcp.md` — modify
- **Steps:**
  1. Flip research.23 state as phases land; `done-pending-archive` when acceptance criteria 1–3 all pass.
  2. Append Applications line in the research file: date + "post-publish bridge live."
- **Verify:** rollout row reflects reality
- **Status:** [ ] not started

---

## Open questions

- [x] **Q1 — RESOLVED S310:** Mike's own account (Mike-direct "use my account"). Hazard accepted knowingly.
- [x] **Q2 — RESOLVED S310:** both drops (Mike-direct) — Drive upload + Discord webhook.
- [x] **Q3 — RESOLVED S310:** Mike has Gemini Pro (Google AI Pro), which carries NotebookLM Pro limits (~300 sources/notebook, ~20 audio/day, ~500 asks/day). Single-notebook layout adopted (Task 3); quota headroom is comfortable at per-cycle cadence.

---

## Changelog

- 2026-07-10 — Initial draft (S310). Research basis locked same day; jacob-bd adopted over PleasePrompto (S307 candidate) and roomi-fields per landscape table. Draft pending Mike's answers on Q1–Q3.
- 2026-07-11 — Auth live (manual cookie), existing GodWorld notebook adopted (no backfill, Mike-direct), grounded-ask smoke test PASS with citations, wrapper live-verified + audio source-scoping fix, MCP registered. Remaining: Tasks 8/9 live-fire + acceptance 2 on next edition publish; Task 11 close-out after.
- 2026-07-10 — All three Qs resolved same session (his account / both drops / Gemini Pro). Tasks 1, 7 done; 6, 8, 9 built pending live verify; Task 2 waiting on cookie paste. Status draft → active.
