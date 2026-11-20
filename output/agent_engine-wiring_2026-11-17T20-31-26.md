The module has recent commits and is clearly active. However, I need to understand the dispatch request better. The instructions state a target is "a function (`fooBar_`), a ctx.summary field (`S.foo`), or a sheet tab (`Foo_Tab`)". 

Given:
- `newsroomSourcing` doesn't end in `_`
- It's not a field name (doesn't match `S.X` or `ctx.summary.X` pattern)
- It's not a sheet tab (doesn't have the `Foo_Bar` capital-underscore pattern)

And since it's not found in the engine stub map, **it is not an engine component**. The engine-wiring tool is specifically designed to map engine wiring (phases, ctx fields, intents, sheets, etc.). A utility module is outside that scope.

Let me produce the required report:

---

```
WIRING CARD — newsroomSourcing (TARGET TYPE UNKNOWN)

ANALYSIS

newsroomSourcing is a utility module (scripts/newsroomSourcing.js), not an engine component.

TARGET CLASSIFICATION FAILURE

The dispatch target "newsroomSourcing" does not match any recognizable target kind:
  • NOT a function name — no `newsroomSourcing_()` found in phase/, lib/, utilities/, or scripts/
  • NOT a ctx.summary field — does not match pattern `S.fieldName` or `ctx.summary.fieldName`
  • NOT a sheet tab — does not match pattern `Tab_Name` with capitals and underscores

CONTEXT

  • Module location: scripts/newsroomSourcing.js
  • Exports: { buildPool, named, workplace, offices, street, parseLife, loadExchanges, typedHighlights, officeSources, verifyOfficeRecord, storyTopic, leadBizId }
  • Engine stub map (ENGINE_STUB_REVERSE.json): contains 0 references to newsroomSourcing
  • Callers: scripts/cron-desk-run.js:179, scripts/cron-rhea-gate.js:638, scripts/newsroomSourcing.test.js

ROLLOUT CONTEXT

  • pipeline.111 (2026-11-10): "Stop puppeting the newsroom (builder 11-10): the reporter half of the wake work (split with es 11-14). Next: one reporter's whole day in the test shell, his go"
  • File newest commit: 2026-10-18 (f6657d586 — engine.53 T6; engine.299 T1)

CONCLUSION

`newsroomSourcing` is not wirable as an engine target. If the dispatch intended a specific exported function (e.g., `buildPool`), please specify it with the function name ending in underscore (e.g., `buildPool_`). If the intent was to audit the module's interaction with engine code, run: `grep -rn "buildPool\|newsroomSourcing" phase*/ --include=*.js` (result: no matches — the module is consumer-facing, not engine-wired).

FILES OPENED
  scripts/newsroomSourcing.js (read, full file to understand exports)
  docs/engine/ENGINE_STUB_REVERSE.json (grep for "newsroomSourcing" — NOT FOUND)
  docs/engine/ROLLOUT_PLAN.md (grep for "newsroom|Sourcing" — found pipeline.111)
  docs/plans/* (glob + grep — extensive newsroom references, but module integration is in crons, not engine phases)
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **128**
- opened by this run: **128** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=12 toolCalls=15 in=201372 out=2647_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._