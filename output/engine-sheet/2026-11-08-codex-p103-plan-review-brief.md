# Review brief — pipeline.103 plan (canon search scope from the live notebook)

Target: the plan `docs/plans/2026-11-07-notebook-search-scope.md` at commit `7f44729c9` (§Reader map, §Design, §Acceptance). No code yet; this is the one plan review before the build.

Builder's words (2026-11-07): "it should be scripted that anytime something is added the index recreates"

The design: `scripts/notebooklmCanonSearch.js` stops reading `output/codex/notebooklm-source-inventory.json`; every call runs one `nlm source list <notebookId> --json` and scopes the query to the status-2 sources. Add paths are not touched.

Questions, against the code:
1. Is the §Reader map right and complete — any other reader of the permanent notebook's scope, or add/delete path, that it missed? (`grep -rn "notebooklm\|nlm" scripts lib dashboard`, `.claude/agents`, `.claude/skills`.)
2. Does the design break anything that depends on the inventory being the scope: `notebooklmCanonSearch.test.js`, `notebooklmHeadlessEval.js` + its test, the source-search agent's contract (`.claude/agents/source-search/SKILL.md:34,61`), `validateQueryResponse`?
3. Fail-closed: is the planned `source_list` stage + `classifyResultStatus` change enough that no listing failure can fall through to a query or to an unclassified log record?
4. Status-2 filter: sound, or should a non-ready source fail the call instead of being left out with a stderr line? (`.venv/nlm/lib/python3.12/site-packages/notebooklm_tools/core/sources.py:88-100`.)
5. Any risk passing ~149 ids on one `--source-ids` that the plan should test before Acceptance 3?

Scope: the plan and the files it names; keep it short. Write findings to `docs/for-claude-review/2026-11-08-codex-pipeline103-plan-review.md` with a verdict line (SHIP / SHIP-WITH-FIXES / HOLD).
