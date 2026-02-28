#!/usr/bin/env node
/**
 * reauthorizeDrive.js — Re-authorize Drive write access
 *
 * Uses localhost redirect (Google allows this for desktop OAuth clients).
 *
 * Flow:
 *   1. Run this script → prints auth URL
 *   2. Open URL in any browser, authorize with Google
 *   3. Google redirects to localhost (page won't load — that's fine)
 *   4. Copy the "code" parameter from the URL bar
 *   5. Run: node scripts/reauthorizeDrive.js --code=PASTE_CODE_HERE
 *      Or: create output/drive-auth-code.txt with just the code, run again
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CODE_FILE = path.join(__dirname, '..', 'output', 'drive-auth-code.txt');
const ENV_FILE = path.join(__dirname, '..', '.env');
const REDIRECT_URI = 'http://localhost:3847/oauth2callback';

var clientId = process.env.GOOGLE_CLIENT_ID;
var clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
  process.exit(1);
}

var oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

// Check for --code= argument
var codeArg = process.argv.find(a => a.startsWith('--code='));
var code = codeArg ? codeArg.split('=').slice(1).join('=') : null;

// Also check the code file
if (!code && fs.existsSync(CODE_FILE)) {
  code = fs.readFileSync(CODE_FILE, 'utf-8').trim();
  if (code.length < 10) code = null;
}

if (code) {
  // Step 2: Exchange code for refresh token
  console.log('Exchanging auth code for refresh token...');

  oauth2Client.getToken(code).then(function(res) {
    var tokens = res.tokens;
    if (!tokens.refresh_token) {
      console.error('No refresh token returned. Try again with prompt=consent.');
      process.exit(1);
    }
    console.log('Got refresh token!');

    // Update .env file
    var envContent = fs.readFileSync(ENV_FILE, 'utf-8');
    if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
      envContent = envContent.replace(
        /GOOGLE_REFRESH_TOKEN=.*/,
        'GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token
      );
    } else {
      envContent += '\nGOOGLE_REFRESH_TOKEN=' + tokens.refresh_token + '\n';
    }
    fs.writeFileSync(ENV_FILE, envContent);
    console.log('Refresh token saved to .env');

    // Clean up
    if (fs.existsSync(CODE_FILE)) fs.unlinkSync(CODE_FILE);
    console.log('');
    console.log('Drive write access restored! Test with:');
    console.log('  node scripts/saveToDrive.js --test');
  }).catch(function(err) {
    console.error('Token exchange failed:', err.message);
    if (err.message.includes('invalid_grant')) {
      console.error('The code expired or was already used. Run the script again without --code to get a new URL.');
    }
    if (fs.existsSync(CODE_FILE)) fs.unlinkSync(CODE_FILE);
  });

} else {
  // Step 1: Generate auth URL
  var url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: 'https://www.googleapis.com/auth/drive.file',
    prompt: 'consent',
  });

  console.log('');
  console.log('Open this URL in your browser and authorize:');
  console.log('');
  console.log(url);
  console.log('');
  console.log('After authorizing, Google will redirect to a page that WON\'T LOAD.');
  console.log('That\'s fine! Look at the URL bar — it will look like:');
  console.log('  http://localhost:3847/oauth2callback?code=4/0AXXXXXX...&scope=...');
  console.log('');
  console.log('Copy everything between "code=" and "&scope" and run:');
  console.log('  node scripts/reauthorizeDrive.js --code=PASTE_HERE');
}
