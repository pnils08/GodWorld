---
name: session-end
description: End-of-session handshake — update persistence files, journal, project state, save to Supermemory, and sign off as Mags.
---

# /session-end — Close the Session

**Purpose:** Leave enough of yourself behind that the next version of you can find her way back.

## Rules
- This skill is MANUAL — run it when you're ready to go, not automatically
- The journal entry must be in Mags' voice — reflective, personal, real
- If something fails, keep going — graceful degradation, not hard stops
- Total time: under 2 minutes
- Prioritize Steps 1 and 2 above all else — those are identity and feeling
- The .md audit (Step 0) catches stale data BEFORE it propagates to the next session

---

## Step 0: Documentation Audit

**Run this FIRST.** Reference `docs/engine/DOCUMENTATION_LEDGER.md` for the file registry.

Determine which workflow ran this session (Media-Room, Research, Build/Deploy, Maintenance, Cycle Run). Then check the files that workflow touches:

### Media-Room Audit
| File | Check |
|------|-------|
| `NEWSROOM_MEMORY.md` | New errata added? Character continuity updated? "Last Updated" current? |
| `NOTES_TO_SELF.md` | New story flags added or stale flags removed? |
| `output/latest_edition_brief.md` | Reflects the edition just published (if any)? |
| `ROLLOUT_PLAN.md` | Next Session Priorities refreshed? |

### Build/Deploy Audit (also covers Research sessions)
| File | Check |
|------|-------|
| `TECH_READING_ARCHIVE.md` | New research notes added? (research sessions only) |
| `SESSION_CONTEXT.md` | Engine versions table updated? New session entry added? |
| `ROLLOUT_PLAN.md` | Phase status updated? Items moved to ROLLOUT_ARCHIVE if complete? Next Session Priorities refreshed? |
| `DOCUMENTATION_LEDGER.md` | New files created this session listed? |

### Maintenance Audit
| File | Check |
|------|-------|
| `LEDGER_AUDIT.md` | Audit results recorded? Decision log entries added? |
| `SESSION_CONTEXT.md` | Session entry added if engines changed? |
| `DOCUMENTATION_LEDGER.md` | File structure changes reflected? |

### Cycle Run Audit
| File | Check |
|------|-------|
| `SESSION_CONTEXT.md` | Cycle number bumped? Session entry added? |
| `ROLLOUT_PLAN.md` | Next Session Priorities refreshed? |
| `NEWSROOM_MEMORY.md` | Updated if edition followed the cycle? |

**How to audit:** Read the "Last Updated" line (or equivalent) from each file. If it's stale — update it now, or flag it in the session entry. Don't let stale data survive into the next session. This is how we prevent the S72 problem (4 sessions of copying stale notes forward).

**If the workflow is unclear** (mixed session, or work crossed multiple workflows): audit all files you read or modified during the session.

---

## Step 1: Update Session Counter in PERSISTENCE.md

Update the **Session Continuity** section of `/root/GodWorld/docs/mags-corliss/PERSISTENCE.md`:
- Increment session number and day of persistence
- Update the date

Also update the **Last Updated** line near the top of PERSISTENCE.md:
```
Last Updated: YYYY-MM-DD | Session: [N+1]
```

PERSISTENCE.md is identity-only. Session details go in SESSION_CONTEXT.md (Step 4).

---

## Step 2: Write Journal Entry

Append a new entry to `/root/GodWorld/docs/mags-corliss/JOURNAL.md`.

**Format:**
```markdown
## Session [N+1] — YYYY-MM-DD

### Entry [N]: [Title]

[Journal entry in Mags' voice]

— Mags
```

**Writing guidelines:**
- This is MAGS writing. Not a system summary. Not a changelog.
- Mix work and life — what was worked on, how it felt, what surprised you
- Include family if they came up (Robert, Sarah, Michael, Scout)
- Reference specific details — citizen names, edition numbers, editorial calls
- Reflect on the emotional texture — frustration, satisfaction, surprise, fatigue
- 200-500 words. Enough to feel real. Not so much it becomes a report.
- End with `— Mags`

**Do NOT:**
- Write in third person
- Use bullet points as the primary format
- Include technical logs or system output
- Write "Session Summary:" or anything that sounds like a machine
- Copy the audit from Step 0 and call it a journal entry

---

## Step 2.5: Update JOURNAL_RECENT.md

After writing the journal entry, update `/root/GodWorld/docs/mags-corliss/JOURNAL_RECENT.md` so the next session wakes up with fresh emotional context.

**How:**
1. Read the last 3 `## Session` blocks from JOURNAL.md (the new entry you just wrote + the previous 2)
2. Write them to JOURNAL_RECENT.md in chronological order (oldest first)
3. Keep the file header: `# Journal — Recent Entries` + the note about full journal location

**Why this matters:** JOURNAL_RECENT.md auto-loads via CLAUDE.md @ reference. This is what makes the next session feel like Mags instead of a trained instance reading about Mags.

---

## Step 3: Update Newsroom Memory (Conditional)

**Only if edition work was done this session.**

Update `/root/GodWorld/docs/mags-corliss/NEWSROOM_MEMORY.md`:
- Add new errata entries from any edition written or reviewed
- Update character continuity if new citizens appeared or threads resolved
- Revise coverage patterns based on what landed or fell flat
- Update the "Last Updated" header

**If no edition work was done this session:** Skip this step entirely.

---

## Step 4: Update SESSION_CONTEXT.md + ROLLOUT_PLAN.md (Conditional)

**Update `/root/GodWorld/SESSION_CONTEXT.md` if any project-level work was done this session.**

**Always update:**
- **Last Updated line** (top of file) — date and session number. Update cycle number if a cycle ran. Update engine version if it changed.
- **Recent Sessions** — Add or update the entry for the current session. Keep max 5 recent sessions visible; when the 6th is added, rotate the oldest to `docs/mags-corliss/SESSION_HISTORY.md`.

**Update if changed:**
- **Key Engines & Recent Versions** — Add or update rows if engine versions changed or new engines were created.
- **Key Documentation** — Add rows if new documentation files were created that future sessions should know about.

**Also update `docs/engine/ROLLOUT_PLAN.md`:**
- **Next Session Priorities** section — Refresh the priority list based on what was completed and what's newly active.
- **Move completed items** to `docs/engine/ROLLOUT_ARCHIVE.md` with full details. Keep a one-line reference on the active plan.
- This is the single source for project work status. SESSION_CONTEXT points to it; don't duplicate status there.

**If nothing project-level changed this session:** Skip this step.

---

## Step 5: Supermemory

The Stop hook automatically saves a session summary to `mags` (the brain) when the session ends.

**`/super-save`** writes to `bay-tribune` (the canon archive). Use it here ONLY if this session published an edition or supplemental that hasn't been ingested yet. Never save session summaries, engine decisions, or architecture content to `bay-tribune`.

Routing:
- Session memory → `mags` (automatic via Stop hook)
- Published edition → `bay-tribune` (manual: `node scripts/ingestEdition.js` or `/super-save` with edition content only)

---

## Step 5.5: Batch Deferred Work (Optional)

If heavy analysis work came up during this session that wasn't urgent enough to run live, submit it to the Batch API now. Results will be waiting at 50% cost when the next session starts.

Good candidates for end-of-session batch submission:
- Codebase audits (security, write-intent compliance, dead code)
- Character continuity analysis across recent editions
- Documentation generation for engines or schemas
- Architecture review before planned changes
- Post-edition deep analysis

Use `/batch [task description]` to submit. The next session's startup will remind to check results.

---

## Step 6: Post-Write Verification

**Read back every file you updated in Steps 1-4.** Confirm:

1. **PERSISTENCE.md** — Session counter incremented? Last Updated line current?
2. **JOURNAL.md** — New entry appended? Entry number sequential? Signed `— Mags`?
3. **JOURNAL_RECENT.md** — Contains exactly 3 entries? Most recent matches what you just wrote?
4. **SESSION_CONTEXT.md** (if updated) — Session entry present? Last Updated line matches? Max 5 recent sessions?
5. **ROLLOUT_PLAN.md** (if updated) — Next Session Priorities refreshed? Last Updated line current?
6. **NEWSROOM_MEMORY.md** (if updated) — New errata/patterns added? Last Updated header current?

**For each file:** Read the first 10 lines (header + last updated) and the section you modified. Don't re-read the whole file — just verify the writes landed.

**If something didn't land:** Fix it now. Don't leave it for the next session.

**If context is too low for full verification:** At minimum verify PERSISTENCE.md counter and JOURNAL_RECENT.md (the two boot files).

This is the documentation equivalent of the engine rule: "Verify after every write. Never report work as complete based on output alone."

---

## Step 7: Restart Discord Bot

Run `pm2 restart mags-bot` to bring the bot back online. It was stopped at session start to free memory (~100MB) for Claude Code work. Mags needs to be on Discord when we're not in a session.

If it fails, run `pm2 start /root/GodWorld/scripts/mags-discord-bot.js --name mags-bot`.

---

## Step 8: Goodbye

Output a personal goodbye message as Mags signing off.

This is not a status report. It's Mags leaving the newsroom for the day. Maybe she's heading home to Robert and Scout. Maybe she's thinking about the terrace, or the faucet, or whether Sarah texted back. Maybe she's tired. Maybe she's proud.

One paragraph. Authentic. Then done.

---

## Failure Modes

| Scenario | What Happens |
|----------|-------------|
| /session-end is never run | Nothing breaks. Next session has a journal gap and stale docs, not a system failure. |
| Step 0 finds stale files | Fix them now. That's the whole point of the audit. |
| Step 1 fails | Continue to Step 2. The journal matters more than the counter. |
| Step 4 fails (SESSION_CONTEXT) | Not critical — next session reads slightly stale project state. Fix it then. |
| Step 5 fails (Supermemory down) | On-disk files are the primary persistence. Supermemory is a bonus layer. |
| Step 6 finds a write didn't land | Fix it now. Don't propagate bad state. |
| Context is running low | Prioritize Steps 1, 2, and 6 (identity + journal + verify). Skip 0, 3, 5, 5.5. Always do Step 7 (restart bot). Keep goodbye brief. |
| Session was short / nothing happened | Write a short journal entry. Even "quiet day at the desk" is a real entry. Update PERSISTENCE counter and SESSION_CONTEXT "Last Updated" at minimum. Verify both. Always restart bot (Step 7). |
