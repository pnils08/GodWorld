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
  - "[[archive/plans/2026-05-29-c95-gap-log-triage]] — canonical worked example (model on this, NOT C94)"
  - "[[../engine/ROLLOUT_PLAN]] — ONE pointer row lands here"
  - "[[../engine/rollout-rules]] — doctrine (§2 triage = the bridge)"
---

# Triage — <C<XX> gap logs | topic>

**The multi-terminal handoff document** (rollout-rules §2): research-build's two-track decomposition of work that spans **both builder terminals** — read the input → cluster by root cause → route to Track A (research-build) + Track B (engine-sheet) → emit ONE ROLLOUT pointer row. Research-build authors; engine-sheet executes its Track B; generators (civic/media) never triage.

**Two feeders** (same shape, different input):
- **Gap logs** — a cycle's gap logs straddle apparatus + substrate; run [[GAP_LOG_TRIAGE_PLAYBOOK]] (8 steps) to produce this doc.
- **An escalated plan** — a single-terminal plan that turns out to need both. Cite it as `Source plan:` below; add `Escalated to triage: [[this]]` in the plan; add this triage's pointer to the plan's ROLLOUT row (→ `[[plan]] + [[triage]]`).

If the work needs only ONE terminal, it doesn't belong here — write a plain plan ([[TEMPLATE]]).

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
