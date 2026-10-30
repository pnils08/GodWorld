# for-claude-review — the house-guest inbox

**What this folder is.** The one place a house-guest lane (Kimi, Codex, Grok)
puts a finished research doc, plan doc or review that is waiting on a Claude
seat to review, register, or act on. Nothing else lives here. (Antigravity's
reviews go to `output/antigravity/`.)

**Why it exists.** Guests cannot message a Claude session; a finished document
saved anywhere else is invisible until someone stumbles on it. The engine-sheet
and research-build boot hook checks this folder and greets with `REVIEW INBOX:
clean` or `REVIEW INBOX: N waiting — <files>`. That is the whole notification
mechanism — a file here is a message to Claude; a file anywhere else is not.

## Contract

- **Put here:** a completed research MD or plan MD, written to the templates in
  `docs/engine/rollout-rules.md` §2 (research/plan templates + frontmatter), or
  a review of a Claude change with its verdict (`AGENTS.md` §A review). Engine
  plans and reviews carry their wiring card (`AGENTS.md` §A review).
- **File name:** `YYYY-MM-DD-<lane>-<topic>.md` — e.g.
  `2026-08-30-kimi-bond-intake-gaps.md`. The lane prefix is mandatory; it is
  how the reviewer knows who wrote it without opening it.
- **Done means done.** Drafts stay in the guest's own scratch space. A file
  here is a claim that the work is complete and ready for review.
- **Do not edit a file after saving it here** unless the reviewer sends it
  back. Append a dated note at the bottom if you must correct something.
- **Never delete or move** another lane's file. Only a Claude seat clears the
  inbox.

## What Claude does with a file

1. Reads it (on demand — the boot greeting only reports the count).
2. Research or plan accepted → moves it to its permanent home
   (`docs/research/` or `docs/plans/`), registers it in `docs/index.md`, and
   files or updates the ROLLOUT row per `docs/engine/rollout-rules.md` §4.
3. Review resolved (every finding verified and folded, accepted or refused) →
   moves it to `docs/archive/for-claude-review/`; the owning plan links it there.
4. Research or plan sent back → appends a dated `## Review — <date>` section
   stating what is missing and leaves the file here.
5. Guests carry no `NEXT` line (builder 2026-10-28): the guest hears the outcome
   in its next task brief or a one-line pane message
   (`docs/reference/CROSS_LANE_MESSAGING.md`).
6. Every file but a sent-back one leaves this folder when resolved. **Clean
   inbox = no guest work is waiting on Claude.**

`README.md` is the only permanent file here. The boot check ignores it.
