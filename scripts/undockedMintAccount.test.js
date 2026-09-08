'use strict';

const M = require('./undockedMintAccount');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

check('session name', M.sessionNameFor('POP-00143') === 'undocked-pop00143');
check('username base', M.usernameCandidates('Clarissa Dane', 'POP-00143')[0] === 'ClarissaDane');
check('username fallback carries popid digits',
  M.usernameCandidates('Clarissa Dane', 'POP-00143')[1] === 'ClarissaDane143');
check('username strips punctuation',
  M.usernameCandidates("Jango O'Hara-Lango", 'POP-00253')[0] === 'JangoOHaraLango');
check('single-name citizen still yields a candidate',
  M.usernameCandidates('Madonna', 'POP-00001').join(',') === 'Madonna,Madonna1');
check('no popid digits -> base only', M.usernameCandidates('Ada Lovelace', '').join(',') === 'AdaLovelace');

// Idempotency against the real sessions dir: the draw-1 cast is minted, a
// synthetic POPID is not.
check('existing cast creds detected', M.credentialsExist('POP-00962') === true);
check('unminted popid detected', M.credentialsExist('POP-99999') === false);

// S438b: the env value was pasted as <ak_…>; the loader must hand the server a bare key.
check('angle-bracket paste stripped', M.cleanClerkKey('<ak_ABC123>') === 'ak_ABC123');
check('quoted key stripped', M.cleanClerkKey('"ak_ABC123"') === 'ak_ABC123');
check('bare key untouched', M.cleanClerkKey(' ak_ABC123 ') === 'ak_ABC123');

if (failed) { console.error('undockedMintAccount: ' + failed + ' FAIL'); process.exit(1); }
console.log('undockedMintAccount: ok');
