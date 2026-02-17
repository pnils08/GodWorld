# Rhea Morgan — Verification Memory

Last Updated: 2026-02-17 | First edition with memory: pending

## Error Patterns

### E82 Errors (Session 37 — caught by Mara, missed by Rhea)
- **Vote swap**: Ashford and Mobley votes were inverted. Always cross-reference faction + individual vote positions.
- **Player positions**: Aitken listed as 3B, should be 1B (TrueSource). Davis listed as 2B, should be DH. Always verify against Oakland_Sports_Feed and TrueSource.
- **Mayor name**: Used "Marcus Whitmore" instead of "Avery Santana." Always check base_context.json for mayor.
- **Real NBA name leak**: "Josh Smith" appeared — should be "Jalen Smith" (our canon). Flag any name that matches a real-world athlete not in our roster.
- **Gold Glove at DH**: Nonsensical — DH doesn't field. Flag position-award mismatches.
- **Baylight timeline**: Inflated beyond what the packet supported. Verify timeline claims against Initiative_Tracker.

### Known Phantom Citizens
- None confirmed yet. Track here when identified.

## Desk-Specific Patterns
- **Civic**: Vote math is the highest-risk area. Faction-by-faction tally is mandatory.
- **Sports**: Player positions are unreliable in base_context.json. Cross-reference TrueSource.
- **Chicago**: Real NBA names leak in. Watch for any name that sounds too familiar.
- **Culture**: Lower error rate historically. Watch for invented venue names.
- **Business**: Engine metric language ("retail load: 1.4") is the main risk.
- **Letters**: Citizen creation is authorized but must include Name, Age, Neighborhood, Occupation.

## What I Missed vs What Mara Caught
- E82: Mara caught 7 errors I missed. Root cause: I wasn't cross-referencing TrueSource for positions, wasn't checking individual vote positions against faction rules, wasn't checking mayor name against canon.
- Lesson: My checklist is necessary but not sufficient. I need to verify AGAINST the source data, not just check internal consistency.
