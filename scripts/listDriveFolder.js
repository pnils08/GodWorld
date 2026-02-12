/**
 * listDriveFolder.js
 * List files in a Google Drive folder using service account
 */

require('dotenv').config();
const { google } = require('googleapis');

const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

async function main() {
  const FOLDER_ID = process.argv[2] || '10sDuq1k2doNrew5_aEW6b3Pj6BFuq7fD';

  console.log('=== Google Drive Folder Access ===\n');

  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ],
  });

  const drive = google.drive({ version: 'v3', auth });

  try {
    // List files in the folder
    console.log(`Accessing folder: ${FOLDER_ID}\n`);

    const response = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, size, createdTime)',
      orderBy: 'name',
    });

    const files = response.data.files;

    if (!files || files.length === 0) {
      console.log('No files found in folder (or no access).');
      console.log('\nIf folder exists, make sure it\'s shared with:');
      console.log('maravance@godworld-486407.iam.gserviceaccount.com');
      return;
    }

    console.log(`Found ${files.length} files:\n`);

    files.forEach((file, i) => {
      console.log(`${i + 1}. ${file.name}`);
      console.log(`   ID: ${file.id}`);
      console.log(`   Type: ${file.mimeType}`);
      console.log(`   Size: ${file.size ? Math.round(file.size / 1024) + ' KB' : 'N/A'}`);
      console.log('');
    });

    return files;

  } catch (error) {
    console.error('Error accessing folder:');
    console.error(error.message);

    if (error.code === 404) {
      console.log('\nFolder not found or not shared with service account.');
      console.log('Please share the folder with:');
      console.log('maravance@godworld-486407.iam.gserviceaccount.com');
    }
  }
}

main().catch(console.error);
