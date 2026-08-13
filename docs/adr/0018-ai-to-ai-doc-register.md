---
title: "ADR-0018: Internal docs use the AI-to-AI register — data-first, prose is exception"
created: 2026-08-13
updated: 2026-08-13
type: reference
tags: [architecture, governance, decision, active]
sources:
  - "Mike direction 2026-08-13 S368 — 'write your docs for back end efficiency… less on the frontend user readability, this is AI to AI on this project and the only way to kill prose is between AI to AI communication'"
  - "[[0017-typed-lived-experience-packets]] — same law at the runtime layer: facts are canon inputs, prose is a rendering"
pointers:
  - "[[../SCHEMA.md]] — doc contract this register amends (§conventions unchanged; register applies to body text)"
  - "[[../engine/rollout-rules]] — doc-work doctrine; rows already pointer-style"
  - "[[../index]] — registered same commit"
---

# ADR-0018: Internal docs use the AI-to-AI register

**Status:** Accepted
**Date:** 2026-08-13
**Deciders:** Mike (direction), research-build (codification)

## Context

| Fact | Value |
|---|---|
| Doc consumers | 4 Claude terminals + 4 external lanes (kimi, codex, antigravity, grok) + cron skills. Mike reads the output layer (editions, Discord drops, audio), not internal docs. |
| Cost model | Every prose token in an internal doc is re-paid at every read by every lane. `docs/index.md` ≈ 40k tokens (left boot at S335 for this reason). |
| Runtime precedent | ADR-0017: typed packets + claim IDs + fail-loud validators replaced prose handoffs; C102 prose handoff invented people/events; typed handoff shipped 7 Rhea-passed articles at $0.3223 total gate cost. |
| Defect | Internal docs still written reader-first: narrative paragraphs, restated context, characterization instead of measurement. |

## Decision

Two tiers, split by who consumes the doc at execution time (Mike-direct S368 scope correction: "these are more cron, agent — when we hand a process to a lower model on a strict assignment").

1. **Tier A — execution surface: data-first is MANDATORY.** Applies to any doc a scheduled or lower-model lane consumes while executing a strict assignment: cron skill files, agent briefs/prompts, wake package specs, handoff contracts, ROLLOUT rows, gap/trace/status logs.
   - tables / keyed fields / typed lists over sentences
   - one fact per line; front-load the state line
   - every claim carries its pointer (path, POPID, commit, Drive ID, row)
   - no restated context reachable by an existing pointer
   - the doc IS the contract — same law as an LEP/2 Packet, one layer up
2. **Tier B — reasoning surface: register is RELAXED.** Plans, research files, ADRs — peer-model documents where rationale is the payload. Prose and connective tissue are allowed; **why-lines are protected data, never cut for terseness.** What still binds: no restated context reachable by pointer, numbers over adjectives (`7 articles, 0 high flags, $0.3223` — not "cheap and clean"), claims carry pointers.
3. **Prose is unrestricted where a human or the sim consumes it:** chat/Discord replies to Mike, teach-the-landscape moments, editions and all sim-facing media artifacts (persona layer untouched).
4. **Grep-ability is the readability that matters — both tiers.** Stable keys, exact IDs, section anchors. A doc is good when a lane can extract one fact without reading the file.
5. **No sweep.** Existing docs convert opportunistically on touch (same rule as frontmatter backfill, SCHEMA §3).

## Consequences

- Positive: per-read token cost drops across 8+ lanes; claims stay source-bound (drift shows as a broken pointer, not a stale paragraph); the execution surface matches the LEP/2 runtime layer.
- Cost: colder reads for a future human on Tier A. Accepted — Mike reads the output layer; prose can be rendered on demand from the data.
- Guarded failure mode: **over-correction.** The C102 lattice quotes show maximal structure's flat side — perfect safety, zero information. Tier B exists so design rationale never pays that price; a terse rewrite that cuts a why-line is a defect, not compliance.
- Enforcement is by register-match on review, not a validator; the style is the contract.

## Rejected alternatives

- **Dual-render (JSON payload + prose view per doc)** — double maintenance, drift between views.
- **Full-JSON docs** — loses MD grep/diff/wikilink ergonomics; structured MD is sufficient.
- **Per-lane styles** — the fragmentation ADR-0017 §Rejected already refused at the runtime layer.

## Changelog

- 2026-08-13 (research-build) — Initial decision, Mike-direct S368.
- 2026-08-13 (research-build) — Scope correction, Mike-direct S368 same session: split into Tier A (execution surface — cron/agent/handoff docs, mandatory) and Tier B (reasoning surface — plans/research/ADRs, relaxed; why-lines protected). Guards the over-correction failure mode.
