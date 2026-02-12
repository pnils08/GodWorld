/**
 * downloadDriveFile.js
 * Download a file from Google Drive using service account
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');

const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

async function downloadFile(fileId, outputPath) {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  const drive = google.drive({ version: 'v3', auth });

  const dest = fs.createWriteStream(outputPath);

  const response = await drive.files.get(
    { fileId: fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return new Promise((resolve, reject) => {
    response.data
      .on('end', () => {
        console.log(`Downloaded: ${outputPath}`);
        resolve();
      })
      .on('error', err => {
        console.error('Error downloading file:', err);
        reject(err);
      })
      .pipe(dest);
  });
}

async function main() {
  const fileId = process.argv[2];
  const outputPath = process.argv[3];

  if (!fileId || !outputPath) {
    console.log('Usage: node downloadDriveFile.js <fileId> <outputPath>');
    process.exit(1);
  }

  await downloadFile(fileId, outputPath);
}

main().catch(console.error);
