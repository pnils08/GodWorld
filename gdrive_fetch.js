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

  // =========================================================
  // TASK 1: Find HANDOFF_Cundefined.txt in GodWorld_Exports folder and download
  // =========================================================
  console.log('========== TASK 1: HANDOFF_Cundefined.txt ==========');
  const folderId = '1pYl-oCXdZJIO9uOKZaYK9aKgEgUEOJ3j';
  const handoffRes = await drive.files.list({
    q: `'${folderId}' in parents and name contains 'HANDOFF_C'`,
    fields: 'files(id,name,mimeType,modifiedTime,size)',
    orderBy: 'modifiedTime desc',
    pageSize: 50
  });
  console.log('Files found in GodWorld_Exports matching HANDOFF_C*:');
  console.log(JSON.stringify(handoffRes.data.files, null, 2));

  // Also try exact name match
  const handoffExact = await drive.files.list({
    q: `name = 'HANDOFF_Cundefined.txt'`,
    fields: 'files(id,name,mimeType,modifiedTime,size)',
    orderBy: 'modifiedTime desc',
    pageSize: 10
  });
  if (handoffExact.data.files && handoffExact.data.files.length > 0) {
    console.log('\nExact match for HANDOFF_Cundefined.txt:');
    console.log(JSON.stringify(handoffExact.data.files, null, 2));
  }

  // Merge results, prefer exact match
  let handoffFiles = handoffExact.data.files && handoffExact.data.files.length > 0
    ? handoffExact.data.files
    : handoffRes.data.files;

  if (handoffFiles && handoffFiles.length > 0) {
    const target = handoffFiles[0];
    console.log(`\nDownloading "${target.name}" (${target.id}) -> /tmp/HANDOFF_raw.txt`);
    const sz = await downloadFile(drive, target.id, '/tmp/HANDOFF_raw.txt');
    console.log(`Download complete: ${sz} bytes written to /tmp/HANDOFF_raw.txt`);
  } else {
    console.log('\nNo HANDOFF file found. Listing ALL files in GodWorld_Exports folder:');
    const allInFolder = await drive.files.list({
      q: `'${folderId}' in parents`,
      fields: 'files(id,name,mimeType,modifiedTime,size)',
      orderBy: 'modifiedTime desc',
      pageSize: 100
    });
    console.log(JSON.stringify(allInFolder.data.files, null, 2));
  }

  // =========================================================
  // TASK 2: Search for Sports_Feed / sports_feed / Oakland_Sports / Chicago_Sports
  // =========================================================
  console.log('\n========== TASK 2: Sports Feed Files ==========');
  const sportsQueries = [
    "name contains 'Sports_Feed'",
    "name contains 'sports_feed'",
    "name contains 'Oakland_Sports'",
    "name contains 'Chicago_Sports'"
  ];
  const sportsQ = sportsQueries.join(' or ');
  const sportsRes = await drive.files.list({
    q: sportsQ,
    fields: 'files(id,name,mimeType,modifiedTime,size)',
    orderBy: 'modifiedTime desc',
    pageSize: 100
  });
  console.log('Sports-related files found:');
  console.log(JSON.stringify(sportsRes.data.files, null, 2));
  console.log(`Total: ${sportsRes.data.files ? sportsRes.data.files.length : 0} files`);

  if (sportsRes.data.files && sportsRes.data.files.length > 0) {
    // Group by base name pattern to find the most recent of each type
    const seen = new Map();
    for (const f of sportsRes.data.files) {
      // Extract the base keyword
      let key = 'other';
      if (f.name.toLowerCase().includes('sports_feed')) key = 'Sports_Feed';
      else if (f.name.toLowerCase().includes('oakland_sports')) key = 'Oakland_Sports';
      else if (f.name.toLowerCase().includes('chicago_sports')) key = 'Chicago_Sports';

      if (!seen.has(key)) {
        seen.set(key, f); // Already sorted by modifiedTime desc, so first is most recent
      }
    }

    for (const [key, file] of seen) {
      // Sanitize filename for local storage
      const safeName = file.name.replace(/[\/\\]/g, '_');
      const destPath = `/tmp/${safeName}`;
      console.log(`\nDownloading most recent "${key}": "${file.name}" (${file.id}) -> ${destPath}`);
      try {
        const sz = await downloadFile(drive, file.id, destPath);
        console.log(`Download complete: ${sz} bytes written to ${destPath}`);
      } catch (err) {
        console.error(`Error downloading ${file.name}: ${err.message}`);
      }
    }
  }

  // =========================================================
  // TASK 3: Search for cycle_79 / Cycle_79 / C79
  // =========================================================
  console.log('\n========== TASK 3: Cycle 79 Files ==========');
  const cycleQ = "name contains 'cycle_79' or name contains 'Cycle_79' or name contains 'C79'";
  const cycleRes = await drive.files.list({
    q: cycleQ,
    fields: 'files(id,name,mimeType,modifiedTime,size)',
    orderBy: 'modifiedTime desc',
    pageSize: 100
  });
  console.log('Cycle 79 files found:');
  console.log(JSON.stringify(cycleRes.data.files, null, 2));
  console.log(`Total: ${cycleRes.data.files ? cycleRes.data.files.length : 0} files`);

  console.log('\n========== ALL TASKS COMPLETE ==========');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  if (err.response) {
    console.error('Response status:', err.response.status);
    console.error('Response data:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
