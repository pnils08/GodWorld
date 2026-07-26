---
title: NotebookLM Source-Search Wiring Plan
created: 2026-07-25
updated: 2026-07-26
type: plan
tags: [architecture, infrastructure, media, active]
sources:
  - docs/engine/archive/ROLLOUT_PLAN.md research.23
  - docs/plans/2026-07-10-notebooklm-bridge-deploy.md
  - docs/research/2026-07-10-notebooklm-mcp.md
  - docs/research/2026-07-19-headless-cron-newsroom-agentic-rag.md
  - docs/adr/0012-autonomous-deep-dispatch-write-edition.md
  - docs/reference/notebookLM-CLI.md
  - .claude/agents/source-search/SKILL.md (read-only control-plane consumer)
  - scripts/godworld-mcp.py
pointers:
  - "[[../engine/archive/ROLLOUT_PLAN]] — parent rollout, research.23"
  - "[[2026-07-10-notebooklm-bridge-deploy]] — live CLI, post-publish, and daily-news bridge"
  - "[[2026-07-20-headless-newsroom-pipeline]] — later headless consumer"
  - "[[../reference/notebookLM-CLI]] — operator guide and authority boundaries"
  - "[[../SUPERMEMORY]] — sibling retrieval system; separate audit required"
  - "[[../index]] — registered with this plan"
---

# NotebookLM Source-Search Wiring Plan

**Goal:** Give GodWorld's existing `source-search` agent a bounded,
source-scoped NotebookLM lane for published-storyline research without granting
it mutation tools, weakening current-state authority, or making mixed-source
NotebookLM prose directly retrievable as canon.

**Architecture:** Keep the existing retrieve→verify agentic-RAG loop as the
authority boundary. A new read-only Node wrapper targets only the configured
permanent notebook and only builder-approved source IDs; `source-search` invokes
it only for prior published arcs, then verifies its citations against primary
current state and the cited publication sources. Exact/current lookups remain
GodWorld MCP or file reads. Headless use is a later consumer after the
interactive path is measured.

**Terminal:** research-build

**Pointers:**

- Existing agent: `.claude/agents/source-search/SKILL.md`
- Interactive consumers: `.claude/skills/deep-dispatch/SKILL.md`,
  `.claude/skills/sift/SKILL.md`, `.claude/skills/city-hall-prep/SKILL.md`
- Existing thin canon locator: `scripts/godworld-mcp.py::search_canon`
- Existing headless disk-search loop: `scripts/cron-desk-writer.js`
- Notebook configuration: `config/notebooklm.json`

**Verified starting state (2026-07-25):**

- `/deep-dispatch` Step 3 and Step 4, `/sift`, and `/city-hall-prep`
  instruction-wire `source-search`.
- No current production artifact records a `source-search` invocation or return.
- The headless newsroom scripts do not invoke `source-search`.
- `source-search` allows only `Read`, `Glob`, `Grep`, and read-only `Bash`; it has
  neither GodWorld MCP nor NotebookLM tools.
- `search_canon` returns five similarity-ranked Supermemory hits without
  provenance filtering, recency ordering, synthesis, or reconciliation.
- A live `search_canon`-equivalent query found useful C100/C101 records but also
  returned a Mara directive from the nominally published-only `bay-tribune`
  container.
- The permanent NotebookLM notebook contains mixed source classes, including a
  draft and a world summary. A live NotebookLM cross-Cycle query returned strong
  citations but conflated one attribution in its prose.

**Locked decisions:**

1. NotebookLM is the prior-published-storyline lane, not the default search
   engine and not a current-state authority.
2. No full NotebookLM MCP is granted to the `dontAsk` retrieval agent.
3. Source IDs are fail-closed through an explicit reviewed allowlist. Title
   patterns may propose review buckets but never confer canon status.
4. NotebookLM answers must return citations and be verified before reaching a
   Brief, charge, Article, or reviewer lane as fact.
5. Only the prior-arc `source-search` seat in a bounded fan-out uses NotebookLM;
   raw-cycle and current-state seats stay deterministic.
6. Headless integration waits for an instrumented interactive proof.
7. Supermemory setup/corpus purity is reviewed in a separate session. It may
   improve the first-hop locator but does not block building the NotebookLM
   fail-closed surface.

**Acceptance criteria:**

1. A source inventory reports every permanent-notebook source and marks each as
   `publication_candidate`, `nonpublication_candidate`, `exclude_candidate`, or
   `needs_review` without automatically authorizing any source.
2. A builder-approved source policy contains explicit allowed and excluded
   source IDs, with no ID in both sets and no unknown ID silently accepted.
3. The query wrapper can perform only `nlm notebook query` against the configured
   permanent notebook and policy-approved source IDs.
4. Missing policy, empty allowlist, authentication failure, invalid JSON, absent
   citations, or unrecognized source IDs fail loudly and non-zero.
5. The Claude-owned `source-search` contract routes only published-arc questions
   to the wrapper and preserves current-state reconciliation and per-claim
   citations.
6. `/deep-dispatch`, `/sift`, and `/city-hall-prep` record which retrieval lane
   ran, sources/citations returned, and reconciliation outcome.
7. One interactive proof catches a planted citation/prose mismatch and prevents
   the bad claim from reaching writer context.
8. The live headless newsroom remains unchanged until criteria 1–7 pass.

---

## Tasks

### Task 1: Inventory the permanent notebook without assigning canon

- **Files:**
  - `scripts/notebooklmSourceInventory.js` — create
  - `scripts/notebooklmSourceInventory.test.js` — create
  - `output/codex/notebooklm-source-inventory.{json,md}` — generated diagnostic
- **Steps:**
  1. Read the permanent notebook ID from `config/notebooklm.json`.
  2. Call only `nlm source list <id> --json`.
  3. Preserve source ID, title, and reported type.
  4. Apply conservative review buckets based on title signals. State explicitly
     that buckets are suggestions, not canon decisions or runtime allowlists.
  5. Emit machine-readable JSON plus a builder review table.
- **Verify:** `node scripts/notebooklmSourceInventory.test.js` passes, then one
  read-only live run reports the notebook's current source count.
- **Status:** [x] done 2026-07-25 — synthetic tests passed; the read-only live
  run preserved IDs/types for 51 sources and reported 31 publication candidates,
  3 non-publication candidates, 1 explicit draft exclusion, and 16 rows needing
  review. Zero sources were authorized.

### Task 2: Approve a fail-closed source policy

- **Files:**
  - `scripts/notebooklmCanonSources.json` — create
  - `scripts/notebooklmCanonSourcesValidate.js` — create
  - `scripts/notebooklmCanonSourcesValidate.test.js` — create
  - `output/codex/notebooklm-source-inventory.{json,md}` — read
- **Steps:**
  1. Builder or Claude reviews every source inventory row.
  2. Classify source IDs into `allowedPublishedSourceIds`,
     `allowedCanonReferenceSourceIds`, and `excludedSourceIds`.
  3. Record a short reason for every non-publication reference admitted.
  4. Reject duplicate IDs, unknown IDs, and any source left implicitly allowed.
- **Verify:** policy validator reports all inventory IDs accounted for and zero
  cross-bucket duplicates.
- **Status:** [x] done 2026-07-25 — builder instructed Codex to proceed;
  raw-content and repository provenance review classified all 51 source IDs as
  26 published, 6 verified Richmond Archive references, and 19 excluded.
  Validator reports zero cross-bucket duplicates, unknown IDs, or unclassified
  IDs.

### Task 3: Build the read-only canon-search wrapper

- **Files:**
  - `scripts/notebooklmCanonSearch.js` — create
  - `scripts/notebooklmCanonSearch.test.js` — create
  - `scripts/notebooklmCanonSources.json` — read
  - `config/notebooklm.json` — read only
- **Steps:**
  1. Accept a question and optional policy-approved source subset.
  2. Resolve the notebook ID only from the existing configuration.
  3. Invoke the full-path CLI with only `notebook query`, `--json`,
     `--source-ids`, and a bounded timeout.
  4. Reject empty source scope, missing citations/references, or citations outside
     the approved policy.
  5. Return a compact JSON contract containing answer, citation map, source
     excerpts, and conversation ID.
- **Verify:** synthetic tests prove all fail-closed cases without contacting
  NotebookLM.
- **Status:** [x] done 2026-07-25 — wrapper defaults to the 26-source published
  scope, requires explicit opt-in for the 6 Richmond Archive references, invokes
  only the configured permanent notebook with explicit source IDs, and rejects
  missing/out-of-policy citations, excerpts, sources, or conversation IDs.
  Synthetic fail-closed tests pass without contacting NotebookLM.

### Task 4: Add an instrumented live read-path proof

- **Files:**
  - `output/codex/notebooklm-source-search-proof.json` — generated diagnostic
- **Steps:**
  1. Run one cross-Edition storyline query through the wrapper.
  2. Record selected source IDs, citations, and wall time.
  3. Include one fixture where answer prose disagrees with its cited excerpt.
  4. Verify the reconcile layer rejects the prose claim and retains the cited
     source fact.
- **Verify:** proof reports `mismatchCaught: true`; no NotebookLM source,
  notebook, Studio artifact, Drive file, Sheet, or canon record changes.
- **Status:** [x] done 2026-07-25 — one published-only query across Editions 98,
  100, and 101 used all 3 selected source IDs and returned 14 citation mappings
  with 14 matching excerpts in 26.4 seconds. The 51-source snapshot hash was
  unchanged before/after. A `NONCANON_TEST` attribution mismatch was rejected
  and its cited source fact retained (`mismatchCaught: true`). Query chat-history
  persistence was the only expected NotebookLM side effect.

### Task 5: Hand off the protected source-search contract change

- **Files:**
  - `.claude/agents/source-search/SKILL.md` — Claude/research-build modify; Codex read only
  - `.claude/skills/deep-dispatch/SKILL.md` — Claude/research-build modify; Codex read only
  - `.claude/skills/sift/SKILL.md` — Claude/research-build modify; Codex read only
  - `.claude/skills/city-hall-prep/SKILL.md` — Claude/research-build modify; Codex read only
- **Steps:**
  1. Add a three-lane router: exact/current, cross-file reconcile, and prior
     published arc.
  2. Allow the prior-arc lane to invoke only
     `node scripts/notebooklmCanonSearch.js`.
  3. Require citation verification, source-class labels, and current-state
     reconciliation in the return contract.
  4. Keep the ≤3 subagent cap and do not grant NotebookLM or Agent capability to
     desk reporters.
- **Verify:** Claude shows the protected diff and a synthetic dispatch returns
  the expected lane without writing publication artifacts.
- **Status:** [~] Codex handoff ready 2026-07-25 — exact protected change and
  validation contract written to
  `output/codex/notebooklm-source-search-claude-handoff.md`. Awaiting
  Claude/research-build protected diff and synthetic dispatch; Codex did not
  modify the control plane.

### Task 6: Add retrieval observability

- **Files:**
  - `scripts/notebooklmCanonSearch.js` — modify
  - protected consumer skills — Claude-owned changes from Task 5
  - `output/` run-log location selected by the owning pipeline — generated
- **Steps:**
  1. Log lane, sanitized question hash, selected source IDs, citation count,
     duration, and reconcile verdict.
  2. Do not log answer bodies by default; the cited return remains in the
     orchestrator context only.
  3. Distinguish `not_run`, `no_result`, `auth_failure`, `citation_failure`, and
     `verified`.
- **Verify:** one interactive dry proof leaves a traceable retrieval record and
  no canon-facing artifact.
- **Status:** [ ] not started

### Task 7: Evaluate headless consumption after interactive proof

- **Files:**
  - `scripts/cron-desk-run.js` — inspect first; live automation modification
    requires separate explicit approval
  - `scripts/cron-desk-writer.js` — inspect first; live automation modification
    requires separate explicit approval
  - `docs/plans/2026-07-20-headless-newsroom-pipeline.md` — update only with its
    owner's approval
- **Steps:**
  1. Measure whether a precomputed, verified prior-arc digest improves a staged
     Article versus the current disk-search lane.
  2. If adopted, place retrieval before composition in the orchestrator; do not
     give the writer direct NotebookLM access.
  3. Keep all output behind the existing probation and Rhea gates.
- **Verify:** paired staged samples show attribution/canon results and cost; no
  autonomous publication or ingestion is enabled.
- **Status:** [ ] not started

### Task 8: Run a separate Supermemory setup and corpus-purity audit

- **Files:**
  - `docs/SUPERMEMORY.md` — read
  - `scripts/godworld-mcp.py` — read
  - local Supermemory plugin v0.0.12 hooks/settings shape — read without
    credential contents
  - `https://github.com/supermemoryai/claude-supermemory` — upstream source
  - `output/codex/` — audit report if requested
- **Steps:**
  1. Compare GodWorld's custom container model and neutralized capture posture to
     upstream v0.0.12 reasoned recall and unified repository memory.
  2. Audit `bay-tribune` for non-published records and `world-data` for narrative
     contamination using metadata only before sampling content.
  3. Review `search_canon` search mode, threshold, recency, provenance, and
     aggregation behavior.
  4. Propose cleanup or retrieval changes separately; do not delete, reingest,
     retag, or re-enable capture during the audit.
- **Verify:** report distinguishes configuration drift, corpus contamination,
  search-quality defects, and optional upstream features, with no external
  writes.
- **Status:** [ ] separate-session prerequisite

---

## Open questions

None blocking plan adoption. Source admission decisions are Task 2 builder/Claude
review work, not assumptions to resolve in this document.

## Changelog

- 2026-07-25 — Initial active plan (Mike-direct). Task 1 started from the live
  wiring/corpus audit; Supermemory split into a separate read-only sibling audit.
- 2026-07-25 — Completed Task 1 with a 51-source read-only inventory. Review
  buckets remain advisory and the runtime allowlist remains empty.
- 2026-07-25 — Started Task 2 under builder instruction. Raw-content and
  paper-of-record reconciliation produced 26 published admissions, 6 verified
  Richmond Archive reference admissions, and 19 explicit exclusions.
- 2026-07-25 — Completed Task 2 after the live 51-source policy passed its
  fail-closed validator with complete accounting and no duplicate or unknown
  IDs.
- 2026-07-25 — Started Task 3. The wrapper defaults to published-only scope,
  requires explicit Richmond Archive reference opt-in, and labels all returned
  prose `UNVERIFIED_SYNTHESIS`.
- 2026-07-25 — Completed Task 3 after synthetic validation of source selection,
  bounded CLI arguments, response shape, citation/excerpt agreement, and
  provenance failures.
- 2026-07-25 — Completed Task 4 with a bounded Editions 98/100/101
  apprenticeship-pipeline proof: 3 selected/used sources, 14 citations and
  excerpts, unchanged source inventory, and a caught synthetic attribution
  mismatch.
- 2026-07-25 — Prepared the Task 5 Claude/research-build handoff with exact
  changes for the protected `source-search`, `/deep-dispatch`, `/sift`, and
  `/city-hall-prep` contracts. No protected file was modified.
- 2026-07-26 — Corrected Task 5 ownership from media to research-build under the
  active rollout doctrine: skill/control-plane edits are apparatus work; media
  is a generator terminal and does not carry actionable rollout assignments.
