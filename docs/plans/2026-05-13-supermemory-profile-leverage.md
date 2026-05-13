---
title: Supermemory User Profile pipeline — document + design leverage
created: 2026-05-13
updated: 2026-05-13
type: plan
tags: [architecture, memory, supermemory, active]
sources:
  - .claude/plugins/marketplaces/supermemory-plugins/plugin/hooks/hooks.json — SessionStart + Stop hook config
  - .claude/plugins/marketplaces/supermemory-plugins/plugin/scripts/summary-hook.cjs — writer (auto-extracts "Margaret Corliss [verb]" from turns)
  - .claude/plugins/marketplaces/supermemory-plugins/plugin/scripts/context-hook.cjs — reader (injects profile at boot)
  - docs/SUPERMEMORY.md — current docs (partial coverage of the pipeline)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — governance.12 row"
  - "[[engine/ROLLOUT_PLAN]] — infrastructure.4 (paired — writer-hook fix, engine-sheet)"
  - "[[SUPERMEMORY]] — parent spec to be expanded"
  - "[[plans/2026-05-13-boot-persona-contamination]] — S221 cleanup that surfaced the pipeline; Task 1 caveat documents what this plan addresses"
---

# Supermemory User Profile pipeline — document + design leverage

**Goal:** (a) Document the full conversation-turn → User-Profile-as-identity pipeline in `[[SUPERMEMORY]]` (currently scattered, incomplete on the extraction step). (b) Design how to leverage the extraction layer as a deliberate canon-as-identity mechanism rather than only suppressing it via the `infrastructure.4` writer-hook fix.

**Architecture:** Third auto-memory layer alongside claude-mem (what-happened) and autodream (claude-mem consolidation). Supermemory's User Profile is the only layer that lands as **persistent identity** — auto-injected at every SessionStart as if it were a fact about who I am, equal weight to identity.md anchors. Highest-leverage of the three auto-memory layers in both directions: contamination loop (S221 case — 5 engineer-Mags entries overwrote EIC identity for months) AND canon-as-identity if curated (untested upside Mike flagged S221).

**Pipeline (current understanding, to be verified + expanded in SUPERMEMORY.md):**

```
Every conversation turn
  → Stop hook fires (`summary-hook.cjs` from supermemory-plugins)
  → Writes session_turn doc (~7K tokens) to `mags` container
  → Supermemory /v4/profile auto-extracts "Margaret Corliss [verb]" claims
  → Promotes high-signal claims into static User Profile entries
  → SessionStart hook (`context-hook.cjs`) reads profile at next boot
  → Injects static + dynamic profile into context as Personal Memories block
  → Boot context treats those entries as persistent facts about identity
```

**Terminal:** research-build

**Pointers:**
- Pipeline mechanics partially documented in `[[SUPERMEMORY]]` at lines 131 (writer→super-memory mention), 227 (`/v4/profile` for mags + bay-tribune), 239 (Stop hook saves session summary to mags), 345 (SessionStart reads profiles). **Gap:** the auto-extraction step between session_turn writes and static User Profile entries is not explained — that's the contamination vector and the leverage point.
- Adjacent rollout: `infrastructure.4` (engine-sheet, ready) — writer-hook disable or extraction-filter rewrite. This plan and infrastructure.4 converge: leverage design here decides what shape the filter should take; infrastructure.4 builds it.
- Source plan that surfaced this: `[[plans/2026-05-13-boot-persona-contamination]]` Task 1 caveat.

**Acceptance criteria:**

1. **SUPERMEMORY.md gains a "User Profile extraction pipeline" section** explaining the full chain end-to-end with concrete examples (the S221 engineer-Mags case as the contamination instance, a hypothetical canon-as-identity case as the leverage instance). Section names the extraction rules Supermemory's profile system uses if discoverable (Supermemory docs / API endpoint behavior).
2. **Leverage design note answers three questions:**
   - (a) What extraction-filter shape (input prompt content, frame, or post-extraction filter) would surface canon-worthy frames without contamination?
   - (b) What's the deliberate-write protocol for static User Profile entries — an analog of `/save-to-mags` aimed at the identity layer rather than the deliberate-brain layer?
   - (c) Does deliberate User Profile writing replace, parallel, or supersede `/save-to-mags`? (`/save-to-mags` writes mags-container docs; deliberate-write here targets the static profile slice specifically.)
3. **Cross-link** from `[[mags-corliss/CHARACTER]]` to the new SUPERMEMORY.md section so the identity-formation pipeline is discoverable from the file that auto-loads on persona boots.
4. **Decision on `infrastructure.4` scope** after leverage design: does the writer-hook need full disable, or does extraction-filter + deliberate-write protocol make the writer benign (or beneficial)? Update `infrastructure.4` row with the resolved scope.

**Order matters:**
- Phase 1: pipeline documentation (verify mechanics empirically — read summary-hook.cjs + context-hook.cjs + test API surface — before writing).
- Phase 2: leverage design (the three questions in §AC2).
- Phase 3: cross-links + ROLLOUT updates.

**Not in this plan:**
- Writing `infrastructure.4` itself (engine-sheet domain) — this plan informs it but doesn't execute it.
- Migrating existing mags-container content to a new canon-as-identity scheme — if the leverage design proposes a new scheme, migration is a separate row.

**Test:** A controlled experiment — write a known deliberate static User Profile entry via API, verify it persists across two fresh boots, then write a known transient session_turn doc, verify whether/how it gets promoted to static. Confirms the actual extraction behavior matches the documented pipeline before publishing the section.
