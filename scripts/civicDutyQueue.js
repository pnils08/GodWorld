'use strict';

const { eventsForSeat } = require('./civicEventView');

function mondayOf(date) {
  const d = new Date(date + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) throw new Error('invalid duty date');
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function planDutyRota(seats, results, eventView, date, limit = 6, policy = {}) {
  policy = policy || {};
  const weekStart = mondayOf(date);
  const regularTarget = policy.regularTarget == null ? 2 : policy.regularTarget;
  const eventTarget = policy.eventTarget == null ? 2 : policy.eventTarget;
  const chiefRegularTarget = policy.chiefRegularTarget == null ? 1 : policy.chiefRegularTarget;
  const day = new Date(date + 'T12:00:00Z').getUTCDay();
  const regularDays = policy.regularDaysUtc || [1, 2, 3, 4];
  const eventExceptionDays = policy.eventExceptionDaysUtc || [];
  const regularOpen = regularDays.includes(day);
  const eventOpen = regularOpen || eventExceptionDays.includes(day);
  const inWeek = (results || []).filter(r => r.date >= weekStart && r.date <= date);
  const rows = seats.map(seat => {
    const officeId = String(seat.officeId || '');
    const elected = /^(MAYOR-01|COUNCIL-D\d)$/.test(officeId);
    const mine = inWeek.filter(r => r.office === seat.agentDir);
    const doneRegular = mine.filter(r => r.ok && r.dutyKind === 'regular').length;
    const doneEvents = mine.filter(r => r.ok && r.dutyKind === 'event').length;
    const today = mine.some(r => r.date === date);
    const delivered = new Set((results || []).filter(r => r.office === seat.agentDir && r.ok)
      .flatMap(r => r.eventKeys || []));
    const dueEvents = (eventView ? eventsForSeat(eventView, seat) : [])
      .filter(e => e.significance === 'major' && e.occurredCycle >= Number(eventView.generation.cycle) - 1 &&
        e.status !== 'cancelled' && !delivered.has(e.eventId + '@' + e.sourceRevision))
      .map(e => e.eventId + '@' + e.sourceRevision);
    return { seat, elected, doneRegular, doneEvents, attempts: mine.length, today, dueEvents };
  });
  const eligible = rows.filter(r => !r.today);
  const regular = (regularOpen ? eligible : []).filter(r => r.doneRegular < (r.elected ? regularTarget : chiefRegularTarget))
    .sort((a, b) => a.doneRegular - b.doneRegular || a.attempts - b.attempts ||
      a.seat.agentDir.localeCompare(b.seat.agentDir));
  const event = (eventOpen ? eligible : []).filter(r => r.elected && r.dueEvents.length && r.doneEvents < eventTarget)
    .sort((a, b) => a.doneEvents - b.doneEvents || a.attempts - b.attempts ||
      a.seat.agentDir.localeCompare(b.seat.agentDir));
  const remainingDutyDays = regularDays.filter(d => d >= day).length;
  const owedRegular = rows.reduce((n, r) => n + Math.max(0,
    (r.elected ? regularTarget : chiefRegularTarget) - r.doneRegular), 0);
  const spareSlots = remainingDutyDays * limit - owedRegular;
  const reserve = event.length && spareSlots > 0 ? 1 : 0;
  const selected = [];
  for (const r of regular.slice(0, Math.max(0, limit - reserve))) {
    selected.push({ office: r.seat, dutyKind: 'regular', eventKeys: r.dueEvents.slice() });
  }
  for (const r of event) {
    if (selected.length >= limit) break;
    if (selected.some(s => s.office.agentDir === r.seat.agentDir)) continue;
    selected.push({ office: r.seat, dutyKind: 'event', eventKeys: r.dueEvents.slice() });
  }
  for (const r of regular) {
    if (selected.length >= limit) break;
    if (selected.some(s => s.office.agentDir === r.seat.agentDir)) continue;
    selected.push({ office: r.seat, dutyKind: 'regular', eventKeys: r.dueEvents.slice() });
  }
  return { weekStart, selected, owed: rows.map(r => ({ office: r.seat.agentDir,
    regular: Math.max(0, (r.elected ? regularTarget : chiefRegularTarget) - r.doneRegular),
    event: r.dueEvents.length && r.doneEvents < eventTarget ? r.dueEvents : [] })) };
}

module.exports = { mondayOf, planDutyRota };
