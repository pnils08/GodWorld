/**
 * One-time script: Register 8 OakTown Echo journalists on Simulation_Ledger.
 * Run: node scripts/registerEchoRoster.js
 */
require('dotenv').config();
const sheets = require('../lib/sheets');

async function main() {
  const data = await sheets.getSheetData('Simulation_Ledger');
  const headers = data[0];
  const idx = {};
  headers.forEach((h, i) => { idx[h] = i; });

  const citizens = [
    { popId: 'POP-00773', first: 'Jada', last: 'Reyes', role: 'Editor-in-Chief, OakTown Echo', birth: 1989, hood: 'West Oakland', life: 'West Oakland organizer turned journalist. Founder and EIC of the OakTown Echo.', trait: 'Archetype:Challenger|tone:direct|Motifs:accountability,community|Source:background' },
    { popId: 'POP-00774', first: 'Malik', last: 'Hayes', role: 'Lead Investigator, OakTown Echo', birth: 1996, hood: 'Fruitvale', life: 'Fruitvale native with mutual aid ties. Lead investigative reporter at the OakTown Echo.', trait: 'Archetype:Digger|tone:measured|Motifs:justice,exposure|Source:background' },
    { popId: 'POP-00775', first: 'Sofia', last: 'Alvarez', role: 'Civic & Neighborhood Reporter, OakTown Echo', birth: 2005, hood: 'Temescal', life: 'Recent migrant to Temescal. Covers civic and neighborhood pulse for the OakTown Echo.', trait: 'Archetype:Observer|tone:warm|Motifs:belonging,change|Source:background' },
    { popId: 'POP-00776', first: 'Kwame', last: 'Ellis', role: 'Civic Opinion Columnist, OakTown Echo', birth: 1998, hood: 'Downtown Oakland', life: 'Zine writer turned mainstream voice. Civic opinion columnist at the OakTown Echo.', trait: 'Archetype:Provocateur|tone:literary|Motifs:voice,dissent|Source:background' },
    { popId: 'POP-00777', first: 'Rico', last: 'Valdez', role: 'Lead Sports Reporter, OakTown Echo', birth: 1986, hood: 'Coliseum District', life: "Ex-minor league scout, lifelong A's fan. Lead sports beat reporter at the OakTown Echo.", trait: 'Archetype:Lifer|tone:conversational|Motifs:loyalty,grit|Source:background' },
    { popId: 'POP-00778', first: 'Jamal', last: 'Thompson', role: 'Fan & Culture Columnist, OakTown Echo', birth: 2001, hood: 'East Oakland', life: 'Known as J-Rock. Local podcast host turned culture columnist at the OakTown Echo.', trait: 'Archetype:Connector|tone:energetic|Motifs:culture,fandom|Source:background' },
    { popId: 'POP-00779', first: 'Nia', last: 'Patel', role: 'Economics Reporter, OakTown Echo', birth: 2000, hood: 'Rockridge', life: 'Family cafe owner in Rockridge. Economics reporter at the OakTown Echo.', trait: 'Archetype:Analyst|tone:precise|Motifs:fairness,money|Source:background' },
    { popId: 'POP-00780', first: 'Diego', last: 'Morales', role: 'Senior Photographer, OakTown Echo', birth: 1993, hood: 'Jingletown', life: 'Grit and glow street captures. Senior photographer at the OakTown Echo.', trait: 'Archetype:Witness|tone:visual|Motifs:truth,beauty|Source:background' },
  ];

  const rows = citizens.map(c => {
    const row = new Array(headers.length).fill('');
    row[idx['POPID']] = c.popId;
    row[idx['First']] = c.first;
    row[idx['Last']] = c.last;
    row[idx['Tier']] = 2;
    row[idx['ClockMode']] = 'GAME';
    row[idx['Status']] = 'Active';
    row[idx['RoleType']] = c.role;
    row[idx['BirthYear']] = c.birth;
    row[idx['Neighborhood']] = c.hood;
    row[idx['OrginCity']] = 'Oakland';
    row[idx['LifeHistory']] = c.life;
    row[idx['TraitProfile']] = c.trait;
    row[idx['CreatedAt']] = '3/6/2026';
    if (idx['MED (y/n)'] !== undefined) row[idx['MED (y/n)']] = 'Yes';
    return row;
  });

  const range = 'Simulation_Ledger!A' + (data.length + 1);
  await sheets.batchUpdate([{ range: range, values: rows }]);

  console.log('WRITTEN: 8 OakTown Echo journalists (POP-00773 through POP-00780)');
  console.log('Census: ' + (data.length - 1) + ' -> ' + (data.length - 1 + 8) + ' citizens');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
