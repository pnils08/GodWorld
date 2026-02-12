/**
 * updateDriveFile.js
 * Updates a text file in Google Drive with new content
 *
 * Usage: node scripts/updateDriveFile.js <fileId> <localFilePath>
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');

const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

async function updateFile(fileId, localFilePath) {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  const drive = google.drive({ version: 'v3', auth });

  try {
    const fileContent = fs.readFileSync(localFilePath, 'utf8');

    const response = await drive.files.update({
      fileId: fileId,
      media: {
        mimeType: 'text/plain',
        body: fileContent,
      },
    });

    console.log(`✓ Updated file: ${response.data.name || fileId}`);
    return response.data;
  } catch (error) {
    console.error('Error updating file:', error.message);
    throw error;
  }
}

async function main() {
  const fileId = process.argv[2];
  const localFilePath = process.argv[3];

  if (!fileId || !localFilePath) {
    console.error('Usage: node updateDriveFile.js <fileId> <localFilePath>');
    process.exit(1);
  }

  if (!fs.existsSync(localFilePath)) {
    console.error(`Error: Local file not found: ${localFilePath}`);
    process.exit(1);
  }

  console.log('=== Google Drive File Update ===\n');
  console.log(`File ID: ${fileId}`);
  console.log(`Source: ${localFilePath}\n`);

  await updateFile(fileId, localFilePath);
  console.log('\nUpdate complete!');
}

main().catch(console.error);
