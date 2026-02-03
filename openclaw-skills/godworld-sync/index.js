/**
 * ============================================================================
 * godworld-sync skill
 * ============================================================================
 * Syncs GodWorld cycle exports to local SQLite database.
 *
 * Usage:
 *   - Triggered by manifest.json changes or manually
 *   - Reads context packs from exports/
 *   - Updates local SQLite for fast queries
 *
 * @version 1.0
 * ============================================================================
 */

const fs = require('fs').promises;
const path = require('path');

// Use better-sqlite3 for sync operations (faster for OpenClaw)
// Falls back to sqlite3 if not available
let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  // Fallback stub - real implementation would use async sqlite3
  Database = null;
}

/**
 * Main execute function called by OpenClaw
 */
async function execute(context) {
  const { config, log } = context;

  const exportsPath = config?.godworld?.exportsPath || './exports';
  const dbPath = config?.godworld?.dbPath || './godworld/godworld.db';

  // 1. Read manifest
  const manifestPath = path.join(exportsPath, 'manifest.json');
  let manifest;

  try {
    const manifestRaw = await fs.readFile(manifestPath, 'utf8');
    manifest = JSON.parse(manifestRaw);
  } catch (err) {
    log?.warn?.(`Manifest not found at ${manifestPath}, skipping sync`);
    return { cyclesSynced: 0, recordsUpdated: 0, error: 'manifest_not_found' };
  }

  // 2. Check if we need to sync
  const latestCycle = manifest.latestCycle;
  const cycleInfo = manifest.cycles?.[String(latestCycle)];

  if (!cycleInfo) {
    log?.warn?.(`No cycle info for cycle ${latestCycle}`);
    return { cyclesSynced: 0, recordsUpdated: 0, error: 'no_cycle_info' };
  }

  // 3. Open database
  if (!Database) {
    log?.error?.('better-sqlite3 not installed. Run: npm install better-sqlite3');
    return { cyclesSynced: 0, recordsUpdated: 0, error: 'no_sqlite' };
  }

  const db = new Database(dbPath);

  // 4. Check sync state
  const syncState = db.prepare(
    'SELECT last_checksum FROM sync_state WHERE source = ?'
  ).get('manifest');

  if (syncState?.last_checksum === cycleInfo.context.checksum) {
    log?.info?.(`Cycle ${latestCycle} already synced, skipping`);
    db.close();
    return { cyclesSynced: 0, recordsUpdated: 0, status: 'already_synced' };
  }

  // 5. Load context pack
  const contextPath = path.join(exportsPath, cycleInfo.context.file);
  let contextPack;

  try {
    const contextRaw = await fs.readFile(contextPath, 'utf8');
    contextPack = JSON.parse(contextRaw);
  } catch (err) {
    log?.error?.(`Failed to read context pack: ${err.message}`);
    db.close();
    return { cyclesSynced: 0, recordsUpdated: 0, error: 'context_read_failed' };
  }

  // 6. Begin transaction
  const syncCycle = db.transaction(() => {
    let recordsUpdated = 0;

    // 6a. Insert/update cycle record
    const upsertCycle = db.prepare(`
      INSERT INTO cycles (
        cycle_id, season, weather_type, weather_impact, sentiment,
        economic_mood, chaos_events, civic_events, total_incidents,
        risk_flags, summary_checksum, context_checksum, exported_at, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(cycle_id) DO UPDATE SET
        season = excluded.season,
        weather_type = excluded.weather_type,
        weather_impact = excluded.weather_impact,
        sentiment = excluded.sentiment,
        economic_mood = excluded.economic_mood,
        chaos_events = excluded.chaos_events,
        civic_events = excluded.civic_events,
        total_incidents = excluded.total_incidents,
        risk_flags = excluded.risk_flags,
        summary_checksum = excluded.summary_checksum,
        context_checksum = excluded.context_checksum,
        synced_at = datetime('now')
    `);

    upsertCycle.run(
      contextPack.cycleId,
      contextPack.city?.season || null,
      contextPack.city?.weather?.type || null,
      contextPack.city?.weather?.impact || 1.0,
      contextPack.city?.sentiment || 0,
      contextPack.city?.economicMood || 50,
      contextPack.city?.chaosEvents || 0,
      contextPack.city?.civicEvents || 0,
      contextPack.safety?.crimeCityWide?.totalIncidents || 0,
      JSON.stringify(contextPack.riskFlags || []),
      cycleInfo.summary.checksum,
      cycleInfo.context.checksum,
      cycleInfo.exportedAt
    );
    recordsUpdated++;

    // 6b. Update active citizens
    const updateCitizenMention = db.prepare(`
      UPDATE citizens
      SET last_mention_cycle = ?,
          mention_streak = CASE
            WHEN last_mention_cycle = ? - 1 THEN mention_streak + 1
            ELSE 1
          END,
          media_appearances = media_appearances + 1,
          updated_at = datetime('now')
      WHERE pop_id = ?
    `);

    const keyCitizens = contextPack.citizens?.keyCitizens || [];
    for (const popId of keyCitizens) {
      const result = updateCitizenMention.run(
        contextPack.cycleId,
        contextPack.cycleId,
        popId
      );
      if (result.changes > 0) recordsUpdated++;
    }

    // 6c. Insert civic outcomes
    const upsertInitiative = db.prepare(`
      INSERT INTO initiatives (
        initiative_id, name, outcome, vote_count, resolved_cycle, updated_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(initiative_id) DO UPDATE SET
        outcome = excluded.outcome,
        vote_count = excluded.vote_count,
        resolved_cycle = excluded.resolved_cycle,
        updated_at = datetime('now')
    `);

    const votes = contextPack.civic?.votes || [];
    for (const vote of votes) {
      if (!vote.name) continue;
      const initId = 'INI-' + vote.name.replace(/\s+/g, '-').substring(0, 20);
      upsertInitiative.run(
        initId,
        vote.name,
        vote.outcome || null,
        vote.voteCount || null,
        contextPack.cycleId
      );
      recordsUpdated++;
    }

    // 6d. Update sync state
    const upsertSyncState = db.prepare(`
      INSERT INTO sync_state (source, last_cycle_synced, last_checksum, last_synced_at, records_synced)
      VALUES (?, ?, ?, datetime('now'), ?)
      ON CONFLICT(source) DO UPDATE SET
        last_cycle_synced = excluded.last_cycle_synced,
        last_checksum = excluded.last_checksum,
        last_synced_at = datetime('now'),
        records_synced = records_synced + excluded.records_synced
    `);

    upsertSyncState.run(
      'manifest',
      contextPack.cycleId,
      cycleInfo.context.checksum,
      recordsUpdated
    );

    return recordsUpdated;
  });

  // 7. Execute transaction
  let recordsUpdated = 0;
  try {
    recordsUpdated = syncCycle();
    log?.info?.(`Synced cycle ${latestCycle}: ${recordsUpdated} records updated`);
  } catch (err) {
    log?.error?.(`Sync failed: ${err.message}`);
    db.close();
    return { cyclesSynced: 0, recordsUpdated: 0, error: err.message };
  }

  db.close();

  return {
    cyclesSynced: 1,
    recordsUpdated,
    cycleId: latestCycle,
    riskFlags: contextPack.riskFlags || []
  };
}

/**
 * Initialize database with schema if not exists
 */
async function initDatabase(dbPath, schemaPath) {
  if (!Database) {
    throw new Error('better-sqlite3 not installed');
  }

  const db = new Database(dbPath);
  const schema = await fs.readFile(schemaPath, 'utf8');

  // Execute schema (split by semicolons, skip empty)
  const statements = schema.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    try {
      db.exec(stmt);
    } catch (err) {
      // Ignore "already exists" errors
      if (!err.message.includes('already exists')) {
        throw err;
      }
    }
  }

  db.close();
  return { initialized: true };
}

module.exports = {
  execute,
  initDatabase
};
