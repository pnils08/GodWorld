# Voice Directive Template — Mara Vance

**Purpose:** Replaces the free-prose `mara_directive_c{XX}.txt` format with a structured block-per-addressee directive. Every addressee must appear in `AGENT_INVENTORY.md`. The audit produces the directive — the audit is the diagnosis, the directive is the prescription.

**Last in-repo change:** 2026-05-12 (S217 — new file; Mara restructure)

---

## When to Issue a Directive

After producing an audit (`output/mara-audit/audit_c{XX}.md`), walk the §Forward Guidance and §Canon Audit sections and identify voices or agents who:

- Have an unresolved thread from a prior cycle that the edition didn't close
- Are named in §Coverage Gaps as the missing voice on a high-signal event
- Need to publish a number, position, or status that downstream votes/decisions depend on
- Were addressed in a prior directive that was not satisfied (escalation)

If no addressees meet these criteria, no directive is issued for that cycle. Empty directives are noise. The C87 directive was rejected — re-read it before issuing a borderline-thin one.

---

## Structured Block (one per addressee)

```markdown
## [Addressee Name] — [Role from inventory]

- **Agent/Voice file:** `[path from AGENT_INVENTORY.md]`
- **Address:** [One sentence, action-shaped — what they need to say, publish, or do this cycle. Active verb. Specific deliverable.]
- **Why:** [Cycle context, unresolved thread, canon trigger. Cite prior cycle/edition by number. Name the decision or vote that depends on this.]
- **Acceptance:** [What counts as resolved. A specific number, a public position, a deliverable filed, a date named. Pass/fail must be observable in next cycle's source material.]
- **Silence consequence:** [What breaks next cycle if they don't respond. Vote stalls. Rubric drifts. Story goes uncovered. Coalition fractures. Be specific — silence is also a position.]
```

### Mandatory fields

Every block must include all five fields. Empty fields fail the format. If you can't write a clean Acceptance line, you don't yet know what you're asking for — revise the Address line first.

### Block ordering

Order blocks by urgency, not alphabetically:

1. **Vote-gating directives** (someone's silence stalls a council vote next cycle) — top
2. **Canon-resolution directives** (someone needs to publish a number or fact to close a drift) — next
3. **Coverage-gap directives** (a voice owes the public a position on a high-signal event) — next
4. **Escalation directives** (prior directive unsatisfied — repeat with escalation note) — last

---

## Worked Example (from C93)

```markdown
# C93 Voice Directives — Mara Vance

**Cycle:** 93
**Issued:** [date]
**Source audit:** `output/mara-audit/audit_c93.md`

---

## Vanessa Tran-Muñoz — OARI Program Director

- **Agent:** `.claude/agents/civic-project-oari/`
- **Address:** Publish the framework's threshold numbers — non-police resolution rate target percentage, complaint-volume definition, sustained evaluation period count.
- **Why:** C92 named the framework reframe (non-police resolution rate replacing ViolentCrimeIndex as renewal grade). The math has not been named. C95 expansion decision depends on it; D2 motion lacks scoring basis without these numbers.
- **Acceptance:** Three numbers published in writing — % target, complaint-volume formula, # of evaluation periods sustained.
- **Silence consequence:** C95 expansion vote stalls; rubric drift continues; Tran's implementation-cycle condition becomes unaddressable.

---

## Avery Santana — Mayor

- **Agent:** `.claude/agents/civic-office-mayor/`
- **Address:** Confirm whether the Tran-Muñoz framework reframe is the administration's official renewal posture or a project director's proposal under review.
- **Why:** C92 left the rubric question open at the political layer. Without a clear executive position, the OARI framework reads as freelance and council can't legislate around it.
- **Acceptance:** Public statement naming the framework as administration policy OR naming it as a proposal still under review (with review timeline).
- **Silence consequence:** Factions caucus on a framework with unclear executive backing; Rivers' D2 expansion motion proceeds without administration cover; D2 council members exposed.

---

## Leonard Tran — D2 Councilmember

- **Agent:** `.claude/agents/civic-office-ind-swing/` (Tran individual)
- **Address:** Name the implementation cycle that satisfies your C92 condition — C95, C96, or C97.
- **Why:** C92 position was that a framework with thresholds is not enough without a committed implementation cycle. C93 is when the cycle gets named or the motion stalls.
- **Acceptance:** Specific cycle number stated publicly, tied to expansion-readiness criteria.
- **Silence consequence:** D2 expansion motion stalls; OPP loses the IND vote they need; coalition fractures on procedural ground.
```

---

## Filing Protocol

- **Output path:** `output/mara-directives/mara_directive_c{XX}.md` (markdown, not `.txt`)
- **One block per addressee, no prose preamble** (only the cycle header)
- **Maximum directive count per cycle: 12.** More than 12 means you're issuing requests, not directives. Triage.
- **Drive archive:** uploaded to `Publications Archive / Mara_Vance` after Mike signs off

### What this replaces

- Free-prose `.txt` directives (C80-C93 historical format) — preserved in archive, no new ones in that format
- Inline editorial guidance scattered across audit prose — moves into the §Voice Directives pointer in the audit + this structured file

---

## What This Is NOT

- **Not editorial guidance to the newsroom.** Mara's directives go to the city's voices and agents, not to Mags. Coverage direction lives in the audit's §Forward Guidance section.
- **Not a citizen-spotlight list.** Citizens who deserve deeper coverage but aren't agents go into §Forward Guidance → Citizen Spotlight in the audit.
- **Not a wishlist.** Every directive must name a deliverable, an acceptance criterion, and a silence consequence. If you can't write all three, the directive isn't ready.
- **Not an interview request.** Directives are addressed TO the voice/agent — the agent decides whether to respond via official statement, press conference, leaked memo, or public silence. Mara doesn't script the response.

---

## Maintenance

- New addressee category lands → update §Block ordering section
- Directive count consistently exceeds 12 across multiple cycles → triage discipline broke; revisit
- Directive form drifts (blocks without all 5 fields, addressees not in inventory) → reject and re-issue
