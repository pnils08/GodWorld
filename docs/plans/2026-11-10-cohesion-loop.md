# The cohesion loop: agents audit, draft, hand off; the terminals pick up (governance.60)

**Row:** governance.60 · **Owner:** research-build · **Opened:** 2026-11-10 · **State:** ready

## Why

Builder 2026-11-10: "sim behavior rests with me but sim cohesiveness doesn't and there are enough ways for agents to address this without waiting on a human." · "We can assign agents to audit this autonomously, draft a fix and hand it to a CLI inbox, CLI can set a wake 3 times a day to check that inbox, 2 CLI (rb and es) run on these and check on each other to ensure not stuck on an approval prompt, I have Claude duet who can help, Claude Code cloud can play in, I have 100 credits on Anthropic API."

What a cohesion defect is, from the day's evidence ([[2026-11-10-stop-puppeting-the-newsroom]] §Open G, H): a figure no citizen produces (transit ridership, fund spending, hood sick counts), a loop that feeds nothing back (reporters' findings reached no builder), a constant standing in for a system.

## What already exists (read 2026-11-10)

| Piece | Where | State |
|---|---|---|
| The gate for acting unattended (in a written plan + reversible; sim direction queued) | `docs/reference/overnight_autonomy_session.md` §1 | written for overnight sessions only |
| Peer wake, peer clear, answering a peer's stuck permission prompt, hourly `CronCreate` check | same doc §4 | session-only; set by hand at boot of an overnight session |
| The inbox | `docs/for-claude-review/` + the REVIEW INBOX line at boot | works; filled by codex/agy reviews only |
| An agent runner on API keys, no CLI needed | `scripts/runEngineAgent.js --agent <name> [--provider anthropic --model …]` | used for `engine-validator`, `engine-wiring` |
| What the crons said about their own work | `scripts/cronFeedback.js` (pipeline.109) | digest at boot; does not yet read a piece for a hollow figure |
| A way to run one reporter without the live run | `scripts/testReporterWrite.sh` (pipeline.110) | write stage only |

Not there: an auditor that runs by itself and drafts a fix; a standing wake for the two terminals; the cohesion rule in the gate.

## Build

1. **Auditor agent** `.claude/agents/engine-cohesion/` run by `runEngineAgent.js` on the Anthropic credits (Sonnet). Input: the day's staged pieces and their transcripts, `output/cron-feedback.md`, the research.33 map of engine figures. Job: find one cohesion defect, read the code that produces it, and write one file to `docs/for-claude-review/YYYY-MM-DD-cohesion-<topic>.md` holding the evidence (piece + file:line), what would make citizens produce the figure, and a drafted diff. It edits nothing else. Cron, three times a day. A per-run token cap, and the first week's spend read before the cap is raised.
2. **Standing wake.** A crontab line three times a day runs a script that, for each terminal pane that is idle at its prompt, sends one line: check the inbox, check the peer for a stuck prompt (overnight doc §4), then continue the NEXT line. A busy pane is never typed into.
3. **The gate, widened.** Overnight doc §1 becomes the standing rule and gains the builder's line: a cohesion defect is found, fixed through plan → test shell or sandbox → review → deploy, and reported, without asking. Sim behavior is still queued for him.
4. **Pickup rule.** An inbox cohesion file is a claim: the terminal verifies it against the code, then either builds it as a row of its own or writes why not into the file. Engine substrate goes to engine-sheet with the sandbox proof and review the rules already require.
5. **Other lanes.** Claude duet has connectors and no repo: it can read the sheets and Drive and say whether a fixed figure now looks alive from the outside. Claude Code cloud works on a pushed clone; it can take an auditor run or a drafted fix once the stack is pushed. Neither is needed for steps 1–4.

## Tasks

| # | Task | Status |
|---|---|---|
| 1 | research.33 map of engine figures (first input) | running 2026-11-10 |
| 2 | `engine-cohesion` agent + one hand run, file read by a terminal | open |
| 3 | Wake script + crontab, proven on an idle and a busy pane | open |
| 4 | Gate text in the overnight doc and `.claude/TERMINAL.md` (control-plane commit) | open |
| 5 | First defect carried end to end: found by the agent → built → sandbox → live | open |
