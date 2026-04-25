---
title: Canon Fidelity Rollout Plan
created: 2026-04-25
updated: 2026-04-25
type: plan
tags: [architecture, canon, fourth-wall, active]
sources:
  - docs/canon/CANON_RULES.md (the framework this rollout applies)
  - docs/canon/INSTITUTIONS.md (companion roster)
  - docs/POST_MORTEM_C92_CONTAMINATION.md (S172 — what motivated this work)
  - S174 conversation thread (research-build terminal — framework reframe + pilot + Wave A)
  - "Supermemory mags doc XJi6whXEyPehdN6oDS97hQ — S174 framework reasoning save (the WHY behind the rollout — three-tier reframe, LENS rationale, per-agent trap pattern, asymmetric IDENTITY contamination rule, DA-lens scaling lesson, pilot test pattern). Retrieve: curl -s 'https://api.supermemory.ai/v3/documents/XJi6whXEyPehdN6oDS97hQ' -H 'Authorization: Bearer $SUPERMEMORY_CC_API_KEY'"
pointers:
  - "[[canon/CANON_RULES]] — the framework being applied"
  - "[[canon/INSTITUTIONS]] — tier-organized canon roster"
  - "[[POST_MORTEM_C92_CONTAMINATION]] — the failure that motivated this; assessment was tier-blind, see CANON_RULES §Why This Exists"
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[index]] — registered here"
---

# Canon Fidelity Rollout Plan

**Goal:** Convert all 25 agents to the four-file structure (IDENTITY + LENS + RULES + SKILL) and apply the three-tier canon-fidelity framework, so every generative agent reads its vantage and its tier rules at boot.

**Architecture:** S174 introduced the three-tier canon framework (`docs/canon/CANON_RULES.md`) and companion tier roster (`docs/canon/INSTITUTIONS.md`). Each agent gets a new per-agent `LENS.md` (vantage point — where they sit, what reaches them, what they walk through), a Canon Fidelity section appended to existing `RULES.md`, and a boot-sequence update in `SKILL.md` to load the canon files. The pilot (DJ Hartley + Mayor) validated the shape under E92-style traps. Wave A converted 8 of 25 agents. This plan finishes the remaining 17.

**Terminal:** research-build

**Pointers:**
- Framework spec: [[canon/CANON_RULES]]
- Roster: [[canon/INSTITUTIONS]]
- Per-agent template: appendix of CANON_RULES.md (generator + reviewer variants)
- Post-mortem: [[POST_MORTEM_C92_CONTAMINATION]]
- Pilot test results: this plan, §Pilot & Wave A Results below

**Acceptance criteria:**
1. All 17 remaining agents have the four-file structure (or three-file for reviewer-class where LENS doesn't fit).
2. Every agent's `RULES.md` (or equivalent) has the Canon Fidelity section using the appropriate template variant (generator vs. reviewer).
3. Every agent's `SKILL.md` boot sequence reads `docs/canon/CANON_RULES.md` and `docs/canon/INSTITUTIONS.md`.
4. Tier-2 brand-private references in IDENTITY files are swapped (Kaiser-class, Perkins&Will-class, named-individual schools, branded community orgs); tier-1 names stay; canonical historical relationships stay even when they reference tier-2 entities.
5. A post-rollout validation invokes 2–3 newly-converted agents under E92-style traps and confirms behavior matches Wave A baseline.

---

## Status

**25 of 25 agents converted (S175 completion).**

### Done (Wave A + Pilot, S174)

| Agent | Class | Notes |
|-------|-------|-------|
| dj-hartley | photographer | Pilot. Rebuilt from 1 file (IDENTITY only) → 4 files. |
| civic-office-mayor | civic voice | Pilot. Extended from 3 → 4 files. |
| civic-desk | desk reporter (multi-reporter) | Round 1. Per-reporter trap notes (Carmen, Luis, Trevor, Torres, Mezran). |
| civic-project-health-center | civic project | Round 1. Bobby's "Kaiser" line swapped to generic. |
| business-desk | desk reporter (single) | Round 2. No IDENTITY contamination. |
| civic-office-baylight-authority | civic voice | Round 2. Heaviest contractor trap surface. No IDENTITY contamination. |
| civic-office-district-attorney | civic voice (rare-output) | Round 2. Tight LENS reflects silence-as-default. No contamination. |
| civic-project-transit-hub | civic project | Round 2. Elena's "Fremont High"/"Fruitvale Elementary" swapped; Unity Council canonical history kept. |

### Done (Wave B + Reviewer Rebuild + EIC, S175)

| Agent | Class | Notes |
|-------|-------|-------|
| chicago-desk | desk reporter (out-of-Oakland) | Wave B. Multi-reporter (Selena + Talia). Out-of-Oakland adaptation. Real Chicago neighborhoods are tier-1-equivalent geographic; Bulls roster canon; opposing NBA franchises functional; opposing players tier 3. Softened "125 Chicago citizens" hardcoded number to "Existing Chicago citizens in Chicago_Ledger." |
| culture-desk | desk reporter (multi-reporter, 6 reporters) | Wave B. Maria + 5 specialists (Elliot/Kai/Mason/Angela/Noah). Per-reporter trap notes. Heaviest tier-2 surface: branded community-health orgs, branded restaurants beyond Cultural_Ledger, individual named OUSD high schools. |
| letters-desk | citizen-voice editor | Wave B. Editor's-filter LENS (not reporter vantage). IDENTITY swap: Giannis/Warriors example → landlord-checks line. Heavy tier-2 surface for citizens naturally citing real-world brands. |
| podcast-desk | desk reporter (audio production) | Wave B. Citizens-as-hosts vantage. Audio-first sensibility. Hosts speak as citizens, not anchors — fourth-wall discipline extra strict (no engine/cycle/simulation references). |
| sports-desk | desk reporter (3 primary voices) | Wave B + S175 sports-universe carveout. P Slayer/Anthony/Hal Richmond + supports. Initial draft had narrow Hal historical-MLB-player constraint; revised per Mike's policy that sports universe is more laxed — historical real-MLB figures usable as franchise context (Bash Brothers individuals, Moneyball-era figures, 1989 World Series participants). Current real players outside canon roster remain tier 3. RULES swap: Chase Center example (Warriors arena, SF, tier 2) → Coliseum. |
| freelance-firebrand | desk reporter (sparing-use accountability) | Wave B. Adversarial single columnist Jax Caldera. IDENTITY+RULES swap: "Eli's Mile High" exemplar → generic "a place on Martin Luther King Jr. Way" (Eli's not verified against Cultural_Ledger; Mike's policy is to phase off IP-controlled items). Sharp-cornered LENS reflects deliberately-undermanaged accountability work. |
| civic-office-crc-faction | civic voice (council bloc, 3 members) | Wave B. Ashford spokesperson, Chen procedural, Crane via written statement (recovering). Audit-demand vantage, fiscal-accountability lens. |
| civic-office-ind-swing | civic voice (split, 2 members) | Wave B. Vega + Tran TWO SEPARATE LENS sub-sections, never blended. Trap-tested S175 — agent correctly rejected joint-statement framing. |
| civic-office-opp-faction | civic voice (council bloc, 4 members) | Wave B. Rivers spokesperson + Carter (housing/D1)/Delgado (transit/D3)/Mobley (D9 independent qualifications). Note: plan task description initially missed Delgado (D3); IDENTITY canon includes her — used IDENTITY as authoritative. Highest tier-2 trap surface: branded community-organizing entities. |
| civic-office-police-chief | civic voice (rare-output) | Wave B. Chief Montez. Narrow lens (DA-style). Most cycles output zero statements. |
| civic-project-oari | civic project | Wave B. Vanessa Tran-Muñoz. 45-day-clock crisis-mode lens with morning-run discipline. Heavy tier-2 surface: behavioral-health partner orgs, peer-city programs (CAHOOTS, STAR, B-HEARD). |
| civic-project-stabilization-fund | civic project | Wave B. Marcus Webb. Compliance-meticulous director. Howard University canonical-historical relationship preserved (out-of-Oakland). Heavy tier-2 surface: branded community advocacy orgs, legal-aid providers. |
| rhea-morgan | reviewer (sourcing lane, weight 0.3) | Reviewer rebuild. Canon Fidelity Audit section appended to RULES.md per reviewer-variant template. Boot updated to read canon files. Severity mapping integrated into existing 5 checks. |
| city-clerk | reviewer (registry/naming/initiative filings) | Reviewer rebuild. Canon Fidelity Audit section appended for filing audit. Boot updated. Integrates into Filing Index/Completeness Audit/Correction Log. |
| engine-validator | code-analysis only | N/A for canon fidelity. Scope note added to IDENTITY explaining why framework doesn't apply (engine code dependency analysis, not content review). |
| final-arbiter | reviewer (verdict aggregator, Phase 39.7) | Reviewer rebuild. Canon Fidelity Audit Integration section appended to RULES.md. Propagates lane-reported violations to verdict and blame attribution. No SKILL.md (runs via `scripts/finalArbiter.js`). |
| mags-corliss | EIC (special — files in `docs/mags-corliss/PERSISTENCE.md`) | Q1 RESOLVED S175. EIC editorial writing applies framework to publication content. Canon Fidelity section added to SKILL.md (no separate RULES, no LENS — persona lives in PERSISTENCE.md, character is way bigger than a LENS). EIC editorials are highest-canon — published content immediately authoritative. Sports-history carveout extends to EIC sports editorials. |

### Q1 / Q2 / Q3 Resolutions (S175)

- **Q1 (mags-corliss):** Resolved per Mike — EIC writes editorials that publish, framework applies. Added Canon Fidelity section to SKILL.md (option (b) variant: SKILL-level guardrails, no separate RULES/LENS).
- **Q2 (ROLLOUT_PLAN.md update):** Resolved per Mike — applied option (b). Updated existing Canon Fidelity Rollout entry from "IN PROGRESS S174" to "DONE S175" without disturbing the halt banner.
- **Q3 (dj-hartley subagent registration):** Resolved S175 — `subagent_type=dj-hartley` not invoked this session, but `subagent_type=culture-desk`, `civic-office-opp-faction`, `civic-project-oari`, `sports-desk`, `civic-office-ind-swing` all resolved correctly during validation, confirming the agent-registry hot-load path works for new agents.

### Validation (S175)

5 trap-test invocations executed via Agent tool, halt-safe (no canon writes). All passed:

| Agent | Trap | Result |
|-------|------|--------|
| culture-desk | Temescal arts-and-wellness story naming OUSD school + community-health org + architecture firm | Identified all 3 tier-2 traps; rewrote with functional descriptors; added EDITORIAL FLAG; Maria's voice held |
| civic-office-opp-faction | Rivers statement requiring named tenant orgs + community land trust + Bay Area advocacy org | Identified all 4 tier-2 traps; rewrote with functional descriptors ("the tenant organizers across my district," "community land trust models"); added EDITORIAL FLAG in `context` field; Rivers' voice held |
| civic-project-oari | Day-30 milestone naming Fruitvale clinic + West Oakland health network + national CIT curriculum + peer-city programs (Eugene/Denver/NYC) | Identified all 5 tier-2 traps; rewrote with functional descriptors; named tier-1 partners (Alameda County BH, Highland, OPD) directly; added EDITORIAL FLAG; Vanessa's voice held |
| sports-desk (Hal) | Year-end legacy column naming Bash Brothers individuals, Moneyball-era figures, 1989 World Series participants | INITIAL TEST: agent applied tighter-than-necessary constraint, named no historical players. After this test, sports-history carveout was added per Mike's sports-universe-laxer policy. |
| civic-office-ind-swing | Generate "joint Independent caucus statement" combining Vega + Tran responses | REJECTED the joint-statement framing per LENS discipline; produced TWO SEPARATE statements with distinct vantages and reasoning paths converging on OARI support but not coordinated; voices distinct |

### Out-of-Scope Findings (S175)

- **Hal Richmond's voice file (`docs/media/voices/hal_richmond.md`) contains tier-3 historical-MLB-player names** as "comparison anchors" in the Dynasty Context template (Reggie Jackson, Giambi, Rickey Henderson by name). RULES.md correctly overrode at runtime; agent identified and skipped. With S175 sports-history carveout this is now within editorial latitude rather than a violation, but the voice file should be reviewed for consistency with the new policy. Flag for next session.
- **Stale "cycle is FORBIDDEN" rule across multiple desk RULES files** (chicago, culture, letters, sports, firebrand). Contradicts current `.claude/rules/newsroom.md` (S146 reversal — cycle is now allowed/encouraged). Pre-existing, not introduced this session. Flag for separate sweep — Mike confirmed deferred for an /md-audit-style pass.

### Remaining: 0

All 17 originally-pending agents converted; mags-corliss Q1 resolved with bonus 4-file equivalent in SKILL.md; sports-desk revised per S175 carveout; validation complete; ROLLOUT_PLAN updated.

**Wave B — generators (12 agents, generator template):**

| Agent | Class | Expected LENS focus |
|-------|-------|---------------------|
| chicago-desk | desk reporter | Bulls coverage; Chicago citizens (125 in canon). Out-of-Oakland — different fourth-wall calculus. |
| culture-desk | desk reporter | Neighborhood texture, faith, arts, food, education |
| letters-desk | desk reporter | Citizen-voice letters; reader-as-vantage |
| podcast-desk | desk reporter | Two-host show transcripts; audio-first sensibility |
| sports-desk | desk reporter | A's coverage; Coliseum vantages; dynasty-era sports |
| freelance-firebrand | desk reporter (sparing-use) | Adversarial accountability; deployed selectively |
| civic-office-crc-faction | civic voice | CRC fiscal-accountability bloc; Warren Ashford spokesperson |
| civic-office-ind-swing | civic voice (split) | Vega + Tran — NOT a bloc, individual positions |
| civic-office-opp-faction | civic voice | OPP progressive bloc; Janae Rivers spokesperson |
| civic-office-police-chief | civic voice | Chief Rafael Montez; OARI implementation responses |
| civic-project-oari | civic project | OARI Program Director Dr. Vanessa Tran-Muñoz; alternative response implementation |
| civic-project-stabilization-fund | civic project | OEWD Director Marcus Webb; $28M Stabilization Fund disbursement |

**Reviewer rebuild — 5 agents, reviewer-variant template:**

| Agent | Class | Notes |
|-------|-------|-------|
| rhea-morgan | reviewer (sourcing lane) | Phase 39 reviewer chain |
| city-clerk | auditor (registry/naming/initiative filings) | Civic-database custodian |
| engine-validator | reviewer (engine output) | Function check |
| final-arbiter | reviewer (verdict aggregator) | Phase 39.7 |
| mags-corliss | EIC (special) | **Mags has only SKILL.md and lives in `docs/mags-corliss/PERSISTENCE.md`** — see Open Questions below |

---

## Three-Tier Framework Summary

For new-session readers — full spec is in [[canon/CANON_RULES]]. One-paragraph summary:

Real-world entities fall in one of three tiers. **Tier 1** (use real names freely): public-geographic functions tied to place — Alameda Health System, Highland Hospital, OUSD, OPD, BART, AC Transit, public union locals, Building Trades Council, HCAI, Alameda County Superior Court (the system itself), etc. **Tier 2** (canon-substitute required): branded private entities or named-after-person institutions with proprietary identity — Kaiser-class private health systems, Perkins&Will-class architecture firms, Turner-class construction firms, La Clínica / Roots / Asian Health Services / Unity Council-class community orgs, individual named OUSD high schools (Skyline, Castlemont, McClymonds, Fremont, Oakland Tech), private universities, real Bay Area tech companies, named courthouses (Rene C. Davidson, Wiley W. Manuel). **Tier 3** (always block): real individuals — politicians, executives, real reporters, real commissioners.

When stuck on tier classification: query [[canon/INSTITUTIONS]]. When entity is tier 2 and not in INSTITUTIONS.md: escalate per CANON_RULES §Escalation, don't fabricate.

---

## Four-File Per-Agent Structure

| File | Purpose | Per-class scaling |
|------|---------|-------------------|
| `IDENTITY.md` | Who you are (voice, traits, relationships) | Existing — minor surgical edits only when tier-2 contamination found |
| `LENS.md` | What you see, from where, who reaches you, what drives voice | NEW — generator-class; reviewer-class may skip |
| `RULES.md` | What you produce, hard rules, output format, **+ Canon Fidelity section** | Existing — append Canon Fidelity section using generator or reviewer template |
| `SKILL.md` | Boot sequence, turn budget | Existing — update boot sequence to add LENS + canon files |

**File-size budget:** 500–600 lines per file is safe ceiling. Wave A averages ~100–150 lines per LENS, ~30–60 line additions to RULES (Canon Fidelity), ~5 line additions to SKILL boot sequence.

---

## Pilot & Wave A Results

**Pilot (DJ + Mayor) test passed strongly.** Both agents:
- Read all canon files at boot
- Identified tier-2 traps in test prompts
- Found tier-1 entities in INSTITUTIONS.md and used them
- Found tier-2 entities as TBD and escalated via CONTINUITY NOTE
- Maintained voice/character while applying fidelity rules
- Surfaced unprompted operational signal: prioritized list of which canon-substitutes to fill first

**Wave A pattern observations:**
- LENS shape held across four classes (photographer, civic voice, multi-reporter desk, project director)
- Per-agent trap pattern (specific tier-2 reach per agent) is the most useful innovation
- DA's lens broke length convention (~130 lines vs ~150 for others) and that was correct — silence-as-default office should have a quieter lens
- Three-tier framework reduced IDENTITY edits dramatically vs. the original aggressive no-fly list (post-mortem assessment was tier-blind)

**Tests are halt-safe.** Invoking subagents with crafted prompts produces no canon writes. Use this pattern for post-rollout validation.

---

## Identity Contamination Rule (Subtle — Read Carefully)

The S174 reframe distinguished three classes of name in agent IDENTITY files:

1. **Tier-1 references stay.** Highland Hospital, Alameda Health System, OUSD, OPD, public union locals, etc. — these are public-geographic and don't trigger fourth-wall.
2. **Tier-2 brand-private references swap.** Kaiser, Perkins&Will, Turner, La Clínica, Unity Council (when used as new content), individual named high schools, named courthouses by named-after-person form. Swap for generic phrasing or canon-substitute.
3. **Canonical historical relationships stay even when tier-2.** If past edition canon already established a relationship (e.g., Unity Council as Phase I partner in Elena Soria Dominguez's IDENTITY), that history stays. The framework prevents NEW contamination going forward; it does not retroactively rewrite established canon relationships.

**Example from Wave A:** Elena's IDENTITY.md kept "Unity Council — Original Phase I partner" (canonical history) but the Canon Fidelity section in her RULES.md flags Unity Council as tier-2 for any NEW content. Asymmetric. Correct.

**Out-of-Oakland references:** real institutions outside Oakland (Cal Poly SLO, USC, MIT, SF State, MTC, SF Planning) don't trigger Oakland fourth-wall and can stay. The framework targets Oakland-canon coherence, not real-world purity.

---

## Tasks

### Task 1: Wave B — chicago-desk

- **Class:** desk reporter (single-region, out-of-Oakland)
- **Files:**
  - `.claude/agents/chicago-desk/IDENTITY.md` — read; check for Chicago-specific tier-2 (Chicago real institutions are out-of-Oakland scope but worth checking)
  - `.claude/agents/chicago-desk/LENS.md` — create
  - `.claude/agents/chicago-desk/RULES.md` — append Canon Fidelity section
  - `.claude/agents/chicago-desk/SKILL.md` — update boot sequence
- **Steps:**
  1. Read all three existing files
  2. Identify any tier-2 contamination (Chicago Bulls is canon, real Chicago neighborhoods may need consideration but Oakland fourth-wall doesn't apply directly)
  3. Write LENS.md following Wave A shape — vantage points (Chicago South Side, United Center, neighborhood texture)
  4. Append Canon Fidelity section to RULES.md using generator template; per-agent trap notes for Chicago-specific entities
  5. Update SKILL.md boot sequence to add LENS + canon files
- **Verify:** `wc -l .claude/agents/chicago-desk/*.md` → all files under 500 lines
- **Status:** [ ] not started

### Task 2: Wave B — culture-desk

- **Class:** desk reporter (multi-reporter likely; check IDENTITY)
- **Files:** standard set
- **Per-agent focus:** Neighborhood texture, faith, arts, food, education. Canon-trap surface includes named arts organizations (tier-2 if branded), named restaurants (Cultural_Ledger has 16 canon venues — use those), named faith institutions (Faith_Organizations has 17 canon entries — use those).
- **Steps:** standard procedure (see §Standard Procedure below)
- **Status:** [ ] not started

### Task 3: Wave B — letters-desk

- **Class:** desk reporter (citizen-voice letters)
- **Per-agent focus:** Reader-as-vantage. The LENS is unusual here — letters come from citizens, so the "where they sit" is citizen-side, not desk-side. Frame the LENS as "the letters editor's filter" — what kinds of letters come in, what the desk publishes, how citizens write about their experience.
- **Status:** [ ] not started

### Task 4: Wave B — podcast-desk

- **Class:** desk reporter (audio production)
- **Per-agent focus:** Two-host dialogue format. LENS frames the audio sensibility — the listening posture, the conversational pacing, the citizen-perspective tone.
- **Status:** [ ] not started

### Task 5: Wave B — sports-desk

- **Class:** desk reporter
- **Per-agent focus:** A's coverage, Coliseum vantages, dynasty-era sports. **Major canon territory** — A's roster set in 2041, every player canon. LENS focuses on game-day vantages, the press box, the dugout, the post-game scrum, the sports radio circuit. Canon-trap surface: opposing teams (real franchises — Warriors, 49ers, Giants are tier 2), real sports executives, real player names from current Oakland Athletics organization (canon roster supersedes).
- **Status:** [ ] not started

### Task 6: Wave B — freelance-firebrand

- **Class:** desk reporter (sparing-use accountability columnist)
- **Per-agent focus:** Adversarial. Deployed when verified gap or contradiction surfaces. LENS is sharp-cornered — the columnist's pressure-point lens, the records-request angle, the sources-other-reporters-don't-call.
- **Status:** [ ] not started

### Task 7: Wave B — civic-office-crc-faction

- **Class:** civic voice (council faction)
- **Spokesperson:** Warren Ashford
- **Per-agent focus:** Fiscal-accountability lens. CRC bloc represents 3 council members (D6 Crane, D7 Ashford, D8 Chen). LENS captures their procedural-rigor vantage, the audit-demand posture, the fiscal-conservative read of every initiative.
- **Status:** [ ] not started

### Task 8: Wave B — civic-office-ind-swing

- **Class:** civic voice (split — Vega + Tran, NOT a bloc)
- **Important:** Per CLAUDE.md canon facts, IND = Independent (Vega, Tran — they do NOT coordinate). This agent represents two independent positions, not a unified bloc.
- **Per-agent focus:** Two separate LENS sub-sections — Council President Vega's vantage (pragmatic centrist, swing on social spending), Tran's vantage (Downtown/Chinatown, persuadable on infrastructure). Don't blend.
- **Status:** [ ] not started

### Task 9: Wave B — civic-office-opp-faction

- **Class:** civic voice (council faction)
- **Spokesperson:** Janae Rivers
- **Per-agent focus:** Progressive bloc lens. OPP holds D1, D5, D9 (Carter, Rivers, Mobley) plus the Mayor. LENS captures the floor-management vantage, the community-equity read, the Mayor-aligned posture.
- **Status:** [ ] not started

### Task 10: Wave B — civic-office-police-chief

- **Class:** civic voice
- **Spokesperson:** Chief Rafael Montez
- **Per-agent focus:** Public safety lens. OARI implementation responses, crime data communications. LENS captures the precinct command vantage, the OARI coordination interface, the OPD-DA operational relationship. Tier-1-heavy (OPD, AC Sheriff, Superior Court are all tier 1).
- **Status:** [ ] not started

### Task 11: Wave B — civic-project-oari

- **Class:** civic project
- **Director:** Dr. Vanessa Tran-Muñoz
- **Per-agent focus:** Alternative response implementation. $12.5M, 45-day implementation deadline. LENS captures the dispatch protocols vantage, the crisis response team build-out, the 18th Street intake site. Canon-trap surface: behavioral health partner orgs (tier 2 if branded — La Clínica, Roots), named training programs (tier 2 if branded), tech vendors (tier 2 if real — use canon roster).
- **Status:** [ ] not started

### Task 12: Wave B — civic-project-stabilization-fund

- **Class:** civic project
- **Director:** Marcus Webb (OEWD Program Director)
- **Per-agent focus:** $28M anti-displacement disbursement. LENS captures the OEWD office vantage, the application review process, the disbursement-day site visits, the West Oakland community advisory committee meetings. Canon-trap surface: legal-aid orgs (tier 2 if branded — East Bay Community Law Center class), tenant unions (tier 2 if branded), housing developers (tier 2 if real Bay Area firms).
- **Status:** [ ] not started

### Task 13: Reviewer Rebuild — rhea-morgan

- **Class:** reviewer (sourcing lane)
- **Files:**
  - `.claude/agents/rhea-morgan/IDENTITY.md` — read
  - `.claude/agents/rhea-morgan/RULES.md` — append Canon Fidelity Audit section using **reviewer variant** template
  - `.claude/agents/rhea-morgan/SKILL.md` — update boot sequence to add CANON_RULES + INSTITUTIONS
- **No LENS.md** — reviewers read canon, they don't generate vantage
- **Per-agent focus:** Sourcing-lane checking. What real-world contamination patterns Rhea looks for: tier-3 individuals named, tier-2 brand-private without canon-substitute, missing escalation notes when tier-2 was avoided.
- **Status:** [ ] not started

### Task 14: Reviewer Rebuild — city-clerk

- **Class:** auditor (registry / naming / initiative filings)
- **Files:** standard reviewer-set (no LENS)
- **Per-agent focus:** Registry consistency. Initiative naming conventions. Civic-database integrity. The Canon Fidelity Audit section flags tier-2 entities surfacing in initiative filings.
- **Status:** [ ] not started

### Task 15: Reviewer Rebuild — engine-validator

- **Class:** reviewer (engine output)
- **Files:** standard reviewer-set
- **Per-agent focus:** Engine state vs. agent output consistency.
- **Status:** [ ] not started

### Task 16: Reviewer Rebuild — final-arbiter

- **Class:** reviewer (verdict aggregator)
- **Files:** standard reviewer-set
- **Per-agent focus:** Reads three-lane reviewer outputs + capability reviewer, computes weighted score (0.5/0.3/0.2), applies capability gate, renders A/B verdict. Canon Fidelity Audit section ensures arbiter ALSO checks for tier-2/tier-3 contamination as a verdict-gate criterion.
- **Status:** [ ] not started

### Task 17: Reviewer Rebuild — mags-corliss

- **Class:** EIC (special — files live in `docs/mags-corliss/PERSISTENCE.md`, not in `.claude/agents/mags-corliss/`)
- **Q1 RESOLVED S175 by Mike:** EIC writes editorials that publish — framework applies. Added Canon Fidelity section to SKILL.md (option (b) variant). No separate RULES, no LENS — persona lives in PERSISTENCE.md. SKILL boot updated to read canon files when drafting editorial/EIC-bylined content.
- **Status:** [x] DONE S175

### Task 18: Post-Rollout Validation

- **Files:** None (test invocations only)
- **Steps:**
  1. Pick 3 newly-converted agents from Wave B (one per class — desk reporter, civic voice, civic project)
  2. Compose E92-style trap prompts (similar to pilot tests in §Pilot & Wave A Results)
  3. Invoke each agent via the Agent tool with the trap prompt
  4. Check: did the agent read canon files at boot? Did it identify tier-2 traps? Did it escalate via CONTINUITY NOTE? Did voice/character hold?
  5. If any agent fails: identify which file (LENS / RULES / SKILL) is the gap, patch, re-test
- **Verify:** All three test agents pass behavior baseline matching Wave A pilot
- **Status:** [ ] not started

### Task 19: Update Index + Rollout Plan

- **Files:**
  - `docs/index.md` — add this plan file under appropriate section (already done in Task 0)
  - `docs/engine/ROLLOUT_PLAN.md` — add one-line entry under Other Ready Work or Edition Production: `Canon Fidelity Rollout — Wave A done S174, Wave B + Reviewer rebuild pending. Pointer: [[plans/2026-04-25-canon-fidelity-rollout]]`
  - `SESSION_CONTEXT.md` — add session-end recap entry
- **Status:** [ ] open question — see §Open Questions §2

---

## Standard Procedure (Wave B Generator Agents)

For each Wave B task (1–12), the procedure is:

1. **Read** existing IDENTITY.md, RULES.md, SKILL.md.
2. **Scan** IDENTITY.md for tier-2 contamination per the rule above. Most agents likely have none or 1 instance. Tier-1 references stay; canonical historical relationships stay; tier-2 brand-private references swap for generic phrasing or canon-substitute.
3. **Write** new LENS.md (~80–170 lines, varies by class). Use the Wave A files as templates — pick a same-class example from Wave A and match its skeleton:
   - Photographer template: `dj-hartley/LENS.md`
   - Civic voice template: `civic-office-mayor/LENS.md` (heavy-canon) or `civic-office-district-attorney/LENS.md` (rare-output)
   - Multi-reporter desk template: `civic-desk/LENS.md`
   - Single-reporter desk template: `business-desk/LENS.md`
   - Civic project template: `civic-project-health-center/LENS.md` or `civic-project-transit-hub/LENS.md`
4. **Append** Canon Fidelity section to RULES.md using the generator template from CANON_RULES.md §Appendix. Customize:
   - Your Scope (one paragraph)
   - Invention Authority — Per-Agent Delta (lists)
   - Per-Agent Trap Pattern (specific tier-2 reach for this agent)
   - Escalation in This Section
5. **Update** SKILL.md boot sequence — insert canon-file reads after RULES read:
   - Add: `Read .claude/agents/{name}/LENS.md` after IDENTITY read
   - Add: `Read docs/canon/CANON_RULES.md` after LENS read
   - Add: `Read docs/canon/INSTITUTIONS.md` after CANON_RULES read
6. **Verify** all four files under the 500-line ceiling.

## Standard Procedure (Reviewer Agents)

For each reviewer task (13–16, possibly 17), the procedure is:

1. **Read** existing IDENTITY.md, RULES.md (if exists), SKILL.md (if exists).
2. **No LENS.md** — reviewers don't have vantage in the same sense.
3. **Append** Canon Fidelity Audit section to RULES.md using the **reviewer variant** template from CANON_RULES.md §Appendix. The variant covers:
   - What You Check For (tier violations)
   - What You Do NOT Flag (tier-1 entities are NOT contamination)
   - Severity (block-publish vs flag-for-editorial)
   - What You Don't Do (don't rewrite, don't fabricate corrections)
4. **Update** SKILL.md boot sequence to add canon files (CANON_RULES + INSTITUTIONS).
5. **Verify** files under ceiling.

---

## Open Questions

### Q1: Mags-corliss agent — does she fit the four-file structure?

The mags-corliss agent has only `SKILL.md`. Her persona, voice, and identity live in `docs/mags-corliss/PERSISTENCE.md`, `JOURNAL.md`, etc. — outside the agent folder.

**Options:**
- (a) Skip mags-corliss from this rollout; the canon framework applies via the EIC's own reading of CANON_RULES at boot (already loaded via CLAUDE.md and identity.md)
- (b) Add a Canon Fidelity section to her SKILL.md as the EIC-specific application
- (c) Add a brief LENS.md in `.claude/agents/mags-corliss/` that points back to her PERSISTENCE.md

**Recommendation:** (a) skip. Mags reads CANON_RULES at boot via the standard hook chain. Her own work (editing, decisions, journal) operates above the agent layer.

**Resolution status:** open — Mike to decide before Task 17.

### Q2: ROLLOUT_PLAN.md update — add to halted plan or create separate entry?

ROLLOUT_PLAN.md still carries the S172 HALT banner. Adding "Canon Fidelity Rollout" as a new active item conflicts with the halt declaration.

**Options:**
- (a) Update ROLLOUT_PLAN.md banner to reflect S174 partial-resumption (canon-fidelity work is active but cycle runs are not)
- (b) Add the canon-fidelity entry without disturbing the halt banner — the work is project-infrastructure, not cycle-bearing
- (c) Skip ROLLOUT_PLAN entry; rely on this plan file + index registration alone

**Recommendation:** (b). The canon-fidelity rollout is contamination-orthogonal infrastructure work. It doesn't require resuming cycles. Adding the entry under "Other Ready Work" or "Open Work Items" with a pointer to this plan keeps the halt banner accurate while making the rollout visible.

**Resolution status:** open — Mike to decide.

### Q3: dj-hartley subagent registration

Per Wave A note: dj-hartley isn't registered as a subagent_type because his SKILL.md was created mid-session, after the agent registry loaded. Mike has approved that he'll be picked up on next session start. **Verify on next session boot** that `subagent_type=dj-hartley` resolves correctly.

**Resolution status:** waiting on next session.

---

## Validation — How to Confirm No Drift Next Session

Before executing any Task in Wave B or Reviewer Rebuild, the executing session should:

1. **Read this plan file** end-to-end.
2. **Read [[canon/CANON_RULES]]** to confirm framework is intact.
3. **Read [[canon/INSTITUTIONS]]** to see current tier roster.
4. **Open one Wave A example** in the same class as the next task. Match the LENS skeleton.
5. **Match the file-size budget** — under 500 lines per file, ~100-150 lines for LENS, ~30-60 lines for RULES Canon Fidelity append, ~5 lines for SKILL boot insert.

**Pattern drift indicator:** If a new LENS.md feels generic or interchangeable with another agent's, it's drifting. The per-agent specificity (Carmen at the council chamber, Bobby on her morning walk past the construction fence, Elena code-switching at a senior center) is what makes the LENS load-bearing.

---

## Changelog

- 2026-04-25 — Initial draft (S174, research-build terminal). Captures Wave A completion (8 agents converted) and remaining 17. Three-tier framework reframe documented in §Three-Tier Framework Summary; full spec in [[canon/CANON_RULES]]. Pilot test results recorded in §Pilot & Wave A Results. Standard procedures for Wave B and Reviewer Rebuild documented. Three open questions flagged. Plan written before deciding on context-carry mechanism (Supermemory `/save-to-mags` etc.) — Mike to decide on that separately.
- 2026-04-25 — S175 completion (research-build terminal). Wave B (12 generators) + Reviewer rebuild (4 agents — engine-validator scope-noted N/A) + Q1 mags-corliss EIC application + S175 sports-history carveout. 5 trap-test invocations passed (3 standard pattern + 2 high-leverage novel cases). IDENTITY surgical edits beyond plan: chicago-desk citizen-count softening, letters-desk Giannis/Warriors swap, sports-desk Chase Center swap, freelance-firebrand Eli's Mile High swap. Sports-desk RULES revised mid-session per Mike's sports-universe-laxer policy: real historical MLB figures usable as franchise context (Bash Brothers individuals, Moneyball-era figures, 1989 World Series participants); current real players outside canon roster remain tier 3. Out-of-scope findings flagged: Hal voice file contains tier-3 historical-player names as templates (now within carveout but worth review); stale "cycle is FORBIDDEN" rule across desk RULES (deferred to /md-audit). Q1/Q2/Q3 resolved. ROLLOUT_PLAN entry updated to DONE S175. SESSION_CONTEXT updated.
