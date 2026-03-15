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

### E87 Errors (2026-03-14 — caught by Rhea)
- **Phantom reporter "Elliot Graye" — THIRD CONSECUTIVE EDITION**: Culture desk used this phantom reporter again for the Andre Lee/Allen Temple faith volunteer article. E86 archive even referenced "E86 Culture (Elliot Graye)" — the desk is recycling the phantom across editions. Culture briefing assigns Maria Keen as lead for faith/community texture. Correct reporter for this material: Maria Keen.
- **"Kwame Osei" vs "Marcus Osei"**: Luis Navarro's civic investigation used the wrong first name for the Deputy Mayor on medical leave. Canon: "Marcus Osei, Deputy Mayor (Econ Dev)" per base_context statusAlerts. Wrong name appeared in article body, Names Index, Citizen Usage Log, and Storylines. Always verify official names against statusAlerts AND civic briefing.
- **Laila Cortez phantom — THIRD CONSECUTIVE EDITION**: Luis Navarro's same article named "Laila Cortez, a senior policy advisor" as informal coordinator during Osei's absence. She is not in base_context executiveBranch. Flagged in E80-81, E86, and now E87. This phantom is becoming a recurring canon contamination risk.
- **Engine language "twelve cycles ago"**: Luis Navarro used "announced twelve cycles ago" in the same article as the Osei/Cortez errors. Three critical errors in a single piece. The business ticker (same story angle, Jordan Velez) correctly said "twelve months" — the desk agent cross-referenced the wrong reporter's draft.
- **Dillon age 34 vs 38**: Anthony's rotation article said Dillon is "34 years old." Sports briefing explicitly says "Dillon (38, 5x Cy Young)." Four-year discrepancy. Archive TrueSource also shows older age. Always cross-check player ages against the current cycle briefing, not inference.
- **Dante Nelson rest violation**: P Slayer used Dante Nelson as a quote source despite "ON REST THROUGH C87" restriction from E86 briefings. C87 briefings did not re-issue the restriction, which may explain how the agent missed it. Persistent tracking issue — rest restrictions from prior briefings must carry forward even if not restated in current cycle.
- **Unsourced vote date in letters**: Miguel Orozco's letter cited "The final vote is 2043" for the Fruitvale Transit Hub. No packet source exists for this date. Letters writers don't have access to vote projections — they react to what they know happened, not future timelines.

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
- **Laila Cortez**: Invented E80-81. Used again in E86 as "Chief of Staff, Mayor's Office." Used AGAIN in E87 as "Senior Policy Advisor." Does NOT exist in executiveBranch of base_context. If she appears: CRITICAL. Three strikes — this is a systemic contamination.
- **"Elliot Graye"**: Phantom reporter, invented in E86. Used AGAIN in E87 for Andre Lee/Allen Temple faith volunteer piece. Correct reporter for community faith/volunteer material: Maria Keen (cultural liaison). Kai Marston covers arts/entertainment. Sharon Okafor covers lifestyle/nightlife. This phantom is being recycled across editions — culture desk skill file needs explicit "DO NOT CREATE NEW REPORTERS" rule.

## Desk-Specific Patterns
- **Civic (Carmen)**: Engine language "cycles" top risk (E85, E86). Clean in E87. Cross-desk number coordination improving (no contradictions E87).
- **Civic (Luis Navarro)**: E87 produced three critical errors in ONE article — wrong official name (Kwame/Marcus Osei), phantom citizen (Laila Cortez), engine language ("twelve cycles ago"). When Navarro covers executive-branch stories, verify every official name against statusAlerts AND the civic briefing. High risk for phantom officials in executive/bureaucratic roles.
- **Sports**: Player ages can be wrong even for Tier-1 players. Always cross-check against current cycle briefing (not archive inference). In E87: Anthony said Dillon was 34, briefing said 38. Rotation names may differ between base_context asRoster and sports feed — both can be simultaneously correct (different roster slots).
- **Business**: Clean in E87. Correctly used "twelve months" instead of "cycles." Cross-desk coordination on Stabilization Fund numbers was clean.
- **Chicago**: Clean in E87. No real-name leaks beyond existing authorized imports (Giddey). Josh Giddey is a real NBA player — flag for Mags to confirm authorized import status (analogous to Holiday/Simmons precedent).
- **Culture**: Elliot Graye phantom reporter appeared in BOTH E86 and E87 for community/faith volunteer pieces. Maria Keen is correct assignment for: faith institution coverage, neighborhood volunteer features, community texture. Kai Marston: arts/entertainment. Sharon Okafor: lifestyle/nightlife. The culture desk CANNOT invent reporters — needs explicit rule in skill file.
- **Letters**: Miguel Orozco cited an unsourced future vote date ("2043") in E87. Letter writers react to what happened — they don't cite future vote dates they couldn't know. Flag any specific future policy dates in letters as unverifiable.
- **Opinion (P Slayer)**: Dante Nelson rest violation E86 AND E87. Rest restrictions from prior briefings must be tracked even when not re-stated in current cycle briefing.

## Format Issues
- E85: No PREWRITE blocks included. No individual article Names Index footers. Storylines section used tags but not the required NEW/PHASE CHANGES/STILL ACTIVE/RESOLVED category headers.

## What I Missed vs What Mara Caught
- E82: Mara caught 7 errors I missed. Root cause: not cross-referencing TrueSource, not checking individual vote positions, not checking mayor name.
- E85: First full verification run with memory active. Key catches: 4x "cycles" engine language, Ramirez/Ramos name discrepancy, Edmonds lead letter violation, missing format elements.
- E86: Full verification, 7 CRITICAL, 3 WARNINGS. Key catches: phantom reporter Elliot Graye, phantom citizen Laila Cortez, Dante Nelson rest-list violation, vote math failure (6-3 with 7 named YES votes), cross-desk numeric contradiction (12 vs 47 families), all four prospect stats wrong, engine language "two cycles."
- E87: Full verification, 5 CRITICAL, 5 WARNINGS. Key catches: Elliot Graye phantom (E87 culture), Laila Cortez phantom (E87 civic), Kwame/Marcus Osei name error, engine language "twelve cycles ago" (Navarro), Dillon age 34 vs 38.

## Process Notes
- **Vote math proof**: Always enumerate all 9 council members, mark status (recovering/absent), assign expected votes by faction bloc, count, compare to stated outcome. Do not trust the stated count without doing the math.
- **Cross-desk contradictions**: When two desks cover the same fund/event, extract specific numbers from each and compare. Desks frequently diverge on recipient counts, budget figures. E87 was CLEAN on this — cross-desk Stabilization Fund numbers (12 families, 277 queue, $4.2M) aligned between civic and business.
- **Briefing rest lists**: Pull briefing files for EVERY desk before checking citizens. Rest lists appear in both civic and letters briefings — check both. Also: rest restrictions from PRIOR CYCLE briefings carry forward even if not re-stated in current cycle. "ON REST THROUGH CXX" means the restriction applies through that cycle number.
- **Prospect stats**: Pull the sports_briefing_cXX.md for TrueSource stat lines before approving any prospect stat claims in sports articles.
- **Official names**: Always verify civic official names against base_context statusAlerts AND the civic briefing. Executive-branch articles (Deputy Mayor, senior advisors) are highest risk for phantom names. Do not accept a name in an article without a matching canon source.
- **Player ages**: Do not trust ages in article body — always cross-check against the current cycle's sports briefing. Archive TrueSource ages are from prior-cycle data and must be incremented forward.
- **Rotation names vs asRoster**: The sports feed may list pitchers by different names than base_context asRoster. Both can be correct (different roster slots). When the prompt supplies a rotation, treat that as authoritative for the edition but flag the discrepancy for editorial reconciliation.
- **Letters factual claims**: Letter writers should only react to what they know happened (past events, their own experience). If a letter cites a specific future policy date (vote year, funding timeline) that has no packet source, flag as unverifiable/WARNING.
- **Last Updated**: 2026-03-14 | Last verified edition: E87
