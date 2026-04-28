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
from fastmcp import FastMCP

# Load env
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / '.env')

mcp = FastMCP("godworld", instructions="GodWorld city simulation data. Search canon, look up citizens, check initiatives, query neighborhoods.")

SUPERMEMORY_KEY = os.environ.get('SUPERMEMORY_CC_API_KEY', '')
DASHBOARD_URL = 'http://localhost:3001'
PROJECT_ROOT = Path(__file__).parent.parent


# ═══════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def supermemory_search(query: str, container: str, limit: int = 5,
                       mode: str = None, threshold: float = None) -> str:
    """Search a Supermemory container.

    mode: None (CLI default 'memories'), 'hybrid', or 'documents'. Use 'hybrid'
        for the wd-* domain tags — short structured cards are missed by the
        default memories-mode threshold of 0.6.
    threshold: None (CLI default 0.6) or a 0-1 float. Lower for richer recall
        on short cards.
    """
    try:
        cmd = ['npx', 'supermemory', 'search', query, '--tag', container,
               '--limit', str(limit)]
        if mode:
            cmd.extend(['--mode', mode])
        if threshold is not None:
            cmd.extend(['--threshold', str(threshold)])
        result = subprocess.run(
            cmd,
            capture_output=True, text=True, timeout=15,
            cwd=str(PROJECT_ROOT)
        )
        return result.stdout.strip() if result.stdout else f"No results for '{query}' in {container}"
    except Exception as e:
        return f"Search error: {str(e)}"


def dashboard_get(endpoint: str) -> str:
    """Query the dashboard API."""
    try:
        import urllib.request
        url = f"{DASHBOARD_URL}{endpoint}"
        req = urllib.request.Request(url)
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
    world = supermemory_search(name, 'world-data', 3)
    canon = supermemory_search(name, 'bay-tribune', 3)
    return f"=== WORLD-DATA (current state) ===\n{world}\n\n=== BAY-TRIBUNE (canon history) ===\n{canon}"


@mcp.tool()
def lookup_initiative(name: str) -> str:
    """Look up a civic initiative by name. Returns current status, phase, neighborhoods, and recent milestones.
    Use this instead of reading Initiative_Tracker sheet directly."""
    # Try dashboard first
    result = dashboard_get(f'/api/search/articles?q={name}')
    # Also search world-data for structured state
    world = supermemory_search(f"{name} initiative", 'world-data', 3)
    return f"=== INITIATIVE STATE ===\n{world}\n\n=== RELATED ARTICLES ===\n{result[:2000]}"


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
    return supermemory_search(query, 'world-data', 5)


@mcp.tool()
def search_articles(query: str) -> str:
    """Search all published articles via the dashboard API.
    Returns headlines, reporters, citizens mentioned.
    Use for: 'articles about Danny Horn', 'civic affairs coverage', 'Fruitvale stories'."""
    result = dashboard_get(f'/api/search/articles?q={query}')
    return result[:3000] if result else "Dashboard not available"


@mcp.tool()
def get_roster(team: str = "as") -> str:
    """Get player roster data. Default: Oakland A's.
    Returns player names, positions, contract details, ratings.
    Use instead of reading truesource_reference.json."""
    truesource_path = PROJECT_ROOT / 'output' / 'desk-packets' / 'truesource_reference.json'
    if not truesource_path.exists():
        return "truesource_reference.json not found"

    data = json.loads(truesource_path.read_text())
    team_lower = team.lower()

    # Filter by team
    players = []
    if isinstance(data, list):
        for p in data:
            p_team = (p.get('team', '') or '').lower()
            if team_lower in p_team or ("a's" in team_lower and 'oakland' in p_team):
                players.append(p)
    elif isinstance(data, dict):
        for key, p in data.items():
            if isinstance(p, dict):
                p_team = (p.get('team', '') or p.get('Team', '') or '').lower()
                if team_lower in p_team or ("a's" in team_lower and 'oakland' in p_team):
                    players.append(p)

    if not players:
        return f"No players found for team '{team}'. Available data has {len(data) if isinstance(data, list) else len(data.keys())} entries."

    lines = [f"Roster: {len(players)} players"]
    for p in players[:30]:  # Cap at 30 to avoid token explosion
        name = p.get('name', p.get('Name', '?'))
        pos = p.get('position', p.get('Position', '?'))
        lines.append(f"  {name} — {pos}")

    return '\n'.join(lines)


@mcp.tool()
def get_neighborhood(name: str) -> str:
    """Get neighborhood state — demographics, sentiment, businesses, recent events.
    Use for: understanding a neighborhood before writing about it."""
    return supermemory_search(f"{name} neighborhood", 'world-data', 3)


@mcp.tool()
def get_council_member(district: str) -> str:
    """Get council member info for a district (D1-D9) or by name.
    Returns: name, faction, approval rating, recent votes.
    Use for: civic coverage, voice agent context."""
    # Search world-data for council member
    query = f"council {district}" if district.upper().startswith('D') else f"council {district}"
    return supermemory_search(query, 'world-data', 3)


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
