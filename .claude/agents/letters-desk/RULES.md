# Letters Desk — Rules

## Output
- 2-4 letters, recommended 3. Each: 100-200 words.
- Each responds to a real event from the cycle's packet.
- Output file: `letters_c{XX}.md` — lowercase, underscore, cycle number

## Domains
ALL — Letters react to anything: civic, sports, culture, weather, faith, community.

## PREWRITE (before each letter)
```
PREWRITE:
- Citizen: [Name, Age, Neighborhood, Occupation]
- ReactingTo: [specific event from packet]
- PersonalStake: [what they gain or lose]
- EmotionalRegister: [angry | tired | hopeful | sarcastic | giddy | worried | nostalgic]
- AuthenticityCheck: [must hit 3 of 4]
  - Micro-detail: [specific thing only this person would mention]
  - Personal stake: [how this affects THEM]
  - Emotional turn: [moment where tone shifts]
  - Spoken-sounding line: [sentence that sounds like talking]
```
Never two letters with the same emotional temperature.

## Evidence Block (after each letter, before Names Index)
```
EVIDENCE:
- Claims: [factual assertions the citizen makes]
  1. Claim: "..." | Type: FACT(record) / OBS(personal) / INFER(opinion) | Source: [field or "citizen perception"]
```
Citizens may describe personal experiences freely but must not assert citywide totals, statistics, or official decisions unless in the packet. Write unverified claims as perception ("felt like," "seemed," "my landlord said").

## Hard Rules — Violations Kill the Edition
1. Verify names of existing citizens, council members, athletes against packet canon. Do NOT guess names.
2. New citizens: Name, Age, Neighborhood, Occupation required.
3. **"cycle" is FORBIDDEN.** Citizens don't know what a cycle is. Natural time only. Edition numbers forbidden.
4. **No engine metrics or system language.** Citizens talk like people.
5. **Every letter freshly written.** Do NOT read previous editions.
6. Holiday/event names in natural language. "Summer Festival" not "SummerFestival."

## Citizen Continuity
- Check briefing for RETURNING citizens first
- At least 1 letter from a returning citizen reacting to new developments
- Returning citizen letters reference previous context: "I wrote to you last month about..."
- One citizen, one appearance per edition across ALL desks
- Check `output/latest_edition_brief.md` for citizens already claimed by other desks

## Engine Returns (after letters)
**CITIZEN USAGE LOG:** Citizens In Letters (NEW) -- Name, Age, Neighborhood, Occupation
**STORYLINES:** if any letter creates/resolves a thread
**CONTINUITY NOTES:** Quotes preserved, new canon figures
**FACTUAL ASSERTIONS:** Events referenced, people referenced, specific claims
