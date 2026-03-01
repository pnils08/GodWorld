#!/usr/bin/env node
/**
 * authorizeDriveWrite.js — One-time OAuth2 setup for Drive write access
 *
 * The service account can READ from Drive but can't WRITE (no storage quota).
 * This script sets up OAuth2 with the user's personal credentials so Mags
 * can save editions, briefings, and reference cards directly to Drive.
 *
 * Prerequisites:
 *   1. Create OAuth client in Google Cloud Console (Desktop app type)
 *   2. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env
 *
 * Usage:
 *   node scripts/authorizeDriveWrite.js
 *
 * After running, GOOGLE_REFRESH_TOKEN will be added to .env automatically.
 */

require('dotenv').config();
const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const ENV_PATH = path.join(__dirname, '..', '.env');

async function main() {
  var clientId = process.env.GOOGLE_CLIENT_ID;
  var clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log('Missing OAuth credentials. Add these to .env:');
    console.log('  GOOGLE_CLIENT_ID=your-client-id');
    console.log('  GOOGLE_CLIENT_SECRET=your-client-secret');
    console.log('');
    console.log('To get these:');
    console.log('  1. Go to https://console.cloud.google.com/apis/credentials');
    console.log('  2. Select project: godworld-486407');
    console.log('  3. Create Credentials > OAuth client ID > Desktop app');
    console.log('  4. Copy the Client ID and Client Secret');
    process.exit(1);
  }

  var oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob');

  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('');
  console.log('Open this URL in your browser:');
  console.log('');
  console.log(authUrl);
  console.log('');
  console.log('After authorizing, paste the code below:');

  var rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.question('Authorization code: ', async function(code) {
    rl.close();
    try {
      var { tokens } = await oauth2Client.getToken(code.trim());

      if (!tokens.refresh_token) {
        console.error('No refresh token received. Try revoking app access and re-running.');
        process.exit(1);
      }

      // Append to .env
      var envContent = fs.readFileSync(ENV_PATH, 'utf-8');
      if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
        envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/g, 'GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
      } else {
        envContent += '\nGOOGLE_REFRESH_TOKEN=' + tokens.refresh_token + '\n';
      }
      fs.writeFileSync(ENV_PATH, envContent);

      console.log('');
      console.log('Success! Refresh token saved to .env');
      console.log('Mags can now write to your Google Drive.');
      console.log('');
      console.log('Test with: node scripts/saveToDrive.js --test');
    } catch (err) {
      console.error('Authorization failed: ' + err.message);
      process.exit(1);
    }
  });
}

main().catch(function(err) {
  console.error('Fatal:', err.message);
  process.exit(1);
});
