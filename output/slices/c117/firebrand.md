# SLICE — firebrand (Jax Caldera), Cycle 117
JOURNALIST: Jax Caldera (POP-00799) · persona freelance-firebrand · Grok seat

## STINK
CLASS: metric-contradiction · SCORE: 61
LABEL: math-imbalance (high) | Grand Lake: decay [Sentiment -0.060, RetailVitality -1.23, HousingPressure +1.000] — Sentiment now 0.09 (11 of 22, city median 0.09); RetailVitality now 13.65 (8 of 22, city median 9.93); HousingPressure now 6 (17 of 22, city median 0) — with no matching active initiative
REF: Neighborhood_Map row(s) 10; finding C117-5

## CONTRADICTION
A: Grand Lake: decay [Sentiment -0.060, RetailVitality -1.23, HousingPressure +1.000] — Sentiment now 0.09 (11 of 22, city median 0.09); RetailVitality now 13.65 (8 of 22, city median 9.93); HousingPressure now 6 (17 of 22, city median 0) — with no matching active initiative
A REF: Neighborhood_Map row(s) 10; finding C117-5
B: No active initiative (or mitigator) owns this break on the record
B REF: Neighborhood_Map row(s) 10; finding C117-5
FRAME: The map says decay; the program roster does not answer it.

## APPROACH
Firebrand approach (sim stink-audit): do NOT open from the official timeline. Find what does not line up — metric vs claim, money vs outcome, boomtown copy vs decay, crisis with no owner. Write into the contradiction. Name who must answer. End on the unanswered question. Scene color is yours (weather, street, bar), including your own route through one or many bars, so long as it contradicts nothing on this slice. Do not invent a named business or institution that the sim has not supplied. Never invent careers for named people — RoleType lines are immutable. Never invent citizen names.

## CITIZENS (interview / name pool — RoleType immutable)
- Sunita Raghavan (POP-01175) — role: Pediatrician; neighborhood: Grand Lake; born: 2005; careerStage: mid-career; wealth: 6; employerBiz: BIZ-00015; skills: Healthcare; tier: 4  [stink-handle]
- Maya Inoue (POP-01207) — role: Pharmacy tech; neighborhood: Grand Lake; born: 1973; careerStage: mid-career; wealth: 5; tier: 4  [stink-handle]
- Jerri Brown (POP-01218) — role: Dishwasher; neighborhood: Grand Lake; born: 2008; careerStage: mid-career; wealth: 4; tier: 4  [stink-handle]
- Darius Hill (POP-01116) — role: Security guard; neighborhood: Ivy Hill; born: 2017; careerStage: entry-level; wealth: 1; tier: 4  [same-hood-signal]
- Ronald Phillips (POP-01125) — role: Barista; neighborhood: Ivy Hill; born: 2010; careerStage: mid-career; wealth: 4; tier: 4  [same-hood-signal]
- Omar Lopez (POP-01136) — role: Construction laborer; neighborhood: Ivy Hill; born: 2016; careerStage: entry-level; wealth: 4; tier: 4  [same-hood-signal]
- Rasha Brown (POP-00922) — role: Disability Rights Advocate; neighborhood: Fruitvale; born: 2016; careerStage: entry-level; wealth: 5; employerBiz: BIZ-00034; skills: The Vulnerable; tier: 4  [bond-hop from interview pool]

## BONDS (real edges — color social graph, do not invent)
- Omar Lopez ↔ Rasha Brown (tension, neighborhood)

## SCENE COLOR (data you cannot see as pure metrics — write into this room)
WEATHER: Season: Spring | Weather: 59°F breeze, NW 9 mph, clear (frontState CLEAR), humidity 49, visibility 10
HOOD: Grand Lake
TEXTURE:
The theater marquee changes over to a new show as sidewalk tables fill up for early dinners. More "now leasing" signs appear in windows.
WHO LIVED IT (this hood):
- POP-01251 Elijah Davis — Emerged into Tier-4 in Grand Lake (Grand Lake)
CHAOS (touching hood):
- | ambulance | minor_injury | neighborhood Grand Lake | Sentiment | -0.06 | FALSE |
COLOR ROOM: You may invent one or many bar/street/sensory scenes and Jax's own presence or route through them, so long as the color contradicts no supplied sim fact. A generic bar is persona texture, not a new canon business. Named people must stay on the CITIZENS list or be unnamed. Do not invent a named business or institution. RoleType is immutable — do not reassign careers.

## GAPS (deepen later)
- **EmployerBizId → Business_Ledger name/address** [gap]: RoleType alone; no shop name/street for employer scene color without inventing
- **Cultural_Ledger venues by neighborhood** [gap-on-disk]: Bar/venue canon list not auto-attached to slice — Jax opens in bars; needs hood venue pointer
- **Faith_Ledger / Faith_Organizations by hood** [partial]: Texture file sometimes names congregations; not joined to stink hood systematically
- **LifeHistory_Log raw (beyond Who Lived It digest)** [partial]: Digest is tag-summary; full event prose would deepen street color without inventing people
- **Relationship_Bonds live refresh** [stale-risk]: bond-ledger-live.tsv may lag; bond-hop quality depends on export freshness
- **Neighborhood_Map row metrics on slice** [partial]: Stink label carries some decay numbers; full hood board not embedded as color (avoid jargon in prose)
- **Map hoods with zero Simulation_Ledger residents (e.g. Brooklyn on C102)** [sim-gap]: Audit can flag decay for a hood nobody lives in on the ledger — stink is real, interview pool empty; slice walks to next candidate with residents
- **Citizen pages / DialState** [via-citizenVoice]: Quote stage loads dials; slice does not pre-print dial prose (correct — voice owns it)

## POINTERS
- output/cron-compare/stink_c117.json
- output/desk_signal_c117.json
- output/world_summary_c117.md
- output/neighborhood_texture_c117.md
- Neighborhood_Map row(s) 10; finding C117-5

