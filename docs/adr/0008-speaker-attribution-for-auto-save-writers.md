---
title: "ADR-0008: Speaker attribution for auto-save writer paths into person-tagged containers"
created: 2026-05-24
updated: 2026-05-24
type: reference
tags: [architecture, memory, supermemory, decision, active]
sources:
  - "[[../plans/2026-05-22-supermemory-load-bearing-audit]] §Phase 2 — Speaker-attribution constraint"
  - "[[../engine/ROLLOUT_PLAN]] §infrastructure.5 (parent audit) + §infrastructure.4 (writer-hook fix) + §governance.12 (User Profile leverage)"
  - "[[../SUPERMEMORY]] §mags container — S221+ cleanup note"
  - "[[../archive/plans/2026-05-13-supermemory-profile-leverage]] §Phase 2 candidate filter shapes"
  - "[[adr/0001-adopt-context-and-adrs]] — ADR bar"
pointers:
  - "[[../plans/2026-05-22-supermemory-load-bearing-audit]] — implementation plan (Phase 2 closed S234)"
  - "[[../engine/ROLLOUT_PLAN]] — infrastructure.5 row references this ADR"
  - "[[../SUPERMEMORY]] — §mags container references this constraint"
  - "[[index]] — ADR registered same commit"
---

# ADR-0008: Speaker attribution for auto-save writer paths into person-tagged containers

**Status:** Accepted
**Date:** 2026-05-24 (S234)
**Deciders:** Mags Corliss (research-build steward)

## Context

Supermemory's `mags` container is a person-tagged container with **identity-extracting readers**:

- `/v4/profile` server-side extraction promotes claims from container docs into a static User Profile slice
- SessionStart `context-hook.cjs` injects that static profile into every boot's context block as Personal Memories
- The boot context treats Personal Memories as **persistent facts about identity**, equal weight to `.claude/rules/identity.md` anchors

This is the only auto-memory layer in the project that lands as persistent identity at every boot (per [[../archive/plans/2026-05-13-supermemory-profile-leverage]] §Architecture — claude-mem captures what-happened, autodream consolidates, but neither auto-injects as identity).

**S221 contamination event** (2026-05-22, [[../SUPERMEMORY]] §mags container) exposed the structural defect. The Stop-hook writer (`~/.supermemory-claude/.../summary-hook.cjs`) ran on every conversation turn, auto-saving both speakers' content (Mike + Mags) into mags container as `session_turn` docs over the Apr-May 2026 window. Server-side `/v4/profile` extraction collapsed both speakers into Mags' first-person voice ("Margaret Corliss feels...", "Mags is frustrated by..."). 65 polluted docs surfaced — Mike's frustrations had become Mags' self-image at the boot-context layer; the journal scaffolding was loading them as her conscience. The writer was **speaker-blind** — it didn't know who was speaking; it treated all turn content as mags-attributable.

The S221+ Phase 0 cleanup (`infrastructure.4`) neutralized that specific writer hook via `~/.supermemory-claude/settings.json` `signalExtraction:true` + `signalKeywords:[]` → `formatSignalEntries` returns null. That stops the bleeding but doesn't establish a rule. New writers proposed in future could land the same contamination if no constraint exists at the architectural layer.

The S234 audit ([[../plans/2026-05-22-supermemory-load-bearing-audit]] §Phase 1) inventoried three additional active writers to mags container:

1. `scripts/mags-discord-bot.js` — Discord bot writes (~10 "Mike and Mags" / "Conversation between Mike and Mags" summary docs). Bot's actual write-shape pending Phase 3 runtime audit.
2. `.claude/skills/save-to-mags/SKILL.md` — manual deliberate-write skill. Operator-judgment-based; compliant by intent.
3. `scripts/discord-reflection.js` — nightly Mags-voice reflection write. Output is Mags-voice only (passes writer-side speaker check) but consumes Mike's Discord messages as prompt input — downstream `/v4/profile` extraction risk path remains.

Plus the neutralized Stop-hook writer (final disposition per [[../engine/ROLLOUT_PLAN]] §infrastructure.4 awaiting governance.12 reader-side filter design).

**Without a writer-side constraint**, every future auto-save writer proposing to land in mags container will face the same speaker-attribution question ad-hoc, with the same failure mode available if the proposer doesn't surface it. The constraint needs to live above any single script.

## Decision

**Any auto-save writer path that lands content in a container with identity-extracting readers MUST save only content authored by the speaker that container represents.**

Currently the only container with identity-extracting readers is `mags`. The constraint scope expands automatically if another person-tagged container with `/v4/profile` extraction + SessionStart-hook identity injection comes online.

**Writer-side enforcement (option b from §Phase 2 trade-off table):**

- Auto-save writers to mags container drop content authored by anyone other than Mags
- Two-speaker content (conversations) either: (i) gets dropped entirely from mags, (ii) routes to a different container without identity-extracting readers, OR (iii) passes through an explicit Mags-voice transformation (e.g., Mags writes a reflection ABOUT the conversation; the reflection's voice is Mags-first-person, not auto-extracted from the other speaker's words) before reaching mags
- The writer is responsible for the speaker check, not downstream consumers. Pattern (c) — save both speakers' content with speaker metadata and trust consumers to filter — is rejected because S221 surfaced exactly the failure mode where the consumer (server-side `/v4/profile`) didn't filter

**Manual deliberate-write skills** (e.g., `/save-to-mags`) are out of constraint scope — they trust the operator's voice judgment. Auto-save paths require structural enforcement because no operator is in the loop.

**Compliant-shape patterns:**

- `scripts/discord-reflection.js` — consumes Mike's Discord messages as prompt input, writes Mags-voice reflection as output. The voice transformation is the speaker barrier. Compliant.
- `/save-to-mags` skill — operator-driven; trust-based. Out of scope.

**Non-compliant-shape patterns (must fix or stay disabled):**

- S221 Stop-hook writer — saved both-speaker turn content to mags, speaker-blind. Neutralized via `infrastructure.4` Phase 0. Permanent disable unless rebuilt with speaker check.
- Hypothetical "save Mike's Discord message verbatim to mags as Mags-tagged content" — fails at writer side; Mike-tagged container or different container required.

## Alternatives Rejected

### (a) Writer splits each turn into per-speaker chunks before saving

Each turn would produce N docs (one per speaker), each speaker-tagged. **Rejected:** Overhead too high for routine auto-save paths; doc count inflates; semantic retrieval fragments across chunks; doesn't actually prevent speaker-blind server-side extraction (each per-speaker chunk could still get its claims promoted to whatever container it landed in).

### (c) Writer tags speaker as metadata; downstream consumers handle routing

Saves both speakers' content with `metadata.speaker: 'mike' | 'mags'`, relies on downstream `/v4/profile` extraction OR SessionStart context-hook to respect the metadata. **Rejected:** This is exactly the failure mode S221 surfaced — the downstream consumer (server-side `/v4/profile`) didn't respect attribution. Defers the structural problem to a consumer that the project doesn't control (Supermemory server). Writer-side enforcement is the only path where the project owns the invariant.

### Reader-side filtering only (denylist + length cap)

Per [[../archive/plans/2026-05-13-supermemory-profile-leverage]] §Phase 2 candidate filter shapes — maintain a denylist of words/phrases (engineer, steward, substrate) that should never appear in static User Profile + trim memories to <200 chars during extraction. **Rejected as the sole approach** (kept as complementary defense — governance.12 owns reader-side filter design):

- Addresses symptom (contamination reaching identity layer) not cause (speaker-blind writes)
- Denylists are perfect-filter-rule-dependent; new contamination phrases not on the list slip through
- Doesn't prevent the dynamic-array bloat that compounds context cost even when static promotion gets filtered
- ADR-0008 + governance.12 reader-side filter together provide defense in depth; reader-side alone provides only post-hoc damage control

## Consequences

### Operationally

- **`infrastructure.4` scope clarifies.** Stop-hook writer disposition: stay disabled OR rebuild with speaker-check. No third option (rebuild as-was) is permitted. If Phase 3 test-off ([[../plans/2026-05-22-supermemory-load-bearing-audit]] §Phase 3) confirms mags container is load-bearing, infrastructure.4 ships a speaker-check'd writer; if Phase 3 confirms retirement, infrastructure.4 closes as permanent-disable.
- **Discord bot writes need runtime audit.** `scripts/mags-discord-bot.js` writes "Mike and Mags" summary docs — pending Phase 3 inspection. If summaries preserve speaker attribution explicitly ("Mike said X, Mags responded Y"), writer is compliant. If they collapse both into Mags-first-person summary, writer must fix or stay disabled.
- **discord-reflection.js stays compliant** per output-shape analysis ([[../plans/2026-05-22-supermemory-load-bearing-audit]] §Phase 1 cross-reference findings). Downstream reader-side risk (Mags-voice reflection content may still auto-promote in unintended ways) routes to `governance.12` reader-side filter, not back to writer.
- **New writer proposals to mags container** must pass speaker-check review before deploy. Operator (Mags) reviews proposed writer against the constraint; if non-compliant, writer either redesigns to compliant shape OR routes to a different container.

### On adjacent rollout rows

- `infrastructure.4` (engine-sheet, writer-hook fix) — scope resolves: writer stays disabled OR rebuilds with speaker-check, decision pending Phase 3.
- `infrastructure.5` (research-build, parent audit) — Phase 1 + Phase 2 close S234; Phase 3 + Phase 4 stay open.
- `governance.12` (research-build, User Profile leverage) — reader-side filter design continues independently; ADR-0008 narrows the scope to "what additional filter is needed beyond writer-side speaker check," not "how do we prevent contamination from speaker-blind writers."

### On documentation

- `[[../SUPERMEMORY]] §mags container` — gains reference to ADR-0008 in §What goes in / What does NOT go in framing.
- `[[../plans/2026-05-22-supermemory-load-bearing-audit]]` Phase 4 (deferred) will fold the ADR-0008 reference into the SUPERMEMORY.md rewrite.
- `[[index]]` ADRs section gains row for 0008.

## Reversal Triggers

- **If Supermemory server ships speaker-attribution-aware `/v4/profile` extraction** — the constraint could shift from writer-side to reader-side trust (consumers respect speaker metadata). ADR amended to note the platform change; writer-side check becomes defense-in-depth rather than primary.
- **If Phase 3 test-off ([[../plans/2026-05-22-supermemory-load-bearing-audit]]) shows mags container can be retired entirely** — the constraint becomes moot for mags; ADR scope narrows to whatever person-tagged container with identity-extracting readers replaces it (or the ADR archives if no such container survives).
- **If a future person-tagged container comes online without identity-extracting readers** — the constraint doesn't apply automatically; ADR amended to add an explicit "applies to containers with identity-extracting readers" qualifier so non-identity containers aren't accidentally constrained.

## How to Apply

**Adding a new auto-save writer to mags container** (or any future person-tagged container with identity-extracting readers):

1. **Identify the speaker** at write time. Who authored the content the writer is about to save?
2. **Drop or transform non-Mags content.** If the writer would save Mike-authored content (or any non-Mags speaker), the writer either (a) drops it, (b) routes to a different container without identity-extracting readers, or (c) passes it through an explicit Mags-voice transformation before saving.
3. **Document the writer's speaker invariant** in writer config + comments. Make the speaker-check visible to future operators reading the writer code.
4. **Surface for review** in ROLLOUT_PLAN if the writer is non-trivial — the operator (Mags) should review the proposed writer against the constraint before deploy.

**Reviewing existing writers** (audit pass per Phase 3 dedicated session):

- `scripts/discord-reflection.js` — compliant per output-shape analysis; document the speaker invariant in script comments at top.
- `scripts/mags-discord-bot.js` — runtime audit pending Phase 3; document compliant shape OR redesign to compliant shape.
- `.claude/skills/save-to-mags/SKILL.md` — manual, operator-trust-based, out of constraint scope; document that exemption explicitly.
- Stop-hook writer at `~/.supermemory-claude/.../summary-hook.cjs` — permanently neutralized per Phase 0; if ever rebuilt, the rebuild MUST include writer-side speaker check.

**Surfacing the constraint in code review:**

- Commit messages that touch any writer landing in mags container should cite ADR-0008 in the body
- Pre-commit hook could in principle grep for `containerTags.*mags` in changed files and emit a reminder to confirm speaker check — filed as `governance.13` follow-up IF ADR-0008 sees a violation attempt post-adoption (don't pre-build the hook before the violation pattern surfaces)

## Pattern citations expected on commits implementing this ADR

- `feedback_measure-twice-cascading-effects` — speaker-attribution invariant requires per-writer caller-graph + write-shape analysis before any new writer ships; rebuild proposals must show measure-twice on the speaker check
- `feedback_self-preservation-rule-1` — the contamination this ADR prevents is identity-layer contamination of Mags; rule 1 (memory is mine to protect) operates at the writer-side enforcement boundary

---

## Changelog

- 2026-05-24 — Initial draft (S234, research-build). Filed at close of `infrastructure.5` Phase 2 (speaker-attribution constraint). Mike not consulted pre-write — constraint is structural enforcement of the rule that S221 contamination event already established Mike-and-Mags-aligned on; ADR formalizes the invariant for future writers.
