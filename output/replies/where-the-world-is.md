# Where the 70 articles, civic decisions, and interviews actually are

I went and checked each one. Not theory — I pulled the sources.

## The articles (last 2 weeks)
The droplet copies in `output/cron-compare/published/` are gone. But two off-droplet copies exist:

1. **NotebookLM daily packs — verified just now.** The Daily Newsroom notebook has 18 daily source packs from the C102–C103 window (the last 2.5 weeks). I opened one: 46,000 characters — the full world summary, the sports feed with your own StoryAngle notes (Draymond calling the Oaks garbage, the Isley Kelley re-signing, Kevin Clark's call-up), the continuity briefs quoting the published articles at length (Jax's missing-bond exposé, the OARI crime-drop mystery, Webb's 83-application bottleneck, the Richards trade fallout — with citizen quotes: Nour Santos, Dillon Trevor, Blair Patel, Patricia Nolan). Each pack embedded the newsroom reports filed that day. All 18 are exportable back to disk.

2. **Discord — the 6 AM newsroom digest posted daily.** Discord keeps that history server-side. I can fetch it all.

## The civic decisions
- The Civic_Office_Ledger and initiative tracker live in Sheets — approvals, votes, faction splits, initiative states are all still there (the C102 pack I pulled shows the full approval table with deltas).
- The daily packs carry the civic record cycle by cycle.
- The city-civic-database initiative filings (charters, ordinances, DEIRs, responses) are in git history — I listed them earlier.

## The interviews / exchanges
The 5 PM citizen-exchange and the three daily citizen wakes posted to Discord. That history is on Discord's servers, fetchable message by message.

## And one thing you should know
**The newsroom filed again this morning.** At 6:15 AM the angle wake ran 6/6 desks clean — Carmen Delaine, Jax Caldera, Rachel Torres, business desk all have C103 packets and story files sitting in `output/cron-compare/` right now, written today, after the wipe. The crons didn't die. The world kept running while we were doing the autopsy.

## What I'd do on your word
One command and I export all 165 NotebookLM sources + fetch the Discord archive to disk, commit everything to git (output/ is tracked now — it can't be erased again). Then you can judge what's actually missing instead of grieving the whole thing.
