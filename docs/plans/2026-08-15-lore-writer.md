---
title: Lore writer — long-form world depth, ledger-grounded
created: 2026-08-15
updated: 2026-08-15
type: plan
tags: [pipeline, canon, architecture, active]
sources:
  - github.com/Doriandarko/gemini-writer — upstream loop; local clone /root/gemini-writer (tested 2026-08-15)
  - ~/.gemini/antigravity-cli/brain/5e9ce5a3-*/autonomous_newsroom_plan.md — antigravity's port proposal, superseded by this plan
  - output/vinnie_keane_feature/the_grease_trap_prophet.md — the ungrounded baseline run; every failure class below is drawn from it
  - scripts/queryLedger.js — the read surface
  - docs/canon/INSTITUTIONS.md — canon authority
pointers:
  - "[[engine/ROLLOUT_PLAN]] — pipeline.56"
  - "[[../canon/INSTITUTIONS]] — canon authority for places, orgs, venues"
  - "[[2026-08-15-cross-lane-message-bus]] — governance.47, how the handoff to antigravity is delivered"
  - "[[index]] — registered same commit"
---

# Lore writer

**Terminal:** antigravity (`agy`) implements. research-build owns this spec, reviews all output, and holds the canon gate.

**Goal:** a long-form generator that produces multi-file world depth — a Baylight construction history, a Keane family saga across generations, twenty neighborhood origin stories — grounded in the ledger for every fact and free to invent everything else.

**This is a new layer, not a replacement.** `cron-desk-run.js` produces cycle-bound journalism and already grounds it (`ensureLedgerSnapshot()` + POPID-keyed briefs). It structurally cannot produce long-form: it reports one cycle at a time. Lore is the substrate underneath the journalism, and GodWorld has never had a way to write it at volume.

## 1. Why the upstream tool fails as-is

`gemini-writer` has exactly three tools: `create_project`, `write_file`, `compress_context`. **It has no read tools.** It writes from the prompt and its own context, nothing else.

Baseline run, 2026-08-15, prompt mentioned Bay Tribune standards. Output (`the_grease_trap_prophet.md`) against ledger truth:

| It wrote | Ledger / canon |
|---|---|
| Vinnie Keane, "Senior Investigative Reporter, Bay Tribune" | POP-00001, **Designated Hitter, Oakland A's Legend**, age 38, Rockridge, married Amara Keane |
| "freight-hoverers", "digital ghost" | prosperity-era Oakland; no sci-fi tech |
| rain-soaked noir decay | prosperity-era; the opposite of a struggle zone |
| "Cycle 442, Post-Rain Interval" | `Y2C103` |
| "Access Level: 4 (Editorial)" | no such system |
| "Lucky" / Lucky's Diner | ~1,366 tracked citizens exist; inventing more is the documented failure |

Note what it got **right**: the `NAMES INDEX` / `CITIZEN USAGE LOG` block is real format contract, parsed by `editionIntake.js`, `ingestPublishedEntities.js`, `verifyNamesIndexParse.js`. It knew the shape and filled it with fiction. **The defect is ungrounded values, not bad prose or invented schema.** Read tools close it.

## 2. The seam — the load-bearing rule

**Ledger facts are READ, never written.** Name, POPID, role, age, gender, neighborhood, income, career stage, employer, household, spouse, children, status, tier. These come from `queryLedger.js` or they do not appear. A citizen's job is not the model's to decide, ever.

**Texture is INVENTED, and that is the entire point.** Interiority, sensory detail, dialogue, private motive, the weather of a room, what a farewell season feels like from the inside. None of it is in a spreadsheet and none of it should be. Per [[../../MEMORY|subjective-hallucination-is-canon]] the wall is subjective→canon-*publication*, not invention itself.

**The test for any sentence:** could a ledger query contradict it? If yes, it must be read. If no, invent freely.

## 3. Tool contract

| Tool | Direction | Backed by | Notes |
|---|---|---|---|
| `query_ledger` | read | `scripts/queryLedger.js citizen\|pair\|initiative\|council\|neighborhood` | The identity surface. Prefer POPID over name. |
| `read_canon` | read | `docs/canon/INSTITUTIONS.md`, `docs/canon/CANON_RULES.md` | Places, orgs, venues, district anchors. |
| `search_articles` | read | `queryLedger.js articles <term>` | What has already been published — prevents contradicting prior canon. |
| `create_project` | write | upstream | Quarantine root only. |
| `write_file` | write | upstream, **path-clamped** | Quarantine root only. |
| `compress_context` | internal | upstream | Unchanged. |

**Path clamp is mandatory.** `write_file` must reject any path outside `output/lore-quarantine/`. Not by convention — by a check in the tool that throws. A model with a write tool aimed at `output/` or `docs/entities/` is a direct canon-contamination path, and canon ingestion has run scripted with no hand-review gate since 2026-08-12.

**System prompt must carry:** the seam (§2), cycle format `Y<n>C<m>`, prosperity-era tone, "no invented citizens — query for real ones," and an instruction to call `query_ledger` for **every** named person before writing them.

## 4. Pipeline

```
agy loop → output/lore-quarantine/<project>/*.md
         → Rhea review
         → research-build reads
         → docs/entities/ or NotebookLM   [gated, manual, never automatic in v1]
```

Nothing moves out of quarantine without Rhea passing and me reading it. v1 does not automate the promotion step.

## 5. Acceptance criteria

1. `query_ledger` returns real ledger data inside the loop and the model's output reflects it.
2. **The Vinnie test:** a deep-dive on POP-00001 renders him as a Designated Hitter / Oakland A's Legend, in Rockridge, married to Amara Keane. This is the exact sentence the baseline got wrong; it is the regression test.
3. `write_file` to any path outside `output/lore-quarantine/` throws.
4. Every human name in the output either resolves to a real POPID or is explicitly flagged as invented in the `NAMES INDEX`.
5. Zero cycle references outside `Y<n>C<m>` format.
6. Rhea scores the output; a FAIL blocks promotion.

## 6. Tasks (antigravity)

| # | Task | Verify |
|---|---|---|
| 1 | Port the loop to Node with Gemini function-calling; system prompt carries §2 + §3 rules | `--dry-run` exits 0 |
| 2 | Wire the three read tools to `queryLedger.js` / canon files | `"Look up POP-00001"` returns real DH record |
| 3 | Path-clamp `write_file` to the quarantine root; throw otherwise | AC #3 |
| 4 | Full run: Vinnie Keane farewell-season deep dive | AC #2, #4, #5 — output read by research-build before anything else happens |

## 7. Pre-mortem

- **Model skips the read tool.** The baseline ran 45 iterations and never looked anyone up. Mitigation: system prompt makes `query_ledger` mandatory per named person; AC #4 catches it after the fact.
- **Ledger query returns nothing and the model fills the gap.** Must fail loud, never soft-fall-back to invention — same discipline as `canonNeighborhoodLoader`.
- **Volume amplifies error.** One wrong article is one cycle; wrong lore is foundational and everything written later inherits it. This is why v1 promotion stays manual.
- **Quarantine becomes a dumping ground.** 300-iteration runs produce a lot of files. Unreviewed lore sitting in the repo starts looking authoritative. Sweep or promote; don't accumulate.

## Changelog

- 2026-08-15 — Initial spec (research-build). Supersedes antigravity's `autonomous_newsroom_plan.md`: routing corrected to research-build, framing corrected from pipeline-replacement to lore layer, invention seam added as the core contract.
- 2026-08-27 — Weekly cron added (pipeline.61, research-build): `scripts/cron-lore-run.js` runs Fridays 15:00, generation only — the plan's §4 pipeline and §7 pre-mortem ("v1 does not automate the promotion step") are unchanged, grading still requires a Rhea/Claude read per `.claude/skills/lore-ingest/SKILL.md`. `scripts/loreTargetSelect.js` fills the target-selection gap the original spec left implicit (every run through 2026-08-20 was hand-picked): round-robins Tier-1/2 citizens with no passed lore entry, cursor-persisted in `output/lore-target-cursor.json`.
