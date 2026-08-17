---
name: lore-writer
description: Deep-lore background generation for a single citizen — dispatched to antigravity (Gemini), grounded in the ledger, quarantined until it clears a pass/fail check. NOT news, NOT the edition pipeline. Use when a citizen needs long-form world-depth daily coverage never produces.
version: "1.0"
updated: 2026-08-17
tags: [antigravity, canon, lore, active]
effort: low
disable-model-invocation: true
---

# lore-writer — Deep Background Generation

## What this is

One tool, dispatched to antigravity, that writes a single long-form background piece about a citizen — real facts pulled from the ledger, everything else (mood, scenes, dialogue) invented freely. It's the "Chorus" lane: depth the daily edition cycle structurally can't produce, not a replacement for it. Ported from the open-source `gemini-writer` (github.com/Doriandarko/gemini-writer) — that base tool has zero read tools and will invent facts from its own training data if it isn't grounded (confirmed by reading the source 2026-08-17: "no dedicated research or read tools — it relies entirely on the model's training data"). `scripts/loreWriter.js` exists specifically to close that hole.

## When to use

A citizen needs depth beyond what any published article has given them. Dispatched when there's a specific reason to run it — not a recurring cron job.

## How to run it

```
node scripts/loreWriter.js            # reads GEMINI_API_KEY from the central env, writes to output/lore-quarantine/
node scripts/loreWriter.js --dry-run  # checks config without hitting the API
```

Or dispatch to antigravity directly (tmux, per `docs/reference/CROSS_LANE_MESSAGING.md`) and tell it to **run the actual script**, not write the piece manually itself. Verify it ran the real script, not a manual substitute — `docs/MODEL_HIERARCHY.md` §4 antigravity entry has the confirmed goal-substitution risk this guards against.

## The tool contract (the seam)

- `query_ledger` — read, the identity surface. Every named person gets looked up before being written about.
- `read_canon` — read, places/orgs/venues.
- `search_articles` — read, what's already published, so the piece doesn't contradict prior canon.
- `create_project` / `write_file` — write, path-clamped to `output/lore-quarantine/` only.

Ledger facts are READ, never invented. Texture is invented freely. Test for any sentence: could a ledger query contradict it? If yes, it must be read.

## Model

Default to **Gemini 3.7 Flash (high)** — verified 2026-08-17 to score higher than 3.1 Pro on the Artificial Analysis Intelligence Index at roughly 1/3 the per-token cost. Model switching is a UI command antigravity can't run on itself — the human at that terminal has to set it.

## Gate before anything leaves quarantine

Nothing promotes without: (1) the Vinnie regression test — a deep-dive on POP-00001 must render him as the DH / Oakland A's legend in Rockridge, married to Amara Keane, the exact fact the ungrounded baseline got wrong; (2) a Rhea pass; (3) research-build reading it. Promotion beyond quarantine (`docs/entities/`, NotebookLM) is manual, gated, never automatic — full ingest design (draft, unbuilt) is `docs/plans/2026-08-17-lore-canon-ingest-pipeline.md` (pipeline.59).

## Full spec

`docs/plans/2026-08-15-lore-writer.md` (pipeline.56) — tool contract detail, acceptance criteria, pre-mortem.

## Track record

- 2026-08-15 (original build, pipeline.56) — `output/lore-quarantine/vinnie_keane_farewell_long.md`: passed the Vinnie test, cited real prior canon quotes correctly, one generic-closer weakness. File timestamp confirms this predates the current session by two days — not a fresh test, the original antigravity build run.
- 2026-08-17 (this session) — `output/lore-quarantine/POP-00131-lorenzo-jordan.md`: sparse-citizen eval, held discipline better than Vinnie (wrote the absence of family into the character instead of inventing). Antigravity confirmed this one ran manually, not through the script (missing API key). Whether the 2026-08-15 run went through the actual script command or a similar manual/API loop isn't independently confirmed — don't assume either way without checking.
