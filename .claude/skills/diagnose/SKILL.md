---
name: diagnose
description: Disciplined diagnosis loop for external-system bugs (engine crash, Discord bot drift, edition compile failure, dispatch silently dropping entities). Reproduce → minimise → hypothesise → instrument → fix → regression-test. Use when something is broken/throwing/failing in GodWorld infrastructure.
version: "1.0"
updated: 2026-05-01
tags: [meta, infrastructure, active]
effort: medium
sources:
  - https://github.com/mattpocock/skills/blob/main/skills/engineering/diagnose/SKILL.md (MIT, Matt Pocock 2026)
related_skills: [self-debug, health, pre-mortem, tech-debt-audit]
---

# /diagnose — Disciplined diagnosis loop

A discipline for hard bugs in **external systems** — engine, scripts, Discord bot, dashboard, edition compile, dispatch ingest, MCP server. Skip phases only when explicitly justified.

**Distinct from `/self-debug`.** `/self-debug` is for when the agent is the failing thing (looping, drifting, retrying without progress). `/diagnose` is for when a GodWorld system is the failing thing. If the failure is "I keep proposing the wrong fix," use `/self-debug` first; if it's "the engine throws on cycle 92," use `/diagnose`.

**Distinct from `/health`, `/pre-mortem`, `/tech-debt-audit`.** Those scan for issues proactively. This structures the response when something has actually broken.

When exploring the codebase, use `CONTEXT.md` (project glossary) to keep the mental model clear, and check `docs/adr/` for prior decisions in the area you're touching.

---

## Phase 1 — Build a feedback loop

**This is the skill.** Everything else is mechanical. If you have a fast, deterministic, agent-runnable pass/fail signal for the bug, you will find the cause — bisection, hypothesis-testing, and instrumentation all just consume that signal. If you don't have one, no amount of staring at code will save you.

Spend disproportionate effort here. **Be aggressive. Be creative. Refuse to give up.**

### Ways to construct one — try them in roughly this order

1. **Failing test** at whatever seam reaches the bug — unit (script function), integration (script-against-fixture), e2e (full cycle replay).
2. **Direct script invocation** with a fixture input, diffing stdout against a known-good snapshot. Most GodWorld scripts (`buildDeskPackets.js`, `validateEdition.js`, `ingestEdition.js`, `ingestEditionWiki.js`, `buildCitizenCards.js`) accept `--cycle N` or `--file <path>` — point them at a known-good cycle.
3. **MCP tool roundtrip.** If the bug is in canon retrieval, hit the godworld MCP tool directly (`lookup_citizen`, `search_canon`, `lookup_cultural`) and assert on the response shape.
4. **`curl` against the dashboard API.** Port 3001 — `/api/articles?q=...`, `/api/citizens/<POPID>`, etc. Useful when the bug surfaces in the bot or dashboard.
5. **Captured-trace replay.** Save a real Discord event payload, a real edition compile input, or a real engine-review JSON to disk; replay it through the code path in isolation. `editions/cycle_pulse_dispatch_92_kono_second_song.txt` is the canonical fixture for dispatch-side bugs (S188-S189).
6. **Throwaway harness.** A 30-line script that imports `lib/<module>.js` and exercises the bug code path with a single function call. Lives in `/tmp/` for the duration of the diagnosis, gets deleted in Phase 6.
7. **Property / fuzz loop.** If the bug is "sometimes wrong output," loop 100+ random inputs and look for the failure mode. Useful for citizen card generation, name pool sampling, ledger-derivation drift.
8. **Bisection harness.** If the bug appeared between two known states (commit, edition, cycle), automate "boot at state X, check, repeat" so you can `git bisect run` it. Engine-sheet pattern: replay the prior cycle's `world_summary_c<N-1>.json` and compare current cycle's behavior.
9. **Differential loop.** Run the same input through old-version vs new-version (or two configs) and diff outputs. Common for editorial drift — same brief, two reporter prompts, diff articles.
10. **HITL bash script.** Last resort. If a human must click (Drive upload, Discord invite, smfs mount), structure the loop with a deterministic shell harness — captured output feeds back to the agent.

Build the right feedback loop, and the bug is 90% fixed.

### Iterate on the loop itself

Treat the loop as a product. Once you have *a* loop, ask:

- **Faster?** Cache setup, skip unrelated init, narrow the test scope. A 2-minute loop is a productivity tax; a 5-second loop is a debugging superpower.
- **Sharper?** Assert on the specific symptom, not "didn't crash." For dispatch parser bugs (E1/E2 from S189), assert on `parsedEntities.length === expectedCount`, not on exit code.
- **More deterministic?** Pin time, seed RNG, isolate filesystem, freeze network. Engine determinism rules apply (Math.random banned).

### Non-deterministic bugs

The goal is not a clean repro but a **higher reproduction rate.** Loop the trigger 100×, parallelise, add stress, narrow timing windows, inject sleeps. A 50%-flake bug is debuggable; 1% is not — keep raising the rate until it's debuggable.

### When you genuinely cannot build a loop

Stop and say so explicitly. List what you tried. Ask Mike for: (a) access to whatever environment reproduces it, (b) a captured artifact (engine-review JSON, production log, Drive PDF, Discord transcript), or (c) permission to add temporary instrumentation. **Do not proceed to hypothesise without a loop.**

Do not proceed to Phase 2 until you have a loop you believe in.

---

## Phase 2 — Reproduce

Run the loop. Watch the bug appear.

Confirm:

- [ ] The loop produces the failure mode **Mike** described — not a different failure that happens to be nearby. Wrong bug = wrong fix.
- [ ] The failure is reproducible across multiple runs (or, for non-deterministic bugs, reproducible at a high enough rate to debug against).
- [ ] You have captured the exact symptom (error message, wrong output, slow timing) so later phases can verify the fix actually addresses it.

Do not proceed until you reproduce the bug.

---

## Phase 3 — Hypothesise

Generate **3–5 ranked hypotheses** before testing any of them. Single-hypothesis generation anchors on the first plausible idea.

Each hypothesis must be **falsifiable**: state the prediction it makes.

> Format: "If <X> is the cause, then <changing Y> will make the bug disappear / <changing Z> will make it worse."

If you cannot state the prediction, the hypothesis is a vibe — discard or sharpen it.

**Show the ranked list to Mike before testing.** He often has domain knowledge that re-ranks instantly ("engine-sheet just shipped that section S188") or knows hypotheses already ruled out. Cheap checkpoint, big time saver. Don't block on it — proceed with your ranking if Mike is AFK or in another terminal.

**Search memory before hypothesising.** Per identity rules: claude-mem first, then Supermemory `mags`, then read code. Past sessions often documented the same bug. Don't re-derive what's already in `feedback_*.md` or a journal entry.

---

## Phase 4 — Instrument

Each probe must map to a specific prediction from Phase 3. **Change one variable at a time.**

Tool preference:

1. **`node --inspect` / REPL inspection** if the env supports it. One breakpoint beats ten logs.
2. **Targeted logs** at the boundaries that distinguish hypotheses.
3. Never "log everything and grep."

**Tag every debug log** with a unique prefix, e.g. `[DEBUG-a4f2]`. Cleanup at the end becomes a single grep. Untagged logs survive; tagged logs die.

**Perf branch.** For performance regressions (cycle run > expected, edition compile slow, MCP timeout), logs are usually wrong. Instead: establish a baseline measurement (timing harness, `Date.now()` deltas, Sheets API quota usage), then bisect. Measure first, fix second.

**GodWorld-specific surfaces:**
- Engine determinism: ledger row counts before/after a phase
- Edition compile: brief count vs article count vs slug list
- Dispatch ingest: NAMES INDEX line count vs `ingestEditionWiki.js` parsedEntities count
- Discord bot: `pm2 logs mags-bot --lines 100` after restart-with-debug-flag
- Supermemory drift: `npx supermemory tags list` count delta cycle-over-cycle

---

## Phase 5 — Fix + regression test

Write the regression test **before the fix** — but only if there is a **correct seam** for it.

A correct seam is one where the test exercises the **real bug pattern** as it occurs at the call site. If the only available seam is too shallow (single-caller test when the bug needs multiple callers, unit test that can't replicate the chain that triggered the bug), a regression test there gives false confidence.

**If no correct seam exists, that itself is the finding.** Note it. The codebase architecture is preventing the bug from being locked down. Flag this for the next phase — likely an item for Phase 42 Writer Consolidation, ENGINE_REPAIR, or a new ADR.

If a correct seam exists:

1. Turn the minimised repro into a failing test at that seam.
2. Watch it fail.
3. Apply the fix.
4. Watch it pass.
5. Re-run the Phase 1 feedback loop against the original (un-minimised) scenario.

For non-test-supported areas (no test harness in `tests/` for the affected path): a regression `scripts/<bugname>-repro.sh` checked into `scripts/` counts as a regression check. Future sessions can re-run it to verify the fix didn't regress.

---

## Phase 6 — Cleanup + post-mortem

Required before declaring done:

- [ ] Original repro no longer reproduces (re-run the Phase 1 loop)
- [ ] Regression test passes (or absence of seam is documented in ROLLOUT_PLAN as a follow-up)
- [ ] All `[DEBUG-...]` instrumentation removed (`grep` the prefix across the touched files)
- [ ] Throwaway prototypes deleted (or moved to a clearly-marked debug location and noted in commit message)
- [ ] The hypothesis that turned out correct is stated in the commit message — so the next debugger learns

**Then ask: what would have prevented this bug?** If the answer involves architectural change (no good test seam, tangled callers, hidden coupling), file a ROLLOUT entry or an ADR with the specifics. Make the recommendation **after** the fix is in, not before — you have more information now than when you started.

**Memory writes.** If the diagnosis revealed a recurring pattern, add a one-line entry to MEMORY.md or write a `feedback_<topic>.md` file. Past sessions documented S122, S128, S168, S188 dispatch-gap-set this way — each saved a future session from re-deriving the same fix.

---

## GodWorld-specific examples

**Bug class:** Dispatch parser silently returns 0 entities (S188 gap #4/#5).
**Phase 1 loop:** `node scripts/ingestEditionWiki.js --file editions/cycle_pulse_dispatch_92_kono_second_song.txt --cycle 92` → expect 2 entities, got 0.
**Phase 3 hypotheses:** (a) NAMES INDEX section header detection fails on flat-body dispatches; (b) CUL-ID lines are filtered out by POPID-only regex; (c) section delimiter is `---` not the expected `## NAMES INDEX`.
**Outcome:** (a) was correct (S189 E1 fix). 9 commits to fix across 3 scripts.

**Bug class:** Discord bot quoting C90 after C92 published (S180 gap).
**Phase 1 loop:** `pm2 restart mags-bot && sleep 3 && pm2 logs mags-bot --lines 50` then ask the bot in Discord — assert on cycle reference in reply.
**Phase 3 hypotheses:** (a) bot reads stale `latest_edition_brief.md`; (b) bot reads `base_context.json` but it's not refreshed post-publish; (c) Supermemory boot profile lags real ingest.
**Outcome:** (a) was correct — file was deleted, plan written `[[plans/2026-04-26-discord-bot-edition-currency]]`.

---

## Changelog

- 2026-05-01 — S190, research-build. Initial draft. Adapted from MIT-licensed `mattpocock/skills/engineering/diagnose/SKILL.md` (Matt Pocock 2026). Six-phase structure preserved; localized to GodWorld surfaces (engine scripts, MCP tools, dashboard API, dispatch fixtures, Supermemory tags). Disambiguated from `/self-debug` (agent is failing thing → that skill) at the top. Source attribution preserved per MIT.
