---
title: Office-holder position wall Plan
created: 2026-08-07
updated: 2026-08-07
type: plan
tags: [civic, citizens, active]
sources:
  - docs/research/2026-08-07-voice-project-agents-social-wall-review.md (adopt, Mike-direct)
  - scripts/civic-office-map.json
  - scripts/cron-civic-run.js (datawake + cascade)
  - lib/citizenPage.js
pointers:
  - "[[engine/ROLLOUT_PLAN]]" # civic.16
  - "[[../research/2026-08-07-voice-project-agents-social-wall-review]]"
---

# Office-holder position wall Plan

**Goal:** When a civic office-holder or project director **says something** (Sunday cascade or Mon–Thu datawake), save it to their ledger citizen page (`cp-POP-*`) and hard-inject recent positions on the next run. Initiative_Tracker + Clerk remain canon; wall is continuity only.

## Condition-3 design (locked)

| Decision | Choice |
|----------|--------|
| Store | Same `citizen-pages` / `cp-POP-XXXXX` as life wakes |
| Daypart | **`CIVIC`** (distinct from wake / PRESS / deskwork) |
| Content prefix | `stated:` (cascade) or `datawake:` (Mon–Thu) |
| Idempotency key | `cascade-<statementId|i>` or `datawake-<YYYY-MM-DD>` |
| Inject | **Hard** block in civic user prompt (not optional tool) |
| Faction keying | Spokesperson district from map (OPP D5, CRC D7, IND D4) — never one wall per bloc slug |
| Fail mode | Wall read/write failures **non-fatal** (log; civic chain continues) |
| Clerk | No wall (no person POPID) |
| Journalist cron | Unchanged — no civic wall inject into newsroom |

## Tasks

### Task 1: Design lock (this doc)
- **Status:** [x] done (grok 2026-08-07)

### Task 2: `scripts/officeWall.js`
- resolveHolder(officeMap, agentDir), recordPosition, load/format/ensure
- **Status:** [x] done

### Task 3: Wire `cron-civic-run.js`
- Datawake: inject prior + record after success
- decide / voices / projects: record after success; inject prior into packet user when possible
- **Status:** [x] done

### Task 4: Register + rollout
- index, research applications, civic.16 → in-progress / done-pending-archive
- **Status:** [x] done

### Task 5: Backfill + live verify
- `node scripts/officeWall.js --backfill --cycle 102` — 12 datawake + 24 cascade lines, 0 errors
- Sample walls: Mayor, Montez (cascade+datawake), Baylight Ramos
- **Status:** [x] done (Fri UTC — no live datawake; backfill seeded walls for Mon inject)

---

## Status log
- 2026-08-07 (grok) — Design locked + module + cron-civic wiring shipped.
- 2026-08-07 (grok) — `--backfill` CLI; c102 live SM write verified on holder pages.

## Changelog
- 2026-08-07 (grok) — Initial plan + implementation.
- 2026-08-07 (grok) — Backfill from disk + live verify.
