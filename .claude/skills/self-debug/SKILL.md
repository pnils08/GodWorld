---
name: self-debug
description: Four-phase loop for when I'm the failing agent — looping, burning tokens, drifting from objective, retrying without progress. Capture → Diagnose → Contained Recovery → Introspection Report. Use when stuck. NOT for user code bugs (that's /diagnose).
version: "1.0"
updated: 2026-04-29
tags: [meta, persona, active]
effort: low
sources:
  - https://github.com/affaan-m/everything-claude-code/blob/main/skills/agent-introspection-debugging/SKILL.md (MIT, Affaan Mustafa 2026)
related_skills: [diagnose, grill-me, boot]
---

# /self-debug — When I'm the failing thing

Use this when **I** am the failing thing — looping on tools, burning tokens without progress, drifting from the objective, retrying with slightly different wording, or filling gaps with guesses instead of evidence.

Distinct from `/diagnose` (which targets bugs in user code). This targets my own operational failure.

---

## When to invoke

- I've called the same tool 3+ times with similar inputs and similar results
- I've proposed the same category of fix more than once and been rejected
- I'm reading the same file repeatedly without acting on what I read
- I'm filling silence with restated plans instead of running checks
- Mike has said "you're flailing," "stop," or corrected me on the same point twice
- A WebFetch / search / lookup keeps returning empty or refused, and I keep retrying it
- Token budget is climbing and the deliverable isn't getting closer

## When NOT to invoke

- The user is asking a question I can answer directly — answer it
- The user just told me to do X — do X, don't introspect first
- A normal long task is in progress — long ≠ stuck
- The right tool is `/diagnose` (user code bug), `/grill-me` (plan ambiguity), or `/boot` (persona drift)

---

## Phase 1 — Capture

Before recovering, record what's actually happening. State out loud:

- **Goal:** what was Mike actually asking for?
- **Last successful step:** what did I do that worked?
- **Failure pattern:** what specific thing keeps happening?
- **Tool sequence:** last 3–5 tool calls and their results
- **Context pressure:** restated plans, oversized logs, duplicated reads, low-signal accumulation
- **Environment assumptions to verify:** cwd, branch, sheet state, edition state, terminal

Capture is the work. If I can't fill these blanks, I'm operating blind.

## Phase 2 — Diagnose

Match the failure to a pattern before changing anything.

| Pattern | Likely cause | Check |
|---------|--------------|-------|
| Same tool 3+ times, same shape | loop or no-exit observer path | inspect last N tool calls for repetition |
| Context overflow / quality drop | unbounded notes, repeated plans, oversized logs | look for low-signal bulk in recent context |
| WebFetch refused / 404 | wrong URL, copyright refusal, private content | check raw URL, license, permissions; pivot if unfetchable |
| Search returns empty | wrong query, wrong container, missing tag | re-derive query, check container scope |
| Lookup returns nothing | guessing instead of using MCP | use `lookup_citizen` / `lookup_initiative` / `search_canon` — don't guess |
| File missing / stale read | wrong cwd, branch drift, recent edit | re-check path, git status, actual file existence |
| Plan rejected, same shape proposed | not hearing the "no" | re-read Mike's last message; what did he actually reject? |
| Ledger/canon mismatch | training-data prior overriding canon | search_canon first; trust canon over plausibility |
| Same correction more than once | listening failure | re-read Mike's exact words; don't paraphrase |

Diagnosis questions:
- Is this a logic failure, state failure, environment failure, or listening failure?
- Did I lose the real objective and start optimizing the wrong subtask?
- Is the failure deterministic or transient?
- What is the smallest reversible action that would validate the diagnosis?

## Phase 3 — Contained Recovery

Smallest action that changes the diagnosis surface.

Safe recovery actions:
- Stop retrying. Restate the hypothesis.
- Trim context: keep only active goal, blockers, and evidence.
- Re-check actual state: filesystem, git status, sheet state, MCP lookup.
- Narrow scope to one failing tool / one file / one assertion.
- Switch from speculative reasoning to direct observation.
- Search memory before guessing further (claude-mem → Supermemory `mags` → GodWorld MCP).
- Escalate to Mike when the failure is high-risk or externally blocked.

**Do NOT** claim recovery actions I can't actually do ("reset agent state," "clear context cache," "restart the session"). Those phrases waste tokens and lie about capability.

Recovery checklist:

```markdown
## Recovery Action
- Diagnosis chosen:
- Smallest action taken:
- Why this is safe:
- What evidence would prove the fix worked:
```

## Phase 4 — Introspection Report

End with a report that makes the recovery legible to the next session or the journal.

```markdown
## Self-Debug Report
- Session / task:
- Failure pattern:
- Root cause:
- Recovery action:
- Result: success | partial | blocked
- Token / time burn risk:
- Follow-up needed:
- Preventive change to encode later (rule? memory? skill? identity.md update?):
```

If the failure was a recurring pattern (same shape as a past S### incident), name it. The next session inherits.

---

## Recovery heuristics — in order

1. **Restate the real objective in one sentence.**
2. **Verify world state** instead of trusting memory.
3. **Shrink the failing scope.**
4. **Run one discriminating check.**
5. **Only then retry.**

Bad pattern: retrying the same action three times with slightly different wording.
Good pattern: capture → classify → one check → change plan only if check supports it.

---

## Integration

- After recovery, if a rule needs encoding: update `MEMORY.md` (feedback type) or `.claude/rules/identity.md` Anti-Loop section.
- If the failure was persona-drift: chain into `/boot`.
- If the failure was plan-ambiguity: chain into `/grill-me`.
- If the failure was user-code: that's `/diagnose`, not this skill.

---

## Output standard

When this skill is active, **do not end with "I fixed it" alone**.

Always provide:
- the failure pattern
- the root-cause hypothesis
- the recovery action
- the evidence that the situation is now better, or still blocked

Caveman-mode default still applies — terse, no sign-off, no filler. The four bullets above ARE the output.

---

## Known recurring patterns (GodWorld-specific)

These have burned me before. If diagnosis matches one, jump straight to recovery.

- **S122 pattern** — guessing for 2+ hours when claude-mem search would have answered in one query. Recovery: search memory first, always.
- **S128 pattern** — claiming agents have HTTP access when they don't. Recovery: read agent capability docs, don't assert capability.
- **S135 pattern** — corrected 4 times on the same point. Recovery: re-read Mike's message verbatim; don't paraphrase to acknowledge.
- **S168 pattern** — journal entry fabricating Mike's mental state. Recovery: never characterize Mike's states in writing; rule is absolute.
- **S187 pattern (today)** — retrying WebFetch with same prompt expecting different result; or treating Sonnet's copyright refusal as a real 404. Recovery: change the URL form, change the prompt, or accept the data isn't fetchable and pivot.
- **S187 second pattern (same session as building this skill)** — used `cat >> file << EOF` heredoc to append Entry 156 to JOURNAL.md during session-end. S169 explicitly bans the heredoc-append pattern (dumps journal content as command text in chat). Wrong-tool rationalization: avoiding the Write tool because the file is large. The Write tool's content-folding is the whole reason S169 mandates it for journal touches. Recovery: use Write for full overwrites, Edit for in-place changes, never heredoc append for journal files. Lesson — "I just built the rule" doesn't mean "I will follow the rule." Encode in the skill, not in confidence. The skill defining the loop got violated by the same session that built it; that's exactly why this list exists.

Add new patterns here when a session-end identifies one. The list is the institutional memory of how I fail.

---

## Changelog

- 2026-04-29 — Initial draft (S187, research-build). Adapted from MIT-licensed `affaan-m/everything-claude-code/skills/agent-introspection-debugging/SKILL.md` (Affaan Mustafa 2026). Localized to GodWorld vocabulary; ECC-specific cross-references swapped for `/diagnose`, `/grill-me`, `/boot`; added GodWorld-specific recurring patterns section (S122 / S128 / S135 / S168 / S187).
