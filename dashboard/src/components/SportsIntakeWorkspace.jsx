import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Eye,
  PenLine,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import {
  createSportsSubmissionId,
  previewSportsEntry,
} from '../lib/sportsApi';
import SportsRipplePreview from './SportsRipplePreview';
import SportsWriteConfirmation from './SportsWriteConfirmation';

const TEMPLATES = [
  { id: 'game', label: 'Game result', eventType: 'game-result', help: 'Record the result, player line, updated record, and story detail.' },
  { id: 'stats', label: 'Current stats', eventType: 'stat-capture', help: 'Review one player’s current-season roster values field by field.' },
  { id: 'injury', label: 'Injury', eventType: 'roster-move', action: 'injury', help: 'Set an exact injury status and reviewed health cause.' },
  { id: 'return', label: 'Return', eventType: 'roster-move', action: 'return', help: 'Return an injured or recovering player to Active.' },
  { id: 'call-up', label: 'Call-up', eventType: 'roster-move', action: 'call-up', help: 'Confirm the team, position, and RoleType transition.' },
  { id: 'trade-away', label: 'Trade away', eventType: 'roster-move', action: 'trade-away', help: 'Mark an Oakland departure without deleting or archiving the citizen.' },
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

const EMPTY_ROSTER_EVENT = {
  injuryStatus: 'injured',
  healthCause: '',
  teamAfter: '',
  positionAfter: '',
  roleTypeAfter: '',
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

function validStatValue(value, validator) {
  if (value === '') return true;
  if (validator === 'integer') return /^\d+$/.test(value);
  if (validator === 'innings') return /^\d+(?:\.[012])?$/.test(value);
  if (validator === 'record') return /^\d+\s*[-–]\s*\d+$/.test(value);
  if (validator === 'rate') {
    return /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) &&
      Number(value) >= 0 && Number(value) <= 1;
  }
  if (validator === 'percentage') {
    const raw = value.endsWith('%') ? value.slice(0, -1) : value;
    return /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(raw) &&
      Number(raw) >= 0 && Number(raw) <= 100;
  }
  return /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) && Number(value) >= 0;
}

function statValidationHint(validator) {
  const hints = {
    integer: 'Non-negative whole number',
    innings: 'Baseball innings ending in .0, .1, or .2',
    record: 'Whole-number W-L',
    rate: 'Decimal from 0 through 1',
    percentage: '0 through 100; optional %',
    decimal: 'Non-negative decimal',
  };
  return hints[validator] || 'Reviewed value';
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
  const [selectedPopid, setSelectedPopid] = useState('');
  const [proposedStats, setProposedStats] = useState({});
  const [reviewedStats, setReviewedStats] = useState({});
  const [verificationSource, setVerificationSource] = useState('manual-verified');
  const [rosterEvent, setRosterEvent] = useState(EMPTY_ROSTER_EVENT);
  const [rosterEventReviewed, setRosterEventReviewed] = useState(false);
  const [submissionId, setSubmissionId] = useState(() => createSportsSubmissionId());
  const options = workspace?.validEventOptions || {};
  const mutationOptions = workspace?.validMutationOptions || {};
  const roster = workspace?.team?.roster || [];
  const showGame = templateId === 'game';
  const showStatsCapture = templateId === 'stats';
  const selectedTemplate = TEMPLATES.find((item) => item.id === templateId);
  const rosterAction = selectedTemplate?.action || null;
  const showRosterEvent = Boolean(rosterAction);
  const showPlayer = [
    'game',
    'stats',
    'injury',
    'return',
    'call-up',
    'trade-away',
    'milestone',
  ].includes(templateId);
  const showState = ['game', 'season'].includes(templateId);
  const validPlayers = useMemo(() => roster.filter((player) => player.validPopid && player.name), [roster]);
  const playerChoices = useMemo(
    () => (showStatsCapture || showRosterEvent
      ? validPlayers.filter((player) => player.citizen?.resolved)
      : validPlayers),
    [showRosterEvent, showStatsCapture, validPlayers],
  );
  const selectedPlayer = useMemo(
    () => validPlayers.find((player) => player.popid === selectedPopid) || null,
    [selectedPopid, validPlayers],
  );
  const selectedCitizen = selectedPlayer?.citizen?.resolved
    ? selectedPlayer.citizen
    : null;
  const statFields = mutationOptions.statFields || [];
  const statRows = useMemo(() => statFields.map((field) => {
    const before = selectedPlayer?.statValues?.[field.key] || '';
    const after = Object.prototype.hasOwnProperty.call(proposedStats, field.key)
      ? String(proposedStats[field.key]).trim()
      : before;
    let status = before === after ? 'unchanged' : before ? 'changed' : 'blank-source';
    let validationError = '';
    if (before && !validStatValue(before, field.validator)) {
      status = 'invalid';
      validationError = 'The current Sheet value does not match this field contract.';
    } else if (!after && before) {
      status = 'invalid';
      validationError = 'A blank proposal cannot erase a current value.';
    } else if (after && !validStatValue(after, field.validator)) {
      status = 'invalid';
      validationError = statValidationHint(field.validator);
    }
    return {
      ...field,
      before,
      after,
      status,
      validationError,
      reviewed: reviewedStats[field.key] === true,
    };
  }), [proposedStats, reviewedStats, selectedPlayer, statFields]);
  const statCounts = useMemo(() => statRows.reduce((counts, row) => {
    counts[row.status] = (counts[row.status] || 0) + 1;
    return counts;
  }, {}), [statRows]);
  const changedStatRows = statRows.filter((row) => (
    row.status === 'changed' || row.status === 'blank-source'
  ));
  const statFormReady = Boolean(
    selectedPlayer &&
    selectedCitizen &&
    ['active', 'recovering'].includes(
      String(selectedCitizen.status || '').toLowerCase()
    ) &&
    changedStatRows.length &&
    !statCounts.invalid &&
    changedStatRows.every((row) => row.reviewed) &&
    verificationSource
  );
  const sourceStatus = String(selectedCitizen?.status || '').toLowerCase();
  const rosterSourceCompatible = rosterAction === 'injury'
    ? ['active', 'recovering'].includes(sourceStatus)
    : rosterAction === 'return'
      ? ['injured', 'serious-condition', 'recovering'].includes(sourceStatus)
      : ['call-up', 'trade-away'].includes(rosterAction)
        ? sourceStatus === 'active'
        : false;
  const rosterFieldsReady = rosterAction === 'injury'
    ? Boolean(rosterEvent.healthCause.trim())
    : rosterAction === 'return'
      ? true
      : rosterAction === 'call-up'
        ? Boolean(
          rosterEvent.teamAfter.trim() &&
          rosterEvent.teamAfter.trim() !== selectedPlayer?.team &&
          rosterEvent.positionAfter.trim() &&
          rosterEvent.roleTypeAfter.trim()
        )
        : rosterAction === 'trade-away'
          ? Boolean(
            rosterEvent.teamAfter.trim() &&
            rosterEvent.teamAfter.trim() !== selectedPlayer?.team &&
            rosterEvent.roleTypeAfter.trim()
          )
          : false;
  const rosterEventReady = Boolean(
    showRosterEvent &&
    selectedPlayer &&
    selectedCitizen &&
    rosterSourceCompatible &&
    rosterFieldsReady &&
    rosterEventReviewed &&
    verificationSource
  );

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      Cycle: String(cycle || ''),
      TeamsUsed: teamId,
      NamesUsed: current.TeamsUsed === teamId ? current.NamesUsed : '',
    }));
    setSelectedPopid('');
    setProposedStats({});
    setReviewedStats({});
    setRosterEvent(EMPTY_ROSTER_EVENT);
    setRosterEventReviewed(false);
    setSubmissionId(createSportsSubmissionId());
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
    setSelectedPopid('');
    setProposedStats({});
    setReviewedStats({});
    setRosterEvent(EMPTY_ROSTER_EVENT);
    setRosterEventReviewed(false);
    setSubmissionId(createSportsSubmissionId());
    setPreview(null);
    setError('');
    onNotebookConsumed?.();
  }, [notebookProvenance, cycle, teamId, onNotebookConsumed]);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setPreview(null);
    setError('');
  }

  function updateRosterEvent(field, value) {
    setRosterEvent((current) => ({ ...current, [field]: value }));
    setRosterEventReviewed(false);
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
    setSelectedPopid('');
    setProposedStats({});
    setReviewedStats({});
    setRosterEvent(EMPTY_ROSTER_EVENT);
    setRosterEventReviewed(false);
    setVerificationSource('manual-verified');
    setSubmissionId(createSportsSubmissionId());
    setPreview(null);
    setError('');
  }

  async function runPreview(event) {
    event.preventDefault();
    if (showStatsCapture && !statFormReady) {
      setError('Select one player, enter at least one valid change, and review every changed field.');
      return;
    }
    if (showRosterEvent && !rosterEventReady) {
      setError('Select one compatible player, complete every required transition, and confirm the exact action fields.');
      return;
    }
    setLoading(true);
    setError('');
    setPreview(null);
    try {
      let submission = draft;
      if (showStatsCapture) {
        submission = {
          draft,
          submissionId,
          participant: {
            popid: selectedPlayer.popid,
            name: selectedPlayer.name,
            rosterSource: teamId === 'as' ? 'As_Roster' : 'Oaks_Roster',
            sourceRow: selectedPlayer.sourceRow,
          },
          mutation: {
            kind: 'stat-line',
            action: 'stat-capture',
            changes: statRows.map((row) => ({
              field: row.key,
              before: row.before,
              after: row.after,
              reviewed: row.reviewed,
            })),
            verification: {
              source: verificationSource,
              confirmed: true,
            },
          },
        };
      } else if (showRosterEvent) {
        const changes = [];
        if (rosterAction === 'injury') {
          changes.push(
            {
              field: 'citizen.status',
              before: selectedCitizen.status,
              after: rosterEvent.injuryStatus,
            },
            {
              field: 'citizen.statusStartCycle',
              before: selectedCitizen.statusStartCycle,
              after: String(draft.Cycle),
            },
            {
              field: 'citizen.healthCause',
              before: selectedCitizen.healthCause,
              after: rosterEvent.healthCause.trim(),
            },
          );
        } else if (rosterAction === 'return') {
          changes.push(
            {
              field: 'citizen.status',
              before: selectedCitizen.status,
              after: 'Active',
            },
            {
              field: 'citizen.statusStartCycle',
              before: selectedCitizen.statusStartCycle,
              after: '',
            },
            {
              field: 'citizen.healthCause',
              before: selectedCitizen.healthCause,
              after: '',
            },
          );
        } else {
          changes.push({
            field: 'roster.team',
            before: selectedPlayer.team,
            after: rosterEvent.teamAfter.trim(),
          });
          if (rosterAction === 'call-up' || rosterEvent.positionAfter.trim()) {
            changes.push({
              field: 'roster.position',
              before: selectedPlayer.position,
              after: rosterEvent.positionAfter.trim(),
            });
          }
          changes.push(
            {
              field: 'citizen.status',
              before: selectedCitizen.status,
              after: rosterAction === 'call-up' ? 'Active' : 'Traded',
            },
            {
              field: 'citizen.roleType',
              before: selectedCitizen.roleType,
              after: rosterEvent.roleTypeAfter.trim(),
            },
          );
        }
        submission = {
          draft,
          submissionId,
          participant: {
            popid: selectedPlayer.popid,
            name: selectedPlayer.name,
            rosterSource: teamId === 'as' ? 'As_Roster' : 'Oaks_Roster',
            sourceRow: selectedPlayer.sourceRow,
          },
          mutation: {
            kind: 'roster-event',
            action: rosterAction,
            changes: changes.map((change) => ({ ...change, reviewed: true })),
            verification: {
              source: verificationSource,
              confirmed: true,
            },
          },
        };
      }
      const response = await previewSportsEntry(submission, attachedProvenance);
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
    setSelectedPopid('');
    setProposedStats({});
    setReviewedStats({});
    setRosterEvent(EMPTY_ROSTER_EVENT);
    setRosterEventReviewed(false);
    setVerificationSource('manual-verified');
    setSubmissionId(createSportsSubmissionId());
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
                  setSelectedPopid('');
                  setProposedStats({});
                  setReviewedStats({});
                  setRosterEvent(EMPTY_ROSTER_EVENT);
                  setRosterEventReviewed(false);
                  setSubmissionId(createSportsSubmissionId());
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
                <select
                  required={showStatsCapture || showRosterEvent}
                  value={selectedPopid}
                  onChange={(event) => {
                    const player = playerChoices.find(
                      (item) => item.popid === event.target.value
                    );
                    setSelectedPopid(event.target.value);
                    setDraft((current) => ({
                      ...current,
                      NamesUsed: player?.name || '',
                    }));
                    setProposedStats(player ? { ...player.statValues } : {});
                    setReviewedStats({});
                    setRosterEvent(EMPTY_ROSTER_EVENT);
                    setRosterEventReviewed(false);
                    setSubmissionId(createSportsSubmissionId());
                    setPreview(null);
                    setError('');
                  }}
                  className={selectClass}
                >
                  <option value="">
                    {showStatsCapture || showRosterEvent
                      ? 'Choose one ledger-resolved player'
                      : 'No named player'}
                  </option>
                  {playerChoices.map((player) => (
                    <option key={player.popid} value={player.popid}>
                      {player.name} · {player.position || 'position —'} · {player.popid}
                      {player.citizen?.resolved
                        ? ` · T${player.citizen.tier || '?'} ${player.citizen.status || 'status —'}`
                        : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-neutral-600" />
              </div>
            </Field>
          </div>
        )}

        {showStatsCapture && selectedPlayer && (
          <section className="mt-4 rounded-2xl border border-sky-400/15 bg-sky-950/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest text-sky-300">Current-season stat review</div>
                <h3 className="mt-1 text-sm font-black text-white">{selectedPlayer.name}</h3>
                <p className="mt-1 text-[9px] text-neutral-400">
                  Source row {selectedPlayer.sourceRow} · enter only values visible in the reviewed source.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[8px] font-black uppercase tracking-wider">
                <span className="rounded-full border border-white/10 px-2 py-1 text-neutral-400">{statCounts.unchanged || 0} unchanged</span>
                <span className="rounded-full border border-sky-400/20 px-2 py-1 text-sky-300">{statCounts.changed || 0} changed</span>
                <span className="rounded-full border border-amber-400/20 px-2 py-1 text-amber-300">{statCounts['blank-source'] || 0} blank source</span>
                <span className="rounded-full border border-red-400/20 px-2 py-1 text-red-300">{statCounts.invalid || 0} invalid</span>
              </div>
            </div>

            <div className="mt-4 grid gap-2 lg:grid-cols-2">
              {statRows.map((row) => {
                const changed = row.status === 'changed' || row.status === 'blank-source';
                const statusClass = row.status === 'invalid'
                  ? 'border-red-400/25 bg-red-950/15'
                  : changed
                    ? 'border-sky-400/25 bg-sky-950/15'
                    : 'border-white/7 bg-black/20';
                return (
                  <div key={row.key} className={`rounded-xl border p-3 ${statusClass}`}>
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor={`sports-stat-${row.key}`} className="text-[10px] font-black text-white">
                        {row.label} <span className="font-mono text-[8px] text-neutral-500">{row.column}</span>
                      </label>
                      <span className={`text-[8px] font-black uppercase tracking-wider ${row.status === 'invalid' ? 'text-red-300' : changed ? 'text-sky-300' : 'text-neutral-500'}`}>
                        {row.status}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                      <div className="rounded-lg border border-white/5 bg-black/30 px-2.5 py-2 font-mono text-[10px] text-neutral-400">
                        {row.before || 'blank'}
                      </div>
                      <span className="text-neutral-600">→</span>
                      <input
                        id={`sports-stat-${row.key}`}
                        value={Object.prototype.hasOwnProperty.call(proposedStats, row.key) ? proposedStats[row.key] : row.before}
                        onChange={(event) => {
                          const value = event.target.value;
                          setProposedStats((current) => ({ ...current, [row.key]: value }));
                          setReviewedStats((current) => ({ ...current, [row.key]: false }));
                          setPreview(null);
                          setError('');
                        }}
                        inputMode="decimal"
                        aria-invalid={row.status === 'invalid'}
                        className="h-9 min-w-0 rounded-lg border border-white/10 bg-black/40 px-2.5 font-mono text-[10px] text-white outline-none focus:border-sky-400/60"
                      />
                    </div>
                    <p className={`mt-1.5 text-[8px] ${row.validationError ? 'text-red-300' : 'text-neutral-500'}`}>
                      {row.validationError || statValidationHint(row.validator)}
                    </p>
                    {changed && row.status !== 'invalid' && (
                      <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-lg border border-white/5 bg-black/20 p-2">
                        <input
                          type="checkbox"
                          checked={row.reviewed}
                          onChange={(event) => {
                            setReviewedStats((current) => ({
                              ...current,
                              [row.key]: event.target.checked,
                            }));
                            setPreview(null);
                          }}
                          className="mt-0.5 size-3.5 accent-sky-400"
                        />
                        <span className="text-[8px] leading-relaxed text-neutral-300">
                          I checked this exact before/after value.
                        </span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Verification source" hint="Screenshot means the original-resolution screen was the final visual source.">
                <div className="relative">
                  <select
                    required
                    value={verificationSource}
                    onChange={(event) => {
                      setVerificationSource(event.target.value);
                      setPreview(null);
                    }}
                    className={selectClass}
                  >
                    <Options values={mutationOptions.verificationSources} />
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-neutral-600" />
                </div>
              </Field>
              <div className={`rounded-xl border p-3 ${statFormReady ? 'border-emerald-400/20 bg-emerald-950/15' : 'border-amber-400/20 bg-amber-950/10'}`}>
                <div className="flex items-start gap-2">
                  {statFormReady
                    ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                    : <TriangleAlert size={15} className="mt-0.5 shrink-0 text-amber-300" />}
                  <div>
                    <div className="text-[9px] font-black text-white">
                      {statFormReady ? 'Field review complete' : 'Review is not complete'}
                    </div>
                    <p className="mt-1 text-[8px] leading-relaxed text-neutral-400">
                      {statFormReady
                        ? `${changedStatRows.length} changed field${changedStatRows.length === 1 ? '' : 's'} will enter the signed preview.`
                        : 'At least one valid change is required, and every changed field must be checked.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {showRosterEvent && selectedPlayer && selectedCitizen && (
          <section className="mt-4 rounded-2xl border border-violet-400/15 bg-violet-950/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest text-violet-300">
                  Engine.77 state and life review
                </div>
                <h3 className="mt-1 text-sm font-black text-white">
                  {selectedPlayer.name}
                </h3>
                <p className="mt-1 text-[9px] text-neutral-400">
                  Roster row {selectedPlayer.sourceRow} · citizen row {selectedCitizen.sourceRow}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[8px] font-black uppercase tracking-wider">
                <span className="rounded-full border border-violet-400/20 px-2 py-1 text-violet-200">
                  Citizen Tier {selectedCitizen.tier || '—'}
                </span>
                <span className="rounded-full border border-white/10 px-2 py-1 text-neutral-300">
                  {selectedCitizen.status || 'status blank'}
                </span>
              </div>
            </div>

            <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Roster Team', selectedPlayer.team],
                ['Position', selectedPlayer.position],
                ['RoleType', selectedCitizen.roleType],
                ['Neighborhood', selectedCitizen.neighborhood],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/5 bg-black/25 p-3">
                  <dt className="text-[8px] font-black uppercase tracking-widest text-neutral-500">
                    {label}
                  </dt>
                  <dd className="mt-1 text-[10px] font-bold text-white">
                    {value || 'blank'}
                  </dd>
                </div>
              ))}
            </dl>

            {!rosterSourceCompatible && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-950/20 p-3 text-[10px] text-red-200">
                <TriangleAlert size={15} className="mt-0.5 shrink-0" />
                The current citizen Status is not eligible for this action. Choose a
                compatible player or refresh the workspace.
              </div>
            )}

            {rosterAction === 'injury' && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="New health status">
                  <div className="relative">
                    <select
                      value={rosterEvent.injuryStatus}
                      onChange={(event) => updateRosterEvent(
                        'injuryStatus',
                        event.target.value
                      )}
                      className={selectClass}
                    >
                      <option value="injured">injured</option>
                      <option value="serious-condition">serious-condition</option>
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-neutral-600" />
                  </div>
                </Field>
                <Field
                  label="Verified health cause"
                  hint="This exact text enters HealthCause and the deterministic citizen history."
                >
                  <input
                    required
                    value={rosterEvent.healthCause}
                    onChange={(event) => updateRosterEvent(
                      'healthCause',
                      event.target.value
                    )}
                    placeholder="Exact reviewed cause"
                    className={inputClass}
                  />
                </Field>
              </div>
            )}

            {rosterAction === 'return' && (
              <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-950/10 p-3 text-[10px] leading-relaxed text-neutral-300">
                Confirmation will set Status to <span className="font-mono text-white">Active</span>
                {' '}and clear StatusStartCycle and HealthCause. It does not infer a
                position or career change.
              </div>
            )}

            {['call-up', 'trade-away'].includes(rosterAction) && (
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Field label={rosterAction === 'trade-away' ? 'Destination team' : 'New roster team'}>
                  <input
                    required
                    value={rosterEvent.teamAfter}
                    onChange={(event) => updateRosterEvent(
                      'teamAfter',
                      event.target.value
                    )}
                    placeholder="Exact confirmed team"
                    className={inputClass}
                  />
                </Field>
                <Field
                  label={rosterAction === 'call-up' ? 'New position' : 'Confirmed position'}
                  hint={rosterAction === 'trade-away'
                    ? 'Optional. Leave blank to preserve the current roster position.'
                    : null}
                >
                  <input
                    required={rosterAction === 'call-up'}
                    value={rosterEvent.positionAfter}
                    onChange={(event) => updateRosterEvent(
                      'positionAfter',
                      event.target.value
                    )}
                    placeholder={rosterAction === 'call-up'
                      ? 'Exact confirmed position'
                      : 'Optional destination position'}
                    className={inputClass}
                  />
                </Field>
                <Field label="New RoleType">
                  <input
                    required
                    value={rosterEvent.roleTypeAfter}
                    onChange={(event) => updateRosterEvent(
                      'roleTypeAfter',
                      event.target.value
                    )}
                    placeholder="Exact confirmed RoleType"
                    className={inputClass}
                  />
                </Field>
              </div>
            )}

            {rosterAction === 'trade-away' && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-950/10 p-3 text-[10px] leading-relaxed text-amber-200">
                <TriangleAlert size={15} className="mt-0.5 shrink-0" />
                This marks the citizen Traded and outside Oakland. The citizen and
                roster rows remain present; engine.90 owns any later archive.
              </div>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field
                label="Verification source"
                hint="The source confirms the exact transition fields; feed Notes stay separate."
              >
                <div className="relative">
                  <select
                    required
                    value={verificationSource}
                    onChange={(event) => {
                      setVerificationSource(event.target.value);
                      setRosterEventReviewed(false);
                      setPreview(null);
                    }}
                    className={selectClass}
                  >
                    <Options values={mutationOptions.verificationSources} />
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-neutral-600" />
                </div>
              </Field>
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${rosterEventReady ? 'border-emerald-400/20 bg-emerald-950/15' : 'border-amber-400/20 bg-amber-950/10'}`}>
                <input
                  type="checkbox"
                  checked={rosterEventReviewed}
                  onChange={(event) => {
                    setRosterEventReviewed(event.target.checked);
                    setPreview(null);
                  }}
                  className="mt-0.5 size-4 accent-violet-400"
                />
                <span className="text-[9px] leading-relaxed text-neutral-300">
                  I checked the exact source state and every proposed transition
                  shown above.
                </span>
              </label>
            </div>
          </section>
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

        {(showGame || showStatsCapture || showState) && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {(showGame || showStatsCapture) && (
              <Field
                label={showStatsCapture ? 'Reviewed stat summary' : 'Player / game stats'}
                hint={showStatsCapture ? 'Newsroom-facing context only; structured values stay in the roster ledger.' : null}
              >
                <input
                  required={showStatsCapture}
                  value={draft.Stats}
                  onChange={(event) => update('Stats', event.target.value)}
                  placeholder={showStatsCapture ? 'Concise reviewed current-season summary' : 'e.g. established stat line'}
                  className={inputClass}
                />
              </Field>
            )}
            {(showGame || showState) && (
              <>
                <Field label="Team record">
                  <input required={showGame} value={draft['Team Record']} onChange={(event) => update('Team Record', event.target.value)} placeholder="W-L, e.g. 12-7" className={inputClass} />
                </Field>
                <Field label="Streak">
                  <input value={draft.Streak} onChange={(event) => update('Streak', event.target.value.toUpperCase())} placeholder="W2 or L3" className={inputClass} />
                </Field>
              </>
            )}
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
            disabled={
              loading ||
              (showStatsCapture && !statFormReady) ||
              (showRosterEvent && !rosterEventReady)
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-black text-black transition hover:bg-neutral-200 disabled:opacity-50"
          >
            <Eye size={15} /> {
              loading
                ? 'Building preview…'
                : showStatsCapture
                  ? 'Preview stat changes'
                  : showRosterEvent
                    ? 'Preview state, life, and Ripple'
                    : 'Preview event and ripple'
            }
          </button>
          <p className="text-[9px] leading-relaxed text-neutral-400">
            Preview performs no write. Any available confirmation re-reads every
            signed source before applying one atomic operation.
          </p>
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
