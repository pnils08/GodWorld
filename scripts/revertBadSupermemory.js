require('/root/GodWorld/lib/env');
const https = require('https');

const API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
const CONTAINER_TAG = 'bay-tribune';
const API_HOST = 'api.supermemory.ai';

function searchSupermemoryJSON(query) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      q: query,
      containerTag: CONTAINER_TAG,
      searchMode: 'hybrid',
      limit: 100
    });
    const options = {
      hostname: API_HOST,
      path: '/v4/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) { resolve([]); return; }
        try { resolve(JSON.parse(data).results || []); } catch (e) { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.write(payload);
    req.end();
  });
}

function deleteSupermemoryDoc(docId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      path: '/v3/documents/' + encodeURIComponent(docId),
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + API_KEY }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log("Searching for C99 and C100 memories created today...");
  
  const results99 = await searchSupermemoryJSON("[TYPE: edition | C99]");
  const results100 = await searchSupermemoryJSON("[TYPE: edition | C100]");
  
  const toDelete = [...results99, ...results100].filter(r => {
    const content = r.memory || r.content || '';
    // Only delete the specific Martin Richards trade ones we ingested today
    return content.includes("Martin Richards") || content.includes("Ernesto Quintero") || content.includes("Vinnie Keane") || content.includes("Isley Kelley");
  });

  console.log(`Found ${toDelete.length} bad memories to delete.`);

  let deleted = 0;
  for (const doc of toDelete) {
    try {
      await deleteSupermemoryDoc(doc.id);
      console.log(`Deleted: ${doc.id}`);
      deleted++;
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.error(`Failed to delete ${doc.id}`);
    }
  }
  
  console.log(`Successfully wiped ${deleted} bad memories.`);
}

main().catch(console.error);
