#!/usr/bin/env node
/**
 * notify-paulson-interview.js — Discord webhook for Paulson interview requests
 *
 * Usage: node scripts/notify-paulson-interview.js <cycle>
 *
 * Reads: output/interviews/request_c{cycle}_paulson.json
 * Sends: Discord webhook with formatted interview questions
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');

const cycle = process.argv[2];
if (!cycle) {
  console.error('Usage: node scripts/notify-paulson-interview.js <cycle>');
  process.exit(1);
}

const requestPath = path.join(__dirname, '..', 'output', 'interviews', `request_c${cycle}_paulson.json`);
if (!fs.existsSync(requestPath)) {
  console.log(`No Paulson interview request for cycle ${cycle}.`);
  process.exit(0);
}

const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
if (!webhookUrl) {
  console.error('DISCORD_WEBHOOK_URL not set in .env');
  process.exit(1);
}

const request = JSON.parse(fs.readFileSync(requestPath, 'utf-8'));

// Build the message
var lines = [];
lines.push('**INTERVIEW REQUEST \u2014 Edition ' + cycle + '**');
lines.push('');
lines.push('**Reporter:** ' + request.requestedBy + ' (' + request.desk + ' Desk)');
lines.push('**Topic:** ' + request.topic);
lines.push('');
lines.push('**Questions:**');
request.questions.forEach(function(q, i) {
  lines.push((i + 1) + '. "' + q + '"');
});
lines.push('');
lines.push('Reply with: `node scripts/paulson-respond.js ' + cycle + '`');

var message = lines.join('\n');

// Send webhook
var parsed = new URL(webhookUrl);
var payload = JSON.stringify({ content: message });

var options = {
  hostname: parsed.hostname,
  path: parsed.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

var req = https.request(options, function(res) {
  if (res.statusCode === 204 || res.statusCode === 200) {
    console.log('Interview request sent to Discord.');
    console.log('Topic: ' + request.topic);
    console.log('Questions: ' + request.questions.length);
  } else {
    console.error('Discord webhook returned HTTP ' + res.statusCode);
    res.on('data', function(d) { console.error(d.toString()); });
  }
});

req.on('error', function(err) {
  console.error('Failed to send Discord webhook:', err.message);
});

req.write(payload);
req.end();
