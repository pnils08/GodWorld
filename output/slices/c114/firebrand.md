# SLICE — firebrand (Jax Caldera), Cycle 114
JOURNALIST: Jax Caldera (POP-00799) · persona freelance-firebrand · Grok seat

## STINK
CLASS: metric-contradiction · SCORE: 61
LABEL: math-imbalance (high) | Rockridge: decay [Sentiment -0.030, RetailVitality -2.16, HousingPressure +1.000] — Sentiment now 0.03 (17 of 22, city median 0.085); RetailVitality now 10.98 (8 of 22, city median 8.265); HousingPressure now 5 (17 of 22, city median 0) — with no matching active initiative
REF: output/engine_audit_c114.json patterns[1]; evidence: Neighborhood_Map row(s) 8

## CONTRADICTION
A: Rockridge: decay [Sentiment -0.030, RetailVitality -2.16, HousingPressure +1.000] — Sentiment now 0.03 (17 of 22, city median 0.085); RetailVitality now 10.98 (8 of 22, city median 8.265); HousingPressure now 5 (17 of 22, city median 0) — with no matching active initiative
A REF: output/engine_audit_c114.json patterns[1]; evidence: Neighborhood_Map row(s) 8
B: No active initiative (or mitigator) owns this break on the record
B REF: output/engine_audit_c114.json patterns[1]; evidence: Neighborhood_Map row(s) 8
FRAME: The map says decay; the program roster does not answer it.

## APPROACH
Firebrand approach (sim stink-audit): do NOT open from the official timeline. Find what does not line up — metric vs claim, money vs outcome, boomtown copy vs decay, crisis with no owner. Write into the contradiction. Name who must answer. End on the unanswered question. Scene color is yours (weather, street, bar), including your own route through one or many bars, so long as it contradicts nothing on this slice. Do not invent a named business or institution that the sim has not supplied. Never invent careers for named people — RoleType lines are immutable. Never invent citizen names.

## CITIZENS (interview / name pool — RoleType immutable)
- Maya Torres-Dillon (POP-00742) — role: Bay Conservation Alliance Advisory board, High School Science Teacher; neighborhood: Rockridge; born: 2010; careerStage: mid-career; wealth: 6; employerBiz: BIZ-00016; skills: Education; tier: 2  [stink-handle]
- Naomi Sterling (POP-00759) — role: Senior Pastor / Faith Leader; neighborhood: Rockridge; born: 1975; careerStage: retired; wealth: 8; employerBiz: BIZ-00028; skills: Faith & Community; tier: 2  [stink-handle]
- Yu Zen (POP-00194) — role: Commercial Insurance Broker; neighborhood: Rockridge; born: 1990; careerStage: senior; wealth: 8; employerBiz: SELF_EMPLOYED; skills: Professional; tier: 3  [same-hood-signal]
- Derek Obi (POP-00543) — role: IT Support Specialist; neighborhood: Rockridge; born: 2003; careerStage: mid-career; wealth: 7; employerBiz: BIZ-00030; skills: Tech & Innovation; tier: 4  [same-hood-signal]
- Rick Dillon (POP-00743) — role: Grade Schooler; neighborhood: Rockridge; born: 2030; careerStage: student; wealth: 2; skills: student; tier: 3  [bond-hop from interview pool]
- Farah Vasquez (POP-00927) — role: AI Safety Researcher (Anthropic); neighborhood: Rockridge; born: 1988; careerStage: senior; wealth: 8; employerBiz: BIZ-00001; skills: Tech & Innovation; tier: 4  [bond-hop from interview pool]
- Dax Monroe (POP-00769) — role: Artist; neighborhood: Rockridge; born: 2001; careerStage: mid-career; wealth: 6; employerBiz: SELF_EMPLOYED; skills: Small Business; tier: 2  [bond-hop from interview pool]
- Farah Lindqvist (POP-00257) — role: City Building Inspector; neighborhood: Downtown; born: 1994; careerStage: senior; wealth: 6; employerBiz: BIZ-00017; skills: Government & Civic; tier: 4  [bond-hop from interview pool]
- Darius Cike (POP-00658) — role: Quantum Computing Researcher; neighborhood: West Oakland; born: 1977; careerStage: retired; wealth: 8; employerBiz: BIZ-00030; skills: Tech & Innovation; tier: 4  [bond-hop from interview pool]
- Tom Jilner (POP-00691) — role: Wine Bar Owner; neighborhood: Rockridge; born: 2003; careerStage: mid-career; wealth: 6; employerBiz: SELF_EMPLOYED; skills: Food & Culture; tier: 4  [bond-hop from interview pool]

## BONDS (real edges — color social graph, do not invent)
- Benji Dillon ↔ Maya Torres-Dillon (family, household, Rockridge)
- Maya Torres-Dillon ↔ Rick Dillon (family, household, Rockridge)
- Naomi Sterling ↔ Farah Vasquez (friendship, neighbor, Rockridge)
- Dax Monroe ↔ Yu Zen (friendship, neighbor, Rockridge)
- Farah Lindqvist ↔ Derek Obi (friendship, neighbor, Downtown)
- Darius Cike ↔ Maya Torres-Dillon (friendship, neighbor, Rockridge)
- Naomi Sterling ↔ Avery Santana (tension, neighborhood, Rockridge)
- Tom Jilner ↔ Yu Zen (neighbor, neighborhood, Rockridge)

## SCENE COLOR (data you cannot see as pure metrics — write into this room)
WEATHER: Season: Spring | Weather: 55°F mild, NW 8 mph, clear (frontState CLEAR), humidity 54, visibility 10
HOOD: Rockridge
TEXTURE:
Rockridge’s retail strip is bustling, with BART delays causing minor frustrations for commuters. New residents from Downtown are spotted exploring the neighborhood.
WHO LIVED IT (this hood):
- POP-00267 Jacob King — nursed a sore back after overdoing it around the house (Rockridge)
- HH-0114-F006 | solo | head POP-00460 | Rockridge
- HH-0114-F011 | solo | head POP-00759 | Rockridge
- HH-0114-F013 | solo | head POP-00864 | Rockridge
CHAOS (touching hood):
- | garbage_truck | dumping_cleared | neighborhood Rockridge | Sentiment | -0.11 | FALSE |
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
- output/cron-compare/stink_c114.json
- output/desk_signal_c114.json
- output/world_summary_c114.md
- output/neighborhood_texture_c114.md
- output/engine_audit_c114.json
- output/engine_audit_c114.json patterns[1]; evidence: Neighborhood_Map row(s) 8
- output/engine_audit_c114.json patterns[1]; evidence: Neighborhood_Map row(s) 8
- output/engine_audit_c114.json patterns[1]; evidence: Neighborhood_Map row(s) 8

