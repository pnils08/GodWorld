# Mara Audit — Cycle 94

<!-- CANONICAL EXEMPLAR — Mara result-validity-lane audit. ADR-0006 Contract A.
     Every Mara claude.ai run MUST emit a markdown file whose structured top block
     matches the form below exactly. scripts/maraJsonReport.js is authoritative; this
     exemplar mirrors its parseStructuredTop() regex requirements.

     CRITICAL FORMAT RULES (parser will fail otherwise):
     1. The H1 header must match `^# Mara Audit — Cycle N` (em-dash or hyphen accepted; cycle is integer).
     2. EXACTLY THREE check lines (NOT four). Labels are case-insensitive but must match the regex anchor:
        - Completeness
        - Gave-up detection
        - Coverage breadth
     3. Verdict on each check line is one of: PASS | REVISE | FAIL.
     4. Optional `score N/M` and `N flags` substrings are parsed for numeric extraction; both
        are optional but RECOMMENDED for human-readable detail.
     5. The four `## ...` lines below the checks (Process score / Outcome / Controllable / Uncontrollable)
        are REQUIRED. Missing any → parser exit 2.
     6. Process score formula: passedCount / 3 (NOT /4 — the parser counts 3 checks).
        Your math here is informational; the parser recomputes process = passedCount / 3.
     7. After the structured top, write any narrative sections you want (§Reader Audit,
        §Canon Audit with sub-checks, §Grading, §Forward Guidance, etc.) — those are
        narrative, not parsed.

     VALIDATION (before pasting your audit back from claude.ai):
       node scripts/maraJsonReport.js --md output/mara_audit_c<XX>.md
     Exit 0 = parsed; exit 2 = structured top malformed (parser prints what's missing).

     PIPELINE.27 (S225): shipped to close G-W55 (Mara audit format vs maraJsonReport.js
     parser mismatch — 3 manual reformats per cycle). Math drift "/4 → /3" + "all four
     checks → all three checks" corrected in CLAUDE_AI_SYSTEM_PROMPT.md + AUDIT_TEMPLATE.md.
     See docs/plans/2026-05-22-c94-gap-log-triage.md §3 C5.
-->

## Lane scores

- Completeness: PASS — score 9/10 — every sift-assigned story shipped; one revise on N1 angle freshness
- Gave-up detection: PASS — 0 flags — no articles hand-waved data with "more reporting needed" framing
- Coverage breadth: REVISE — score 6/10 — sports + civic balanced but cultural under-weighted vs engine signal

## Process score: 0.667
## Outcome: 0
## Controllable failures: coverage-breadth
## Uncontrollable failures: none

---

## §Reader Audit

[Reader-facing audit narrative — what would a citizen reading this edition learn, miss, find dramatic, find boring. Free-form prose. Not parsed.]

E94 reads as cohesive Town-ownership-spine plus civic round-up. Carmen's C1 vote piece carries the load on civic; Maria's N1 captures the Adams Point reopening with named witness. Cultural texture thin — no music / arts / food piece this cycle despite engine producing 5 cultural events. Sports recap solid via Hal Richmond's Kelley piece; Mike Paulson-Varek-Oaks-GM spine threads correctly through Jordan Velez front-page lede.

## §Canon Audit

Per S217 4th-check expansion. Five sub-checks:

1. **Citizen continuity:** All E94 named citizens cross-reference correctly against wd-citizens (Beverly Hayes POP-00772, Varek POP-00789, et al.). One drift caught: Soria Dominguez appears as "Elena" in C1 but canon-card uses "Eloise" — flag to engine-sheet for canonical-name lock.
2. **Initiative state:** Transit Hub vote 8-0-1 matches Initiative_Tracker post-cycle state. INIT-006 Baylight phase advancement consistent across coverage.
3. **Vote math:** Carmen's C1 reports 8-0 but doesn't enumerate the 9 individual votes / 1 absentee. Material gap — readers can't verify which member abstained.
4. **Real-name leak (Tier-3 filter, S217):** Zero hits against REAL_NAMES_BLOCKLIST.md. Faith canon clean.
5. **Cross-cycle promise tracking:** E93 Mara directive on Mark Aitken contract follow-up — E94 sports-desk did not return to it; P Slayer's piece names the debt explicitly which I count as graceful acknowledgment.

## §Grading

| Domain | Rating | Notes |
|--------|--------|-------|
| Civic | A- | Vote roster gap on Carmen C1 keeps this below A |
| Sports | B+ | Kelley + Paulson spine works; Aitken debt named not closed |
| Culture | C+ | Under-represented vs engine signal; thin |
| Neighborhood | B | Adams Point reopening solid; Fruitvale + Lake Merritt thin |
| Overall | B+ | Cohesive spine, under-weighted cultural section, vote-roster gap |

## §Forward Guidance for C95 sift

- OARI vote architecture should anchor front-section spine in C95
- Martin Richards dedicated piece needed (named debt per E94 P Slayer)
- Oaks expansion draft Pick #5 storyline opens
- Every vote ships full 9-member roster + named absentee (hard rule going forward)
- wd-card canon corrections route engine-sheet: Soria Dominguez name lock; verify Aitken POP-00003/00020 dual-ID

## §Voice Directives pointer

`output/mara-directives/mara_directive_c95.md` — to be drafted post-audit.
