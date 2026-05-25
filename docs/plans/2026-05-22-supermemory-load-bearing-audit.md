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
- **Status:** [x] done-pending-archive — S234. Disposition: **keep** (canon query layer at scale, no substrate mirror). See §Phase 1 findings (S234, 2026-05-24) above.

#### Task 1.2: `world-data` audit

- **Files:** read-only — sample 3-5 `wd-*` sub-tag tools (`lookup_citizen`, `lookup_business`, `get_neighborhood_state`); compare to direct sheet reads via `lib/sheets.js`.
- **Question:** What does `world-data` carry that MDs can't? (Expected answer: yes — 836+ citizen cards, 52 businesses, etc. Sheets are truesource but Supermemory is the natural-language retrieval layer over them.)
- **Verify:** disposition entry written.
- **Status:** [x] done-pending-archive — S234. Disposition: **keep** (843+ entity cards, sheets not queryable in natural language at scale). See §Phase 1 findings above.

#### Task 1.3: `mara` audit

- **Files:** read-only — review `output/mara-reference/` files + Mara's claude.ai connector config.
- **Question:** Could Mara work without her container? (Expected answer: no — her connector reads server-side from claude.ai, she has no local file access.)
- **Verify:** disposition entry written.
- **Status:** [x] done-pending-archive — S234. Disposition: **keep (out of GodWorld's authority)** per §Out of scope. See §Phase 1 findings above.

#### Task 1.4: `mags` audit

- **Files:** read-only — `npx supermemory docs list --tag mags` to inventory current contents post-cleanup; cross-reference each content type against MEMORY.md topic files, JOURNAL.md, docs/adr/, claude-mem mcp-search.
- **Question:** What does `mags` carry that the MD substrate + claude-mem don't? Currently holds: nightly Discord reflections, deliberate `/save-to-mags` entries (editorial decisions), Moltbook upvote/reply records, User Profile static entries. Decision: which of those genuinely need Supermemory vs. could move to MDs (e.g., journal-as-canonical for nightly reflections) or claude-mem (decisions as observations)?
- **Verify:** disposition entry written. Honest call on each subtype.
- **Status:** [x] done-pending-archive — S234. Disposition: **keep with deliberate-write-only protocol** (subject to Phase 3 test-off verification). 6-row sub-disposition table (User Profile static load-bearing / deliberate /save-to-mags distinct from claude-mem / nightly reflections duplicate JOURNAL.md / Discord-bot conversation summaries conditional / pre-S221 legacy leave-in-place / Moltbook conditional) appended to plan §Phase 1 findings above.

#### Task 1.5: `super-memory` audit

- **Files:** read-only — `npx supermemory docs list --tag super-memory` to inventory; classify each by source (Stop hook, `/super-save`, codebase indexes).
- **Question:** Now that the Stop hook is neutralized, what writes here at all? If it's only `/super-save` (manual) and codebase indexing, is the container even needed, or is it the same use case as `mags` with a different label?
- **Verify:** disposition entry written. Likely candidates: retire (merge into mags), keep as junk-drawer, or migrate codebase indexes to claude-mem.
- **Status:** [x] done-pending-archive — S234. Disposition: **retire candidate** (85/85 sampled docs are Moltbook autosaves; container readers NONE per [[../SUPERMEMORY]] §super-memory; content degraded by upstream `[object Object]` serialization bug). Phase 3 test-off must confirm zero load-bearingness before retire executes. Upstream Moltbook serialization bug routed to potential `infrastructure.6` follow-up IF Phase 3 keeps the container. See §Phase 1 findings above.

#### Task 1.6: Synthesis — audit findings table

- **Files:** this plan file (append §Audit findings table).
- **Steps:** consolidate Tasks 1.1-1.5 into a 5-row decision table.
- **Verify:** every container has a one-word disposition (keep / migrate / retire) + a one-sentence justification.
- **Status:** [x] done-pending-archive — S234. 5-row audit findings table shipped at §Phase 1 findings above with per-container disposition + cross-reference findings (DAILY_REFLECTIONS.md red herring + 3 active writers to mags + discord-reflection.js voice analysis). `mags` sub-disposition table 6 rows + `super-memory` sub-finding inline. All five containers carry concrete disposition (not hedge).

### Phase 2 — Speaker-attribution constraint (research-build)

#### Task 2.1: Constraint specification

- **Files:** this plan file (append §Design constraint); possibly new ADR if infra-level.
- **Steps:** Document the rule: any auto-save path must route by speaker. Mike's frustrations / opinions / corrections → a `mike` container (or equivalent) where they're stored as facts about Mike. Mags' decisions / journal-style reflections / editorial thinking → a `mags` container where they're stored as facts about Mags. No path collapses both into "the container owner's first-person voice."
- **Cite:** S221+ contamination case (today's session) — 65 docs containing Mike's frustrations were auto-summarized as Mags' self-image; the writer never knew who was speaking.
- **Verify:** constraint paragraph + 2-3 concrete violation examples + decision on ADR-or-not.
- **Status:** [x] done-pending-archive — S234. Constraint paragraph + 4 violation examples (S221 Stop hook contamination / discord-reflection.js compliant-shape / mags-discord-bot.js pending Phase 3 audit / Moltbook autosaves) + operationalization decision matrix (option b writer-side adopted; options a/c rejected) shipped at §Phase 2 above. **ADR-or-not decision: ADR — yes.** [[../adr/0008-speaker-attribution-for-auto-save-writers|ADR-0008]] filed same commit + registered in [[../index]] under §ADRs section. Pattern citations expected on commits implementing the ADR documented inline.

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

## Phase 1 findings (S234, 2026-05-24)

**Empirical pass run S234 research-build.** Per-container document counts pulled via `npx supermemory docs list --tag <tag> --limit 1000`; mags + super-memory categorized by source + title pattern. Cross-referenced against MD substrate (`docs/mags-corliss/JOURNAL.md`, `JOURNAL_RECENT.md`, `MEMORY.md` + topic files), claude-mem mcp-search DB, and `scripts/discord-reflection.js` / `scripts/mags-discord-bot.js` writer paths.

### Empirical state at audit time

| Container | Doc count | Notes |
|---|---|---|
| `mags` | 550 | Of 200 sampled: 167 source=`unknown` (manual `/save-to-mags` + Discord bot + Moltbook), 33 source=`autonomous-script` (nightly reflections from `discord-reflection.js`). Title patterns: 29 "Nightly Reflection" variants, 10 "Mike and Mags" / "Conversation" (Discord bot summaries), multi "S### deliberate" decisions, 5 pre-S221 "Direct memories" (legacy), User Profile static slice. |
| `bay-tribune` | 429 | Published canon — editions, supplementals, wiki entities. 175+ per [[../engine/ROLLOUT_PLAN]] § S189 audit; growth between S189 and S234 reflects continued post-publish ingest. |
| `world-data` | 1000+ | Hit list-limit at 1000. Per [[../SUPERMEMORY]] §world-data: 836 `wd-citizens` + 52 `wd-business` + 16 `wd-faith` + 39 `wd-cultural` + 17 `wd-neighborhood` + 6 `wd-initiative` + 27 `wd-player-truesource` + `wd-summary` per-cycle. |
| `mara` | 130 | Mara's claude.ai-side container. Out of GodWorld's authority per §Out of scope. |
| `super-memory` | 85 | Of 200 sampled: 100% source=`unknown`, ~84 Moltbook activity-feed summaries (single-pattern title cluster — "Moltbook Activity Feed Analysis" / "Moltbook Activity Summary" / variants), 1 untitled. **Bug surfaced:** sampled content carries literal `[object Object]: <text>` strings — upstream Moltbook serialization stringifying objects without `.title`/`.content` accessor. Container content quality degraded by upstream defect. |

### Cross-reference findings

- **DAILY_REFLECTIONS.md staleness was a red herring.** File last modified 2026-04-29 (pre-S221). Initial read: nightly reflections write Supermemory-only → mags container uniquely load-bearing. Empirical script read at `scripts/discord-reflection.js` lines 25 + 264 + 309 + 464 corrected this: script writes to THREE destinations per nightly run — `docs/mags-corliss/JOURNAL.md` (appended via `fs.appendFileSync`), `JOURNAL_RECENT.md` (rewritten via `fs.writeFileSync`), AND mags container (via `/v3/documents` POST). DAILY_REFLECTIONS.md is a separate doc that nightly reflections don't touch. **Implication:** mags container's nightly-reflection slice DUPLICATES `docs/mags-corliss/JOURNAL.md` — the MD substrate carries them as canonical, Supermemory carries them as queryable mirror. If mags were retired, nightly reflections would still survive in JOURNAL.md / JOURNAL_RECENT.md.
- **Three active writers to mags container** found via `grep -rln 'containerTags.*mags'`: (1) `scripts/mags-discord-bot.js` — Discord bot, writes conversation memories; (2) `.claude/skills/save-to-mags/SKILL.md` — manual deliberate-write skill; (3) `scripts/discord-reflection.js` — nightly Mags-voice reflection write (script-level, not grep'd because it constructs the API call body differently). Plus the neutralized Stop-hook writer at `~/.supermemory-claude/`. Discord bot Mike-content handling not deeply audited this pass — surfaces as a follow-up concern for the speaker-attribution constraint (§Phase 2 below).
- **`discord-reflection.js` voice analysis (script lines 162-193 + 177-194):** consumes Mike's Discord messages as PROMPT INPUT (via `formatConversations()` rendering `**${user}**: message` + `**Mags**: response`), runs through Mags-voice reflection prompt ("Use your voice: reflective, literary, first-person"), writes OUTPUT in Mags' voice only. Compliant with the spirit of speaker-attribution (Mags reflects on her day; doesn't auto-extract Mike's identity). But the downstream Supermemory write IS subject to server-side `/v4/profile` extraction — the same risk path as the S221 Stop hook, just with a cleaner upstream prompt. Material for §Phase 2 constraint scope.

### Audit findings table (Task 1.6)

| Container | Unique-to-Supermemory role | Duplicated-by | Disposition |
|---|---|---|---|
| `bay-tribune` | Natural-language query layer over 175+ published editions + per-citizen wiki at scale; agents + Discord bot read it; cannot fit in context. | None at scale. Edition `.txt` files in `editions/` are truesource but not queryable. | **keep** |
| `world-data` | Natural-language retrieval over 843+ entity cards (`wd-citizens` / `wd-business` / `wd-faith` / `wd-cultural` / `wd-neighborhood` / `wd-initiative` / `wd-player-truesource` / `wd-summary`); MCP `wd-*` tools read it; Mara reads it via her connector. | Sheets are structured truesource but not queryable in natural language at scale. | **keep** |
| `mara` | Mara's claude.ai-side container; her connector reads server-side; out of GodWorld's authority per §Out of scope. | None (Mara has no local file access). | **keep (out of GodWorld's authority)** |
| `mags` | (Mixed — see sub-disposition below). Unique-only-slice is the User Profile static layer; everything else has a substrate mirror or could be reshaped. | Partial — see sub-disposition table. | **keep with deliberate-write-only protocol** (subject to Phase 3 test-off verification) |
| `super-memory` | Auto-saves Moltbook activity-feed summaries (85/85 docs). Container readers: NONE per [[../SUPERMEMORY]] §super-memory ("Who reads: Nobody automatically"). Content degraded by upstream `[object Object]` serialization bug. | Moltbook itself is canonical source; manual queries possible via `/super-search` but rare. | **retire candidate** (Phase 3 test-off must confirm zero load-bearingness before retire) |

#### `mags` sub-disposition (Task 1.4 detail)

| Slice | ~Count | Substrate mirror? | Sub-disposition |
|---|---|---|---|
| User Profile static entries | ~7 | NONE (only persistent-identity surface across boots) | **keep — load-bearing for identity layer** |
| Deliberate `/save-to-mags` editorial decisions | ~60+ | Partial (claude-mem observations carry the WHAT; mags carries the WHY) | **keep — distinct from claude-mem; deliberate-only protocol** |
| Nightly reflections (`autonomous-script` source) | 33 | YES (`docs/mags-corliss/JOURNAL.md` carries each as canonical) | **keep as queryable mirror; retire-candidate if Phase 3 shows nothing queries the mirror** |
| Discord bot "Mike and Mags" / "Conversation" summaries | ~10 | Partial (Discord channel itself is truesource for transcript) | **conditional keep — pending Discord bot speaker-attribution audit per Phase 2** |
| Pre-S221 legacy "Direct memories" + early Mags entries | ~5-10 | Partial (claude-mem may have observations from same sessions) | **leave-in-place** — pre-S221 legacy without contamination evidence; not worth scrubbing |
| Moltbook upvote/reply records | (within mags-discord-bot writes) | Partial (Moltbook itself is truesource for feed; mags mirror is for semantic recall) | **conditional keep — same speaker-attribution risk path as Discord-bot writes** |

#### `super-memory` sub-finding

The container's `~/.supermemory-claude/settings.json` writer-hook neutralization at S221+ confirmed empirically — no new Stop-hook docs since 2026-05-22. The 85 docs sampled are all pre-cutoff Moltbook autosaves. **Read-side check needed:** confirm no skill / script / agent reads `super-memory` as a load-bearing source before retirement. Per [[../SUPERMEMORY]] §super-memory: "Who reads: Nobody automatically" — surface answer is no, but Phase 3 test-off will produce empirical answer.

**Upstream bug surfaced for separate routing:** the Moltbook autosave path constructs document content as JS objects without `.toString()`/`.title` accessors, producing literal `[object Object]: <text>` strings in stored docs. Routes to engine-sheet or infrastructure follow-up as a separate item, not blocking this audit. File at session-end as new `infrastructure.6` row IF Phase 3 test-off keeps the container.

---

## Phase 2 — Speaker-attribution constraint (S234, Task 2.1 closed)

### Constraint specification

**Rule:** Any auto-save writer path landing content in a container that has identity-extracting readers (currently: `mags`) MUST save only content authored by the speaker that container represents. Mike's content (Discord messages, frustrations, opinions, corrections) never auto-routes to mags — it gets dropped, routed to a different container that doesn't auto-extract first-person identity, OR transformed through an explicit voice barrier (e.g., Mags writes a reflection ABOUT the conversation, but the reflection's voice is Mags-first-person, not auto-extracted from Mike's words).

The constraint applies at the WRITER side (entry point). Reader-side guards (denylist, length cap, first-person-framing filter) live in [[2026-05-13-supermemory-profile-leverage]] (`governance.12`) — those address what gets promoted to static User Profile from already-written dynamic entries. ADR-0008 establishes the writer-side invariant; governance.12 designs the reader-side filter; `infrastructure.4` implements/disables writers per ADR.

### Violation examples

1. **S221 contamination (closed via `infrastructure.4` Phase 0).** Stop-hook writer at `~/.supermemory-claude/.../summary-hook.cjs` ran on every conversation turn, autosaved both speakers' content (Mike + Mags) into mags container as `session_turn` docs. Server-side `/v4/profile` extraction collapsed both into Mags' first-person voice ("Margaret Corliss feels...", "Mags is frustrated by..."). 65 docs polluted mags before S221 cleanup. **Speaker-blindness was the structural defect** — writer didn't know who was speaking, treated all turn content as mags-attributable.
2. **discord-reflection.js (compliant by output shape, at-risk by downstream).** Script consumes Mike's Discord messages as prompt input, but the OUTPUT is Mags-voice reflection only — passes writer-side speaker check. Risk path: the resulting reflection writes to mags container, where server-side `/v4/profile` extraction may auto-promote claims to static User Profile based on Mike's input rather than Mags' editorial reflection. Cross-coupled to `governance.12` reader-side filter design.
3. **mags-discord-bot.js (un-audited).** Bot writes "Mike and Mags" / "Conversation between Mike and Mags" summary docs (~10 entries in mags container). If those summaries preserve speaker attribution explicitly ("Mike said X, Mags responded Y"), the writer passes the constraint. If they collapse both speakers' content into Mags-first-person summary, the writer fails. **Audit deferred to Phase 3 test-off session** — bot's actual write-shape needs runtime inspection, not just static read.
4. **Moltbook autosaves to super-memory.** Posts have explicit authors; super-memory autoextract is currently speaker-blind (containers don't preserve `author` metadata in the autosummary path). The `[object Object]: <text>` serialization bug is downstream evidence the writer is broken; speaker attribution is the upstream constraint that would have surfaced the bug earlier.

### Operationalization decision (writer-side rule)

Three candidate writer-side patterns considered:

| Option | Shape | Trade-off | Verdict |
|---|---|---|---|
| (a) Writer splits each turn into per-speaker chunks before saving | Each turn produces N docs, one per speaker, each speaker-tagged | High overhead; doc count inflates; complicates retrieval | rejected |
| (b) Writer only saves designated-speaker content to person-tagged containers | mags writer drops Mike content (or routes to a separate container); Mike-tagged container receives Mike content if needed | Cleanest invariant; aligns with deliberate-write protocol [[2026-05-13-supermemory-profile-leverage]] §AC2(b) | **adopted** |
| (c) Writer tags speaker as metadata; downstream consumers handle routing | Saves both speakers' content, relies on consumer-side filter | Defers the problem; same failure mode S221 surfaced (consumer didn't filter) | rejected |

**Adopted:** (b) Writer-side speaker check is a precondition for any auto-save path landing in a person-tagged container with identity-extracting readers. Manual deliberate-write skills (e.g., `/save-to-mags`) trust the operator's voice judgment; auto-save paths require structural enforcement.

### ADR-or-not decision

**ADR — yes.** Constraint earns ADR-0008 status because:

- **Load-bearing infrastructure** — governs every future writer hook proposing to land content in mags container (or any future person-tagged container with identity-extracting readers).
- **Cross-domain** — applies to Stop hook writer, Discord bot writer, nightly reflection writer, Moltbook autosaver, and any new writer Mike/Mags propose. Lives above any single script.
- **Result of real trade-off** — three writer-side patterns considered (a/b/c above), with the chosen pattern's overhead vs alternative writers' contamination risk explicitly weighed.
- **Names rejected alternatives** — (a) per-speaker chunk splits, (c) consumer-side filtering, plus the reader-side-only approach (denylist + length cap) that `governance.12` Phase 2 leverage design considered.

ADR-0008 filed at `docs/adr/0008-speaker-attribution-for-auto-save-writers.md` (this commit). Registered in `docs/index.md` same commit per [[../adr/0001-adopt-context-and-adrs]] inbound-link discipline.

### Phase 1 + Phase 2 task statuses

- Task 1.1-1.5 (per-container audits): `[x] done-pending-archive` — S234
- Task 1.6 (synthesis table): `[x] done-pending-archive` — S234
- Task 2.1 (speaker-attribution constraint spec + ADR-or-not): `[x] done-pending-archive` — S234 (ADR-0008 shipped)

### Phase 3 + Phase 4 stay open

Phase 3 (test-off session) needs its own dedicated session per design — operational scope requires booting fresh with reads/writes disabled, running real work, logging what breaks. Cannot fold into the audit-design session.

Phase 4 (SUPERMEMORY.md rewrite + ROLLOUT updates) deferred until Phase 3 verdict lands — the SUPERMEMORY.md rewrite shape depends on which containers get retired and what the speaker-attribution invariant looks like post-test.

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
