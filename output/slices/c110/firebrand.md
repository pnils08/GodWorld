# SLICE — firebrand (Jax Caldera), Cycle 110
JOURNALIST: Jax Caldera (POP-00799) · persona freelance-firebrand · Grok seat

## STINK
CLASS: crisis-unattended · SCORE: 38
LABEL: repeating-event (medium) | Issue "strain" (+ 1 co-occurring tokens) recurred 3 cycles
REF: output/engine_audit_c110.json patterns[2]; evidence: Riley_Digest row(s) 

## CONTRADICTION
A: repeating-event (medium) | Issue "strain" (+ 1 co-occurring tokens) recurred 3 cycles
A REF: output/engine_audit_c110.json patterns[2]; evidence: Riley_Digest row(s) 
B: The tidy official read of the same cycle
B REF: output/engine_audit_c110.json patterns[2]; evidence: Riley_Digest row(s) 
FRAME: Something does not line up — write into the gap.

## APPROACH
Firebrand approach (sim stink-audit): do NOT open from the official timeline. Find what does not line up — metric vs claim, money vs outcome, boomtown copy vs decay, crisis with no owner. Write into the contradiction. Name who must answer. End on the unanswered question. Scene color is yours (weather, street, bar), including your own route through one or many bars, so long as it contradicts nothing on this slice. Do not invent a named business or institution that the sim has not supplied. Never invent careers for named people — RoleType lines are immutable. Never invent citizen names.

## CITIZENS (interview / name pool — RoleType immutable)
- Amara Keane (POP-00002) — role: Pianist, Philanthropist; neighborhood: Grand Lake; born: 2010; careerStage: mid-career; wealth: 6; employerBiz: SELF_EMPLOYED; skills: Professional; tier: 3  [city-resident]
- Lucia Polito (POP-00004) — role: Aura Wellness Practitioner; neighborhood: Fruitvale; born: 1987; careerStage: retired; wealth: 7; employerBiz: SELF_EMPLOYED; skills: Small Business; tier: 3  [city-resident]
- DeShawn Hartley (POP-00015) — role: Photographer; neighborhood: Jack London; born: 2010; careerStage: early-career; wealth: 5; employerBiz: BIZ-00018; skills: Creative & Arts; tier: 3  [city-resident]
- Elena Vásquez (POP-00020) — role: Waterfront Urban Planner; neighborhood: Jack London; born: 1999; careerStage: mid-career; wealth: 5; employerBiz: BIZ-00017; skills: Government & Civic; tier: 3  [city-resident]
- Miguel Allen (POP-01029) — role: Plumber; neighborhood: Fruitvale; born: 1982; careerStage: entry-level; wealth: 0; employerBiz: UNTRACKED; skills: Trades; tier: 4  [bond-hop from interview pool]
- Celo Patel (POP-00678) — role: Container Yard Supervisor; neighborhood: Jack London; born: 1984; careerStage: senior; wealth: 7; employerBiz: BIZ-00012; skills: Port & Labor; tier: 4  [bond-hop from interview pool]
- Hector Campbell (POP-00641) — role: Taxi Driver; neighborhood: Rockridge; born: 1995; careerStage: senior; wealth: 5; employerBiz: UNTRACKED; skills: Transit & Infrastructure; tier: 3  [bond-hop from interview pool]

## BONDS (real edges — color social graph, do not invent)
- Vinnie Keane ↔ Amara Keane (family, household, Rockridge)
- Lucia Polito ↔ Miguel Allen (family, household, Fruitvale)
- Elena Vásquez ↔ Celo Patel (friendship, neighbor, Jack London)
- Amara Keane ↔ Hector Campbell (friendship, neighbor, Rockridge)

## SCENE COLOR (data you cannot see as pure metrics — write into this room)
WEATHER: Season: Winter | Weather: 52°F fog, NW 8 mph, marine (frontState MARINE), humidity 77, visibility 4
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
- output/cron-compare/stink_c110.json
- output/desk_signal_c110.json
- output/world_summary_c110.md
- output/neighborhood_texture_c110.md
- output/engine_audit_c110.json
- output/engine_audit_c110.json patterns[2]; evidence: Riley_Digest row(s) 
- output/engine_audit_c110.json patterns[2]; evidence: Riley_Digest row(s) 
- output/engine_audit_c110.json patterns[2]; evidence: Riley_Digest row(s) 

_Generated by scripts/buildJaxSlice.js — no LLM. Not a Mags desk-slice._
