---
title: Oakland Sports Feed Entry Dashboard — research
created: 2026-07-27
updated: 2026-07-27
type: reference
tags: [research, sports, infrastructure, active]
sources:
  - Mike-direct 2026-07-27 — the sports-feed entry surface is a separate build from Discord citizen agents and SpaceMolt
  - dashboard/server.js §Sports Feeds — current read-only endpoint
  - dashboard/src/App.jsx §Sports Tab — current feed viewer
  - scripts/preflightInputCheck.js §Sports Feed — required/recommended input contract
  - scripts/buildDeskPackets.js §Sports feeds — current-cycle selection and all-history fallback
  - docs/DASHBOARD.md — current dashboard surface and API inventory
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home"
  - "[[index]] — register here, same commit"
  - "[[../plans/2026-07-05-game-night-connection-design]] — downstream sports-event propagation; not the entry-UI build"
---

# Oakland Sports Feed Entry Dashboard — research

**Source:** Internal code and interface audit, 2026-07-27, triggered by Mike's request for a more user-friendly way to add `Oakland_Sports_Feed` entries. Mike subsequently ruled that this is a completely separate build from Discord citizen agents and SpaceMolt.

**What this addresses:** Which surface should own structured operator entry into `Oakland_Sports_Feed`, what the current dashboard already provides, and what must be true before an authenticated UI can write canon-bearing sports rows safely.

**What it does:** The current dashboard displays Oakland and Chicago sports data from the latest desk packets through `GET /api/sports`. It does not read the live sports Sheet for entry, expose a sports write endpoint, stage drafts, validate rows, or verify a write. The canonical pre-flight contract separately requires `Cycle`, `SeasonType`, `EventType`, and `TeamsUsed`, and recommends `NamesUsed`, `Team Record`, `FanSentiment`, and `PlayerMood`.

**Extraction — what's usable:**

- **Structured canon input → dashboard, not conversational chat.** Sports entries carry twenty columns, controlled values, roster names, records, moods, triggers, and story framing. A mobile-friendly form can expose that structure directly; a natural-language bot would hide missing fields and make correction harder.
- **Existing authenticated React/Express surface → extend the dashboard rather than create another app.** The Sports tab, player APIs, navigation, mobile layout, and dashboard authentication already exist. The smallest product surface is an entry mode alongside the current viewer.
- **Event templates → progressive disclosure.** Start with explicit types such as game result, roster move, injury, player feature, front-office event, fan/civic event, and editorial note. Each template shows its essential fields first and reveals optional franchise/economic fields only when relevant.
- **One validation contract → UI, API, and pre-flight parity.** Extract the sports row rules behind `preflightInputCheck.js` into a shared validator instead of re-implementing required/recommended checks in React and the server independently.
- **Roster-backed controls → fewer canon-name errors.** `NamesUsed` should select from the existing player index/roster surface where possible, while preserving an explicit reviewed path for a valid name not yet indexed.
- **Preview-before-write → preserve the builder gate.** The UI should assemble the exact twenty-column row, show it as a staged preview, distinguish errors from warnings, and require an explicit confirmation before any Sheet append.
- **Write/read-back/audit → fail loud.** A successful submit is not merely a 200 response: append once with an idempotency key, read the appended row back, return its Sheet row identity, and record an operator-facing audit event without copying credentials or unrelated Sheet data.
- **Cycle-empty means empty → remove the all-history disguise.** `buildDeskPackets.js` currently falls back to the complete sports history when the requested Cycle has no rows. The current packet consequently exposes 192 rows in place of a clear missing-input state. Entry UI and display must say "no rows for this Cycle" rather than present history as current.
- **Discord remains optional notification-only.** A later `/sports quick` command may stage a draft or link to the form, but Discord should not directly create canon rows from prose.

**Not applicable / hazard:**

- **This is not the SpaceMolt build.** SpaceMolt citizen agency, media attention, cultural obsession, and wagering have a different source, lifecycle, and consequence model. Do not combine their implementation plans merely because both may eventually appear on a dashboard.
- **Authenticated does not automatically mean safe to write canon.** The dashboard currently has broad cookie/basic authentication and only narrow operational POST actions. A new Sheet writer needs an allowlisted endpoint, server-side validation, explicit confirmation, idempotency, read-back verification, and protection against accidental duplicate submissions.
- **Do not make an LLM part of the required entry path.** Templates and deterministic validation cover the canonical fields. Any later prose-to-draft helper remains optional and must still land on the same preview gate.
- **Do not silently "improve" the builder's values.** Records, player moods, fan sentiment, statistics, names, and StoryAngle remain operator inputs. The UI can validate shape and roster matches; it cannot invent or rewrite canon.
- **Do not generalize the existing sports engine under this research.** New sport/team registration, SpaceMolt cultural propagation, casino economics, and game-night engine changes belong to their owning research/plans.

## Open questions

- Should v1 append one row at a time, or support a multi-row Cycle worksheet before commit?
- Which `EventType`, `SeasonType`, `TeamsUsed`, mood, sentiment, and trigger values are controlled enums versus accepted free text in the live Sheet?
- Should the dashboard read current rows directly from `Oakland_Sports_Feed`, or use a dedicated read model refreshed after each verified write?
- Which fields should copy forward from the latest team row (record, season, franchise context), and which must always be explicitly confirmed?
- Is edit/delete in scope, or should v1 be append-only with corrections made through the existing Sheet until an audited mutation contract exists?
- Does screenshot/stat OCR join this interface later as another staged-draft source, or remain a separate tool that only hands rows to the same preview gate?

**Verdict:** `adopt` — extend the existing dashboard into the primary, deterministic sports-feed entry surface. Keep the first build append-only, template-driven, preview-gated, and verified by read-back; treat Discord as a companion link/notification surface at most.

**Ignited plans:** none yet — this request authorizes the research record only. A dedicated dashboard-entry plan and its rollout pointer require separate builder approval.

---

## Applications (living)

- 2026-07-27 — Initial boundary decision: sports entry is independent from Discord citizen/SpaceMolt work.

---

## Changelog

- 2026-07-27 — Initial extraction from the dashboard, feed-validator, desk-packet, and live packet audit.
