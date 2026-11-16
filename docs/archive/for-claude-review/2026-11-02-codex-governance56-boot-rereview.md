# governance.56 boot fold — Codex re-review

**Verdict: SHIP-WITH-FIXES.** Commit `f6b6579ab` fixes the vote-rule conflict, guard path normalization, and stale population text. The boot-audit fold is incomplete, and its context-budget edit introduces a false size warning. This is the one re-review; Finding 5 remains a builder decision.

**Boundary:** Compared `f6b6579ab` with the six findings in `2026-11-02-codex-governance56-boot-review.md` and read the changed files plus the boot-consolidation plan. No code, control-plane file, Sheet, service, or external state was changed. No live Claude boot or Stop audit was run.

## Findings

### A. FIX — `/doc-audit boot` still has no rows for two active rule files

**Pointers:** `scripts/session-end-audit.sh:34-46`; `.claude/skills/doc-audit/SKILL.md:22-33`; `.claude/rules/civic.md:1-11`; `.claude/rules/research-build.md:1-8`.

The Stop audit regex now matches `.claude/TERMINAL.md` and every `.claude/rules/*.md`, including `civic.md` and `research-build.md`. The manual boot checklist added the terminal file and `canon-names.md`, but still lists only four of the six active path-scoped rules. Input: change only `civic.md` or `research-build.md`. Output: the Stop audit flags `doc:boot`, but `/doc-audit boot` gives the operator no file-specific check for the changed rule, so that rule can be left unaudited while the boot group is marked reviewed. Add both files to the boot table or give one explicit all-rule-files check.

### B. FIX — new combined line limit disagrees with the plan's budget

**Pointers:** `.claude/skills/context-budget/SKILL.md:88-96`; `docs/plans/2026-08-29-boot-doc-consolidation.md:58,67-71`.

The fold replaces a CLAUDE.md line warning with `CLAUDE.md + .claude/TERMINAL.md together > 200 lines`. The plan sets **each** boot file at no more than 200 lines and 25 KB, with a separate 40 KB total boot target. Input: two 150-line files within their individual limits and total byte budget. Output: `/context-budget` calls the pair over budget. Current files total 123 lines, so this is a future false positive rather than a current overflow. Check each file against its own line and byte limits, then the total against the plan's byte target.

## Prior findings, one by one

| Original finding | Re-review | Evidence |
|---|---|---|
| 1. Vacant-seat disposition | **SHIP** | `canon-names.md:68` now says nine seats and vacant = ABSENT; `civic.md:59,61` agrees with the council-seat agent's `RULES.md:38`. |
| 2. Guard path bypass | **SHIP** | `boot-doc-guard.sh:36` canonicalizes paths with `realpath`. Mock `Write` inputs for the exact path, absolute `../` path and relative `../` path all reached the same boot-doc warning. The lock-closed branch was read, not exercised. |
| 3. Boot audit coverage | **FIX** | `session-end-audit.sh:34` now matches terminal and rule paths; the manual checklist still omits two active rules (Finding A). |
| 4. Context-budget model | **FIX** | The imported terminal and six path rules are now counted, and deleted `identity.md` advice is gone; the new combined line warning is incorrect (Finding B). |
| 5. Tmux session identity | **Builder decision** | No change in this fold. The hook still uses window name only at `session-startup-hook.sh:51-57`. The builder says only `godworld` exists; local `tmux list-sessions` could not read its socket in this sandbox, so I did not verify that live claim. |
| 6. Fixed population in settings | **SHIP** | `settings.json:259` no longer contains 675 or another fixed count. JSON parses cleanly. |

## Verification limits

`git diff f6b6579ab^ f6b6579ab --check`, `bash -n` on the changed shell scripts, and JSON parsing passed. I tested the Stop audit's new regex against the terminal, civic, and research-build paths without running the Stop hook, which writes audit state. I did not run SessionStart because it may start PM2 and patch plugins. No third review is proposed.
