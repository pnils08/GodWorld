import React from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  Radio,
  RefreshCw,
  Trophy,
} from 'lucide-react';

function humanize(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function StateValue({ label, state, accent }) {
  if (!state?.value) return null;
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-3">
      <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-400">{humanize(label)}</div>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-bold text-neutral-100">{state.value}</span>
        <span className={`text-[9px] font-mono ${accent}`}>
          {state.sourceCycle ? `from C${state.sourceCycle}` : 'source unknown'}
        </span>
      </div>
    </div>
  );
}

function TeamStateCard({ team, tone }) {
  const isAs = tone === 'as';
  const accent = isAs ? 'text-amber-300' : 'text-sky-300';
  const border = isAs ? 'border-amber-400/25' : 'border-sky-400/25';
  const wash = isAs ? 'from-emerald-950/65' : 'from-sky-950/55';
  const state = team?.state || {};
  const record = state['Team Record'];
  const headlineFields = ['SeasonType', 'Streak'];
  const contextFields = [
    'FanSentiment',
    'FranchiseStability',
    'EconomicFootprint',
    'CommunityInvestment',
    'MediaProfile',
  ];

  return (
    <article className={`overflow-hidden rounded-3xl border ${border} bg-gradient-to-br ${wash} to-neutral-950 p-5 shadow-xl shadow-black/20`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`text-[10px] font-black uppercase tracking-[0.24em] ${accent}`}>Oakland club</div>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-white">{team?.label || 'Team unavailable'}</h2>
          <div className="mt-2 text-[10px] font-mono text-neutral-400">
            {team?.rosterCount ?? 0} rostered · {team?.eventCount ?? 0} this Cycle
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Record</div>
          <div className="text-3xl font-black tracking-tighter text-white">{record?.value || '—'}</div>
          {record?.sourceCycle && (
            <div className={`text-[9px] font-mono ${accent}`}>from C{record.sourceCycle}</div>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {headlineFields.map((field) => (
          <StateValue key={field} label={field} state={state[field]} accent={accent} />
        ))}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {contextFields.map((field) => (
          <StateValue key={field} label={field} state={state[field]} accent={accent} />
        ))}
      </div>
      {!Object.keys(state).length && (
        <div className="mt-5 rounded-xl border border-dashed border-white/10 p-4 text-xs text-neutral-400">
          No team-state fields exist at or before this Cycle.
        </div>
      )}
    </article>
  );
}

function EventCard({ event }) {
  const isAs = event.teamId === 'as';
  const accent = isAs ? 'text-amber-300 border-amber-400/20 bg-amber-400/10' : 'text-sky-300 border-sky-400/20 bg-sky-400/10';
  const details = [
    ['Record', event['Team Record']],
    ['Stats', event.Stats],
    ['Streak', event.Streak],
    ['Mood', event.PlayerMood],
    ['Trigger', event.EventTrigger],
    ['Home', event.HomeNeighborhood],
  ].filter(([, value]) => value);

  return (
    <article className="min-w-[280px] snap-start rounded-2xl border border-white/8 bg-neutral-950/85 p-4 sm:min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${accent}`}>
            {humanize(event.EventType || 'feed event')}
          </span>
          <h3 className="mt-3 text-sm font-black text-white">{event.NamesUsed || event.team}</h3>
        </div>
        <span className="text-[9px] font-mono text-neutral-400">row {event.sourceRow}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-neutral-300">{event.Notes || 'No notes supplied.'}</p>
      {event.StoryAngle && (
        <p className="mt-3 border-l-2 border-white/15 pl-3 text-[11px] italic text-neutral-400">{event.StoryAngle}</p>
      )}
      {details.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/5 pt-3">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[8px] font-bold uppercase tracking-widest text-neutral-400">{label}</dt>
              <dd className="mt-0.5 text-[10px] text-neutral-300">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}

export default function SportsOverview({
  overview,
  source,
  warnings,
  cycleInput,
  onCycleInput,
  onApplyCycle,
  onRefresh,
  loading,
}) {
  const data = overview || {};
  const events = data.events || [];
  const stale = Object.values(source?.sheets || {}).some((sheet) => sheet?.stale);

  return (
    <>
      <section className="sticky top-[72px] z-20 -mx-5 border-y border-white/5 bg-[#0a0a0a]/95 px-5 py-3 backdrop-blur-xl lg:mx-0 lg:rounded-2xl lg:border">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/5 p-2.5">
              <Trophy size={18} className="text-amber-300" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">Oakland Sports Desk</h1>
              <p className="text-[10px] text-neutral-400">Live rosters · exact-Cycle events · read-only preview</p>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1 lg:w-40 lg:flex-none">
              <span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-neutral-400">Cycle</span>
              <input
                aria-label="Sports Cycle"
                type="number"
                min="1"
                inputMode="numeric"
                list="sports-cycle-options"
                value={cycleInput}
                onChange={(event) => onCycleInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') onApplyCycle(); }}
                className="h-11 w-full rounded-xl border border-white/10 bg-neutral-950 px-3 text-sm font-bold text-white outline-none focus:border-sky-400/60"
              />
              <datalist id="sports-cycle-options">
                {(data.availableCycles || []).map((cycle) => <option key={cycle} value={cycle} />)}
              </datalist>
            </label>
            <button
              type="button"
              onClick={onApplyCycle}
              disabled={loading}
              className="h-11 rounded-xl bg-white px-4 text-xs font-black text-black transition hover:bg-neutral-200 disabled:opacity-50"
            >
              View
            </button>
            <button
              type="button"
              aria-label="Refresh sports data"
              onClick={onRefresh}
              disabled={loading}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-neutral-300 transition hover:border-white/25 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] font-mono text-neutral-400">
          <span className="flex items-center gap-1.5"><Radio size={11} className={stale ? 'text-amber-400' : 'text-emerald-400'} />{stale ? 'stale cache' : 'live Sheet projection'}</span>
          <span className="flex items-center gap-1.5"><CalendarDays size={11} />Cycle {data.cycle || '—'}</span>
          <span className="flex items-center gap-1.5"><Clock3 size={11} />{source?.fetchedAt ? `fetched ${new Date(source.fetchedAt).toLocaleString()}` : 'fetch time unavailable'}</span>
          {warnings?.length > 0 && <span className="flex items-center gap-1.5 text-amber-400"><AlertTriangle size={11} />{warnings.length} source warning{warnings.length === 1 ? '' : 's'}</span>}
        </div>
      </section>

      <section aria-label="Team state" className="mt-5 grid gap-4 lg:grid-cols-2">
        <TeamStateCard team={data.teams?.as} tone="as" />
        <TeamStateCard team={data.teams?.oaks} tone="oaks" />
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-sky-400">The Cycle wire</div>
            <h2 className="text-lg font-black text-white">Events in C{data.cycle || '—'}</h2>
          </div>
          <span className="text-[10px] font-mono text-neutral-400">{events.length} filed</span>
        </div>
        {events.length > 0 ? (
          <div
            tabIndex="0"
            aria-label={`Cycle ${data.cycle} sports events`}
            className="flex snap-x gap-3 overflow-x-auto pb-2 outline-none focus-visible:ring-2 focus-visible:ring-sky-400 lg:grid lg:grid-cols-3 lg:overflow-visible"
          >
            {events.map((event) => <EventCard key={`${event.teamId}-${event.sourceRow}`} event={event} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-950/50 p-7 text-center">
            <p className="text-sm font-bold text-neutral-300">No Oakland sports events in this Cycle.</p>
            <p className="mt-1 text-[11px] text-neutral-400">Earlier history has not been substituted. Team cards may still show inherited state with its source Cycle.</p>
          </div>
        )}
      </section>
    </>
  );
}
