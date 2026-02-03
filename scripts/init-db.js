#!/usr/bin/env node
/**
 * Initialize SQLite database from schema
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../godworld/godworld.db');
const SCHEMA_PATH = path.join(__dirname, '../openclaw-skills/schemas/godworld.sql');

console.log('Initializing database at:', DB_PATH);

// Read schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

// Create/open database
const db = new Database(DB_PATH);

// Execute schema (split by semicolons for multiple statements)
db.exec(schema);

// Verify tables created
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('\nTables created:');
tables.forEach(t => console.log('  -', t.name));

// Verify views created
const views = db.prepare("SELECT name FROM sqlite_master WHERE type='view' ORDER BY name").all();
console.log('\nViews created:');
views.forEach(v => console.log('  -', v.name));

db.close();
console.log('\nDatabase initialized successfully.');
