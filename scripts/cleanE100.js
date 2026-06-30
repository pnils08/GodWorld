const sheets = require('../lib/sheets');
require('../lib/env');

async function main() {
  const ledger = await sheets.getSheetAsObjects('Simulation_Ledger');
  
  const targetPops = ['POP-00031', 'POP-00050', 'POP-00001', 'POP-00019'];
  
  for (let i = 0; i < ledger.length; i++) {
    const row = ledger[i];
    if (targetPops.includes(row.POPID)) {
      let lifeHistory = row.LifeHistory || '';
      
      const lines = lifeHistory.split('\n');
      const filteredLines = lines.filter(line => !line.includes('[TYPE: edition | C100]'));
      
      const newHistory = filteredLines.join('\n');
      
      if (newHistory !== lifeHistory) {
        console.log(`Removing bad C100 entry for ${row.POPID} (${row.First} ${row.Last})...`);
        const rowNum = i + 2; // +1 for 0-index to 1-index, +1 for headers
        await sheets.updateCell('Simulation_Ledger', rowNum, 'LifeHistory', newHistory);
      }
    }
  }
  console.log("Done cleaning bad C100 entries.");
}
main().catch(console.error);
