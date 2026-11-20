The target `cron-desk-writer` is not part of the engine wiring. It is a standalone Node.js script that runs headless desk writers (as described in its own file header at lines 3-36). It does not fit any of the three target kinds (function, field, tab) that the engine-wiring tool is designed to map, and it is not called by any engine phase.

## WIRING CARD — cron-desk-writer (SCRIPT, NOT ENGINE)

**TARGET SCOPE FAILURE**

`cron-desk-writer` is a standalone Node.js script (scripts/cron-desk-writer.js:1-36), not an engine component. The engine-wiring tool maps:
- Engine functions (ending in `_`) wired into phase calls
- Summary fields (S.fieldName) tracked in ENGINE_STUB_REVERSE.json
- Sheet tabs referenced in phase operations

**Finding:** `cron-desk-writer` is **NOT IN SCOPE**

- **File:** scripts/cron-desk-writer.js (1738 lines, executable headless desk-writer harness)
- **Role:** A/B test harness for raw Anthropic API + tool-use loop (S325, research.25 Thread A)
- **Engine wiring:** NOT FOUND in phase01-config/godWorldEngine2.js or any phase call
- **Maps:** cron-desk-writer NOT IN ENGINE_STUB_REVERSE.json (sFields or sheets)
- **Calling scope:** Called only by cron-desk-run.js and cron-civic-run.js via execFileSync spawns, not via phase routing

**If the intent was to map a function exported by this module:**

The module exports 15 functions (line 1717–1737):
- toolDossierRead
- toolSheetRead
- toolCanonRecall
- toolCitizenLookup
- writerToolset
- SEAT_TOOL_FRAMES
- seatToolsBlock
- rubricBlock
- normalizeArtifactTag
- buildOutputSlug
- formatStrictSourceHygiene
- stripModelMetadataTail
- stripRepairChrome
- renderPacketIntake
- resolveMaxToolCalls
- costUsd
- CANON_RECALL_TOOL
- OPENROUTER_TOOLS
- MEMORY_TOOLS
- toolMemoryRecall
- toolMemoryNote
- openRouterToolLoop
- callOpenRouterRaw

None of these are phase-wired engine functions. They are utility functions for the headless writer harness.

**Dispatch clarity:** Please specify the exact target:
1. A **function name** (e.g., `toolCanonRecall_` if it were engine-wired)
2. A **summary field** (e.g., `S.citationSource`)
3. A **sheet tab** (e.g., `Civic_Office_Ledger`)

This tool requires an engine target to proceed. `cron-desk-writer` is a script file, not an engine component.

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **128**
- opened by this run: **128** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=10 toolCalls=16 in=126579 out=2730_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._