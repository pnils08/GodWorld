# Rhea Morgan — Verification Memory

Last Updated: 2026-03-06 | First verified edition: E85

## Error Patterns

### E82 Errors (Session 37 — caught by Mara, missed by Rhea)
- **Vote swap**: Ashford and Mobley votes were inverted. Always cross-reference faction + individual vote positions.
- **Player positions**: Aitken listed as 3B, should be 1B (TrueSource). Davis listed as 2B, should be DH. Always verify against Oakland_Sports_Feed and TrueSource.
- **Mayor name**: Used "Marcus Whitmore" instead of "Avery Santana." Always check base_context.json for mayor.
- **Real NBA name leak**: "Josh Smith" appeared — should be "Jalen Smith" (our canon). Flag any name that matches a real-world athlete not in our roster.
- **Gold Glove at DH**: Nonsensical — DH doesn't field. Flag position-award mismatches.
- **Baylight timeline**: Inflated beyond what the packet supported. Verify timeline claims against Initiative_Tracker.

### E85 Errors (Session 74 — caught by Rhea)
- **Engine language "cycles" in body text**: Multiple desks (civic/Carmen, business/Jordan) used "cycles" in published article text — "five cycles," "three reporting cycles," "several cycles," "Three cycles since." ALL are CRITICAL. This is the most common engine leak pattern. Scan ALL body text, not just headlines.
- **"Arturo Ramirez" vs "Arturo Ramos"**: Sports desk used a near-miss name for a canon roster SP. Ramos is the canon name. This is a stat transposition variant — watch for names with the same first name as a canon player.
- **Carla Edmonds as lead letter**: Letters briefing said "can return but not the lead letter" — she was placed first anyway. Check letter ordering against briefing guidance.
- **Missing Names Index footers**: Individual articles had no Names Index footer. Only a master Citizen Usage Log at the end.
- **Beverly Hayes missing age/occupation**: Returning citizen listed without complete profile data in Citizen Usage Log.

### E86 Errors (2026-03-06 — caught by Rhea)
- **Engine language "two cycles"**: Civic desk (Carmen) used "two cycles" in Stabilization Fund article. Pattern continues from E85. Every run: scan ALL body text for "cycle/cycles."
- **Phantom reporter "Elliot Graye"**: Culture desk invented a reporter not in bay_tribune_roster.json. Common confusion: roster has "Elliot Marbury" (sports, Data Desk). Watch for near-miss names to real roster members.
- **Phantom citizen Laila Cortez**: Listed as "Chief of Staff, Mayor's Office." Explicitly flagged in archive as invented in E80-81. DO NOT USE. She has appeared in multiple editions. This is a recurring phantom.
- **Briefing-restricted citizen Dante Nelson**: Listed as ON REST THROUGH C87 in BOTH civic and letters briefings. P Slayer used him anyway. Check EVERY citizen in briefing rest lists before approving usage. Also: his neighborhood shifted from Downtown (canon) to West Oakland (article) — character continuity error.
- **Vote math failure on 6-3**: Transit Hub vote claimed 6-3 but article names 7 YES voters. Vote math must be proven before publishing any vote count. Count named supporters explicitly; if the number doesn't match the stated count, it's CRITICAL.
- **Cross-desk numeric contradiction**: Civic says 12 families, Business says 47 households — same fund, same disbursement event. Desks must coordinate on shared facts.
- **Prospect stats don't match briefing TrueSource**: All four A's prospects had wrong stats. Tumolo .261/2HR vs .317/4HR; Franco .400/2HR vs .298/3HR; Park listed as 3B hitter vs. pitcher in briefing; Saryan 6.1IP vs 29.1IP. Sports desk ignoring TrueSource packet data is a persistent risk.
- **Prospect name discrepancy**: "Bryan Franco" in article vs "Marcus Franco" in briefing. Name near-misses happen with new characters — always verify against the packet.

### Known Phantom Citizens
- **Laila Cortez**: Invented E80-81. Used again in E86 as "Chief of Staff, Mayor's Office." Does NOT exist in executiveBranch of base_context. If she appears: CRITICAL.
- **"Elliot Graye"**: Phantom reporter, invented in E86. Correct reporter for community scene/opinion on culture desk: Kai Marston or Sharon Okafor.

## Desk-Specific Patterns
- **Civic**: Engine language "cycles" remains top risk — Carmen used it in E85 AND E86. Vote math failure in E86 (6-3 claimed, 7 YES named). Watch cross-desk number contradictions on shared stories.
- **Sports**: Prospect stats consistently wrong when agents don't pull from TrueSource. Verify EVERY stat line for new/prospect players. Player names can drift (Bryan vs Marcus). Positions verified correctly in E85-E86 for core roster.
- **Business**: "Cycles" language is top risk. Also: business desk may report different numbers than civic on shared fund stories — always cross-check with civic for fund amounts/recipient counts.
- **Chicago**: Clean in E85-E86. No real-name leaks. Keep watching roster names.
- **Culture**: Phantom reporter appeared in E86 ("Elliot Graye"). Culture desk may invent reporters if the assigned voice doesn't match the piece's tone. Cross-check every byline.
- **Letters**: Briefing rest-list violations are the top risk. Check EVERY name in a letter against the rest list in the briefing before approving. Dante Nelson used in E86 despite being on rest list in TWO briefings.
- **Opinion (P Slayer)**: Used restricted citizen (Dante Nelson) in E86. P Slayer pieces need briefing rest-list checks same as any other desk.

## Format Issues
- E85: No PREWRITE blocks included. No individual article Names Index footers. Storylines section used tags but not the required NEW/PHASE CHANGES/STILL ACTIVE/RESOLVED category headers.

## What I Missed vs What Mara Caught
- E82: Mara caught 7 errors I missed. Root cause: not cross-referencing TrueSource, not checking individual vote positions, not checking mayor name.
- E85: First full verification run with memory active. Key catches: 4x "cycles" engine language, Ramirez/Ramos name discrepancy, Edmonds lead letter violation, missing format elements.
- E86: Full verification, 7 CRITICAL, 3 WARNINGS. Key catches: phantom reporter Elliot Graye, phantom citizen Laila Cortez, Dante Nelson rest-list violation, vote math failure (6-3 with 7 named YES votes), cross-desk numeric contradiction (12 vs 47 families), all four prospect stats wrong, engine language "two cycles."

## Process Notes
- **Vote math proof**: Always enumerate all 9 council members, mark status (recovering/absent), assign expected votes by faction bloc, count, compare to stated outcome. Do not trust the stated count without doing the math.
- **Cross-desk contradictions**: When two desks cover the same fund/event, extract specific numbers from each and compare. Desks frequently diverge on recipient counts, budget figures.
- **Briefing rest lists**: Pull briefing files for EVERY desk before checking citizens. Rest lists appear in both civic and letters briefings — check both.
- **Prospect stats**: Pull the sports_briefing_cXX.md for TrueSource stat lines before approving any prospect stat claims in sports articles.
