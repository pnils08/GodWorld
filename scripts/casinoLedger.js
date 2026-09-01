'use strict';

/**
 * casinoLedger.js — pure 4b settlement helpers (no Sheet, no engine, no rng
 * of its own). Engine port: phase05-citizens/casinoLedgerEngine.js
 * Spec: docs/for-claude-review/2026-08-31-grok-casino-ledger.md
 *
 *   node scripts/casinoLedger.test.js
 *
 * In-world money only. Tests use POP-TEST-* fixtures. Never invent bettors.
 */

const crypto = require('crypto');
const { TEAM_CONFIG } = require('./sportsFeedContract');

// Same shape as sportsFeedContract.js RECORD_RE — copied, not imported, so
// this helper does not become a new sports-contract consumer.
const RECORD_RE = /^\d+\s*[-–]\s*\d+$/;

const HOUSE_BIZ = 'BIZ-00100';
const HOUSE_SEED = 250000;
const JUICE = 1.83;                 // even-money with juice (true even is 2.00)
const JUICE_FACTOR = JUICE / 2;
const DEBT_MAX = 6;
const STAKE_FLOOR = 20;
const STAKE_CEIL = 2000;
const NETWORTH_FLOOR = 1000;        // solvency if Income is 0
const COOLDOWN_LOSSES = 3;
const COOLDOWN_CYCLES = 3;
const BIG_LOSS_WEEKLY = 0.5;
const BIG_LOSS_COOLDOWN = 2;
const VOID_AFTER_CYCLES = 3;
const SHRINK_GAMES = 8;
const ODDS_FLOOR = 1.40;
const ODDS_CEIL = 8.00;
const SPORTS_ODDS_FLOOR = 1.05;

const STATUS = {
  OPEN: 'open',
  WIN: 'settled-win',
  LOSS: 'settled-loss',
  VOID_GATE: 'void-gate',
  VOID_HOUSE: 'void-house',
  VOID_DEATH: 'void-death',
  REFUNDED: 'refunded',
  CARRY: 'carry',
};

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function roundMoney(n) {
  return Math.round(Number(n) || 0);
}

function wagerId(placeCycle, popId, marketId, eventId) {
  return crypto
    .createHash('sha1')
    .update([placeCycle, popId, marketId, eventId].join('|'))
    .digest('hex')
    .slice(0, 16);
}

function weeklyIncome(income) {
  return (Number(income) || 0) / 52;
}

function isAdult(citizen, currentYear) {
  var year = currentYear || 2041;
  if (citizen.age != null && citizen.age !== '') return Number(citizen.age) >= 18;
  if (citizen.birthYear) return (year - Number(citizen.birthYear)) >= 18;
  return false;
}

function deadStatus(status) {
  var s = String(status || '').toLowerCase();
  return s === 'deceased' || s === 'traded' || s === 'pending';
}

function isEligible(citizen, marketFamily, opts) {
  opts = opts || {};
  if (!citizen) return false;
  if (String(citizen.status || '').toLowerCase() !== 'active') return false;
  if (deadStatus(citizen.status)) return false;
  if (!isAdult(citizen, opts.currentYear)) return false;
  var income = Number(citizen.income) || 0;
  var nw = Number(citizen.netWorth) || 0;
  if (!(income > 0 || nw >= NETWORTH_FLOOR)) return false;
  if (String(citizen.employerBizId || '').toUpperCase() === HOUSE_BIZ) return false;
  if (marketFamily === 'undocked' && opts.isPilot) return false;
  return true;
}

function computeStake(citizen, rng) {
  var weekly = weeklyIncome(citizen.income);
  var nw = Number(citizen.netWorth) || 0;
  var wl = Number(citizen.wealthLevel);
  if (isNaN(wl)) wl = 5;
  var weekCap = weekly * (wl <= 3 ? 0.10 : 0.25);
  var cap = Math.min(weekCap, nw * 0.04, STAKE_CEIL);
  if (!(cap >= STAKE_FLOOR)) return null;
  var roll = typeof rng === 'function' ? rng() : 0.5;
  var raw = weekly * (0.08 + 0.12 * roll);
  return roundMoney(clamp(raw, STAKE_FLOOR, cap));
}

function juicePrice(fairDecimal) {
  return roundOdds(fairDecimal * JUICE_FACTOR);
}

function roundOdds(n) {
  return Math.round(n * 100) / 100;
}

function oddsCreditsSign() {
  return { pos: JUICE, neg: JUICE };
}

function oddsMishap(mishapTotal, episodes) {
  var p = episodes > 0 ? Number(mishapTotal) / Number(episodes) : 0.5;
  p = clamp(p, 0.05, 0.80);
  return {
    yes: clamp(juicePrice(1 / p), ODDS_FLOOR, ODDS_CEIL),
    no: clamp(juicePrice(1 / (1 - p)), ODDS_FLOOR, ODDS_CEIL),
  };
}

function oddsNightWinner(fieldSize) {
  var n = Math.max(1, Number(fieldSize) || 1);
  var o = clamp(juicePrice(n), ODDS_FLOOR, ODDS_CEIL);
  return { win: o };
}

function parseRecord(raw) {
  var s = String(raw || '').trim();
  if (!RECORD_RE.test(s)) return null;
  var parts = s.split(/\s*[-–]\s*/);
  var w = Number(parts[0]), l = Number(parts[1]);
  if (!isFinite(w) || !isFinite(l) || w + l <= 0) return null;
  return { wins: w, losses: l };
}

function oddsSportsMoneyline(teamRecord) {
  var rec = parseRecord(teamRecord);
  if (!rec) return { win: JUICE, loss: JUICE };
  var p = (rec.wins + SHRINK_GAMES / 2) / (rec.wins + rec.losses + SHRINK_GAMES);
  p = clamp(p, 0.08, 0.92);
  return {
    win: clamp(juicePrice(1 / p), SPORTS_ODDS_FLOOR, ODDS_CEIL),
    loss: clamp(juicePrice(1 / (1 - p)), SPORTS_ODDS_FLOOR, ODDS_CEIL),
  };
}

function payoutFor(stake, odds) {
  return roundMoney((Number(stake) || 0) * (Number(odds) || 0));
}

function franchiseAliases(franchiseId) {
  var cfg = TEAM_CONFIG[franchiseId];
  if (!cfg) return [];
  var out = [cfg.id, cfg.label, cfg.sheetValue].concat(cfg.aliases || []);
  return out.map(function (s) { return String(s).toLowerCase(); });
}

function teamsMatchFranchise(teamsUsed, franchiseId) {
  var raw = String(teamsUsed || '').toLowerCase();
  if (!raw) return false;
  var aliases = franchiseAliases(franchiseId);
  for (var i = 0; i < aliases.length; i++) {
    if (aliases[i] && raw.indexOf(aliases[i]) !== -1) return true;
  }
  return false;
}

function parseStreakWL(streak) {
  var m = /^([WL])(\d+)$/i.exec(String(streak || '').trim());
  if (!m) return null;
  return { win: m[1].toUpperCase() === 'W', n: Number(m[2]) };
}

function sportsEventId(entry) {
  return [entry.cycle, entry.teamsUsed, entry.streak].join('|');
}

function parseSportsMoneyline(feedEntries, franchiseId) {
  var rows = feedEntries || [];
  for (var i = 0; i < rows.length; i++) {
    var e = rows[i];
    if (String(e.eventType || '').toLowerCase() !== 'game-result') continue;
    if (!teamsMatchFranchise(e.teamsUsed, franchiseId)) continue;
    var wl = parseStreakWL(e.streak);
    if (!wl) continue;
    return {
      kind: 'settle',
      franchiseWon: wl.win,
      eventId: sportsEventId(e),
      entry: e,
    };
  }
  return { kind: 'carry' };
}

function findEpisode(feedEntries, episodeId) {
  var id = String(episodeId || '').trim();
  if (!id) return null;
  var rows = feedEntries || [];
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].episodeId || '').trim() === id) return rows[i];
  }
  return null;
}

function nightWinner(feedEntries) {
  var rows = feedEntries || [];
  var best = null;
  for (var i = 0; i < rows.length; i++) {
    var e = rows[i];
    if (e.creditsDelta == null || e.creditsDelta === '') continue;
    var n = Number(e.creditsDelta);
    if (isNaN(n)) continue;
    var pop = String(e.popId || '').trim().toUpperCase();
    if (!best) {
      best = { popId: pop, creditsDelta: n, episodeId: e.episodeId };
      continue;
    }
    if (n > best.creditsDelta || (n === best.creditsDelta && pop < best.popId)) {
      best = { popId: pop, creditsDelta: n, episodeId: e.episodeId };
    }
  }
  return best;
}

function resolveUndocked(wager, feedEntries) {
  var market = String(wager.marketId || '');
  if (market === 'night_winner') {
    var winner = nightWinner(feedEntries);
    if (!winner) return { status: STATUS.VOID_GATE };
    var side = String(wager.side || '').trim().toUpperCase();
    return {
      status: side === winner.popId ? STATUS.WIN : STATUS.LOSS,
      eventId: winner.episodeId,
      fact: winner,
    };
  }
  var ep = findEpisode(feedEntries, wager.eventId);
  if (!ep) return { status: STATUS.CARRY };
  if (market === 'credits_sign') {
    if (ep.creditsDelta == null || ep.creditsDelta === '') return { status: STATUS.VOID_GATE };
    var d = Number(ep.creditsDelta);
    if (isNaN(d)) return { status: STATUS.VOID_GATE };
    var wantPos = String(wager.side || '') === 'pos';
    var isPos = d > 0;
    return { status: wantPos === isPos ? STATUS.WIN : STATUS.LOSS, eventId: ep.episodeId, fact: { creditsDelta: d } };
  }
  if (market === 'mishap') {
    if (ep.mishapCount == null || ep.mishapCount === '') return { status: STATUS.VOID_GATE };
    var m = Number(ep.mishapCount);
    if (isNaN(m)) return { status: STATUS.VOID_GATE };
    var wantYes = String(wager.side || '') === 'yes';
    var isYes = m > 0;
    return { status: wantYes === isYes ? STATUS.WIN : STATUS.LOSS, eventId: ep.episodeId, fact: { mishapCount: m } };
  }
  return { status: STATUS.VOID_GATE };
}

function resolveSports(wager, feedEntries) {
  var parsed = parseSportsMoneyline(feedEntries, wager.franchiseId || 'as');
  if (parsed.kind === 'carry') return { status: STATUS.CARRY };
  var wantWin = String(wager.side || '') === 'win';
  return {
    status: wantWin === parsed.franchiseWon ? STATUS.WIN : STATUS.LOSS,
    eventId: parsed.eventId,
    fact: parsed,
  };
}

function resolveOutcome(wager, feeds) {
  feeds = feeds || {};
  if (wager.status && wager.status !== STATUS.OPEN) {
    return { status: wager.status, alreadySettled: true };
  }
  if (wager.marketFamily === 'undocked') return resolveUndocked(wager, feeds.undocked || []);
  if (wager.marketFamily === 'sports') return resolveSports(wager, feeds.sports || []);
  return { status: STATUS.VOID_GATE };
}

function applyCitizenMoney(citizen, stake, payout, won) {
  var nw = Number(citizen.netWorth) || 0;
  var debt = Number(citizen.debtLevel) || 0;
  if (won) {
    return { netWorth: nw + payout, debtLevel: debt, delta: payout };
  }
  var next = nw - stake;
  if (next < 0) {
    next = 0;
    debt = Math.min(DEBT_MAX, debt + 1);
  }
  return { netWorth: next, debtLevel: debt, delta: next - nw };
}

function householdSavingsDelta(opts) {
  var weekly = Number(opts.weekly) || 0;
  var stake = Number(opts.stake) || 0;
  var payout = Number(opts.payout) || 0;
  var savings = Number(opts.householdSavings) || 0;
  var amount = opts.won ? payout : stake;
  if (!(amount >= weekly) || weekly <= 0) return { householdSavings: savings, applied: 0 };
  if (opts.won) return { householdSavings: savings + payout, applied: payout };
  var cut = Math.min(savings, stake);
  return { householdSavings: savings - cut, applied: -cut };
}

function ageOpenWager(wager, cycle) {
  var placed = Number(wager.cyclePlaced) || 0;
  if (placed > 0 && cycle - placed >= VOID_AFTER_CYCLES) return STATUS.VOID_GATE;
  return STATUS.OPEN;
}

function cooldownUntil(history, cycle, weekly) {
  history = history || [];
  var settled = history.filter(function (h) {
    return h.status === STATUS.WIN || h.status === STATUS.LOSS;
  });
  var last = settled.slice(-COOLDOWN_LOSSES);
  var until = 0;
  if (last.length === COOLDOWN_LOSSES && last.every(function (h) { return h.status === STATUS.LOSS; })) {
    until = (Number(last[last.length - 1].cycleSettled) || cycle) + COOLDOWN_CYCLES;
  }
  var newest = settled[settled.length - 1];
  if (newest && newest.status === STATUS.LOSS) {
    var lossAmt = Number(newest.stake) || 0;
    if (weekly > 0 && lossAmt >= weekly * BIG_LOSS_WEEKLY) {
      until = Math.max(until, cycle + BIG_LOSS_COOLDOWN);
    }
  }
  return until;
}

function isCooled(history, cycle, weekly) {
  return cooldownUntil(history, cycle, weekly) > cycle;
}

function settleBatch(openWagers, feeds, houseFloat, cycle) {
  var floatAmt = houseFloat == null ? HOUSE_SEED : Number(houseFloat);
  var sorted = (openWagers || []).slice().sort(function (a, b) {
    return String(a.wagerId || '').localeCompare(String(b.wagerId || ''));
  });
  var results = [];
  var i;
  var resolved = [];
  for (i = 0; i < sorted.length; i++) {
    var w = sorted[i];
    if (w.status && w.status !== STATUS.OPEN) {
      results.push({ wager: w, status: w.status, alreadySettled: true, money: null, houseFloat: floatAmt });
      continue;
    }
    if (ageOpenWager(w, cycle) === STATUS.VOID_GATE) {
      resolved.push({ wager: w, outcome: { status: STATUS.VOID_GATE } });
      continue;
    }
    resolved.push({ wager: w, outcome: resolveOutcome(w, feeds) });
  }

  for (i = 0; i < resolved.length; i++) {
    if (resolved[i].outcome.status === STATUS.LOSS) {
      floatAmt += Number(resolved[i].wager.stake) || 0;
    }
  }

  for (i = 0; i < resolved.length; i++) {
    var item = resolved[i];
    var st = item.outcome.status;
    if (st === STATUS.CARRY) {
      results.push({ wager: item.wager, status: STATUS.CARRY, money: null, houseFloat: floatAmt, eventId: item.outcome.eventId });
      continue;
    }
    if (st === STATUS.VOID_GATE || st === STATUS.VOID_DEATH) {
      results.push({ wager: item.wager, status: st, money: null, houseFloat: floatAmt });
      continue;
    }
    if (st === STATUS.LOSS) {
      var lost = applyCitizenMoney(
        { netWorth: item.wager.netWorth, debtLevel: item.wager.debtLevel },
        item.wager.stake, 0, false
      );
      var hhL = householdSavingsDelta({
        weekly: item.wager.weekly,
        stake: item.wager.stake,
        payout: 0,
        won: false,
        householdSavings: item.wager.householdSavings,
      });
      results.push({
        wager: item.wager,
        status: STATUS.LOSS,
        money: lost,
        household: hhL,
        houseFloat: floatAmt,
        eventId: item.outcome.eventId,
        payout: 0,
      });
      continue;
    }
    if (st === STATUS.WIN) {
      var pay = payoutFor(item.wager.stake, item.wager.odds);
      if (pay > floatAmt) {
        results.push({
          wager: item.wager,
          status: STATUS.VOID_HOUSE,
          money: null,
          houseFloat: floatAmt,
          eventId: item.outcome.eventId,
        });
        continue;
      }
      floatAmt -= pay;
      var won = applyCitizenMoney(
        { netWorth: item.wager.netWorth, debtLevel: item.wager.debtLevel },
        item.wager.stake, pay, true
      );
      var hhW = householdSavingsDelta({
        weekly: item.wager.weekly,
        stake: item.wager.stake,
        payout: pay,
        won: true,
        householdSavings: item.wager.householdSavings,
      });
      results.push({
        wager: item.wager,
        status: STATUS.WIN,
        money: won,
        household: hhW,
        houseFloat: floatAmt,
        eventId: item.outcome.eventId,
        payout: pay,
      });
    }
  }
  return { results: results, houseFloat: floatAmt };
}

module.exports = {
  HOUSE_BIZ, HOUSE_SEED, JUICE, DEBT_MAX, STAKE_FLOOR, STAKE_CEIL, SPORTS_ODDS_FLOOR, STATUS,
  clamp, roundMoney, wagerId, weeklyIncome, isEligible, computeStake,
  oddsCreditsSign, oddsMishap, oddsNightWinner, oddsSportsMoneyline,
  payoutFor, parseSportsMoneyline, nightWinner, resolveOutcome, resolveUndocked,
  resolveSports, applyCitizenMoney, householdSavingsDelta, cooldownUntil,
  isCooled, settleBatch, ageOpenWager, parseRecord, teamsMatchFranchise,
};
