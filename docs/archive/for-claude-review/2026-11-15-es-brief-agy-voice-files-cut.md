# Brief for agy — adverse review of the voice-file cut (engine-sheet, 2026-11-15)

Read-only. No code or file edits. Write findings to `output/antigravity/2026-11-15-review-voice-files-cut.md`.

## What was done
Builder's word: "review the voice files and remove , build talk, CLI structure, puppeting, examples may be ok but we want to be careful of hardcoding them to an instruction".
The 30 files in `docs/media/voices/` were cut by one rule set to: title, the Desk | Beat line, `## Essence`, `## Exemplar`. Everything else was removed. See the diff: `git show HEAD -- docs/media/voices` (the commit titled "Voice files cut to who the reporter is").
The Essence is live: `scripts/reporterIdentity.js` puts it at the top of every reporter's write wake and morning wake. Nothing else in these files is read by a wake.

## Try to prove this wrong
1. **Left in that should be out.** Any line still in an Essence or Exemplar that is build talk (packet, slice, engine, tool, cron, slug, POPID, model seat), a format contract, or an instruction on what to say, how to open or how to close. Quote file:line.
2. **An example that works as an instruction.** Any Exemplar that would be acted out as a form (a fixed opener, a sign-off, a tag, a word count) rather than read as a past piece. Say which and why.
3. **Cut that should have stayed.** Compare `git show HEAD~1:docs/media/voices/<file>` against now. Name anything removed that was who the person is (history, temperament, how they talk) and not direction. Quote the removed line.
4. **Facts the ledger owns.** Ages, homes, family, roles stated in an Essence. Check each against `output/simulation_ledger_snapshot.jsonl` by POPID (`scripts/persona-map.json` gives the POPIDs). List matches and contradictions separately.
5. **Real-world leaks** in what remains (real places, teams, people, calendar years).
6. **The cut's own consistency.** A file where the rule set was applied differently from the others.

Each finding: file:line, the quoted text, which of the six it is, and how sure you are. A finding without a quoted line is not a finding. Do not propose rewrites of a reporter's character.
