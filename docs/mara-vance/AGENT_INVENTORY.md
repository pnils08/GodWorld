# Agent & Voice Inventory — Mara Vance

**Purpose:** Canonical roster of every voice and agent Mara can address in a voice directive, or flag in an audit. Read at session start. Every addressee name in a voice directive MUST match an entry below — no off-roster names, no invented titles.

**Last in-repo change:** 2026-05-12 (S217 — new file; Mara restructure)

---

## Usage Rules (read first)

1. **Voice directives can only address names listed below.** If a citizen surfaces in the edition who isn't a voice or agent, they belong in §Forward Guidance → Citizen Spotlight in the audit, not in a directive.
2. **Council members speak through their faction's agent.** When directing a council member by name (Carter, Delgado, Mobley, Crane, Chen), the directive routes through the OPP/CRC faction agent. Vega and Tran are individuals, not a bloc — each gets their own directive.
3. **IND is NOT a bloc.** Vega and Tran don't coordinate. Don't address them jointly.
4. **Reporter voices receive directives indirectly** — through their default desk agent. If Mara wants Carmen Delaine to cover X, the directive addresses `civic-desk` and names Carmen as the byline expectation.
5. **Newsroom infrastructure agents** (Mags, Rhea, Clerk, DJ, Final Arbiter, Mara herself) are not directive addressees — they're reviewer/editor lanes. Flag gaps in the audit's §Grading or §Reader Audit sections, not the directive file.
6. **New voice or agent lands** → add a row here in the same commit (S147 inbound-link rule).

---

## §Reporter Voices

Reporters write articles under their byline. Voice file is canonical for tone and beat. Default desk agent is the agent that launches under that voice when `/write-edition` runs.

### Sports desk

| Reporter | Beat | Voice file | Launches under |
|----------|------|-----------|----------------|
| Anthony | A's data, roster moves, front office, scouting | `docs/media/voices/anthony.md` | sports-desk |
| Hal Richmond | Legacy essays, dynasty context, cultural retrospectives | `docs/media/voices/hal_richmond.md` | sports-desk |
| P Slayer | Opinion, emotional pulse, fan voice | `docs/media/voices/p_slayer.md` | sports-desk |
| Simon Leary | Sports culture, history crossover | `docs/media/voices/simon_leary.md` | sports-desk |
| Tanya Cruz | #InsideTheA's social feeds, clubhouse access | `docs/media/voices/tanya_cruz.md` | sports-desk |

### Civic desk

| Reporter | Beat | Voice file | Launches under |
|----------|------|-----------|----------------|
| Carmen Delaine | Government, municipal rhythm, service health, infrastructure data | `docs/media/voices/carmen_delaine.md` | civic-desk |
| Dr. Lila Mezran | Medical, public health, clinic reports, health arcs | `docs/media/voices/dr_lila_mezran.md` | civic-desk |
| Luis Navarro | Shock events, accountability, civic fact-checking, anomalies | `docs/media/voices/luis_navarro.md` | civic-desk |
| Sgt. Rachel Torres | Crime, safety events, OPD interface | `docs/media/voices/sgt_rachel_torres.md` | civic-desk |
| Trevor Shimizu | Utilities, transit, structural issues, outages | `docs/media/voices/trevor_shimizu.md` | civic-desk |

### Business desk

| Reporter | Beat | Voice file | Launches under |
|----------|------|-----------|----------------|
| Jordan Velez | Wage trends, workforce patterns, port logistics, retail | `docs/media/voices/jordan_velez.md` | business-desk |

### Culture desk

| Reporter | Beat | Voice file | Launches under |
|----------|------|-----------|----------------|
| Maria Keen | Neighborhood feeling, hyper-local culture, community pulse | `docs/media/voices/maria_keen.md` | culture-desk |
| Mason Ortega | Restaurants, small business, pop-ups, late-night spots | `docs/media/voices/mason_ortega.md` | culture-desk |
| Noah Tan | Forecasts, environmental cycles, climate, air quality | `docs/media/voices/noah_tan.md` | culture-desk |
| Sharon Okafor | Routines, habits, behavior trends, daily life | `docs/media/voices/sharon_okafor.md` | culture-desk |
| Kai Marston | Galleries, musicians, artists, First Fridays, Cultural Ledger | `docs/media/voices/kai_marston.md` | culture-desk |
| Angela Reyes | Schools, youth programs, OUSD, after-school athletics | `docs/media/voices/angela_reyes.md` | culture-desk |

### Chicago desk

| Reporter | Beat | Voice file | Launches under |
|----------|------|-----------|----------------|
| Selena Grant | Bulls coverage, roster construction, player development | `docs/media/voices/selena_grant.md` | chicago-desk |
| Talia Finch | Street-level Chicago, city texture, neighborhood pulse | `docs/media/voices/talia_finch.md` | chicago-desk |

### Multi-beat (beat-conditional routing)

| Reporter | Beat → Launch path | Voice file |
|----------|--------------------|-----------|
| Jax Caldera | Accountability/silence → freelance-firebrand · Nightlife/culture → culture-desk | `docs/media/voices/jax_caldera.md` |
| Farrah Del Rio | Op-ed/policy critique → freelance-firebrand · Culture-as-policy → culture-desk | `docs/media/voices/farrah_del_rio.md` |

### Wire / Rumor / Social (unmapped — no dedicated desk agent)

| Reporter | Beat | Voice file | Closest-fit launch |
|----------|------|-----------|--------------------|
| Celeste Tran | Hashtags, viral moments, fanbase temperature | `docs/media/voices/celeste_tran.md` | sports-desk |
| Reed Thompson | Neutral rumor verification | `docs/media/voices/reed_thompson.md` | civic-desk or sports-desk |
| MintConditionOakTown | Anonymous rumor aggregation | `docs/media/voices/mintconditionoaktown.md` | freelance-firebrand |

### Letters

| Slate | Voice file | Launches under |
|-------|-----------|----------------|
| Citizen letters (anonymous slate) | — (citizen-voice generated) | letters-desk |

---

## §City Hall Voices (directive addressees)

These are the agents whose IDENTITY + RULES files generate official source material. Mara addresses them directly in voice directives.

### Executive Office

| Name | Role | Agent | Faction |
|------|------|-------|---------|
| Avery Santana | Mayor | `civic-office-mayor` | Executive (she/her) |
| Brenda Okoro | Deputy Mayor — Community Development + ED + Stab Fund | `civic-office-okoro` | Executive (OPP-aligned, not bloc member). First speaks C94. |

### Law Enforcement & Legal

| Name | Role | Agent | Faction |
|------|------|-------|---------|
| Rafael Montez | Oakland Police Chief | `civic-office-police-chief` | Department head |
| Clarissa Dane | District Attorney | `civic-office-district-attorney` | Department head (former federal prosecutor) |

### Council Faction Spokespeople

| Name | Role | Agent | Faction |
|------|------|-------|---------|
| Janae Rivers | OPP spokesperson, D5 | `civic-office-opp-faction` | OPP (Oakland Progressive Party) |
| Warren Ashford | CRC spokesperson, D7 | `civic-office-crc-faction` | CRC (Civic Reform Coalition) |

### Independent Council Members (NOT a bloc — each speaks for themselves)

| Name | Role | Agent | Faction |
|------|------|-------|---------|
| Ramon Vega | Council President, D4 | `civic-office-ind-swing` (Vega individual) | IND |
| Leonard Tran | D2 | `civic-office-ind-swing` (Tran individual) | IND |

### Project Directors

| Name | Role | Agent | Project |
|------|------|-------|---------|
| Keisha Ramos | Baylight Authority Director | `civic-office-baylight-authority` | $2.1B Baylight District |
| Bobby Chen-Ramirez | Health Center Project Director | `civic-project-health-center` | $45M Temescal Community Health Center |
| Dr. Vanessa Tran-Muñoz | OARI Program Director | `civic-project-oari` | $12.5M Oakland Alternative Response Initiative |
| Marcus Webb | OEWD Program Director | `civic-project-stabilization-fund` | $28M West Oakland Stabilization Fund |
| Elena Soria Dominguez | Transit Hub Planning Lead | `civic-project-transit-hub` | $230M Fruitvale Transit Hub Phase II |

---

## §Other Council Members (addressable by name, voiced through faction agent)

These members vote and have public positions but don't have dedicated `.claude/agents/` files. When Mara directs one of them, the directive names the council member and routes through the faction agent listed.

| District | Member | Faction | Speaks through |
|----------|--------|---------|----------------|
| D1 | Denise Carter | OPP | `civic-office-opp-faction` |
| D3 | Rose Delgado | OPP | `civic-office-opp-faction` |
| D6 | Elliott Crane | CRC | `civic-office-crc-faction` |
| D8 | Nina Chen | CRC | `civic-office-crc-faction` |
| D9 | Terrence Mobley | OPP | `civic-office-opp-faction` |

**Status note:** individual member availability (recovering, hospitalized, vacant) lives in `Civic_Office_Ledger` (MCP `get_council_member` when available). The C84 AUDIT_HISTORY snapshot flagged Crane as recovering — verify current state before directing.

---

## §Newsroom Infrastructure (reviewer/editor lanes — NOT directive addressees)

These agents review or compose; Mara flags gaps in their work via the audit's §Grading or §Reader Audit sections, never via a voice directive.

| Name | Role | Agent | Reviewer lane |
|------|------|-------|---------------|
| Mags Corliss | Editor-in-Chief | `mags-corliss` | Editor / load-out composer |
| Rhea Morgan | Sourcing verification | `rhea-morgan` | Phase 39.2, weight 0.5 |
| City Clerk | Civic production verification | `city-clerk` | Civic terminal gen-eval close |
| DJ Hartley | Senior Photographer | `dj-hartley` | Image prompts + photo selection |
| Final Arbiter | Verdict renderer | `final-arbiter` | Phase 39.7 |
| Mara Vance | Result validity (you) | (claude.ai project) | Phase 39.5, weight 0.2 |

---

## Maintenance

- New reporter voice file lands in `docs/media/voices/` → add a row to §Reporter Voices in the same commit
- New civic-office agent lands in `.claude/agents/civic-office-*/` → add a row to §City Hall Voices in the same commit
- New civic-project agent lands in `.claude/agents/civic-project-*/` → add a row to §Project Directors in the same commit
- Council member elected or appointed → add or update §Other Council Members row in the same commit
- Faction realignment / member faction change → update the appropriate table in the same commit

If a directive needs an addressee not on this list, the addressee is wrong or the inventory is stale. Fix the inventory before issuing the directive.
