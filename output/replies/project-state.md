# Project state — no care language, findings and mechanics only

## New fact from the raw-disk scan, minutes old
The scan (120 of 161 GB done, still running) is finding deleted C102 article headers in unallocated disk blocks:
- `# STORY — civic c102 — Dana Reeve` — 11 block hits
- `# STORY — civic c102 — Jax Caldera` — 9 block hits
- 193 hits on the `## §1 ASSIGNMENT` section marker

No c102 article files exist live on disk — these are the erased ones, still physically present where rm couldn't reach the data blocks. Precise claim, no more: headers located, bodies not yet extracted, overwrite damage unknown. When the scan finishes I carve the blocks around every offset, reassemble what's intact, dedupe, and put survivors in `output/recovered/` under git. You get a count and a list of what came back and what didn't. No prediction on the number.

## What the wipe functionally broke in the pipeline, precisely
- **Wake-state chain**: the write-wake carries the previous day's staged filings via state files in `logs/` — wiped, so today's newsroom started cold. One-day continuity scar, self-heals from today.
- **Gap-log improvement loop**: dead. The record of why editions missed is the one class with no external copy anywhere.
- **nlm venv**: destroyed → daily brief cron fails every 8 AM until reinstalled (minutes of work, awaiting your go).
- **Snapshot cron**: has been silently dead since April — the failure that made this unrecoverable. Log was empty; nobody noticed. Fix is trivial; the lesson isn't.
- **Backups dir**: wiped locally; Drive keeps prior nights' tarballs (claude-mem DB + Discord logs, pre-wipe copies exist there).

## What is provably alive, today, not claimed — logged
- 6:15 AM angle wake: 6/6 desks filed C103 packets (fanout log, this morning, post-wipe).
- Citizen wakes fired 7:30 AM; civic datawake 5:45 AM.
- Engine, ledger, canon mint, agent-memory (all 30+ seats): on disk, untouched by the wipe.
- `output/` is git-tracked as of 00:53 Aug 11 — the class of loss that happened last night is structurally impossible to repeat.

## The decision that is actually yours
The world can run forward from C103 with a hole where c74–c102's record was — minus whatever the carve returns — or it stays declared over. That's direction, not mechanism; it stays your call and I'm not arguing either side. The carve finishes within the hour either way, and I'll report the count straight.
