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

require('/root/GodWorld/lib/env');
const { google } = require('googleapis');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const ENV_PATH = process.env.GODWORLD_ENV_FILE || '/root/.config/godworld/.env';
const REDIRECT_PORT = 3456;
const REDIRECT_URI = 'http://localhost:' + REDIRECT_PORT;

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

  var oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

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
  console.log('Waiting for authorization...');

  // Start a local server to capture the OAuth redirect
  var server = http.createServer(async function(req, res) {
    var parsed = url.parse(req.url, true);
    var code = parsed.query.code;
    if (!code) {
      res.writeHead(400, {'Content-Type': 'text/html'});
      res.end('<h2>No authorization code received.</h2>');
      return;
    }
    try {
      var { tokens } = await oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end('<h2>No refresh token received. Revoke app access in your Google account and try again.</h2>');
        server.close();
        process.exit(1);
      }

      // Update .env
      var envContent = fs.readFileSync(ENV_PATH, 'utf-8');
      if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
        envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/g, 'GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
      } else {
        envContent += '\nGOOGLE_REFRESH_TOKEN=' + tokens.refresh_token + '\n';
      }
      fs.writeFileSync(ENV_PATH, envContent);

      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end('<h2>Authorization successful! You can close this tab.</h2><p>Mags can now write to your Google Drive.</p>');
      console.log('');
      console.log('Success! Refresh token saved to .env');
      console.log('Mags can now write to your Google Drive.');
      console.log('');
      console.log('Test with: node scripts/saveToDrive.js --test');
      server.close();
      process.exit(0);
    } catch (err) {
      res.writeHead(500, {'Content-Type': 'text/html'});
      res.end('<h2>Authorization failed: ' + err.message + '</h2>');
      console.error('Authorization failed:', err.message);
      server.close();
      process.exit(1);
    }
  });

  server.listen(REDIRECT_PORT, function() {
    console.log('Listening on port ' + REDIRECT_PORT + ' for OAuth callback...');
  });
}

main().catch(function(err) {
  console.error('Fatal:', err.message);
  process.exit(1);
});
