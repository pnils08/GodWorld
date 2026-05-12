# Cascade Routing — Mayor decision topic → downstream voices

Seeded S215 (civic.9b). Maps Mayor's per-initiative statements to the
downstream voices/projects that need the Mayor's framing as cascade context
for their own pending decisions next cycle.

Consumed by `scripts/cascadeMayorDecisions.js`. Maintained going forward by
research-build as new initiatives come online. Engine-sheet's script treats
this file as static data.

**Format contract:** one top-level section per initiative ID (`## INIT-NNN`
or `## INIT-NNN — <name>`). Each section lists routes as `- Cascade to:
<agent-directory-name>` bullets. Comments after a `—` explain WHY each voice
is on the cascade list. Voice/project IDs match `.claude/agents/*` directory
names so the script can resolve targets directly.

Missing routing for an initiative the Mayor decided on → script falls back to
broadcast (cascade to all 10 downstream voices) AND logs a missing-route
warning. Forces incremental fill-in without blocking cycle execution.

---

## INIT-001 — Stabilization Fund

- Cascade to: civic-office-okoro — Deputy Mayor, Stab Fund oversight portfolio
- Cascade to: civic-project-stabilization-fund — Webb, Director (operational)
- Cascade to: civic-office-ind-swing — Vega, Stab Fund oversight committee chair
- Cascade to: civic-office-crc-faction — Ashford, fiscal oversight

## INIT-002 — OARI (Oakland Alternative Response Initiative)

- Cascade to: civic-project-oari — Tran-Muñoz, Director
- Cascade to: civic-office-police-chief — Montez, operational dispatch integration
- Cascade to: civic-office-opp-faction — Rivers + Carter, D1/D5 OARI cascade
- Cascade to: civic-office-ind-swing — Tran, OARI expansion demand
- Cascade to: civic-office-district-attorney — Dane, escalation-protocol legal framework

## INIT-003 — Transit Hub (Fruitvale Phase II)

- Cascade to: civic-project-transit-hub — Soria Dominguez, Lead
- Cascade to: civic-office-opp-faction — Delgado, D3 Fruitvale
- Cascade to: civic-office-ind-swing — Vega, Council President, vote-trigger ownership

## INIT-005 — Health Center (Temescal Community)

- Cascade to: civic-project-health-center — Chen-Ramirez, Director
- Cascade to: civic-office-okoro — Deputy Mayor, community-development cross-cut
- Cascade to: civic-office-opp-faction — Rivers, D5 health-domain spillover

## INIT-006 — Baylight District

- Cascade to: civic-office-baylight-authority — Ramos, Director
- Cascade to: civic-office-okoro — Deputy Mayor, ED-coverage workforce-agreement piece
- Cascade to: civic-office-crc-faction — Ashford, fiscal oversight + audit demands
- Cascade to: civic-office-opp-faction — Carter, D1 West Oakland adjacency

## INIT-007 — Youth Apprenticeship Pipeline

- Cascade to: civic-office-opp-faction — Rivers, OPP signature legislation
- Cascade to: civic-office-okoro — Deputy Mayor, workforce + ED cross-cut
- Cascade to: civic-office-crc-faction — Ashford, fiscal accountability on $X-funded program

---

## Adding a new initiative

1. Add a new `## INIT-NNN — <name>` section.
2. List 2-5 voices/projects that need the Mayor's framing. Use directory names from `.claude/agents/`.
3. Add a brief `— <reason>` after each voice (district adjacency, faction posture, oversight role, operational ownership).
4. Commit the change in the same commit as whatever surfaced the need (a new initiative ROLLOUT entry, a new project agent landing, etc.).

## Faction-vote routing (future)

Vote-ready initiatives expand the cascade to all 9 council voices via the 3 faction-bloc agents. That pattern is gated on the vote-trigger mechanism work; until that lands, the routing table omits the vote-expansion column. When the vote-trigger ships, add a §Vote-ready expansion column to each initiative section here.
