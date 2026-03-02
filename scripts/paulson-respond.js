#!/usr/bin/env node
/**
 * paulson-respond.js — CLI tool for Mike Paulson to respond to interview requests
 *
 * Usage:
 *   node scripts/paulson-respond.js <cycle>               # Interactive mode
 *   node scripts/paulson-respond.js <cycle> --file <path>  # File mode
 *
 * Interactive: Prompts for each answer one at a time.
 * File mode: Reads answers from a text file (one answer per blank-line-separated block).
 *
 * Reads:  output/interviews/request_c{cycle}_paulson.json
 * Writes: output/interviews/response_c{cycle}_paulson.json
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const cycle = process.argv[2];
const fileFlag = process.argv.indexOf('--file');
const filePath = fileFlag !== -1 ? process.argv[fileFlag + 1] : null;

if (!cycle) {
  console.error('Usage: node scripts/paulson-respond.js <cycle> [--file <path>]');
  process.exit(1);
}

const requestPath = path.join(__dirname, '..', 'output', 'interviews', `request_c${cycle}_paulson.json`);
const responsePath = path.join(__dirname, '..', 'output', 'interviews', `response_c${cycle}_paulson.json`);

if (!fs.existsSync(requestPath)) {
  console.error(`No Paulson interview request for cycle ${cycle}.`);
  console.error('Expected: ' + requestPath);
  process.exit(1);
}

var request = JSON.parse(fs.readFileSync(requestPath, 'utf-8'));

console.log('');
console.log('PAULSON INTERVIEW — Cycle ' + cycle);
console.log('Reporter: ' + request.requestedBy + ' (' + request.desk + ' Desk)');
console.log('Topic: ' + request.topic);
console.log('Questions: ' + request.questions.length);
console.log('');

function buildResponse(answers) {
  var response = {
    cycle: parseInt(cycle),
    office: 'paulson',
    speaker: 'Mike Paulson',
    popId: null,
    respondedTo: 'request_c' + cycle + '_paulson.json',
    answers: request.questions.map(function(q, i) {
      var answerText = (answers[i] || '').trim();
      // Extract first sentence as pull quote (up to 30 words)
      var sentences = answerText.split(/[.!?]+/).filter(function(s) { return s.trim(); });
      var quote = sentences[0] ? sentences[0].trim() : answerText.substring(0, 100);
      var words = quote.split(/\s+/);
      if (words.length > 30) quote = words.slice(0, 30).join(' ') + '...';

      return {
        question: q,
        response: answerText,
        quote: quote,
        tone: 'paulson-natural'
      };
    }),
    forDesks: [request.desk]
  };

  // Add related desks based on topic keywords
  var topic = (request.topic || '').toLowerCase();
  if (topic.indexOf('trade') !== -1 || topic.indexOf('roster') !== -1 || topic.indexOf('player') !== -1) {
    if (response.forDesks.indexOf('sports') === -1) response.forDesks.push('sports');
  }
  if (topic.indexOf('stadium') !== -1 || topic.indexOf('baylight') !== -1) {
    if (response.forDesks.indexOf('business') === -1) response.forDesks.push('business');
    if (response.forDesks.indexOf('civic') === -1) response.forDesks.push('civic');
  }

  return response;
}

function saveResponse(response) {
  fs.writeFileSync(responsePath, JSON.stringify(response, null, 2));
  console.log('');
  console.log('Response saved to: ' + responsePath);
  console.log('Answers: ' + response.answers.length);
  console.log('For desks: ' + response.forDesks.join(', '));
}

// --- File mode ---
if (filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('File not found: ' + filePath);
    process.exit(1);
  }
  var raw = fs.readFileSync(filePath, 'utf-8');
  var answers = raw.split(/\n\n+/).filter(function(block) { return block.trim(); });

  if (answers.length < request.questions.length) {
    console.warn('Warning: ' + answers.length + ' answers for ' + request.questions.length + ' questions.');
    console.warn('Missing answers will be empty.');
  }

  var response = buildResponse(answers);
  saveResponse(response);
  process.exit(0);
}

// --- Interactive mode ---
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var answers = [];
var currentQ = 0;

function askNext() {
  if (currentQ >= request.questions.length) {
    rl.close();
    var response = buildResponse(answers);
    saveResponse(response);
    return;
  }

  console.log('Q' + (currentQ + 1) + '/' + request.questions.length + ':');
  console.log('"' + request.questions[currentQ] + '"');
  console.log('');
  console.log('Your answer (press Enter twice when done):');

  var lines = [];
  var emptyCount = 0;

  function onLine(line) {
    if (line === '') {
      emptyCount++;
      if (emptyCount >= 1 && lines.length > 0) {
        // Done with this answer
        rl.removeListener('line', onLine);
        answers.push(lines.join('\n'));
        currentQ++;
        console.log('');
        askNext();
        return;
      }
    } else {
      emptyCount = 0;
    }
    lines.push(line);
  }

  rl.on('line', onLine);
}

askNext();
