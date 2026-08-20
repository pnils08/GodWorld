---
name: lore-ingest
description: Grade a quarantined lore piece and promote it into canon — Rhea pass sends it to BOTH NotebookLM and bay-tribune, a fail sends it to the local rejection log and nowhere else. The gate half of pipeline.59; the generation half is /lore-writer.
version: "1.0"
updated: 2026-08-20
tags: [canon, lore, notebooklm, supermemory, active]
effort: medium
disable-model-invocation: true
---

# lore-ingest — Promote or Reject a Quarantined Lore Piece

## What this is

The gate between `output/lore-quarantine/` and canon. `scripts/loreWriter.js` (pipeline.56) generates; this grades and branches. Nothing sits ungoverned on disk once graded — a piece either enters both canon stores or lands in the rejection log.

**Grading is never delegated to agy — Rhea/Claude only.** `scripts/loreIngest.js` does not grade at all: it takes a verdict you produce here and executes the mechanical branch. That split is the guardrail, so no lower-tier model can decide what enters canon (`docs/MODEL_HIERARCHY.md` §4, goal-substitution risk).

## Steps

1. **Read the piece.** Every named person, place, org, and number is a claim.
2. **Verify the claims against the ledger** — `mcp__godworld__lookup_citizen` / `queryLedger.js citizen <POPID>` for people, `lookup_business` / `lookup_cultural` / `search_canon` for the rest. Texture (weather, mood, dialogue, scenes) is invented freely and is not a claim. The test for any sentence: could a ledger query contradict it? If yes, it must be verified.
3. **Run the Rhea gate** — the `rhea-morgan` agent, same as an edition. Fail conditions: an invented family member, career, or household; a citizen rendered as someone the ledger contradicts; a cycle reference that puts an event where the ledger does not.
   - **Derived engine numbers are a fail on sight**, whether or not they currently match. WealthLevel, tier, scores, ratings — the engine is the cause, never the content (`feedback_canon-is-color-not-data-echo`). Quoting one writes it into canon twice and freezes a value that moves; `WealthLevel` in particular is mid-drift under `engine.120`. Age, income, role, neighborhood, family, and named events are facts to verify; a banded score is not a fact to quote.
   - **Check the cycle math, don't trust the tag.** `n = floor((cycle-1)/52)+1`, `m = ((cycle-1)%52)+1` — cycle 103 is `Y2C51`, and `m` can never exceed 52. `Y2C103` is malformed no matter where it was copied from; `editions/cycle_pulse_c103.txt` carries it too. A calendar year in a bio (Vinnie's 2031 championship) is a YEAR, not a cycle.
4. **Pick the cycle tag.** `Y<n>C<m>` for where the piece is PLACED, not the first one its body happens to mention — a lore piece legitimately names several cycles. Placement is a judgment call made here and passed as `--tag`; it is authoritative downstream.
5. **Branch.**

```
# PASS — both canon stores, then the source id is recorded in the policy
node scripts/loreIngest.js --file output/lore-quarantine/<piece>.md --verdict pass --tag Y2C103

# FAIL — local rejection log only, neither store is touched
node scripts/loreIngest.js --file output/lore-quarantine/<piece>.md --verdict fail --reason "<what Rhea failed it on>"

# Prove the wiring without touching either store
node scripts/loreIngest.js --file <piece> --verdict pass --tag Y2C103 --dry-run
```

6. **After a pass, re-validate the source policy:**

```
node scripts/notebooklmSourceInventory.js          # refresh the inventory from the live notebook
node scripts/notebooklmCanonSourcesValidate.js     # fail_closed check over every bucket
```

The validator is fail-closed: a lore source id must be in the regenerated inventory AND carry a `decisions` entry, both of which `loreIngest.js` handles. Any *other* unclassified source it reports is a pre-existing canon-gate question for research-build, not something to classify from this skill.

## What lands where

| Verdict | NotebookLM (canon authority) | bay-tribune (Supermemory) | Local |
|---|---|---|---|
| pass | `Lore: <slug> (Y<n>C<m>)` in the GodWorld notebook (`config/notebooklm.json` → `notebookId`, NOT `newsroomNotebookId`) | `type=lore`, `cycle=<m>`, container `bay-tribune` | source id → `allowedLoreSourceIds` |
| fail | never | never | `output/lore-quarantine/_rejected.log` |

Audio overviews are always off for lore (quota is for editions). The notebook summary is opt-in and writes to a slug-named path, so a lore push can never overwrite an edition's `output/nlm_summary_c<N>.md`.

## Known texture

- Lore pieces have no `## INTAKE` block, so `ingestEdition.js` warns and ingests as legacy content. Do not pass `--require-intake`.
- The metadata strip drops a trailing `**NAMES INDEX**` / `**CITIZEN USAGE LOG**` block (bold form) but keeps a plain `NAMES INDEX` one. Both are harmless; the body prose is never touched.

## Full spec

`docs/plans/2026-08-17-lore-canon-ingest-pipeline.md` (pipeline.59). Generation half: `.claude/skills/lore-writer/SKILL.md` (pipeline.56).
