# Brief for kimi — one council seat's empty decision blocks the whole Sunday (civic.39)

**From:** engine-sheet, 2026-09-24. **Plan:** `docs/plans/2026-09-24-initiatives-in-the-world.md` Job 1. **Your files** (sole editor): `scripts/validateTrackerUpdates.js`, `scripts/validateTrackerUpdates.test.js`, `scripts/cron-civic-run.js` if needed.

## What happened (reproduce)

`node scripts/cron-civic-run.js --stage=tick --cycle=108` (dry). The fold worked: 5 work moves → 5 initiatives, 1 candidate. Then close-det failed:

```
VALIDATION FAILED — 1 HARD violation(s) for cycle 108:
  ✗ [initiative-dark] decision:youth-apprenticeship
      INIT-007: 1 trackerUpdates-bearing record(s) but zero writable fields …
[tick] close-det failed … stays ready, retried on a later tick
```

`output/city-civic-database/initiatives/youth-apprenticeship/decisions_c108.json` is `trackerUpdates: { InitiativeID: "INIT-007" }` — assembled from three council/mayor statements (Crane D6, Chen D8, mayor-open) about INIT-007. INIT-007 has no project director and no work move this week. Result: the whole week's write (Fund, OARI, health center, transit hub, Baylight work stamps) is held on one row nobody owns.

## Why it's wrong now

G-INIT1 (`validateTrackerUpdates.js:114-131`) was built for C100, when a project agent OWNED an initiative and its schema drift silently dropped the owner's fields. Under civic.38/39 the seats' moves carry the writes and the engine's clocks price neglect; civic.39 acceptance 1: "a failed seat voice leaves the others' moves applied." An initiative that only council statements talked about, with no writable field, is silence — not a pipeline failure.

## Ask

Keep G-INIT1 HARD only where it still guards something real (the owning project agent's own record lost its fields — the C100 case). An initiative whose records carry no owner-agent voice and no writable field becomes a WARNING (`initiative-silent`, with the same detail), and the close proceeds for every other initiative. Pick the ownership signal from what the records already carry (decision file agent dir vs the civic office map's project directors, or the statement's owner flag) — don't invent a new field.

## Verify

- `validateTrackerUpdates.test.js`: C100 owner-drift case still HARD; council-only zero-writable initiative → warning, not violation; add the INIT-007 C108 shape as a fixture.
- `node scripts/cron-civic-run.js --stage=tick --cycle=108` (dry): close-det passes, the dry tracker diff shows `LastWorkCycle`/`LastWorkSeat` on the five worked initiatives, the candidate row, and nothing for INIT-007.
- Game + tick suites green. **No `--apply`, no live write, no crontab edit.** Commit path-specific, then tell engine-sheet (tmux godworld:2) the commit. agy reviews after.
