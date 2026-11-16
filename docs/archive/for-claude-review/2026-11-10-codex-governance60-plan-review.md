---
title: Codex governance.60 cohesion-loop adversarial plan review
created: 2026-11-10
updated: 2026-11-10
type: reference
tags: [infrastructure, governance, review]
sources:
  - docs/plans/2026-11-10-cohesion-loop.md
  - docs/plans/2026-11-10-stop-puppeting-the-newsroom.md
  - docs/reference/overnight_autonomy_session.md
  - docs/reference/CROSS_LANE_MESSAGING.md
  - .claude/TERMINAL.md
  - AGENTS.md
  - scripts/runEngineAgent.js
  - scripts/cronFeedback.js
  - scripts/testReporterWrite.sh
  - scripts/cron-desk-run.js
  - docs/for-claude-review/README.md
pointers:
  - "[[plans/2026-11-10-cohesion-loop]] — reviewed governance.60 plan"
  - "[[plans/2026-11-10-stop-puppeting-the-newsroom]] — standing word and Open G/H"
---

# governance.60 — adversarial plan review

**Verdict: HOLD.** The flag-only agent and terminal verification split fits the stated intent. The plan is not ready for unattended activation: it inherits obsolete pane routing, leaves concurrent pickup and permission recovery unspecified, lacks a bounded spending/admission contract, and relies on a test shell that is not fully isolated. Extending authority also needs an explicit boundary between restoring an approved mechanism and designing new sim behavior.

Read-only review of the named working-tree plan, with HEAD `dd5e73c0b` during inspection. No code, plan, control-plane, index, cron, or service changes. Only this review file was written in the repository. Conflicting repository instructions below are reported for reconciliation, not silently selected or exercised.

## Every “What already exists” claim checked

| Plan row | Verification against its named source | Result |
|---|---|---|
| Gate, plan line 15 | `docs/reference/overnight_autonomy_session.md:19-30` does authorize written, reversible work for two unattended Claude seats, with sim-direction questions queued. It also retains crontab, credentials, canon and live-sheet rails. `:28` permits planned deploys; `:82` still queues credit-spending questions. | **Exists, but the table omits important retained restrictions.** Widening it is not just adding “cohesion.” See F2. |
| Peer wake/clear/permission prompts/hourly check, line 16 | Overnight doc `:59-67` contains all four mechanisms and says CronCreate wakes are session-only and re-created after clear. It requires no unsent draft before clearing. However, its `godworld:2.1` engine-sheet target is obsolete against `.claude/TERMINAL.md:11-12` and `CROSS_LANE_MESSAGING.md:37-41`. | **Mechanisms documented; current routing and unattended state detection are not proven.** See F1. |
| Inbox, line 17 | `docs/for-claude-review/README.md:3-6,16-28,32-47` defines a completed guest-work inbox, lane-prefixed names, immutable submitted files, and explicit resolution. The hook at `.claude/hooks/session-startup-hook.sh:155-162` prints names/count only. | **Directory/notification exists; guaranteed consumption does not.** “Filled by codex/agy reviews only” is false: AGY goes to `output/antigravity/` (`AGENTS.md:14`); Kimi/Grok are admitted and RB briefs are present. At inspection there were 31 non-README/non-gitkeep files, including a 2026-10-29 item. Age alone does not prove neglect, but it disproves treating notification as consumption. See F4–F5. |
| API runner, line 18 | `scripts/runEngineAgent.js:42-69,270-281` loads agent files and uses Anthropic SDK over direct Anthropic or OpenRouter, without a CLI session. Tools are reads/lookups (`:76-86`), and the host writes the report (`:320-326`). Validator/wiring folders and historical output receipts exist; one wiring receipt records 15 turns, 135,994 input and 3,674 output tokens. | **API execution and historical use verified from source/artifacts, not a new call.** No cumulative token budget, completion validator, or protected-file read boundary is supplied by this harness. See F3, F5–F6. |
| Cron feedback, line 19 | `scripts/cronFeedback.js:74-150` reads angle/wake/gate/journal/daily-run artifacts. `:202-209` writes the full file. The SessionStart block at `:166-175` invokes it with a five-second timeout. It does not analyze article prose for hollow figures. | **Accurate, with a freshness dependency.** A plain tmux wake is not SessionStart and does not refresh the file. Existing writer-gap extraction already lives at `scripts/cron-desk-run.js:2659-2721,3423-3428`; it is another relevant signal the plan does not name. See F7. |
| Reporter test shell, line 20 | `scripts/testReporterWrite.sh:32-45` copies stage artifacts into a scratch compare directory and invokes `--stage=write --no-gate`. The orchestrator suppresses byline Sheet writes and filed/graded page writes at `scripts/cron-desk-run.js:315,3362,3380`; typed writer mode disables byline memory tools at `scripts/cron-desk-writer.js:270`. | **Write-only stage exists; full isolation and “one writer model call” are overstated.** Model tool loops can make several requests (`scripts/cron-desk-writer.js:969-999`). The explicit Cycle is not forwarded, and gap logging still writes outside the shell. See F8. |

## Findings

### F1 — The standing wake lacks a safe target/state contract and can strand both seats (P1)

**Plan:** `docs/plans/2026-11-10-cohesion-loop.md:16,27,38`. **Implementation/contracts:** `docs/reference/overnight_autonomy_session.md:59-67`; `docs/reference/CROSS_LANE_MESSAGING.md:37-60`; `.claude/TERMINAL.md:11-14,71`.

Following the imported overnight procedure sends engine-sheet traffic to window 2, which the current roster assigns to **codex-rb**; engine-sheet is window 3. Clearing or approving at that old target can affect the wrong agent. Use current window names and verify the expected CLI/session; never carry numeric pane addresses forward from the overnight doc.

“Idle at its prompt” is insufficient as the only admission test. A prompt may contain the builder's unsent draft, a permission selection, a model picker, or a shell after Claude exited. Typing the wake and Enter can append to and submit the draft or select an unrelated action. An idle capture also becomes stale before the separate send/Enter steps. The existing manual procedure explicitly distinguishes these states; the plan's idle/busy test covers only two of them.

There is also a liveness hole: if **both** seats are at permission prompts, neither is at the ordinary empty prompt the scheduler accepts, so neither receives a turn to inspect the peer. If those prompts are instead treated as idle, the generic wake line is typed into the permission UI. Both seats waking simultaneously also need serialized peer-clear/approval control, so they cannot mutually clear or approve against stale captures.

**Close with:** named-session resolution; distinct empty-input, busy, draft, permission, picker, shell, absent and unknown states; no submission on ambiguity; a per-pane dispatch/acknowledgment mechanism with state revalidation; and a separate, bounded recovery path for dual blocked prompts. Require tests for each state, changed state between capture and send, stale pane IDs, duplicate cron invocation, and simultaneous peer recovery. A generic wake must never itself be an approval keystroke.

### F2 — “Cohesion” plus a self-written plan can authorize new sim behavior (P1)

**Plan:** `docs/plans/2026-11-10-cohesion-loop.md:9,28-29,39-40`. **Context/rails:** `docs/plans/2026-11-10-stop-puppeting-the-newsroom.md:59-61,72-73`; `docs/reference/overnight_autonomy_session.md:23-30`; `.claude/TERMINAL.md:63-66`; `AGENTS.md:39-53,63`.

The standing word authorizes cohesion work; it does not supply every behavior decision needed to implement it. For example, detecting that fund spending has no receiving households does not decide which households receive it, in what amounts, or with what effects. Likewise, replacing aggregate illness with individual sickness requires behavior choices unless an existing approved contract already defines them. A terminal can otherwise write its own plan, classify these choices as cohesion, pass the “written + reversible” test, and deploy behavior the context explicitly reserves for the builder. Reverting code does not automatically undo citizen state or canon already produced by it.

The documents also disagree at the authority boundary: context Open G still says no row without the builder's word, whereas Standing word and this plan authorize autonomous cohesion pickup; TERMINAL Ready check `:47` says new rows are claimed only on his word. The plan should state exactly which of those statements the standing authorization supersedes. Do not silently resolve the conflict by whichever sentence an agent reads last.

Widening the overnight gate must retain the existing exclusions: human-fired live Cycle, explicit approval for many-row Sheet writes/schema deletions/memory wipes, credential restrictions, and guest lane limits. The new scheduled jobs need their specific installation authority; they must not become general permission to change crontabs. Overnight §3's “guests do not commit” (`:42,52`) also conflicts with current `AGENTS.md:63`; guest deploy authority must not be inferred from Claude's standing PROD permission.

**Close with:** an explicit rule that autonomous repair restores a documented producer/consumer contract; any new recipient, rate, severity, eligibility, or mechanic meaning remains a queued builder decision. State the precedence changes and retained rails in both gate documents. Preserve exact-candidate review, live-synced sandbox proof, one unproven change across both seats, and the live-fire restriction. No new blanket approval request is needed for already-authorized mechanical cohesion repair.

### F3 — The chosen read-only runner can disclose protected files to the model (P1)

**Plan:** `docs/plans/2026-11-10-cohesion-loop.md:18,26`. **Code:** `scripts/runEngineAgent.js:64-69,126-129,194-205,291-299`. **Rule:** `AGENTS.md:43`.

The runner's `safe()` checks only lexical containment under the repo. An explicit `read_file` request for `.env` passes; there is no protected-file allowlist/deny rule, and no realpath check against symlink escapes. The walker hiding dotfiles does not protect explicit reads. Returned contents are added to the next paid model request. The harness also does not load AGENTS/TERMINAL restrictions automatically: only the agent's four possible instruction files form its system prompt.

**Local reproduction:** loaded the actual runner in a VM with entirely mocked filesystem/API calls. A tool request for `.env` received a synthetic sentinel from the mock and that sentinel appeared in the next model request. No real credential file was opened. Thus “no write tools” is not a sufficient unattended boundary when the agent consumes reporter text or transcripts that can contain misleading instructions.

**Close with:** host-enforced, realpath-checked readable roots/files for the map, required source code and selected media artifacts; explicit exclusion of credentials and private control/state stores; bounded file reads; and treatment of media text as evidence, never tool or permission instructions. Test denied paths and symlinks with synthetic fixtures before scheduling this agent.

### F4 — Two terminals can claim the same finding while violating their one-job rule (P1)

**Plan:** `docs/plans/2026-11-10-cohesion-loop.md:27-29`. **Contracts:** `.claude/TERMINAL.md:47,57-67`; `docs/reference/overnight_autonomy_session.md:71-76`.

Both terminals are told to check the same inbox three times a day, and “the terminal that picks it up” verifies and builds a row. There is no atomic claim, assigned owner, transfer receipt, existing-row lookup, or rule for a seat already carrying its NEXT job. Input: both idle seats read one transit flag before either persists ownership. Output: duplicate rows/plans or concurrent edits and competing sandbox candidates. One-writer messaging after work starts does not make the initial claim atomic.

The other possible reading is that neither seat picks it up until its existing job finishes; then the file can sit indefinitely despite successful wakes. “Check inbox, then continue NEXT” needs to distinguish bounded triage from starting a second build. Sending substrate work to engine-sheet must transfer the complete job, not split design/build ownership or silently displace its current row.

**Close with:** stable finding IDs, deduplication against open/rejected/resolved work, one durable owner claim, explicit queue-versus-current-job handling, and acknowledged transfer to the receiving seat. Retain the shared-sandbox single-candidate rule. Test simultaneous claims, owner crash, already-owned work, busy receiving seat and an inbox flag duplicating a current job.

### F5 — Three runs share one daily filename, but reports have no admission or retirement protocol (P2)

**Plan:** `docs/plans/2026-11-10-cohesion-loop.md:26,29`. **Code/contracts:** `scripts/runEngineAgent.js:279-300,320-326`; `docs/for-claude-review/README.md:20-28,32-47`; `scripts/archiveFoldedReviews.js:53-79`.

One dated filename with three producer runs is underspecified. Using the runner's existing `--out` behavior overwrites the file. A terminal can append a rejection after the morning run, only for the afternoon run to erase it. Appending instead reintroduces already-handled findings unless entries have stable identity. The proposed `media-flags` name also does not identify an authorized producer lane under the inbox contract; that contract currently admits completed guest work, not repeatedly rewritten generated batches.

The runner cannot guarantee “completed”: it retains the most recent text even when that text accompanied a tool request, and writes it after exhausting MAX_TURNS. **Mocked reproduction:** two tool-use turns exhausted a two-turn budget; the saved report began “I will inspect the synthetic files next,” with no incomplete status. Publishing that directly into the inbox asserts completion that never happened.

Finally, rejection written into a file does not retire it. Boot still counts it, and the current archive tool recognizes resolution through a plan's `Reviews reconciled` section. A daily batch containing accepted, duplicate, rejected and pending entries has no closure rule. The same subject can accumulate seven files a week while every wake merely re-reads it.

**Close with:** validated complete-result admission, atomic publication, an explicit generated-report inbox contract, immutable batch/evidence snapshots, durable dispositions outside producer-overwritten content, and per-entry acknowledgment/closure linked to an existing or new row. Define who retires a fully disposed batch and how empty/incomplete/error runs surface without becoming findings. Test same-day rerun after terminal annotation and next-day recurrence of a rejected flag.

### F6 — The promised spending cap is not implemented by the selected runner (P2)

**Plan:** `docs/plans/2026-11-10-cohesion-loop.md:26,37`. **Code:** `scripts/runEngineAgent.js:55-57,279-299,316-324`.

The runner exposes MAX_TURNS, not a cumulative token cap. `max_tokens: 8000` is applied to **each** response; the default 30 turns permits up to 240,000 requested output tokens per run, or 720,000 across three runs, before counting growing repeated input. Those are configured upper bounds, not predicted usage or dollar estimates. Usage is accumulated for the footer only, not checked before the next request. The historical wiring receipt above shows why input cannot be ignored.

The plan specifies neither the initial model/cap nor a daily/week spending stop, timeout, overlap lock, retry policy, or failure accounting. Reviewing the first week's bill afterward cannot prevent spending the available credits during that week. An agent stuck repeatedly requesting missing map paths can consume all its turns without producing a usable result.

**Close with:** a pinned provider/model, finite validated input/output/run budgets, a daily or weekly monetary/token ceiling, wall-time limit, serialized invocation and bounded retries. Account for failed/partial runs and charge/reserve budget before new calls. State the initial values before the hand run; do not equate the existing response cap with the planned per-run cap. No current price or account-balance lookup was made for this review.

### F7 — The agent has no reproducible input set or distinction between a complaint and a defect (P2)

**Plan:** `docs/plans/2026-11-10-cohesion-loop.md:9,26,36-37`. **Context/code:** `docs/plans/2026-11-10-stop-puppeting-the-newsroom.md:39-41,59-61,72-73`; `scripts/cronFeedback.js:83-105,202-209`; `scripts/runEngineAgent.js:305-317`.

“The day's staged pieces,” “the show transcript,” and “the research.33 map” have no pinned paths, snapshot/Cycle identities, freshness requirements, selection receipt, or missing-input result. The cited C115 transcript exists locally; the named daily-news producer does not establish an automatic fresh-transcript contract. The research.33 map has no artifact/interface named in this plan yet. `cron-feedback.md` is refreshed by boot/explicit invocation, so three ordinary wake turns can keep reusing an older copy. Its seven-day grades also still include the editorial scoring that the context plan has just retired.

The same complaint can appear in an article, the hosts' paraphrase, and feedback. Without source identity these become three defects; without original article location a host's interpretation can be attributed to the reporter. A missing packet field or failed lookup is not proof that the engine has no producer. A map miss is not proof of missing code, and a formula/constant classification alone does not choose a replacement behavior. Conversely, prose-based flagging cannot find defects no reporter mentioned. The plan correctly requires terminal verification, but repeated weak claims still consume that terminal's time.

The runner's coverage footer measures engine-phase files, **not** selected articles/transcript segments, so it cannot certify that every intended input was read. The plan says “notes, no fix,” while its title, `docs/engine/ROLLOUT_PLAN.md:120` and `docs/index.md:430` still describe an auditor drafting fixes; those dispatch surfaces can recreate the abandoned scope.

**Close with:** a deterministic source manifest with hashes, Cycle/date window, statuses, exact article lines/transcript timestamps, map revision and inspected/missing inputs. Require literal quote validation and deduplication across article/show/feedback. Classify observations as media assertion, lookup/input failure, map gap or verified code mismatch; only the terminal may promote one to a repair. Define stale/no-transcript/no-map behavior and refresh feedback before collection. Test negated claims, supported formulas, wrong-Cycle comparisons, host-only claims, duplicate complaints and silent/missing inputs. Correct the title/row/index scope before dispatch.

### F8 — The test shell is not yet a reliable isolated proof path (P2)

**Plan:** `docs/plans/2026-11-10-cohesion-loop.md:20,28`. **Claim:** `docs/plans/2026-11-10-stop-puppeting-the-newsroom.md:39`. **Code:** `scripts/testReporterWrite.sh:25,33-45`; `scripts/cron-desk-run.js:2941,3423-3428,2711-2719,2623`.

Two concrete defects undermine using the shell as the standing gate's alternative proof surface:

- The optional Cycle selects which files are copied, but the spawned write command never receives `--cycle`. `runWrite()` therefore detects the current Cycle independently. Requesting a prior Cycle copies its artifacts and then looks for the current Cycle's artifacts, which can fail before writing or invalidate the intended test comparison.
- Successful sample writes still call `appendGapsEntry()` without a TEST_SHELL guard. Its default path is the live `output/production_log_c<N>.md`, not the scratch directory. A test article saying a record is missing therefore alters the live operational gap log. **Pure local probe:** invoking the actual extracted function with TEST_SHELL set and intercepted filesystem writes still targeted the production log. No real log was written.

In addition, `runWrite()` invokes `ensureLedgerSnapshot()` (`scripts/cron-desk-run.js:2963`); stale metadata can launch `dumpLedger.js` (`scripts/canon-name-check.js:102-109`). The shell is not an offline fixture test, and copying compare artifacts alone does not freeze all its inputs. Tool-enabled writers can make several paid requests, as verified in the table above.

**Close with:** pass and validate the requested Cycle end to end; redirect every output including production gap logging; explicitly enumerate permitted network reads/model spend and snapshot refreshes; and prove the write footprint with intercepted I/O before calling this an isolated test surface. Writer-output checks cannot replace engine sandbox proof for substrate changes.

## Verification and limits

- Read both named plans, every named “already exists” source, AGENTS, TERMINAL, cross-lane messaging, the relevant hook block, inbox contract/archive selector, and the reporter shell's immediate write path. Checked historical validator/wiring report presence without rerunning either agent. Current cronFeedback source already includes later receipt fixes; the earlier pipeline rereview was not treated as current code evidence.
- Ran only local source-reading and mock probes. The runner probe replaced filesystem, environment loader and API SDK; it neither read real credentials nor sent an API request. The gap-log probe intercepted its write. No synthetic material entered any repo output, Sheet, page, Drive, memory or canon surface.
- No tmux send/capture of user drafts, permission approvals, peer clears, crontab changes, full SessionStart execution, reporter/model run, sandbox fire, deployment or live cycle. Wake defects are plan/protocol findings, not a claim that an unbuilt wake script was exercised.
- This is a governance review, not an audit of the transit/fund/health implementations cited by the context plan. Their examples establish where a behavior decision must remain explicit; no engine-function wiring card or additional model call was required for these findings.
- The plan's first hand run is a useful check, but does not cover the failure cases above. Activation should wait for the protocol and boundary decisions, then local fixture tests for wake states, ownership, budget termination, report admission, recurrence and test-shell isolation.
