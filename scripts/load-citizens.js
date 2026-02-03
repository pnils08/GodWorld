#!/usr/bin/env node
/**
 * Load citizens from snapshot into database
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'godworld/godworld.db');
const SNAPSHOT_PATH = path.join(ROOT, 'exports/citizens-snapshot.json');

console.log('Loading citizens from snapshot...');
console.log('Database:', DB_PATH);
console.log('Snapshot:', SNAPSHOT_PATH);
console.log('');

if (!fs.existsSync(SNAPSHOT_PATH)) {
  console.error('ERROR: Snapshot not found');
  process.exit(1);
}

const db = new Database(DB_PATH);
const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
const citizens = snapshot.citizens || [];

const stmt = db.prepare(`
  INSERT OR REPLACE INTO citizens (
    pop_id, name, age, tier, faction, role, occupation, neighborhood, personality,
    updated_at, last_synced_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

let count = 0;
for (const c of citizens) {
  stmt.run(
    c.popId,
    c.name,
    c.age || null,
    c.tier || 4,
    c.faction || null,
    c.role || null,
    c.occupation || null,
    c.neighborhood || null,
    c.personality || null
  );
  count++;
  console.log(`  + ${c.name} (${c.popId})`);
}

db.close();
console.log('');
console.log(`Loaded ${count} citizens.`);
