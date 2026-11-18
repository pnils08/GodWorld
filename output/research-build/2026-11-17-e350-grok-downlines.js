// engine.350 Task 7 — first drafts of the down lines, by Grok on OpenRouter (builder 2026-11-17: "have grok on
// openrouter help In some way. That LLM has a darker side"). Drafts only: nothing here reaches a sheet. One call a dial.
// research-build cuts, signs and places what is kept.
//   node output/research-build/2026-11-17-e350-grok-downlines.js
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const MODEL = 'x-ai/grok-4.3';
const ROUND2 = process.argv[2] === 'round2';   // the sharper pass: round 1 came back polite
const OUT = path.join(__dirname, ROUND2 ? '2026-11-17-e350-grok-downlines-r2.json' : '2026-11-17-e350-grok-downlines.json');
const PER_DIAL = ROUND2 ? 24 : 36;

const DIALS = {
  sociability: 'pulled away from people. Turned down the invitation, let the call ring out, left early, ate alone on purpose, got left out and let it happen, stopped answering the group.',
  warmth: 'turned cold toward someone. Said the sharp thing and let it stand, withheld a small kindness, kept score, enjoyed someone else\'s bad luck a little, did not forgive, did not ask.',
  drive: 'let something slide. Put it off again, quit halfway, coasted, talked themselves out of trying, watched a chance go by and felt relief.',
  openness: 'closed off to something new. Refused to try it, stuck to the usual, waved off an idea before hearing it, distrusted a change on the block, decided they already knew.',
  integrity: 'a small slip, never a crime. A convenient lie, took credit that was not theirs, kept the extra change, broke a small promise, cut a corner nobody would check.',
  family: 'distance at home. Skipped the dinner, forgot the thing that mattered to someone in the house, let a relative\'s call go unreturned, had the argument, went to bed without saying it.',
  outabout: 'stayed in. Cancelled the plan, turned back at the door, let the weekend go by indoors, took the short way home to avoid the street.'
};

const VOICE = [
  'had the argument about the dishes that was not actually about the dishes',
  'walked past the bedroom that stays clean now and closed the door without going in',
  'got a job application rejected and framed it as a joke to everyone but themselves',
  'hid a report card in a backpack pocket for one more day',
  'cooked the full Sunday dinner out of habit and packed half of it straight into the freezer',
  'caught themselves lowering their voice when talking about the block\'s future',
  'checked the front door lock three times after everyone else was asleep',
  'haggled for a flat of bruised peaches at the Saturday market just to have a reason to talk to someone',
  'walked a friend home the long way just to keep talking',
  'stayed thirty minutes after the service just catching up in the parking lot'
];

function brief(dial) {
  return [
    'You are writing for a line library. Each line is one small moment from one ordinary week in one person\'s life, in a city called Oakland during a long prosperous stretch. The city is invented and stands alone: no real people, no real companies or brands, no real events, no politics, no named streets or businesses. Generic places only: the corner store, the bus, the lake, the porch, the stairwell, the group chat, the break room.',
    '',
    'The library has plenty of lines where people are at their best. It has almost none of the other side. Write that side: the moments people do not tell anyone about. Unsentimental. No lesson, no apology, no turn toward better inside the line. Petty, lonely, proud, tired, envious, cowardly, cold: ordinary human dark, at the size of a weekday.',
    '',
    'Not allowed: crime, violence, death, illness, addiction, sex, slurs, money ruin, anything a newspaper would report. These are small.',
    '',
    'This batch: ' + PER_DIAL + ' lines where a person\'s ' + dial.toUpperCase() + ' takes a small hit. What that means: ' + DIALS[dial],
    '',
    'Form, exactly:',
    '- starts with a past-tense verb, lowercase, no subject, no name, no closing period',
    '- 8 to 20 words, one moment, one concrete object or gesture in it',
    '- "they / their / themselves" if a pronoun is needed',
    '- no two lines built on the same skeleton; no line that restates another',
    '',
    'The library\'s voice, for form and scale (these are not all the dark kind):',
    VOICE.map((v) => '- ' + v).join('\n'),
    '',
    ROUND2 ? 'A first batch came back too polite: people skipping things and looking at their phones. That is absence, not character. This batch needs teeth. Envy that enjoys itself. Spite with a straight face. The lie that works and is not regretted. Contempt for someone who was kind. Self-pity used as a weapon. Cowardice dressed as tact. Giving up and calling it wisdom. The reader should wince because they have done it. Each line names what the person DID or SAID or FELT and to whom (a sister, a coworker, the neighbor, their kid, an old friend), never just what they avoided. Do not use: porch light, group chat, headphones, phone face down, break room, stairwell.' : '',
    ROUND2 ? '' : '',
    'For each line say who it could happen to, one of: anyone, parent, married, teen, child, retired, working.',
    'Use anyone for at least half. Child and teen lines must be a child\'s or a teenager\'s own size of trouble.',
    '',
    'Answer with JSON only, no prose around it: [{"text": "...", "who": "..."}, ...] with exactly ' + PER_DIAL + ' items.'
  ].join('\n');
}

async function draft(dial) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://godworld.local' },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: brief(dial) }], max_tokens: 6000, temperature: 1 })
  });
  if (!res.ok) throw new Error(dial + ': HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const j = await res.json();
  const raw = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '');
  const a = raw.indexOf('['), b = raw.lastIndexOf(']');
  if (a < 0 || b <= a) throw new Error(dial + ': no JSON array in the answer');
  const rows = JSON.parse(raw.slice(a, b + 1));
  return { dial, rows, usage: j.usage || null };
}

(async () => {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('no OpenRouter key in the environment');
  const out = { model: MODEL, draftedAt: new Date().toISOString(), perDial: PER_DIAL, brief: brief('<dial>'), dials: {} };
  const results = await Promise.allSettled(Object.keys(DIALS).map(draft));
  let cost = 0;
  results.forEach((r, i) => {
    const dial = Object.keys(DIALS)[i];
    if (r.status === 'fulfilled') { out.dials[dial] = r.value.rows; if (r.value.usage) cost += (r.value.usage.cost || 0); console.log(dial, r.value.rows.length, 'lines', JSON.stringify(r.value.usage && { in: r.value.usage.prompt_tokens, out: r.value.usage.completion_tokens })); }
    else { out.dials[dial] = { error: String(r.reason && r.reason.message) }; console.log(dial, 'FAILED', r.reason && r.reason.message); }
  });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log('written', OUT, '| reported cost $' + cost.toFixed(4));
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
