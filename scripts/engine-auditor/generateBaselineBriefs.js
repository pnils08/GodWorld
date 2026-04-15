/**
 * generateBaselineBriefs (Phase 38.8) — per-engine-event baseline brief in the
 * shape described in PHASE_38_PLAN §12.3. Division III principle operational:
 * every structured event gets a baseline brief; sift promotes, publishes, or
 * suppresses. Source: Nieman Reports LA Times Homicide Report + Quakebot.
 *
 * Emits to output/baseline_briefs_c{XX}.json — NOT merged into the main audit
 * JSON (briefs are not ailments).
 *
 * v1 scope (per §12.2 — skip classes not currently in the ledger):
 *   - world event each (WorldEvents_V3_Ledger this cycle)
 *   - council vote (Initiative_Tracker.VoteCycle === cycle)
 *   - initiative milestone (phase changed vs prior audit)
 *   - approval shift > 5pts (Civic_Office_Ledger vs prior audit)
 * Births/deaths/graduations deferred until EventType taxonomy supports them.
 */

const VERSION = '1.0.0';

function num(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

function generate(ctx, ailmentPatterns) {
  const { cycle, snapshot, prior } = ctx;
  const briefs = [];

  const ailments = ailmentPatterns || [];
  const activeAilmentNeighborhoods = new Set();
  const activeAilmentInitiatives = new Set();
  for (const p of ailments) {
    if (p.severity === 'high' || p.severity === 'medium') {
      (p.affectedEntities.neighborhoods || []).forEach(n => activeAilmentNeighborhoods.add(n));
      (p.affectedEntities.initiatives || []).forEach(i => activeAilmentInitiatives.add(i));
    }
  }

  const ledger = snapshot.Simulation_Ledger || [];
  const citizenByPopId = new Map();
  for (const r of ledger) if (r.POPID) citizenByPopId.set(r.POPID, r);

  const tierOf = (popId) => {
    const r = citizenByPopId.get(popId);
    return r && r.Tier ? String(r.Tier) : null;
  };

  const coverage = snapshot.Edition_Coverage_Ratings || [];
  const lastEditionByDomain = {};
  for (const c of coverage) {
    const cyc = parseInt(c.Cycle, 10);
    const d = (c.Domain || '').toLowerCase();
    if (!d || Number.isNaN(cyc)) continue;
    if (!lastEditionByDomain[d] || cyc > lastEditionByDomain[d]) lastEditionByDomain[d] = cyc;
  }

  const makeId = (prefix, key) => `${prefix}-${key}-c${cycle}`;

  function makeBrief({ id, eventClass, subjectIds = [], neighborhood = null, facts = {}, threeLayerHandle, promotionHints = [] }) {
    return {
      id,
      eventClass,
      subjectIds,
      neighborhood,
      cycle,
      facts,
      threeLayerHandle,
      tier: 'C',
      promotionHints,
    };
  }

  // --- World events ---
  const events = snapshot.WorldEvents_V3_Ledger || [];
  const thisCycleEvents = events.filter(e => parseInt(e.Cycle, 10) === cycle);
  thisCycleEvents.forEach((e, idx) => {
    const domain = (e.Domain || 'unknown').toLowerCase();
    const nbhd = e.Neighborhood || null;
    const hints = [];
    if (nbhd && activeAilmentNeighborhoods.has(nbhd)) hints.push(`${nbhd} has an active ailment this cycle — event contextualizes it`);
    if (num(e.ImpactScore) != null && num(e.ImpactScore) >= 0.7) hints.push('High ImpactScore — likely newsworthy');
    if (String(e.ShockFlag).toLowerCase() === 'true') hints.push('ShockFlag set');

    briefs.push(makeBrief({
      id: makeId('event', `${domain}-${idx}`),
      eventClass: 'world-event',
      subjectIds: [],
      neighborhood: nbhd,
      facts: {
        description: e.EventDescription,
        eventType: e.EventType,
        domain: e.Domain,
        severity: e.Severity,
        impactScore: e.ImpactScore,
        lastDomainCoverageCycle: lastEditionByDomain[domain] || null,
      },
      threeLayerHandle: {
        engine: `${domain} domain event, impact ${e.ImpactScore || 'n/a'}`,
        simulation: nbhd ? `set in ${nbhd}` : 'no neighborhood attached',
        userActions: activeAilmentInitiatives.size > 0 ? `overlaps initiatives: ${[...activeAilmentInitiatives].join(', ')}` : '',
      },
      promotionHints: hints,
    }));
  });

  // --- Council votes (Initiative_Tracker.VoteCycle === cycle) ---
  const inits = snapshot.Initiative_Tracker || [];
  inits.forEach((init, i) => {
    if (parseInt(init.VoteCycle, 10) !== cycle && parseInt(init.OverrideVoteCycle, 10) !== cycle) return;
    const id = init.InitiativeID || init.Name;
    const hints = [];
    if (activeAilmentInitiatives.has(id)) hints.push('Initiative has an active ailment — vote reads as response');
    if ((init.Outcome || '').toLowerCase().includes('pass')) hints.push('Passed — milestone worth a feature');

    briefs.push(makeBrief({
      id: makeId('vote', id),
      eventClass: 'council-vote',
      subjectIds: [],
      neighborhood: null,
      facts: {
        initiativeId: id,
        initiativeName: init.Name,
        voteCycle: init.VoteCycle,
        outcome: init.Outcome,
        leadFaction: init.LeadFaction,
        oppositionFaction: init.OppositionFaction,
        swingVoter: init.SwingVoter,
      },
      threeLayerHandle: {
        engine: `vote tallied C${init.VoteCycle}, outcome=${init.Outcome || 'pending'}`,
        simulation: `lead=${init.LeadFaction || '?'} opp=${init.OppositionFaction || '?'} swing=${init.SwingVoter || 'none'}`,
        userActions: '',
      },
      promotionHints: hints,
    }));
  });

  // --- Initiative milestones (phase changed vs prior audit) ---
  const priorAudit = prior.find(p => p.cycle === cycle - 1);
  const priorInits = priorAudit && priorAudit.snapshots && priorAudit.snapshots.Initiative_Tracker;
  if (priorInits) {
    const priorById = new Map(priorInits.map(r => [r.InitiativeID || r.Name, r]));
    inits.forEach((init, i) => {
      const id = init.InitiativeID || init.Name;
      const prev = priorById.get(id);
      if (!prev) return;
      if (!init.ImplementationPhase || init.ImplementationPhase === prev.ImplementationPhase) return;
      const hints = [];
      if (activeAilmentInitiatives.has(id)) hints.push('Milestone advances a flagged ailment');
      briefs.push(makeBrief({
        id: makeId('milestone', id),
        eventClass: 'initiative-milestone',
        subjectIds: [],
        neighborhood: null,
        facts: {
          initiativeId: id,
          initiativeName: init.Name,
          fromPhase: prev.ImplementationPhase,
          toPhase: init.ImplementationPhase,
          policyDomain: init.PolicyDomain,
        },
        threeLayerHandle: {
          engine: `phase advanced ${prev.ImplementationPhase} → ${init.ImplementationPhase}`,
          simulation: init.AffectedNeighborhoods ? `affects: ${init.AffectedNeighborhoods}` : '',
          userActions: '',
        },
        promotionHints: hints,
      }));
    });
  }

  // --- Approval shifts > 5pts ---
  const council = snapshot.Civic_Office_Ledger || [];
  if (priorAudit && priorAudit.snapshots && priorAudit.snapshots.Civic_Office_Ledger) {
    const priorCouncil = new Map(priorAudit.snapshots.Civic_Office_Ledger.map(r => [r.OfficeId || r.PopId, r]));
    council.forEach((c, i) => {
      const key = c.OfficeId || c.PopId;
      if (!key) return;
      const prev = priorCouncil.get(key);
      if (!prev) return;
      const a1 = num(c.Approval), a0 = num(prev.Approval);
      if (a1 == null || a0 == null) return;
      const scale = Math.abs(a1) > 1.5 || Math.abs(a0) > 1.5 ? 5 : 0.05;
      const delta = a1 - a0;
      if (Math.abs(delta) < scale) return;

      const hints = [];
      const tier = tierOf(c.PopId);
      if (tier && (tier === '1' || tier === '2')) hints.push(`Tier-${tier} holder — feature candidate`);
      if (Math.abs(delta) >= scale * 2) hints.push('Magnitude ≥ 2× threshold — significant shift');

      briefs.push(makeBrief({
        id: makeId('approval', key),
        eventClass: 'approval-shift',
        subjectIds: c.PopId ? [c.PopId] : [],
        neighborhood: c.District || null,
        facts: {
          officeId: c.OfficeId,
          holder: c.Holder,
          district: c.District,
          previousApproval: a0,
          currentApproval: a1,
          delta: delta.toFixed(3),
        },
        threeLayerHandle: {
          engine: `approval ${a0} → ${a1} (Δ ${delta.toFixed(2)})`,
          simulation: c.Holder ? `${c.Holder} (${c.Faction || 'IND'})` : 'unknown holder',
          userActions: '',
        },
        promotionHints: hints,
      }));
    });
  }

  return briefs;
}

module.exports = { generate, version: VERSION };
