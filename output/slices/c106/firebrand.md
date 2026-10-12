# SLICE — firebrand (Jax Caldera), Cycle 106
JOURNALIST: Jax Caldera (POP-00799) · persona freelance-firebrand · Grok seat

## STINK
CLASS: metric-contradiction · SCORE: 61
LABEL: math-imbalance (high) | Downtown: decay [Sentiment -0.400, RetailVitality -2.76, HousingPressure +1.000] — Sentiment now 0.41 (8 of 22, city median 0.36); RetailVitality now 9.55 (4 of 22, city median 7.404999999999999); HousingPressure now 3 (18 of 22, city median 0) — with no matching active initiative
REF: output/engine_audit_c106.json patterns[1]; evidence: Neighborhood_Map row(s) 2

## CONTRADICTION
A: Downtown: decay [Sentiment -0.400, RetailVitality -2.76, HousingPressure +1.000] — Sentiment now 0.41 (8 of 22, city median 0.36); RetailVitality now 9.55 (4 of 22, city median 7.404999999999999); HousingPressure now 3 (18 of 22, city median 0) — with no matching active initiative
A REF: output/engine_audit_c106.json patterns[1]; evidence: Neighborhood_Map row(s) 2
B: No active initiative (or mitigator) owns this break on the record
B REF: output/engine_audit_c106.json patterns[1]; evidence: Neighborhood_Map row(s) 2
FRAME: The map says decay; the program roster does not answer it.

## APPROACH
Firebrand approach (sim stink-audit): do NOT open from the official timeline. Find what does not line up — metric vs claim, money vs outcome, boomtown copy vs decay, crisis with no owner. Write into the contradiction. Name who must answer. End on the unanswered question. Scene color is yours (weather, street, bar), including your own route through one or many bars, so long as it contradicts nothing on this slice. Do not invent a named business or institution that the sim has not supplied. Never invent careers for named people — RoleType lines are immutable. Never invent citizen names.

## CITIZENS (interview / name pool — RoleType immutable)
- Michael Corliss (POP-00596) — role: Photographer; neighborhood: KONO; born: 2019; careerStage: entry-level; wealth: 2; employerBiz: BIZ-00018; skills: Creative & Arts; tier: 3  [same-hood-signal]
- Celeste Moon (POP-01061) — role: singer; neighborhood: KONO; born: 1988; careerStage: entry-level; wealth: 0; skills: Creative & Arts; tier: 3  [same-hood-signal]
- Merkin Jumper (POP-00688) — role: Social Services Caseworker; neighborhood: Downtown; born: 1995; careerStage: senior; wealth: 5; employerBiz: BIZ-00017; skills: Government & Civic; tier: 2  [same-hood-signal]
- Eunice Marston (POP-00753) — role: Senior Pastor / Faith Leader; neighborhood: Downtown; born: 1985; careerStage: mid-career; wealth: 8; employerBiz: BIZ-00028; skills: Faith & Community; tier: 2  [same-hood-signal]
- Tao Lee (POP-00764) — role: Community Organizer; neighborhood: Downtown; born: 1986; careerStage: mid-career; wealth: 5; employerBiz: BIZ-00028; skills: Faith & Community; tier: 2  [same-hood-signal]
- Bruce Wright (POP-00965) — role: Line Cook; neighborhood: Downtown; born: 1993; careerStage: mid-career; wealth: 0; employerBiz: BIZ-00044; skills: Food & Culture; tier: 4  [same-hood-signal]
- Amir Delia (POP-00603) — role: Home Health Aide; neighborhood: Downtown; born: 2003; careerStage: mid-career; wealth: 6; employerBiz: BIZ-00015; skills: Healthcare; tier: 3  [same-hood-signal]
- Kwame Jumper (POP-01002) — role: student; neighborhood: Downtown; born: 2025; careerStage: student; wealth: 0; tier: 4  [bond-hop from interview pool]
- Russell Hayward (POP-00720) — role: Insurance Adjuster; neighborhood: Laurel; born: 1997; careerStage: mid-career; wealth: 5; employerBiz: SELF_EMPLOYED; skills: Professional; tier: 4  [bond-hop from interview pool]
- Bianca Crook (POP-00661) — role: Autonomous Systems Engineer; neighborhood: Lake Merritt; born: 1995; careerStage: senior; wealth: 7; employerBiz: UNTRACKED; skills: 2041-Specific; tier: 4  [bond-hop from interview pool]

## BONDS (real edges — color social graph, do not invent)
- Merkin Jumper ↔ Kwame Jumper (family, household, Downtown)
- Wilson Shepard ↔ Amir Delia (friendship, neighbor, Downtown)
- Beverly Hayes ↔ Tao Lee (friendship, random, cross-neighborhood)
- Tao Lee ↔ Russell Hayward (rivalry, random, cross-neighborhood)
- Bianca Crook ↔ Amir Delia (sports_rival, sports_season, Lake Merritt)

## SCENE COLOR (data you cannot see as pure metrics — write into this room)
WEATHER: Season: Winter | Weather: 52°F overcast, W 10 mph, overcast (frontState OVERCAST), humidity 66, visibility 10
HOOD: Downtown
TEXTURE:
The towers stay lit late, same as last week. Someone's always coming out of Telegraph Presbyterian with a folder, heading toward the bus. SpeedyBurger has its usual lunch line, moving fast.
COLOR ROOM: You may invent one or many bar/street/sensory scenes and Jax's own presence or route through them, so long as the color contradicts no supplied sim fact. A generic bar is persona texture, not a new canon business. Named people must stay on the CITIZENS list or be unnamed. Do not invent a named business or institution. RoleType is immutable — do not reassign careers.

## GAPS (deepen later)
- **EmployerBizId → Business_Ledger name/address** [gap]: RoleType alone; no shop name/street for employer scene color without inventing
- **Cultural_Ledger venues by neighborhood** [gap-on-disk]: Bar/venue canon list not auto-attached to slice — Jax opens in bars; needs hood venue pointer
- **Faith_Ledger / Faith_Organizations by hood** [partial]: Texture file sometimes names congregations; not joined to stink hood systematically
- **LifeHistory_Log raw (beyond Who Lived It digest)** [partial]: Digest is tag-summary; full event prose would deepen street color without inventing people
- **Relationship_Bonds live refresh** [stale-risk]: bond-ledger-live.tsv may lag; bond-hop quality depends on export freshness
- **Neighborhood_Map row metrics on slice** [partial]: Stink label carries some decay numbers; full hood board not embedded as color (avoid engine jargon in prose)
- **Map hoods with zero Simulation_Ledger residents (e.g. Brooklyn on C102)** [sim-gap]: Audit can flag decay for a hood nobody lives in on the ledger — stink is real, interview pool empty; slice walks to next candidate with residents
- **Citizen pages / DialState** [via-citizenVoice]: Quote stage loads dials; slice does not pre-print dial prose (correct — voice owns it)

## POINTERS
- output/cron-compare/stink_c106.json
- output/desk_signal_c106.json
- output/world_summary_c106.md
- output/neighborhood_texture_c106.md
- output/engine_audit_c106.json
- output/engine_audit_c106.json patterns[1]; evidence: Neighborhood_Map row(s) 2
- output/engine_audit_c106.json patterns[1]; evidence: Neighborhood_Map row(s) 2
- output/engine_audit_c106.json patterns[1]; evidence: Neighborhood_Map row(s) 2

_Generated by scripts/buildJaxSlice.js — no LLM. Not a Mags desk-slice._
