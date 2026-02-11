const sheets = require('./lib/sheets');

async function canon() {
  // 1. Civic Office Ledger — check Rivera vs Rivers, all council members
  console.log('=== CIVIC OFFICE LEDGER ===');
  const civic = await sheets.getSheetAsObjects('Civic_Office_Ledger');
  const council = civic.filter(r => r.Type === 'Council' || r.Title?.includes('Council'));
  council.forEach(c => {
    console.log(`  ${c.District || c.Title}: ${c.Holder} | Faction: ${c.Faction} | Status: ${c.Status}`);
  });
  // Also check for any Rivera
  const rivera = civic.filter(r => (r.Holder || '').toLowerCase().includes('river'));
  console.log('Rivera matches:', rivera.length ? rivera.map(r => r.Holder + ' / ' + r.District) : 'NONE');
  
  // 2. Simulation Ledger — check A's roster for Ramos, Kinder/Kindler, Seymour, Buzelis, Osei, Hayes
  console.log('\n=== SIMULATION LEDGER LOOKUPS ===');
  const ledger = await sheets.getSheetAsObjects('Simulation_Ledger');
  
  const names = ['Ramos', 'Kinder', 'Kindler', 'Seymour', 'Buzelis', 'Osei', 'Hayes'];
  for (const name of names) {
    const matches = ledger.filter(r => 
      (r.Last || '').toLowerCase().includes(name.toLowerCase()) ||
      (r.First || '').toLowerCase().includes(name.toLowerCase())
    );
    if (matches.length > 0) {
      matches.forEach(m => {
        console.log(`  ${m.First} ${m.Last} | POPID: ${m.POPID} | Role: ${m.RoleType} | Tier: ${m.Tier} | Neighborhood: ${m.Neighborhood} | Status: ${m.Status}`);
      });
    } else {
      console.log(`  ${name}: NOT FOUND in ledger`);
    }
  }

  // 3. Initiative Tracker — Health Center budget
  console.log('\n=== INITIATIVE TRACKER ===');
  const initiatives = await sheets.getSheetAsObjects('Initiative_Tracker');
  initiatives.forEach(i => {
    console.log(`  ${i.Name}: Budget=${i.Budget}, Status=${i.Status}, VoteCycle=${i.VoteCycle}, Projection=${i.Projection}`);
  });

  // 4. Oakland Sports Feed — check Ramos position, Buzelis status
  console.log('\n=== OAKLAND SPORTS FEED (last 5 rows) ===');
  const oakSports = await sheets.getSheetData('Oakland_Sports_Feed');
  if (oakSports.length > 1) {
    console.log('Headers:', JSON.stringify(oakSports[0]));
    for (let i = Math.max(1, oakSports.length - 5); i < oakSports.length; i++) {
      const row = oakSports[i];
      const text = (row[7] || row[6] || row[5] || '').toString();
      if (text.toLowerCase().includes('ramos') || text.toLowerCase().includes('buzelis')) {
        console.log(`  Row ${i}: ${text.substring(0, 200)}`);
      }
    }
  }

  // 5. Check Chicago Sports Feed for Buzelis
  console.log('\n=== CHICAGO SPORTS FEED ===');
  const chiSports = await sheets.getSheetData('Chicago_Sports_Feed');
  if (chiSports.length > 1) {
    console.log('Headers:', JSON.stringify(chiSports[0]));
    for (let i = 1; i < chiSports.length; i++) {
      const row = chiSports[i];
      const text = JSON.stringify(row);
      if (text.toLowerCase().includes('buzelis') || text.toLowerCase().includes('injury') || text.toLowerCase().includes('osei')) {
        console.log(`  Row ${i}: ${text.substring(0, 300)}`);
      }
    }
  }

  // 6. Check Generic_Citizens for Hayes
  console.log('\n=== GENERIC CITIZENS — Hayes ===');
  const generic = await sheets.getSheetAsObjects('Generic_Citizens');
  const hayes = generic.filter(r => (r.Last || '').toLowerCase().includes('hayes') || (r.First || '').toLowerCase().includes('hayes'));
  hayes.forEach(h => console.log(`  ${h.First} ${h.Last} | Age: ${h.Age} | Neighborhood: ${h.Neighborhood} | Occupation: ${h.Occupation}`));
  if (hayes.length === 0) console.log('  Hayes: NOT FOUND');
}

canon().catch(e => { console.error(e.message); process.exit(1); });
