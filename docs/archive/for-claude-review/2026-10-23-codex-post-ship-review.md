---
title: Post-ship review of engine.297 additions, engine.197 replay, and handoff check
created: 2026-10-23
updated: 2026-10-23
type: reference
tags: [engine, infrastructure]
sources:
  - docs/archive/for-claude-review/2026-10-23-codex-post-ship-review-TASK.md
  - output/codex/engine297-fame-ledger.patch
  - 486ea61e
  - engine197-wakes-no-rules
  - d6fc01fd
  - 2c0a36c0
pointers:
  - "[[plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards]]"
  - "[[reference/DEPLOY_HISTORY]]"
---

# Post-ship review

**Disposition: item 1 FIX; item 2 SHIP for the replay changes; item 3 FIX.** Shipping before review does not change these verdicts. Engine-sheet owns correction or rollback of items 1 and 3. No source files were changed, and no deployment, bench, Sheet access, cron, commit, or session-close command was run.

Reviewed HEAD `672d1036ca80a54e9b5389038b4e6e8e10fbcdc0`. The named source/test files were clean; unrelated workspace dirt was preserved. Unless a commit is named, file:line references are this checkout. `buildEveningFamous.js` and `sportsWeekCity.test.js` are unchanged from `486ea61e`. I reconstructed the original patch against `3bfaa414` entirely in memory, verified each hunk's preimage, and compared the result with `486ea61e`; the differences are the two bucket changes, their tests, and the sports meeting-factor assertion described below.

## 1. engine.297 additions — FIX

### 1a. Role fallback — FIX, P2: an explicit unsupported category is overridden

`phase07-evening-media/buildEveningFamous.js:75-77` limits the **classifier** fallback to blank/unknown, but the following **role-word** fallback runs for every category that lacks a bucket. Thus a deliberately populated, unmapped FameCategory can become sightable merely because RoleType's dashed words match an alias. The original patch used only `category[cat]` (`output/codex/engine297-fame-ledger.patch:47-49`); its documented contract excluded unmapped categories (`docs/research/2026-10-17-codex-engine297-fame-ledger.md:24-25`). The task authorizes review of blank/unknown fallback, not silent replacement of other explicit categories.

In-memory probes of the actual bucket function and classifier, with synthetic Active rows:

| FameCategory | RoleType | Actual bucket | Assessment |
|---|---|---|---|
| unknown | cultural leader | CULTURAL_LEADERS | Intended recovery |
| blank | cultural figure | CULTURAL_LEADERS | Intended recovery |
| model | model | none | Preserved exclusion |
| model | cultural leader | CULTURAL_LEADERS | Explicit category bypass |
| model | chef | CHEFS | Explicit category bypass |
| media-personality | cultural figure | CULTURAL_LEADERS | Explicit category bypass |
| author | chef | AUTHORS | Mapped explicit category still wins |
| unknown | constructor / __proto__ / cultural leaders | none in all 3 cases | No arbitrary/prototype bucket admission observed |

The fallback has a finite alias map, not unrestricted substring matching into bucket names (`phase07-evening-media/buildEveningFamous.js:51-56`, `:78`). The defect is its scope: **3 of 3 explicit-unmapped/mapped-role conflict probes entered a bucket**. This is synthetic reachability evidence; no current live instance of those conflicts was measured. `scripts/sportsWeekCity.test.js:407-421` covers a mapped override and model/model, so its passing assertions do not cover this case.

**Required correction:** preserve whether the original category was blank/unknown, and permit both classifier and dashed-role fallback only in that branch; explicit mapped categories win and explicit unmapped categories remain excluded. Add conflicting-category cases. Keep the intended cultural-leader/cultural-figure recovery. The registration rationale is real: the existing-row writer refreshes FameCategory from `fam.cat` (`phase07-evening-media/culturalLedger.js:450-452`, also at `486ea61e`), while the shared classifier returns unknown for those two roles (`:133-179`). The TASK's `:270` pointer is stale.

### 1b. Linked citizen admission — SHIP for the normal scheduled path, with a schema limitation

The shared ledger is loaded without a status/tier filter: `phase01-config/initSimulationLedger.js:37-53` reads the entire body. Both engine entry points initialize it before Phase 5 and run Famous later (`phase01-config/godWorldEngine2.js:543`, `:648-670`, `:741`; `:2260`, `:2365-2387`, `:2456`). Birth rows append to that shared array (`phase04-events/generationalEventsEngine.js:1188`); advancement mints append at `phase05-citizens/processAdvancementIntake.js:1075`. The bucket builds its POPID index at call time (`phase07-evening-media/buildEveningFamous.js:64-68`), so those earlier same-Cycle mints are available.

Citizen archiving occurs after Famous, in Phase 11 (`phase01-config/godWorldEngine2.js:878`, `:2570`). Archive candidates are deceased or traded, not Active/Retired (`utilities/archiveCitizenExits.js:53`, `:150-165`). An archived traded citizen can be biologically alive but has left this resident ledger; excluding that row is consistent with the stated resident-sighting policy. A Cultural registration queued for Phase 10 is not a committed Cultural row for this Cycle's cached bucket; that timing existed in the original patch (`docs/research/2026-10-17-codex-engine297-fame-ledger.md:30`). I found **0 normal-path missing-row mechanisms** introduced by the new check for Active/Retired citizens already eligible through a committed Cultural row.

Status probes admitted Active and Retired (2/2), excluded Deceased, Traded, Hospitalized, Recovering, Injured, Pending and blank (7/7), and excluded an unresolved POPID. “Living” is therefore shorthand for **Active/Retired**, not every non-deceased status. **Schema limitation:** if the Status header is absent, `iLSt >= 0` bypasses the restriction (`phase07-evening-media/buildEveningFamous.js:85`); one synthetic deceased linked row with that header omitted was admitted. Existing fixtures deliberately omit Status (`scripts/sportsWeekCity.test.js:387`), so they do not establish unconditional status enforcement. Require the header if the gate is meant to fail closed under malformed schema; this limitation does not demonstrate a missing citizen in the normal complete ledger.

The extra sports assertion change is **SHIP**: `scripts/sportsWeekCity.test.js:264-267` now checks the actual top-band meeting multiplier at `phase05-citizens/bondEngine.js:1177`, replacing a removed max-new-bonds rule. It changes test expectations to the intervening engine.302 behavior; it does not alter the runtime in this patch.

### Existing bench evidence — bounded support; clean four-Cycle attribution HOLD

The four F1 JSON receipts report PASS and cumulative bucket counts **3, 4, 6, 6** over C113–C116. Final F1 has **9 sighted rows, 6 bucket rows, 2 minted rows**; control has **9, 8, 2**, respectively (`output/engine-sheet/2026-10-22-e297-check-F1-c116.json:7-121`; `output/engine-sheet/2026-10-22-e297-check-ctl-c116.json:7-125`). These are cumulative rows, not nine independently traced calls or proof that either cultural-role fallback was drawn. Neither Rosa Martinez nor Li Wei appears in the F1 sighted list.

The log contains helper parse failure, two missing drop_tab calls, missing wait_cut, and failed restoration ending **exit 4** (`output/engine-sheet/2026-10-22-e297-bench-F1.log:1`, `:15-16`, `:39`, `:123-133`). `docs/reference/DEPLOY_HISTORY.md:168` explicitly says C113 fired at approximately **280 seconds against a 300-second floor**, may have run stage 21, and the fixes were **not rerun**. Consequently “all four candidate Cycles proved” is not supported. C114–C116 and the manifest/pullback record provide bounded evidence; a corrected run needs an unambiguous candidate version at its first fire. PROD @159 and pullback/fire-state claims are recorded at `DEPLOY_HISTORY.md:169-171`; I did not independently query PROD. No new live or bench proof was produced here. The separate legend-fire HOLD remains outside these two additions (`docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md:82`).

## 2. engine.197 replay — SHIP

Compared branch `engine197-wakes-no-rules` with current main, and inspected the six intervening engine.302/304 commits on the five named paths from `7d84c084` to `4ccab18f`: `0125b59a`, `c33d28c2`, `fc89b332`, `c5399643`, `6cfd1555`, `ac5acf2a`. Across those five runtime files, branch-to-main differences are confined to **2 files: citizenPage.js (+65/−1) and wakePerception.js (+51/−5)**. `scripts/citizen-wake.js`, `scripts/discord-reflection.js`, and `lib/memoryFence.js` are byte-identical to the branch. No unrelated runtime edit was concealed by the test conflict resolution.

**Test conflict:** the complete engine.304 `familyCases` function is byte-identical to pre-replay main; M1's scrub fixture/assertion block and `readCases` function are byte-identical to the branch. The merged file retains **9 family assertions, 9 pure scrub assertions, and 4 page-read assertions**, alongside the earlier tests (`lib/citizenPage.test.js:88-118`, `:121-158`). The initial `mockSheets()` precedes appendCases, so engine.304's newly added post-append family read stays mocked; the asynchronous chain is explicitly appendCases → familyCases → readCases (`:161-165`). familyCases restores its Sheets/fetch mocks in finally (`:118`). The changed “Test 6” label does not affect execution.

**Require-stub change:** `d6fc01fd` adds one allowlisted module to the health harness (`scripts/wakeHealthPerception.test.js:62`). Runtime now imports `_hash53` at `lib/wakePerception.js:25`; `lib/provocationBank.js:33-44` implements a deterministic string hash and `:144` exports it. The module has no require, network, filesystem, or timer side effects. Other unrecognized require paths still throw (`scripts/wakeHealthPerception.test.js:67-71`). This repairs harness loading without weakening health assertions.

**Interaction trace:** current `loadFamily`, `appendReflection_`, and `recordFamilyMentions_` are byte-identical to pre-replay main. MaritalStatus-first spouse handling, archived relatives, and background-family names remain in `lib/wakePerception.js:234-302`; the drawn citizen still receives loadFamily at `scripts/citizen-wake.js:253`. The engine.304 family-credit side effect runs only after a successful page response and only for eligible reflection slots (`lib/citizenPage.js:69-73`, `:152-160`). It excludes POP-00005 and NIGHTLY/keyed slots, so Mags's nightly spool does not acquire a second family-credit route. Family-write failure is caught independently; citizen-wake checks the page result at `:344` and later records lived spend at `:408`, preserving the branch's “spend after page lands” behavior. M1's read scrub remains restricted to Mags's NIGHTLY/metadata-less records (`lib/citizenPage.js:169-180`), and the journal's raw self-read remains explicit (`scripts/discord-reflection.js:362`). No merge-specific regression found in these joins.

Validation: **citizenPage 42/42; wakeHealthPerception 37/37**, executed offline with mocked API/Sheet paths. These results verify the named replay changes; they do not prove concurrent spool behavior, cron execution, or external persistence. No blanket re-review of the original 13-commit feature is implied.

## 3. sessionEndMechanical handoff check — FIX

**P1: moving HEAD is not a close-specific baseline.** `scripts/sessionEndMechanical.js:148-155` reads the working handoff and compares it with **whatever HEAD is when git show runs**. Scenario: this terminal reads S594 and prepares S595; another terminal commits that shared file before this check; now=595 and was=595, so the first sub-step aborts even though this terminal performed the bump. A commit landing between the working-file read and git show has the same effect. Conversely, another lane's uncommitted S595 bump satisfies the gate without this terminal preparing its own handoff. The predicate proves a numeric difference between two snapshots, not who completed Step 2.

A repeat before committing is allowed (595>594 both times). A retry after committing is rejected (595≤595), including a retry after later close work failed and the prepared handoff was committed meanwhile. This is a false abort for retrying the same close; it would be appropriate to require another increment only for a genuinely new session. No close identity/baseline/receipt distinguishes them. Failure is fatal because the new check is first and `{ok:false}` exits the loop with status 1 (`scripts/sessionEndMechanical.js:398`, `:433-448`).

**P2: Git failure silently disables the comparison.** The catch at `scripts/sessionEndMechanical.js:150` treats every git-show failure as “no committed copy.” With work S594 and a simulated Git failure, was=NaN and the guard returns ok=true. Permission, repository, object, and command failures are not evidence that no committed handoff exists. An unreadable comparison must be reported and rejected; a genuinely absent initial file needs a distinct explicit path.

Isolated in-memory evaluation of the actual subHandoffCheck function, with injected fs/git/logging only; the script main and all operational sub-steps were never invoked:

| Scenario | Work / committed PIN | Result |
|---|---|---|
| Prepared bump | 595 / 594 | pass |
| Same close retry before commit | 595 / 594 | pass |
| Same close retry after commit | 595 / 595 | abort |
| Another lane commits the prepared handoff | 595 / 595 | abort |
| No bump | 594 / 594 | abort |
| Working copy behind | 593 / 594 | abort |
| Git comparison throws | 594 / unavailable | pass — incorrect |
| Missing working PIN | missing / 594 | abort |
| NEXT line >350 characters | 595 / 594 | pass +1 warning |
| NEXT missing | 595 / 594 | pass +1 warning |
| Only a foreign uncommitted bump | 595 / 594 | pass — no ownership evidence |

**Required correction:** compare against a baseline captured for this terminal's close before its handoff edit, preserve a close identity across retries, and distinguish already-completed/retry from a new close. Detect concurrent replacement rather than prescribing another bump automatically. Reject unreadable/invalid baseline data. NEXT length can remain informational as requested (`scripts/sessionEndMechanical.js:158-161`); the implementation counts the whole Markdown line, including its label, using JavaScript string length. Do not make equality an unconditional pass: that would also admit genuinely unbumped closes.

## Verification and final gate

- Fresh offline suites: `node scripts/sportsWeekCity.test.js` **65 passed, 0 failed**; `node lib/citizenPage.test.js` **42 passed, 0 failed**; `node scripts/wakeHealthPerception.test.js` **37 passed, 0 failed**. Total **144 assertions**, with no live API/Sheet calls or test file writes. The citizenPage “sheet down” message was the expected injected failure case.
- Additional probes: **10 category cases, 9 status cases, 2 link/schema cases, 11 handoff cases**; all used synthetic in-memory inputs and exposed the behaviors above. No probe artifact or production data was written. A subprocess-based source read initially failed with sandbox EPERM; it was replaced by direct read-only tool reads and in-memory reconstruction, without escalation.
- **Item 1 FIX / acceptance HOLD** for the explicit-category bypass; the supplied bench cannot certify four uncontaminated candidate Cycles. **Item 2 SHIP** for the exact replay/test integration reviewed. **Item 3 FIX / acceptance HOLD** for the moving-baseline false aborts and swallowed Git failures. No rollback or correction was executed.

## Changelog

- 2026-10-23 (codex) — Reviewed all three TASK items, verified patch/replay boundaries, ran focused offline checks, and wrote only this review file.
