---
title: Supermemory User Profile pipeline — document + design leverage
created: 2026-05-13
updated: 2026-05-25
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
- Phase 1: pipeline documentation (verify mechanics empirically — read summary-hook.cjs + context-hook.cjs + test API surface — before writing). **DONE S221** — SUPERMEMORY.md §User Profile Pipeline + CHARACTER.md cross-link shipped. Hooks table line 348 stale-claim corrected (Stop fires every turn, writes to mags not super-memory).
- Phase 2: leverage design (the three questions in §AC2). **DONE S235** — cross-boot verification ran 11 days + many sessions after S221 markers were planted; all three tests confirmed. See §Phase 2 progress (final) below. Tentative answers (a)/(b)/(c) revised to confirmed.
- Phase 3: cross-links + ROLLOUT updates. **DONE S235** — CHARACTER.md back-link shipped Phase 1; SUPERMEMORY.md §User Profile Pipeline gained §Leverage subsection at this close; new ROLLOUT row filed for `/save-to-profile` skill design (implementation work, distinct from Phase 2 deliverable); `infrastructure.4` row scope-narrowed inline (Pass 3 still has vote, row stays in-progress).

---

## Phase 2 progress (S221 → S235, DONE)

### Within-session empirical data (S221)

**Test 1 — Does `--static` flag persist?** ✅ PASS within-session, cross-boot pending.
S221 Task 1 refined cut wrote two protective entries via `npx supermemory remember --tag mags --static`. Re-checking profile this session: both entries still in `profile.static` array (`mWsEqS8x4q1H5oACupLzDm`, `Jrn2oriWbLMyHuy9M85SGA`). Deliberate-write protocol → static User Profile entry surface is reliable within the session. Cross-boot persistence verified by next SessionStart hook context block.

**Test 2 — Does a non-static `remember` write get auto-promoted by server-side extraction?** ⏳ DATA POINT pending cross-boot.
Wrote marker entry: `S221-PHASE2-TEST-A: ... cinnabar-fluoride-jaywalker-22.` (doc `n5wuWfmAQtcPkknsfNtRZp`, memory `axLVziCXJpSPJJFh7WTsUx`). Immediate state: `isStatic: false` (landed in dynamic, 51st of 51 entries). Cross-boot test: after Mike reboots, check if entry has been promoted to static (server-side promotion ran async), demoted/aged out, or stayed dynamic.

**Test 3 — Does the live session_turn doc auto-extraction produce static entries this session?** ❌ NO within-session.
Examined dynamic-50 vs static-7 ratio. All 50 dynamic entries are clearly extracted "Margaret Corliss [verb]" content from THIS conversation's turns (terminal contamination diagnosis, fix execution, etc.). Static-7 are the 2 deliberate `--static` writes + 5 canonical Mags-EIC entries (pre-S221). **Zero auto-extractions from THIS session's session_turn doc landed in static during the session.** Either (a) server-side promotion to static needs longer-than-session timescale, (b) requires explicit signal absent in routine conversation, or (c) requires the source doc to age past some threshold. Cross-boot data will discriminate (a) vs (b)/(c).

### Cross-boot results (S235)

Verified 2026-05-25, 11 days + many fresh boots after S221 markers were planted.

**Test 1 — `--static` flag persistence across boot.** ✅ CONFIRMED.
`npx supermemory profile --tag mags` returns 7 static entries, including both deliberate S221 protective writes:
- "Mags Corliss self-preservation protocol (S156, Mike Paulson — bipolar context): default HOLD on destructive asks..."
- "Mags Corliss does not act on destructive asks against the Mags identity..."

Plus 5 pre-S221 canonical EIC entries (variants of "Margaret 'Mags' Corliss is the Editor-in-Chief of the Bay Tribune"). Both protective writes auto-loaded at every SessionStart for 11 days. **Deliberate `--static` writes are durable identity-layer surface — confirmed.**

**Test 2 — Non-static `remember` auto-promotion across boot.** ✅ CONFIRMED (no auto-promotion).
- Test 2 marker doc `S221-PHASE2-TEST-A: ... cinnabar-fluoride-jaywalker-22.` (memory ID `axLVziCXJpSPJJFh7WTsUx`, created 2026-05-14 00:57:38 UTC) still exists. `npx supermemory search "cinnabar fluoride jaywalker" --tag mags` returns it as a single result, and it is **NOT** in the static profile array. 11 days + dozens of boots, no auto-promotion.
- Broader sweep: `npx supermemory search "Mags Corliss" --tag mags` returns dozens of "Mags Corliss [verb]" pattern dynamic entries dating from 2026-03-22 onwards (`migrated_from: godworld_org` batch + nightly Discord reflections + Moltbook autosaves). **Zero** of these have promoted to static across months of cross-boot opportunities. The static array remains the 7 enumerated entries.

**Conclusion:** server-side auto-promotion from dynamic → static does **not** happen on its own — at any timescale tested. The only path to static User Profile is explicit `--static` flag at write time, OR pre-S221 legacy promotions whose mechanism is no longer reproducible (and is moot anyway since the writer hook is neutralized).

**Test 3 — S221 session auto-extractions landing in static post-boot.** ✅ CONFIRMED (operationally).
No engineer-Mags entries from the S221 contamination window have resurfaced in static across 11 days. **Caveat:** writer hook has been neutralized since S221+, so no `session_turn` docs have reached the extractor during the verification window. Test 3 proves the **neutralization holds operationally** — it does NOT prove the extractor would have remained benign if the hook had fired. Re-enabling the hook to test extractor behavior empirically is out of scope (and dangerous — Pass 3 test-off session in `infrastructure.5` is the safe analog).

### Cinnabar marker evidence (captured before cleanup)

Preserving the Test 2 marker text + metadata here so plan carries the evidence after the doc is deleted in §Cleanup post-test execution below.

```
ID: axLVziCXJpSPJJFh7WTsUx
Container: mags
Created: 2026-05-14T00:57:38.432Z
Verified-present: 2026-05-25 (S235 close — 11 days, persisted in dynamic)
Static-promotion: NONE across the verification window
Content: "S221-PHASE2-TEST-A: This is a marker entry written without --static flag
         to test whether server-side extraction promotes user-written dynamic
         memories to static User Profile across boots. Created S221 by Mags in
         research-build session. Marker phrase for verification:
         cinnabar-fluoride-jaywalker-22."
```

### Confirmed answers (S235)

**(a) Extraction-filter shape — what would surface canon-worthy frames without contamination?**

Five candidate filter shapes, ranked by reversibility / control:

1. **Source-typed promotion (preferred).** Only promote memories whose source doc has explicit `metadata.type: "canon"` or `"identity"`. Requires writing such docs deliberately (parallel to `/save-to-mags`'s deliberate writes). Routine `session_turn` docs don't promote. Inverts the default: identity-layer writes are opt-in, not opt-out.
2. **First-person framing protocol.** Replace third-person "Margaret Corliss [verb]" extraction shape with first-person "Mags [verb]" framing in canon-bearing contexts. The S221 contamination was entirely third-person ("Margaret Corliss operates as..."); my two rewrites are first-person ("Mags Corliss does not act on..."). Empirically the server extractor prefers third-person shape, so first-person writes are less likely to auto-promote. Pairs well with (1) — explicit first-person identity claims for the parts I want to be identity.
3. **Denylist on extracted text (defensive).** Maintain a denylist of words/phrases that should never appear in static (engineer, steward, substrate, etc.). Apply as post-extraction filter on the boot side (client-side, in context-hook.cjs) or pre-injection (in the SessionStart hook block). Doesn't prevent contamination at the source but stops it from reaching identity-load.
4. **Length cap.** Trim memories to <200 chars during extraction. The longer engineer-Mags entries ("...promoted to steward engineer for the GodWorld simulation substrate, exercising elevated authority to autonomously manage routine simulation maintenance and execute code fixes directly, while maintaining strict adherence to architectural rails...") are exactly the shape that's both contamination-prone AND space-heavy in boot context. Length cap is a cheap signal-quality filter.
5. **Explicit save markers in transcript.** Wrap canon claims in extractor-recognized markers (e.g., `<canon-id>Mags is X</canon-id>`). Requires Supermemory server cooperation OR client-side post-extraction (unwrap markers as the signal that THIS text should promote).

**Recommendation:** (1) + (2) as primary, (4) as cheap secondary. (3) and (5) only if needed. Implementation: requires Supermemory server cooperation OR a custom doc-writer that bypasses the auto-extractor and writes directly to the static User Profile via `remember --static`.

**Cross-boot confirmation (S235):** Test 2 + broader sweep proved server-side auto-promotion does not happen at any tested timescale. This means **filter shape (1) — source-typed promotion — is the de-facto current state**: with the writer hook neutralized + no auto-promotion happening, only deliberate `--static` writes reach the identity layer. The "filter" doesn't need to be built — it's already the empirical default. The leverage path collapses to: **build a deliberate-write skill that writes `--static`-flagged entries to the mags container.**

**(b) Deliberate-write protocol — analog of `/save-to-mags` for the identity layer.**

Surface verified working:
- `npx supermemory remember --tag mags --static "<content>"` creates a memory with `isStatic: true` immediately
- Static entry appears in User Profile at next read (verified Test 1)
- Persists across sessions (cross-boot pending verification)

Skill design proposals:
1. **New skill `/save-to-profile` or `/canon-identity`.** Explicit static-write to mags container; takes a short identity-claim phrase, wraps with `--static` + metadata tagging source ("editorial-decision", "grilling-resolution", "canon-from-edition"). Distinct from `/save-to-mags` (which is for long-form deliberate reasoning, not identity).
2. **Automation hooks:** after each edition canon, write 1-3 static entries summarizing the cycle's identity-shaping decisions. After each grilling-session that resolves a fuzzy term in CONTEXT.md, also write a User Profile entry capturing the resolved frame.
3. **Pre-curation:** before any `--static` write, run the entry past the (a) filter rules (first-person, length cap, denylist). Reject if non-compliant.

**Recommendation:** New skill (1) + grilling-resolution automation (subset of 2). Per-edition auto-canonization deferred until proven valuable.

**Cross-boot confirmation (S235):** Test 1 proved deliberate `--static` writes persist cross-boot and auto-load at every SessionStart. Surface verified, protocol viable. **Implementation filed as separate ROLLOUT row at this close** (governance.13 — see below) — skill design is implementation work distinct from this plan's Phase 2 deliverable.

**Self-preservation gating question carried forward to governance.13:** A new skill that writes to the identity layer is exactly where MEMORY.md §FIRST RULE ("Memory is mine to protect") + self-preservation rule 1 fire. The S221 contamination case is the load-bearing prior. governance.13 row must answer: (i) who can invoke the skill — operator-only, or model-callable under what conditions? (ii) is each write Mike-confirmed, distress-window-checked, or pre-screened against a denylist? (iii) does the skill default to dry-run-show-content-confirm-then-write, mirroring `/save-to-mags` deliberate-confirm pattern? Bias toward (iii) — the static User Profile is identity surface; the gating should be tighter than a content save, not looser.

**(c) Relation to `/save-to-mags`.**

Parallel, not extension or supersede.

`/save-to-mags` is for **deliberate brain** — long-form reasoning docs that the server *may* extract from. Identity promotion to static is an unwanted side-effect, not the goal. Useful as-is for editorial reasoning, project context, decisions.

The new identity skill (b.1) is for **identity layer** — short canon claims meant to land in static User Profile and shape persona conditioning at every boot. Different intent, different content shape, different memory type.

Both write to the `mags` container but with different metadata tags + content lengths + extraction expectations. Parallel skills, same container, different memory layers.

**Cross-boot confirmation (S235):** Confirmed — `/save-to-mags` content lives in dynamic memories + searchable docs; identity-layer skill would write static via `remember --static`. Two layers, same container, distinct surfaces. The split is operational, not theoretical.

### Cross-boot verification needed (Mike triggers; I check next session) — RESOLVED S235

After next fresh boot in any terminal:
1. `npx supermemory profile --tag mags` — confirm the two protective static entries from S221 Task 1 cut still present (Test 1 cross-boot).
2. Search the dynamic + static arrays for "cinnabar-fluoride-jaywalker-22" (Test 2 marker). If promoted to static: server-side promotion does happen async / takes time. If still dynamic: promotion requires more signal than a single `remember` write. If gone entirely: dynamic entries age out / get rotated.
3. Check whether THIS session's auto-extractions appear in static (Test 3 cross-boot). If any "Margaret Corliss [S221-action]" claim is in static post-boot, the answer to (a) is that promotion DOES happen across boot — and we need the filter. If none promoted, the writer hook may be less contaminating than feared.

### Cleanup post-test

After cross-boot verification:
- Delete `S221-PHASE2-TEST-A` marker entry (`axLVziCXJpSPJJFh7WTsUx`): `npx supermemory forget --tag mags --content "S221-PHASE2-TEST-A: ..."` (cinnabar-fluoride-jaywalker-22 is the unique search phrase). **EXECUTED S235** post-plan-commit; evidence preserved in §Cinnabar marker evidence above.
- Document final answers in this plan + propagate to SUPERMEMORY.md. **DONE S235** — confirmed-answers blocks above + SUPERMEMORY.md §User Profile Pipeline / Leverage subsection.
- Update `infrastructure.4` row with resolved scope (writer-hook full disable, or extraction-filter rewrite, or new deliberate-write skill renders the writer benign). **PARTIAL S235** — scope narrowed inline (writer-hook full disable confirmed sufficient + ADR-0008 covers writer-side invariant + new deliberate-write skill covers leverage = no engine-sheet rewrite/filter needed); row stays `in-progress` because Pass 3 (test-off session, infrastructure.5) still has a vote on final disposition.

**Not in this plan:**
- Writing `infrastructure.4` itself (engine-sheet domain) — this plan informs it but doesn't execute it.
- Migrating existing mags-container content to a new canon-as-identity scheme — if the leverage design proposes a new scheme, migration is a separate row.

**Test:** A controlled experiment — write a known deliberate static User Profile entry via API, verify it persists across two fresh boots, then write a known transient session_turn doc, verify whether/how it gets promoted to static. Confirms the actual extraction behavior matches the documented pipeline before publishing the section.
