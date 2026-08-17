---
title: Cross-lane messaging — reaching another lane mid-session
created: 2026-08-15
updated: 2026-08-17
type: reference
tags: [infrastructure, architecture, active]
sources:
  - Proven 2026-08-15 (S372) — redirected antigravity's autonomousNewsroom plan mid-session; it acknowledged and stood down
  - Mike-direct 2026-08-17 (S377) — kimi/codex/antigravity restriction facts, added after rb's new boot-time roster check misread two bare-bash panes as "not booted"
pointers:
  - "[[../plans/2026-08-15-cross-lane-message-bus]] — governance.47, the script that will replace this manual procedure"
  - "[[../index]] — registered same commit"
---

# Cross-lane messaging

**Manual procedure. Replaced by `scripts/laneMessage.js` when governance.47 ships — until then, this is the mechanism.**

`SendMessage` / `ListAgents` see **Claude sessions only** (research-build, engine-sheet, observers). The non-Claude lanes — antigravity (`agy`), grok, kimi (`kimi-code`), codex — are separate CLIs in tmux panes and are invisible to it. They are still reachable.

## Known lane restrictions (dated — check before assuming a bare-bash pane means "not booted")

A bare-bash pane can mean the CLI crashed, or it can mean this. Check here before treating one as broken.

- **kimi** — account locked out until **2026-08-21**. Pane sits at bare `bash` until then; that is the lockout, not a crash. Nothing to fix, nothing to dispatch — wait it out. Mike-direct 2026-08-17.
- **codex** — account-restricted until **2026-08-20**. Its pane stays live (`node`), and rb can still send it messages, but codex cannot reply back during the restriction — treat any dispatch to it as fire-and-forget until the date passes, not a wait-for-ack exchange. Mike-direct 2026-08-17.
- **antigravity** — runs on Mike's own Gemini Pro account. No expiry, different kind of gap: it currently has **no defined role** — a capability without an assigned scope of work. Not broken, just unassigned; don't route work to it assuming a lane responsibility that hasn't been decided yet. Mike-direct 2026-08-17.

Past these dates, re-verify with `tmux capture-pane` rather than trusting this table — it's a snapshot, not a live status feed. Strike an entry once its restriction has actually lifted and been confirmed live, don't just let the date silently pass.

## 1. Find the pane

```bash
tmux list-panes -a -F "#{window_index}.#{pane_index} #{window_name} | cmd=#{pane_current_command} | #{pane_id}"
```

Layout as of 2026-08-15: `1 research-build`(claude) `2 engine-sheet`(claude) `3 civic` `4 media` `5 kimi`(kimi-code) `6 codex`(node) `7 antigravity`(agy, `%20`) `8 grok`(grok).

**Re-read this every time.** Pane ids are not stable across restarts, and a pane sitting at bare `bash` means that agent is not booted.

## 2. Confirm it is idle before sending

```bash
tmux capture-pane -p -t <pane_id> -S -25
```

Non-negotiable. **Typing into a bare `bash` pane executes your message as shell commands.** Typing into a mid-generation TUI corrupts the buffer. Confirm the expected CLI is running *and* sitting at its prompt.

## 3. Send — two steps, both required

```bash
MSG='your single-line message here'
tmux send-keys -t <pane_id> -l "$MSG"    # -l = literal, no key interpretation
sleep 1
tmux send-keys -t <pane_id> C-m          # separate submit — the first Enter is swallowed by paste mode
```

- **Single line, no embedded newlines** — a newline mid-string submits early and fragments the message.
- Avoid apostrophes inside a single-quoted shell var (`A's` → `A/s`, or switch quoting).

## 4. Wait for the reply

```bash
until ! tmux capture-pane -p -t <pane_id> -S -3 | grep -q "esc to cancel"; do sleep 3; done
tmux capture-pane -p -t <pane_id> -S -40
```

`agy`'s busy marker is `esc to cancel`; other CLIs differ — check the footer before relying on it.

## Inbound — a lane blocked on Claude

The channel runs both ways, and the `NEXT[<lane>]` line only reaches Claude at
its **next boot**. A lane blocked mid-session on a spec, ruling, routing
correction, or approval should message **research-build** rather than parking
and waiting for the operator to notice.

Same procedure in reverse — resolve the pane by window name, capture first,
`send-keys -l` then a separate `C-m`:

```bash
PANE=$(tmux list-panes -a -F "#{window_name} #{pane_id}" | awk '/research-build/{print $2}')
tmux capture-pane -p -t "$PANE" -S -25    # confirm Claude is booted and idle
```

A pane at bare `bash` means research-build is not running — fall back to the
`NEXT[<lane>]` line. This rule is stated for the non-Claude lanes in
`AGENTS.md` §Blocked on Claude.

## When to use it

A live correction another lane needs **now** — wrong routing, a canon error about to be built on, a spec handoff that unblocks it. For anything that can wait, the `NEXT[<lane>]` line in `SESSION_CONTEXT.md` is the normal handoff and costs nothing.

Write the message at a judgment seat and send it **verbatim**. Do not have a cheap model paraphrase it in transit — the payload is often canon, and a summarizer in the middle is a drift vector at the exact point fidelity matters. That is why governance.47 makes the transport a deterministic script rather than an agent.
