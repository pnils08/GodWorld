'use strict';

/**
 * The newsroom's day is the Central-time calendar date, the clock the crontab
 * runs on. `new Date().toISOString().slice(0, 10)` is the UTC date, which is a
 * day ahead from 7 PM Central under CDT and from 6 PM under CST. The 18:15 write
 * wake read "tomorrow" after the Nov 1 2026 fall-back and died looking for a
 * fanout file that does not exist. Same zone as lib/mags.getCentralDate, with a
 * day offset and an injectable clock.
 */

const ZONE = 'America/Chicago';

// centralDate(daysBack = 0, now = new Date()) -> 'YYYY-MM-DD' (Central calendar date)
function centralDate(daysBack, now) {
  const base = (now instanceof Date ? now : new Date()).toLocaleDateString('en-CA', { timeZone: ZONE });
  const back = Number.isInteger(daysBack) ? daysBack : 0;
  if (!back) return base;
  const [y, m, d] = base.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - back)).toISOString().slice(0, 10);   // calendar arithmetic on the date, not 24h on the clock
}

// The sim's own clock label for a Cycle: Y<n>C<m>, 52 Cycles to a SimYear (C114 = Y3C10). Same formula as
// cron-saturday-run.js simClock and buildDeskPackets deriveDeskCalendar_. Canon-facing text takes this label,
// never a Gregorian date — a real date is allowed only in internal keys, logs and builder-side memory.
function simClock(cycle) {
  const c = Number(cycle);
  if (!Number.isInteger(c) || c < 1) return null;
  return 'Y' + Math.ceil(c / 52) + 'C' + (((c - 1) % 52) + 1);
}

module.exports = { centralDate, simClock, ZONE };
