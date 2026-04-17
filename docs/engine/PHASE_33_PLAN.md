---
title: Phase 33 Implementation Plan — Riley Integration & Hardening
created: 2026-04-16
updated: 2026-04-16
type: plan
tags: [infrastructure, architecture, active]
sources:
  - "S132 Riley audit — docs/RESEARCH.md"
  - "riley/RILEY_PLAN.md — Riley ecosystem inventory, active triggers, what to keep/replace"
  - "Sandcastle research (S132, S145) — /tmp/sandcastle v0.4.5"
  - "Everything Claude Code patterns — docs/RESEARCH.md S131"
  - "External review rounds S139 — KIMI, DeepSeek, Grok, Gemini, Codex reviews"
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent"
  - "[[SCHEMA]] — doc conventions"
  - "riley/RILEY_PLAN.md — full Riley spec"
  - "[[engine/ROLLOUT_ARCHIVE]] §S133 — DONE subitems 33.1–33.5, 33.7"
---

# Phase 33 Implementation Plan — Riley Integration & Hardening

**Status:** IN PROGRESS. 7 of 19 subitems DONE (S133 + S134 + S137b). 12 remaining, tracked below.

---

## 1. Completed subitems (detail in [[engine/ROLLOUT_ARCHIVE]])

- 33.1 config protection hook — S133
- 33.2 PreCompact state save — S133
- 33.3 compaction reminder — S133
- 33.4 city-hall rewrite — S133
- 33.5 bounded traits — S133
- 33.7 write-edition rewrite — S134
- 33.16 world-data citizen cards — S137b (Tier 1-2 done; Tier 3-4 + businesses/neighborhoods/faith remaining — see 33.16 below)

---

## 2. Remaining subitems

### 33.6 City Clerk verification script — BUILD (engine-sheet terminal)

Node script (not an agent) that checks: voice outputs exist, project outputs exist, tracker updates applied, production log complete. `scripts/verifyCityHall.js`. Output: `output/city-civic-database/clerk_audit_c{XX}.json`.

### 33.8 Session evaluation hook — BUILD (research-build terminal)

Stop hook analyzes transcript at session end for extractable patterns — what caused fabrication, what Mara caught, what worked. Builds editorial memory automatically. From everything-claude-code.

### 33.9 Session ID persistence for reporters — BUILD (engine-sheet terminal)

Persist Claude Code session IDs between runs so reporter agents retain context across cycles. From Paperclip.

### 33.10 Budget caps per agent — DESIGN (research-build) → BUILD (engine-sheet)

Monthly token tracking per agent role. Prevents one broken reporter from burning the whole Anthropic bill. From Paperclip.

### 33.11 Conditional hooks — DOCUMENTED (research-build). Apply when adding new hooks.

`if` field uses permission rule syntax: `Bash(clasp *)`, `Edit(*.md)`, etc. Two-stage filter: `matcher` narrows by tool, `if` narrows by arguments. Current hooks already scoped by `matcher` — no retrofit needed. Apply to future hooks.

### 33.12 Mags EIC Sheet Environment — EVALUATE (research-build terminal)

New spreadsheet owned by service account. Tabs: Editorial Queue, Desk Packets, Canon Briefs, Edition Tracker, Grading. Reads from Riley's sheets, writes to own space. No Riley triggers. See `riley/RILEY_PLAN.md` for full spec.

**Additional EIC tabs identified from S139 external reviews:**

- **Coverage Gap Tracker** — Flags storylines that were active 3+ cycles ago with no recent mention. "Refrigerator test" — stories the paper dropped that citizens would still be talking about. Auto-populated from Arc_Ledger + edition content. Generates follow-up assignments. (Source: KIMI review)
- **"What We Got Wrong" Queue** — Tracks narrative predictions/profiles that didn't hold up. Player profiled as emergent who got sent down, initiative covered positively that stalled, citizen who appeared in 3 stories then vanished. Feeds a rotating accountability section every 3rd edition. (Source: KIMI review)
- **Correction Log** — When the paper gets something wrong, track the error, the correction, and whether citizens referenced the error in subsequent Letters. Corrections become narrative material, not just errata. Connects to folk memory (27.9). (Source: KIMI review)
- **Arc Dashboard** — When Phase 37 (arc state machines) is built, surface arc phase + tension + linked citizens here so Mags sees story trajectory at a glance during edition planning. (Source: Grok review)
- **Corpus Bias Audit tab (from Nieman Reports, `docs/research/papers/paper5.pdf` [Drive ID: 1slzF0rTo5ND6VWN1EXj-sX8MnyA4ZszH] p.51-54, "Teach Your Computers Well").** LeCompte on NLP corpus bias — models replicate whatever skew is in their training data (Google Photos "gorillas" labeling, image search CEO returning mostly men). GodWorld has the same problem at a different scale: reporter voice files, the citizen ledger, and coverage history all have skews that compound per cycle. Quarterly audit surfaces: reporter-reuse rate per desk, citizen quote distribution (who's quoted most, who's never quoted), neighborhood coverage frequency vs. population share, demographic distribution across subject vs. official roles (the "Ani" finding — women are officials, not people — lives here), generic-citizen quote rate vs. named-citizen rate. Each metric compared against its prior-quarter baseline. Shift > threshold = flag for Mags. Consolidates with S113 canon audit, Ani feedback in NOTES_TO_SELF, and the "What We Got Wrong" tab above. MEDIUM.

These tabs turn the EIC sheet from a production tracker into an editorial intelligence system. Many external review suggestions (coverage gaps, corrections, accountability sections, arc awareness) converge on this same tool — Mags needs a sheet that shows what the paper is missing, not just what it's producing.

### 33.13 Sandcastle proof-of-concept — EVALUATE (research-build terminal)

Run one reporter agent via Sandcastle with real shell access and Supermemory queries. Source: `https://github.com/mattpocock/sandcastle` (cloned at `/tmp/sandcastle` S145, version 0.4.5). See also `docs/RESEARCH.md` S132 Sandcastle entry.

**S145 update — Docker blocker removed.** As of 0.4.1+, Sandcastle is provider-agnostic with four built-in sandbox providers: Docker, Podman (rootless), **Vercel** (cloud Firecracker microVMs via `@vercel/sandbox`), and **Daytona** (isolated). Vercel and Daytona providers require no Docker on our server — they run the sandbox in a hosted microVM. This unblocks the PoC: pick `vercel()` or `daytona()` in the `sandbox:` option of `run()`, set the relevant API keys in `.sandcastle/.env`, skip Docker install entirely.

**Parallel win — reviewer templates map to Phase 39.** Sandcastle 0.4.1 ships `sequential-reviewer` and `parallel-planner-with-review` templates where a reviewer agent enforces `CODING_STANDARDS.md` during review. Direct structural analog to Phase 39's Rhea + cycle-review + Mara three-lane design. If we run Phase 39 reviewers inside Sandcastle sandboxes with `parallel-planner-with-review`, we get process isolation + reproducibility + commit-level attribution for free. Worth prototyping against Phase 39.1 (capability reviewer) first since it's the least coupled to existing code.

**Convergence flag — Daytona shows up twice.** Both Hermes Agent (ROLLOUT_PLAN Open Work Items — Infrastructure) and Sandcastle (here) use Daytona as their isolated-sandbox backend. If we pick Daytona for one, we get ecosystem alignment for free. Worth a single-session Daytona evaluation before committing to any sandbox provider.

**S156 readiness check — research-build.** Confirmed state: `/tmp/sandcastle` is the 0.4.5 clone with both providers on disk (`src/sandboxes/daytona.ts`, `src/sandboxes/vercel.ts`). Daytona provider needs `@daytona/sdk` peer dep + `DAYTONA_API_KEY` + optional `DAYTONA_API_URL` and `DAYTONA_TARGET`. Vercel provider needs `@vercel/sandbox` peer dep + Vercel account + token.

**S156 PoC attempt.** Daytona Tier 1 free plan confirmed viable on paper (10 vCPU / 10 GiB / 30 GiB pool, 4 vCPU per sandbox). Installed `@daytona/sdk@0.167.0` + `dotenv`. Wrote `scripts/sandcastlePoC.js` — minimum-viable round-trip (create → echo → delete). Live run: API returned `Invalid credentials`. Mike declined to rotate the key. PoC parked with script in place.

**S156 code evaluation — Sandcastle / Phase 39 fit.** Inspected `/tmp/sandcastle/src/templates/`:

- **`sequential-reviewer`** (106 lines) — implement-then-review loop, one issue per iteration. Phase 1 sonnet implementer on a branch, Phase 2 sonnet reviewer on the same branch. Middle complexity.
- **`parallel-planner-with-review`** (251 lines) — four-phase orchestration: opus planner emits a dependency graph of unblocked issues, per-issue sandbox runs implementer (100 iters) then reviewer (1 iter) concurrently via `Promise.allSettled`, merge agent consolidates.

Direct structural analog to Phase 39's three-lane review (Rhea + cycle-review + Mara + Final Arbiter): the implementer/reviewer pairing exists in both, and the per-branch sandbox gives commit-level attribution + process isolation for free.

**Fit verdict for GodWorld:**
- **Match:** strong on structure. Sandcastle's `reviewer` primitive is isomorphic to any single Phase 39 lane.
- **Material gain:** modest. Current Phase 39 reviewers are deterministic and local; sandboxing buys reproducibility and audit trail rather than safety. Higher payoff if we ever run reviewers on untrusted input (e.g., user-submitted desk packets).
- **Integration cost:** non-trivial. Needs a working sandbox provider (Daytona rejected tonight; Docker requires local install; Vercel requires a separate account). Needs rewrap of capability-reviewer / cycle-review / Rhea / Mara as sandcastle templates. Each reviewer would run in its own sandbox per cycle.
- **Recommendation:** **park for now.** Phase 39 ships today without Sandcastle. Revisit if (a) we need commit-level attribution per reviewer lane, (b) reviewers become non-deterministic (e.g., add a grader-LLM step), or (c) we run reviewers on data from outside the trust boundary. Do not block spine progression on this.

### 33.14 Tool-restricted reporter agents — BUILD (media terminal)

Add `allowed-tools: ["Read", "Grep", "Glob"]` to reporter agent skill frontmatter. Reporters get read-only during writing. Only compile/publish gets write access. From everything-claude-code's hierarchical delegation pattern.

### 33.15 Iterative retrieval for canon — DESIGN (research-build) → BUILD (media)

3-cycle search-evaluate-refine pattern for reporters accessing canon. Score results 0-1, stop at 3+ files scoring 0.7+. Replaces context dumps. From everything-claude-code.

### 33.16 Entity cards — citizens DONE S137b, others remaining

Citizen cards built (Tier 1–2 done, Tier 3–4 in progress) via `scripts/buildCitizenCards.js`, queried through `lookup_citizen` MCP. **Remaining:** businesses (52), neighborhoods (17), faith/cultural (51) — separate scripts needed.

### 33.17 Missing trait profiles — DESIGN (research-build) → BUILD (engine-sheet)

343 of 685 citizens have no TraitProfile. Build a script that generates Archetype/Tone/Motifs/Traits from LifeHistory events and engine data. Tags are literary instructions — bounded personality earned from simulation, not assigned. Same philosophy as bounded traits on agents but tag-based instead of numeric.

### 33.18 Clean stale world-data memories — BUILD (engine-sheet terminal)

S131 document ingest created fragmented memories. Replace with Memories API records. Remove old fragments after new memories are confirmed searchable.

### 33.19 Physical details in citizen cards (S139, from DeepSeek review)

Reporters invent physical details per article — a limp, a raspy voice, a nervous habit. But these aren't stored or shared. If Carmen writes "Marcus has a limp" in E88, Maria doesn't know that in E91. Add a `PhysicalDetails` section to citizen cards: gait, voice quality, distinguishing habits, sensory details. Generated once per citizen (Tier 1-2 first), stored in world-data, available to all reporters via MCP `lookup_citizen`. Solves cross-edition consistency for character descriptions.

**Implementation:** Extend `buildCitizenCards.js` to include a physical details block. For existing Tier 1-2 citizens, mine bay-tribune for any physical descriptions already published and canonize them. For citizens without published descriptions, generate from TraitProfile + occupation + age.

**Connects to:** 33.17 (trait profiles feed physical detail generation), Phase 35.1 (wiki ingest should capture physical descriptions from new articles).

**Priority: LOW** — quality-of-life improvement. Build after 33.17 (trait profiles) since traits inform physical details.

---

## Changelog

- 2026-04-16 — Extracted from [[engine/ROLLOUT_PLAN]] §Phase 33 (S152). Content preserved verbatim; frontmatter + structure added. Completed subitems compressed to pointer list.
