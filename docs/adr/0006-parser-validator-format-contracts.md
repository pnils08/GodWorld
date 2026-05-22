---
title: "ADR-0006: Parser/validator format contracts — exemplar OR fail-loud, never silently corrupt"
created: 2026-05-22
updated: 2026-05-22
type: reference
tags: [architecture, infrastructure, decision, active]
sources:
  - "[[../plans/2026-05-22-c94-gap-log-triage]] §5 Pattern A — surfaced by 4 cluster recurrences"
  - "output/production_log_edition_c94_write_gaps.md G-W42 / G-W43 / G-W54 / G-W55 — load-bearing instances"
  - "output/production_log_edition_c94_print_gaps.md G-PR6 / G-PR7 — PDF-generator instance"
  - "output/production_log_edition_c94_post_publish_gaps.md G-P37 — ingest instance"
  - "[[adr/0001-adopt-context-and-adrs]] — ADR bar"
  - "[[adr/0005-rollout-plan-structure]] — pointer-style ADR shape"
pointers:
  - "[[../plans/2026-05-22-c94-gap-log-triage]] — parent plan that surfaced the pattern"
  - "[[../engine/ROLLOUT_PLAN]] — clusters C4 / C5 / C6 / C8 inherit this ADR's direction"
  - "[[../../MEMORY.md]] — S212 generation-vs-evaluation asymmetry (reviewer-lane architecture) is the family this ADR sits in"
  - "[[index]] — ADR registered same commit"
---

# ADR-0006: Parser/validator format contracts — exemplar OR fail-loud, never silently corrupt

**Status:** Accepted
**Date:** 2026-05-22 (S224)
**Deciders:** Mike (the Maker) + Mags

## Context

C94's gap-log triage surfaced the same architectural pattern in four different clusters:

- **C4 (Format-contract docs + emit script)** — `emitFormatContractSections.js` silently overwrote NAMES INDEX from strict pipe-format to bullet-prose, dropped 4 well-formed BUSINESSES NAMED rows to zero, and emitted `===` dividers into a file the downstream parser rejects on `^-{10,}$`. Reported success ("[INJECTED] NAMES INDEX (26 rows + 0 faith) + BUSINESSES NAMED (0)") with no warning that anything was wrong. The compile-template skill (Step 3) ships a partial spec with no canonical exemplar pointer — every cycle's compile pays a 10-15 minute editor-judgment cost reverse-engineering format from the prior published edition.
- **C5 (Reviewer-lane schema reconciliation)** — Rhea agent emitted `lane_score: 0.82` + `checks: [array]`; `rheaJsonReport.js` requires `score: <number>` + `checks: {<id>: {pass: bool, issues: [array]}}`. Two manual reformats per cycle. Mara claude.ai output vs `maraJsonReport.js`: three reformats per cycle (missing `#` H1, wrong bullet character, missing `## ` H2 prefix). The agent's own SKILL.md doesn't carry the parser's exact regex contract.
- **C6 (Capability + validateEdition detector calibration)** — `no-edition-numbers-in-article-text` BLOCKS publish on standard editorial-footer "E90" citations because the detector scope includes ARTICLE TABLE / NAMES INDEX / CITIZEN USAGE LOG instead of article body only. `three-layer-coverage` looks for engine-grammar tags in journalism prose. Female-citizens-count detector returns 0 when 3+ present (fails to resolve em-dash NAMES INDEX entries + POP-NNNNN against Simulation_Ledger gender col). `validateEdition` flags "ledger" metaphor as engine-language.
- **C8 (PDF generator parser bugs)** — Section-name `FRONT_PAGE` (DJ direction underscore) vs `FRONT PAGE` (PDF section header space) silently drops the FP1 photo from the rendered HTML despite QA-passing image existing on disk. Lede sentence used as headline across all 6 sections; EDITOR'S DESK has no headline at all because parser doesn't know where to extract it from for that section's structure. Edition shipped to Drive with run-on lede headlines and no front-page photo.

**Common shape across all four:** A parser, validator, emit script, or detector operates on a format contract that (a) is not documented anywhere the upstream producer can read, (b) accepts wrong-shape input without raising, and (c) emits "success" status while silently corrupting or dropping canon-bearing content. The downstream consumer never sees the failure until a human opens the artifact.

**The pattern is not a single skill-text fix.** It recurs across the reviewer stack (Rhea, Mara, capability, validateEdition), the ingest stack (emitFormatContractSections, ingestPublishedEntities), and the render stack (PDF generator). Different scripts, different owners, same anti-pattern.

**Mike-named principle** (already in MEMORY.md): "LLM generation vs evaluation asymmetry — review pass is mandatory; failure attribution lives upstream." Reviewer lanes exist because generators have no holistic quality compass. The S212 gen-eval architecture works at the prose layer (desk reporters → Rhea/cycle-review/Mara/capability/Final Arbiter) but the same discipline isn't applied to the parser/validator layer that the reviewer lanes themselves depend on. A capability detector that emits "PASS" on a footer false-positive is itself an ungated generator.

**Skill text vs parser contract:** Skills can document what an artifact SHOULD look like, but if the parser silently accepts the wrong shape, the contract is in the script's regex, not in the skill text. Every parser is the source of truth for its own contract; the skill is downstream documentation that drifts.

## Decision

**Every parser, validator, emit script, and detector in the GodWorld pipeline must satisfy one of two contracts:**

### Contract A — Ship a canonical exemplar

The parser ships a literal template file (e.g., `docs/media/EDITION_FORMAT_TEMPLATE.txt`, `docs/media/MARA_AUDIT_TEMPLATE.md`) that:

- Lives at a stable path (`docs/<domain>/<NAME>_TEMPLATE.<ext>`)
- Is registered in `docs/index.md` with a one-line summary
- Is referenced by name in the parser's source code (single-line `EXEMPLAR_PATH` constant or equivalent)
- Is referenced by name in every skill text that produces input the parser consumes
- Carries placeholder text that, when filled with real values, parses clean by the parser's own regex
- Is updated in the same commit as any parser regex change

If a producer (skill, agent, reporter, ingest helper) reads the exemplar first, they cannot produce wrong-shape input. The exemplar is the contract.

### Contract B — Fail loud, fail early

If shipping an exemplar is impractical (parser is too complex to template, or the input shape is dynamic), the parser must:

- Refuse to emit success when expected content is missing (e.g., emit script that produced 0 BUSINESSES from a section that mentions `BIZ-` must exit non-zero, not write empty + report success)
- Refuse to write malformed output that the downstream parser will reject (e.g., emit script that writes `===` dividers when the consumer requires `^-{10,}$` must error before write, not silently emit)
- Surface what was rejected and why in stdout with enough context to fix surgically (paths, line numbers, expected-vs-got snippet)
- Exit with non-zero status when canon-bearing content is dropped or corrupted

If the parser cannot satisfy A, it must satisfy B. **Silently emitting success on corrupted output is the anti-pattern this ADR retires.**

### What's NOT acceptable

- "Idempotent" reassurances that mask silent overwrite of hand-curated correct content (the C94 `emitFormatContractSections.js` failure mode)
- Defensive-fallback patterns that swap wrong-shape input for blank/placeholder output (the C94 NAMES INDEX bullet-prose substitution)
- Parser-contract knowledge that lives only in the regex source code, not the producer's skill text
- Verification gates that pass on count-of-rows-written without checking that rows match expected schema (the C94 G-P34 19% partial citizen-card write fail + G-P37 0-businesses parse with PASS status)
- Detectors that report PASS/FAIL on calibration noise (Engine B non-reporter candidates like Mags-EIC and DJ Hartley in the byline pool — G-S14)
- Cross-pattern stdout claims that contradict each other ("FRONT_PAGE → photo.png" in manifest block + "FRONT PAGE without photos" in diagnostic block, same script, same run — G-PR6)

## Alternatives considered

### Alt 1 — Sweep skill texts to match parser contracts

Update every skill that produces parser-consumable input to embed the parser's regex inline. Closes the documentation gap. Rejected: skill text drifts when parser changes; producers (reporters, ingest scripts, civic agents) each have to re-read the contract per cycle; the regex is still the source of truth, the skill is downstream. We've been doing this for ~6 cycles and it keeps re-drifting (G-W42 / G-W43 / G-W54 / G-W55 are all instances).

### Alt 2 — Loosen all parsers to accept multiple shapes

Make every parser shape-tolerant — `score` OR `lane_score`; pipe-format OR bullet-prose; `===` OR `---` dividers. Rejected: implementation cost is high across ~12 parsers, and tolerance hides drift instead of catching it. Downstream consumers still depend on canonical shapes (capability parser regex is one example) — loosening one layer pushes the failure to the next layer.

### Alt 3 — Replace parsers with structured-output LLM calls

Use a generation-mode LLM to map free-form input to schema-conforming output. Rejected: introduces nondeterminism in the deterministic-guardrails layer; the parser stack is exactly where deterministic fitness functions belong (Mezzalira pattern, MEMORY.md project_deterministic-guardrails-framing). The reviewer-lane architecture already does LLM-side review; the parser layer should stay mechanical.

### Alt 4 — Status quo + manual hand-correction every cycle

Accept that 5-15 minutes of editor-judgment per cycle goes to format reconciliation. Rejected: the pattern compounds. C94 surfaced four clusters; C93 had two. Each cycle adds new producers without contract enforcement; the manual-correction tax grows with the project.

## Consequences

### Positive

- **Silent canon corruption is structurally prevented.** Either the producer reads the exemplar and produces conforming output, or the parser refuses to emit success on non-conforming input. The "silent overwrite + report success" path is closed.
- **The contract has one source of truth per parser.** Either the exemplar file (Contract A) or the parser's error messages with expected-vs-got snippets (Contract B). Producers stop having to grep into parser regexes.
- **The pattern fixes itself going forward.** New parsers added under this ADR pay the contract cost at write-time, not at downstream consumer time. Drift-and-rediscover cycles end.
- **Aligns with existing S212 reviewer-lane gen-eval architecture.** Reviewer lanes evaluate prose; this ADR extends the same discipline to the parser/validator stack that reviewers themselves depend on. Same family, fully applied.

### Negative

- **Higher upfront cost per parser.** Each parser needs either an exemplar file shipped + registered + back-linked, or a fail-loud rewrite with diagnostic stdout. Both are work. Roughly 20-40 minutes per parser × ~12 parsers = 4-8 hours one-time investment.
- **Exemplar files must stay in sync with parser regex.** Drift between exemplar and regex re-creates the silent-fail surface this ADR closes. Mitigation: ADR §Decision requires same-commit updates; parser commits without exemplar updates flag for review.
- **Some parsers may be impractical to template** (Contract A) AND complex to rewrite to fail-loud (Contract B). Edge cases need case-by-case judgment at Phase 2 cluster execution. Default: if neither contract fits cleanly, the parser is itself a candidate for replacement, not preservation.

### Neutral

- Phase 2 cluster execution (C4/C5/C6/C8) becomes the ADR's first proving ground. If the discipline holds across the four clusters, the pattern is durable. If it breaks at one cluster, the ADR gets revised — see reversal triggers below.

## How to apply

When designing or modifying any parser/validator/emit-script/detector:

1. **Triage** — does the script produce structured output a downstream consumer parses? If yes, this ADR applies.
2. **Pick a contract** — A (ship exemplar) for stable formats (templates, schemas, fixed JSON shapes); B (fail loud) for dynamic formats (parser scoping rules, calibration thresholds).
3. **For Contract A** — write the exemplar at `docs/<domain>/<NAME>_TEMPLATE.<ext>`; register in `docs/index.md` with one-line summary; reference by name in the parser source (single-line `EXEMPLAR_PATH` constant); reference by name in every skill text that produces parser input.
4. **For Contract B** — list every failure mode the parser silently accepts today; add exit-non-zero + diagnostic stdout for each; verify against the canonical instance that previously silently corrupted.
5. **Test the contract** — produce known-bad input, run the parser, confirm either (A) the exemplar prevented the bad input from being produced OR (B) the parser refused to emit success.
6. **Commit the exemplar + parser + skill update in one commit** — partial application of this ADR re-creates the drift surface it closes.

## Reversal triggers

This ADR is **revised or retired** if:

- Phase 2 cluster execution shows that fail-loud (Contract B) is consistently too brittle for production use (e.g., reviewer lanes start blocking on transient calibration noise that would have passed at downstream consumer). Trigger: 3+ cycles of cluster-execution work where Contract B blocks valid output. Revision path: tighten the "what counts as canon-bearing content" threshold to reduce fail-loud surface.
- Exemplar files (Contract A) drift from parser regex in 3+ cycles despite same-commit discipline. Trigger: drift recurrence indicates the same-commit rule isn't enforceable. Revision path: ship a tooling layer that asserts exemplar + parser parity at commit time (pre-commit hook).
- A higher-level architectural change (e.g., parser stack migrates to structured-output LLM calls at scale) makes the exemplar-vs-fail-loud distinction moot. Trigger: pipeline shift renders the ADR's framing obsolete.
- Phase 2 cluster execution finds a third contract pattern that's neither A nor B but works empirically. Trigger: empirical evidence trumps theoretical framing.

## Changelog

- 2026-05-22 — Initial draft (S224, research-build). Surfaced by [[../plans/2026-05-22-c94-gap-log-triage]] §5 Pattern A. Cuts across clusters C4 / C5 / C6 / C8. Phase 2 cluster execution is the first proving ground.
