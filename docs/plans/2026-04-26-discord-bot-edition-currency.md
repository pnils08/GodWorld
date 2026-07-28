---
title: Discord Bot Edition Currency Plan
created: 2026-04-26
updated: 2026-04-26
type: plan
tags: [media, infrastructure, active]
sources:
  - docs/DISCORD.md (current bot architecture)
  - lib/mags.js (loadEditionBrief, loadWorldState)
  - output/production_log_edition_c92.md (replacement source)
  - SESSION_CONTEXT.md S180 entry (this session, problem surfaced)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[DISCORD]] — bot architecture doc to update"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — add entry in same commit"
---

# Discord Bot Edition Currency Plan

**Goal:** Discord bot's hourly system-prompt rebuild reads current cycle + current edition state from artifacts that already exist (`base_context.json`, `production_log_edition_c{XX}.md`), with no special-purpose Discord MD files.

**Architecture:** Today the bot's edition awareness comes from a hand-maintained `output/latest_edition_brief.md` that nothing auto-refreshes. The production log `output/production_log_edition_c{XX}.md` already contains the same canon (front page, story lineup, citizens, storylines, canon rules) as part of the publish pipeline. Point `lib/mags.js` `loadEditionBrief()` at the latest production log (auto-detect highest cycle, truncate to first ~80 lines), delete the legacy brief, and add a `base_context.json` refresh step to `/post-publish` so cycle-source-of-truth refreshes after every publish.

**Terminal:** cross-terminal — research-build (skill + plan + rollout), engine-sheet (code + filesystem), media (desk agent file references)

**Pointers:**
- Prior work: S180 base_context.json refresh (manual run this session, C90 → C92)
- Symptom case: S180 — bot was C90-anchored even though E91 + E92 + Mayor interview all canonized
- Related: `/post-publish` skill currently does not refresh `base_context.json` or production-log-derived bot context after publish

**Acceptance criteria:**
1. After `/post-publish` runs, mags-bot's next hourly rebuild reflects the latest published cycle and edition without any manual file maintenance.
2. `output/latest_edition_brief.md` no longer exists; no script or agent file references it.
3. `lib/mags.js loadEditionBrief()` reads the highest-numbered `production_log_edition_c{XX}.md` truncated to a fixed line budget; gracefully degrades to empty string if no production log present.
4. Token cost of the bot's system prompt is within ±10% of current (~3KB for the edition section).

---

## Tasks

### Task 1: Update `/post-publish` skill to refresh `base_context.json` (research-build)

- **Files:**
  - `.claude/skills/post-publish/SKILL.md` — modify
- **Steps:**
  1. Read current SKILL.md to find the right step number to insert after (likely after the wiki-ingest step, before final verification).
  2. Add a step: `node scripts/buildDeskPackets.js {cycle}` — refreshes `output/desk-packets/base_context.json` to the just-published cycle. Side effect: rebuilds the 9 desk packets, which is harmless but takes ~60 seconds.
  3. Document why: this is what `lib/mags.js loadWorldState()` reads to know the current cycle. Without this step, the Discord bot reports a stale cycle until the next manual cycle run.
  4. Bump skill `updated:` to today's date and `version` minor.
- **Verify:** `grep "buildDeskPackets" .claude/skills/post-publish/SKILL.md` → returns the new step.
- **Status:** **DONE S184** (research-build). New "Step 5b: Refresh base_context.json + desk packets" inserted between Step 5 (intake to sheets) and Step 6 (grade edition) — runs all-types so dispatch / interview / supplemental publishes also keep the bot's worldview current. Skill version bumped 1.2 → 1.3, updated 2026-04-28. Verification gate cites `base_context.json` mtime + cycle-field match.

### Task 2: Rewrite `loadEditionBrief()` in `lib/mags.js` to read latest production log (engine-sheet)

- **Files:**
  - `lib/mags.js` — modify (function at line 417)
- **Steps:**
  1. Replace the current implementation. New implementation:
     ```javascript
     function loadEditionBrief() {
       var outputDir = path.join(ROOT, 'output');
       try {
         var files = fs.readdirSync(outputDir).filter(function(f) {
           return /^production_log_edition_c\d+\.md$/.test(f);
         });
         if (!files.length) return '';
         files.sort(function(a, b) {
           var na = parseInt(a.match(/c(\d+)/)[1]);
           var nb = parseInt(b.match(/c(\d+)/)[1]);
           return nb - na;
         });
         var latest = path.join(outputDir, files[0]);
         var raw = fs.readFileSync(latest, 'utf-8');
         var lines = raw.split('\n').slice(0, 80);
         return lines.join('\n');
       } catch (err) {
         return '';
       }
     }
     ```
  2. No other change to mags.js — same export name, same return shape (string), same downstream consumers.
- **Verify:** `node -e "console.log(require('./lib/mags').loadEditionBrief())" | head -10` → prints first lines of `production_log_edition_c92.md` (or whichever is highest at run time).
- **Status:** [ ] not started

### Task 3: Delete `output/latest_edition_brief.md` and remove from `postRunFiling.js` (engine-sheet)

- **Files:**
  - `output/latest_edition_brief.md` — delete
  - `scripts/postRunFiling.js` — modify (entry at lines 103–109)
- **Steps:**
  1. `rm output/latest_edition_brief.md`
  2. In `postRunFiling.js`, remove the `Edition brief` entry from the file-list array (currently `required: false`, so removal won't break existing required-checks).
- **Verify:** `grep -rn "latest_edition_brief" /root/GodWorld/scripts/ /root/GodWorld/lib/` → zero hits in `scripts/` and `lib/`.
- **Status:** [ ] not started

### Task 4: Update `docs/DISCORD.md` to reflect new load contract (engine-sheet, same commit as Task 2)

- **Files:**
  - `docs/DISCORD.md` — modify
- **Steps:**
  1. In the Knowledge Sources → Local Files table, change the `Edition brief` row's "What it provides" from `loadEditionBrief() — output/latest_edition_brief.md` to `loadEditionBrief() — first 80 lines of latest output/production_log_edition_c{XX}.md`.
  2. Add a one-line note under the table: "No standalone bot context files. Bot reads what the publish pipeline already produces."
  3. Bump `updated:` if the file has frontmatter (it doesn't currently — leave alone).
- **Verify:** `grep "production_log_edition" docs/DISCORD.md` → returns the new reference.
- **Status:** [ ] not started

### Task 5: Update letters-desk references to the brief (media terminal)

- **Files:**
  - `.claude/agents/letters-desk/RULES.md:50` — modify
  - `.claude/agent-memory/letters-desk/MEMORY.md:12` — modify
- **Steps:**
  1. Both lines reference `output/latest_edition_brief.md` for the "citizens already claimed by other desks" check. Replace with `output/production_log_edition_c{XX}.md` (latest cycle), specifically the `## Story Lineup` table where citizens are referenced.
  2. Verify the letters-desk skill / sift instruction set still works against the production log as the source — production log uses different formatting than the brief did, but the citizen-name list is enumerable from it.
- **Verify:** `grep "latest_edition_brief" .claude/agents/letters-desk/ .claude/agent-memory/letters-desk/` → zero hits.
- **Status:** [ ] not started

### Task 6: Smoke-test bot context after Task 2 lands (engine-sheet)

- **Files:**
  - none — verification only
- **Steps:**
  1. After Task 2 commits, run: `node -e "var m=require('./lib/mags'); console.log(m.loadWorldState()); console.log('---'); console.log(m.loadEditionBrief())"`
  2. Verify cycle in `loadWorldState()` matches the highest `production_log_edition_c{XX}.md` cycle.
  3. Restart `mags-bot` if Mike wants the live bot updated immediately: `pm2 restart mags-bot` (boot stops it during sessions; will pick up on session-end restart automatically otherwise).
- **Verify:** stdout shows current cycle and a non-empty production-log excerpt.
- **Status:** [ ] not started

---

## Open questions

None — all resolved during S180 conversation with Mike.

---

## Changelog

- 2026-04-26 — Initial draft (S180, research-build). Surfaced when bot was C90-anchored despite E91 + E92 + Mayor interview canonized; `base_context.json` frozen at C90 from April 3 and `latest_edition_brief.md` frozen at E90 from April 5. Mike's editorial direction: bot should read what already exists, no special-purpose Discord MD files.
- 2026-04-28 — Task 1 DONE (S184, research-build). `/post-publish` SKILL.md gets new "Step 5b: Refresh base_context.json + desk packets (all types)" inserted between Step 5 and Step 6. Cross-type — runs for dispatch / interview / supplemental publishes too, not just editions, so the bot's worldview stays current after any publish event. Skill 1.2 → 1.3. Engine-sheet picks up Tasks 2/3/4/6 (lib/mags.js rewrite, file delete, DISCORD.md update, smoke test). Media picks up Task 5 (letters-desk RULES + MEMORY refs).
