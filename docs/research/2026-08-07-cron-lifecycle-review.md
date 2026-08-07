---
title: Cron lifecycle review — research
created: 2026-08-07
updated: 2026-08-07
type: reference
tags: [research, operations, active]
sources:
  - Mike-direct 2026-08-07 — next-work queue item B
  - Live `crontab -l` 2026-08-07 UTC on droplet
  - Live `pm2 list` 2026-08-07
  - AGENTS.md Live automation table (cross-check; crontab is authority)
  - scripts/cron-civic-run.js · cron-desk-run.js · cron-saturday-run.js · citizen-wake.js
pointers:
  - "[[2026-08-07-next-work-queue-pslayer-cron-city-metrics]]"
  - "[[../engine/ROLLOUT_PLAN]]"
  - "[[../plans/2026-07-28-civic-cron-city-hall]]"
  - "[[../plans/2026-08-04-newsroom-canon-flow]]"
---

# Cron lifecycle review — research

**Source:** Live droplet crontab + PM2 + script headers (2026-08-07 UTC). Mike queue item B.

**What this addresses:** One map of autonomous life: schedule → job → writes → fail mode → who owns fix. Prevents building slices against a wrong calendar.

**What it does:** Inventory of live jobs (not hoped-for), day-of-week life of the city, gaps/hazards, verdict.

---

## Extraction — usable map

### UTC day skeleton (production)

| UTC | Job | Script | Writes / effect | Canon? |
|-----|-----|--------|-----------------|--------|
| 03:00 1st | Droplet snapshot | `snapshot-droplet.sh` | DO snapshot keep-1 | n/a |
| 04:00 Wed | Weekly maintenance | `weekly-maintenance.sh` | engine health audit; Discord on issue | n/a |
| 05:00 daily | Backup | `backup.sh` | tarball + Drive; 7 keep | n/a |
| 05:45 Mon–Thu | **Civic datawake** | `cron-civic-run.js --stage=datawake` | office domain statements; **civic.16 position wall** | source material, not edition canon |
| 06:00 daily | Newsroom digest | `newsroom-digest.js` | `output/cron-compare/digest-*.md` (Mike review) | no |
| 06:15 Mon–Fri | Desk **angle** fanout | `cron-desk-run.js --stage=angle --fanout` | rotation + angles; wall inject journalists | staged path only |
| 07:00 / 12:00 / 19:00 | Discord → Mags | `discord-reflection.js` | Mags page + SM + claude-mem | Mags page not bay-tribune |
| 07:30 / 12:30 / 21:30 | Citizen wake | `citizen-wake.js --wake=…` | `cp-POP` reflection + intake gated | dials via intake drain |
| 08:00 daily | NotebookLM daily | `notebooklmDailyNews.js` | listening brief | **not canon** |
| 13:15 Mon–Fri | Desk **report** | `--stage=report --fanout` | quotes | no |
| 14:30 Sun | Civic chain (early) | `cron-civic-run.js --stage=chain` | dry chain unless apply; guard if no engine | civic source |
| 16:00 Sat | **Saturday pipeline.45** | `cron-saturday-run.js --apply` | scorecard → curate → narrate → **canon door** + sheets | **YES weekly** |
| 17:00 daily | Citizen exchange | `citizen-exchange.js` | exchange + intake | gated |
| 18:15 Mon–Fri | Desk **write+gate** | `--stage=write --fanout --gate-backend api` | staged/flagged; PASS self-record wall | probation until Sat |
| 21:00 Sun | Civic chain (late retry) | same chain | same guards | civic source |
| */6h | Server health | `server-health-check.sh` | Discord alert on breach only | n/a |
| Sun 23:07 | Bond graph | `buildCitizenBondGraph.js --live` | dashboard bond web JSON/HTML | derived |
| 1st/2nd md-audit guard | `mdStalenessDetector.js` | report-only | n/a |

**Disabled / orphan:** `daily-reflection.js` “Mags Daily Heartbeat” — comment only, no cron (S187).

### PM2 (always-on)

| Process | Status (2026-08-07) | Role |
|---------|---------------------|------|
| godworld-dashboard | online | Express dashboard :3001 |
| mags-bot | online (high restart history) | Discord bot |
| wd-cards-daemon | online | citizen cards |
| moltbook | **stopped** between scheduled runs — do not manual restart without approval | social |

### Day-of-week “who is working”

| Day (UTC) | Civic offices | Newsroom bylines | Citizens |
|-----------|---------------|------------------|----------|
| Mon–Thu | Datawake domains (crime, health, Baylight…) | Angle/report/write | 3 wakes + exchange |
| Fri | **No datawake** (life day) | Full fanout | full |
| Sat | No datawake | No M–F fanout; **16:00 canon pipeline** | full |
| Sun | **Chain** 14:30 + 21:00 (needs engine fire) | No M–F fanout | full |

### Fail modes worth knowing

1. **Sunday civic chain is dry/guarded** — exits clean if engine not fired or `close_cN` exists; late retry 21:00. Not the same as `--apply` tracker write without explicit mode.  
2. **Newsroom M–F is probation** — staged until Saturday apply.  
3. **Civic.16 walls** write on datawake/cascade success; backfill already seeded c102. First **live** Mon–Thu write still the production proof.  
4. **mags-bot** high restart count — watch, don’t “fix” mid-audit without intent.  
5. **AGENTS.md table can drift** — this research used live crontab; re-run `crontab -l` before trusting ages.

---

## Gaps / fine-tune candidates (not auto-fixes)

| Gap | Severity | Note |
|-----|----------|------|
| No automated engine cycle fire in crontab | by design | Mike/manual GAS; Sun civic waits on it |
| Fri office silence | by design | holders are citizens Fri–Sat |
| pipeline.45 first unattended Sat | watch | research-build NEXT already watches Aug 8 |
| Orphan daily-reflection comment | low | clutter only |
| Double Sunday chain | ok | intentional retry |
| No single health dashboard of “did all crons succeed today?” | med | logs scattered under `logs/` |

---

## Not applicable / hazard

- Do not enable `--apply` on civic chain from this review alone.  
- Do not restart moltbook/mags-bot as part of a map exercise.  
- Do not add crons without Mike approval.

---

## Verdict: `adopt`

Use as standing **ops map**. Ignite plans only for named gaps (e.g. cron health rollup) if Mike wants them.

**Ignited plans:** none yet.

---

## Applications (living)

- 2026-08-07 — Written as queue item B; grounds P Slayer slice schedule + metrics work.

---

## Changelog

- 2026-08-07 (grok) — Live crontab/PM2 inventory.
