# SLICE — firebrand (Jax Caldera), Cycle 105
JOURNALIST: Jax Caldera (POP-00799) · persona freelance-firebrand · Grok seat

## STINK
CLASS: anomaly · SCORE: 38
LABEL: incoherence (high) | Initiative "Oakland Alternative Response Initiative" (implementation-active, safety) but 3 affected neighborhoods show contradicting CrimeIndex
REF: output/engine_audit_c105.json patterns[29]; evidence: Initiative_Tracker row(s) 3

## CONTRADICTION
A: Oakland Alternative Response Initiative is listed as implementation active, while Civis Systems flags readings in West Oakland, Fruitvale, East Oakland against an expected downward safety direction.
A REF: output/engine_audit_c105.json patterns[29].evidence.fields
B: The same Cycle 105 audit says no prior audit is available for comparison.
B REF: output/engine_audit_c105.json patterns[29].measurement
FRAME: Civis flags a contradiction while its own comparison history is unavailable. What evidence supports the alert?

## APPROACH
Firebrand approach (sim stink-audit): do NOT open from the official timeline. Find what does not line up — metric vs claim, money vs outcome, boomtown copy vs decay, crisis with no owner. Write into the contradiction. Name who must answer. End on the unanswered question. Scene color is yours (weather, street, bar), including your own route through one or many bars, so long as it contradicts nothing on this slice. Do not invent a named business or institution that the sim has not supplied. Never invent careers for named people — RoleType lines are immutable. Never invent citizen names.

## CITIZENS (interview / name pool — RoleType immutable)
- Lucia Polito (POP-00004) — role: Aura Wellness Practitioner; neighborhood: Fruitvale; born: 1987; careerStage: retired; wealth: 7; employerBiz: SELF_EMPLOYED; skills: Small Business; tier: 3  [stink-handle]
- Robert Jaston (POP-00758) — role: Senior Pastor / Faith Leader; neighborhood: West Oakland; born: 1979; careerStage: mid-career; wealth: 8; employerBiz: BIZ-00028; skills: Faith & Community; tier: 2  [stink-handle]
- Ophelia Brenner (POP-00754) — role: Senior Pastor / Faith Leader; neighborhood: Fruitvale; born: 1979; careerStage: mid-career; wealth: 7; employerBiz: BIZ-00028; skills: Faith & Community; tier: 2  [same-hood-signal]
- Ramon Solano (POP-00756) — role: Senior Pastor / Faith Leader; neighborhood: Fruitvale; born: 1976; careerStage: retired; wealth: 7; employerBiz: BIZ-00028; skills: Faith & Community; tier: 2  [same-hood-signal]
- Aziz Rahimi (POP-00762) — role: Senior Pastor / Faith Leader; neighborhood: Fruitvale; born: 1991; careerStage: mid-career; wealth: 8; employerBiz: BIZ-00028; skills: Faith & Community; tier: 2  [same-hood-signal]
- Miguel Allen (POP-01029) — role: Plumber; neighborhood: Fruitvale; born: 1982; careerStage: entry-level; wealth: 0; employerBiz: UNTRACKED; skills: Trades; tier: 4  [bond-hop from interview pool]
- Clarissa Dane (POP-00143) — role: DISTRICT ATTORNEY; neighborhood: Fruitvale; born: 1995; careerStage: mid-career; wealth: 6; employerBiz: BIZ-00022; skills: Government & Civic; tier: 2  [bond-hop from interview pool]
- Mei Renteria (POP-01043) — role: Security guard; neighborhood: Fruitvale; born: 2002; careerStage: entry-level; wealth: 0; employerBiz: BIZ-00023; skills: Government & Civic; tier: 4  [bond-hop from interview pool]
- DeShawn Avery (POP-00728) — role: Community College Student; neighborhood: Fruitvale; born: 2007; careerStage: mid-career; wealth: 5; employerBiz: SELF_EMPLOYED; skills: Small Business; tier: 4  [bond-hop from interview pool]
- Daniel Cloak (POP-00722) — role: Bakery Worker; neighborhood: West Oakland; born: 1986; careerStage: mid-career; wealth: 7; employerBiz: BIZ-00028; skills: Faith & Community; tier: 4  [bond-hop from interview pool]

## BONDS (real edges — color social graph, do not invent)
- Lucia Polito ↔ Miguel Allen (family, household, Fruitvale)
- Aziz Rahimi ↔ Clarissa Dane (friendship, neighbor, Fruitvale)
- Mei Renteria ↔ Aziz Rahimi (friendship, neighbor, Fruitvale)
- Ramon Solano ↔ DeShawn Avery (professional, neighbor, Fruitvale)
- Robert Jaston ↔ Daniel Cloak (professional, neighbor, West Oakland)
- Ophelia Brenner ↔ DeShawn Avery (professional, neighbor, Fruitvale)
- Rose Delgado ↔ Aziz Rahimi (friendship, neighbor, Fruitvale)

## SCENE COLOR (data you cannot see as pure metrics — write into this room)
WEATHER: Season: Winter | Weather: 49°F rain, S 18 mph, rain (frontState RAIN), humidity 90, visibility 6
HOOD: West Oakland
TEXTURE:
The TacoRail drive-thru line stretches longer than usual today, and a few storefronts sit empty with handwritten "Closed" signs taped to the windows.
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
- output/cron-compare/stink_c105.json
- output/desk_signal_c105.json
- output/world_summary_c105.md
- output/neighborhood_texture_c105.md
- output/engine_audit_c105.json
- output/engine_audit_c105.json patterns[29].evidence.fields
- output/engine_audit_c105.json patterns[29].measurement
- output/engine_audit_c105.json patterns[29]; evidence: Initiative_Tracker row(s) 3

_Generated by scripts/buildJaxSlice.js — no LLM. Not a Mags desk-slice._
