#!/usr/bin/env node
/**
 * ctxMap.js — Live ctx.summary field dependency scanner
 *
 * Scans all phase*\/*.js files for ctx.summary field reads and writes.
 * Handles the S = ctx.summary alias pattern correctly.
 *
 * Usage:
 *   node scripts/ctxMap.js              # Full map
 *   node scripts/ctxMap.js careerSignals # Single field detail
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const fieldArg = process.argv[2] || null;

// Find all phase JS files
const phaseFiles = execSync(
  'find phase*/ utilities/ -name "*.js" -type f 2>/dev/null',
  { cwd: ROOT, encoding: 'utf8' }
).trim().split('\n').filter(Boolean);

// Track writes and reads per field per file
const writes = {};   // field -> [{file, line, code}]
const reads = {};    // field -> [{file, line, code}]

// camelCase check — filters out CONSTANTS like ALLIANCE, BACHELOR
function isCamelCase(name) {
  return /^[a-z][a-zA-Z0-9_]*$/.test(name) && name.length >= 2;
}

for (const relFile of phaseFiles) {
  const absPath = path.join(ROOT, relFile);
  let lines;
  try { lines = fs.readFileSync(absPath, 'utf8').split('\n'); }
  catch { continue; }

  // Detect if this file aliases S = ctx.summary
  let hasAlias = false;
  for (const l of lines) {
    if (/var\s+S\s*=\s*ctx\.summary/.test(l)) { hasAlias = true; break; }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    // Skip Logger lines
    if (trimmed.includes('Logger.log')) continue;
    // Skip JSDoc @param lines
    if (trimmed.startsWith('@')) continue;

    const lineNum = i + 1;

    // --- Direct ctx.summary access (always valid) ---
    // Writes: ctx.summary.field =
    const ctxWriteMatches = [...line.matchAll(/ctx\.summary\.([a-zA-Z_]\w*)\s*=/g)];
    for (const m of ctxWriteMatches) {
      const field = m[1];
      if (!isCamelCase(field)) continue;
      if (!writes[field]) writes[field] = [];
      writes[field].push({ file: relFile, line: lineNum, code: trimmed.substring(0, 100) });
    }

    // Reads: capture ALL ctx.summary.field, then subtract writes
    const ctxWriteFields = new Set(ctxWriteMatches.map(m => m[1]));
    const allCtxMatches = [...line.matchAll(/ctx\.summary\.([a-zA-Z_]\w*)/g)];
    for (const m of allCtxMatches) {
      const field = m[1];
      if (!isCamelCase(field)) continue;
      if (ctxWriteFields.has(field)) continue;
      const afterMatch = line.substring(m.index + m[0].length);
      if (/^\s*=[^=]/.test(afterMatch) || /^\s*\+=/.test(afterMatch)) continue;
      if (!reads[field]) reads[field] = [];
      if (!reads[field].some(r => r.file === relFile && r.line === lineNum)) {
        reads[field].push({ file: relFile, line: lineNum, code: trimmed.substring(0, 100) });
      }
    }

    // --- S alias access (only in files that have `var S = ctx.summary`) ---
    if (!hasAlias) continue;

    // Writes: S.field = (but NOT S.field.push, S.field.length, etc. followed by property access then =)
    // Match S.field = but not S.field.subprop =
    const sWriteMatches = [...line.matchAll(/(?<![a-zA-Z_.])S\.([a-zA-Z_]\w*)\s*=[^=]/g)];
    for (const m of sWriteMatches) {
      const field = m[1];
      if (!isCamelCase(field)) continue;
      if (!writes[field]) writes[field] = [];
      // Dedupe same file+field
      if (!writes[field].some(w => w.file === relFile && w.line === lineNum)) {
        writes[field].push({ file: relFile, line: lineNum, code: trimmed.substring(0, 100) });
      }
    }

    // Also catch S.field.push( and S.field +=
    const sPushMatches = [...line.matchAll(/(?<![a-zA-Z_.])S\.([a-zA-Z_]\w*)\.push\(/g)];
    for (const m of sPushMatches) {
      const field = m[1];
      if (!isCamelCase(field)) continue;
      if (!writes[field]) writes[field] = [];
      if (!writes[field].some(w => w.file === relFile && w.line === lineNum)) {
        writes[field].push({ file: relFile, line: lineNum, code: trimmed.substring(0, 100) });
      }
    }

    const sPlusMatches = [...line.matchAll(/(?<![a-zA-Z_.])S\.([a-zA-Z_]\w*)\s*\+=/g)];
    for (const m of sPlusMatches) {
      const field = m[1];
      if (!isCamelCase(field)) continue;
      if (!writes[field]) writes[field] = [];
      if (!writes[field].some(w => w.file === relFile && w.line === lineNum)) {
        writes[field].push({ file: relFile, line: lineNum, code: trimmed.substring(0, 100) });
      }
    }

    // Reads: capture ALL S.field occurrences, then subtract writes
    const writeFieldsOnLine = new Set([
      ...sWriteMatches.map(m => m[1]),
      ...sPushMatches.map(m => m[1]),
      ...sPlusMatches.map(m => m[1]),
    ]);
    const allSMatches = [...line.matchAll(/(?<![a-zA-Z_.])S\.([a-zA-Z_]\w*)/g)];
    for (const m of allSMatches) {
      const field = m[1];
      if (!isCamelCase(field)) continue;
      if (writeFieldsOnLine.has(field)) continue;
      // Check it's not the LHS of an assignment (S.field = ...)
      const afterMatch = line.substring(m.index + m[0].length);
      if (/^\s*=[^=]/.test(afterMatch) || /^\s*\+=/.test(afterMatch)) continue;
      if (!reads[field]) reads[field] = [];
      if (!reads[field].some(r => r.file === relFile && r.line === lineNum)) {
        reads[field].push({ file: relFile, line: lineNum, code: trimmed.substring(0, 100) });
      }
    }
  }
}

// Classify fields
const allFields = [...new Set([...Object.keys(writes), ...Object.keys(reads)])].sort();

const connected = [];
const orphaned = [];
const phantom = [];

for (const field of allFields) {
  const w = writes[field] || [];
  const r = reads[field] || [];

  const writerFiles = new Set(w.map(x => x.file));
  const readerFiles = new Set(r.map(x => x.file));
  // External readers = files that read but don't write
  const externalReaders = [...readerFiles].filter(f => !writerFiles.has(f));

  if (w.length > 0 && externalReaders.length > 0) {
    connected.push({ field, writers: w, readers: r, externalReaders });
  } else if (w.length > 0 && externalReaders.length === 0) {
    orphaned.push({ field, writers: w });
  } else if (w.length === 0 && r.length > 0) {
    phantom.push({ field, readers: r });
  }
}

// --- Output ---

function shortFile(f) {
  return f.split('/').pop().replace('.js', '');
}

function phase(f) {
  const m = f.match(/phase(\d+)/);
  return m ? `P${m[1]}` : 'U';
}

if (fieldArg) {
  // Single field detail
  const w = writes[fieldArg] || [];
  const r = reads[fieldArg] || [];
  console.log(`FIELD: ${fieldArg}`);
  console.log();
  if (w.length === 0) {
    console.log('  Written by: NONE (phantom read)');
  } else {
    console.log('  Written by:');
    for (const e of w) {
      console.log(`    ${e.file}:${e.line}`);
      console.log(`      ${e.code}`);
    }
  }
  console.log();
  const extReaders = r.filter(x => !w.some(ww => ww.file === x.file));
  if (extReaders.length === 0) {
    console.log('  Read by: NONE (orphaned write)');
  } else {
    console.log(`  Read by (${extReaders.length} external references):`);
    const seen = new Set();
    for (const e of extReaders) {
      const key = `${e.file}:${e.line}`;
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(`    ${e.file}:${e.line}`);
      console.log(`      ${e.code}`);
    }
  }
  console.log();
  const status = w.length > 0 && extReaders.length > 0 ? 'CONNECTED' :
                 w.length > 0 ? 'ORPHANED WRITE' : 'PHANTOM READ';
  console.log(`  Status: ${status}`);
  process.exit(0);
}

// Full map
console.log(`CTX.SUMMARY DEPENDENCY MAP — ${new Date().toISOString().split('T')[0]}`);
console.log('='.repeat(90));
console.log();

console.log(`CONNECTED (${connected.length} fields):`);
console.log(`${'FIELD'.padEnd(32)} ${'WRITER'.padEnd(35)} ${'READERS'.padEnd(15)} STATUS`);
console.log('-'.repeat(90));
for (const { field, writers: w, externalReaders } of connected) {
  const writerShort = `${shortFile(w[0].file)} (${phase(w[0].file)})`;
  const readerCount = externalReaders.length;
  const readerStr = readerCount <= 2
    ? externalReaders.map(shortFile).join(', ')
    : `[${readerCount} files]`;
  console.log(`${field.padEnd(32)} ${writerShort.padEnd(35)} ${readerStr.padEnd(15)} CONNECTED`);
}

console.log();
console.log(`ORPHANED WRITES (${orphaned.length} fields — written, no external reader):`);
console.log('-'.repeat(90));
for (const { field, writers: w } of orphaned) {
  console.log(`  ${field.padEnd(32)} ${shortFile(w[0].file)} (${phase(w[0].file)})`);
}

if (phantom.length > 0) {
  console.log();
  console.log(`PHANTOM READS (${phantom.length} fields — read but never written):`);
  console.log('-'.repeat(90));
  for (const { field, readers: r } of phantom) {
    console.log(`  ${field.padEnd(32)} ${shortFile(r[0].file)} (${phase(r[0].file)})`);
  }
}

console.log();
console.log('='.repeat(90));
console.log(`Connected: ${connected.length} | Orphaned: ${orphaned.length} | Phantom: ${phantom.length}`);
console.log(`Files scanned: ${phaseFiles.length}`);
