import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Eye, PenLine, ShieldCheck } from 'lucide-react';
import { previewSportsEntry } from '../lib/sportsApi';
import SportsRipplePreview from './SportsRipplePreview';
import SportsWriteConfirmation from './SportsWriteConfirmation';

const TEMPLATES = [
  { id: 'game', label: 'Game result', eventType: 'game-result', help: 'Record the result, player line, updated record, and story detail.' },
  { id: 'status', label: 'Injury / status', eventType: 'roster-move', help: 'Describe an availability or health-status change without changing the roster ledger.' },
  { id: 'roster', label: 'Roster move', eventType: 'roster-move', help: 'Describe a trade, signing, cut, or call-up. This preview does not execute it.' },
  { id: 'milestone', label: 'Player milestone', eventType: 'player-feature', help: 'Capture a player achievement, feature, or community appearance.' },
  { id: 'season', label: 'Season state', eventType: 'season-state', help: 'Update record, streak, mood, and franchise context.' },
  { id: 'observation', label: 'Story observation', eventType: 'editorial-note', help: 'Preserve a builder observation for the sports desk.' },
];

const EMPTY_DRAFT = {
  Cycle: '',
  SeasonType: '',
  EventType: 'game-result',
  TeamsUsed: 'as',
  NamesUsed: '',
  Notes: '',
  Stats: '',
  'Team Record': '',
  VideoGameDate: '',
  VideoGame: '',
  StoryAngle: '',
  PlayerMood: '',
  EventTrigger: '',
  HomeNeighborhood: '',
  Streak: '',
  FanSentiment: '',
  FranchiseStability: '',
  EconomicFootprint: '',
  CommunityInvestment: '',
  MediaProfile: '',
};

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-neutral-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[9px] leading-relaxed text-neutral-400">{hint}</span>}
    </label>
  );
}

const inputClass = 'h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none transition placeholder:text-neutral-700 focus:border-sky-400/60';
const selectClass = `${inputClass} appearance-none`;

function Options({ values }) {
  return (values || []).map((value) => <option key={value || 'blank'} value={value}>{value || '—'}</option>);
}

export default function SportsIntakeWorkspace({
  cycle,
  teamId,
  onTeamChange,
  workspace,
  notebookProvenance,
  onNotebookConsumed,
  onEntryWritten,
}) {
  const [templateId, setTemplateId] = useState('game');
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT, Cycle: String(cycle || ''), TeamsUsed: teamId });
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedProvenance, setAttachedProvenance] = useState(null);
  const options = workspace?.validEventOptions || {};
  const roster = workspace?.team?.roster || [];
  const showGame = templateId === 'game';
  const showPlayer = ['game', 'status', 'roster', 'milestone'].includes(templateId);
  const showState = ['game', 'season'].includes(templateId);
  const validPlayers = useMemo(() => roster.filter((player) => player.validPopid && player.name), [roster]);

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      Cycle: String(cycle || ''),
      TeamsUsed: teamId,
      NamesUsed: current.TeamsUsed === teamId ? current.NamesUsed : '',
    }));
    setPreview(null);
  }, [cycle, teamId]);

  useEffect(() => {
    if (!notebookProvenance) return;
    setAttachedProvenance(notebookProvenance);
    setTemplateId('observation');
    setDraft({
      ...EMPTY_DRAFT,
      Cycle: String(notebookProvenance.cycle || cycle || ''),
      TeamsUsed: teamId,
      EventType: 'editorial-note',
    });
    setPreview(null);
    setError('');
    onNotebookConsumed?.();
  }, [notebookProvenance, cycle, teamId, onNotebookConsumed]);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setPreview(null);
    setError('');
  }

  function chooseTemplate(id) {
    const next = TEMPLATES.find((item) => item.id === id) || TEMPLATES[0];
    setTemplateId(next.id);
    setDraft((current) => ({
      ...current,
      EventType: next.eventType,
      NamesUsed: '',
      Stats: '',
      'Team Record': '',
      StoryAngle: '',
      PlayerMood: '',
      EventTrigger: '',
      HomeNeighborhood: '',
      Streak: '',
      FanSentiment: '',
      FranchiseStability: '',
      EconomicFootprint: '',
      CommunityInvestment: '',
      MediaProfile: '',
    }));
    setPreview(null);
    setError('');
  }

  async function runPreview(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setPreview(null);
    try {
      const response = await previewSportsEntry(draft, attachedProvenance);
      setPreview(response.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function startAnother() {
    setPreview(null);
    setAttachedProvenance(null);
    setError('');
    setDraft((current) => ({
      ...EMPTY_DRAFT,
      Cycle: current.Cycle,
      SeasonType: current.SeasonType,
      EventType: current.EventType,
      TeamsUsed: current.TeamsUsed,
    }));
    document.getElementById('sports-intake')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  const writePolicy = workspace?.writePolicy;
  const writeBadge = writePolicy?.featureEnabled && writePolicy?.configured
    ? 'Secure append configured'
    : 'Preview first · writes gated';

  return (
    <section id="sports-intake" className="mt-9 rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900 to-black p-4 shadow-2xl shadow-black/20 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em] text-emerald-400">
            <PenLine size={13} /> Assignment composer
          </div>
          <h2 className="mt-1 text-xl font-black text-white">Enter a sports event</h2>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-neutral-400">
            Choose the kind of event first. The desk asks only for relevant fields, builds a deterministic ripple preview, and keeps the write decision in a separate secure confirmation.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-3 py-2 text-[9px] font-bold text-emerald-300">
          <ShieldCheck size={14} /> {writeBadge}
        </div>
      </div>

      {attachedProvenance && (
        <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[10px] text-amber-200">
          Blank draft opened from the C{attachedProvenance.cycle} Notebook item. Only artifact provenance is attached; no claim or fact was copied.
        </div>
      )}

      <form onSubmit={runPreview} className="mt-6">
        <fieldset>
          <legend className="text-[9px] font-black uppercase tracking-widest text-neutral-400">What happened?</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={templateId === item.id}
                onClick={() => chooseTemplate(item.id)}
                className={`min-h-14 rounded-xl border p-3 text-left transition ${templateId === item.id ? 'border-sky-400/50 bg-sky-400/10 text-white' : 'border-white/7 bg-black/20 text-neutral-400 hover:border-white/15 hover:text-neutral-200'}`}
              >
                <span className="block text-xs font-black">{item.label}</span>
                <span className="mt-1 block text-[9px] leading-relaxed">{item.help}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Field label="Cycle">
            <input type="number" min="1" required value={draft.Cycle} onChange={(event) => update('Cycle', event.target.value)} className={inputClass} />
          </Field>
          <Field label="Team">
            <div className="relative">
              <select
                required
                value={draft.TeamsUsed}
                onChange={(event) => {
                  setDraft((current) => ({
                    ...current,
                    TeamsUsed: event.target.value,
                    NamesUsed: '',
                  }));
                  setPreview(null);
                  setError('');
                  onTeamChange?.(event.target.value);
                }}
                className={selectClass}
              >
                <option value="as">The A&apos;s</option>
                <option value="oaks">The Oaks</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-neutral-600" />
            </div>
          </Field>
          <Field label="Season">
            <div className="relative">
              <select required value={draft.SeasonType} onChange={(event) => update('SeasonType', event.target.value)} className={selectClass}>
                <option value="">Choose season state</option>
                <Options values={options.seasonTypes} />
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-neutral-600" />
            </div>
          </Field>
        </div>

        {showPlayer && (
          <div className="mt-4">
            <Field label="Player" hint="The server resolves this exact roster name to its POPID before previewing the row.">
              <div className="relative">
                <select value={draft.NamesUsed} onChange={(event) => update('NamesUsed', event.target.value)} className={selectClass}>
                  <option value="">No named player</option>
                  {validPlayers.map((player) => <option key={player.popid} value={player.name}>{player.name} · {player.position || 'position —'} · {player.popid}</option>)}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-neutral-600" />
              </div>
            </Field>
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Field label={templateId === 'observation' ? 'Observation' : 'What should the desk know?'}>
            <textarea
              rows="5"
              value={draft.Notes}
              onChange={(event) => update('Notes', event.target.value)}
              placeholder="Keep the rich story detail here: what happened, why it matters, and any context already established in the ledgers."
              className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs leading-relaxed text-white outline-none placeholder:text-neutral-700 focus:border-sky-400/60"
            />
          </Field>
          <Field label="Story angle" hint="Your concise editorial instinct—not a generated fact.">
            <textarea
              rows="5"
              value={draft.StoryAngle}
              onChange={(event) => update('StoryAngle', event.target.value)}
              placeholder="What makes this worth following?"
              className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs leading-relaxed text-white outline-none placeholder:text-neutral-700 focus:border-sky-400/60"
            />
          </Field>
        </div>

        {(showGame || showState) && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {showGame && (
              <Field label="Player / game stats">
                <input value={draft.Stats} onChange={(event) => update('Stats', event.target.value)} placeholder="e.g. established stat line" className={inputClass} />
              </Field>
            )}
            <Field label="Team record">
              <input required={showGame} value={draft['Team Record']} onChange={(event) => update('Team Record', event.target.value)} placeholder="W-L, e.g. 12-7" className={inputClass} />
            </Field>
            <Field label="Streak">
              <input value={draft.Streak} onChange={(event) => update('Streak', event.target.value.toUpperCase())} placeholder="W2 or L3" className={inputClass} />
            </Field>
          </div>
        )}

        <details className="mt-5 rounded-2xl border border-white/7 bg-black/20">
          <summary className="cursor-pointer px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-400">
            Team, civic, and newsroom context
          </summary>
          <div className="grid gap-4 border-t border-white/5 p-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              ['Player mood', 'PlayerMood', options.playerMoods],
              ['Event trigger', 'EventTrigger', options.eventTriggers],
              ['Home neighborhood', 'HomeNeighborhood', options.neighborhoods],
              ['Fan sentiment', 'FanSentiment', options.fanSentiments],
              ['Franchise stability', 'FranchiseStability', options.franchiseStability],
              ['Economic footprint', 'EconomicFootprint', options.economicFootprints],
              ['Community investment', 'CommunityInvestment', options.communityInvestments],
              ['Media profile', 'MediaProfile', options.mediaProfiles],
            ].map(([label, field, values]) => (
              <Field key={field} label={label}>
                <div className="relative">
                  <select value={draft[field]} onChange={(event) => update(field, event.target.value)} className={selectClass}>
                    <Options values={values} />
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-neutral-600" />
                </div>
              </Field>
            ))}
          </div>
        </details>

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-950/20 p-3 text-xs text-red-300">{error}</div>
        )}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-black text-black transition hover:bg-neutral-200 disabled:opacity-50"
          >
            <Eye size={15} /> {loading ? 'Building preview…' : 'Preview event and ripple'}
          </button>
          <p className="text-[9px] leading-relaxed text-neutral-400">Preview performs no write. Confirmation appears only when every secure Wave C gate is satisfied.</p>
        </div>
      </form>

      <SportsRipplePreview preview={preview} />
      <SportsWriteConfirmation
        preview={preview}
        onEntryWritten={onEntryWritten}
        onRepreview={() => setPreview(null)}
        onStartAnother={startAnother}
      />
    </section>
  );
}
