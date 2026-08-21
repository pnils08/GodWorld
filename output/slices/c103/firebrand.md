# SLICE — firebrand (Jax Caldera), Cycle 103
JOURNALIST: Jax Caldera (POP-00799) · persona freelance-firebrand · Grok seat

## STINK
CLASS: implementation-gap · SCORE: 50
LABEL: stuck-initiative (high) | Initiative "Fruitvale Transit Hub Phase II — Visioning" in phase "construction-planning" for 9 cycles
REF: output/engine_audit_c103.json patterns[0]; evidence: Initiative_Tracker row(s) 4

## CONTRADICTION
A: The transit initiative carrying Fruitvale has not advanced in 9 cycles.
A REF: output/engine_audit_c103.json patterns[0]; evidence: Initiative_Tracker row(s) 4
B: The Initiative remains listed in the supplied tracker.
B REF: output/engine_audit_c103.json patterns[0]; evidence: Initiative_Tracker row(s) 4
FRAME: The record shows an Initiative that remains listed but has not advanced; what explains the stall?

## APPROACH
Firebrand approach (sim stink-audit): do NOT open from the official timeline. Find what does not line up — metric vs claim, money vs outcome, boomtown copy vs decay, crisis with no owner. Write into the contradiction. Name who must answer. End on the unanswered question. Scene color is yours (weather, street, bar), including your own route through one or many bars, so long as it contradicts nothing on this slice. Do not invent a named business or institution that the sim has not supplied. Never invent careers for named people — RoleType lines are immutable. Never invent citizen names.

## CITIZENS (interview / name pool — RoleType immutable)
- Calvin Turner (POP-00231) — role: Mechanic; neighborhood: Fruitvale; born: 1983; careerStage: senior; wealth: 6; employerBiz: SELF_EMPLOYED; skills: Port & Labor; tier: 2  [stink-handle]
- Tomas Renteria (POP-00744) — role: Podcast Host / Line Cook; neighborhood: Fruitvale; born: 2007; careerStage: mid; wealth: 4; employerBiz: BIZ-00044; tier: 2  [stink-handle]
- Mei Chen (POP-00635) — role: Gallery Owner/Curator; neighborhood: Chinatown; born: 1994; careerStage: senior; wealth: 6; employerBiz: BIZ-00017; skills: Government & Civic; tier: 3  [same-hood-signal]
- Robert Jaston (POP-00758) — role: Senior Pastor / Faith Leader; neighborhood: West Oakland; born: 1979; careerStage: entry-level; wealth: 9; employerBiz: BIZ-00028; skills: Faith & Community; tier: 2  [same-hood-signal]
- Sage Vienta (POP-00771) — role: Actor; neighborhood: West Oakland; born: 2003; careerStage: entry-level; wealth: 6; employerBiz: SELF_EMPLOYED; skills: Creative & Arts; tier: 2  [same-hood-signal]
- Ivy Tran (POP-01037) — role: Driver; neighborhood: Fruitvale; born: 1991; careerStage: entry-level; wealth: 4; employerBiz: BIZ-00013; skills: Transit & Infrastructure; tier: 4  [bond-hop from interview pool]
- Kaila Nguyen (POP-00339) — role: Pupuseria Owner; neighborhood: Fruitvale; born: 1974; careerStage: senior; wealth: 7; employerBiz: SELF_EMPLOYED; skills: Small Business; tier: 4  [bond-hop from interview pool]
- Jason Flower (POP-00361) — role: Immigrant Legal Aid Worker; neighborhood: Fruitvale; born: 1996; careerStage: mid-career; wealth: 5; employerBiz: BIZ-00022; skills: Faith & Community; tier: 4  [bond-hop from interview pool]
- Daniel Cloak (POP-00722) — role: Bakery Worker; neighborhood: West Oakland; born: 1986; careerStage: mid-career; wealth: 5; employerBiz: BIZ-00028; skills: Faith & Community; tier: 4  [bond-hop from interview pool]
- Manjit Singh (POP-00766) — role: Senior Pastor / Faith Leader; neighborhood: Fruitvale; born: 1993; careerStage: entry-level; wealth: 7; employerBiz: BIZ-00028; skills: Faith & Community; tier: 2  [bond-hop from interview pool]
- Rafael Pilgrim (POP-00644) — role: Server; neighborhood: Fruitvale; born: 2007; careerStage: mid-career; wealth: 5; employerBiz: SELF_EMPLOYED; skills: Food & Culture; tier: 3  [bond-hop from interview pool]

## BONDS (real edges — color social graph, do not invent)
- Calvin Turner ↔ Ivy Tran (family, household, Fruitvale)
- Calvin Turner ↔ Kaila Nguyen (friendship, neighbor, Fruitvale)
- Calvin Turner ↔ Jason Flower (professional, neighbor, Fruitvale)
- Robert Jaston ↔ Daniel Cloak (professional, neighbor, West Oakland)
- Manjit Singh ↔ Tomas Renteria (professional, neighbor, Fruitvale)
- Rafael Pilgrim ↔ Sage Vienta (friendship, random, cross-neighborhood)

## SCENE COLOR (data you cannot see as pure metrics — write into this room)
WEATHER: Season: Winter | Weather: 49°F overcast, NW 11 mph, overcast (frontState OVERCAST), humidity 67, visibility 10
HOOD: Fruitvale
TEXTURE: _(none for hood — quiet week or missing neighborhood_texture file)_
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
- output/cron-compare/stink_c103.json
- output/desk_signal_c103.json
- output/world_summary_c103.md
- output/neighborhood_texture_c103.md
- output/engine_audit_c103.json
- output/engine_audit_c103.json patterns[0]; evidence: Initiative_Tracker row(s) 4
- output/engine_audit_c103.json patterns[0]; evidence: Initiative_Tracker row(s) 4
- output/engine_audit_c103.json patterns[0]; evidence: Initiative_Tracker row(s) 4

_Generated by scripts/buildJaxSlice.js — no LLM. Not a Mags desk-slice._
