-- ============================================================================
-- GodWorld SQLite Schema for OpenClaw
-- ============================================================================
-- Version: 1.0
-- Purpose: Local persistence for citizen memory, cycle state, and continuity
--
-- Usage:
--   sqlite3 godworld.db < godworld.sql
--
-- Design Goals:
--   - Fast local queries for prompt building
--   - Mirrors Google Sheets structure where useful
--   - Tracks sync state to avoid duplicate processing
-- ============================================================================

-- ============================================================================
-- CITIZENS
-- ============================================================================
-- Core citizen profiles synced from Simulation_Ledger + Civic_Office_Ledger

CREATE TABLE IF NOT EXISTS citizens (
  pop_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER,
  tier INTEGER DEFAULT 4,
  faction TEXT,
  role TEXT,
  occupation TEXT,
  neighborhood TEXT,
  personality TEXT,

  -- Derived/computed fields
  media_appearances INTEGER DEFAULT 0,
  last_mention_cycle INTEGER,
  mention_streak INTEGER DEFAULT 0,

  -- Integrity tracking
  confidence REAL DEFAULT 1.0,
  staleness_days INTEGER DEFAULT 0,
  source_hash TEXT,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_synced_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_citizens_tier ON citizens(tier);
CREATE INDEX IF NOT EXISTS idx_citizens_faction ON citizens(faction);
CREATE INDEX IF NOT EXISTS idx_citizens_neighborhood ON citizens(neighborhood);
CREATE INDEX IF NOT EXISTS idx_citizens_last_mention ON citizens(last_mention_cycle DESC);

-- ============================================================================
-- CITIZEN_EVENTS
-- ============================================================================
-- Key events per citizen for continuity threading

CREATE TABLE IF NOT EXISTS citizen_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pop_id TEXT NOT NULL,
  cycle INTEGER NOT NULL,
  event_type TEXT,
  event_description TEXT,
  significance TEXT DEFAULT 'medium',  -- low, medium, high
  domain TEXT,                          -- CIVIC, CRIME, CAREER, etc.

  created_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (pop_id) REFERENCES citizens(pop_id)
);

CREATE INDEX IF NOT EXISTS idx_citizen_events_pop ON citizen_events(pop_id);
CREATE INDEX IF NOT EXISTS idx_citizen_events_cycle ON citizen_events(cycle DESC);
CREATE INDEX IF NOT EXISTS idx_citizen_events_significance ON citizen_events(significance);

-- ============================================================================
-- RELATIONSHIPS
-- ============================================================================
-- Citizen-to-citizen relationships from Bond_Ledger

CREATE TABLE IF NOT EXISTS relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_pop_id TEXT NOT NULL,
  target_pop_id TEXT NOT NULL,
  relationship_type TEXT,               -- colleague, ally, rival, family, etc.
  tension TEXT DEFAULT 'low',           -- low, medium, high
  bond_strength REAL DEFAULT 0.5,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (source_pop_id) REFERENCES citizens(pop_id),
  FOREIGN KEY (target_pop_id) REFERENCES citizens(pop_id),
  UNIQUE(source_pop_id, target_pop_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_pop_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_pop_id);

-- ============================================================================
-- INITIATIVES
-- ============================================================================
-- Civic initiatives from Initiative_Tracker

CREATE TABLE IF NOT EXISTS initiatives (
  initiative_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,                            -- ORDINANCE, BUDGET, RESOLUTION, etc.
  status TEXT,                          -- PENDING, PASSED, FAILED, DELAYED, etc.
  outcome TEXT,

  sponsor_pop_id TEXT,
  vote_count TEXT,                      -- e.g., "5-2"
  swing_voters TEXT,                    -- JSON array of names
  affected_neighborhoods TEXT,          -- JSON array
  policy_domain TEXT,

  introduced_cycle INTEGER,
  resolved_cycle INTEGER,

  -- Ripple tracking
  ripple_decay REAL DEFAULT 1.0,
  ripple_active INTEGER DEFAULT 0,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (sponsor_pop_id) REFERENCES citizens(pop_id)
);

CREATE INDEX IF NOT EXISTS idx_initiatives_status ON initiatives(status);
CREATE INDEX IF NOT EXISTS idx_initiatives_cycle ON initiatives(resolved_cycle DESC);

-- ============================================================================
-- CYCLES
-- ============================================================================
-- Cycle-level state snapshots

CREATE TABLE IF NOT EXISTS cycles (
  cycle_id INTEGER PRIMARY KEY,

  -- City state
  season TEXT,
  weather_type TEXT,
  weather_impact REAL DEFAULT 1.0,
  sentiment REAL DEFAULT 0.0,
  economic_mood INTEGER DEFAULT 50,

  -- Event counts
  chaos_events INTEGER DEFAULT 0,
  civic_events INTEGER DEFAULT 0,
  total_incidents INTEGER DEFAULT 0,

  -- Risk flags (JSON array)
  risk_flags TEXT,

  -- Checksums for drift detection
  summary_checksum TEXT,
  context_checksum TEXT,

  -- Timestamps
  exported_at TEXT,
  synced_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- ARCS
-- ============================================================================
-- Story arcs from Event_Arc_Tracker

CREATE TABLE IF NOT EXISTS arcs (
  arc_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  status TEXT,                          -- ACTIVE, RESOLVED, DORMANT
  phase TEXT,                           -- INCITING, RISING, CLIMAX, FALLING, RESOLVED
  tension REAL DEFAULT 0.5,

  primary_neighborhood TEXT,
  key_citizens TEXT,                    -- JSON array of pop_ids

  started_cycle INTEGER,
  last_updated_cycle INTEGER,
  resolved_cycle INTEGER,

  story_hook TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_arcs_status ON arcs(status);
CREATE INDEX IF NOT EXISTS idx_arcs_domain ON arcs(domain);

-- ============================================================================
-- SYNC_STATE
-- ============================================================================
-- Track what's been synced to avoid duplicate processing

CREATE TABLE IF NOT EXISTS sync_state (
  source TEXT PRIMARY KEY,              -- 'manifest', 'Simulation_Ledger', etc.
  last_cycle_synced INTEGER,
  last_checksum TEXT,
  last_synced_at TEXT DEFAULT (datetime('now')),
  records_synced INTEGER DEFAULT 0
);

-- ============================================================================
-- MEDIA_OUTPUTS
-- ============================================================================
-- Track generated media for continuity and dedup

CREATE TABLE IF NOT EXISTS media_outputs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle INTEGER NOT NULL,
  media_type TEXT,                      -- tribune, echo, spotlight, council-watch
  file_path TEXT,

  -- Quality metrics
  continuity_score REAL,
  narrative_score REAL,
  risk_score REAL,

  -- Status
  status TEXT DEFAULT 'draft',          -- draft, reviewed, published

  created_at TEXT DEFAULT (datetime('now')),
  reviewed_at TEXT,
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_media_outputs_cycle ON media_outputs(cycle DESC);
CREATE INDEX IF NOT EXISTS idx_media_outputs_type ON media_outputs(media_type);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Key citizens view (Tier 1-2, recent mentions)
CREATE VIEW IF NOT EXISTS v_key_citizens AS
SELECT
  pop_id,
  name,
  tier,
  faction,
  role,
  neighborhood,
  media_appearances,
  last_mention_cycle,
  mention_streak
FROM citizens
WHERE tier <= 2
   OR media_appearances >= 5
   OR mention_streak >= 3
ORDER BY tier ASC, media_appearances DESC;

-- Active arcs view
CREATE VIEW IF NOT EXISTS v_active_arcs AS
SELECT *
FROM arcs
WHERE status = 'ACTIVE'
ORDER BY tension DESC;

-- Recent initiatives view
CREATE VIEW IF NOT EXISTS v_recent_initiatives AS
SELECT *
FROM initiatives
WHERE resolved_cycle IS NOT NULL
ORDER BY resolved_cycle DESC
LIMIT 20;

-- Continuity candidates (citizens with story threads)
CREATE VIEW IF NOT EXISTS v_continuity_candidates AS
SELECT
  c.pop_id,
  c.name,
  c.tier,
  c.mention_streak,
  COUNT(ce.id) as recent_events,
  MAX(ce.cycle) as last_event_cycle
FROM citizens c
LEFT JOIN citizen_events ce ON c.pop_id = ce.pop_id AND ce.cycle >= (SELECT MAX(cycle_id) - 5 FROM cycles)
WHERE c.mention_streak >= 2
   OR c.tier <= 2
GROUP BY c.pop_id
ORDER BY c.mention_streak DESC, recent_events DESC;
