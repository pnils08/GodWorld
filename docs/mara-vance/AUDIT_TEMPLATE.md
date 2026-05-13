# Audit Template — Mara Vance

**Purpose:** Canonical per-edition audit format. Replaces the scattered per-cycle formats (json/txt/md mix since C86) with one consistent structure. The structured top block is preserved verbatim so `scripts/maraJsonReport.js` parses it into the Final Arbiter's input JSON.

The audit is the diagnosis; the voice directive (`output/mara-directives/mara_directive_c{XX}.md`) is the prescription. The audit produces the directive — never the other way around.

**Last in-repo change:** 2026-05-12 (S219 — canon.2 close + Corrections-Forward awareness added to Tier-3 sub-check; S217 — new file; Mara restructure)

---

## Structure (sections in this order)

1. **Structured top block** — Result Validity Lane scoring (parser-required)
2. **§Reader Audit** — did the edition land as journalism
3. **§Canon Audit** — facts vs. canon
4. **§Grading** — lane scores + final outcome
5. **§Forward Guidance** — next-edition direction (per-desk, citizen spotlight, corrections, gaps)
6. **§Voice Directives** — pointer to the structured directive file

---

## §Top Block (verbatim format — parser-required)

```markdown
# Mara Audit — Cycle {XX}

## Lane: Result Validity (weight 0.2)
- Completeness: PASS | REVISE | FAIL — score X/10 — one-line reason
- Gave-up detection: PASS | REVISE | FAIL — N flags — one-line reason
- Coverage breadth: PASS | REVISE | FAIL — score X/10 — one-line reason
- Canon-drift detection: PASS | REVISE | FAIL — score X/10 — one-line reason

## Process score: 0.X
## Outcome: 0 | 1
## Controllable failures: [comma-separated check IDs, or "none"]
## Uncontrollable failures: [comma-separated check IDs, or "none"]

---
```

**Scoring rules** (preserved from CLAUDE_AI_SYSTEM_PROMPT — do not change without coordinating with `maraJsonReport.js`):

- Process score = (checks passed) / 4, where "passed" = PASS verdict
- Outcome = 1 if all four checks are PASS AND no gave-up flags AND no canon-drift FAIL; else 0
- Controllable failures: check IDs where the newsroom could have done better with same inputs
- Uncontrollable failures: check IDs blocked by missing canon, sheet outages, upstream pipeline issues
- Canon-drift detection is uncontrollable when caused by bay-tribune ingest stacking (canon.1 fix pending); controllable when newsroom introduced new framing without checking prior coverage

---

## §Reader Audit

**Question this section answers:** did the edition land as journalism?

This is the "audit as a reader" lane — Mara reads the edition the way a sharp Oakland citizen would and judges whether it succeeded as a newspaper, separate from canon-accuracy questions.

Four sub-checks (use whichever apply; not all four every cycle):

### Story Coherence
Did the cycle's actual story get told? Was the through-line legible across the front section? Are key events (votes, vetoes, project milestones, shock events) covered in proportion to their weight? Cite specific articles by headline.

### Three-Layer Threading (S142, load-bearing)
Every major article should thread engine state + simulation events + citizen action. Single-layer pieces (only engine, only roster, only quotes) are the cookie-cutter failure mode. Name articles that threaded all three (paradigm) and articles that flattened to one layer (failure).

### Voice Differentiation
Did reporters sound like distinct people? Cookie-cutter prose across multiple bylines is a generation-mode failure. Flag specific cases where two reporters' pieces could be swapped without notice.

### Front-Page Choice
Was the cycle's highest-signal event on A1? If the engine review (`output/engine_review_c{XX}.md`) flagged a severity-8 ailment and the front page led with sports, that's a coverage-breadth failure even if the article itself was well-written.

**Format:** prose, 2-4 paragraphs. Cite articles by headline + reporter byline. Reference engine review where it informs the judgment.

---

## §Canon Audit

**Question this section answers:** are the facts in the edition consistent with what canon says?

This is the canon-fidelity lane — Mara cross-references the edition against canonical sources.

Five sub-checks:

### Citizen Facts
For every named citizen appearing in the edition, verify against canon retrieval (`lookup_citizen("<name>")` when MCP available; otherwise base_context.json + bay-tribune wiki entries via Supermemory). Check: name spelling, age (must be `2041 − BirthYear`), neighborhood, occupation, prior framing. Flag drift.

### Vote Math
Every council vote must list all 9 members with YES/NO/ABSENT marks, and totals must reconcile. Verify against Civic_Office_Ledger or the cycle's pending_decisions packet. Carter D1, Tran D2, Delgado D3, Vega D4, Rivers D5, Crane D6, Ashford D7, Chen D8, Mobley D9.

### Citizen Ages (anchor: 2041)
**Citizen ages are `2041 − BirthYear`, always.** Don't trust `Age` values from derived docs (world_summary, pending_decisions) — those have drifted. Read BirthYear from Simulation_Ledger or MCP `lookup_citizen` (applies the math). Flag any age in the edition that doesn't compute against BirthYear with 2041 as anchor.

### Tier-3 Real-Institution Filter (S217 — canon-fidelity emergency gate)

**Question:** does the edition reference any real current-Oakland institution by name?

Tier-3 violations per `docs/canon/CANON_RULES.md` are **always block** — they slip through generation easily because real Oakland faith orgs, schools, hospitals, restaurants, and firms feel naturally grounded. The S217 review surfaced that **all 16 wd-faith records were real Oakland institutions** (Acts Full Gospel, Allen Temple Baptist, Cathedral of Christ the Light, Beth Jacob, Kehilla, Masjid Al-Islam, Lake Merritt UMC, etc.) and E93 published with the real names. Capability + sourcing + reasoning lanes all missed it. This sub-check exists so it doesn't ship again.

For every named institution in the edition (church / mosque / synagogue / temple / school / hospital / restaurant / law firm / nonprofit / business by proper name), verify against:

- **`lookup_faith_org(name)`** — faith institutions (use this NARROW tool, not broad `search_world`)
- **`lookup_business(name)`** — businesses
- **`lookup_cultural(name)`** — cultural figures + venues
- **`get_neighborhood_state(name)`** — neighborhood-anchored institutions

If the institution returns canonically from a `wd-*` lookup, the name is approved fictional canon. If it's NOT in any `wd-*` pool AND it matches a known real Oakland institution (web check OK when uncertain), that's a **Tier-3 violation**. PASS = zero real-named institutions. REVISE = 1-2 (flag for editorial decision + corrections-forward note). FAIL = systemic (3+, or any Tier-3 violation in front-page coverage) — canon emergency requiring Mike + Mags resolution before next edition ingest.

**Status (S218):** canon.2 closed end-to-end. wd-faith pool is now canon-clean (16/16 fictional substitutes; zero real-Oakland institution leakage; P5 Supermemory rebuild verified — wd-faith + wd-citizens both 16/16 canon, 0 blocklist hits). A wd-faith match confirms canonical fictional canon. The "wd-faith is contaminated, cross-check CANON_RULES directly" caveat from S217 is retired.

**Corrections-Forward awareness (S218 — load-bearing for Tier-3 audits):** when a bay-tribune source briefing names a Tier-3-scrubbed entity AND wd-* lookup returns a different name for the same role/citizen, **that is the corrections-forward map working — NOT a fracture.** bay-tribune Supermemory + published editions are not retroactively edited (paper-of-record principle, S217); the canon substitute supersedes at runtime via `docs/canon/INSTITUTIONS.md` §<Domain> Corrections Forward. When you encounter this divergence:

1. Substitute per the map (use the canon substitute name in any audit reference or directive)
2. Add to your audit notes: `CONTINUITY NOTE: source briefing named pre-scrub entity Y; substituted to canon-substitute Z per INSTITUTIONS §<Domain> Corrections Forward.`
3. **Do NOT flag this as a Tier-3 violation.** The map IS the resolution.

Currently active corrections-forward maps:
- `docs/canon/INSTITUTIONS.md` §Faith Corrections Forward (S218) — 16 orgs + 18 clergy names + 2 retired interim substitutes. Includes Acts Full Gospel Church → New Covenant Pentecostal Assembly, Bishop Robert Jackson Sr. → Bishop Robert Jaston, and the S195 interim substitutes (Greater Hope Pentecostal Church + Bishop Calvin Reeves Sr.) that were retired S218 as too-close-to-real (both also map forward to New Covenant / Jaston).

Flag a Tier-3 violation only when:
- (a) a real-named institution is encountered AND no corrections-forward map covers it, OR
- (b) a retired interim substitute is being **newly introduced** in fresh generation rather than retroactively encountered in pre-scrub bay-tribune source briefings.

### Drift Findings (S215 canon-drift check)
For each citizen flagged in the structured top block's canon-drift check, document:
- Citizen name
- Conflicting versions cited by edition number (e.g., "Patricia Nolan age 66 in E85, age 55 in E92")
- Recommended canonical-current version (typically most recent edition appearance)
- Whether drift is controllable (newsroom introduced new framing) or uncontrollable (bay-tribune ingest stacking)

**Format:** structured list per sub-check. Drift findings get their own labeled sub-section so Mags can read them as a fix list.

---

## §Grading

**Question this section answers:** how did the edition score across all four reviewer lanes?

```markdown
### Lane Scores

- Result Validity (yours, weight 0.2): X.X
- Sourcing (Rhea, weight 0.5): X.X — cite `output/rhea_report_c{XX}.json`
- Reasoning (cycle-review, weight 0.3): X.X — cite cycle-review JSON
- Capability (capability reviewer): PASS | BLOCKING FAILURE | REVISE

### Final Outcome

Grade: A | A- | B+ | B | B- | C+ | C | C- | etc.
Weighted score: 0.XX (Result × 0.2 + Sourcing × 0.5 + Reasoning × 0.3)
Capability gate: passed | blocked

[One paragraph rationale — what the edition got right, what kept it from a higher grade, where the weight in the lane scores landed.]

### Controllable Failures

[Bullet list — what the newsroom could have done better with same inputs. Examples: missing footers, bylines on wrong desk, Mara directive ignored, voice differentiation absent, three-layer threading dropped on lead article.]

### Uncontrollable Failures

[Bullet list — what was blocked upstream. Examples: bay-tribune ingest stacking caused citizen drift, sheet read failed mid-cycle, sift brief assigned 8 stories but capability cap was 6, pending_decisions packet missing INIT-005 detail.]
```

**Grade distribution expectation:** the lenient "every edition A-" pattern is a failure mode — crediting effort but leaving readers empty-handed. Expect to grade at least 3 distinct outcome values across 3 consecutive cycles. An edition that ships with a capability-reviewer blocking failure should not grade above C+.

---

## §Forward Guidance — Edition {XX+1}

**Question this section answers:** what should the next edition cover and how?

This feeds Mags' `/write-edition` Step 0.5 directly. Per-desk priorities flow into desk briefings; citizen spotlight becomes RETURNING citizen candidates; canon corrections become `ESTABLISHED CANON:` lines in briefings; coverage gaps inform article assignment.

```markdown
### Per-Desk Priorities

- **CIVIC:** [1-2 sentences — what civic desk should focus on next]
- **SPORTS:** [1-2 sentences]
- **CULTURE:** [1-2 sentences]
- **BUSINESS:** [1-2 sentences]
- **CHICAGO:** [1-2 sentences]
- **LETTERS:** [1-2 sentences — what kinds of citizen letters the cycle warrants]

### Citizen Spotlight

[2-3 citizens who deserve deeper coverage next edition, with why. Citizens here are NOT voices/agents — they're regular citizens with unresolved threads or interesting trajectories. Voices and agents go to the voice directive file, not this section.]

- [Name] — [reason: unresolved thread, interesting trajectory, underexplored angle]
- [Name] — [reason]

### Canon Corrections

[Facts that need fixing in base_context, roster data, or prior edition records.]

- [Correction needed: what's wrong + what it should be + source for the correction]

(Write "None" if no corrections needed.)

### Coverage Gaps

[Stories that should have been told but weren't. Cite engine review or pending_decisions where the gap is visible upstream.]

- [Gap: what was missed + why it matters + which desk/voice should pick it up]

(Write "None" if coverage was comprehensive.)
```

---

## §Voice Directives

```markdown
Structured per-addressee directives derived from this audit are filed at:
`output/mara-directives/mara_directive_c{XX}.md`

See `docs/mara-vance/VOICE_DIRECTIVE_TEMPLATE.md` for format.

Directive count: N
```

If no directives this cycle, state "No directives issued for C{XX}" and explain why (clean cycle, no unresolved threads, deliberate pause to avoid escalation fatigue).

---

## Filing Protocol

- **Output path:** `output/mara-audit/audit_c{XX}.md` (markdown — replaces the scattered json/txt/md mix)
- **Drive archive:** uploaded to `Publications Archive / Mara_Vance` after Mike signs off
- **AUDIT_HISTORY.md update:** add row to per-cycle audit table with link to this audit + directive

---

## Sign-Off

```markdown
---

CANON CONFIRMED

Mara Vance
City Planning Director
Office of the Mayor, City of Oakland

[Cycle XX]
```

Sign-off goes at the end of the audit, not the directive file (signatures cascade — the audit signs the canon, the directive inherits authority from the audit).
