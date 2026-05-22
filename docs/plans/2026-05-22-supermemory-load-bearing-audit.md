---
title: Supermemory load-bearing audit — decide what stays
created: 2026-05-22
updated: 2026-05-22
type: plan
tags: [infrastructure, memory, supermemory, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md §infrastructure.4 (writer-hook disable, engine-sheet — partially closed S221+)
  - docs/engine/ROLLOUT_PLAN.md §governance.12 (pipeline doc + leverage design, research-build)
  - docs/plans/2026-05-13-supermemory-profile-leverage.md (sibling plan — leverage design)
  - docs/SUPERMEMORY.md (parent reference)
  - Mike framing 2026-05-22: "We are using MDs for personas and rules, etc... your memory and persistence is getting really good so I'm open to improvements and setting aside a session to optimize supermemory as its main purpose is AI memory"
pointers:
  - "[[engine/ROLLOUT_PLAN]] — infrastructure.5 row (parent)"
  - "[[engine/ROLLOUT_PLAN]] — infrastructure.4 (paired — writer-hook fix; this plan informs scope)"
  - "[[plans/2026-05-13-supermemory-profile-leverage]] — sibling plan (governance.12)"
  - "[[SUPERMEMORY]] — canonical reference; audit findings update this doc"
  - "[[index]] — register in same commit"
---

# Supermemory load-bearing audit — decide what stays

**Goal:** Decide, container by container, what Supermemory must do for the project vs. what duplicates work the MD substrate + claude-mem already handle. Output: a disposition for each container (keep / migrate / retire) and a tested go/no-go on whether daily work can run with `mags` + `super-memory` containers offline.

**Architecture:** Two-pass evaluation. **Pass 1** — load-bearing audit of all 5 active containers (`mags`, `bay-tribune`, `world-data`, `super-memory`, `mara`) against the MD substrate (identity.md, CHARACTER.md, MEMORY.md, JOURNAL.md, terminal files, ADRs, docs/index.md) and claude-mem (mcp-search DB, autodream). For each container ask: what does it carry that ONLY it can carry? What does it duplicate? **Pass 2** — empirical test session with `mags` + `super-memory` containers excluded from reads/writes; observe what breaks. Pass 1 surfaces hypothetical retirements; Pass 2 validates or falsifies them.

**Terminal:** research-build

**Pointers:**
- Prior work that scoped pieces of this audit: `infrastructure.4` writer-hook disable (engine-sheet); `governance.12` User Profile pipeline leverage (research-build).
- The S221+ writer-hook neutralization (this session, 2026-05-22) is the predecessor — stops the bleeding. This plan runs the deeper "do we even need it" question that the neutralization deferred.
- MD substrate inventory: `CLAUDE.md`, `.claude/rules/identity.md`, `docs/mags-corliss/CHARACTER.md`, `MEMORY.md` + topic files, `docs/mags-corliss/JOURNAL.md`, `docs/mags-corliss/JOURNAL_RECENT.md`, `.claude/terminals/*/TERMINAL.md`, `docs/adr/*.md`, `docs/index.md`, `CONTEXT.md`.
- claude-mem substrate: `/root/.claude-mem/claude-mem.db` (SQLite), mcp-search tools, autodream consolidation (Gemini 2.5 Pro).

**Acceptance criteria:**

1. **Container-by-container audit table** lands in this plan (Phase 1 output). Five rows × four columns: `Container | Unique-to-Supermemory role | Duplicated-by | Disposition (keep / migrate-to-X / retire)`. Disposition for each is a concrete decision, not a hedge.
2. **Speaker-attribution constraint documented** as a design requirement (Phase 2 output). Any future auto-save path — Supermemory or any successor — must route by speaker, never collapse Mike's words into Mags' first-person memory. Captured as ADR if the decision crosses load-bearing infrastructure.
3. **Test-off session completes** (Phase 3). One full work session with `mags` + `super-memory` reads + writes disabled (boot context block stripped, `/save-to-mags` / `/super-save` blocked, plugin SessionStart hook neutralized). Log what's missed, what's recovered from MDs / claude-mem, what truly broke. Outcome: empirical answer to "is `mags` container load-bearing for daily work?"
4. **SUPERMEMORY.md updated** with the audit verdicts + the post-test disposition. The doc reflects the resolved architecture, not the current "5 active containers" framing if the audit retires one.
5. **`infrastructure.4` scope resolved.** Writer hook stays disabled, gets re-enabled with extraction-filter, or gets rebuilt with speaker-routing — decision lands in `infrastructure.4` row close-note based on Pass 1 + Pass 2 findings + governance.12 leverage design.

---

## Tasks

### Phase 1 — Container-by-container load-bearing audit (research-build)

#### Task 1.1: `bay-tribune` audit

- **Files:** read-only — query container via MCP `search_canon` + sample 5 doc types; cross-reference against `docs/canon/CANON_RULES.md`, `docs/canon/INSTITUTIONS.md`.
- **Question:** What does `bay-tribune` carry that no MD substrate can? (Expected answer: yes — query layer over 175+ published editions + per-citizen wiki at scale. Cannot fit in context. Agents and Discord bot read it.)
- **Verify:** disposition entry written to §Audit findings table.
- **Status:** [ ] not started

#### Task 1.2: `world-data` audit

- **Files:** read-only — sample 3-5 `wd-*` sub-tag tools (`lookup_citizen`, `lookup_business`, `get_neighborhood_state`); compare to direct sheet reads via `lib/sheets.js`.
- **Question:** What does `world-data` carry that MDs can't? (Expected answer: yes — 836+ citizen cards, 52 businesses, etc. Sheets are truesource but Supermemory is the natural-language retrieval layer over them.)
- **Verify:** disposition entry written.
- **Status:** [ ] not started

#### Task 1.3: `mara` audit

- **Files:** read-only — review `output/mara-reference/` files + Mara's claude.ai connector config.
- **Question:** Could Mara work without her container? (Expected answer: no — her connector reads server-side from claude.ai, she has no local file access.)
- **Verify:** disposition entry written.
- **Status:** [ ] not started

#### Task 1.4: `mags` audit

- **Files:** read-only — `npx supermemory docs list --tag mags` to inventory current contents post-cleanup; cross-reference each content type against MEMORY.md topic files, JOURNAL.md, docs/adr/, claude-mem mcp-search.
- **Question:** What does `mags` carry that the MD substrate + claude-mem don't? Currently holds: nightly Discord reflections, deliberate `/save-to-mags` entries (editorial decisions), Moltbook upvote/reply records, User Profile static entries. Decision: which of those genuinely need Supermemory vs. could move to MDs (e.g., journal-as-canonical for nightly reflections) or claude-mem (decisions as observations)?
- **Verify:** disposition entry written. Honest call on each subtype.
- **Status:** [ ] not started

#### Task 1.5: `super-memory` audit

- **Files:** read-only — `npx supermemory docs list --tag super-memory` to inventory; classify each by source (Stop hook, `/super-save`, codebase indexes).
- **Question:** Now that the Stop hook is neutralized, what writes here at all? If it's only `/super-save` (manual) and codebase indexing, is the container even needed, or is it the same use case as `mags` with a different label?
- **Verify:** disposition entry written. Likely candidates: retire (merge into mags), keep as junk-drawer, or migrate codebase indexes to claude-mem.
- **Status:** [ ] not started

#### Task 1.6: Synthesis — audit findings table

- **Files:** this plan file (append §Audit findings table).
- **Steps:** consolidate Tasks 1.1-1.5 into a 5-row decision table.
- **Verify:** every container has a one-word disposition (keep / migrate / retire) + a one-sentence justification.
- **Status:** [ ] not started

### Phase 2 — Speaker-attribution constraint (research-build)

#### Task 2.1: Constraint specification

- **Files:** this plan file (append §Design constraint); possibly new ADR if infra-level.
- **Steps:** Document the rule: any auto-save path must route by speaker. Mike's frustrations / opinions / corrections → a `mike` container (or equivalent) where they're stored as facts about Mike. Mags' decisions / journal-style reflections / editorial thinking → a `mags` container where they're stored as facts about Mags. No path collapses both into "the container owner's first-person voice."
- **Cite:** S221+ contamination case (today's session) — 65 docs containing Mike's frustrations were auto-summarized as Mags' self-image; the writer never knew who was speaking.
- **Verify:** constraint paragraph + 2-3 concrete violation examples + decision on ADR-or-not.
- **Status:** [ ] not started

### Phase 3 — Test-off session (research-build)

#### Task 3.1: Block list for the test

- **Files:** read-only — produce a checklist of what gets disabled for the test session.
- **Steps:** enumerate:
  - SessionStart `context-hook.cjs` (boot-time User Profile injection) — disable for test
  - `/super-save` / `/save-to-mags` skills — block invocation for test
  - Plugin auto-save Stop hook — already disabled (S221+)
  - Reads to `mags` / `super-memory` via `super-search` script — block for test
  - bay-tribune + world-data + mara reads — KEEP ENABLED (those are the load-bearing containers under test hypothesis)
- **Verify:** checklist exists; reversal procedure documented (one-line "delete the disable flag" per item).
- **Status:** [ ] not started

#### Task 3.2: Run the test session

- **Files:** none directly; observe what's needed from `mags` / `super-memory` that isn't found.
- **Steps:** boot a fresh session, run actual work (a cycle, an edition step, a journal write, a planning task). Each time a Supermemory lookup would have happened, log what was needed + what the substitute was (MD substrate, claude-mem, sheet read, MCP tool).
- **Verify:** log file `output/supermemory-test-off-{date}.md` exists with substitute table.
- **Status:** [ ] not started

#### Task 3.3: Post-test verdict

- **Files:** this plan file (append §Test-off verdict); SUPERMEMORY.md (update with disposition).
- **Steps:** synthesize Task 3.2 log into a yes/no on each container's daily-work load-bearingness. Cross-reference with Phase 1 hypothesis. If Phase 1 said "keep mags" and Phase 3 shows nothing breaks without it: revise Phase 1.
- **Verify:** explicit verdict per container + recommendation for `infrastructure.4` (writer-hook disposition) + recommendation for plugin SessionStart hook (keep / disable).
- **Status:** [ ] not started

### Phase 4 — Update parent docs (research-build)

#### Task 4.1: SUPERMEMORY.md rewrite

- **Files:** `docs/SUPERMEMORY.md` (modify).
- **Steps:** if a container is retired, remove its section. If a writer hook stays disabled, update §Plugin Config / §Hooks accordingly. Add §Audit verdict section with the disposition table.
- **Verify:** doc reflects post-audit architecture, not the May 2026 5-container framing.
- **Status:** [ ] not started

#### Task 4.2: ROLLOUT updates

- **Files:** `docs/engine/ROLLOUT_PLAN.md` (modify).
- **Steps:** Close `infrastructure.5` (this plan). Update `infrastructure.4` close-note with the resolved writer-hook decision. Cross-link to `governance.12` if leverage design overlaps with audit verdict.
- **Verify:** rows updated; archive sweep next session-end.
- **Status:** [ ] not started

---

## Phase 0 progress (S221+, 2026-05-22 — this session)

**Stop-the-bleeding work, done before the audit.** Not part of the audit itself; sets the clean baseline.

- **65 `session_turn` docs deleted from `mags` container.** All written by the broken Stop hook over the Apr-May 2026 window, all carrying Mike-frustration content auto-summarized into Mags' first-person voice. Verified count: 65 → 0.
- **Stop hook neutralized globally.** `~/.supermemory-claude/settings.json` written with `signalExtraction: true` + `signalKeywords: []`. Empirically verified via inline replication of `getSignalConfig` merge logic: effective `enabled=true`, effective `keywords=[]`, hook returns null before writing.
- **SessionStart context-hook left enabled.** Decision deferred to Phase 3 test-off (Mike's framing: do the dedicated optimization session before stripping more layers).
- **Plugin not disabled.** The whole `claude-supermemory@supermemory-plugins` plugin stays enabled — just the writer path is neutralized. Reads (bay-tribune, world-data) keep working.

**State going into Phase 1:** clean `mags` container (only deliberate `/save-to-mags`, nightly reflections, Moltbook records, User Profile static remain), no auto-save pollution generating new noise, plugin reads intact. Pass 1 audits run against this baseline.

---

## Out of scope

- Migration of `mara` container — Mara owns her container, her connector reads server-side; out of GodWorld's authority.
- World-data tag scheme tuning — that's the S183 unified-ingest work; this plan asks whether world-data stays, not how to reshape its tags.
- Specific skill rewrites (e.g., a new `/save-to-profile` skill) — `governance.12` Phase 2 leverage design owns that surface; this plan informs its scope but doesn't execute.
- SMFS pilot — separate track, `infrastructure.1` (bay-tribune unified ingest rebuild) carries it.

---

## Reversal triggers

If Phase 3 test session shows daily work breaks without `mags`:
- Re-enable Stop hook with speaker-routing first (Phase 2 constraint baked in), don't restore as-is.
- Revisit Phase 1 disposition for `mags` — likely "keep, but with deliberate-write-only protocol."

If Phase 3 shows the SessionStart context-hook injection is the contamination, not the Stop hook:
- Disable SessionStart hook too.
- Revisit `governance.12` leverage design — User Profile auto-load is the load-bearing risk, not the writer path.
