# TASK — codex holds the lead: make Nia Rook's seat work (builder 2026-10-28)

Builder-direct: "Give this to codex." Codex leads this job; research-build executes nothing on it. Rulings, verbatim where it matters:

- "Nothing is done til these work" — Nia's pieces must pass their grade (length floor 350–600 daily / 350–650 digest; contract 4/4; Rhea PASS).
- "A cron only uses a tool to answer a question … it isn't going to just use them." Tools fire only when the seat has a question in front of it.
- "You aren't supposed to be telling them what to say." No frame/rule/kickoff prose instructing the writer how to write. Gate the facts, not the color (memory/project_gate-the-facts-not-the-color.md); "This has nothing to do with people" — a named person with no ledger row stays a ghost (SIM_DOCTRINE §6).
- "I'm giving them 25% of the world … hearing it said back to me is not journalism, I want the 75% I don't see."
- "Nia and Tamsin cover different stuff so a copy isn't the answer." Nia = the UNDOCKED show, who's up who's down; Tamsin = Lives.
- Only approved change today: Nia's two seats → openai/gpt-6-luna (scripts/newsroom-wake-packages.json). Everything else from research-build today is unapproved and may be reverted on the builder's word (commits 0a01b0ad, e920de34, 7e53f0a6 frame rewrites; fd819da6 tools+frame).

Evidence:
- Isolated test today (untouched week): output/cron-compare/undocked_c113_nia-rook_packet-v2_benchmark-isotest-1028_openai-gpt-6-luna.{md,tooltrace.json,state.json} — 313 words, 0 tool calls, feed read back. Monday live (grok): …_x-ai-grok-4-3.md 321 words, same shape. Sat 10-24 digest 298 words, 1/4.
- Seats whose tools fired Mon 10-26: Tamsin 5× citizen_lookup(thread) (her slice lists citizens), Luis/Angela 3× sheet_read+canon_search (a named initiative/hood in the assignment). Traces: output/cron-compare/*_c113_packet-v2_<persona>.tooltrace.json.
- Nia's slice: scripts/buildNiaSlice.js → output/cron-compare/nia_slice_c113.json (events, standings; no person/place shaped for a lookup). Her data contract (bag) forbids raw episodes / Undocked_Feed tab.
- Writer: scripts/cron-desk-writer.js (SEAT_TOOL_FRAMES now tools-only; STRICT SOURCE HYGIENE block fires on every packet-v2 write; NIA_FRAME tools: citizen_lookup thread, canon_search, sheet_read Neighborhood_Map).
- Open question put to the builder, unanswered: what is Nia's question when an episode lands — the pilot's earlier episodes (the show's own record), the pilot off the ship (the city), or where the city is watching?

Deliverable: a plan or diff for the builder's approval before any build (he approves per change). Writable scope per AGENTS.md: scripts/**, output/**, docs/**.

## Builder, 2026-10-28, after the test runs (verbatim) — the actual problem
"The issue with undocked is no one knows how to play, Eric Taveras scored a lot on 1 run and no other cron has figured out how to play." Start there: the pilot briefs and the game (scripts/cron-undocked-run.js, the pilot brief, Undocked_Feed), not Nia's seat. Her episodes read "dead even" because the episodes are.
Test runs for reference: output/cron-compare/undocked_c113_nia-rook_packet-v2_benchmark-isotest-1028_openai-gpt-6-luna{,.run2}.md — no instruction: 0 lookups / 313 words; with "pull their thread": 4 lookups / 343 words.
