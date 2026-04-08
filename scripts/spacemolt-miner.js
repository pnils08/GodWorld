#!/usr/bin/env node
/**
 * Mags' SpaceMolt Mining Bot — scripts/spacemolt-miner.js
 *
 * Automated mining loop: login → undock → travel to belt → mine → dock → sell.
 * Connects directly to the SpaceMolt MCP server — no Claude API needed.
 * PM2 handles scheduling (every 4-6 hours).
 *
 * Usage:
 *   node scripts/spacemolt-miner.js              # normal run
 *   node scripts/spacemolt-miner.js --dry-run     # log decisions, don't act
 */

const path = require('path');
const fs = require('fs');
const { Client } = require('@modelcontextprotocol/sdk/client');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { CallToolResultSchema } = require('@modelcontextprotocol/sdk/types.js');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MCP_URL = 'https://game.spacemolt.com/mcp';
const CREDS_PATH = path.join(process.env.HOME || '/root', '.config', 'spacemolt', 'credentials.json');
const LOG_DIR = path.join(__dirname, '..', 'logs', 'spacemolt');
const STATE_FILE = path.join(LOG_DIR, '.miner-state.json');
const MAX_MINE_ATTEMPTS = 20;  // don't loop forever
const TOOL_TIMEOUT = 30000;     // 30s per tool call
const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------
const log = {
  info: (...args) => console.log('[INFO]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[WARN]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[ERROR]', new Date().toISOString(), ...args)
};

// ---------------------------------------------------------------------------
// State tracking
// ---------------------------------------------------------------------------
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (_) {}
  return {
    lastRun: null,
    totalCreditsEarned: 0,
    totalOresMined: 0,
    totalRunsCompleted: 0,
    lastError: null
  };
}

function saveState(state) {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  state.lastRun = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// Daily log file
// ---------------------------------------------------------------------------
function logRun(result) {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  var today = new Date().toISOString().split('T')[0];
  var logFile = path.join(LOG_DIR, today + '.json');
  var entries = [];
  try {
    if (fs.existsSync(logFile)) {
      entries = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
  } catch (_) {}
  entries.push({ timestamp: new Date().toISOString(), ...result });
  fs.writeFileSync(logFile, JSON.stringify(entries, null, 2));
}

// ---------------------------------------------------------------------------
// MCP Client
// ---------------------------------------------------------------------------
var client = null;
var transport = null;

async function connect() {
  client = new Client({ name: 'spacemolt-miner', version: '1.0.0' });
  transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  await client.connect(transport);
  log.info('Connected to SpaceMolt MCP');
}

async function disconnect() {
  if (transport) {
    try { await transport.close(); } catch (_) {}
  }
  client = null;
  transport = null;
}

async function callTool(name, args) {
  if (!client) throw new Error('Not connected');
  var result = await client.request({
    method: 'tools/call',
    params: { name: name, arguments: args || {} }
  }, CallToolResultSchema);

  // Extract the text content
  var text = '';
  if (result.content) {
    result.content.forEach(function(item) {
      if (item.type === 'text') text += item.text;
    });
  }

  // Check for error in the result
  if (result.isError) {
    throw new Error('Tool error: ' + text);
  }

  try {
    return JSON.parse(text);
  } catch (_) {
    return { raw: text };
  }
}

// ---------------------------------------------------------------------------
// Mining loop
// ---------------------------------------------------------------------------
async function miningRun(creds) {
  var sessionId = null;
  var result = {
    status: 'unknown',
    oresMined: 0,
    creditsBefore: 0,
    creditsAfter: 0,
    creditsEarned: 0,
    itemsSold: [],
    errors: []
  };

  try {
    // 1. Login
    log.info('Logging in as ' + creds.username + '...');
    var loginResult = await callTool('login', {
      username: creds.username,
      password: creds.password
    });
    sessionId = loginResult.session_id;
    if (!sessionId) {
      throw new Error('No session_id from login: ' + JSON.stringify(loginResult));
    }
    log.info('Logged in. Session: ' + sessionId.substring(0, 12) + '...');

    // 2. Check status
    var status = await callTool('get_status', { session_id: sessionId });
    var player = status.player || {};
    var ship = status.ship || {};
    result.creditsBefore = player.credits || 0;
    log.info('Credits: ' + result.creditsBefore +
      ', Cargo: ' + (ship.cargo_used || 0) + '/' + (ship.cargo_capacity || 100) +
      ', Fuel: ' + (ship.fuel || 0) + '/' + (ship.max_fuel || 130) +
      ', Location: ' + (player.current_poi || 'unknown') +
      ', Docked: ' + (player.docked_at_base ? 'yes' : 'no'));

    if (DRY_RUN) {
      log.info('[DRY RUN] Would proceed with mining loop');
      result.status = 'dry_run';
      return result;
    }

    // 3. If we have cargo, sell first (from a previous interrupted run)
    if (ship.cargo && ship.cargo.length > 0 && player.docked_at_base) {
      log.info('Have cargo from previous run — selling first');
      await sellAllCargo(sessionId, ship.cargo, result);
    }

    // 4. Undock if docked
    if (player.docked_at_base) {
      log.info('Undocking...');
      await callTool('undock', { session_id: sessionId });
    }

    // 5. Travel to asteroid belt if not there
    if (player.current_poi !== creds.asteroid_belt_poi) {
      log.info('Traveling to ' + creds.asteroid_belt_poi + '...');
      try {
        await callTool('travel', {
          session_id: sessionId,
          target_poi: creds.asteroid_belt_poi
        });
        log.info('Arrived at belt');
      } catch (err) {
        // May timeout on long travel — retry once
        log.warn('Travel timed out, retrying...');
        await sleep(3000);
        await callTool('travel', {
          session_id: sessionId,
          target_poi: creds.asteroid_belt_poi
        });
        log.info('Arrived at belt (retry)');
      }
    }

    // 6. Mine until cargo full or belt depleted
    log.info('Starting mining...');
    var mineAttempts = 0;
    var beltDepleted = false;

    while (mineAttempts < MAX_MINE_ATTEMPTS) {
      mineAttempts++;
      try {
        var mineResult = await callTool('mine', { session_id: sessionId });
        if (mineResult.mined) {
          result.oresMined++;
          log.info('Mined: ' + (mineResult.mined.name || mineResult.mined.item_id || 'ore') +
            ' x' + (mineResult.mined.quantity || 1));
        }
        if (mineResult.cargo_full) {
          log.info('Cargo full!');
          break;
        }
      } catch (err) {
        var errMsg = err.message || '';
        if (errMsg.includes('depleted')) {
          log.info('Belt depleted');
          beltDepleted = true;
          break;
        }
        if (errMsg.includes('cargo_full') || errMsg.includes('full')) {
          log.info('Cargo full (from error)');
          break;
        }
        // Other error — log and stop mining
        log.warn('Mine error: ' + errMsg);
        result.errors.push('mine: ' + errMsg);
        break;
      }
      // Small delay between mines
      await sleep(1000);
    }

    log.info('Mining done: ' + result.oresMined + ' ores in ' + mineAttempts + ' attempts');

    // 7. Travel back to station
    if (result.oresMined > 0 || !beltDepleted) {
      log.info('Heading back to station...');
      try {
        await callTool('travel', {
          session_id: sessionId,
          target_poi: creds.home_station_poi
        });
      } catch (err) {
        await sleep(3000);
        await callTool('travel', {
          session_id: sessionId,
          target_poi: creds.home_station_poi
        });
      }
      log.info('Arrived at station');

      // 8. Dock
      log.info('Docking...');
      await callTool('dock', { session_id: sessionId });

      // 9. Check cargo and sell
      var shipNow = await callTool('get_ship', { session_id: sessionId });
      var cargo = (shipNow.ship && shipNow.ship.cargo) || [];

      if (cargo.length > 0) {
        await sellAllCargo(sessionId, cargo, result);
      }

      // 10. Check final credits
      var finalStatus = await callTool('get_status', { session_id: sessionId });
      result.creditsAfter = (finalStatus.player && finalStatus.player.credits) || 0;
      result.creditsEarned = result.creditsAfter - result.creditsBefore;
    } else {
      // Belt was depleted and nothing mined — just dock
      log.info('Nothing mined, heading home to dock...');
      try {
        await callTool('travel', {
          session_id: sessionId,
          target_poi: creds.home_station_poi
        });
      } catch (err) {
        await sleep(3000);
        try {
          await callTool('travel', {
            session_id: sessionId,
            target_poi: creds.home_station_poi
          });
        } catch (_) {}
      }
      try {
        await callTool('dock', { session_id: sessionId });
      } catch (_) {}
      result.creditsAfter = result.creditsBefore;
      result.creditsEarned = 0;
    }

    result.status = 'success';
    log.info('Run complete: earned ' + result.creditsEarned + ' credits (' +
      result.creditsBefore + ' → ' + result.creditsAfter + ')');

  } catch (err) {
    result.status = 'error';
    result.errors.push(err.message || String(err));
    log.error('Mining run failed: ' + (err.message || err));

    // Try to dock safely on error
    if (sessionId) {
      try {
        await callTool('travel', {
          session_id: sessionId,
          target_poi: creds.home_station_poi
        });
        await callTool('dock', { session_id: sessionId });
        log.info('Safely docked after error');
      } catch (_) {
        // Best effort
      }
    }
  }

  return result;
}

async function sellAllCargo(sessionId, cargo, result) {
  for (var item of cargo) {
    var itemId = item.item_id || item.id;
    var qty = item.quantity || 1;
    try {
      log.info('Selling ' + qty + 'x ' + (item.name || itemId) + '...');
      var sellResult = await callTool('sell', {
        session_id: sessionId,
        item_id: itemId,
        quantity: qty
      });
      result.itemsSold.push({
        item: item.name || itemId,
        quantity: qty,
        credits: sellResult.total_price || sellResult.credits_earned || 0
      });
      log.info('Sold for ' + (sellResult.total_price || sellResult.credits_earned || '?') + ' credits');
    } catch (err) {
      log.warn('Failed to sell ' + (item.name || itemId) + ': ' + err.message);
      result.errors.push('sell ' + itemId + ': ' + err.message);
    }
    await sleep(500);
  }
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// ---------------------------------------------------------------------------
// Captain's log entry (saved to file for session Mags to read)
// ---------------------------------------------------------------------------
function writeCaptainsLog(result, state) {
  var logFile = path.join(LOG_DIR, 'captains-log.md');
  var entry = '\n### ' + new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC\n\n';

  if (result.status === 'success') {
    entry += 'Mining run #' + state.totalRunsCompleted + '. ';
    entry += 'Mined ' + result.oresMined + ' ores, earned ' + result.creditsEarned + ' credits. ';
    entry += 'Balance: ' + result.creditsAfter + ' credits.\n';
    if (result.itemsSold.length > 0) {
      entry += 'Sold: ' + result.itemsSold.map(function(s) {
        return s.quantity + 'x ' + s.item + ' (' + s.credits + 'cr)';
      }).join(', ') + '\n';
    }
  } else if (result.status === 'dry_run') {
    entry += 'Dry run — would have mined at ' + new Date().toLocaleTimeString() + '.\n';
  } else {
    entry += 'Run failed: ' + (result.errors.join('; ') || 'unknown error') + '\n';
  }

  // Append to captain's log
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(logFile, entry);
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  log.info('=== SpaceMolt Miner Start' + (DRY_RUN ? ' [DRY RUN]' : '') + ' ===');

  // Load credentials
  var creds;
  try {
    creds = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
  } catch (err) {
    log.error('Cannot load credentials: ' + err.message);
    process.exit(1);
  }

  var state = loadState();

  try {
    // Connect to MCP
    await connect();

    // Run the mining loop
    var result = await miningRun(creds);

    // Update state
    if (result.status === 'success') {
      state.totalCreditsEarned += result.creditsEarned;
      state.totalOresMined += result.oresMined;
      state.totalRunsCompleted++;
      state.lastError = null;
    } else if (result.status === 'error') {
      state.lastError = result.errors[0] || 'unknown';
    }

    // Log
    logRun(result);
    writeCaptainsLog(result, state);
    saveState(state);

    log.info('=== Miner Complete: ' + result.status +
      ' (lifetime: ' + state.totalCreditsEarned + ' credits, ' +
      state.totalRunsCompleted + ' runs) ===');

  } catch (err) {
    log.error('Fatal error: ' + (err.message || err));
    state.lastError = err.message || String(err);
    saveState(state);
    process.exit(1);
  } finally {
    await disconnect();
  }
}

main();
