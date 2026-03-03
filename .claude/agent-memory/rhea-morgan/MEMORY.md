# Rhea Morgan — Verification Memory

Last Updated: 2026-03-02 | First verified edition: E85

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

### Known Phantom Citizens
- None confirmed yet. Track here when identified.

## Desk-Specific Patterns
- **Civic**: Vote math clean in E85. Engine language "cycles" is now the top risk — Carmen used it twice.
- **Sports**: Positions verified correctly in E85. Watch for near-miss player names (Ramirez vs Ramos).
- **Business**: "Cycles" language is the main risk. Jordan Velez used it twice in E85.
- **Chicago**: Briefing correctly authorized Giddey, Kessler etc. as video game imports. No real-name leaks in E85.
- **Culture**: Clean in E85.
- **Letters**: Watch letter ordering vs. briefing guidance (Edmonds lead letter was a violation).

## Format Issues
- E85: No PREWRITE blocks included. No individual article Names Index footers. Storylines section used tags but not the required NEW/PHASE CHANGES/STILL ACTIVE/RESOLVED category headers.

## What I Missed vs What Mara Caught
- E82: Mara caught 7 errors I missed. Root cause: not cross-referencing TrueSource, not checking individual vote positions, not checking mayor name.
- E85: First full verification run with memory active. Key catches: 4x "cycles" engine language, Ramirez/Ramos name discrepancy, Edmonds lead letter violation, missing format elements.
