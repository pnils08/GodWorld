const sheets = require('../lib/sheets');
require('../lib/env');

async function main() {
  const ledger = await sheets.getSheetAsObjects('Simulation_Ledger');
  
  // Find anyone who looks like a baseball player
  const baseballPlayers = ledger.filter(r => {
    const vals = Object.values(r).join(' ').toLowerCase();
    // look for baseball positions
    if (vals.includes('ss') || vals.includes('sp') || vals.includes('rp') || vals.includes('pitcher') || vals.includes('shortstop')) {
        // But exclude paramedics, etc.
        if (vals.includes('paramedic') || vals.includes('plumber') || vals.includes('researcher') || vals.includes('bookstore')) return false;
        
        return true;
    }
    return false;
  });
  
  console.log(`Found ${baseballPlayers.length} potential baseball players:`);
  baseballPlayers.slice(0, 50).forEach(p => {
    console.log(`${p.POPID} | ${p.First} ${p.Last} | Age: ${p.Age} | Role: ${p.RoleType} | Status: ${p.Status}`);
  });
}
main().catch(console.error);
