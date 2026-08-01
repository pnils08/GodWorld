import React from 'react';
import { IdCard, Users } from 'lucide-react';

function StatLine({ stats }) {
  const entries = Object.entries(stats || {});
  if (!entries.length) return <span className="text-neutral-400">No current stat fields</span>;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {entries.map(([label, value]) => (
        <span key={label}><b className="text-neutral-400">{label}</b> {value}</span>
      ))}
    </span>
  );
}

export default function SportsRoster({ teamId, onTeamChange, workspace }) {
  const team = workspace?.team;
  const roster = team?.roster || [];
  const accent = teamId === 'as' ? 'text-amber-300' : 'text-sky-300';

  return (
    <section className="mt-9 rounded-3xl border border-white/8 bg-neutral-950/60 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className={`text-[9px] font-black uppercase tracking-[0.22em] ${accent}`}>Live tie-in ledger</div>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-black text-white">
            <Users size={18} /> Team roster
          </h2>
          <p className="mt-1 text-[10px] text-neutral-400">Identity and current-stat fields come from the selected roster Sheet.</p>
        </div>
        <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-black p-1" role="group" aria-label="Choose team roster">
          {[['as', "The A's"], ['oaks', 'The Oaks']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onTeamChange(id)}
              aria-pressed={teamId === id}
              className={`min-h-10 rounded-lg px-4 text-xs font-black transition ${teamId === id ? (id === 'as' ? 'bg-emerald-900 text-amber-200' : 'bg-sky-950 text-sky-200') : 'text-neutral-400 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-neutral-400">
              <th className="px-3 py-3">Player</th>
              <th className="px-3 py-3">POPID</th>
              <th className="px-3 py-3">Pos</th>
              <th className="px-3 py-3">Tier</th>
              <th className="px-3 py-3">Current stats</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((player) => (
              <tr key={`${player.popid}-${player.sourceRow}`} className="border-b border-white/5 text-xs text-neutral-300 hover:bg-white/[0.025]">
                <td className="px-3 py-3 font-bold text-white">{player.name || 'Unnamed roster row'}</td>
                <td className={`px-3 py-3 font-mono text-[10px] ${player.validPopid ? 'text-neutral-400' : 'text-red-400'}`}>{player.popid || 'missing'}</td>
                <td className="px-3 py-3">{player.position || '—'}</td>
                <td className="px-3 py-3">{player.tier || '—'}</td>
                <td className="px-3 py-3 text-[10px]"><StatLine stats={player.stats} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-2 md:hidden">
        {roster.map((player) => (
          <article key={`${player.popid}-${player.sourceRow}`} className="rounded-2xl border border-white/7 bg-black/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-white">{player.name || 'Unnamed roster row'}</h3>
                <p className="mt-1 text-[10px] text-neutral-400">{player.position || 'Position unavailable'} · Tier {player.tier || '—'}</p>
              </div>
              <IdCard size={16} className={player.validPopid ? accent : 'text-red-400'} />
            </div>
            <p className={`mt-3 font-mono text-[9px] ${player.validPopid ? 'text-neutral-400' : 'text-red-400'}`}>{player.popid || 'POPID missing'}</p>
            <div className="mt-3 border-t border-white/5 pt-3 text-[10px] text-neutral-300"><StatLine stats={player.stats} /></div>
          </article>
        ))}
      </div>

      {!roster.length && (
        <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-neutral-400">
          No rows are available from this roster Sheet.
        </div>
      )}
    </section>
  );
}
