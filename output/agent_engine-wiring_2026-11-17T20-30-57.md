There is no function named `cron-desk-run_` or similar. The file is a Node CLI script with a `main()` function and several exported functions.

Given the constraints of the tool and the dispatch, I cannot produce a valid wiring card because:

1. **cron-desk-run** is a script filename, not a function (`cron-desk-run_` with trailing underscore)
2. It's not a field (`S.field` or `ctx.summary.field`)
3. It's not a sheet tab (`Sheet_Name`)
4. The wiring-card procedure is designed for engine phases, not arbitrary scripts
5. The script is part of the research-build / newsroom pipeline, not the GodWorld engine

Let me produce the report as instructed:

---

**TOOL RESULT: TARGET KIND UNKNOWN**

The target `cron-desk-run` does not match any of the three valid target kinds:

| Kind | Pattern | Example |
|------|---------|---------|
| function | ends in `_`, is a JS identifier | `applySportsSeason_` |
| field | `S.foo` or `ctx.summary.foo` | `S.population` |
| tab | capitals + underscores | `Initiative_Tracker` |

**What was found:**
- **File:** `scripts/cron-desk-run.js` — a Node.js CLI script (shebang line 1: `#!/usr/bin/env node`)
- **Type:** Module with a `main()` entry point and 34 exported functions (module.exports, lines 3934–3969)
- **Not an engine phase:** this script is part of the research-build newsroom pipeline (docs/plans), not the GodWorld engine phases (phase*/ directories, lib/ engine functions)
- **Callers:** 11 test files and 2 utility scripts require it; it is invoked via CLI by cron jobs

**The wiring-card procedure is for engine-phase functions, fields, and tabs.** This script is a CLI utility outside that scope.

**Possible intentions:**
- If you meant to map ONE of the 34 exported functions (e.g., `collectQuoteAsks`, `buildIntakeSidecar`, `recordBylineUsage`), provide the function name with trailing `_` (e.g., `collectQuoteAsks_`)
- If you meant to map an engine function that this script calls (grep reveals calls to `execFileSync` on `cron-desk-writer.js`, `cron-rhea-gate.js`, `citizenVoice.js`), provide that function name
- If this is a test of the harness, provide a valid target from the engine

**Dispatch cannot proceed.**

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **128**
- opened by this run: **128** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=10 toolCalls=17 in=244883 out=2880_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._