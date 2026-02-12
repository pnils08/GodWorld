/**
 * Quick check - what cycle are we actually on?
 */
const sheets = require('../lib/sheets');

async function checkCycle() {
  console.log('=== CHECKING CURRENT CYCLE ===\n');

  try {
    // Check World_Config
    console.log('1. Checking World_Config sheet...');
    const configData = await sheets.getSheetAsObjects('World_Config');
    const cycleConfig = configData.find(row => row.Key === 'cycleCount');
    if (cycleConfig) {
      console.log(`   cycleCount = ${cycleConfig.Value}`);
    } else {
      console.log('   cycleCount not found');
    }

    console.log('\n2. Checking last cycle in Cycle_Weather...');
    const weatherData = await sheets.getSheetData('Cycle_Weather');
    if (weatherData.length > 1) {
      const lastRow = weatherData[weatherData.length - 1];
      const headers = weatherData[0];
      const cycleIdx = headers.indexOf('Cycle');
      if (cycleIdx >= 0) {
        console.log(`   Last cycle = ${lastRow[cycleIdx]}`);
      }
    }

    console.log('\n3. Checking last cycle in WorldEvents_Ledger...');
    const eventsData = await sheets.getSheetData('WorldEvents_Ledger');
    if (eventsData.length > 1) {
      const lastRow = eventsData[eventsData.length - 1];
      const headers = eventsData[0];
      const cycleIdx = headers.indexOf('Cycle');
      if (cycleIdx >= 0) {
        console.log(`   Last cycle = ${lastRow[cycleIdx]}`);
      }
    }

    console.log('\n4. Checking last cycle in Cycle_Seeds...');
    const seedsData = await sheets.getSheetData('Cycle_Seeds');
    if (seedsData.length > 1) {
      const lastRow = seedsData[seedsData.length - 1];
      const headers = seedsData[0];
      const cycleIdx = headers.indexOf('CycleID');
      if (cycleIdx >= 0) {
        console.log(`   Last cycle = ${lastRow[cycleIdx]}`);
      }
    }

    console.log('\n===========================');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkCycle()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Failed:', error);
    process.exit(1);
  });
