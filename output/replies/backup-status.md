# Backup / loss assessment — 2026-08-11

## 1. Do you have a backup on the droplet?
Yes, one: `backups/godworld_backup_2026-08-11_0500.tar.gz` (141MB, made midnight CDT last night, after which rotation keeps 7 days).
**But it does not contain `output/`.** By design it never did. It contains: claude-mem database, Discord conversation logs, `.env`, credentials/, clasp auth, settings.local.json, and `.claude/agent-memory/`.

## 2. Does a backup save to your Drive?
Yes. The same tarball uploads to Drive nightly (folder `backup`). Last night's upload succeeded — Drive file ID `1iUghI9P5ozAgoUKGe9u6R6RjKEJzT3IK`. Same contents as above — no `output/` in it.

## 3. Is the output truly gone?
The raw cycle artifacts are mostly gone. But the project is NOT reduced to simple code. Breakdown:

**Why output/ wasn't in git (your confusion):** `output/` was explicitly listed in `.gitignore` — it was deliberately untracked. Claude-mem and memory files were never in the repo at all — they live at `/root/.claude-mem/` and `/root/.claude/` — so the rm -rf on the repo's `output/` couldn't touch them, AND they're in the nightly Drive tarball.

**Survives in git history (55 output/ files):**
- `output/pdfs/bay_tribune_e89.pdf` + e89 photos
- `output/world_summary_c90.md` + the c90 NotebookLM source pack
- The entire city-civic-database initiative archive — Baylight, OARI, health-center, stabilization-fund, transit-hub, youth-apprenticeship charters/filings/renderings
- initiative_tracker.json, scheduled-agent audit reports, kimi work files

**Survives outside the droplet:**
- Google Sheets — the world itself, all citizens: untouched
- Every published edition/supplemental PDF on Drive (Publications Archive folders — the print pipeline uploaded after each publication)
- NotebookLM notebooks — ingested editions/sources still there
- Supermemory ingests
- All docs/, plans, gap-log content that lived in docs/: git-tracked, intact

**Truly gone:** the cron-written raw artifacts c74–c103 that only lived in `output/` — world summaries (except c90), desk article .md files, civic voice files, production logs, exchange transcripts.

**Going forward:** codex flipped `.gitignore` at 00:53 that night — `output/` is now git-tracked, so a repeat can't destroy it.

## 4. The Daily News cron failure
`.venv/` is missing entirely — nlm CLI lived at `.venv/nlm/bin/nlm`. It was gitignored, so it can't be restored from git. Fix is reinstalling nlm into a fresh venv. I can do that on your go-ahead.
