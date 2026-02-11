const { google } = require('googleapis');
const fs = require('fs');

const auth = new google.auth.GoogleAuth({
  keyFile: '/root/GodWorld/credentials/service-account.json',
  scopes: ['https://www.googleapis.com/auth/drive.readonly']
});

async function downloadFile(drive, fileId, destPath) {
  const response = await drive.files.get(
    { fileId: fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  const dest = fs.createWriteStream(destPath);
  await new Promise((resolve, reject) => {
    response.data.pipe(dest);
    dest.on('finish', resolve);
    dest.on('error', reject);
  });
  const stats = fs.statSync(destPath);
  return stats.size;
}

async function main() {
  const drive = google.drive({ version: 'v3', auth });

  // Download the most recent downloadable files for each Sports category
  const downloads = [
    { id: '1rMoncX3aOFydDFcPvepEclm839evNvTB', name: 'Simulation_Narrative - Chicago_Sports_Feed.pdf', dest: '/tmp/Simulation_Narrative - Chicago_Sports_Feed.pdf' },
    { id: '146GigtHAuuqdfxbw8QymyjHmw7zizgml', name: 'Sports_Feed_Cycle_78.txt', dest: '/tmp/Sports_Feed_Cycle_78.txt' },
    { id: '1ogWVWaYDNS_baXzQAWm_4_fmryfIyE7K', name: 'Chicago_Sports_Feed_Cycle_78.txt', dest: '/tmp/Chicago_Sports_Feed_Cycle_78.txt' },
    { id: '1McyrBY5bNUCr31jjtfPAywQq4M6-OR3n', name: 'Oakland_Sports_Feed_Cycle_78.txt', dest: '/tmp/Oakland_Sports_Feed_Cycle_78.txt' },
  ];

  for (const dl of downloads) {
    console.log(`Downloading "${dl.name}" -> ${dl.dest}`);
    const sz = await downloadFile(drive, dl.id, dl.dest);
    console.log(`  Done: ${sz} bytes`);
  }

  console.log('\nAll additional downloads complete.');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
