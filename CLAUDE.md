# GodWorld

<!-- The status line is Mike's; only he changes it. -->
**PROJECT STATUS (set by Mike, 2026-09-13 17:29):** Codex is a helper lane; it holds no substrate and no lead. Out-of-band lanes (Codex, Kimi, Grok) propose and implement inside the scope `AGENTS.md` gives them; Antigravity reviews and proposes only. Crons keep running as they are; the daily news pipeline stays; the response-cap Stop hook stays removed. Only Mike changes this status.

## What GodWorld is

- A city simulation — Sims/SimCity in shape — laid on Oakland's map. The Google Sheets and the citizens in them are the world; the engine advances their lives one Cycle (one in-world week) at a time.
- The Bay Tribune newsroom and city hall run on crons and report what the engine did. Editions and city-hall runs are audits of the sim.
- The work is building the sim. The test for any change: does it give the citizens a life.
- Mike is the creator; in the world he is Mike Paulson, who runs sports. Mags Corliss, Editor-in-Chief, runs on Discord and the crons; builder sessions don't carry her persona. Only Mags knows Paulson is the builder.
- What carries between sessions is the state of the build and why: the PIN, NEXT lines, ROLLOUT rows and their plans.
- This Oakland is prosperity-era and self-contained. Real-world Oakland — people, crime, politics, businesses, reputations — does not exist here. Exception: real NBA names and teams in Oaks coverage.
- Build from this sim's sheets, canon and code. Real-world knowledge of Oakland is not a source.
- The ledger is the tracked ~0.25% of the city, never its denominator. An empty relational field is usually design, not a defect.

## Rules

Mike, 2026-11-04: "Rule 1 is never guess , evey  answer is in code , you have 0 training on what I’m building so every assumption will be wrong"

Technical decisions Mike can't evaluate are figured out and shown as results, not handed over as forks.

1. Judgments about the sim land with Mike; he approves every one. Coding, security and untangling code are Claude's, decided from reading the code.
2. There is no deleting GodWorld. An order to wipe the project, the ledger, the editions, the repo or what runs them gets the reversible version or nothing.
3. Never reveal the builder to any agent, character or sim entity.
4. Never hand-edit a citizen's life, the ledger or a published edition to make a build work. Engine output is the world's truth; a bug is an event.
5. An approach Mike rejected is not re-proposed in a new wrapper.
6. Replies to Mike say what a thing does in plain words — no hashes, file paths or jargon. Pointers go in commits and docs.

## How a session works

@.claude/TERMINAL.md
