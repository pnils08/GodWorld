# governance.56 boot consolidation — Codex review

**Verdict: HOLD.** The native import and removal of the duplicate SessionStart loader are wired as intended, but the shared vote rule contradicts the civic status rule, and the new boot file has a guard bypass. The remaining findings are boot-consumer and terminal-routing drift.

**Boundary.** Reviewed commits `17cb0ea04` and `2a88d20c6` with `git show`, then read the current `CLAUDE.md`, `.claude/TERMINAL.md`, five changed rule files, relevant hooks, skills and scripts. This is source and controlled-input review. I did not run SessionStart (it starts PM2 and may patch plugins), open a live Claude session, call a model, or touch Sheets/Drive/production. No engine function, `S.` field, or sheet tab implementation is in scope, so no wiring card was invoked.

## Findings

### 1. HOLD — a vacant council seat gets two incompatible dispositions

**Pointers:** `.claude/rules/canon-names.md:64-68`; `.claude/rules/civic.md:55-61`; `.claude/agents/civic-office-council-seat/RULES.md:36-38`.

The new shared rule says every council vote lists all **nine members**, each marked YES / NO / ABSENT. The civic rule says a `vacant` seat has **no member** and must be named **VACANT**. Both rule files attach to civic-office agent paths. The council-seat agent's own rule says vacant seats are ABSENT. Input: a nine-seat roster with one vacant seat. Output: one instruction yields `VACANT`, the other `ABSENT`, and the shared wording requires naming a nonexistent member. That can change the published tally or make a correct roster appear noncompliant. Set one canonical disposition for vacant seats and make the other layers point to it.

### 2. HOLD — an alternate absolute path bypasses the boot-doc lock

**Pointers:** `.claude/hooks/boot-doc-guard.sh:16`; `.claude/hooks/boot-doc-guard.sh:34-36`; `.claude/hooks/boot-doc-guard.sh:83-99`; `.claude/settings.json:153-160`.

`abspath()` normalizes relative file paths but returns absolute paths unchanged. The exact target `/root/GodWorld/.claude/TERMINAL.md` reaches `LOCKED_RE`; `/root/GodWorld/.claude/../.claude/TERMINAL.md` reaches the same file but does not match the regex or emit the warning. Controlled `Write` payloads to the guard returned an additional-context warning for the exact path and no output for the alternate path. The unlock file was present during the probe, so this was a path-matching test, not a live blocked-write test; the code shows the alternate path also skips the lock when it is closed. Normalize absolute paths before matching, and cover equivalent paths in a guard test.

### 3. FIX — boot audits do not track the consolidated boot file

**Pointers:** `.claude/settings.json:221-229`; `scripts/session-end-audit.sh:19-24`; `scripts/session-end-audit.sh:33-57`; `.claude/skills/doc-audit/SKILL.md:22-33`.

The Stop hook still invokes `session-end-audit.sh`, whose `BOOT_FILES` list omits `.claude/TERMINAL.md` and all path-scoped rule files. Its manual boot audit checklist still targets deleted `.claude/rules/identity.md` and checks old `CLAUDE.md` sections, without listing the new terminal file or `canon-names.md`. Input: a change only to the consolidated terminal file or shared canon rule. Output: no `doc:boot` trigger; a later `/doc-audit boot` also has no criterion to inspect that new boot authority. Update both consumers to the new ownership map.

### 4. FIX — the live context-budget skill still models the retired boot

**Pointers:** `.claude/skills/context-budget/SKILL.md:76-86`; `.claude/skills/context-budget/SKILL.md:88-100`; `.claude/skills/context-budget/SKILL.md:149-160`; `.claude/skills/context-budget/SKILL.md:222-225`; `CLAUDE.md:25-27`.

The skill treats deleted `identity.md` as always loaded, counts only four path rules, omits `.claude/TERMINAL.md` from the always-loaded baseline, and advises adding rules to the deleted identity path. Input: a context-budget audit after this consolidation. Output: the token accounting undercounts the actual native import and may recommend writing a nonexistent rule file. Rebase the inventory and advice on the one imported terminal file and current rule set.

### 5. FIX — terminal detection accepts the right window name in the wrong tmux session

**Pointers:** `.claude/TERMINAL.md:7-12`; `.claude/hooks/session-startup-hook.sh:46-67`; `.claude/hooks/session-startup-hook.sh:95-107`.

The table registers windows in tmux session `godworld`, but the hook reads only `#W` (window name) from `TMUX_PANE` and matches that name anywhere in the table. Input: a pane named `engine-sheet` in another tmux session. Output: the hook titles it `engine-sheet`, selects its NEXT line, and emits the builder boot instead of the unregistered fallback. Check the tmux session name and the terminal column as one identity, or remove the session constraint from the table if same-named windows elsewhere are intentionally equivalent.

### 6. FIX — settings supplies a fixed population against the live-count rule

**Pointers:** `.claude/settings.json:257-263`; `.claude/rules/canon-names.md:67`; `.claude/TERMINAL.md:18-23`.

The auto-mode environment says `675 citizens in Simulation_Ledger`; the new shared rule says to cite the **live ledger count**, never a number from a document. The local snapshot currently has 1,058 lines, which shows the fixed 675 is stale relative to that artifact; it is not a live Sheet count. Input: an auto-mode session that treats its environment text as current population. Output: a stale number can enter a civic or newsroom claim despite the live-count rule. Remove the count from settings or make it a live-data pointer. I did not verify how this Claude Code version presents `autoMode.environment` to the model, so the prompt path is unverified; the conflicting stored instruction is verified.

## Checks without findings

- `CLAUDE.md:25-27` contains a single native `@.claude/TERMINAL.md` import. `.claude/settings.json:210-220` has one SessionStart hook and no active `boot-load.js` entry; the old loader is under `.claude/boot-legacy/`. JSON parsing passed. Commit `17cb0ea04` changes 56 agent files, including `engine-wiring`, to `omitClaudeMd: true`; I did not repeat its claimed headless verification.
- The active `/session-startup` and `/session-end` skill pointers to the moved Ready check and memory section were updated. Search of active hooks, skills and scripts found no remaining runtime reference to `CLAUDE.md` §Ready check/Jobs/Fact sources/Review/Boot and memory or the deleted terminal paths; matches in legacy files and historical changelogs are history. The stale active consumers are Findings 3 and 4.
- For an unregistered or absent tmux name, the hook no longer reads Mags' character file, still shows the shared PIN/NEXT handoff, and instructs the user to reopen a registered builder window before lane work (`session-startup-hook.sh:55-67,120-135,227-239`). Its phrase “no terminal scaffolding loaded” is imprecise: the native `CLAUDE.md` import still supplies `.claude/TERMINAL.md` in that window. I found no separate action caused by that wording beyond the routing issue in Finding 5.
- Beyond Finding 1, I found no other actionable repeat or contradiction among `CLAUDE.md`, `.claude/TERMINAL.md`, and the five changed rule files. The newsroom and civic handoff descriptions point to the same boundary; the engine direct-write exception is scoped to engine code.
