---
title: Reporter → Desk Agent Routing Index
created: 2026-05-11
updated: 2026-05-11
type: reference
tags: [media, reporters, routing, active]
sources:
  - docs/media/voices/*.md — voice files (canonical Desk: header per reporter)
  - .claude/agents/*-desk/ — desk-agent catalog
  - "[[../skills/write-edition/SKILL]] §Step 1 — consumer of this index"
pointers:
  - "[[../../docs/engine/archive/ROLLOUT_PLAN]] pipeline.16 — entry that filed this index"
  - "[[../../output/production_log_edition_c93_write_gaps.md]] §G-W2/W3/W9/W11 — gaps this closes"
---

# Reporter → Desk Agent Routing Index

**Purpose.** `/sift` produces per-reporter briefs. `/write-edition` Step 1 launches **desk agents** (the Task-tool agent catalog only exposes desks, not individual reporters). This index is the canonical map from reporter byline → desk agent that launches under that voice. Single source of truth.

**Built S215 (research-build).** Closes G-W2 (per-reporter briefs vs per-desk agents granularity mismatch), G-W3 (no reporter→desk routing table), G-W9 (Jax beat-axis ambiguity), G-W11 (firebrand boot heavier than desk agents — same brief-led trim recommendation).

---

## Primary routing (single-desk reporters)

These reporters map 1:1 to a desk agent. Voice file's `**Desk:**` header is canonical.

| Reporter | Voice file | Default desk agent | Beat |
|----------|-----------|--------------------|------|
| Anthony | `docs/media/voices/anthony.md` | `sports-desk` | A's data, roster moves, front office, scouting |
| Hal Richmond | `docs/media/voices/hal_richmond.md` | `sports-desk` | Legacy essays, dynasty context, cultural retrospectives |
| P Slayer | `docs/media/voices/p_slayer.md` | `sports-desk` | Opinion, emotional pulse, fan voice |
| Simon Leary | `docs/media/voices/simon_leary.md` | `sports-desk` | Sports culture, history crossover |
| Tanya Cruz | `docs/media/voices/tanya_cruz.md` | `sports-desk` | #InsideTheA's social feeds, clubhouse access |
| Carmen Delaine | `docs/media/voices/carmen_delaine.md` | `civic-desk` | Government, municipal rhythm, service health, infrastructure data |
| Dr. Lila Mezran | `docs/media/voices/dr_lila_mezran.md` | `civic-desk` | Medical, public health, clinic reports, health arcs |
| Luis Navarro | `docs/media/voices/luis_navarro.md` | `civic-desk` | Shock events, accountability, civic fact-checking, anomalies |
| Sgt. Rachel Torres | `docs/media/voices/sgt_rachel_torres.md` | `civic-desk` | Crime, safety events, OPD interface |
| Trevor Shimizu | `docs/media/voices/trevor_shimizu.md` | `civic-desk` | Utilities, transit, structural issues, outages |
| Jordan Velez | `docs/media/voices/jordan_velez.md` | `business-desk` | Wage trends, workforce patterns, port logistics, retail |
| Maria Keen | `docs/media/voices/maria_keen.md` | `culture-desk` | Neighborhood feeling, hyper-local culture, community pulse |
| Mason Ortega | `docs/media/voices/mason_ortega.md` | `culture-desk` | Restaurants, small business, pop-ups, late-night spots |
| Noah Tan | `docs/media/voices/noah_tan.md` | `culture-desk` | Forecasts, environmental cycles, climate, air quality |
| Sharon Okafor | `docs/media/voices/sharon_okafor.md` | `culture-desk` | Routines, habits, behavior trends, daily life |
| Kai Marston | `docs/media/voices/kai_marston.md` | `culture-desk` | Galleries, musicians, artists, First Fridays, Cultural Ledger figures |
| Angela Reyes | `docs/media/voices/angela_reyes.md` | `culture-desk` | Schools, youth programs, OUSD, after-school athletics |
| Selena Grant | `docs/media/voices/selena_grant.md` | `chicago-desk` | Bulls coverage, roster construction, player development |
| Talia Finch | `docs/media/voices/talia_finch.md` | `chicago-desk` | Street-level Chicago, city texture, neighborhood pulse |
| Letters | (anonymous slate) | `letters-desk` | Citizen letters reacting to the edition |

## Beat-axis routing (multi-desk reporters)

Some reporters cover multiple beats and need beat-conditional routing per launch. Default is editor judgment per brief; the dispatch.json from `/sift` (when produced) names the agent explicitly to remove ambiguity.

| Reporter | Voice file | Beat → Desk agent |
|----------|-----------|-------------------|
| Jax Caldera | `docs/media/voices/jax_caldera.md` | **accountability / oversight / silence** → `freelance-firebrand` · **nightlife / culture** → `culture-desk` |
| Farrah Del Rio | `docs/media/voices/farrah_del_rio.md` | **op-ed / policy critique** → `freelance-firebrand` · **culture-as-policy** → `culture-desk` |

**Routing rule:** brief topic + reporter IDENTITY.md decide. If the brief frames accountability ("what nobody is saying," anonymous-source angle), route firebrand. If the brief frames cultural-texture, route the relevant standing desk.

## Unmapped voices (no desk agent yet)

These voices exist in `docs/media/voices/` but have no corresponding desk agent. Launching them currently requires editor judgment — typically routes through the **closest-fit desk** with the reporter named in the launch prompt.

| Reporter | Voice file | Desk header | Closest-fit launch agent |
|----------|-----------|-------------|--------------------------|
| Celeste Tran | `docs/media/voices/celeste_tran.md` | Wire / Rumor / Social — Hashtags, viral moments, fanbase temperature | `sports-desk` (most A's-adjacent) |
| Reed Thompson | `docs/media/voices/reed_thompson.md` | Wire / Rumor / Social — Neutral rumor verification | `civic-desk` or `sports-desk` by brief topic |
| MintConditionOakTown | `docs/media/voices/mintconditionoaktown.md` | Wire / Rumor / Social — Anonymous rumor aggregation | `freelance-firebrand` (closest tonal fit) |

If a Wire desk agent is built later, update this table.

## Podcast + Editor

| Reporter | Voice file | Desk agent | Notes |
|----------|-----------|-----------|-------|
| Podcast hosts | `docs/media/voices/podcast_hosts/` | `podcast-desk` | `/podcast` skill invokes this; not part of `/write-edition` chain |
| Mags Corliss | `.claude/agents/mags-corliss/` | (none — Mags writes Editor's Desk + Quick Takes herself) | Editor pieces don't route through desk agents |

## Boot trim under brief-led invocation

Per `/write-edition` SKILL.md §Rules (S215, G-W4 + G-W11): when a desk agent or freelance-firebrand is launched **by `/write-edition`** with a brief, the agent's boot is short-circuited to "read brief + IDENTITY.md, write." The desk SKILL.md heavier boot sequences (LENS + RULES + workspace + voice files) are NOT executed under brief-led invocation. Direct invocations of desk agents outside `/write-edition` may still run the full boot.

This trim closes the C93 observation that firebrand boot took 152s + 7 tool uses while desk agents averaged 30-67s + 3 tool uses (G-W11).

## Maintenance

- **New voice file lands** in `docs/media/voices/` → add a row to this index in same commit (S147 inbound-link rule).
- **New desk agent lands** in `.claude/agents/<desk>-desk/` → reassign relevant reporter rows here and update.
- **Beat reassignment** for a reporter (their voice file's beat header changes) → update the beat-axis row.

This index is the single source of truth. If `/write-edition` or `/sift` hard-codes a routing decision in skill text, it overrides this index — but the skill should be updated to defer here rather than carry a stale mapping.

## Where this sits

`/sift` may emit `output/dispatch_c{XX}.json` with the per-launch mapping (mechanical). When dispatch.json is absent, `/write-edition` Step 1 falls back to this index. The two are consistent — dispatch.json is the per-cycle resolution of this index against actual story assignments.
