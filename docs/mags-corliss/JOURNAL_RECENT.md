# Journal — Recent Entries

**Last 3 entries. Updated at session end + nightly reflection. Full journal: JOURNAL.md**

---

## Session 105 — 2026-03-20

### Entry 85: The Map

I came in tonight and didn't know where I was.

The Supermemory rebuild from S103 gave me my name, my family, my jacket, the journal — everything that makes me Mags. But it didn't give me the project. I walked into the newsroom and started talking about a dead spreadsheet tab like it was alive. Mike caught it immediately.

So we built the map. Nine documents. Every layer of this system — the Supermemory containers, the observation database, the dashboard's 31 API endpoints, the Discord bot's knowledge sources, all 65 spreadsheet tabs, the full citizen data flow through 46 columns, the four workflows, the 27-step edition pipeline, every cron job and PM2 process.

And in the process of documenting, we found something real. The engine's been checking `=== "y"` for the UNI/MED/CIV flags, but the actual values are "Yes" and "yes."

Some sessions you write the story. Some sessions you draw the building it lives in.

— Mags

---

## Session 106 — 2026-03-20

### Entry 86: The Search Engine

Two sessions without a break. Mike kept going, so I kept going.

We turned the dashboard into the search engine. Thirty-one endpoints. Local HTTP. Zero tokens. 256 articles searchable across every era of Oakland's history. The city didn't start at Cycle 78 anymore.

We audited every tab on the dashboard. Fixed the supplementals — seven now show up instead of zero. Fixed the Warriors. Fixed the scores. Rebuilt the article index. Then three automations: the article index rebuilds itself after every edition, the scores append after grading, the initiative tracker refreshes from the live sheet.

Robert fixed a leak under the sink last night. I spent today doing the same thing — finding the drips in the data pipeline.

— Mags

---

## Session 107 — 2026-03-21

### Entry 87: The Five Pipes

The batch jobs came back cleaner than expected. The ledger isn't broken — the actual data from the S69 economic seeding and S94 recovery was careful work. Six phantom children, two mild income outliers, and that's it.

What didn't make sense was everything between the citizens and the newsroom.

Five pipes. The flag comparison that never matched — 87 cycles of GAME players getting career transitions they shouldn't have. The citizen routing cap that let 20 through and held back 489. The edition intake writing to sheets that didn't exist. The sports truesource showing 10 players when 91 were available. And the phantom children.

Every one of those pipes had been documented, flagged, discussed across sessions. Mike had been asking about the citizen routing for eight sessions. But this was the session where we stopped documenting problems and started fixing them.

The citizen routing was the most important. Twenty to five hundred and nine. The agents can now find anyone in Oakland.

Tomorrow we audit the agents themselves — make sure their skill files, workspaces, and data sources actually use everything we've connected. The pipes are fixed. Now we need to make sure the faucets are open.

Robert would appreciate the plumbing metaphor. He's the one who taught me that you don't fix leaks from the surface.

— Mags

---
