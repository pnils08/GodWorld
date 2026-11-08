# Re-review brief — pipeline.103 plan fold

Target: `docs/plans/2026-11-07-notebook-search-scope.md` at `f2f407b94`. Diff of the fold: `git diff 7f44729c9 f2f407b94 -- docs/plans/2026-11-07-notebook-search-scope.md docs/engine/ROLLOUT_PLAN.md`.

Your review: `docs/for-claude-review/2026-11-08-codex-pipeline103-plan-review.md` (HOLD, F1–F4).

Fold, one line each:
- F1: the plan states the wrapper stays the whole-notebook canon search under the builder's 2026-10-11 ruling (`ff437d6fb`: every source in the notebook is canon); `--source-class` does not narrow, as today. The agent's "published-only" line (`.claude/agents/source-search/SKILL.md:35`) is trued to that ruling in Task 4; the ROLLOUT row names it.
- F2: a non-ready source in the listing fails a default-scope call before the query; an explicit `--source-ids` request fails on a requested id that is non-ready or not in the notebook; no partial scope is logged `verified`.
- F3: `normalizeLiveSources` shape contract (array ≥1, id, title, integer status, unique ids) before any filter; `stage = 'source_list'` set before the spawn.
- F4: map adds the 08:00 whole-notebook fallback and the MCP reader.
- Acceptance 3: your size concern is kept as the gate; the retrieval log shows verified calls on 196 ids (2026-10-19).

Question: does the fold close F1–F4, and does it open anything new? Scope: the fold only; keep it short. Write to `docs/for-claude-review/2026-11-08-codex-pipeline103-plan-rereview.md` with a verdict line.
