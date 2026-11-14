# Brief for agy-rb — 2026-11-14 (research-build): reporter voice files and folders against the boot-template rules

Read-only audit. Builder 2026-11-14: "Go". Row: pipeline.111 — `docs/plans/2026-11-10-stop-puppeting-the-newsroom.md`.
Write one file: `output/antigravity/2026-11-14-review-reporter-voice-files.md`. Commit it alone.

## Why

The draft reporter template proposes a short written background (about 500 characters: who they are, how they work, how they talk) cut from each reporter's voice file. Before any cut, this audit says, per reporter, what in today's files breaks the template's rules and where the usable lines are. **The cut is not your job.**

## Read

- The rules: `docs/reference/AGENT_BOOT_TEMPLATES.md` §0 (the three bullets under the table) and §4 Reporter. It is a draft and engine-sheet's page: do not edit it.
- The 30 files in `docs/media/voices/`.
- The reporter folders `.claude/agents/<slug>/` (`IDENTITY.md`, `LENS.md`, `RULES.md`, `SKILL.md` where present) for the 27 package keys in `scripts/newsroom-wake-packages.json`.
- Ledger truth for age, home and role: `output/simulation_ledger_snapshot.jsonl`, one row a citizen, matched by the POPID in the package entry (by name only where no POPID is given, and say so).

## Report

One table row per reporter (the 27 package keys, then any voice file with no package):

| slug | POPID | voice file | folder bytes | A | B | C | D | E |
|---|---|---|---|---|---|---|---|---|

- **A** — lines stating a thing the sheet or the engine moves: age, home, health, family status, who holds which office, a project's or a team's current state, a season record.
- **B** — lines telling the reporter what to say, how to open, how to close, a length, or the form of what they produce.
- **C** — file paths, tool names, output formats, ids, model names, build or session notes.
- **D** — a statement that contradicts the ledger row (age, neighborhood, role). Quote both sides.
- **E** — where the lines are that say who they are, how they work, how they talk: `file:line-range` only.

Cells A–D: a count, then up to three examples as `file:line — "quoted text"`. Cell E: ranges only, no text.

Then four short lists: voice files with no package; package keys with no voice file; package keys with no folder; file names that do not match their slug (for example `dr_lila_mezran.md` / `lila-mezran`, `sgt_rachel_torres.md` / `rachel-torres`, `anthony.md` / `anthony-raines`).

## Not wanted

- No drafted backgrounds, no rewrites, no proposed wording, no opinion on the template. Who a reporter is belongs to the builder.
- No edit to any file but your review file. No script that calls a model, a sheet or the network.
- A claim without `file:line` is dropped. "Verified" only for a file you opened. A file you could not read is reported as not read; its row is not filled from memory.
- Real-world Oakland knowledge is not a source.
- If any part of this is blocked, stop and write `BLOCKED: <what>`; do not substitute a different deliverable.

Last line of the review file: `DONE — <n> reporters, <n> files read` or `BLOCKED: <what>`.
