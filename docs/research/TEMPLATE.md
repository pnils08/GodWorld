---
title: Research File Template
created: 2026-06-01
updated: 2026-06-01
type: reference
tags: [research, architecture, active]
sources:
  - docs/plans/2026-06-01-doc-loop-consolidation.md — the plan that locked this shape (S250)
  - docs/plans/TEMPLATE.md — sibling plan template; same self-contained discipline
  - docs/SCHEMA.md §3 (frontmatter), §7 (folder map), §12 (changelog)
  - docs/engine/ROLLOUT_PLAN.md §Convention — State labels (S204) + Watch List
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state lives here, NOT in a research file"
  - "[[../plans/TEMPLATE]] — sibling: research is the standing library, a plan is the project that checks it out"
  - "[[index]] — register every new research instance in the docs/research/ sub-catalog (NOT top-level index.md)"
  - "[[../SCHEMA]] — doc conventions"
---

# Research File Template

**Every deliberate research piece uses this shape.** Copy the fenced block, rename to `docs/research/YYYY-MM-DD-<topic>.md`, fill it in, delete the instructional italics, add a row to `docs/research/index.md` in the same commit.

**What a research file IS:** a **source-mining record**. One external source in — paper, link, PDF, txt — and one question out: *what in here is usable for the sim, and where could it apply?* You extract that in the sim's own terms and leave it grep-able so a future need turns up work already done. We are stealing what we can use.

**What it is NOT:** a learning log (that was the old monolithic `RESEARCH.md`, now frozen), and not a plan (a plan ignites *from* research and points back — the research never clouds the plan).

---

## Template

Copy everything below the fence. Delete the italics once filled.

```markdown
---
title: [Source Name] — research
created: YYYY-MM-DD
updated: YYYY-MM-DD
type: reference
tags: [research, <domain>, active]
sources:
  - [path / URL / Drive-ID — cite precisely, never title-only (S145); note "Mike-shared S<N>" if so]
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home"
  - "[[index]] — register here, same commit"
---

# [Source Name] — research

**Source:** [What we reviewed. Path / URL / Drive-ID + author + date. Mike-shared S<N> if applicable.]

**What this addresses:** [The deliberate trigger. Which corner of the sim made me pull this source? One or two sentences. This is the line that separates deliberate research from the old learning log — deliberate research has a target.]

**What it does:** [The source's own mechanism, in source-terms. 2–4 sentences. Enough that the reader understands the thing without opening it.]

**Extraction — what's usable:** [The heart. Each finding stated as *principle → sim-area it serves*. Write it in SIM terms, not source terms — "eviction-by-recency → citizen sentiment slots", not "bounded-memory eviction with recency decay". Source-term summaries are dead weight; sim-mapped extractions are what grep turns up.]
- [principle → sim-area]
- [principle → sim-area]

**Not applicable / hazard:** [The measure-twice negative. What we evaluated and set aside, and why. Any canon-fidelity / cost / dependency hazard. This stops a future session re-litigating the same source.]

**Verdict:** [`adopt` | `watch` | `take-nothing`]
- **adopt** → ignites a plan; the plan gets a `ready` ROLLOUT row, terminal-tagged.
- **watch** → goes on the ROLLOUT Watch List with the trigger condition named; graduates to a `ready` row when the trigger fires.
- **take-nothing** → nothing usable; this file is the tombstone so we don't re-review. No ROLLOUT row.
[State the verdict + the why in one or two sentences. If watch, name the adopt-trigger explicitly.]

**Ignited plans:** [Forward pointers to any plan that came out of this — `[[../plans/YYYY-MM-DD-topic]]`. "none" is a valid answer (take-nothing, or watch-not-yet-fired).]

---

## Applications (living)

*A reuse index — where this research has actually been used. APPEND a dated line each time grep surfaces this file for a new corner of the sim. This is the retrieval payoff: the at-a-glance "what did we already steal and where did it land." Distinct from the Changelog (which is edit-history).*

- YYYY-MM-DD — [where it got used / what cited it]

---

## Changelog

- YYYY-MM-DD — Initial extraction (S<N>).
```

---

## How to use this template

### Two rules that make the loop work

1. **A research file carries a VERDICT, never a STATE.** Pending-ness is ROLLOUT's job — it's the status board every terminal reads at boot. The research file is the standing library: passive, grep-able, holds knowledge + verdict + trigger. Don't put `ready` / `in-progress` / `pending` in a research file — that duplicates ROLLOUT and drifts (file says pending, board says done — which is true?). The verdict *routes* the rollout entry: take-nothing → no row; adopt → a `ready` row; watch → the Watch List with a trigger. A terminal knows research is pending because it reads ROLLOUT, not because it opens the research file.

2. **Research never archives.** Unlike a plan — which finalizes and ships its rollout pointer to `ROLLOUT_ARCHIVE` — a research file is a standing library book. Its whole value is staying grep-able forever and accreting applications. It does not move to archive. The plan lifecycle finalizes and exits; the research lifecycle stays open by design.

### The research/plan boundary

- **Research** answers *what's true / what are the options.* It lives here, grep-able, living.
- **Plan** answers *what we'll build / the tasks.* It cites the research via `Research basis:` and stays clean — it carries the pointer + the one line we took, never the research bulk.
- The research file lists `Ignited plans:` forward; the plan cites `Research basis:` back. Bidirectional link, zero content duplication. *"We don't want the research clouding the plan, but we need it to measure twice"* — the research IS the measure-twice substrate, sitting behind the plan via a pointer.

### Registration (no isolated MDs)

- New research instance → add a row to `docs/research/index.md` (the sub-catalog), same commit. **Instances do NOT go in top-level `docs/index.md`** — that file is a boot read, and "research never archives" means the corpus only grows; the sub-catalog keeps boot-burn flat.
- This TEMPLATE (a reference doc, not an instance) is the exception: it's registered in top-level index.md + research-build TERMINAL.md + SCHEMA §7.

### Why no Supermemory in the loop

The doc layer here is authoritative. claude-mem already auto-captures the *why* semantically (the build observations), for free, no discipline required. A hand-written Supermemory mirror of a research file would be a third, drift-prone copy — exactly the pollution that got the `mags` container neutralized. `/save-to-mags` stays deliberate and by-exception (purely-conversational reasoning that lands in no doc), never a mirror of a research file.

---

## Changelog

- 2026-06-01 — Initial draft (S250). Shape locked in `docs/plans/2026-06-01-doc-loop-consolidation.md`, co-designed with Mike. Mirrors the plan-template discipline; adds the Applications living reuse-index, the verdict enum, the verdict-not-state rule, and the never-archives lifecycle. Advisor pressure-test folded in (Applications split from Changelog; sub-catalog registration for boot-burn).
