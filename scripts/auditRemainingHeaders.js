/**
 * ============================================================================
 * REMAINING SHEET HEADER AUDIT (Session 44)
 * ============================================================================
 *
 * Checks sheets not covered by the Phase 10 or Phase 5 audits.
 * Schemas sourced from actual writer code + ensure* functions.
 *
 * Usage:
 *   node scripts/auditRemainingHeaders.js
 *
 * ============================================================================
 */

const sheets = require('../lib/sheets');

// ════════════════════════════════════════════════════════════════════════════
// SCHEMAS — from actual writer code (appendRow arrays + ensure* headers)
// ════════════════════════════════════════════════════════════════════════════

const SCHEMAS = {
  'Riley_Digest': {
    file: 'godWorldEngine2.js (writeDigest_)',
    // From code comments at lines 1110-1193
    writerCols: [
      'Timestamp', 'Cycle', 'IntakeProcessed', 'CitizensAged',
      'EventsGenerated', 'Issues', 'CycleWeight', 'CycleWeightReason',
      'CivicLoad', 'MigrationDrift', 'PatternFlag', 'ShockFlag',
      'StorySeedCount', 'EveningMedia', 'FamousPeople', 'EveningFood',
      'CityEvents', 'NightLife', 'Sports', 'StreamingTrend',
      'WorldEvents', 'Weather', 'CityTraffic', 'RetailLoad',
      'TourismLoad', 'NightlifeLoad', 'PublicSpaceLoad', 'CitySentiment'
    ]
  },

  'Engine_Errors': {
    file: 'godWorldEngine2.js (error handler)',
    writerCols: ['Timestamp', 'Cycle', 'Phase', 'Error', 'Stack']
  },

  'Chicago_Citizens': {
    file: 'generateChicagoCitizensv1.js',
    writerCols: [
      'CitizenId', 'Name', 'Age', 'Gender', 'Neighborhood',
      'Occupation', 'Tier', 'CreatedCycle', 'LastActive', 'Status'
    ]
  },

  'Election_Log': {
    file: 'runCivicElectionsv1.js',
    writerCols: [
      'Timestamp', 'Cycle', 'GodWorldYear', 'OfficeId', 'Title', 'District',
      'Incumbent', 'Challenger', 'Winner', 'Margin', 'MarginType',
      'IncumbentAdvantage', 'EconFactor', 'Narrative'
    ]
  },

  'Health_Cause_Queue': {
    file: 'healthCauseIntake.js',
    writerCols: [
      'POPID', 'Name', 'Status', 'StatusStartCycle', 'CyclesSick',
      'Neighborhood', 'Tier', 'Age', 'AssignedCause', 'MediaCycle', 'Processed'
    ]
  },

  'Relationship_Bond_Ledger': {
    file: 'bondEngine.js (saveV3BondsToLedger_)',
    writerCols: [
      'Timestamp', 'Cycle', 'BondId', 'CitizenA', 'CitizenB',
      'BondType', 'Intensity', 'Status', 'Origin', 'DomainTag',
      'Neighborhood', 'CycleCreated', 'LastUpdate', 'Notes',
      'Holiday', 'HolidayPriority', 'FirstFriday', 'CreationDay', 'SportsSeason'
    ]
  },

  'Crime_Metrics': {
    file: 'ensureCrimeMetrics.js (CRIME_METRICS_HEADERS)',
    // From CRIME_METRICS_HEADERS constant
    writerCols: [
      'Neighborhood', 'PropertyCrimeIndex', 'ViolentCrimeIndex',
      'ResponseTimeAvg', 'ClearanceRate', 'IncidentCount', 'LastUpdated'
    ]
  },

  'Transit_Metrics': {
    file: 'ensureTransitMetrics.js (TRANSIT_METRICS_HEADERS)',
    // From TRANSIT_METRICS_HEADERS constant
    writerCols: [
      'Timestamp', 'Cycle', 'Station', 'RidershipVolume',
      'OnTimePerformance', 'TrafficIndex', 'Corridor', 'Notes'
    ]
  }
};


// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   Remaining Sheet Header Audit (corrected schemas)                ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  console.log('Connecting to Google Sheets...');
  const conn = await sheets.testConnection();
  console.log(`Connected: ${conn.title}\n`);

  const results = [];

  for (const [sheetName, schema] of Object.entries(SCHEMAS)) {
    const expected = schema.writerCols;

    let data;
    try {
      data = await sheets.getSheetData(sheetName);
    } catch (e) {
      results.push({ sheet: sheetName, file: schema.file, status: 'NOT_FOUND', issues: ['Sheet does not exist'] });
      continue;
    }

    if (!data || data.length === 0) {
      results.push({ sheet: sheetName, file: schema.file, status: 'EMPTY', issues: ['Sheet is empty'] });
      continue;
    }

    const actual = data[0];
    const issues = [];

    for (let i = 0; i < expected.length; i++) {
      const exp = expected[i];
      const act = actual[i] || '(missing)';
      if (exp !== act) {
        issues.push(`Col ${i}: "${act}" should be "${exp}"`);
      }
    }

    if (actual.length < expected.length) {
      issues.push(`Sheet has ${actual.length} cols, writer outputs ${expected.length}`);
    }

    const extras = actual.length - expected.length;
    const extraInfo = extras > 0
      ? `+${extras} extra: ${actual.slice(expected.length).join(', ')}`
      : '';

    results.push({
      sheet: sheetName,
      file: schema.file,
      writerCols: expected.length,
      sheetCols: actual.length,
      rows: data.length - 1,
      status: issues.length === 0 ? 'OK' : 'MISALIGNED',
      issues,
      extraInfo
    });
  }

  // REPORT
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('RESULTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let okCount = 0, badCount = 0, notFound = 0;

  for (const r of results) {
    const icon = r.status === 'OK' ? '✓' : r.status === 'NOT_FOUND' ? '?' : '✗';
    console.log(`${icon} ${r.sheet} (${r.file})`);
    if (r.writerCols !== undefined) {
      console.log(`  Writer: ${r.writerCols} cols | Sheet: ${r.sheetCols} cols | Rows: ${r.rows}`);
    }
    if (r.extraInfo) console.log(`  ${r.extraInfo}`);
    if (r.issues.length > 0) {
      if (r.status === 'NOT_FOUND') notFound++;
      else badCount++;
      for (const issue of r.issues) console.log(`  ⚠  ${issue}`);
    } else {
      okCount++;
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`SUMMARY: ${okCount} aligned, ${badCount} misaligned, ${notFound} not found, ${results.length} total`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
