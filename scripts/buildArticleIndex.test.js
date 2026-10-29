#!/usr/bin/env node
'use strict';

// infrastructure.14 T3 — a paragraph above a byline is not a headline.
// Synthetic text only; nothing here is canon or touches the index.

const assert = require('assert');
const { splitPieces } = require('./buildArticleIndex');

const BODY = 'The council moved the item to a second reading and the room emptied slowly, people stopping in the hallway to compare notes on what had been said. '.repeat(3);

// the nearest line above the byline is a 300+ char paragraph: no title, the body leads instead
{
  const para = 'Next week I am watching four things, and the first is whether the disbursement lands on time for the households that were told to expect it before the month ends. '.repeat(2);
  assert(para.length > 280);
  const text = ['EDITION 112', '', '---', '', para, '', 'By Celeste Tran | Bay Tribune Culture', '', BODY, ''].join('\n');
  const [p] = splitPieces(text, 112);
  assert(p, 'piece found');
  assert.strictEqual(p.title, null);
  assert(p.lede && p.lede.length > 0, 'a lede stands in for the title');
}

// a short plain line above the byline is still a title
{
  const text = ['EDITION 112', '', '---', '', 'Library hours stretch into the evening', 'By Celeste Tran | Bay Tribune Culture', '', BODY, ''].join('\n');
  const [p] = splitPieces(text, 112);
  assert(p, 'piece found');
  assert.strictEqual(p.title, 'Library hours stretch into the evening');
}

console.log('buildArticleIndex.test.js PASS');
