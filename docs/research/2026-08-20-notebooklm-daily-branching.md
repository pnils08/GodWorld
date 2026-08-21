---
title: Gemini Notebook Daily News Branching — research
created: 2026-08-20
updated: 2026-08-20
type: reference
tags: [research, media, notebooklm, architecture, active]
sources:
  - https://support.google.com/notebooklm/answer/16164461 — current Gemini Notebook capability and grounding contract
  - https://support.google.com/notebooklm/answer/17003757 — Gemini Apps notebook integration and cross-app context behavior
  - https://blog.google/innovation-and-ai/products/notebooklm/better-research-notebooklm/ — 2026 agentic research and structured-output release
  - https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-video-overviews-studio-upgrades/ — multiple Studio outputs and source-focused variants
  - https://ai.google.dev/gemini-api/docs/caching — direct Gemini API context-caching contract
  - https://ai.google.dev/gemini-api/docs/live-api/capabilities — Gemini Live API contract
  - https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-audio-overview — Enterprise preview API contract
  - scripts/notebooklmDailyNews.js — current GodWorld daily bridge
  - output/notebooklm/daily/c104/c06e12c534ac/manifest.json — new-Cycle zero-report seam
  - /root/.gemini/antigravity-cli/brain/06101954-980b-42ff-8083-df487a5ef6c1/gemini_media_enhancements_proposal.md — Antigravity proposal audited here
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.51 pending-state home"
  - "[[../plans/2026-07-10-notebooklm-bridge-deploy]] — owning implementation plan"
  - "[[index]] — registered here, same commit"
---

# Gemini Notebook Daily News Branching — research

**Source:** Current Google product/API documentation, the installed `nlm` CLI
contract, current GodWorld schedules and artifacts, and Antigravity's 2026-08-20
media-enhancements proposal.

**What this addresses:** The 08:00 Daily News program is the primary listening
surface, but it currently renders one fixed `deep_dive/default` presentation
from a pack that sees current world state and same-Cycle staged Articles without
seeing the W1/W2/W3 newsroom progression. At Cycle rollover this can produce a
rich world-state program with zero Articles because the prior Cycle is excluded
and the new Cycle's write wake has not happened yet.

**What it does:** Gemini Notebook remains a source-grounded rendering layer. It
can now produce multiple Studio artifacts and more output types, while the
installed CLI already exposes `deep_dive`, `brief`, `debate`, and `critique`
audio formats plus `short`, `default`, and `long` lengths. Gemini Live, Gemini
API context caching, Gemini Apps notebook integration, and the Enterprise
Notebook API are separate surfaces with different trust and deployment
boundaries.

**Extraction — what's usable:** The central rule is **local evidence chooses the
program; Gemini Notebook renders it**. A model must not infer which newsroom
state exists or become the schedule/control plane.

- Deterministic branch profile → the daily bridge selects `CYCLE_OPEN`,
  `REPORTED_DAY`, `VERIFIED_OPPOSITION`, or `QUIET_DESK` from typed local
  artifacts and records reason codes in the manifest.
- Wake-progress snapshot → W1 assignments, W2 quote readiness, and W3/Rhea
  disposition become explicit source classes instead of disappearing between
  cron stages.
- Cycle-rollover continuity → prior-Cycle staged Articles may appear only in an
  explicitly labeled previous-filing section; they never masquerade as current
  Cycle reporting.
- Source-scoped variants → preserve the proven default-length Deep Dive for an
  Article-rich day; use Brief for Cycle-open and quiet mornings; use Debate only
  when the Packet proves opposing positions on the same assigned fact.
- Builder-only coverage artifact → a structured table can map assignment → W1
  → W2 → W3 → Rhea → staged/flagged without feeding its meta-analysis back into
  the in-world broadcast.
- Multiple Studio outputs → later weekly visual or structured companions can be
  generated from the same bounded pack without replacing the daily audio.
- Enterprise API → watch as a supported migration path away from the
  reverse-engineered consumer CLI, but do not migrate while the preview API has
  a narrower generation contract and requires separate Enterprise setup.

## Verified current path

The live sequence is 06:00 newsroom digest, 06:15 weekday angle wake, 08:00
Daily News, 13:15 report wake, and 18:15 write plus Rhea. The 08:00 program is
therefore a next-morning report over the previous completed W3 plus the current
day's W1, not a same-day finished-paper snapshot.

`scripts/notebooklmDailyNews.js` currently:

1. Reads the latest `output/world_summary_c<N>.md` and the citizen-day digest.
2. Collects only same-Cycle `.staged.md` and `.sample.md` bodies in the rolling
   window.
3. Excludes matching flagged bodies and records only exclusion metadata.
4. Queries the permanent published archive for non-blocking continuity.
5. Uploads one hashed bounded source to the separate daily working notebook.
6. Scopes written and audio generation to exact source IDs.
7. Writes `NOT_CANON` manifests and delivers audio without writing Sheets,
   Editions, or canon.
8. Already passes configurable `--format` and `--length` flags; the live
   configuration is fixed at `deep_dive/default`.

The C104 08:00 manifest had zero eligible reports while the same day's later
wakes produced C104 staged and flagged material. This is a deterministic
rollover/timing seam, not evidence that there was no news.

## Branch contract

| Profile | Local predicate | Public rendering |
|---|---|---|
| `CYCLE_OPEN` | Cycle changed and no same-Cycle Rhea-passed staged Article exists | Brief; current world state, current W1 chase, explicitly labeled prior filing |
| `REPORTED_DAY` | At least two same-Cycle Rhea-passed staged Articles exist | Default-length Deep Dive; preserves the proven main program |
| `VERIFIED_OPPOSITION` | Packet-backed positions disagree on the same assigned fact | Debate; no model-created polarity |
| `QUIET_DESK` | No staged Article and no material engine/civic signal | Brief; no manufactured novelty |
| `EDITOR_QA` | Builder requests a coverage-quality evaluation | Critique in a separate `NOT_CANON` artifact; never delivered as Bay Tribune news |

Every selected source must be safe to quote on air. Flagged bodies, raw writer
drafts, assignment machinery, system instructions, and repair/editor chrome do
not enter the public pack. The router adds its profile and reason codes to the
pack fingerprint so identical evidence remains an idempotent no-op.

## Implementation sequence

1. Add a pure local router and fixture tests; no NotebookLM or network calls.
2. Add a read-only newsroom-pulse collector over existing W1/W2/W3/Rhea files.
3. Extend the bounded pack and manifest with typed source classes and rollover
   labeling while preserving exact source-ID scoping.
4. Run five natural 08:00 executions in shadow mode: record the proposed branch
   while continuing to generate `deep_dive/default`.
5. Compare C104 rollover, C103 Article-rich, flagged-only, quiet, and isolated
   synthetic opposition fixtures locally.
6. With separate live approval, generate branch comparisons in a disposable or
   sandbox notebook; change one presentation axis at a time.
7. With separate live approval, activate routing in the existing 08:00 job. Do
   not add per-wake audio crons until listening evidence shows they add value.
8. Add the builder-only coverage table after the audio branch is proven.

**Not applicable / hazard:**

- Antigravity's statement that the current Daily News job has only a single
  implicit default is false: the script already passes format and length flags.
- Its latency, cost-reduction, and "complete zero-drift" caching figures had no
  supporting measurement. Gemini context caching applies to repeated direct
  Gemini API prefixes, not to the current NotebookLM consumer workflow. If a
  later direct-Gemini validator uses caching, only static canon belongs in the
  prefix; current Cycle state remains uncached and measured through reported
  cached-token usage.
- `docs/canon/NEIGHBORHOODS.md` and `scripts/verifyCanonGrounding.js`, named as
  integration points in that proposal, do not exist in this repository.
- Autonomous web/Drive research must not enter the in-world Daily News notebook:
  it can import real-world Oakland facts and violate canon. Keep such research
  in a separate engineering notebook with manually accepted sources.
- Gemini Apps can add web/tool output and Gemini-chat context to a notebook.
  The daily working notebook must remain isolated from that integration.
- Critique is an editorial/meta format, not an in-world broadcast format.
- Gemini Live citizen interviews are a separate project. They require bounded
  read-only snapshots and no direct Sheet writes; they do not block this router.

**Verdict:** `adopt`
Extend the proven Daily News bridge with deterministic local branching and wake
state. Preserve the default Deep Dive as the main Article-rich program, prove
the router in shadow mode, and keep agentic research, Gemini Apps context,
Live API interviews, and context caching outside the first implementation.

**Ignited plans:** [[../plans/2026-07-10-notebooklm-bridge-deploy]] §Phase 6

---

## Applications (living)

- 2026-08-20 — Superseded the unverified autonomous-deep-research route in
  [[2026-08-02-notebooklm-deep-research]] and supplied pipeline.51 Phase 6.

---

## Changelog

- 2026-08-20 (codex) — Initial extraction from current repo state, current
  official Google documentation, installed CLI help, and the Antigravity
  proposal audit; builder approved filing and explicit supersession.
