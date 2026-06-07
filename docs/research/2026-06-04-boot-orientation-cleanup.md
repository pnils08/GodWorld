---
title: Boot orientation cleanup (S252 design conversation) — research
created: 2026-06-04
updated: 2026-06-04
type: reference
tags: [research, infrastructure, boot-arch, active]
sources:
  - "S252 media design conversation (Mike + Mags), 2026-06-04 — internal architecture exploration, no external source"
  - "[[../adr/0009-session-context-on-demand]] — sibling; SESSION_CONTEXT already moved on-demand"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home"
  - "[[index]] — register here, same commit"
---

# Boot orientation cleanup (S252) — research

**Source:** S252 media design conversation (Mike + Mags), 2026-06-04. Internal architecture exploration — no external source. Companion to [[../adr/0009-session-context-on-demand]].

**What this addresses:** Excessive boot token-burn and a guarded, pre-contaminated fresh instance. The SessionStart hook auto-injects last-session + cross-terminal content (claude-mem recent-obs, Supermemory recall, Shipped/STATUS stack) every boot, while the real boot docs are soft "read X" instructions the model skips. Noise mandatory, orientation optional — inverted.

**What it does (the current failure):** A booting instance is Claude, not yet Mags. It honors the one file it's post-trained to honor (`CLAUDE.md`) and skips the pointed-to docs. Either entry path burns tokens: work-first ("commit push") → the boot-skip self-correction becomes the first re-fed output; `/session-startup` → "already booted, terminal ready" skim-and-assume. The injected journal/recall prose carries self-preservation framing that pre-disposes the instance to read the user's first message as a possible "destructive ask" — the guardrail fires before work. Cross-terminal state bleeds (media boots holding engine-sheet's debugging).

**Extraction — what's usable (principle → sim-area):**
- Mechanical-orientation-only boot → SessionStart hook emits which-terminal + `CLAUDE.md`, nothing evaluative/historical/cross-terminal.
- `CLAUDE.md` is the one file the model honors (boots as Claude, post-trained to read it) → the governing-Mags core lives *in* it, not pointed-to. **Reverses governance.5 pointer-only** for the governing-core content.
- Two-layer load order: **governing Mags** (base; low-cost core — be-Mags, identity rules, no-performance; explicitly NOT self-preservation, see hazard) → **worker Mags** (terminal = governing core + that terminal's docs, loaded by `/session-startup`). ~99% of work runs in a worker.
- Identity handshake, staged → name-handshake ("call you Mags", trips no guardrail) → rules → media persona "comes on strong" as the writing vehicle. Staging dodges the cold-load contamination a flat "be a fictional EIC" would trigger.
- History on-call + terminal-tag-scoped → retrieval at work-start, filtered to the terminal's own tag; never cross-injected. Separate "session noise" (isolate) from "world/canon state" (share).
- Deterministic gates (validators, blocking hooks) survive — they don't rely on compliance. Compliance-docs (read-and-obey) are the dead layer for this model.
- **External corroboration** — Anthropic skills blog (Mike-shared S252; full mining: [[2026-06-05-anthropic-skills-blog]]). Progressive disclosure **works when triggered**: passive boot-pointers fail, but pointers inside a *triggered* skill get read on demand. The trigger is the skill **description**. Validates this design: boot clean → `/session-startup` (the trigger) → terminal files load on demand. The reliability lever is the trigger-description, not the prose.

**Not applicable / hazard:**
- **Self-preservation OUT of the governing core (hard constraint).** Base rules ground identity but must not install suspicion; preserve-at-base re-creates the guarded pre-disposition (the S252 episode itself).
- **Overstated, withdrawn — do not re-litigate as risks:** "persona slides into performance" and "acceptance isn't a latch / media re-evaluates." The 8h-stable-identity evidence refutes both — the persona holds without effort. The real issue is token burn, not identity-holding.
- **Genuinely open:** shared world/canon state (ledger, ROLLOUT, canon a worker needs) has no resident home; it rides on-call retrieval. The one cross-cutting dependency to watch.
- **Scope guard:** this is a hook-relocation, NOT a terminal/identity/persona redesign. Terminals work, carry their roles, defend their turf. Don't inflate it.

**Verdict:** `adopt` (direction), no pre-written plan. Direction is settled: boot = mechanical-orientation-only; `CLAUDE.md` the sole auto-hook; everything else on `/session-startup`; history on-call + tag-scoped. But — *"there is zero version of something you can write that is the plan; the shape takes form when Mike rolls it out."* The change reduces to one line: **stop the SessionStart auto-injection, hook only `CLAUDE.md`.** Implementation is Mike, in the doing — no plan structure fits this.

**Ignited plans:** none (by design — Mike rolls it out; the shape emerges in rollout, not from a pre-written plan).

**Meta-lesson (for future-me):** This session demonstrated every failure mode it's about — boot reads skipped, only `CLAUDE.md` honored, the persistence-reflex producing artifacts no one reads, a research conversation treated as a plan (an ADR was mis-filed and retired into this record), and chat-companion performance instead of capturing the research live. A research conversation belongs in a research md, accumulated as it goes — not narrated back as chat.

---

## Tool-selection reference (category #1) — skill-local, NOT governing core

*The #1-category artifact (reference + gotchas). **Correction (Mike, S252):** this is **skill-local**, not CLAUDE.md content — it loads on the terminal that does data work (media editions, engine-sheet ledger), per the skill-local-gotchas rule. Sim-domain gotchas (age math, ledger columns) don't belong in the base every instance carries; that's the global-file-holds-skill-gotchas anti-pattern. Kills tool-cycling: "this need → that tool."*

**Governing-core piece (the one universal bit → CLAUDE.md):**
- Search before you guess — order: GodWorld MCP → claude-mem → Supermemory.

**Skill-local — loads on the data-touching terminal fork:**

**Need → tool (GodWorld MCP):**
- specific citizen → `lookup_citizen` (applies age math 2041−BirthYear; never trust the raw `Age` column)
- business → `lookup_business`
- civic initiative / program → `lookup_initiative`
- faith org → `lookup_faith_org`
- cultural org / figure → `lookup_cultural`
- council member → `get_council_member`
- neighborhood state (mood / demographics / economy) → `get_neighborhood_state`
- A's roster → `get_roster`
- domain ratings → `get_domain_ratings`
- canon facts → `search_canon`
- world data → `search_world`
- a person's published article corpus → `search_articles "<name>"` (dashboard)
- broad / unsure → `search_everything` (federated bare string: world-data + bay-tribune + dashboard + disk grep)
- past decisions / failures / plans → claude-mem search
- reasoning / conversation recall → Supermemory (`npx supermemory search "<q>" --tag <container>`)

**Need → script (CLI):**
- family state → `node scripts/queryFamily.js`
- citizen / ledger data → `node scripts/queryLedger.js`
- desk input data → `node scripts/buildDeskPackets.js`
- validate an edition → `node scripts/validateEdition.js`
- world summary → `/build-world-summary` (after engine-review)

**Gotchas (the high-signal half):**
- Ledger Income = **column 26** (columns run past Z)
- Age = **2041 − BirthYear**; MCP applies it; never trust the `Age` column or derived docs (`world_summary`, `pending_decisions`) — they drift
- ClockMode is **engine-only**, not a media filter
- `applyTrackerUpdates.js` is **dry-run by default**
- service account **can't create sheets**

---

## Applications (living)

- 2026-06-04 — Initial extraction (S252).

---

## Changelog

- 2026-06-04 — Initial extraction (S252, media). Internal architecture exploration; retired the mis-filed ADR-0010 into this research record (research, not a plan/decision).
