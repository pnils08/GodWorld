---
title: "Gap-Log Triage — C<XX> [TEMPLATE — copy, don't edit in place]"
created: YYYY-MM-DD
updated: YYYY-MM-DD
type: plan
tags: [governance, plan, gap-log-triage, draft]
sources:
  # one line per gap log this triage ingests — path + skill + entry count
  - "output/production_log_<skill>_c<XX>_gaps.md (<skill>, <N> entries)"
pointers:
  - "[[GAP_LOG_TRIAGE_PLAYBOOK]] — THE METHOD (8 steps). Run it; this file is just the shape it fills."
  - "[[TEMPLATE]] — the generic plan shape this specializes"
  - "[[2026-05-29-c95-gap-log-triage]] — canonical worked example (model on this, NOT C94)"
  - "[[../engine/ROLLOUT_PLAN]] — ONE pointer row lands here"
  - "[[../engine/rollout-rules]] — doctrine (§2 triage = the bridge)"
---

# Gap-Log Triage — C<XX>

**Run [[GAP_LOG_TRIAGE_PLAYBOOK]] for the method (8 steps); this is the document shape it produces.** Research-build's bridge pass (rollout-rules §2): read this cycle's gap logs → cluster by root cause → route to two terminal tracks → emit ONE ROLLOUT pointer row. Generators (civic/media) produce gap logs; research-build triages.

**The shape — non-negotiable (playbook anti-patterns):**
- **NOT** a C94-style per-entry inventory that spawns a row per cluster — that moves bloat into ROLLOUT. Keep the C94 *thinking* (read → cluster → route); use the C95 *shape*.
- Output = this one plan + phases by terminal + **ONE** pointer row in ROLLOUT. Detail lives here; ROLLOUT gets a pointer + a one-line summary as each phase closes.
- Don't copy folded rows' inline history in — fold the forward task by reference (`Absorbs ROLLOUT: <code>`).

---

## §Source Inventory

Every gap log feeding this triage (playbook step 1: `find output/ -iname "*production_log*_c<XX>_gaps.md"`). Severity profile = H/M/L/INFO.

| # | File | Skill / Source | Entries | Severity profile |
|---|------|----------------|---------|------------------|
| 1 | [<skill> gaps](../../output/production_log_<skill>_c<XX>_gaps.md) | /<skill> | <N> | <H>H / <M>M / <L>L |

---

## §Cluster Map — gaps → theme → track → folded rows

Collapse the gaps into root-cause themes (playbook step 3 — cluster by root cause, NOT by source skill). A theme is real when one architectural change closes multiple gaps. Severity = highest constituent.

| Theme | Sev | Constituent gaps | Track | Folds ROLLOUT |
|-------|-----|------------------|-------|---------------|
| T1 — <root cause> | H | G-XX1, G-XX4, … | A (research-build) / B (engine-sheet) / both | <code> or — |

---

## Track A — research-build (apparatus: skills, agent RULES, docs, rubrics, canon, boot)

One phase = one session's work. Each carries `Source gaps:` + `Absorbs ROLLOUT:` (playbook step 6). Order by leverage (highest-severity / most-gaps-closed first).

### Phase RB-1: <name> (Theme T<n>)
- **Source gaps:** <gap IDs>
- **Absorbs ROLLOUT:** <code> or none
- **Steps:** <exact file paths + concrete edits>
- **Verify:** `<command / check>`
- **Status:** [ ] not started

---

## Track B — engine-sheet (substrate: engine code, scripts, parsers/validators, auditor, sheets)

### Phase ES-1: <name> (Theme T<n>)
- **Source gaps:** <gap IDs>
- **Absorbs ROLLOUT:** <code> or none
- **Steps:** <exact file paths + concrete edits>
- **Verify:** `<command / check>`
- **Status:** [ ] not started

---

## §Cross-Track Dependencies

Where a phase in one track gates a phase in the other. State the direction so the two instances don't collide.

---

## §Already-Addressed / Inline / Out-of-Scope

Gaps that don't become phases — say why (already shipped, duplicate, noise, deferred-with-trigger, Mike-owned, harness-config). Every gap gets a disposition; nothing silently vanishes. Don't force a gap into RB/ES if it genuinely needs a running media/civic context — surface it here as a verification step or handoff note (playbook step 4).

---

## §ROLLOUT row (the output — ONE row)

File one pointer row in the most-fitting group (cross-cutting remediation → `governance.*`), state `in-progress`, pointing at this plan. Register the plan in [[../index]] same commit. As phases close, add a one-line summary to that row (`RB-2 closed S<N> commit <hash>`) and flip absorbed rows to `done-pending-archive` — don't expand the row (playbook step 8).

`governance.<n> | C<XX> gap-log triage — <N> gaps, M themes, 2 tracks | in-progress | research-build / engine-sheet | this plan`

---

## Open questions

- [ ] <decisions gated on Mike / another terminal — keep building the rest>

---

## Changelog

- YYYY-MM-DD (S<N>) — Initial triage. <N> gap logs / <M> entries → <K> themes → <P> phases (RB + ES). One ROLLOUT row filed.
