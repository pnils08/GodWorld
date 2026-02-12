/**
 * Check ALL sheets for cycle 81 data
 */
const sheets = require('../lib/sheets');

async function findAllCycle81() {
  console.log('=== SCANNING ALL SHEETS FOR CYCLE 81 ===\n');

  try {
    const allSheets = await sheets.listSheets();
    console.log(`Total sheets: ${allSheets.length}\n`);

    const sheetsWithCycle81 = [];
    const sheetsAtCycle80 = [];

    for (const sheet of allSheets) {
      const sheetName = sheet.title;

      try {
        const data = await sheets.getSheetData(sheetName);
        if (data.length < 2) continue; // Skip empty sheets

        const headers = data[0];
        const cycleColIdx = headers.findIndex(h =>
          h && (h.toLowerCase().includes('cycle') || h === 'Cycle' || h === 'CycleID')
        );

        if (cycleColIdx === -1) continue; // No cycle column

        // Check for cycle 81
        const hasCycle81 = data.slice(1).some(row => {
          const val = row[cycleColIdx];
          return val && (val === 81 || val === '81' || Number(val) === 81);
        });

        if (hasCycle81) {
          const count81 = data.slice(1).filter(row => {
            const val = row[cycleColIdx];
            return val && Number(val) === 81;
          }).length;
          sheetsWithCycle81.push({ name: sheetName, count: count81 });
        } else {
          // Check max cycle
          const cycles = data.slice(1)
            .map(row => Number(row[cycleColIdx]) || 0)
            .filter(c => c > 0);
          const maxCycle = cycles.length > 0 ? Math.max(...cycles) : 0;
          if (maxCycle === 80) {
            sheetsAtCycle80.push(sheetName);
          }
        }

      } catch (err) {
        // Skip sheets with errors
      }
    }

    console.log('═══════════════════════════════════════');
    console.log(`SHEETS WITH CYCLE 81 DATA: ${sheetsWithCycle81.length}`);
    console.log('═══════════════════════════════════════\n');

    sheetsWithCycle81.forEach(s => {
      console.log(`✗ ${s.name} (${s.count} rows)`);
    });

    console.log(`\n═══════════════════════════════════════`);
    console.log(`SHEETS AT CYCLE 80 (OK): ${sheetsAtCycle80.length}`);
    console.log('═══════════════════════════════════════\n');

    if (sheetsWithCycle81.length > 0) {
      console.log('\n🔧 ACTION NEEDED: Use rollback utility to clean cycle 81 data');
    } else {
      console.log('\n✅ No cycle 81 data found - already clean!');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

findAllCycle81()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Failed:', error);
    process.exit(1);
  });
