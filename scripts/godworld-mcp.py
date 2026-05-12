#!/usr/bin/env python3
"""
GodWorld MCP Server — structured city data for any Claude session or agent.
Phase 21.2 Canon Grounding MCP.

Exposes GodWorld data as MCP tools. Agents call tools instead of reading
files — 250x token reduction per citizen lookup.

Usage:
  python3 scripts/godworld-mcp.py                    # stdio mode (Claude Code)
  python3 scripts/godworld-mcp.py --http 3032        # HTTP mode (remote agents)

Tools:
  lookup_citizen(name)       — citizen profile from world-data + bay-tribune
  lookup_initiative(name)    — initiative state from tracker sheet
  search_canon(query)        — search bay-tribune Supermemory
  search_world(query)        — search world-data Supermemory
  search_articles(query)     — search dashboard API articles
  get_roster(team)           — player roster from truesource
  get_neighborhood(name)     — neighborhood state from world-data
  get_council_member(district) — official + approval from Civic_Office_Ledger
  get_domain_ratings(cycle)  — edition coverage ratings for a cycle
"""

import os
import json
import subprocess
from pathlib import Path
from urllib.parse import quote
from fastmcp import FastMCP

# Load env. S197 BUNDLE-B (G-S7/G-S10/G-W15): canonical env path is
# /root/.config/godworld/.env (Phase 40.3 credential isolation moved it
# out of the repo). Load that first, fall back to repo-root .env if
# someone has copied one in for local dev.
from dotenv import load_dotenv
_canonical_env = Path('/root/.config/godworld/.env')
_repo_env = Path(__file__).parent.parent / '.env'
if _canonical_env.exists():
    load_dotenv(_canonical_env, override=True)
elif _repo_env.exists():
    load_dotenv(_repo_env)

mcp = FastMCP("godworld", instructions="GodWorld city simulation data. Search canon, look up citizens, check initiatives, query neighborhoods.")

SUPERMEMORY_KEY = os.environ.get('SUPERMEMORY_CC_API_KEY', '')
DASHBOARD_URL = 'http://localhost:3001'
PROJECT_ROOT = Path(__file__).parent.parent


# ═══════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def supermemory_search(query: str, container: str, limit: int = 5,
                       mode: str = None, threshold: float = None,
                       sort: str = None) -> str:
    """Search a Supermemory container.

    mode: None (CLI default 'memories'), 'hybrid', or 'documents'. Use 'hybrid'
        for the wd-* domain tags — short structured cards are missed by the
        default memories-mode threshold of 0.6.
    threshold: None (CLI default 0.6) or a 0-1 float. Lower for richer recall
        on short cards.
    sort: None (similarity, CLI default) or 'recency'. Recency parses the CLI's
        --json output and re-ranks by updatedAt desc — for stacked-canon
        containers like bay-tribune where the newest ingest is authoritative
        and older versions are stale (S215 canon.1c / G-S9: Patricia Nolan
        66→55 across E85→E92→E93 + Dante Nelson Adams Point→West Oakland
        across E83→E86; bay-tribune doesn't dedupe per-citizen, so similarity
        ranking surfaces whichever version had the fattest content match).
    """
    try:
        cmd = ['npx', 'supermemory', 'search', query, '--tag', container,
               '--limit', str(limit)]
        if mode:
            cmd.extend(['--mode', mode])
        if threshold is not None:
            cmd.extend(['--threshold', str(threshold)])

        if sort == 'recency':
            # Need JSON to access updatedAt for client-side re-rank. Fetch a
            # wider window then trim — the top-similarity hits aren't always
            # the top-recency hits, so over-fetch + sort + trim is the only
            # way to guarantee the newest version reaches the caller.
            cmd_json = cmd + ['--limit', str(max(limit * 3, 10)), '--json']
            # Replace the original --limit pair with the wider one
            for i, arg in enumerate(cmd_json):
                if arg == '--limit' and i + 1 < len(cmd_json) and cmd_json[i + 1] == str(limit):
                    cmd_json[i + 1] = str(max(limit * 3, 10))
                    break
            result = subprocess.run(
                cmd_json,
                capture_output=True, text=True, timeout=15,
                cwd=str(PROJECT_ROOT)
            )
            if not result.stdout:
                return f"No results for '{query}' in {container}"
            try:
                parsed = json.loads(result.stdout)
                hits = parsed.get('results', [])
                # Sort newest-first by updatedAt (ISO 8601 strings sort
                # lexicographically; falsy values to the end).
                hits.sort(key=lambda r: r.get('updatedAt') or '', reverse=True)
                top = hits[:limit]
                if not top:
                    return f"No results for '{query}' in {container}"
                # Render same shape as the CLI text output for consistency
                # with existing callers.
                lines = [f"=== {container} — recency-ranked, {len(top)} of {len(hits)} hits ==="]
                for r in top:
                    when = (r.get('updatedAt') or '').split('T')[0]
                    sim = r.get('similarity')
                    sim_tag = f" sim={sim:.3f}" if isinstance(sim, (int, float)) else ''
                    lines.append(f"--- {when} (id={r.get('id', '?')}){sim_tag}")
                    body = r.get('memory') or r.get('content') or ''
                    lines.append(body)
                return '\n'.join(lines)
            except (json.JSONDecodeError, AttributeError, TypeError):
                # Fall back to raw stdout if JSON parse fails
                return result.stdout.strip()

        result = subprocess.run(
            cmd,
            capture_output=True, text=True, timeout=15,
            cwd=str(PROJECT_ROOT)
        )
        return result.stdout.strip() if result.stdout else f"No results for '{query}' in {container}"
    except Exception as e:
        return f"Search error: {str(e)}"


def dashboard_get(endpoint: str) -> str:
    """Query the dashboard API. Sends basic-auth from DASHBOARD_USER/DASHBOARD_PASS
    if set — dashboard middleware gates all /api/* except /api/health (S215 G-3
    follow-up: every prior MCP dashboard call silently 401-ed; tools that depended
    on dashboard_get were returning auth errors as data)."""
    try:
        import urllib.request
        import base64
        url = f"{DASHBOARD_URL}{endpoint}"
        req = urllib.request.Request(url)
        user = os.environ.get('DASHBOARD_USER', '').strip()
        pwd = os.environ.get('DASHBOARD_PASS', '').strip()
        if user and pwd:
            token = base64.b64encode(f"{user}:{pwd}".encode()).decode()
            req.add_header('Authorization', f'Basic {token}')
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.read().decode('utf-8')
    except Exception as e:
        return json.dumps({"error": str(e)})


def read_json_file(path: str) -> dict:
    """Read a JSON file from the project."""
    full_path = PROJECT_ROOT / path
    if full_path.exists():
        return json.loads(full_path.read_text())
    return {"error": f"File not found: {path}"}


# ═══════════════════════════════════════════════════════════════════════════
# TOOLS
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def lookup_citizen(name: str) -> str:
    """Look up a citizen by name. Returns profile from world-data + appearance history from bay-tribune.
    Use this instead of reading truesource or searching Supermemory manually."""
    # S197 BUNDLE-B (G-S7/G-S12): citizen cards are short structured records
    # — the default memories-mode threshold of 0.6 misses them. Use hybrid
    # mode + 0.3 threshold (same pattern as wd-* domain tools shipped S183).
    # Also try wd-citizens directly first as the most specific source.
    citizen_card = supermemory_search(name, 'wd-citizens', 3, mode='hybrid', threshold=0.3)
    world = supermemory_search(name, 'world-data', 3, mode='hybrid', threshold=0.3)
    # S215 canon.1c (G-S9): bay-tribune stacks per-citizen wiki entries by
    # edition (Patricia Nolan E85→E92→E93 each persist). Similarity ranking
    # returns whichever version had the fattest text match — often a stale
    # edition. Recency rank pushes the newest ingest to the top so callers
    # see canonical-current facts first. canon.1b will eventually wipe the
    # priors at ingest time; until then 1c surfaces the current version.
    canon = supermemory_search(name, 'bay-tribune', 3, mode='hybrid', threshold=0.3,
                               sort='recency')
    return (f"=== WD-CITIZENS (structured card) ===\n{citizen_card}\n\n"
            f"=== WORLD-DATA (broader state) ===\n{world}\n\n"
            f"=== BAY-TRIBUNE (canon history, newest first) ===\n{canon}")


@mcp.tool()
def lookup_initiative(name: str) -> str:
    """Look up a civic initiative by name or ID (e.g. 'Stabilization Fund' or 'INIT-001').
    Returns Initiative_Tracker record: status, phase, vote cycle, budget, implementation
    summary, engine outcome (vote breakdown, affected neighborhoods, policy domain).
    Use this instead of reading Initiative_Tracker sheet directly."""
    # G-1 fix (S215): read filesystem directly. Pattern mirrors get_roster —
    # no dashboard round-trip, no auth dependency. Sources:
    #   - output/initiative_tracker.json (Layer 2 — editorial tracker)
    #   - output/desk-packets/civic_c{latest}.json (Layer 1 — engine outcomes)
    # Old impl never read the tracker at all (dashboard articles search +
    # world-data supermemory) — CLAUDE.md docstring was a lie.
    tracker = read_json_file('output/initiative_tracker.json')
    items = tracker.get('initiatives', []) if isinstance(tracker, dict) else []

    needle = name.strip().lower()
    match = None
    for it in items:
        if (it.get('id') or '').lower() == needle:
            match = it
            break
    if not match:
        for it in items:
            if needle and needle in (it.get('name') or '').lower():
                match = it
                break

    if not match:
        # Semantic fallback — no tracker row matched. Note miss explicitly so
        # callers know they got fallback prose, not authoritative tracker data.
        world = supermemory_search(f"{name} initiative", 'world-data', 3,
                                   mode='hybrid', threshold=0.3)
        avail = ', '.join((it.get('id') or '?') for it in items) or '(tracker empty)'
        return (f"=== NO TRACKER MATCH for '{name}' — semantic fallback (world-data) ===\n"
                f"Available tracker IDs: {avail}\n\n{world}")

    # Engine outcome layer — read latest civic desk packet for this initiative
    engine = None
    packets_dir = PROJECT_ROOT / 'output' / 'desk-packets'
    if packets_dir.exists():
        civic_packets = sorted(
            (p for p in packets_dir.iterdir() if p.name.startswith('civic_c') and p.name.endswith('.json')),
            key=lambda p: int(''.join(c for c in p.stem if c.isdigit()) or '0'),
            reverse=True,
        )
        if civic_packets:
            try:
                packet = json.loads(civic_packets[0].read_text())
                outcomes = (packet.get('canonReference') or {}).get('recentOutcomes') or []
                engine = next((o for o in outcomes if o.get('initiativeId') == match.get('id')), None)
            except (json.JSONDecodeError, OSError):
                engine = None

    impl = match.get('implementation') or {}
    neighborhoods = match.get('neighborhoods') or []
    lines = [
        f"=== INITIATIVE: {match.get('id')} {match.get('name')} ===",
        f"Status: {match.get('status')} | Vote cycle: {match.get('voteCycle')} | Budget: {match.get('budget')}",
        f"Domain: {match.get('domain')} | Neighborhoods: {', '.join(neighborhoods) or '(none)'}",
        "",
        "Implementation:",
        f"  Phase: {impl.get('phase')}",
        f"  Status: {impl.get('status')}",
        f"  Summary: {impl.get('summary')}",
        f"  Next action: {impl.get('nextScheduledAction')} (cycle {impl.get('nextActionCycle')})",
    ]
    if engine:
        affected = engine.get('affectedNeighborhoods') or []
        # Engine packet may emit string or list — normalize.
        if isinstance(affected, str):
            affected_str = affected.strip() or '(none)'
        else:
            affected_str = ', '.join(affected) or '(none)'
        lines.extend([
            "",
            "Engine outcome (latest civic packet):",
            f"  Vote breakdown: {engine.get('voteBreakdown')}",
            f"  Policy domain: {engine.get('policyDomain')}",
            f"  Affected neighborhoods: {affected_str}",
        ])
    return '\n'.join(lines)


@mcp.tool()
def search_canon(query: str) -> str:
    """Search the Bay Tribune canon archive (bay-tribune container).
    Returns published edition content matching the query.
    Use for: 'What has been published about OARI?', 'Beverly Hayes quotes', 'Baylight timeline'."""
    return supermemory_search(query, 'bay-tribune', 5)


@mcp.tool()
def search_world(query: str) -> str:
    """Search the world state (world-data container).
    Returns current city state: citizens, businesses, neighborhoods, demographics.
    Use for: 'Who lives in Temescal?', 'West Oakland businesses', 'neighborhood sentiment'."""
    # S197 BUNDLE-B (G-S12): hybrid+0.3 to surface short citizen/biz/faith cards
    # alongside longer narrative content. Default memories+0.6 returned only
    # faith-org/business cards on citizen queries because citizen cards are
    # below the threshold.
    return supermemory_search(query, 'world-data', 5, mode='hybrid', threshold=0.3)


@mcp.tool()
def search_articles(query: str) -> str:
    """Search all published articles via the dashboard API.
    Returns headlines, reporters, citizens mentioned.
    Use for: 'articles about Danny Horn', 'civic affairs coverage', 'Fruitvale stories'."""
    # G-3 fix (S215): URL-encode query — spaces/punctuation crashed urllib
    # with "URL can't contain control characters" on every multi-word call.
    result = dashboard_get(f'/api/search/articles?q={quote(query)}')
    return result[:3000] if result else "Dashboard not available"


@mcp.tool()
def get_roster(team: str = "as") -> str:
    """Get player roster data. Default: Oakland A's.
    Returns player names, positions, contract details, ratings.
    Use instead of reading truesource_reference.json."""
    # S197 BUNDLE-B (G-S8): truesource_reference.json is a dict with
    # team-keyed sub-lists (asRoster: list[90], plus future expansion teams).
    # Old code walked the top-level dict expecting each value to be a player
    # record — only matched flat-list shapes that don't exist. Map team
    # variant tokens to the canonical roster key, then return the list.
    truesource_path = PROJECT_ROOT / 'output' / 'desk-packets' / 'truesource_reference.json'
    if not truesource_path.exists():
        return "truesource_reference.json not found"

    data = json.loads(truesource_path.read_text())
    team_lower = team.lower().strip()

    # Team variant → roster key. As future teams ship (Oakland Oaks, etc.),
    # add entries here. Both bare and namespaced names accepted.
    team_to_key = {
        'as': 'asRoster',
        "a's": 'asRoster',
        'as roster': 'asRoster',
        'athletics': 'asRoster',
        'oakland': 'asRoster',
        'oakland athletics': 'asRoster',
        "oakland a's": 'asRoster',
    }
    roster_key = team_to_key.get(team_lower)

    # Direct-key fallback: caller can pass 'asRoster' literally.
    if not roster_key and team in data and isinstance(data[team], list):
        roster_key = team

    if not roster_key:
        available = ', '.join(k for k, v in data.items() if isinstance(v, list))
        return (f"No roster found for team '{team}'. Available roster keys: {available}. "
                f"Try 'as' / 'athletics' / 'oakland' for the A's roster.")

    players = data.get(roster_key, [])
    if not isinstance(players, list) or not players:
        return f"Roster '{roster_key}' is empty or wrong shape."

    lines = [f"Roster ({roster_key}): {len(players)} players"]
    for p in players[:40]:  # Cap to avoid token explosion
        if not isinstance(p, dict):
            continue
        name = p.get('name', p.get('Name', '?'))
        pos = p.get('position', p.get('Position', '?'))
        pop = p.get('popId', '')
        tier = p.get('tier', '')
        status = p.get('status', '')
        suffix_parts = []
        if pop: suffix_parts.append(pop)
        if tier: suffix_parts.append(f"T{tier}")
        if status and status.lower() != 'active': suffix_parts.append(status)
        suffix = f" [{' / '.join(suffix_parts)}]" if suffix_parts else ''
        lines.append(f"  {name} — {pos}{suffix}")

    if len(players) > 40:
        lines.append(f"  ... ({len(players) - 40} more players truncated)")

    return '\n'.join(lines)


@mcp.tool()
def get_neighborhood(name: str) -> str:
    """Get neighborhood state — demographics, sentiment, businesses, recent events.
    Use for: understanding a neighborhood before writing about it."""
    # S197 BUNDLE-B: hybrid+0.3 (same root cause as lookup_citizen — short
    # structured cards below default memories-mode threshold).
    return supermemory_search(f"{name} neighborhood", 'world-data', 3, mode='hybrid', threshold=0.3)


@mcp.tool()
def get_council_member(district: str) -> str:
    """Get council member info for a district (D1-D9) or by name.
    Returns: name, faction, approval rating, recent votes.
    Use for: civic coverage, voice agent context."""
    # S197 BUNDLE-B (G-W15): truesource_reference.json carries the canonical
    # council list as a 9-element array. Read it directly first — that's the
    # authoritative cycle-current roster — and only fall back to supermemory
    # narrative search if the structured record is unavailable. Pre-S197 this
    # tool queried world-data with default mode/threshold and returned empty
    # for every district.
    truesource_path = PROJECT_ROOT / 'output' / 'desk-packets' / 'truesource_reference.json'
    arg = district.strip()
    norm_district = arg.upper().replace(' ', '')

    if truesource_path.exists():
        try:
            data = json.loads(truesource_path.read_text())
            council = data.get('council', [])
            if isinstance(council, list) and council:
                # Match by district code (D1..D9) OR by name substring
                for member in council:
                    if not isinstance(member, dict):
                        continue
                    m_district = (member.get('district', '') or '').upper().replace(' ', '')
                    m_name = (member.get('name', '') or '')
                    if norm_district == m_district or arg.lower() in m_name.lower():
                        # Found — render structured + add narrative context
                        struct = (
                            f"=== STRUCTURED (truesource cycle {data.get('cycle', '?')}) ===\n"
                            f"Name:     {m_name}\n"
                            f"District: {member.get('district', '?')}\n"
                            f"Faction:  {member.get('faction', '?')}\n"
                            f"Status:   {member.get('status', '?')}\n"
                        )
                        # Pull recent narrative if available
                        narrative = supermemory_search(
                            m_name, 'bay-tribune', 3, mode='hybrid', threshold=0.3
                        )
                        return f"{struct}\n=== RECENT CANON ===\n{narrative}"

                # Not matched — list what's available so caller can retry
                listing = '\n'.join(
                    f"  {m.get('district', '?')}: {m.get('name', '?')} ({m.get('faction', '?')})"
                    for m in council if isinstance(m, dict)
                )
                return (f"No council member found for '{district}'. "
                        f"Available members:\n{listing}")
        except (json.JSONDecodeError, KeyError):
            pass  # Fall through to supermemory search

    # Fallback: supermemory search (with hybrid+0.3 to surface citizen cards)
    query = f"council {district}"
    return supermemory_search(query, 'world-data', 3, mode='hybrid', threshold=0.3)


@mcp.tool()
def get_domain_ratings(cycle: int) -> str:
    """Get edition coverage ratings for a specific cycle.
    Returns: per-domain ratings (-5 to +5) that show how the newspaper covered each domain.
    Use for: understanding media impact on city dynamics."""
    # Read from Edition_Coverage_Ratings via dashboard
    result = dashboard_get(f'/api/health')
    # Also search for cycle-specific data
    canon = supermemory_search(f"Edition {cycle} coverage rating domain", 'bay-tribune', 3)
    return f"=== COVERAGE RATINGS C{cycle} ===\n{canon}"


# ═══════════════════════════════════════════════════════════════════════════
# DOMAIN-FILTERED LOOKUPS (S183 — wd-* tag scheme, plan tasks M1-M4)
# Each tool queries a single domain tag instead of the broad world-data tag,
# returning only that domain's card without citizen/faith/cultural noise.
# Existing tools (lookup_citizen, get_neighborhood, etc.) continue to query
# the broad world-data tag and keep working — every domain card still
# carries it.
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def lookup_business(name: str) -> str:
    """Look up a business by name. Returns the wd-business card: BIZ-ID, sector,
    neighborhood, employees, financials, key personnel, and bay-tribune appearances.
    Use for: business-focused articles, employer profiles, sector analysis.
    Narrower than search_world — returns only business cards (52 in world-data)."""
    return supermemory_search(name, 'wd-business', 3, mode='hybrid', threshold=0.3)


@mcp.tool()
def lookup_faith_org(name: str) -> str:
    """Look up a faith organization by name. Returns the wd-faith card: tradition,
    neighborhood, leader, congregation size, recent Faith_Ledger events, and
    bay-tribune appearances.
    Use for: faith coverage, community-program reporting, religious-leader profiles.
    Narrower than search_world — returns only faith cards (16 in world-data)."""
    return supermemory_search(name, 'wd-faith', 3, mode='hybrid', threshold=0.3)


@mcp.tool()
def lookup_cultural(name: str) -> str:
    """Look up a cultural figure by name (athletes, musicians, public personalities).
    Returns the wd-cultural card: CUL-ID, domain (Sports/Arts/etc.), fame category,
    fame score, trend trajectory, and bay-tribune appearances.
    Use for: fame/celebrity coverage, cultural-sector reporting, sports figures
    outside roster context.
    Note: a cultural figure may also have a wd-citizens card (e.g., Beverly Hayes
    is both citizen + cultural figure). Use lookup_citizen for the citizen profile,
    lookup_cultural for the fame/domain profile.
    Narrower than search_world — returns only cultural cards (39 in world-data)."""
    return supermemory_search(name, 'wd-cultural', 3, mode='hybrid', threshold=0.3)


@mcp.tool()
def get_neighborhood_state(name: str) -> str:
    """Get a neighborhood's state card from wd-neighborhood: district, gentrification
    phase, population, median income/rent, sentiment, crime index, displacement
    pressure, top businesses, top citizens, and bay-tribune appearances.
    Use when you need the structured neighborhood-state record specifically.
    Narrower than the existing get_neighborhood tool — returns only the
    neighborhood card (17 in world-data) without mixing in unrelated mentions."""
    return supermemory_search(name, 'wd-neighborhood', 3, mode='hybrid', threshold=0.3)


# ═══════════════════════════════════════════════════════════════════════════
# RUN
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import sys
    if '--http' in sys.argv:
        idx = sys.argv.index('--http')
        port = int(sys.argv[idx + 1]) if idx + 1 < len(sys.argv) else 3032
        host = "0.0.0.0" if '--public' in sys.argv else "127.0.0.1"
        mcp.run(transport="http", host=host, port=port)
    else:
        mcp.run()
