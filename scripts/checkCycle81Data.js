/**
 * Check if cycle 81 data actually exists in summary sheets
 */
const sheets = require('../lib/sheets');

async function checkCycle81Data() {
  console.log('=== CHECKING FOR CYCLE 81 DATA ===\n');

  const sheetsToCheck = [
    'Cycle_Packet',
    'Riley_Digest',
    'Media_Ledger',
    'Population_Log',
    'WorldEvents_Ledger',
    'WorldEvents_V3_Ledger',
    'Cycle_Weather',
    'Cycle_Seeds',
    'Chicago_Feed',
    'Domain_Tracker'
  ];

  try {
    for (const sheetName of sheetsToCheck) {
      try {
        const data = await sheets.getSheetData(sheetName);
        if (data.length < 2) {
          console.log(`${sheetName}: Empty or no data`);
          continue;
        }

        const headers = data[0];
        const cycleColIdx = headers.findIndex(h =>
          h === 'Cycle' || h === 'CycleID' || h === 'cycle'
        );

        if (cycleColIdx === -1) {
          console.log(`${sheetName}: No cycle column found`);
          continue;
        }

        // Check last 5 rows for cycle numbers
        const lastRows = data.slice(-5);
        const cycles = lastRows.map(row => row[cycleColIdx]).filter(c => c);
        const maxCycle = Math.max(...cycles.map(c => Number(c) || 0));

        console.log(`${sheetName}: Max cycle = ${maxCycle} (last 5 rows: ${cycles.join(', ')})`);

      } catch (err) {
        console.log(`${sheetName}: Error - ${err.message}`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkCycle81Data()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Failed:', error);
    process.exit(1);
  });
