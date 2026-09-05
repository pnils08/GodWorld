---
title: NotebookLM Source-Search Wiring Plan
created: 2026-07-25
updated: 2026-07-27
type: plan
tags: [architecture, infrastructure, media, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md research.23
  - docs/plans/2026-07-10-notebooklm-bridge-deploy.md
  - docs/research/2026-07-10-notebooklm-mcp.md
  - docs/research/2026-07-19-headless-cron-newsroom-agentic-rag.md
  - docs/adr/0012-autonomous-deep-dispatch-write-edition.md
  - docs/reference/notebookLM-CLI.md
  - .claude/agents/source-search/SKILL.md (read-only control-plane consumer)
  - scripts/godworld-mcp.py
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout, research.23"
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
authority boundary. A Node wrapper that is externally read-only targets only
the configured permanent notebook and only builder-approved source IDs; its sole
local side effect is a metadata-only retrieval event under `output/`.
`source-search` invokes it only for prior published arcs, then verifies its
citations against primary current state and the cited publication sources.
Exact/current lookups remain GodWorld MCP or file reads. Headless use is a later
consumer after the interactive path is measured.

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
- **Status:** [x] done 2026-07-26 / S334 (commits 59fd32df + this one). Protected
  diff applied to all four files per the handoff; tool list, model, maxTurns,
  permissionMode untouched. Three validation scripts pass. Synthetic dispatch
  proof: `output/notebooklm_lane_proof_s334.json`.
  **Scope added beyond the handoff — an orchestrator-side return gate.** The
  handoff's prose-only contract did not hold: run 1 used the wrapper but returned
  no source IDs and a prose verdict; run 2 skipped the wrapper entirely and
  grepped `output/pdfs/*.pdf`, escaping the reviewed source scope. `source-search`
  holds Read/Glob/Grep on a cheap model, so the cheap path beats an instruction.
  Two fixes: the lane text now suspends Rule 4 in-lane and names the wrapper as
  the only retrieval mechanism; and `deep-dispatch` Step 4 / `sift` /
  `city-hall-prep` each gate the return on three conditions (lane first line,
  source ID + citation + excerpt per claim, bare verdict token), re-dispatching
  once and logging `no-result` on a second failure. Run 3 passed all three, used
  only the wrapper, and cited four source IDs all present in
  `allowedPublishedSourceIds`.

### Task 6: Add retrieval observability

- **Files:**
  - `scripts/notebooklmCanonSearch.js` — modify
  - `scripts/notebooklmCanonSearch.test.js` — modify
  - `docs/reference/notebookLM-CLI.md` — update owning operator contract
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
- **Status:** [x] complete 2026-07-26 — Codex implementation and bounded live
  proof complete. The wrapper emits metadata-only JSONL, constrains custom log
  paths to `output/**/*.jsonl`, fails if logging fails, and distinguishes all
  five approved `resultStatus` values. Synthetic tests pass. The live
  Editions 98/100/101 proof used all 3 selected sources and returned 15
  citations with 15 excerpts; the trace recorded the sandbox-denied first
  attempt as `no_result` and the approved retry as `verified`, with no answer
  body or canon-facing artifact. Under explicit builder override,
  `.claude/skills/deep-dispatch/SKILL.md` now uses
  `resultStatus=no_result`, and `.claude/agents/source-search/SKILL.md`
  describes the wrapper's metadata log as its sole permitted local write.

### Task 7: Evaluate headless consumption after interactive proof

- **Files:**
  - `scripts/cron-desk-run.js` — inspected; unchanged
  - `scripts/cron-desk-writer.js` — opt-in evaluation artifact tag; default
    production paths unchanged
  - `scripts/cron-desk-writer.test.js` — artifact-tag boundary tests
  - `scripts/notebooklmHeadlessEval.js` — fail-closed paired evaluation harness
  - `scripts/notebooklmHeadlessEval.test.js` — harness contract tests
  - `scripts/priorArcRequirement.js` — shared evaluation-only Brief/reviewer
    requirement contract
  - `scripts/priorArcRequirement.test.js` — requirement boundary tests
  - `scripts/cron-rhea-gate.js` — opt-in verified historical evidence for the
    independent treatment gate
  - `docs/plans/2026-07-20-headless-newsroom-pipeline.md` — consumer verdict
  - `output/cron-compare/evaluations/task7-jacklondon/manifest.json` —
    generated `NOT_CANON` evaluation record
- **Steps:**
  1. Measure whether a precomputed, verified prior-arc digest improves a staged
     Article versus the current disk-search lane.
  2. If adopted, place retrieval before composition in the orchestrator; do not
     give the writer direct NotebookLM access.
  3. Keep all output behind the existing probation and Rhea gates.
- **Verify:** paired gated samples show attribution/canon results and cost; no
  autonomous publication or ingestion is enabled. A failed sample remains
  unstaged.
- **Status:** [x] evaluation complete — **append-only NOT ADOPTED; structured
  binding DESIGN-PROVEN; prompt-only hygiene REJECTED; NOT SCHEDULED.** The bounded
  run selected and used Editions 98–101, returned 20 citation/excerpt pairs,
  and injected 18 verified excerpts. The harness discarded NotebookLM answer
  prose and conversation ID. Baseline failed Rhea with 3 flags (2 high);
  treatment failed with 2 flags (1 high), at $0.1162 total API cost. Manual
  comparison found that the treatment used none of the prior Baylight, local
  hiring, apprenticeship, or earlier Jack London arc supplied by retrieval, so
  its lower flag count is not attributable to NotebookLM. Appending a 15.9k
  excerpt packet to an 18.9k writer state created another context firehose.
  Do not wire this shape into cron. The next evaluation used the corrected Task
  6 source-search contract and a compact, source-search-verified claims digest
  rather than raw excerpts. Both drafts remain `NOT_CANON`; neither was staged,
  published, ingested, or written to citizen records.

  **Compact follow-up — also NOT ADOPTED.** The corrected `source-search` lane
  produced a 1,602-character digest with 3 excerpt-supported claims; its
  wrapper query selected and used all four Editions. The paired baseline failed
  Rhea with 2 flags (2 high), while treatment failed with 3 flags (2 high).
  Treatment used none of the three supplied facts: Baylight's recusal delay,
  31-of-86 apprenticeship placement, or the fourteen-corridor contraction.
  The completed run cost $0.1342 for writers/gates plus $0.0756 reported for
  source-search ($0.2098 total). Two earlier retrieval-only attempts stopped
  before writer calls—one agent scope/length drift and one false-positive
  validator match on legitimate `.pdf` NotebookLM source titles; their
  envelope costs were not persisted. Compactness fixed the firehose but not the
  composition interface. Any future evaluation must bind a selected verified
  prior-arc claim into the Brief/PREWRITE contract instead of appending more
  context. That is a separate design change, not approved cron wiring.

  **Structured Brief-binding follow-up — DESIGN PROVEN, production blocked.**
  The harness reused the already-verified compact digest without a new
  NotebookLM or Claude retrieval call and bound claim 3 into the treatment
  Brief: prior Tribune reporting placed Jack London's decline inside a
  fourteen-corridor contraction. The treatment used the fact in its Article
  body, added the required `PRIOR_PUBLISHED` Evidence entry with Edition title
  and citation, did not leak the source UUID, and Rhea did not flag the
  historical claim. Baseline failed with 5 flags (3 high); treatment failed
  with 2 flags (2 high), at $0.1254 total writer/gate cost. Its remaining high
  flags were unrelated to retrieval: the lane supplied invented official
  Marisol Garcia, and the writer invented an age/profile for an anonymous
  bartender. The composition hypothesis is therefore validated, but no
  scheduled wiring is approved until the canonical Brief/PREWRITE schema owns
  this field and the existing lane/name hygiene blockers are cleared.

  **Strict source-hygiene follow-up — PROMPT-ONLY CONTROL REJECTED.** A
  controlled pair reused the same verified digest and required claim on both
  sides; no NotebookLM or `source-search` call ran. The only state differences
  were deterministic reporter-angle redactions of `Marisol Garcia` and
  `Produce Market`, plus the treatment-only strict source prompt. Both drafts
  used and cited the required fourteen-corridor fact without leaking its UUID.
  Baseline failed with 5 flags (4 high); treatment failed with 4 flags (3
  high), at $0.1191 total writer/gate cost. The treatment removed the invented
  official and anonymous bartender, but it misspelled Gregory Mims in Evidence
  and placed both the canon West Oakland resident and Crisis Coffee in
  Fruitvale. The supplied quotes carried text and POPIDs but not enough spatial
  provenance to prevent that relocation. Prompt wording and name redaction
  therefore do not clear the production blocker. The next viable design must
  give composition a deterministic source roster containing verified person,
  location, quote, and attribution tuples—or explicitly no source—and validate
  that roster before a writer call. No additional paid retry is justified on
  the current prompt-only shape.

### Task 8: Run a separate Supermemory setup and corpus-purity audit

- **Files:**
  - `docs/SUPERMEMORY.md` — audit, then update operational truth
  - `scripts/godworld-mcp.py` — audit, then harden retrieval
  - `scripts/godworldMcpSearch.test.py` — offline retrieval contract tests
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
- **Status:** [x] complete 2026-07-27 — folded into the existing
  `infrastructure.5` audit rather than opening a competing tracker.

  - **Configuration drift:** the active local plugin is the renamed
    `supermemory` v0.0.12 package; the old `claude-supermemory` entry is
    disabled. Reasoned recall and unified-repository reads are present.
    GodWorld's explicit container overrides remain valid upstream behavior.
    The Stop summary hook is installed but its effective capture path remains
    neutralized by `signalExtraction=true` with an empty keyword set.
    At audit time, `docs/SUPERMEMORY.md` still described parts of the older
    capture/container posture. The bounded truth pass below corrected verified
    operational facts while leaving the Phase 3 test-off and final retirement
    verdict open in [[2026-05-22-supermemory-load-bearing-audit]].
  - **Corpus purity:** the metadata inventory covered 4,306 organization
    documents: 1,155 tagged `bay-tribune` and 1,509 tagged `world-data`.
    `bay-tribune` contains 24 `drive-archive` documents. A conservative sample
    of those 24 plus the known fourth-wall record flagged 11/25 for
    non-publication signals, including architecture, QA, directives, audits,
    agent/control-plane prose, and simulation-revealing material. One sampled
    `drive-archive` item was a genuine Edition, so cleanup requires explicit
    per-record adjudication rather than deleting by source tag. The
    `world-data` inventory was fully partitioned across `wd-*` domain tags; a
    newest/oldest 20-record sample found zero publication/transcript/directive
    signals and 18 expected structured-card shapes. That supports, but does
    not prove, whole-corpus purity.
  - **Search defect:** `search_canon` is a thin default
    `memories`/0.6/similarity/limit-5 call with no provenance filter,
    recency, projection, or aggregation. The bounded audit query returned a
    Mara directive first, an unpublished civic-decision memory second, and the
    first published Edition result third. Correct Supermemory filter syntax is
    an `AND`/`OR` wrapper; the live
    `{"AND":[{"key":"source","value":"edition-ingest"}]}` proof returned 20/20
    `edition-ingest` results.
  - **Hardening follow-up implemented 2026-07-27:** `supermemory_search` now
    accepts an `AND`/`OR` metadata filter and projects only useful text plus
    compact provenance. `search_canon` and every existing Tribune fallback use
    `source=edition-ingest`; mixed `drive-archive` records stay outside that
    default lane. `search_world` fans out with a three-process bound across the
    eight populated `wd-*` tags instead of querying the empty umbrella lane.
    Citizen, initiative, neighborhood, and council fallbacks now use their
    narrow domains. Five offline tests cover the filter command, provenance
    projection, fail-loud JSON handling, recency ordering, and domain fan-out.
    A live regression query returned 5/5 `edition-ingest` hits with no Mara
    directive or mixed-archive record. A live world query reached all eight
    populated domains in 17.8 seconds and kept their results source-labeled;
    narrow entity tools remain preferred because low-threshold cross-domain
    recall is intentionally noisy. The newer `wd-snapshot` writer target had
    zero live records and was not added to the fan-out. No record was deleted,
    retagged, reingested, or written.

  This closes Task 8 only. It does not satisfy the older
  `infrastructure.5` Phase 3 test-off session for `mags` and `super-memory`.

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
- 2026-07-26 — Built and live-proved Task 6 retrieval observability. Machine
  `resultStatus` uses underscore tokens; hyphenated `no-result` remains only the
  `reconcileVerdict`. Task stays in progress pending two protected
  Claude/research-build wording corrections.
- 2026-07-26 — Applied the two protected Task 6 wording corrections under
  explicit builder override. Task 6 is complete and its rollout pointer is
  ready for the archive sweep.
- 2026-07-26 — Completed the bounded Task 7 paired evaluation. Both samples
  failed Rhea and remained `NOT_CANON`; the treatment ignored its 15.9k
  verified excerpt packet, so raw-excerpt headless injection was not adopted.
- 2026-07-26 — Completed the compact Task 7 follow-up through the corrected
  `source-search` lane. The 1,602-character digest was valid, but the treatment
  ignored all three prior-arc claims and also failed Rhea; compact append-only
  injection was not adopted.
- 2026-07-27 — Completed the structured Brief-binding follow-up. The treatment
  used and cited its required prior-arc fact and Rhea accepted that historical
  evidence, proving the composition seam; production remains blocked because
  both samples still failed unrelated name/canon gates.
- 2026-07-27 — Rejected prompt-only source hygiene after a controlled
  retrieval-reuse pair. Deterministic angle redaction removed the known
  invented official, but the treatment still relocated a canon person/business
  and misspelled a name in Evidence; a spatially grounded source roster is
  required before any production wiring.
- 2026-07-27 — Completed the separate Task 8 Supermemory audit without writes.
  The plugin is current at the adopted v0.0.12 posture, `world-data` sampling
  found no narrative contamination, and `bay-tribune` contains mixed
  `drive-archive` material. The live `search_canon` proof surfaced unpublished
  material above Edition evidence; `AND`-wrapped metadata filtering was
  verified as the deterministic first hardening step.
