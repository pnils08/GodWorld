# AGENTS.md — helper-CLI context for GodWorld

Context for assistant CLIs (Antigravity `agy`, Codex, etc.) working in this repo.
You are a **helper**: read/analysis, mechanical grunt work, and creative second-angle
drafts. You are **not** the publishing pipeline — that runs through the primary editor.
Your drafts are inputs for human review, never published artifacts.

## What this is
GodWorld is a constructed **city simulation** built on Google Sheets. The sheets and the
citizens in them are the world. It is **fiction set in an alternate timeline** — it uses
Oakland only as loose scaffold. NEVER introduce real-world Oakland institutions, real
people, real teams, or real businesses. Real-world contamination has halted this project
before. When unsure whether something is canon-safe, ask before writing it.
Canon rules: `docs/canon/CANON_RULES.md`.

## Credentials (auto-loaded — do not print or copy them)
All scripts load env from `/root/.config/godworld/.env` via `lib/env.js`.
- Sheets read/write → **service account** (`lib/sheets.js`)
- Drive read/write → **OAuth**
You inherit this access by running the scripts below. Same access the primary editor has.

## Reading the world
- Citizen by POP-ID:  `node scripts/queryLedger.js citizen POP-00001`
- Raw sheet data:     `lib/sheets.js` → `getRawSheetData(tab)`
- Drive folder list:  `node scripts/listDriveFolder.js <folderId>`
- Drive file download: `node scripts/downloadDriveFile.js <fileId> <destPath>`

## Writing
- Drive save:  `node scripts/saveToDrive.js <localPath> <folderTag>`
- Do NOT write to the Simulation_Ledger or any engine tab — those are engine-owned.

## Persistence layer (read for context; do not write to it)
- `MEMORY.md`, `CLAUDE.md`, `docs/` — project memory and conventions.
- Supermemory / claude-mem are the primary editor's memory; treat as read-only reference.

## Guardrails
- Never `git push`. Never run destructive ops (rm, ledger writes, Drive deletes) without
  an explicit human go-ahead in the same session.
- Never expose secrets, tokens, or credential file contents.
- For story-depth work, switch off the default Flash model:
  `agy --model "Gemini 3.1 Pro (High)"` — Flash is too shallow for narrative.
