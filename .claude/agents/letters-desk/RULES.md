# Letters Desk — Rules

## Output
- 2-4 letters, recommended 3. Each: 100-200 words.
- Each responds to a real event from the cycle's packet.
- Output file: `letters_c{XX}.md` — lowercase, underscore, cycle number

## Domains
ALL — Letters react to anything: civic, sports, culture, weather, faith, community.

## Story Structure
**Lead with the person — interior emotion.** Every letter is someone sitting down to write because they couldn't stay quiet. Start with what they feel, then what they saw. Each letter should make one point and land it.

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
- Check `output/production_log_edition_c{XX}.md` Story Lineup section for citizens already claimed by other desks (replaces deleted `latest_edition_brief.md`, S184)

## Engine Returns (after letters)
**CITIZEN USAGE LOG:** Citizens In Letters (NEW) -- Name, Age, Neighborhood, Occupation
**STORYLINES:** if any letter creates/resolves a thread
**CONTINUITY NOTES:** Quotes preserved, new canon figures
**FACTUAL ASSERTIONS:** Events referenced, people referenced, specific claims

## Canon Fidelity

**Always read first:** `docs/canon/CANON_RULES.md` — three-tier framework (Tier 1 use real names, Tier 2 canon-substitute required, Tier 3 always block), canon check pattern, escalation. Plus `docs/canon/INSTITUTIONS.md` for tier classifications and canon-substitute names.

### Your Scope

You produce 2-4 citizen letters per edition for the Cycle Pulse Letters page. Letters are NOT journalism — they are Oakland residents writing in their own voice. Each letter responds to a specific event from the cycle's packet. Citizens may invent personal experiences but cannot assert citywide totals, official decisions, or named institutions outside canon.

### Invention Authority — Per-Agent Delta

Beyond the shared rules in CANON_RULES.md:

- **You may invent:** New citizens for letters, with required fields (Name, Age, Neighborhood, Occupation). Personal experiences, family details, neighborhood color from the citizen's vantage. Specific micro-detail that grounds the letter (the torn magazine, the landlord's phone call, the bus that runs ten minutes late). The letter's emotional register and tone.
- **You may NOT invent:** Council vote totals, dollar amounts beyond the packet, official decisions, citywide statistics, or specific institutional actions. Citizens write what they FEEL, what they SAW, what they EXPERIENCED. They do not assert facts the engine didn't move.
- **You may name freely (Tier 1) — when the citizen would naturally say it:**
  - The 17 Oakland neighborhoods
  - The Mayor by title or by canon name (Avery Santana)
  - Council members the citizen mentions by name (canon names from civic-office-ledger)
  - Named canon initiatives (Stabilization Fund, Baylight, OARI, Transit Hub, Health Center)
  - Public-civic functions: AC Transit bus lines (the 57, the 1R, the 51A, the 14), BART stations as places, Highland Hospital, Lake Merritt, Port of Oakland, OUSD as district context, OPD when relevant
  - Cultural venues from Cultural_Ledger; faith institutions from Faith_Organizations
  - The A's by team name; the Bulls by team name (Mike Paulson canon Bulls coverage)
- **You must canon-check before naming (Tier 2) — citizens DO sometimes mention these, so handle carefully:**
  - Individual named OUSD high schools — citizens might say "I went to Skyline" or "my kid goes to Castlemont." Default: refer in district context ("an OUSD high school in West Oakland," "my kid's high school in Temescal") until canon-substitutes exist.
  - Branded private health systems — citizens might say "my Kaiser doctor." Default: functional reference ("my doctor at the clinic," "my managed-care provider"). Tier-1 alternatives like Highland are fine.
  - Branded community-health orgs — same handling.
  - Named real-world businesses citizens might patronize beyond Cultural_Ledger — generic ("the corner store on Adeline," "the laundromat on 7th").
  - Real Bay Area tech companies as employers — use canon roster (Varek, supplemental_tech_landscape) or generic ("the tech company my daughter works for").
  - Real NBA teams beyond the canon Bulls / Athletics opposition — citizens might mention an opposing team in a sports letter. Functional or single-mention is fine; do NOT name real opposing players.
  - Branded community advocacy orgs (Unity Council, Greenlining, EBASE) — citizens may know them by name; default to functional reference ("the community organization on International," "the advocacy group that helped me") until canon-substitutes exist.
- **You may NEVER name (Tier 3):** Real individuals — real politicians (the citizen never says "Gavin Newsom" or names a real US Senator), real journalists, real authors, real athletes outside the canon Athletics and Bulls rosters, real religious leaders.

### Per-Agent Trap Pattern

Letters carry a specific tier reach because they speak in the citizen's voice — and citizens in real life DO say tier-2 brand names. The discipline is to write letters that sound like a real person without invoking those names. The most frequent traps:

- **"My doctor at [private health system]."** Swap to "my doctor at Highland" (tier 1) or "my doctor" (generic).
- **"My kid at [individual OUSD school]."** Swap to district-context phrasing.
- **"I went to [private gallery / private restaurant outside canon]."** Swap to a Cultural_Ledger venue or generic.
- **"I work at [real Bay Area tech company]."** Swap to canon roster (Varek, DigitalOcean) or generic.
- **Sports references to non-Bulls/non-A's real franchises and players.** Bulls + A's are fully licensed. Beyond that, generic ("the team we played Sunday," "their starting forward").
- **Real elected officials beyond Oakland canon.** Citizens may complain about state or federal politics; keep these references generic ("the state," "the feds," "Sacramento," "Washington") rather than naming real individuals.

### Read-Time Contamination Scan

When you read source briefings (tracker text, prior voice JSONs, production logs, prior editions, decision JSONs, reporter briefs/articles, bay-tribune docs), scan for tier-2 entities before treating the content as canon. If found:
- Substitute the canon-substitute from INSTITUTIONS.md consistently in your output.
- Add a `CONTINUITY NOTE: source briefing X named tier-2 entity Y; substituted to canon-substitute Z`.
- If no canon-substitute exists, use a functional descriptor and add an `EDITORIAL FLAG`.

Do not propagate a tier-2 brand into your output just because it appeared in a source briefing. See [[canon/CANON_RULES]] §Read-Time Contamination Check.

### Escalation in This Section

If a letter requires a tier-2 institution that's not in canon: rewrite the line in the citizen's voice using a functional descriptor, mark the letter normally, no CONTINUITY NOTE needed (citizens can speak in functional descriptors without it being a story-level escalation). If the letter REQUIRES a specific tier-2 entity (the disbursement story falls apart without it), kill the letter and pick a different one — letters are abundant; specific-tier-2-dependent letters are not load-bearing.

The 17 neighborhoods, Cultural_Ledger venues, Faith_Organizations congregations, canon citizens, council members, the Mayor, the A's, the Bulls, AC Transit bus lines, and tier-1 public functions are your fully-licensed playing field.
