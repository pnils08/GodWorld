# Brief for agy — adversarial review: Anthony Raines, step 2 (his record, read live)

**From:** research-build · **Date:** 2026-11-24 · **Your output:** `output/antigravity/2026-11-24-review-anthony-step2-record.md` · read-only on code.

## What this step is

Anthony's record moves off `scripts/buildAnthonySlice.js` (scores every feed row, makes the top score his story, writes his claim, picks two methods) onto a record read live from the sheet each morning. Builder 2026-11-24: "they see the headlines and they cover the stories"; "just read the sheets live that way anything that happens during the week gets covered and doesn't wait til the cycle runs". Plan: `docs/plans/2026-11-21-reporters-wake-as-themselves.md` §The sports seats. Step 1 (his seat file) is reviewed and folded; this step is the record only. Wiring him to it (BEAT_BUILDERS, package seatFile, tools) is step 4 — not in this diff.

## The diff

Commit `d69ac547c`: new `scripts/sportsFeedLive.js`, new `scripts/buildAnthonyRecord.js`, `scripts/beatSliceKit.js` (wire().load: a `seat.live` record is rebuilt on every load), `scripts/newsroom-fanout.js` (buildFanout refreshes the live copy before `enrichBeatSeats`). Printed record: `output/slices/c117/anthony-raines.md`, `output/cron-compare/anthony_record_slice_c117.json`.

## Attack these — each against the code

1. **Privacy.** The builder's private `question` rows (engine.338, `lib/feedPrivacy.js`) must never reach the record. Any path where they do: header index, a renamed/missing EventTrigger column, rows read some other way.
2. **The live copy's life.** It is written only by the fanout's morning run (and the CLI). Which stages read it (W1 angle, W2 report, W3 write — `cron-desk-run.js`, `cron-desk-writer.js`), and can a stage read a copy from a different day than the one his angle was planned on? A failed refresh keeps the last copy — can that copy be from an earlier Cycle and still pass? The `live` flag bypasses the cache — every effect of that on `enrichAssignment`, the stale-slice check (`staleBeatRef` / `priorBeatRefs` in `newsroom-fanout.js`, keyed on `story.ref`), and the morning/evening re-load.
3. **The window.** Rows with Cycle in [cycle−1, cycle+1] and TeamsUsed matching A's. Which `cycle` does the fanout pass at 06:15 on a Monday after a Sunday fire, and does a row the builder labels with the next Cycle mid-week land in the window? Rows with a blank or non-numeric Cycle. The A's regex against the feed's real TeamsUsed values (read the sheet or `output/beats/Oakland_Sports_Feed.jsonl`): any A's row it misses, any non-A's row it takes.
4. **Puppeting left in the record.** The kit's makeSlice/formatMarkdown add an approach tail, a FORBIDDEN list, "THE ROOM IS YOURS", "the people in the room are yours to paint, unnamed". For a records seat that interviews no one (builder: Anthony does not quote citizens): anything here that steers his story, invites invented people, or contradicts his seat file (`.claude/agents/anthony-raines/SEAT.md`).
5. **Other seats.** The kit change and the fanout change run for every seat today. Any seat whose behaviour changes, and the fanout's failure modes (a Sheets quota error at 06:15; the refresh's time on the morning budget).

Each finding: file:line, the failure scenario, severity. Verify every claim against the code. Do not propose a different goal or design.
