/**
 * ============================================================================
 * casinoLedgerEngine.js — UNDOCKED Phase 4b (review build, grok 2026-08-31)
 * ============================================================================
 *
 * Port of scripts/casinoLedger.js into the wealth pass. KEEP IN SYNC with
 * that file (pure helpers + tests). Spec:
 *   docs/for-claude-review/2026-08-31-grok-casino-ledger.md
 *
 * Fail-closed: missing Casino_Ledger tab is a no-op. This function does not
 * insert the tab (schema-setup is engine-sheet on bench). No live money
 * moves until that tab exists.
 *
 * Called from processGenerationalWealth_ immediately BEFORE processMoneyLoop_
 * so a settled loss can stack with crisis-debt the same week.
 *
 * Writes:
 *   Simulation_Ledger NetWorth / DebtLevel / LifeHistory via ctx.ledger
 *   Casino_Ledger via queueAppendIntent_ / queueCellIntent_ (Phase 10)
 *   Household_Ledger.HouseholdSavings via setValues (own-tab; money loop
 *     and migrationTracking read that sheet later in Phase 5)
 *
 * Does not write Tier, RoleType, EmployerBizId, CareerStage,
 * Initiative_Tracker, DialState, Undocked_Feed, or Oakland_Sports_Feed.
 *
 * In-world money only. Fourth wall: no adapter / feed / cycle-fire copy.
 */

var CASINO_TAB = 'Casino_Ledger';
var CASINO_HOUSE_BIZ = 'BIZ-00100';
var CASINO_HOUSE_ID = 'HOUSE';
var CASINO_HOUSE_SEED = 250000;
var CASINO_JUICE = 1.83;
var CASINO_JUICE_FACTOR = CASINO_JUICE / 2;
var CASINO_DEBT_MAX = 6;
var CASINO_STAKE_FLOOR = 20;
var CASINO_STAKE_CEIL = 2000;
var CASINO_NW_FLOOR = 1000;
var CASINO_COOL_LOSSES = 3;
var CASINO_COOL_CYCLES = 3;
var CASINO_BIG_LOSS = 0.5;
var CASINO_BIG_COOL = 2;
var CASINO_VOID_AFTER = 3;
var CASINO_SHRINK = 8;
var CASINO_ODDS_FLOOR = 1.40;
var CASINO_ODDS_CEIL = 8.00;
var CASINO_SPORTS_FLOOR = 1.05;
var CASINO_PLACE_P = 0.012;
var CASINO_RECORD_RE = /^\d+\s*[-–]\s*\d+$/;

var CASINO_HEADERS = [
  'WagerId', 'CyclePlaced', 'CycleSettled', 'POPID', 'HouseholdId',
  'MarketFamily', 'MarketId', 'EventId', 'Side', 'Stake', 'Odds',
  'Payout', 'Status', 'HouseFloatAfter', 'Seed'
];

var CASINO_ST = {
  OPEN: 'open',
  WIN: 'settled-win',
  LOSS: 'settled-loss',
  VOID_GATE: 'void-gate',
  VOID_HOUSE: 'void-house',
  VOID_DEATH: 'void-death'
};

function casinoClamp_(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function casinoRoundMoney_(n) {
  return Math.round(Number(n) || 0);
}

function casinoRoundOdds_(n) {
  return Math.round(n * 100) / 100;
}

function casinoJuicePrice_(fair) {
  return casinoRoundOdds_(fair * CASINO_JUICE_FACTOR);
}

function casinoSha1Hex_(s) {
  var str = String(s);
  if (typeof Utilities !== 'undefined' && Utilities.computeDigest) {
    var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, str);
    var hex = '';
    var i, b, h;
    for (i = 0; i < raw.length; i++) {
      b = raw[i];
      if (b < 0) b += 256;
      h = b.toString(16);
      hex += (h.length === 1 ? '0' : '') + h;
    }
    return hex.slice(0, 16);
  }
  if (typeof require === 'function') {
    return require('crypto').createHash('sha1').update(str).digest('hex').slice(0, 16);
  }
  throw new Error('casinoSha1Hex_: no digest available');
}

function casinoWagerId_(placeCycle, popId, marketId, eventId) {
  return casinoSha1Hex_([placeCycle, popId, marketId, eventId].join('|'));
}

function casinoWeekly_(income) {
  return (Number(income) || 0) / 52;
}

function casinoTeamsMatch_(teamsUsed, franchiseId) {
  var raw = String(teamsUsed || '').toLowerCase();
  if (!raw) return false;
  if (franchiseId === 'as') {
    return raw.indexOf("a's") >= 0 || raw.indexOf('athletics') >= 0 ||
      raw.indexOf(' as') >= 0 || raw === 'as' || raw.indexOf("a'") >= 0;
  }
  if (franchiseId === 'oaks') return raw.indexOf('oaks') >= 0;
  return false;
}

function casinoParseStreak_(streak) {
  var m = /^([WL])(\d+)$/i.exec(String(streak || '').trim());
  if (!m) return null;
  return { win: m[1].toUpperCase() === 'W', n: Number(m[2]) };
}

function casinoParseSports_(feedEntries, franchiseId) {
  var rows = feedEntries || [];
  var i, e, wl;
  for (i = 0; i < rows.length; i++) {
    e = rows[i];
    if (String(e.eventType || '').toLowerCase() !== 'game-result') continue;
    if (!casinoTeamsMatch_(e.teamsUsed, franchiseId)) continue;
    wl = casinoParseStreak_(e.streak);
    if (!wl) continue;
    return {
      kind: 'settle',
      franchiseWon: wl.win,
      eventId: [e.cycle, e.teamsUsed, e.streak].join('|'),
      teamRecord: e.teamRecord
    };
  }
  return { kind: 'carry' };
}

function casinoFindEpisode_(feed, episodeId) {
  var id = String(episodeId || '').trim();
  if (!id) return null;
  var rows = feed || [];
  var i;
  for (i = 0; i < rows.length; i++) {
    if (String(rows[i].episodeId || '').trim() === id) return rows[i];
  }
  return null;
}

function casinoNightWinner_(feed) {
  var rows = feed || [];
  var best = null;
  var i, e, n, pop;
  for (i = 0; i < rows.length; i++) {
    e = rows[i];
    if (e.creditsDelta == null || e.creditsDelta === '') continue;
    n = Number(e.creditsDelta);
    if (isNaN(n)) continue;
    pop = String(e.popId || '').trim().toUpperCase();
    if (!best || n > best.creditsDelta || (n === best.creditsDelta && pop < best.popId)) {
      best = { popId: pop, creditsDelta: n, episodeId: e.episodeId };
    }
  }
  return best;
}

function casinoResolveUndocked_(wager, feed) {
  var market = String(wager.marketId || '');
  if (market === 'night_winner') {
    var winner = casinoNightWinner_(feed);
    if (!winner) return { status: CASINO_ST.VOID_GATE };
    return {
      status: String(wager.side || '').trim().toUpperCase() === winner.popId ? CASINO_ST.WIN : CASINO_ST.LOSS,
      eventId: winner.episodeId
    };
  }
  var ep = casinoFindEpisode_(feed, wager.eventId);
  if (!ep) return { status: 'carry' };
  if (market === 'credits_sign') {
    if (ep.creditsDelta == null || ep.creditsDelta === '') return { status: CASINO_ST.VOID_GATE };
    var d = Number(ep.creditsDelta);
    if (isNaN(d)) return { status: CASINO_ST.VOID_GATE };
    var wantPos = String(wager.side || '') === 'pos';
    return { status: wantPos === (d > 0) ? CASINO_ST.WIN : CASINO_ST.LOSS, eventId: ep.episodeId };
  }
  if (market === 'mishap') {
    if (ep.mishapCount == null || ep.mishapCount === '') return { status: CASINO_ST.VOID_GATE };
    var m = Number(ep.mishapCount);
    if (isNaN(m)) return { status: CASINO_ST.VOID_GATE };
    var wantYes = String(wager.side || '') === 'yes';
    return { status: wantYes === (m > 0) ? CASINO_ST.WIN : CASINO_ST.LOSS, eventId: ep.episodeId };
  }
  return { status: CASINO_ST.VOID_GATE };
}

function casinoResolveSports_(wager, feed) {
  var fid = wager.franchiseId || (String(wager.marketId || '').indexOf('oaks') >= 0 ? 'oaks' : 'as');
  var parsed = casinoParseSports_(feed, fid);
  if (parsed.kind === 'carry') return { status: 'carry' };
  var wantWin = String(wager.side || '') === 'win';
  return {
    status: wantWin === parsed.franchiseWon ? CASINO_ST.WIN : CASINO_ST.LOSS,
    eventId: parsed.eventId
  };
}

function casinoResolve_(wager, feeds) {
  feeds = feeds || {};
  if (wager.status && wager.status !== CASINO_ST.OPEN) {
    return { status: wager.status, alreadySettled: true };
  }
  if (wager.marketFamily === 'undocked') return casinoResolveUndocked_(wager, feeds.undocked || []);
  if (wager.marketFamily === 'sports') return casinoResolveSports_(wager, feeds.sports || []);
  return { status: CASINO_ST.VOID_GATE };
}

function casinoApplyMoney_(nw, debt, stake, payout, won) {
  nw = Number(nw) || 0;
  debt = Number(debt) || 0;
  if (won) return { netWorth: nw + payout, debtLevel: debt, delta: payout };
  var next = nw - stake;
  if (next < 0) {
    next = 0;
    debt = Math.min(CASINO_DEBT_MAX, debt + 1);
  }
  return { netWorth: next, debtLevel: debt, delta: next - nw };
}

function casinoHouseholdDelta_(weekly, stake, payout, won, savings) {
  weekly = Number(weekly) || 0;
  savings = Number(savings) || 0;
  var amount = won ? payout : stake;
  if (!(amount >= weekly) || weekly <= 0) return { householdSavings: savings, applied: 0 };
  if (won) return { householdSavings: savings + payout, applied: payout };
  var cut = Math.min(savings, stake);
  return { householdSavings: savings - cut, applied: -cut };
}

function casinoOddsCredits_() {
  return { pos: CASINO_JUICE, neg: CASINO_JUICE };
}

function casinoOddsSports_(teamRecord) {
  var s = String(teamRecord || '').trim();
  if (!CASINO_RECORD_RE.test(s)) return { win: CASINO_JUICE, loss: CASINO_JUICE };
  var parts = s.split(/\s*[-–]\s*/);
  var w = Number(parts[0]), l = Number(parts[1]);
  if (!isFinite(w) || !isFinite(l) || w + l <= 0) return { win: CASINO_JUICE, loss: CASINO_JUICE };
  var p = (w + CASINO_SHRINK / 2) / (w + l + CASINO_SHRINK);
  p = casinoClamp_(p, 0.08, 0.92);
  return {
    win: casinoClamp_(casinoJuicePrice_(1 / p), CASINO_SPORTS_FLOOR, CASINO_ODDS_CEIL),
    loss: casinoClamp_(casinoJuicePrice_(1 / (1 - p)), CASINO_SPORTS_FLOOR, CASINO_ODDS_CEIL)
  };
}

function casinoPayout_(stake, odds) {
  return casinoRoundMoney_((Number(stake) || 0) * (Number(odds) || 0));
}

function casinoStake_(income, netWorth, wealthLevel, rng) {
  var weekly = casinoWeekly_(income);
  var nw = Number(netWorth) || 0;
  var wl = Number(wealthLevel);
  if (isNaN(wl)) wl = 5;
  var weekCap = weekly * (wl <= 3 ? 0.10 : 0.25);
  var cap = Math.min(weekCap, nw * 0.04, CASINO_STAKE_CEIL);
  if (!(cap >= CASINO_STAKE_FLOOR)) return null;
  var roll = typeof rng === 'function' ? rng() : 0.5;
  var raw = weekly * (0.08 + 0.12 * roll);
  return casinoRoundMoney_(casinoClamp_(raw, CASINO_STAKE_FLOOR, cap));
}

function casinoEligible_(status, age, income, netWorth, employerBizId, marketFamily, isPilot) {
  if (String(status || '').toLowerCase() !== 'active') return false;
  var st = String(status || '').toLowerCase();
  if (st === 'deceased' || st === 'traded' || st === 'pending') return false;
  if (!(Number(age) >= 18)) return false;
  if (!((Number(income) || 0) > 0 || (Number(netWorth) || 0) >= CASINO_NW_FLOOR)) return false;
  if (String(employerBizId || '').toUpperCase() === CASINO_HOUSE_BIZ) return false;
  if (marketFamily === 'undocked' && isPilot) return false;
  return true;
}

function casinoDrive_(dialState, traitProfile) {
  if (dialState) {
    try {
      var o = typeof dialState === 'string' ? JSON.parse(dialState) : dialState;
      var d = o && o.current && o.current.drive;
      if (typeof d === 'number') return d;
    } catch (e) { /* fall through */ }
  }
  var m = String(traitProfile || '').match(/drive:(\d+)/i);
  if (m) return Number(m[1]);
  return 50;
}

function casinoStamp_(cycle) {
  return 'Y' + (Math.floor((cycle - 1) / 52) + 1) + 'C' + (((cycle - 1) % 52) + 1);
}

function casinoLine_(status) {
  if (status === CASINO_ST.WIN) return '[Casino] the window paid — the week changed color';
  if (status === CASINO_ST.LOSS) return '[Casino] the slip came back empty';
  if (status === CASINO_ST.VOID_HOUSE) return '[Casino] the window closed before the slip paid';
  return null;
}

function casinoCol_(header, name) {
  return header.indexOf(name);
}

function casinoUpcoming_(ss, cycle) {
  if (!ss) return [];
  var sheet = ss.getSheetByName('Undocked_Feed');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (!data || data.length < 2) return [];
  var h = data[0];
  var iTarget = casinoCol_(h, 'TargetCycle');
  var iPop = casinoCol_(h, 'POPID');
  var iEp = casinoCol_(h, 'EpisodeId');
  if (iTarget < 0 || iPop < 0 || iEp < 0) return [];
  var out = [];
  var r, row, pop, ep;
  for (r = 1; r < data.length; r++) {
    row = data[r];
    if (Number(row[iTarget]) !== cycle + 1) continue;
    pop = String(row[iPop] == null ? '' : row[iPop]).trim().toUpperCase();
    ep = String(row[iEp] == null ? '' : row[iEp]).trim();
    if (!pop || !ep) continue;
    out.push({ popId: pop, episodeId: ep, targetCycle: cycle + 1 });
  }
  return out;
}

function casinoCooldown_(history, cycle, weekly) {
  history = history || [];
  var settled = [];
  var i;
  for (i = 0; i < history.length; i++) {
    if (history[i].status === CASINO_ST.WIN || history[i].status === CASINO_ST.LOSS) {
      settled.push(history[i]);
    }
  }
  var until = 0;
  if (settled.length >= CASINO_COOL_LOSSES) {
    var last = settled.slice(-CASINO_COOL_LOSSES);
    var allLoss = true;
    for (i = 0; i < last.length; i++) {
      if (last[i].status !== CASINO_ST.LOSS) { allLoss = false; break; }
    }
    if (allLoss) until = (Number(last[last.length - 1].cycleSettled) || cycle) + CASINO_COOL_CYCLES;
  }
  var newest = settled[settled.length - 1];
  if (newest && newest.status === CASINO_ST.LOSS) {
    if (weekly > 0 && (Number(newest.stake) || 0) >= weekly * CASINO_BIG_LOSS) {
      until = Math.max(until, cycle + CASINO_BIG_COOL);
    }
  }
  return until;
}

/**
 * Phase-5 entry. Missing tab → no-op. Never creates Casino_Ledger.
 */
function processCasinoLedger_(ctx, cycle) {
  var results = { settled: 0, placed: 0, carried: 0, voided: 0, skipped: 0, missingTab: false };
  if (!ctx || !ctx.ledger) {
    throw new Error('processCasinoLedger_: ctx.ledger not initialized');
  }
  var ss = ctx.ss;
  if (!ss) {
    results.skipped++;
    return results;
  }
  var sheet = ss.getSheetByName(CASINO_TAB);
  if (!sheet) {
    results.missingTab = true;
    Logger.log('processCasinoLedger_: Casino_Ledger missing — no-op (4b not armed)');
    return results;
  }

  var data = sheet.getDataRange().getValues();
  if (!data || !data.length) {
    results.missingTab = true;
    return results;
  }
  var header = data[0];
  var iWid = casinoCol_(header, 'WagerId');
  var iPlaced = casinoCol_(header, 'CyclePlaced');
  var iSettled = casinoCol_(header, 'CycleSettled');
  var iPop = casinoCol_(header, 'POPID');
  var iHH = casinoCol_(header, 'HouseholdId');
  var iFam = casinoCol_(header, 'MarketFamily');
  var iMkt = casinoCol_(header, 'MarketId');
  var iEv = casinoCol_(header, 'EventId');
  var iSide = casinoCol_(header, 'Side');
  var iStake = casinoCol_(header, 'Stake');
  var iOdds = casinoCol_(header, 'Odds');
  var iPay = casinoCol_(header, 'Payout');
  var iStat = casinoCol_(header, 'Status');
  var iFloat = casinoCol_(header, 'HouseFloatAfter');
  if (iWid < 0 || iStat < 0) {
    Logger.log('processCasinoLedger_: Casino_Ledger headers malformed — no-op');
    return results;
  }

  var S = ctx.summary || (ctx.summary = {});
  var feeds = {
    undocked: S.undockedFeedEntries || [],
    sports: S.sportsFeedEntries || []
  };
  var pilots = S.undockedPilots || {};
  var upcoming = casinoUpcoming_(ss, cycle);
  var upcomingPilots = {};
  var u;
  for (u = 0; u < upcoming.length; u++) upcomingPilots[upcoming[u].popId] = true;

  var houseFloat = CASINO_HOUSE_SEED;
  var houseRow = -1;
  var open = [];
  var historyByPop = {};
  var hasOpen = {};
  var r, row, wid, st, pop, rec;
  for (r = 1; r < data.length; r++) {
    row = data[r];
    wid = String(row[iWid] || '').trim();
    if (!wid) continue;
    if (wid === CASINO_HOUSE_ID) {
      houseRow = r + 1;
      if (iFloat >= 0 && row[iFloat] !== '' && row[iFloat] != null) {
        houseFloat = Number(row[iFloat]) || CASINO_HOUSE_SEED;
      }
      continue;
    }
    st = String(row[iStat] || '').trim();
    pop = String(iPop >= 0 ? row[iPop] : '').trim().toUpperCase();
    rec = {
      sheetRow: r + 1,
      wagerId: wid,
      cyclePlaced: iPlaced >= 0 ? Number(row[iPlaced]) || 0 : 0,
      cycleSettled: iSettled >= 0 ? Number(row[iSettled]) || 0 : 0,
      popId: pop,
      householdId: iHH >= 0 ? String(row[iHH] || '').trim() : '',
      marketFamily: iFam >= 0 ? String(row[iFam] || '') : '',
      marketId: iMkt >= 0 ? String(row[iMkt] || '') : '',
      eventId: iEv >= 0 ? String(row[iEv] || '') : '',
      side: iSide >= 0 ? String(row[iSide] || '') : '',
      stake: iStake >= 0 ? Number(row[iStake]) || 0 : 0,
      odds: iOdds >= 0 ? Number(row[iOdds]) || 0 : 0,
      status: st
    };
    if (!historyByPop[pop]) historyByPop[pop] = [];
    historyByPop[pop].push(rec);
    if (st === CASINO_ST.OPEN) {
      open.push(rec);
      hasOpen[pop] = true;
    }
  }

  var lHeader = ctx.ledger.headers;
  var lRows = ctx.ledger.rows;
  var li = function (n) { return lHeader.indexOf(n); };
  var iLP = li('POPID'), iStatus = li('Status'), iBirth = li('BirthYear');
  var iInc = li('Income'), iNW = li('NetWorth'), iDebt = li('DebtLevel');
  var iLife = li('LifeHistory'), iWL = li('WealthLevel'), iEmp = li('EmployerBizId');
  var iHid = li('HouseholdId'), iDial = li('DialState'), iTrait = li('TraitProfile');
  var iFirst = li('First'), iLast = li('Last'), iHood = li('Neighborhood');
  if (iLP < 0 || iNW < 0) return results;

  var byPop = {};
  var ageYear = 2041;
  if (S.simulationYear) ageYear = Number(S.simulationYear) || 2041;
  else if (S.simYear) ageYear = 2040 + (Number(S.simYear) || 1);
  var c, crow, pid, age;
  for (c = 0; c < lRows.length; c++) {
    crow = lRows[c];
    pid = String(crow[iLP] || '').trim().toUpperCase();
    if (pid) byPop[pid] = { row: crow, idx: c };
  }

  function writeWagerCells_(sheetRow, fields) {
    var k, col, map;
    map = {
      CycleSettled: iSettled, Status: iStat, Payout: iPay,
      HouseFloatAfter: iFloat, EventId: iEv
    };
    for (k in fields) {
      if (!fields.hasOwnProperty(k)) continue;
      col = map[k];
      if (col >= 0 && typeof queueCellIntent_ === 'function') {
        queueCellIntent_(ctx, CASINO_TAB, sheetRow, col + 1, fields[k],
          'casino ' + k, 'casino', 100);
      }
    }
  }

  open.sort(function (a, b) {
    return String(a.wagerId).localeCompare(String(b.wagerId));
  });

  var resolved = [];
  var i, w, outcome, citizen;
  for (i = 0; i < open.length; i++) {
    w = open[i];
    if (w.cyclePlaced > 0 && cycle - w.cyclePlaced >= CASINO_VOID_AFTER) {
      resolved.push({ wager: w, outcome: { status: CASINO_ST.VOID_GATE } });
      continue;
    }
    citizen = byPop[w.popId];
    if (citizen && iStatus >= 0 &&
        String(citizen.row[iStatus] || '').toLowerCase() === 'deceased') {
      resolved.push({ wager: w, outcome: { status: CASINO_ST.VOID_DEATH } });
      continue;
    }
    resolved.push({ wager: w, outcome: casinoResolve_(w, feeds) });
  }

  for (i = 0; i < resolved.length; i++) {
    if (resolved[i].outcome.status === CASINO_ST.LOSS) {
      houseFloat += Number(resolved[i].wager.stake) || 0;
    }
  }
  if (houseFloat > CASINO_HOUSE_SEED) houseFloat = CASINO_HOUSE_SEED;

  var hhSheet = ss.getSheetByName('Household_Ledger');
  var hhVals = null, hhHead = null, hhSavCol = -1, hhIdCol = -1, hhDirty = false;
  if (hhSheet) {
    hhVals = hhSheet.getDataRange().getValues();
    hhHead = hhVals[0] || [];
    hhSavCol = casinoCol_(hhHead, 'HouseholdSavings');
    hhIdCol = casinoCol_(hhHead, 'HouseholdId');
  }

  S.casinoSettlements = S.casinoSettlements || {};
  var stamp = casinoStamp_(cycle);
  var rng = safeRand_(ctx);

  for (i = 0; i < resolved.length; i++) {
    w = resolved[i].wager;
    outcome = resolved[i].outcome;
    st = outcome.status;
    citizen = byPop[w.popId];

    if (st === 'carry') {
      results.carried++;
      continue;
    }
    if (st === CASINO_ST.VOID_GATE || st === CASINO_ST.VOID_DEATH) {
      writeWagerCells_(w.sheetRow, {
        CycleSettled: cycle, Status: st, Payout: 0, HouseFloatAfter: houseFloat
      });
      results.voided++;
      continue;
    }

    var pay = 0;
    var won = st === CASINO_ST.WIN;
    if (won) {
      pay = casinoPayout_(w.stake, w.odds);
      if (pay > houseFloat) {
        writeWagerCells_(w.sheetRow, {
          CycleSettled: cycle, Status: CASINO_ST.VOID_HOUSE, Payout: 0,
          HouseFloatAfter: houseFloat, EventId: outcome.eventId || w.eventId
        });
        if (citizen && iLife >= 0) {
          var vLine = stamp + ' — ' + casinoLine_(CASINO_ST.VOID_HOUSE);
          citizen.row[iLife] = citizen.row[iLife] ? citizen.row[iLife] + '\n' + vLine : vLine;
          ctx.ledger.dirty = true;
        }
        results.voided++;
        continue;
      }
      houseFloat -= pay;
    }

    if (citizen && iNW >= 0) {
      var weekly = casinoWeekly_(iInc >= 0 ? citizen.row[iInc] : 0);
      var money = casinoApplyMoney_(citizen.row[iNW], iDebt >= 0 ? citizen.row[iDebt] : 0,
        w.stake, pay, won);
      citizen.row[iNW] = money.netWorth;
      if (iDebt >= 0) citizen.row[iDebt] = money.debtLevel;
      var lineTag = casinoLine_(won ? CASINO_ST.WIN : CASINO_ST.LOSS);
      if (!won && money.debtLevel > (Number(w.debtLevel) || 0) && money.netWorth === 0) {
        lineTag = '[Casino] the window took the last of it — borrowed to walk home';
      }
      if (lineTag && iLife >= 0) {
        var line = stamp + ' — ' + lineTag;
        citizen.row[iLife] = citizen.row[iLife] ? citizen.row[iLife] + '\n' + line : line;
      }
      ctx.ledger.dirty = true;

      if (hhVals && hhSavCol >= 0 && hhIdCol >= 0 && w.householdId) {
        var hhDelta = casinoHouseholdDelta_(weekly, w.stake, pay, won, 0);
        if (hhDelta.applied !== 0) {
          var hr;
          for (hr = 1; hr < hhVals.length; hr++) {
            if (String(hhVals[hr][hhIdCol] || '').trim() === w.householdId) {
              var sav = Number(hhVals[hr][hhSavCol]) || 0;
              var applied = casinoHouseholdDelta_(weekly, w.stake, pay, won, sav);
              hhVals[hr][hhSavCol] = applied.householdSavings;
              hhDirty = true;
              break;
            }
          }
        }
      }

      if ((won ? pay : w.stake) >= weekly * 0.5) {
        S.storyHooks = S.storyHooks || [];
        S.storyHooks.push({
          hookType: won ? 'CASINO_WIN' : (money.netWorth === 0 ? 'CASINO_DEBT' : 'CASINO_LOSS'),
          severity: 3, priority: 3,
          description: ((iFirst >= 0 ? citizen.row[iFirst] : '') + ' ' +
            (iLast >= 0 ? citizen.row[iLast] : '')).trim() + ' — the window',
          cycleGenerated: cycle,
          neighborhood: iHood >= 0 ? (citizen.row[iHood] || '') : '',
          domain: 'COMMUNITY',
          text: lineTag || ''
        });
      }
      S.casinoSettlements[w.popId] = won ? 'win' : 'loss';
    }

    writeWagerCells_(w.sheetRow, {
      CycleSettled: cycle,
      Status: won ? CASINO_ST.WIN : CASINO_ST.LOSS,
      Payout: won ? pay : 0,
      HouseFloatAfter: houseFloat,
      EventId: outcome.eventId || w.eventId
    });
    results.settled++;
  }

  if (houseRow >= 0 && iFloat >= 0 && typeof queueCellIntent_ === 'function') {
    queueCellIntent_(ctx, CASINO_TAB, houseRow, iFloat + 1, houseFloat,
      'casino house float', 'casino', 90);
  } else if (houseRow < 0 && typeof queueAppendIntent_ === 'function') {
    var houseArr = [];
    var hi;
    for (hi = 0; hi < CASINO_HEADERS.length; hi++) houseArr.push('');
    houseArr[0] = CASINO_HOUSE_ID;
    if (iStat >= 0) houseArr[iStat] = 'house';
    if (iFloat >= 0) houseArr[iFloat] = houseFloat;
    queueAppendIntent_(ctx, CASINO_TAB, houseArr, 'casino house row', 'casino', 90);
  }

  if (hhDirty && hhVals && hhVals.length > 1) {
    hhSheet.getRange(2, 1, hhVals.length - 1, hhVals[0].length)
      .setValues(hhVals.slice(1));
  }

  // Placement against NEXT cycle only — this cycle's outcomes are already known.
  var showOn = upcoming.length > 0;
  var sportsAs = { marketId: 'sports:as', franchiseId: 'as', eventId: 'next-as' };
  var lastSportsRecord = '';
  if (feeds.sports && feeds.sports.length) {
    lastSportsRecord = feeds.sports[feeds.sports.length - 1].teamRecord || '';
  }
  var sportsOdds = casinoOddsSports_(lastSportsRecord);
  var credOdds = casinoOddsCredits_();

  for (c = 0; c < lRows.length; c++) {
    crow = lRows[c];
    pid = String(crow[iLP] || '').trim().toUpperCase();
    if (!pid || hasOpen[pid]) continue;
    var status = iStatus >= 0 ? crow[iStatus] : 'active';
    var by = iBirth >= 0 ? Number(crow[iBirth]) || 0 : 0;
    age = by > 0 ? ageYear - by : 0;
    var income = iInc >= 0 ? Number(crow[iInc]) || 0 : 0;
    var nw = iNW >= 0 ? Number(crow[iNW]) || 0 : 0;
    var emp = iEmp >= 0 ? crow[iEmp] : '';
    var isPilot = !!(pilots[pid] || upcomingPilots[pid]);
    var weeklyP = casinoWeekly_(income);
    var cool = casinoCooldown_(historyByPop[pid], cycle, weeklyP);
    if (cool > cycle) continue;

    var drive = casinoDrive_(iDial >= 0 ? crow[iDial] : '', iTrait >= 0 ? crow[iTrait] : '');
    var driveF = drive >= 60 ? 1.4 : 1.0;
    var wantShow = showOn && casinoEligible_(status, age, income, nw, emp, 'undocked', isPilot);
    var wantSports = casinoEligible_(status, age, income, nw, emp, 'sports', isPilot);
    if (!wantShow && !wantSports) continue;

    var showF = wantShow ? 1.5 : 1.0;
    var sportsF = wantSports ? 1.3 : 1.0;
    var p = CASINO_PLACE_P * driveF * (wantShow ? showF : 1) * (wantSports ? sportsF : 1);
    if (rng() >= p) continue;

    var pickShow = wantShow && (!wantSports || rng() < 0.5);
    var stake = casinoStake_(income, nw, iWL >= 0 ? crow[iWL] : 5, rng);
    if (stake == null) continue;

    var fam, mkt, ev, side, odds, seed;
    seed = String(rng());
    if (pickShow) {
      fam = 'undocked';
      var epPick = upcoming[Math.floor(rng() * upcoming.length)];
      var kindRoll = rng();
      if (kindRoll < 0.55) {
        mkt = 'credits_sign';
        ev = epPick.episodeId;
        side = rng() < 0.5 ? 'pos' : 'neg';
        odds = side === 'pos' ? credOdds.pos : credOdds.neg;
      } else if (kindRoll < 0.85) {
        mkt = 'mishap';
        ev = epPick.episodeId;
        side = rng() < 0.5 ? 'yes' : 'no';
        odds = CASINO_JUICE;
      } else {
        mkt = 'night_winner';
        ev = 'night-' + (cycle + 1);
        side = epPick.popId;
        odds = casinoClamp_(casinoJuicePrice_(Math.max(1, upcoming.length)), CASINO_ODDS_FLOOR, CASINO_ODDS_CEIL);
      }
    } else {
      fam = 'sports';
      mkt = 'sports:as';
      ev = 'next-as';
      side = rng() < 0.55 ? 'win' : 'loss';
      odds = side === 'win' ? sportsOdds.win : sportsOdds.loss;
    }

    var newId = casinoWagerId_(cycle, pid, mkt, ev);
    var arr = [];
    for (hi = 0; hi < CASINO_HEADERS.length; hi++) arr.push('');
    function setH(name, val) {
      var col = casinoCol_(CASINO_HEADERS, name);
      if (col >= 0) arr[col] = val;
    }
    setH('WagerId', newId);
    setH('CyclePlaced', cycle);
    setH('POPID', pid);
    setH('HouseholdId', iHid >= 0 ? (crow[iHid] || '') : '');
    setH('MarketFamily', fam);
    setH('MarketId', mkt);
    setH('EventId', ev);
    setH('Side', side);
    setH('Stake', stake);
    setH('Odds', odds);
    setH('Payout', 0);
    setH('Status', CASINO_ST.OPEN);
    setH('HouseFloatAfter', houseFloat);
    setH('Seed', seed);
    if (typeof queueAppendIntent_ === 'function') {
      queueAppendIntent_(ctx, CASINO_TAB, arr, 'casino place ' + pid, 'casino', 100);
    }
    hasOpen[pid] = true;
    results.placed++;
  }

  Logger.log('processCasinoLedger_: settled ' + results.settled +
    ' placed ' + results.placed + ' carried ' + results.carried +
    ' voided ' + results.voided + ' float ' + houseFloat);
  return results;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    processCasinoLedger_: processCasinoLedger_,
    casinoResolve_: casinoResolve_,
    casinoParseSports_: casinoParseSports_,
    casinoApplyMoney_: casinoApplyMoney_,
    casinoEligible_: casinoEligible_,
    casinoStake_: casinoStake_,
    casinoWagerId_: casinoWagerId_,
    CASINO_HEADERS: CASINO_HEADERS,
    CASINO_HOUSE_BIZ: CASINO_HOUSE_BIZ,
    CASINO_ST: CASINO_ST
  };
}
