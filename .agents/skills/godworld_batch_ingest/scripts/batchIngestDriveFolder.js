const fs = require('fs');
const { execSync } = require('child_process');
const https = require('https');
require('../../../../lib/env'); // Load GodWorld env for SUPERMEMORY_CC_API_KEY

const API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
const folderId = process.argv[2];

if (!folderId) {
  console.error("Usage: node batchIngestDriveFolder.js <folder_id>");
  process.exit(1);
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync('changelog.md', line + '\n');
}

function checkSupermemory(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      q: query,
      containerTags: ["bay-tribune"]
    });

    const options = {
      hostname: 'api.supermemory.ai',
      port: 443,
      path: '/v3/search',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  if (!fs.existsSync('changelog.md')) {
    fs.writeFileSync('changelog.md', '# Ingestion Changelog\n\n');
  }

  log(`Listing files in folder ${folderId}...`);
  let listOutput = '';
  try {
    listOutput = execSync(`node /root/GodWorld/scripts/listDriveFolder.js ${folderId}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch (e) {
    log(`[ERROR] Failed to list folder: ${e.message}`);
    process.exit(1);
  }

  const files = [];
  const lines = listOutput.split('\n');
  let currentName = '';
  for (let line of lines) {
    const nameMatch = line.match(/^\d+\.\s+(.*)/);
    if (nameMatch) {
      currentName = nameMatch[1].trim();
    }
    const idMatch = line.match(/^\s+ID:\s+(.*)/);
    if (idMatch && currentName) {
      if (currentName.endsWith('.txt') || currentName.endsWith('.md')) {
        files.push({ id: idMatch[1].trim(), name: currentName });
      }
      currentName = '';
    }
  }

  log(`Found ${files.length} text/md files to process.`);

  for (const file of files) {
    log(`Processing ${file.name}...`);
    
    let localPath = "";
    log(`  Fetching from Drive...`);
    try {
      const output = execSync(`node /root/GodWorld/scripts/fetchDriveFile.js "${file.id}" --save`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const match = output.match(/Saved:\s+(.*)/);
      if (match && match[1]) {
        localPath = match[1].trim();
      } else {
        log(`  [ERROR] Could not extract saved path from output.`);
        continue;
      }
    } catch (e) {
      log(`  [ERROR] Failed to fetch ${file.name}`);
      continue;
    }

    if (!localPath.endsWith('.txt') && !localPath.endsWith('.md')) {
      const newPath = localPath + '.txt';
      fs.renameSync(localPath, newPath);
      localPath = newPath;
    }

    if (!fs.existsSync(localPath)) {
      log(`  [ERROR] localPath does not exist: ${localPath}`);
      continue;
    }

    const content = fs.readFileSync(localPath, 'utf8');
    const query = content.replace(/\n/g, ' ').substring(0, 150);

    log(`  Searching Supermemory for duplicates...`);
    try {
      const result = await checkSupermemory(query);
      if (result.results && result.results.length > 0 && result.results[0].score > 0.80) {
        log(`  [SKIP] Found in Supermemory (Score: ${result.results[0].score.toFixed(3)})`);
        continue;
      }
    } catch (e) {
      log(`  [ERROR] Search failed: ${e.message}`);
      continue;
    }

    log(`  Ingesting...`);
    try {
      execSync(`node /root/GodWorld/scripts/ingestEdition.js "${localPath}"`, { stdio: 'inherit' });
      log(`  [SUCCESS] Ingested ${file.name}`);
    } catch (e) {
      log(`  [ERROR] Failed to ingest ${file.name}`);
    }
  }
  
  log('Finished processing folder.');
}

main();
