---
title: Gap Log Template
created: 2026-05-10
updated: 2026-05-10
type: reference
tags: [architecture, infrastructure, template, active]
sources:
  - S212 grilling session (Mike) — "gap logs are sidecars to heavy skill terminals (civic + media), they catch inefficiency and gaps in the skills"
  - "[[TEMPLATE]] — sibling document-shape template (plans)"
  - "[[../adr/0005-rollout-plan-structure]] — gap logs are pointer destinations for pipeline.* / civic.* ROLLOUT entries"
  - "[[../adr/0004-skill-bag-naming-principle]] — civic + media are generator terminals; gap logs are the evaluation pass"
pointers:
  - "[[TEMPLATE]] — plan template (sibling)"
  - "[[GAP_LOG_TRIAGE_PLAYBOOK]] — project-level method: how a cycle's gap logs get triaged into a phased two-track plan (this template is the single-log input to that method)"
  - "[[../engine/ROLLOUT_PLAN]] §How to add work — gap logs reference back from ROLLOUT rows"
  - "[[../index]] — register new gap log MD entry in same commit"
---

# Gap Log Template

**Every gap log uses this shape.** Gap logs are sidecars to heavy-skill runs at the **generator terminals** (civic + media). When a session runs a complex skill (`/city-hall` / `/city-hall-prep` / `/sift` / `/write-edition` / `/edition-print` / `/post-publish` / `/dispatch` / `/interview`), the run produces a parallel gap log capturing inefficiencies, drift, and gaps in the skill itself.

The contract: a gap log is the canonical inventory of sub-issues from **one skill-run on one cycle**. The parent ROLLOUT row points at it (per ADR-0005 §How to add work, "in-flight observations → existing gap log"); per-gap promotion to standalone ROLLOUT items happens when bandwidth allows.

**Why this shape exists (S212):** per ADR-0004, civic + media are the generator terminals in our gen-eval architecture. Per S212, generation has no holistic quality compass; evaluation does. Gap logs are the evaluation pass made architectural at the skill layer — the model that ran the skill captures friction the skill couldn't catch while running.

Other terminals have different sidecar shapes:
- **engine-sheet** — `docs/engine/ENGINE_REPAIR.md` (tactical-defects tracker, row-shaped, single-file with row-template inline)
- **research-build** — research notes / plans / ADRs (different shape; different discipline; no per-cycle sidecar)

---

## Template

Copy everything below the fence. Rename to `output/production_log_<skill>_c<XX>_gaps.md` (or sidecar to the consolidated `production_log_c<XX>.md`). Italicized guidance is for the writer — delete after filling in.

```markdown
---
title: /<skill> C<XX> Gap Log
created: YYYY-MM-DD
updated: YYYY-MM-DD
type: gap-log
tags: [<terminal>, gap-log, c<XX>, <skill-name>]
sources:
  - ".claude/skills/<skill>/SKILL.md"
  - "output/production_log_<...>_c<XX>.md (parent production log)"
pointers:
  - "[[../../docs/engine/ROLLOUT_PLAN]] — parent ROLLOUT entry (<group>.<n>)"
  - "[[../../docs/plans/GAP_LOG_TEMPLATE]] — this template"
---

# /<skill> Gap Log — Cycle <XX>

**Run completed:** <ISO timestamp or session>
**Skill:** /<skill> v<version>
**Terminal:** <civic|media>
**Total gaps:** <N> (<H> HIGH / <M> MED / <L> LOW)

## Severity counts by category

Categories are skill-specific but typically include:

| Category | HIGH | MED | LOW | Total |
|----------|------|-----|-----|-------|
| pipeline-fragility | | | | |
| user-soft | | | | |
| process-gap | | | | |
| canon-risk | | | | |
| quiet-pipe | | | | |
| <skill-specific> | | | | |

## HIGH-severity gaps

### G-<prefix><N>: <≤80-char title>

- **Severity:** HIGH
- **Category:** pipeline-fragility | canon-risk | user-soft | process-gap | quiet-pipe | other
- **What happened:** 1-3 sentences. What did the skill do or fail to do? Be specific — file paths, line numbers, observed values.
- **Why it matters:** The downstream consequence. What breaks if uncaught?
- **Suggested action:** promote to ROLLOUT row / close inline / deferred to C<XX> / wontfix because X
- **Pointer (if promoted):** <ROLLOUT row code, e.g. pipeline.5>

### G-<prefix><N+1>: <next title>

*(Repeat per HIGH gap.)*

## MED-severity gaps

*(Same shape, condensed where the gap is well-understood.)*

## LOW-severity gaps

*(One-line each; promote-or-close decision quickly. LOW is the trash heap that accumulates without intervention — be honest about which are noise.)*

## Cross-gap patterns (meta-observations)

Recurring patterns across gaps — same root cause expressed multiple ways, doc/skill misalignment, drift class, terminal-handoff asymmetry. Examples from existing gap logs:

- **DOC-drift dominance:** ~30% of gaps across all four media skills would close with one skill-text-vs-validator-constants reconciliation pass.
- **Auto-pipeline silent on partial-success:** generator says "Generated: 6/6" with no QA-issue signal; operator must read every output.
- **N-cycle silence compounds gap discovery:** when a skill doesn't run for 2+ cycles, accumulated gaps surface together at next run (write-edition G-W16 meta-pattern).

Patterns are the highest-leverage findings — they identify systemic issues a single-cycle gap can't.

## Bundles (when multiple gaps share a root cause)

### BUNDLE-<X>: <name> — fixes G-<a> + G-<b> + G-<c>

1-2 sentences on the bundled fix. A bundle is a single-cycle deliverable that closes multiple gaps via one architectural change.

## Status updates

Append-only log. Each entry: date, session, gap closed/promoted/deferred, evidence (commit hash or pointer).

- YYYY-MM-DD (S<N>) — G-<prefix><N> closed via commit `<hash>` / promoted to <ROLLOUT row> / deferred to C<XX>.

## Changelog

- YYYY-MM-DD — Initial gap log written (S<N>).
```

---

## How to use this template

### Writing a new gap log

1. Generator-terminal session (civic / media) runs the heavy skill (`/city-hall` / `/sift` / `/write-edition` / `/edition-print` / `/post-publish` / `/dispatch` / `/interview`).
2. As the skill runs, capture observations of friction, drift, gaps. Number them by skill-prefix:
   - G-PREP\* for `/city-hall-prep`
   - G-R\* for `/city-hall` run
   - G-S\* for `/sift`
   - G-W\* for `/write-edition`
   - G-PR\* for `/edition-print`
   - G-P\* for `/post-publish`
   - G-D\* for `/dispatch`
   - G-I\* for `/interview`
3. At skill close, write `output/production_log_<skill>_c<XX>_gaps.md` using this template (or sidecar to consolidated `production_log_c<XX>.md` per S195 convention).
4. Add a single ROLLOUT row pointing at the gap log: `pipeline.<n>` (media) or `civic.<n>` (civic), per ADR-0005.
5. The gap log is canonical for sub-state; the ROLLOUT row is the index entry only.

### Severity guidance

- **HIGH** — blocks autonomous mode (skill produces broken or canon-violating output without operator catch); cross-cycle compounding; or pipeline-fragility surfacing in 2+ skills.
- **MED** — real friction but operator workaround exists; doc/skill misalignment without immediate canon risk.
- **LOW** — cosmetic, observation-only, or deferred-by-decision.

### Promotion path

A gap stays in the gap log unless and until promoted to ROLLOUT. Promotion happens when:

- A pattern recurs across cycles (G-W16 meta-pattern: HIGHs sit on shelf and compound across cycles)
- A HIGH gap blocks the next run of the same skill
- A bundle of related gaps justifies its own plan file

When promoting: create a new ROLLOUT row in the appropriate group (`pipeline.<n>` for media, `civic.<n>` for civic), point it at the gap log section or a new plan file, mark the gap-log entry as `promoted to <code>` in §Status updates.

### Subagent-safety rule

Same as [[TEMPLATE]] (plans): cite paths, not recall. Reference commits + scripts + files that exist. A fresh session reading the gap log should be able to act on a HIGH-severity entry without reconstructing prior context.

### Sidecar discipline

Gap logs are read-write artifacts during the session that produced them. After session close, gap logs are append-only — status updates land in §Status updates, not by editing the original gap entries. This preserves the gap log as evidence of what the skill did at that cycle, even after fixes ship.

---

## Why this shape (and not the plan template)

Gap logs serve a different function than plans:

- **Plans** ([[TEMPLATE]]) — designed work, forward-looking, task-list with verification steps. Read by execution sessions.
- **Gap logs** (this template) — observed friction, backward-looking from a skill run, inventory of sub-issues. Read by triage sessions deciding what to promote.

Both are sidecar artifacts to the heavy work:
- Skills produce gap logs as runtime evidence
- Rollout entries point at plans for designed work AND gap logs for in-flight observations

Both register in [[../index]] per S147. Both follow [[../SCHEMA]] frontmatter conventions.

The S212 grill (Mike) framed the gap-log relationship: civic + media are the **generator** terminals that need sidecar capture for inefficiency. Engine-sheet has its own sidecar — `ENGINE_REPAIR.md` (tactical-defects tracker, row-shaped, single file with row template inline). Research-build's sidecar is research notes / plans / ADRs — different shape, different discipline.

---

## Changelog

- 2026-05-10 — Initial template (S212). Modeled on existing C93 gap logs (sift / write-edition / edition-print / post-publish / city-hall-prep / city-hall-run — see ROLLOUT_PLAN.md `pipeline.4-7` and `civic.1-2` for the entries pointing at them). Mike framed the requirement: gap logs as sidecars for generator terminals capturing skill inefficiency. Approved structure-first per S125 protocol.
