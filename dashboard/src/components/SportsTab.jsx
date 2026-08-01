import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader, RotateCcw } from 'lucide-react';
import {
  getSportsNotebook,
  getSportsOverview,
  getSportsWorkspace,
} from '../lib/sportsApi';
import SportsIntakeWorkspace from './SportsIntakeWorkspace';
import SportsNotebookInbox from './SportsNotebookInbox';
import SportsOverview from './SportsOverview';
import SportsRoster from './SportsRoster';

export default function SportsTab() {
  const [overviewEnvelope, setOverviewEnvelope] = useState(null);
  const [workspaces, setWorkspaces] = useState({ as: null, oaks: null });
  const [teamId, setTeamId] = useState('as');
  const [cycleInput, setCycleInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notebookEnvelope, setNotebookEnvelope] = useState(null);
  const [notebookLoading, setNotebookLoading] = useState(true);
  const [notebookError, setNotebookError] = useState('');
  const [notebookProvenance, setNotebookProvenance] = useState(null);

  const loadSports = useCallback(async (requestedCycle) => {
    setLoading(true);
    setError('');
    try {
      const overview = await getSportsOverview(requestedCycle);
      const cycle = overview.data.cycle;
      const [asWorkspace, oaksWorkspace] = await Promise.all([
        getSportsWorkspace(cycle, 'as'),
        getSportsWorkspace(cycle, 'oaks'),
      ]);
      setOverviewEnvelope(overview);
      setWorkspaces({ as: asWorkspace.data, oaks: oaksWorkspace.data });
      setCycleInput(String(cycle));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNotebook = useCallback(async () => {
    setNotebookLoading(true);
    setNotebookError('');
    try {
      setNotebookEnvelope(await getSportsNotebook(3));
    } catch (requestError) {
      setNotebookError(requestError.message);
    } finally {
      setNotebookLoading(false);
    }
  }, []);
  const clearNotebookProvenance = useCallback(() => setNotebookProvenance(null), []);

  useEffect(() => {
    loadSports();
    loadNotebook();
  }, [loadSports, loadNotebook]);

  const applyCycle = useCallback(() => {
    const cycle = Number(cycleInput);
    if (!Number.isInteger(cycle) || cycle <= 0) {
      setError('Cycle must be a positive whole number.');
      return;
    }
    loadSports(cycle);
  }, [cycleInput, loadSports]);

  const warnings = useMemo(() => {
    const all = overviewEnvelope?.warnings || [];
    return all.filter((warning, index) => all.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(warning)) === index);
  }, [overviewEnvelope]);

  function startDraft(item) {
    setNotebookProvenance({
      cycle: item.cycle,
      generatedAt: item.generatedAt,
      canonStatus: 'NOT_CANON',
    });
    window.setTimeout(() => {
      document.getElementById('sports-intake')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  if (loading && !overviewEnvelope) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="text-center">
          <Loader size={28} className="mx-auto animate-spin text-sky-400" />
          <p className="mt-3 text-xs font-mono text-neutral-400">Building the Oakland sports desk…</p>
        </div>
      </div>
    );
  }

  if (error && !overviewEnvelope) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-lg items-center justify-center">
        <div className="w-full rounded-3xl border border-red-400/20 bg-red-950/10 p-7 text-center">
          <AlertCircle size={28} className="mx-auto text-red-400" />
          <h2 className="mt-3 text-lg font-black text-white">Sports desk unavailable</h2>
          <p className="mt-2 text-xs leading-relaxed text-neutral-400">{error}</p>
          <button type="button" onClick={() => loadSports()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-xs font-black text-black">
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const cycle = overviewEnvelope?.data?.cycle;
  const selectedWorkspace = workspaces[teamId];

  return (
    <div className="pb-20">
      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-950/20 p-3 text-xs text-red-300">
          <span>{error}</span>
          <button type="button" onClick={applyCycle} className="shrink-0 font-black uppercase tracking-wider text-white">Retry</button>
        </div>
      )}
      <SportsOverview
        overview={overviewEnvelope?.data}
        source={overviewEnvelope?.source}
        warnings={warnings}
        cycleInput={cycleInput}
        onCycleInput={setCycleInput}
        onApplyCycle={applyCycle}
        onRefresh={() => loadSports(cycle)}
        loading={loading}
      />
      <SportsRoster
        teamId={teamId}
        onTeamChange={setTeamId}
        workspace={selectedWorkspace}
      />
      <SportsNotebookInbox
        items={notebookEnvelope?.data?.items || []}
        warnings={notebookEnvelope?.warnings || []}
        loading={notebookLoading}
        error={notebookError}
        onRetry={loadNotebook}
        onStartDraft={startDraft}
      />
      <SportsIntakeWorkspace
        cycle={cycle}
        teamId={teamId}
        onTeamChange={setTeamId}
        workspace={selectedWorkspace}
        notebookProvenance={notebookProvenance}
        onNotebookConsumed={clearNotebookProvenance}
        onEntryWritten={(receipt) => loadSports(receipt.cycle)}
      />
    </div>
  );
}
