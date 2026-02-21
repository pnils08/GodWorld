const { google } = require('googleapis');

const SPREADSHEET_ID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';
// Simulation year for age calculation from BirthYear
const CURRENT_SIM_YEAR = 2041;

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: '/root/GodWorld/credentials/service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // Helper: find column index case-insensitive, trimmed
  function findCol(headers, ...candidates) {
    for (const candidate of candidates) {
      const idx = headers.findIndex(h => h && h.trim().toLowerCase() === candidate.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  }

  // --- Simulation_Ledger ---
  console.log('=== Simulation_Ledger ===');
  try {
    const simRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Simulation_Ledger!A1:Z1000',
    });
    const simRows = simRes.data.values;
    if (!simRows || simRows.length === 0) {
      console.log('No data found in Simulation_Ledger.');
    } else {
      const headers = simRows[0];
      const ageIdx = findCol(headers, 'Age');
      const birthYearIdx = findCol(headers, 'BirthYear', 'Birth Year', 'birthyear');
      const firstIdx = findCol(headers, 'First', 'FirstName', 'first');
      const lastIdx = findCol(headers, 'Last', 'LastName', 'last');
      const popIdx = findCol(headers, 'POPID', 'PopId', 'POP-ID', 'POP_ID');
      const statusIdx = findCol(headers, 'Status');
      const tierIdx = findCol(headers, 'Tier');

      console.log(`Columns: Age=${ageIdx}, BirthYear=${birthYearIdx}, First=${firstIdx}, Last=${lastIdx}, POPID=${popIdx}, Status=${statusIdx}, Tier=${tierIdx}`);
      console.log(`Using simulation year ${CURRENT_SIM_YEAR} for age calculation from BirthYear.\n`);

      const youth = [];
      for (let i = 1; i < simRows.length; i++) {
        const row = simRows[i];
        let age = NaN;

        // Try Age column first, then compute from BirthYear
        if (ageIdx !== -1 && row[ageIdx]) {
          age = parseInt(row[ageIdx], 10);
        } else if (birthYearIdx !== -1 && row[birthYearIdx]) {
          const birthYear = parseInt(row[birthYearIdx], 10);
          if (!isNaN(birthYear) && birthYear > 1900 && birthYear <= CURRENT_SIM_YEAR) {
            age = CURRENT_SIM_YEAR - birthYear;
          }
        }

        if (!isNaN(age) && age >= 5 && age <= 22) {
          const firstName = firstIdx !== -1 ? (row[firstIdx] || '') : '';
          const lastName = lastIdx !== -1 ? (row[lastIdx] || '') : '';
          const name = (firstName + ' ' + lastName).trim() || 'Unknown';
          const popId = popIdx !== -1 ? (row[popIdx] || '') : '';
          const status = statusIdx !== -1 ? (row[statusIdx] || '') : '';
          const tier = tierIdx !== -1 ? (row[tierIdx] || '') : '';
          const birthYear = birthYearIdx !== -1 ? (row[birthYearIdx] || '') : '';
          youth.push({ name, age, popId, status, tier, birthYear, row: i + 1 });
        }
      }

      console.log(`Total youth (age 5-22) in Simulation_Ledger: ${youth.length}`);
      if (youth.length > 0) {
        console.log('\nExamples (up to 5):');
        youth.slice(0, 5).forEach(y => {
          console.log(`  - ${y.name} (Age: ${y.age}, BirthYear: ${y.birthYear}, ${y.popId}, Tier ${y.tier}, Status: ${y.status}) [row ${y.row}]`);
        });
        if (youth.length > 5) {
          console.log(`  ... and ${youth.length - 5} more`);
        }

        // Age distribution
        const ageDist = {};
        youth.forEach(y => { ageDist[y.age] = (ageDist[y.age] || 0) + 1; });
        console.log('\nAge distribution:');
        Object.keys(ageDist).sort((a, b) => a - b).forEach(age => {
          console.log(`  Age ${age}: ${ageDist[age]} citizen(s)`);
        });
      }
    }
  } catch (err) {
    console.error('Error reading Simulation_Ledger:', err.message);
  }

  // --- Generic_Citizens ---
  console.log('\n=== Generic_Citizens ===');
  try {
    const genRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Generic_Citizens!A1:Z2000',
    });
    const genRows = genRes.data.values;
    if (!genRows || genRows.length === 0) {
      console.log('No data found in Generic_Citizens.');
    } else {
      const headers = genRows[0];
      const ageIdx = findCol(headers, 'Age');
      const birthYearIdx = findCol(headers, 'BirthYear', 'Birth Year');
      const firstIdx = findCol(headers, 'First', 'FirstName', 'first');
      const lastIdx = findCol(headers, 'Last', 'LastName', 'last');
      const neighborhoodIdx = findCol(headers, 'Neighborhood');
      const occupationIdx = findCol(headers, 'Occupation');
      const statusIdx = findCol(headers, 'Status');

      console.log(`Columns: Age=${ageIdx}, BirthYear=${birthYearIdx}, First=${firstIdx}, Last=${lastIdx}, Neighborhood=${neighborhoodIdx}, Occupation=${occupationIdx}, Status=${statusIdx}`);
      console.log(`Total data rows: ${genRows.length - 1}\n`);

      const youth = [];
      for (let i = 1; i < genRows.length; i++) {
        const row = genRows[i];
        let age = NaN;

        if (ageIdx !== -1 && row[ageIdx]) {
          age = parseInt(row[ageIdx], 10);
        } else if (birthYearIdx !== -1 && row[birthYearIdx]) {
          const birthYear = parseInt(row[birthYearIdx], 10);
          if (!isNaN(birthYear) && birthYear > 1900 && birthYear <= CURRENT_SIM_YEAR) {
            age = CURRENT_SIM_YEAR - birthYear;
          }
        }

        if (!isNaN(age) && age >= 5 && age <= 22) {
          const firstName = firstIdx !== -1 ? (row[firstIdx] || '') : '';
          const lastName = lastIdx !== -1 ? (row[lastIdx] || '') : '';
          const name = (firstName + ' ' + lastName).trim() || 'Unknown';
          const neighborhood = neighborhoodIdx !== -1 ? (row[neighborhoodIdx] || '') : '';
          const occupation = occupationIdx !== -1 ? (row[occupationIdx] || '') : '';
          const status = statusIdx !== -1 ? (row[statusIdx] || '') : '';
          youth.push({ name, age, neighborhood, occupation, status, row: i + 1 });
        }
      }

      console.log(`Total youth (age 5-22) in Generic_Citizens: ${youth.length}`);
      if (youth.length > 0) {
        console.log('\nExamples (up to 5):');
        youth.slice(0, 5).forEach(y => {
          console.log(`  - ${y.name} (Age: ${y.age}, Neighborhood: ${y.neighborhood}, Occupation: ${y.occupation}, Status: ${y.status}) [row ${y.row}]`);
        });
        if (youth.length > 5) {
          console.log(`  ... and ${youth.length - 5} more`);
        }

        // Age distribution
        const ageDist = {};
        youth.forEach(y => { ageDist[y.age] = (ageDist[y.age] || 0) + 1; });
        console.log('\nAge distribution:');
        Object.keys(ageDist).sort((a, b) => a - b).forEach(age => {
          console.log(`  Age ${age}: ${ageDist[age]} citizen(s)`);
        });
      }
    }
  } catch (err) {
    console.error('Error reading Generic_Citizens:', err.message);
  }

  // --- Summary ---
  console.log('\n=== SUMMARY ===');
  console.log('Youth citizens are those aged 5-22 (school-age through college-age).');
  console.log(`Simulation year used for BirthYear->Age calculation: ${CURRENT_SIM_YEAR}`);
}

main().catch(err => console.error('Fatal error:', err));
