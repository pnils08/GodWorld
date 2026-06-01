---
title: Headroom (context compression) — research
created: 2026-06-01
updated: 2026-06-01
type: reference
tags: [research, infrastructure, token-budget, active]
sources:
  - github.com/chopratejas/headroom — Mike-shared S250
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home (none — take-nothing)"
  - "[[index]] — registered in the docs/research/ sub-catalog"
  - "[[../GEMINI_OFFLOAD]] — same canon-fidelity no-go boundary"
---

# Headroom (context compression) — research

**Source:** `github.com/chopratejas/headroom` — context-compression toolkit for AI agents. Mike-shared S250.

**What this addresses:** the dominant token lever — boot burn + tool-output / packet bulk (`feedback_token-burn-hierarchy`, S248). We are currently solving that with *discipline* (governance.22 boot-burn work); headroom is the *tooling* alternative — does it earn a place in the stack?

**What it does:** compresses everything an agent reads — tool outputs, logs, RAG chunks, files, conversation history — by 60–95% before it reaches the LLM, without modifying agent code. Content-aware pipeline: a ContentRouter detects input type and routes to a JSON crusher / code-AST compressor / natural-language model; a CacheAligner stabilizes prompt prefixes for KV-cache hits. Its distinguishing feature is **CCR (reversible compression)** — originals are stored locally and the LLM can retrieve them on demand, so compression is lossless-recoverable rather than lossy. Ships as library / HTTP proxy / agent wrapper / MCP server / middleware.

**Extraction — what's usable:**
- (Considered) compressing desk-packet + boot-context bulk → would hit the boot-burn lever directly.
- (Considered) CCR reversibility → the only variant conceivably safe near canon, since it doesn't silently drop a citizen name or vote count.
- **Net: nothing lifted.** See verdict — the two places it could apply are each ruled out.

**Not applicable / hazard:**
- **The edition pipeline needs the OPPOSITE of what this does (Mike, S250).** Compression — even reversible — optimizes for fewer tokens reaching the model. Canon-bearing work (editions, reviewer lanes, canon docs) needs *full fidelity*, not shrinking; a compressor in that path is a canon-drift risk by construction. Same no-go boundary as `GEMINI_OFFLOAD` (canon-bearing work + reviewer lanes + EIC seat).
- **The terminal-side token need is already addressed (Mike, S250).** Boot bloat — the place where context bulk actually bit — was solved by the governance.22 boot-burn work (progressive disclosure, on-demand reads, per-terminal scope). With that done, the residual non-canon token need doesn't justify taking a compression dependency *inside* the LLM path (infrastructure + maintenance risk of its own).

**Verdict:** `take-nothing`. The two candidate use-cases cancel: the canon path needs fidelity, not compression; the non-canon path's token problem is already handled by discipline. Adopting headroom would add an in-path dependency to solve a problem we no longer have, on the one set of paths where lossy/recoverable compression is most dangerous. Reviewed and passed, on Mike's call (I had hedged "watch"; the canon-fidelity + bootbloat-already-solved reasoning makes it a clean pass).

**Ignited plans:** none. This file is the tombstone — it exists so a future session greps it and does not re-review headroom. If the token economy ever changes such that a non-canon compression layer becomes worth a dependency, that's a *new* trigger, not a reopening of this verdict.

---

## Applications (living)

*Where this research has been used. Append a dated line if grep ever surfaces it.*

- 2026-06-01 — Filed as the live demo for the research-file template (`docs/plans/2026-06-01-doc-loop-consolidation.md`); first artifact in the new per-topic format.

---

## Changelog

- 2026-06-01 — Initial extraction (S250). Verdict take-nothing. Mike's rationale: edition pipeline needs the opposite of compression (canon fidelity); terminal token-burn already addressed via bootbloat work.
