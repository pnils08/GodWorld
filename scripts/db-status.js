#!/usr/bin/env node
/**
 * Quick database status check
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../godworld/godworld.db');
const db = new Database(DB_PATH);

console.log('GodWorld Database Status');
console.log('========================\n');

// Cycles
const cycles = db.prepare('SELECT * FROM cycles ORDER BY cycle_id DESC LIMIT 5').all();
console.log('Recent Cycles:', cycles.length);
for (const c of cycles) {
  console.log(`  - Cycle ${c.cycle_id}: sentiment=${c.sentiment}, chaos=${c.chaos_events}, civic=${c.civic_events}`);
}

// Citizens
const citizenCount = db.prepare('SELECT COUNT(*) as count FROM citizens').get();
console.log('\nCitizens:', citizenCount.count);

const keyCitizens = db.prepare('SELECT * FROM v_key_citizens LIMIT 10').all();
if (keyCitizens.length > 0) {
  console.log('Key Citizens:');
  for (const c of keyCitizens) {
    console.log(`  - ${c.name} (${c.pop_id}): tier=${c.tier}, faction=${c.faction}, mentions=${c.media_appearances}`);
  }
}

// Initiatives
const initCount = db.prepare('SELECT COUNT(*) as count FROM initiatives').get();
console.log('\nInitiatives:', initCount.count);

const recent = db.prepare('SELECT * FROM initiatives ORDER BY resolved_cycle DESC LIMIT 5').all();
for (const i of recent) {
  console.log(`  - ${i.name}: ${i.outcome} (${i.vote_count})`);
}

// Sync State
const syncState = db.prepare('SELECT * FROM sync_state').all();
console.log('\nSync State:');
for (const s of syncState) {
  console.log(`  - ${s.source}: cycle ${s.last_cycle_synced}, ${s.records_synced} records`);
}

// Citizen Events
const eventCount = db.prepare('SELECT COUNT(*) as count FROM citizen_events').get();
console.log('\nCitizen Events:', eventCount.count);

db.close();
