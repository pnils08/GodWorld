# Re-review: civic packet pressure, fold of your HOLD

Read-only: edit no code, commit nothing, push nothing. Write one file: `docs/for-claude-review/2026-11-01-codex-civic-packet-pressure-rereview.md`. First line `VERDICT: PASS` or `VERDICT: HOLD`.

Scope: only the two folds, in `/root/GodWorld-wt-packet` (`output/codex/civic-packet-pressure/change.diff` updated; `after/` regenerated).

1. Finding 1: the plain one-week sentence stays in the citywide digest, and a district seat gets it as a fact line in its pulse block. It is not a topic and not in the directive prompt.
2. Finding 2: `isOneWeekDecay(p, cycle)` requires `priorCycle === cycle - 1`. An older comparison routes as it did.

Is either fold wrong or incomplete? Any new defect from the folds? The remaining pressure inventory is not in scope; it goes to the builder.
