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
  search_everything(query)   — federated: world-data + bay-tribune + dashboard + disk grep
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
from concurrent.futures import ThreadPoolExecutor
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
PUBLISHED_CANON_FILTER = {
    'AND': [
        {'key': 'source', 'value': 'edition-ingest'},
    ],
}
WORLD_DOMAIN_TAGS = (
    'wd-citizens',
    'wd-business',
    'wd-faith',
    'wd-cultural',
    'wd-neighborhood',
    'wd-initiative',
    'wd-player-truesource',
    'wd-summary',
)


# ═══════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def _project_supermemory_hits(query: str, container: str, hits: list,
                              limit: int, sort: str = None,
                              label: str = None) -> str:
    """Render only retrieval content and useful provenance from JSON hits."""
    if sort == 'recency':
        hits.sort(
            key=lambda item: (
                item.get('updatedAt') or '',
                item.get('similarity') or 0,
            ),
            reverse=True,
        )
    top = hits[:limit]
    if not top:
        return f"No results for '{query}' in {container}"

    qualifier = f" — {label}" if label else ''
    lines = [f"=== {container}{qualifier}; {len(top)} hit(s) ==="]
    for hit in top:
        metadata = hit.get('metadata')
        if not isinstance(metadata, dict):
            metadata = {}
        title = hit.get('title') or metadata.get('title') or '(untitled)'
        provenance = []
        source = metadata.get('source') or hit.get('source')
        cycle = metadata.get('cycle') or hit.get('cycle')
        record_type = metadata.get('type') or hit.get('type')
        updated = (hit.get('updatedAt') or '').split('T')[0]
        similarity = hit.get('similarity')
        if source:
            provenance.append(f"source={source}")
        if cycle is not None:
            provenance.append(f"cycle={cycle}")
        if record_type:
            provenance.append(f"type={record_type}")
        if updated:
            provenance.append(f"updated={updated}")
        if isinstance(similarity, (int, float)):
            provenance.append(f"sim={similarity:.3f}")
        suffix = f" [{' '.join(provenance)}]" if provenance else ''
        lines.append(f"--- {title}{suffix}")
        body = (
            hit.get('memory')
            or hit.get('content')
            or hit.get('chunk')
            or hit.get('summary')
            or ''
        )
        lines.append(str(body).strip() or '(no projected text)')
    return '\n'.join(lines)


def supermemory_search(query: str, container: str, limit: int = 5,
                       mode: str = None, threshold: float = None,
                       sort: str = None, metadata_filter: dict = None,
                       project: bool = False, label: str = None) -> str:
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
    metadata_filter: Supermemory AND/OR filter object passed as compact JSON.
        A filtered search always parses JSON and returns the projected shape.
    project: parse JSON and return only useful content/provenance fields.
    """
    try:
        if not isinstance(limit, int) or limit < 1:
            raise ValueError('limit must be a positive integer')
        if sort not in (None, 'recency'):
            raise ValueError("sort must be None or 'recency'")
        if metadata_filter is not None and not isinstance(metadata_filter, dict):
            raise ValueError('metadata_filter must be an object')

        needs_json = bool(sort or project or metadata_filter is not None)
        fetch_limit = max(limit * 3, 10) if sort == 'recency' else limit
        cmd = ['npx', 'supermemory', 'search', query, '--tag', container,
               '--limit', str(fetch_limit)]
        if mode:
            cmd.extend(['--mode', mode])
        if threshold is not None:
            cmd.extend(['--threshold', str(threshold)])
        if metadata_filter is not None:
            cmd.extend([
                '--filter',
                json.dumps(metadata_filter, separators=(',', ':'), sort_keys=True),
            ])
        if needs_json:
            cmd.append('--json')

        result = subprocess.run(
            cmd,
            capture_output=True, text=True, timeout=20,
            cwd=str(PROJECT_ROOT)
        )
        if result.returncode != 0:
            return (
                f"Search error: Supermemory CLI exited {result.returncode} "
                f"for {container}"
            )
        if not result.stdout:
            return f"No results for '{query}' in {container}"

        if needs_json:
            try:
                parsed = json.loads(result.stdout)
                hits = parsed.get('results', [])
                if not isinstance(hits, list):
                    raise TypeError('results must be an array')
            except (json.JSONDecodeError, AttributeError, TypeError) as exc:
                return f"Search error: invalid Supermemory JSON for {container}: {exc}"
            return _project_supermemory_hits(
                query, container, hits, limit, sort=sort, label=label
            )

        return result.stdout.strip()
    except Exception as e:
        return f"Search error: {str(e)}"


def published_canon_search(query: str, limit: int = 5,
                           sort: str = None) -> str:
    """Search only the audited published-ingest provenance lane."""
    return supermemory_search(
        query,
        'bay-tribune',
        limit,
        mode='hybrid',
        threshold=0.3,
        sort=sort,
        metadata_filter=PUBLISHED_CANON_FILTER,
        project=True,
        label='published provenance only',
    )


def search_world_domains(query: str, per_domain_limit: int = 2) -> str:
    """Fan out over real world-data domain tags, never the empty umbrella lane."""
    def run_domain(tag):
        return supermemory_search(
            query,
            tag,
            per_domain_limit,
            mode='hybrid',
            threshold=0.3,
            project=True,
        )

    # Three workers bound Node/npx pressure on the 1 GB production droplet.
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {tag: pool.submit(run_domain, tag) for tag in WORLD_DOMAIN_TAGS}
        results = {tag: future.result() for tag, future in futures.items()}

    sections = []
    for tag in WORLD_DOMAIN_TAGS:
        result = results[tag]
        if result.startswith('No results for '):
            continue
        sections.append(result)
    if not sections:
        return f"No results for '{query}' in world-data domain tags"
    return '\n\n'.join(sections)


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


def _disk_rank(rel_path: str) -> int:
    """Rank a disk hit so structured/current data surfaces above prose and
    journals. Lower = higher priority. The federated search caps results, so
    ranking decides what survives truncation on common terms."""
    p = rel_path.replace('\\', '/')
    if p.startswith('output/simulation_ledger_snapshot'):  # live ledger — most authoritative
        return -1
    if p.startswith('output/desk-packets/'):
        return 0
    if p.startswith('output/') and p.endswith('.json'):
        return 1
    if p.startswith('output/'):
        return 2
    if p.startswith('editions/'):  # published canon — must outrank generic docs
        return 2
    if p.startswith('docs/mags-corliss/'):  # journals / session history — noisy
        return 5
    if p.startswith('docs/'):
        return 3
    return 4


def disk_search(query: str, max_files: int = 12) -> str:
    """Live grep across output/ + docs/ for any text. No index — reads the
    actual files every call, so it can't go stale (an entity in the ledger is
    always findable). grep (not rg): rg on this droplet is only a Claude Code
    shell-function wrapper, unreachable from a subprocess; grep is universal and
    clears the full ~4,850-file corpus in <1s. Ranks structured data above prose
    (see _disk_rank) and caps output to avoid token blowup on common terms."""
    q = query.strip()
    if not q:
        return "(empty query)"
    try:
        # -r recursive, -I skip binary, -l files-with-matches, -i case-insensitive.
        # -F fixed-string so names with punctuation aren't treated as regex.
        # `--` terminates option parsing so a query starting with '-' is treated
        # as the pattern, not a grep flag (argument-injection guard).
        # 'editions' = root canon (published cycle editions); without it a name
        # search silently misses every published mention.
        cmd = ['grep', '-rIliF', '--include=*.json', '--include=*.jsonl',
               '--include=*.md', '--include=*.txt', '--', q,
               'output', 'docs', 'editions']
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15,
                                cwd=str(PROJECT_ROOT))
        files = [ln.strip() for ln in result.stdout.splitlines() if ln.strip()]
        # S345: exact-phrase miss on a multi-word query falls back to AND-of-terms
        # (every term present somewhere in the file, any order) — same semantics
        # as lib/mags.js searchDisk, which the Discord bot already uses. Without
        # this, "Elliot Abraham Oaks General Manager" missed files that contain
        # every one of those words. snippet_pat tracks what the snippet grep
        # should look for (the phrase normally; the first term on fallback).
        snippet_pat = q
        terms = q.split()
        if not files and len(terms) > 1:
            first = subprocess.run(
                ['grep', '-rIliF', '--include=*.json', '--include=*.jsonl',
                 '--include=*.md', '--include=*.txt', '--', terms[0],
                 'output', 'docs', 'editions'],
                capture_output=True, text=True, timeout=15, cwd=str(PROJECT_ROOT))
            files = [ln.strip() for ln in first.stdout.splitlines() if ln.strip()]
            for term in terms[1:]:
                if not files:
                    break
                nxt = subprocess.run(
                    ['grep', '-IliF', '--', term] + files,
                    capture_output=True, text=True, timeout=15, cwd=str(PROJECT_ROOT))
                files = [ln.strip() for ln in nxt.stdout.splitlines() if ln.strip()]
            snippet_pat = terms[0]
        if not files:
            return f"No disk hits for '{q}'"
        files.sort(key=_disk_rank)
        total = len(files)
        top = files[:max_files]
        # Guarantee canon representation: prolific citizens match 100+ output/
        # files that flood the cap, so editions (published canon) never survive
        # truncation by rank alone. If editions matched but none made the cut,
        # reserve up to 2 slots for the top editions hits.
        ed_hits = [f for f in files if f.startswith('editions/')]
        if ed_hits and not any(f.startswith('editions/') for f in top):
            top = top[:max(0, max_files - 2)] + ed_hits[:2]

        lines = [f"{total} file(s) matched on disk"
                 + (f" (showing top {max_files} by priority)" if total > max_files else "")]
        for rel in top:
            snippet = ''
            try:
                snip = subprocess.run(
                    ['grep', '-m1', '-niF', '--', snippet_pat, rel],
                    capture_output=True, text=True, timeout=5,
                    cwd=str(PROJECT_ROOT))
                first = snip.stdout.splitlines()[0] if snip.stdout else ''
                # Full line for the live-ledger snapshot — its whole value is the
                # complete citizen row (Income/Tier/Stats live past char 160).
                # Tight snippet for prose/packet files where 160 chars is plenty.
                cap = 1500 if 'simulation_ledger_snapshot' in rel else 160
                snippet = first.strip()[:cap]
            except Exception:
                snippet = ''
            lines.append(f"  {rel}" + (f"\n      {snippet}" if snippet else ''))
        return '\n'.join(lines)
    except Exception as e:
        return f"Disk search error: {str(e)}"


# ═══════════════════════════════════════════════════════════════════════════
# TOOLS
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def lookup_citizen(name: str) -> str:
    """Look up a citizen by name. Returns a current domain card plus published history.
    Use this instead of reading truesource or searching Supermemory manually."""
    # S197 BUNDLE-B (G-S7/G-S12): citizen cards are short structured records
    # — the default memories-mode threshold of 0.6 misses them. Use hybrid
    # mode + 0.3 threshold (same pattern as wd-* domain tools shipped S183).
    citizen_card = supermemory_search(name, 'wd-citizens', 3, mode='hybrid', threshold=0.3)
    # Supermemory is not the current-state authority. Recency helps order a
    # citizen's paper-of-record appearances, while provenance filtering keeps
    # mixed drive/archive directives out of the canon lane.
    canon = published_canon_search(name, 3, sort='recency')
    return (f"=== WD-CITIZENS (structured card) ===\n{citizen_card}\n\n"
            f"=== BAY-TRIBUNE (published history, newest first) ===\n{canon}")


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
        world = supermemory_search(
            f"{name} initiative",
            'wd-initiative',
            3,
            mode='hybrid',
            threshold=0.3,
            project=True,
        )
        avail = ', '.join((it.get('id') or '?') for it in items) or '(tracker empty)'
        return (f"=== NO TRACKER MATCH for '{name}' — semantic fallback (wd-initiative) ===\n"
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
    Returns only records carrying audited edition-ingest provenance.
    Use for: 'What has been published about OARI?', 'Beverly Hayes quotes', 'Baylight timeline'."""
    return published_canon_search(query, 5)


@mcp.tool()
def search_world(query: str) -> str:
    """Search world-data domain tags.
    Returns derived cards from citizens, businesses, faith, culture,
    neighborhoods, initiatives, player truesource, and Cycle summaries.
    Use for: 'Who lives in Temescal?', 'West Oakland businesses', 'neighborhood sentiment'."""
    return search_world_domains(query)


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
    return supermemory_search(
        f"{name} neighborhood",
        'wd-neighborhood',
        3,
        mode='hybrid',
        threshold=0.3,
        project=True,
    )


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
                        narrative = published_canon_search(m_name, 3)
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

    # Fallback: the current citizen-card domain, not the empty umbrella search.
    query = f"council {district}"
    return supermemory_search(
        query,
        'wd-citizens',
        3,
        mode='hybrid',
        threshold=0.3,
        project=True,
    )


@mcp.tool()
def get_domain_ratings(cycle: int) -> str:
    """Get edition coverage ratings for a specific cycle.
    Returns: per-domain ratings (-5 to +5) that show how the newspaper covered each domain.
    Use for: understanding media impact on city dynamics."""
    # Read from Edition_Coverage_Ratings via dashboard
    result = dashboard_get(f'/api/health')
    # Also search for cycle-specific data
    canon = published_canon_search(f"Edition {cycle} coverage rating domain", 3)
    return f"=== COVERAGE RATINGS C{cycle} ===\n{canon}"


# ═══════════════════════════════════════════════════════════════════════════
# DOMAIN-FILTERED LOOKUPS (S183 — wd-* tag scheme, plan tasks M1-M4)
# Each tool queries a single domain tag instead of the broad world-data tag,
# returning only that domain's card without citizen/faith/cultural noise.
# Generic search_world fans out across the domain tags because the umbrella
# search itself does not return useful measured results.
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
    Same backing domain as get_neighborhood; this name makes the structured-card
    contract explicit."""
    return supermemory_search(name, 'wd-neighborhood', 3, mode='hybrid', threshold=0.3)


# ═══════════════════════════════════════════════════════════════════════════
# FEDERATED SEARCH (S252 — one query, all shelves)
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def search_everything(query: str) -> str:
    """Search EVERYTHING for a bare string — no entity type required. Fans out to
    all three storage shelves at once and returns merged, source-tagged hits:
      1. world-data Supermemory  — bounded fan-out over the real wd-* domains.
      2. bay-tribune Supermemory — published-ingest provenance only.
      3. dashboard articles API  — published-article index.
      4. disk (live grep)        — output/ + docs/, structured data ranked first.

    Use when you don't know (or don't care) what KIND of thing you're looking up —
    'vinnie keane', 'Baylight', 'the brass-fitting line'. For a known entity type,
    the narrower tools (lookup_citizen, lookup_business, lookup_initiative, …) are
    cheaper. Each source degrades to a 'no results' line independently — one shelf
    being down never blanks the whole answer."""
    q = (query or '').strip()
    if not q:
        return "search_everything: empty query"

    def _safe(fn, label):
        try:
            out = fn()
            return out.strip() if out and out.strip() else f"(no results in {label})"
        except Exception as e:
            return f"({label} unavailable: {e})"

    # Fan out concurrently. search_world_domains applies its own three-worker
    # bound so the 1 GB droplet does not launch all npx processes at once.
    sources = {
        'world-data': lambda: search_world_domains(q),
        'bay-tribune': lambda: published_canon_search(q, 3),
        'dashboard': lambda: (dashboard_get(f'/api/search/articles?q={quote(q)}') or '')[:2000],
        'disk': lambda: disk_search(q),
    }
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {label: pool.submit(_safe, fn, label) for label, fn in sources.items()}
        results = {label: fut.result() for label, fut in futures.items()}
    world, canon, articles, disk = (
        results['world-data'], results['bay-tribune'],
        results['dashboard'], results['disk'])

    return (
        f"╔═══ SEARCH_EVERYTHING: '{q}' ═══╗\n\n"
        f"=== SUPERMEMORY · world-data (wd-* domain fan-out) ===\n{world}\n\n"
        f"=== SUPERMEMORY · bay-tribune (published provenance only) ===\n{canon}\n\n"
        f"=== DASHBOARD · published articles ===\n{articles}\n\n"
        f"=== DISK · live grep (output/ + docs/) ===\n{disk}"
    )


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
