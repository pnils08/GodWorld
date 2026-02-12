/**
 * Reset cycle counter from 81 back to 80
 * (After dry-run incremented it but didn't write data)
 */
const sheets = require('../lib/sheets');

async function resetCycle() {
  console.log('=== RESETTING CYCLE COUNTER TO 80 ===\n');

  try {
    // Get World_Config data
    const data = await sheets.getSheetData('World_Config');
    const headers = data[0];
    const rows = data.slice(1);

    // Find cycleCount row
    const keyIdx = headers.indexOf('Key');
    const valueIdx = headers.indexOf('Value');

    let cycleRowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][keyIdx] === 'cycleCount') {
        cycleRowIndex = i + 2; // +1 for header, +1 for 1-indexed
        console.log(`Found cycleCount at row ${cycleRowIndex}`);
        console.log(`Current value: ${rows[i][valueIdx]}`);
        break;
      }
    }

    if (cycleRowIndex === -1) {
      console.error('cycleCount not found in World_Config');
      return;
    }

    // Convert column index to letter
    const colLetter = String.fromCharCode(65 + valueIdx);
    const range = `World_Config!${colLetter}${cycleRowIndex}`;

    console.log(`\nUpdating ${range} to 80...`);
    await sheets.updateRange(range, [[80]]);

    console.log('✅ Cycle counter reset to 80');
    console.log('\nNext cycle will be 81.');

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

resetCycle()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Failed:', error);
    process.exit(1);
  });
