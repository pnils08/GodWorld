import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Menu,
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  ChevronRight,
  ChevronDown,
  Clock,
  Database,
  ArrowRight,
  Newspaper,
  MapPin,
  Shield,
  Loader,
  AlertCircle,
  Landmark,
  CircleDot,
  AlertTriangle,
  CheckCircle2,
  Timer,
  FileWarning,
  Zap,
  BookOpen,
  GitBranch,
  Eye,
  FileText,
  Hash,
  Target,
  Trophy,
} from 'lucide-react';

// --- Data Fetching ---

async function fetchAPI(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

// --- App ---

export default function App() {
  const [view, setView] = useState('feed');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('EDITION');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // Data state
  const [health, setHealth] = useState(null);
  const [edition, setEdition] = useState(null);
  const [council, setCouncil] = useState(null);
  const [neighborhoods, setNeighborhoods] = useState(null);
  const [citizens, setCitizens] = useState(null);
  const [initiatives, setInitiatives] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [hooks, setHooks] = useState(null);
  const [arcs, setArcs] = useState(null);
  const [storylines, setStorylines] = useState(null);
  const [articleSearchResults, setArticleSearchResults] = useState(null);
  const [articleQuery, setArticleQuery] = useState('');
  const [sports, setSports] = useState(null);
  const [overlayArticle, setOverlayArticle] = useState(null);
  const [citizenDetail, setCitizenDetail] = useState(null);
  const [coverageTrail, setCoverageTrail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load data on mount
  useEffect(() => {
    async function loadAll() {
      try {
        const [h, e, c, n, cz, iv] = await Promise.all([
          fetchAPI('/api/health'),
          fetchAPI('/api/edition/latest'),
          fetchAPI('/api/council'),
          fetchAPI('/api/neighborhoods'),
          fetchAPI('/api/citizens?tier=1&limit=50'),
          fetchAPI('/api/initiatives'),
        ]);
        setHealth(h);
        setEdition(e);
        setCouncil(c);
        setNeighborhoods(n);
        setCitizens(cz);
        setInitiatives(iv);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  // Citizen search (header search)
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await fetchAPI(`/api/citizens?search=${encodeURIComponent(searchQuery)}&limit=20`);
        setSearchResults(data);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Article search
  const runArticleSearch = useCallback(async (q) => {
    if (!q || q.length < 2) { setArticleSearchResults(null); return; }
    try {
      const data = await fetchAPI(`/api/search/articles?q=${encodeURIComponent(q)}&limit=30`);
      setArticleSearchResults(data);
    } catch { /* ignore */ }
  }, []);

  // Load sports data when SPORTS tab is selected
  useEffect(() => {
    if (activeTab === 'SPORTS' && !sports) {
      fetchAPI('/api/sports').then(setSports).catch(() => {});
    }
  }, [activeTab, sports]);

  // Load hooks/arcs when INTEL tab is selected
  useEffect(() => {
    if (activeTab === 'INTEL' && !hooks) {
      Promise.all([
        fetchAPI('/api/hooks'),
        fetchAPI('/api/arcs'),
        fetchAPI('/api/storylines?status=active'),
      ]).then(([h, a, s]) => {
        setHooks(h);
        setArcs(a);
        setStorylines(s);
      }).catch(() => {});
    }
  }, [activeTab, hooks]);

  // Load full article for overlay search
  const loadOverlayArticle = useCallback(async (r) => {
    if (r.file && r.articleIndex !== undefined) {
      try {
        const data = await fetchAPI(`/api/article?file=${encodeURIComponent(r.file)}&index=${r.articleIndex}`);
        setOverlayArticle(data);
        setCitizenDetail(null);
        setCoverageTrail(null);
      } catch { /* ignore */ }
    }
  }, []);

  // Load citizen detail
  const loadCitizenDetail = useCallback(async (popId) => {
    try {
      const [detail, coverage] = await Promise.all([
        fetchAPI(`/api/citizens/${popId}`),
        fetchAPI(`/api/citizen-coverage/${encodeURIComponent(popId)}`),
      ]);
      setCitizenDetail(detail);
      // Also try name-based coverage if we have the name
      if (detail.ledger?.First && detail.ledger?.Last) {
        const nameCoverage = await fetchAPI(`/api/citizen-coverage/${encodeURIComponent(detail.ledger.First + ' ' + detail.ledger.Last)}`);
        setCoverageTrail(nameCoverage);
      } else {
        setCoverageTrail(coverage);
      }
    } catch { /* ignore */ }
  }, []);

  // Faction colors
  const factionColor = (f) => {
    if (!f) return 'bg-neutral-700 text-neutral-300';
    switch (f.toUpperCase()) {
      case 'OPP': return 'bg-sky-500/20 text-sky-400';
      case 'CRC': return 'bg-amber-500/20 text-amber-400';
      case 'IND': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-neutral-700 text-neutral-300';
    }
  };

  const sentimentIcon = (val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return null;
    return n >= 0.5
      ? <TrendingUp size={14} className="inline ml-1 text-green-400" />
      : <TrendingDown size={14} className="inline ml-1 text-amber-400" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <Loader size={32} className="text-sky-500 animate-spin mx-auto mb-4" />
          <p className="text-neutral-500 text-sm font-mono">Loading GodWorld...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <AlertCircle size={32} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-400 text-sm font-mono mb-2">Connection Failed</p>
          <p className="text-neutral-500 text-xs">{error}</p>
          <p className="text-neutral-600 text-xs mt-4">Make sure the API server is running: <code className="text-neutral-400">npm start</code></p>
        </div>
      </div>
    );
  }

  const edHeader = edition?.header || {};
  const articles = edition?.articles || [];
  const councilMembers = council?.council || [];
  const hoods = neighborhoods?.neighborhoods || [];
  const tier1 = citizens?.citizens || [];

  const avgSentiment = hoods.length
    ? (hoods.reduce((s, h) => s + h.sentiment, 0) / hoods.length).toFixed(2)
    : edHeader.sentiment || '—';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] font-sans selection:bg-sky-500/30 pb-24">

      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5 py-4 px-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter leading-none italic">
            Bay Tribune <span className="text-sky-500 underline decoration-2 underline-offset-4">Oakland</span>
          </h1>
          <div className="flex gap-2 mt-1">
            <span className="text-[8px] font-mono text-neutral-500">GODWORLD ENGINE v3.1</span>
            <span className="text-[8px] font-mono text-sky-400">
              CYCLE {edHeader.cycle || health?.data?.latestCycleArchive?.replace('cycle-', '') || '—'}
            </span>
            <span className="text-[8px] font-mono text-neutral-500">
              {edHeader.season || ''}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setSearchOpen(!searchOpen); setMenuOpen(false); }}
            className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full border border-white/10 active:scale-90 transition-transform"
          >
            <Search size={16} />
          </button>
          <button
            onClick={() => { setMenuOpen(!menuOpen); setSearchOpen(false); }}
            className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full border border-white/10 active:scale-90 transition-transform"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* SEARCH OVERLAY — Now dual-mode: citizens + articles */}
      {searchOpen && (
        <div className="fixed inset-0 z-40 bg-black/95 pt-24 px-6 overflow-y-auto pb-24">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-3 bg-neutral-900 rounded-2xl border border-white/10 px-4 py-3">
              <Search size={18} className="text-neutral-500" />
              <input
                type="text"
                placeholder="Search citizens, articles, stories..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  runArticleSearch(e.target.value);
                }}
                autoFocus
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-neutral-600"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setArticleSearchResults(null); setSearchResults(null); setCitizenDetail(null); setCoverageTrail(null); setOverlayArticle(null); }} className="text-neutral-500">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Citizen Results */}
            {searchResults && searchResults.citizens?.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mb-2">
                  <Users size={10} className="inline mr-1" /> {searchResults.total} citizens
                </p>
                <div className="space-y-2">
                  {searchResults.citizens.map(c => (
                    <div
                      key={c.popId}
                      className="p-4 bg-neutral-900/60 rounded-xl border border-white/5 flex justify-between items-center cursor-pointer hover:border-sky-500/30 transition-colors"
                      onClick={() => loadCitizenDetail(c.popId)}
                    >
                      <div>
                        <div className="text-sm font-bold">{c.firstName} {c.lastName}</div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">
                          {c.role} {c.neighborhood ? `· ${c.neighborhood}` : ''} · Tier {c.tier}
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-neutral-600">{c.popId}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Citizen Detail Panel */}
            {citizenDetail && (
              <CitizenDetailPanel
                detail={citizenDetail}
                coverage={coverageTrail}
                onClose={() => { setCitizenDetail(null); setCoverageTrail(null); }}
              />
            )}

            {/* Full Article Reader (overlay) */}
            {overlayArticle && (
              <div className="mt-4">
                <button
                  onClick={() => setOverlayArticle(null)}
                  className="flex items-center gap-2 text-[10px] text-neutral-500 hover:text-white transition-colors mb-3"
                >
                  <ChevronRight size={12} className="rotate-180" /> Back to results
                </button>
                <FullArticleReader article={overlayArticle} />
              </div>
            )}

            {/* Article Results */}
            {!overlayArticle && articleSearchResults && articleSearchResults.results?.length > 0 && (
              <div className="mt-6">
                <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mb-2">
                  <FileText size={10} className="inline mr-1" /> {articleSearchResults.total} articles
                </p>
                <div className="space-y-2">
                  {articleSearchResults.results.map((r, i) => (
                    <div key={i} className="p-3 bg-neutral-900/40 rounded-xl border border-white/5 cursor-pointer hover:border-sky-500/30 transition-colors"
                      onClick={() => loadOverlayArticle(r)}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-mono text-sky-500">{r.cycle ? `E${r.cycle}` : 'ARCHIVE'}</span>
                        <span className="text-[9px] text-neutral-600">{r.section}</span>
                      </div>
                      <h4 className="text-xs font-bold mb-1">{r.title}</h4>
                      {r.snippet && (
                        <p className="text-[10px] text-neutral-500 leading-relaxed line-clamp-2">{r.snippet}</p>
                      )}
                      <div className="flex justify-between items-center mt-1">
                        {r.author && <span className="text-[9px] text-neutral-600">{r.author}</span>}
                        <span className="text-[8px] text-neutral-600 font-mono">{r.bodyLength > 1000 ? `${Math.round(r.bodyLength/1000)}k` : `${r.bodyLength}b`}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MENU OVERLAY */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black pt-24 px-8 space-y-6">
          {[
            { label: 'Edition Feed', view: 'feed', tab: 'EDITION' },
            { label: 'City Council', view: 'council', tab: 'COUNCIL' },
            { label: 'Initiative Tracker', view: 'tracker', tab: 'TRACKER' },
            { label: 'Story Intel', view: 'intel', tab: 'INTEL' },
            { label: 'Sports', view: 'sports', tab: 'SPORTS' },
            { label: 'Neighborhoods', view: 'neighborhoods', tab: 'CITY' },
            { label: 'Article Search', view: 'search', tab: 'SEARCH' },
          ].map(item => (
            <div
              key={item.view}
              className="group cursor-pointer"
              onClick={() => { setView(item.view); setActiveTab(item.tab); setMenuOpen(false); }}
            >
              <span className="text-4xl font-black uppercase tracking-tighter group-hover:text-sky-500 transition-colors">
                {item.label}
              </span>
              <ChevronRight size={24} className="inline ml-2 text-neutral-600 group-hover:text-sky-500 transition-colors" />
            </div>
          ))}
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="pt-24 px-5 max-w-2xl mx-auto">

        {/* TELEMETRY CARDS */}
        <section className="mb-8">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <MetricCard label="Cycle" value={edHeader.cycle || '—'} color="sky" />
            <MetricCard label="Sentiment" value={avgSentiment} color="amber" icon={sentimentIcon(avgSentiment)} />
            <MetricCard label="Neighborhoods" value={hoods.length || '17'} color="neutral" />
            <MetricCard label="Council" value={`${councilMembers.filter(c => c.officeId?.startsWith('COUNCIL')).length} seats`} color="neutral" />
          </div>

          {/* STATUS TICKER */}
          <div className="bg-black border border-sky-500/20 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 rounded-lg shrink-0">
              <Activity size={16} className="text-sky-500" />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-[10px] font-mono text-sky-400 uppercase tracking-tighter">System Status</div>
              <p className="text-[11px] text-neutral-400 truncate">
                {edHeader.weather || 'API online'} · {edHeader.pattern ? `Pattern: ${edHeader.pattern}` : `Data: ${health?.data?.latestCycleArchive || 'connected'}`}
              </p>
            </div>
          </div>
        </section>

        {/* TAB BAR */}
        <div className="flex gap-3 border-b border-white/5 mb-6 overflow-x-auto no-scrollbar">
          {['EDITION', 'COUNCIL', 'TRACKER', 'INTEL', 'SPORTS', 'CITY', 'SEARCH'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 text-[10px] font-black tracking-widest uppercase transition-colors whitespace-nowrap ${activeTab === tab ? 'text-white border-b-2 border-sky-500' : 'text-neutral-500'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* EDITION TAB */}
        {activeTab === 'EDITION' && (
          <section className="space-y-6">
            {articles.length === 0 && (
              <div className="p-8 text-center text-neutral-600">
                <Newspaper size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">No edition data loaded</p>
              </div>
            )}
            {articles.map((article, i) => (
              <ArticleCard key={i} article={article} isFirst={i === 0} />
            ))}
          </section>
        )}

        {/* COUNCIL TAB */}
        {activeTab === 'COUNCIL' && (
          <section className="space-y-4">
            {councilMembers.filter(c => c.officeId === 'MAYOR-01').map(m => (
              <div key={m.officeId} className="p-5 bg-neutral-900/60 rounded-2xl border border-sky-500/20">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] font-black text-sky-500 uppercase tracking-widest">Mayor</span>
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold ${factionColor(m.faction)}`}>{m.faction}</span>
                </div>
                <h3 className="text-xl font-black tracking-tight">{m.holder}</h3>
                <p className="text-xs text-neutral-500 mt-1">{m.notes}</p>
              </div>
            ))}
            <div className="grid grid-cols-1 gap-3">
              {councilMembers.filter(c => c.officeId?.startsWith('COUNCIL-')).map(m => (
                <div key={m.officeId} className="p-4 bg-neutral-900/40 rounded-xl border border-white/5 flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-mono text-neutral-600">{m.district}</span>
                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold ${factionColor(m.faction)}`}>{m.faction}</span>
                      {m.status === 'injured' && (
                        <span className="text-[8px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">INJURED</span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold">{m.holder}</h4>
                    <p className="text-[10px] text-neutral-500 mt-0.5">{m.notes}</p>
                  </div>
                  <span className="text-[9px] font-mono text-neutral-700">{m.popId}</span>
                </div>
              ))}
            </div>
            <div className="p-4 bg-black rounded-xl border border-white/5 mt-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Faction Breakdown</h4>
              <div className="flex gap-4">
                {['OPP', 'CRC', 'IND'].map(faction => {
                  const count = councilMembers.filter(c => c.officeId?.startsWith('COUNCIL-') && c.faction === faction).length;
                  return (
                    <div key={faction} className="flex-1 text-center">
                      <div className={`text-xl font-black ${faction === 'OPP' ? 'text-sky-400' : faction === 'CRC' ? 'text-amber-400' : 'text-purple-400'}`}>
                        {count}
                      </div>
                      <div className="text-[9px] font-bold text-neutral-500 uppercase">{faction}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* TRACKER TAB */}
        {activeTab === 'TRACKER' && (
          <section className="space-y-4">
            {initiatives?.summary && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                <StatusBadge label="Blocked" count={initiatives.summary.blocked} color="red" />
                <StatusBadge label="Stalled" count={initiatives.summary.stalled} color="amber" />
                <StatusBadge label="Clock" count={initiatives.summary.clockRunning} color="sky" />
                <StatusBadge label="Active" count={initiatives.summary.inProgress} color="green" />
              </div>
            )}
            {(initiatives?.initiatives || []).map(init => (
              <InitiativeCard key={init.id} initiative={init} />
            ))}
            {initiatives?.lastUpdated && (
              <p className="text-[9px] text-neutral-600 text-center mt-6 font-mono">
                Last updated: {initiatives.lastUpdated} by {initiatives.updatedBy}
              </p>
            )}
          </section>
        )}

        {/* INTEL TAB — Hooks, Arcs, Storylines */}
        {activeTab === 'INTEL' && (
          <section className="space-y-6">
            {/* Story Hooks */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-widest">Story Hooks</h3>
                <span className="text-[9px] font-mono text-neutral-600">{hooks?.total || 0}</span>
              </div>
              {(hooks?.hooks || []).slice(0, 10).map((hook, i) => (
                <HookCard key={i} hook={hook} />
              ))}
              {!hooks && <p className="text-[10px] text-neutral-600">Loading...</p>}
            </div>

            {/* Active Arcs */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GitBranch size={14} className="text-purple-400" />
                <h3 className="text-xs font-black uppercase tracking-widest">Active Arcs</h3>
                <span className="text-[9px] font-mono text-neutral-600">{arcs?.total || 0}</span>
              </div>
              {(arcs?.arcs || []).slice(0, 10).map((arc, i) => (
                <ArcCard key={i} arc={arc} />
              ))}
            </div>

            {/* Storylines */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={14} className="text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-widest">Active Storylines</h3>
                <span className="text-[9px] font-mono text-neutral-600">{storylines?.total || 0}</span>
              </div>
              {(storylines?.storylines || []).slice(0, 15).map((sl, i) => (
                <StorylineCard key={i} storyline={sl} />
              ))}
            </div>
          </section>
        )}

        {/* SPORTS TAB */}
        {activeTab === 'SPORTS' && (
          <section className="space-y-6">
            {!sports && (
              <div className="p-8 text-center text-neutral-600">
                <Loader size={24} className="mx-auto mb-3 animate-spin text-sky-500" />
                <p className="text-sm">Loading sports data...</p>
              </div>
            )}
            {sports && (
              <>
                <SportsSection city="oakland" data={sports.oakland} color="green" />
                <SportsSection city="chicago" data={sports.chicago} color="red" />
              </>
            )}
          </section>
        )}

        {/* CITY TAB */}
        {activeTab === 'CITY' && (
          <section className="space-y-3">
            {hoods.sort((a, b) => b.sentiment - a.sentiment).map(h => (
              <div key={h.name} className="p-4 bg-neutral-900/40 rounded-xl border border-white/5">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-sky-500" />
                    <h4 className="text-sm font-bold">{h.name}</h4>
                  </div>
                  <span className={`text-xs font-mono font-bold ${h.sentiment >= 0.92 ? 'text-green-400' : h.sentiment >= 0.88 ? 'text-sky-400' : 'text-amber-400'}`}>
                    {h.sentiment.toFixed(2)}
                  </span>
                </div>
                <div className="flex gap-4 mt-2">
                  <MiniStat label="Crime" value={h.crimeIndex} warn={h.crimeIndex >= 2} />
                  <MiniStat label="Nightlife" value={h.nightlife.toFixed(1)} />
                  <MiniStat label="Retail" value={h.retailVitality.toFixed(1)} />
                  <MiniStat label="Events" value={h.eventAttractiveness.toFixed(0)} />
                </div>
                {h.demographic && h.demographic !== 'Stable' && (
                  <p className="text-[10px] text-amber-400 mt-2">{h.demographic}</p>
                )}
              </div>
            ))}
          </section>
        )}

        {/* SEARCH TAB — Dedicated article search */}
        {activeTab === 'SEARCH' && (
          <ArticleSearchView />
        )}

        {/* KEY CITIZENS */}
        {activeTab === 'EDITION' && tier1.length > 0 && (
          <section className="mt-12 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Shield size={18} className="text-sky-500" />
              <h4 className="text-sm font-black uppercase tracking-widest">Key Figures</h4>
              <span className="text-[9px] text-neutral-600 font-mono">TIER 1</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {tier1.slice(0, 12).map(c => (
                <div key={c.popId} className="p-3 bg-neutral-900/40 rounded-xl border border-white/5 cursor-pointer hover:border-sky-500/30 transition-colors"
                  onClick={() => { setSearchOpen(true); loadCitizenDetail(c.popId); }}
                >
                  <div className="flex justify-between items-start">
                    <div className="text-xs font-bold">{c.firstName} {c.lastName}</div>
                    <span className="text-[7px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 font-black border border-amber-500/20">T{c.tier}</span>
                  </div>
                  <div className="text-[9px] text-neutral-500 mt-0.5">{c.role}</div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[8px] text-neutral-600">{c.neighborhood}</span>
                    {c.totalRefs > 0 && (
                      <span className="text-[8px] font-mono text-sky-500/60">{c.totalRefs} refs</span>
                    )}
                  </div>
                  {c.originCity && <div className="text-[8px] text-neutral-600 mt-0.5 italic">{c.originCity}</div>}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-6 inset-x-6 h-16 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-full flex items-center justify-around px-4 shadow-2xl z-50 max-w-lg mx-auto">
        <NavButton icon={Newspaper} active={activeTab === 'EDITION'} onClick={() => { setView('feed'); setActiveTab('EDITION'); }} />
        <NavButton icon={Shield} active={activeTab === 'COUNCIL'} onClick={() => { setView('council'); setActiveTab('COUNCIL'); }} />
        <NavButton icon={Landmark} active={activeTab === 'TRACKER'} onClick={() => { setView('tracker'); setActiveTab('TRACKER'); }} />
        <NavButton icon={Zap} active={activeTab === 'INTEL'} onClick={() => { setView('intel'); setActiveTab('INTEL'); }} />
        <NavButton icon={Trophy} active={activeTab === 'SPORTS'} onClick={() => { setView('sports'); setActiveTab('SPORTS'); }} />
        <NavButton icon={MapPin} active={activeTab === 'CITY'} onClick={() => { setView('neighborhoods'); setActiveTab('CITY'); }} />
      </nav>
    </div>
  );
}

// --- Components ---

function MetricCard({ label, value, color, icon }) {
  const colorMap = { sky: 'text-sky-500', amber: 'text-amber-500', neutral: 'text-neutral-500' };
  return (
    <div className="p-4 bg-neutral-900 rounded-2xl border border-white/5">
      <div className={`text-[10px] font-bold uppercase mb-1 ${colorMap[color] || colorMap.neutral}`}>{label}</div>
      <div className="text-xl font-black tracking-tight">{value} {icon}</div>
    </div>
  );
}

function ArticleCard({ article, isFirst }) {
  const [expanded, setExpanded] = useState(false);
  const sectionColors = {
    'FRONT PAGE': 'text-sky-500', 'CIVIC AFFAIRS': 'text-emerald-500', 'SPORTS': 'text-amber-500',
    'CULTURE & COMMUNITY': 'text-purple-500', 'BUSINESS TICKER': 'text-orange-500',
    'CHICAGO BUREAU': 'text-red-500', 'LETTERS TO THE EDITOR': 'text-neutral-400',
  };
  const bodyLines = (article.body || '').split('\n').filter(l => l.trim());
  const summary = bodyLines[0] || '';

  return (
    <div className="group" onClick={() => setExpanded(!expanded)}>
      {isFirst && (
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-sky-500 animate-ping" />
          <span className="text-[9px] font-black text-sky-500 uppercase tracking-widest">Lead Story</span>
        </div>
      )}
      <div className={`p-6 bg-neutral-900/40 border rounded-[2rem] cursor-pointer transition-colors ${expanded ? 'border-sky-500/30 bg-neutral-900' : 'border-white/10 hover:bg-neutral-900'}`}>
        <div className="flex justify-between items-start mb-4">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${sectionColors[article.section] || 'text-neutral-500'}`}>
            {article.section}
          </span>
        </div>
        <h3 className={`text-xl font-black leading-tight tracking-tight mb-1 uppercase italic transition-colors ${expanded ? 'text-sky-400' : 'group-hover:text-sky-400'}`}>
          {article.title}
        </h3>
        {article.subtitle && <p className="text-xs text-neutral-400 italic mb-3">{article.subtitle}</p>}
        {!expanded && <p className="text-sm text-neutral-400 leading-relaxed mb-6 line-clamp-3">{summary}</p>}
        {expanded && (
          <div className="mt-4 space-y-3">
            {bodyLines.map((line, i) => <p key={i} className="text-sm text-neutral-300 leading-relaxed">{line}</p>)}
            {article.namesIndex && (
              <div className="pt-3 border-t border-white/5">
                <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Names Index: </span>
                <span className="text-[10px] text-neutral-500">{article.namesIndex}</span>
              </div>
            )}
          </div>
        )}
        {article.author && (
          <div className={`flex items-center justify-between pt-4 border-t border-white/5 ${expanded ? 'mt-4' : ''}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center font-bold text-[10px]">
                {article.author[0]}
              </div>
              <div>
                <span className="text-[10px] font-bold text-neutral-400">{article.author}</span>
                {article.desk && <span className="text-[9px] text-neutral-600 block">{article.desk}</span>}
              </div>
            </div>
            <div className={`p-2 rounded-full transition-all ${expanded ? 'bg-sky-500 text-black rotate-90' : 'bg-white/5'}`}>
              <ArrowRight size={16} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HookCard({ hook }) {
  const [expanded, setExpanded] = useState(false);
  const domainColors = {
    CIVIC: 'text-emerald-400', ECONOMIC: 'text-orange-400', CRIME: 'text-red-400',
    HEALTH: 'text-pink-400', CULTURE: 'text-purple-400', SPORTS: 'text-amber-400',
    NIGHTLIFE: 'text-violet-400',
  };
  return (
    <div className="p-3 bg-neutral-900/40 rounded-xl border border-white/5 mb-2 cursor-pointer hover:border-amber-500/20 transition-colors"
      onClick={() => setExpanded(!expanded)}>
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-black uppercase ${domainColors[hook.domain] || 'text-neutral-500'}`}>{hook.domain}</span>
          {hook.neighborhood && <span className="text-[9px] text-neutral-600">{hook.neighborhood}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-amber-500">P{hook.priorityScore || hook.priority}</span>
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">{hook.hookType}</span>
        </div>
      </div>
      <p className={`text-[11px] text-neutral-300 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>{hook.text}</p>
      {expanded && hook.suggestedDesks && (
        <p className="text-[9px] text-sky-500 mt-2">Desk: {hook.suggestedDesks}</p>
      )}
    </div>
  );
}

function ArcCard({ arc }) {
  const phaseColors = { early: 'text-sky-400', rising: 'text-amber-400', peak: 'text-red-400', falling: 'text-purple-400', resolved: 'text-green-400' };
  const tension = parseFloat(arc.tension) || 0;
  const tensionWidth = Math.min(100, (tension / 5) * 100);
  return (
    <div className="p-3 bg-neutral-900/40 rounded-xl border border-white/5 mb-2">
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase text-purple-400">{arc.domain}</span>
          <span className={`text-[9px] font-bold ${phaseColors[arc.phase] || 'text-neutral-500'}`}>{arc.phase}</span>
        </div>
        <div className="flex items-center gap-2">
          {arc.neighborhood && <span className="text-[9px] text-neutral-600">{arc.neighborhood}</span>}
          <span className="text-[9px] font-mono text-neutral-500">age {arc.arcAge}</span>
        </div>
      </div>
      <p className="text-[11px] text-neutral-300 mb-2">{arc.summary}</p>
      <div className="flex items-center gap-2">
        <span className="text-[8px] text-neutral-600 uppercase">Tension</span>
        <div className="flex-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${tension > 3 ? 'bg-red-500' : tension > 2 ? 'bg-amber-500' : 'bg-sky-500'}`}
            style={{ width: `${tensionWidth}%` }} />
        </div>
        <span className="text-[9px] font-mono text-neutral-500">{tension.toFixed(1)}</span>
      </div>
    </div>
  );
}

function StorylineCard({ storyline }) {
  const priorityColors = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-neutral-500' };
  return (
    <div className="p-3 bg-neutral-900/40 rounded-xl border border-white/5 mb-2">
      <div className="flex justify-between items-start mb-1">
        <span className={`text-[9px] font-black uppercase ${priorityColors[storyline.priority] || 'text-neutral-500'}`}>
          {storyline.priority} · {storyline.type}
        </span>
        <span className="text-[9px] font-mono text-neutral-600">C{storyline.cycleAdded}</span>
      </div>
      <p className="text-[11px] text-neutral-300 leading-relaxed">{storyline.description}</p>
      <div className="flex gap-2 mt-1.5">
        {storyline.relatedCitizens && <span className="text-[9px] text-sky-500">{storyline.relatedCitizens}</span>}
        {storyline.neighborhood && <span className="text-[9px] text-neutral-600">{storyline.neighborhood}</span>}
        {storyline.desks?.length > 0 && (
          <span className="text-[8px] text-neutral-600">{storyline.desks.join(', ')}</span>
        )}
      </div>
    </div>
  );
}

function CitizenDetailPanel({ detail, coverage, onClose }) {
  const l = detail.ledger || {};
  const flags = detail.flags || {};
  const lifeEvents = detail.lifeEvents || [];
  const name = `${l.First || ''} ${l.Last || ''}`.trim() || detail.popId;

  const tierColors = {
    '1': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    '2': 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    '3': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    '4': 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30',
  };

  const lifeTagColors = {
    Education: 'bg-blue-500/20 text-blue-400',
    Work: 'bg-emerald-500/20 text-emerald-400',
    Team: 'bg-amber-500/20 text-amber-400',
    Social: 'bg-pink-500/20 text-pink-400',
    Health: 'bg-red-500/20 text-red-400',
    Engine: 'bg-purple-500/20 text-purple-400',
    General: 'bg-neutral-500/20 text-neutral-400',
    Crime: 'bg-red-500/20 text-red-400',
    Family: 'bg-pink-500/20 text-pink-400',
    Faith: 'bg-violet-500/20 text-violet-400',
  };

  return (
    <div className="mt-4 p-5 bg-neutral-900 rounded-2xl border border-sky-500/20">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-black">{name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] font-mono text-sky-500">{detail.popId}</span>
            {l.Tier && (
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black border ${tierColors[l.Tier] || tierColors['4']}`}>
                TIER {l.Tier}
              </span>
            )}
            {l.Status && l.Status !== 'Active' && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">{l.Status}</span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-neutral-500 hover:text-white">
          <X size={16} />
        </button>
      </div>

      {/* Involvement flags */}
      {(flags.universe || flags.media || flags.civic) && (
        <div className="flex gap-1.5 mb-3">
          {flags.universe && <span className="text-[8px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold border border-amber-500/20">UNI</span>}
          {flags.media && <span className="text-[8px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 font-bold border border-sky-500/20">MED</span>}
          {flags.civic && <span className="text-[8px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/20">CIV</span>}
        </div>
      )}

      {/* Core data grid */}
      {l.First && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <MiniDetail label="Role" value={l.RoleType} />
          <MiniDetail label="Neighborhood" value={l.Neighborhood} />
          <MiniDetail label="Birth Year" value={l.BirthYear} />
          <MiniDetail label="Origin" value={l.OriginGame || l.OriginVault || 'Engine'} />
          {flags.originCity && <MiniDetail label="Origin City" value={flags.originCity} />}
          {l.ClockMode && <MiniDetail label="Clock" value={l.ClockMode} />}
          {flags.usageCount > 0 && <MiniDetail label="Engine Refs" value={flags.usageCount} />}
        </div>
      )}

      {/* Life History Timeline */}
      {lifeEvents.length > 0 && (
        <div className="mb-4">
          <h4 className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">
            Life History <span className="text-neutral-600">({lifeEvents.length} events)</span>
          </h4>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {lifeEvents.map((ev, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-black/30 rounded-lg">
                {ev.date && <span className="text-[8px] font-mono text-neutral-600 shrink-0 mt-0.5">{ev.date}</span>}
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold shrink-0 ${lifeTagColors[ev.tag] || lifeTagColors.General}`}>
                  {ev.tag}
                </span>
                <span className="text-[10px] text-neutral-300 leading-relaxed">{ev.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Archive — article appearances */}
      {detail.voiceCard && detail.voiceCard.articles?.length > 0 && (
        <div className="mb-4">
          <h4 className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-2">
            Archive <span className="text-neutral-600">({detail.voiceCard.totalRefs} refs, {detail.voiceCard.articles.length} sources)</span>
          </h4>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {detail.voiceCard.articles.map((a, i) => (
              <div key={i} className="flex items-start gap-2 p-1.5 bg-black/20 rounded-lg">
                <span className="text-[8px] text-amber-500/60 shrink-0 mt-0.5">{a.source?.replace(/_/g, ' ')}</span>
                <span className="text-[10px] text-neutral-400 truncate">{a.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fallback for voice card with no articles array */}
      {detail.voiceCard && !detail.voiceCard.articles?.length && (
        <div className="mb-4">
          <h4 className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-1">Archive</h4>
          <p className="text-[10px] text-neutral-400">{detail.voiceCard.totalRefs} references</p>
        </div>
      )}

      {/* Coverage trail */}
      {coverage && coverage.totalArticles > 0 && (
        <div>
          <h4 className="text-[9px] font-black uppercase tracking-widest text-sky-400 mb-2">
            Coverage Trail <span className="text-neutral-600">({coverage.totalArticles} articles, {coverage.totalMentions} mentions)</span>
          </h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {coverage.trail.map((t, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-black/30 rounded-lg">
                <span className="text-[9px] font-mono text-sky-500 shrink-0">E{t.cycle}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-neutral-300 font-bold truncate">{t.title}</p>
                  <p className="text-[9px] text-neutral-500 line-clamp-1">{t.context}</p>
                </div>
                <span className="text-[9px] font-mono text-neutral-600 shrink-0">{t.mentions}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {detail.totalAppearances === 0 && !coverage?.totalArticles && (
        <p className="text-[10px] text-neutral-600 italic">No coverage trail found</p>
      )}

      {/* Footer — timestamps */}
      {(flags.createdAt || flags.lastUpdated) && (
        <div className="mt-4 pt-3 border-t border-white/5 flex gap-4">
          {flags.createdAt && <span className="text-[8px] text-neutral-600 font-mono">Created: {flags.createdAt.split('T')[0]}</span>}
          {flags.lastUpdated && <span className="text-[8px] text-neutral-600 font-mono">Updated: {flags.lastUpdated.split('T')[0]}</span>}
        </div>
      )}
    </div>
  );
}

function FullArticleReader({ article }) {
  const sectionColors = {
    'FRONT PAGE': 'text-sky-500', 'CIVIC AFFAIRS': 'text-emerald-500', 'SPORTS': 'text-amber-500',
    'CULTURE & COMMUNITY': 'text-purple-500', 'BUSINESS TICKER': 'text-orange-500',
    'CHICAGO BUREAU': 'text-red-500', 'LETTERS TO THE EDITOR': 'text-neutral-400',
  };
  const bodyLines = (article.body || '').split('\n').filter(l => l.trim());

  return (
    <div className="p-6 bg-neutral-900/60 rounded-2xl border border-sky-500/20">
      <div className="flex justify-between items-start mb-3">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${sectionColors[article.section] || 'text-neutral-500'}`}>
          {article.section}
        </span>
        <span className="text-[9px] font-mono text-sky-500">
          {article.cycle ? `E${article.cycle}` : article.source === 'drive-archive' ? 'ARCHIVE' : ''}
        </span>
      </div>

      <h2 className="text-xl font-black leading-tight tracking-tight mb-1 uppercase italic">{article.title}</h2>
      {article.subtitle && <p className="text-sm text-neutral-400 italic mb-4">{article.subtitle}</p>}

      {article.author && (
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
          <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center font-bold text-[10px]">
            {article.author[0]}
          </div>
          <div>
            <span className="text-[11px] font-bold text-neutral-300">{article.author}</span>
            {article.desk && <span className="text-[9px] text-neutral-600 block">{article.desk}</span>}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {bodyLines.map((line, i) => (
          <p key={i} className="text-sm text-neutral-300 leading-relaxed">{line}</p>
        ))}
      </div>

      {article.namesIndex && (
        <div className="pt-4 mt-6 border-t border-white/5">
          <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Names Index: </span>
          <span className="text-[10px] text-neutral-500">{article.namesIndex}</span>
        </div>
      )}
    </div>
  );
}

function MiniDetail({ label, value }) {
  return (
    <div>
      <div className="text-[8px] font-bold text-neutral-600 uppercase">{label}</div>
      <div className="text-[11px] text-neutral-300">{value || '—'}</div>
    </div>
  );
}

function ArticleSearchView() {
  const [query, setQuery] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [fullArticle, setFullArticle] = useState(null);
  const [loadingArticle, setLoadingArticle] = useState(false);

  const search = async () => {
    if (!query && !authorFilter) return;
    setSearching(true);
    setFullArticle(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (authorFilter) params.set('author', authorFilter);
      params.set('limit', '40');
      const data = await fetchAPI(`/api/search/articles?${params}`);
      setResults(data);
    } catch { /* ignore */ }
    setSearching(false);
  };

  const loadFullArticle = async (r) => {
    if (r.file && r.articleIndex !== undefined) {
      setLoadingArticle(true);
      try {
        const data = await fetchAPI(`/api/article?file=${encodeURIComponent(r.file)}&index=${r.articleIndex}`);
        setFullArticle(data);
      } catch { /* ignore */ }
      setLoadingArticle(false);
    }
  };

  // Full article reader view
  if (fullArticle) {
    return (
      <section className="space-y-4">
        <button
          onClick={() => setFullArticle(null)}
          className="flex items-center gap-2 text-[10px] text-neutral-500 hover:text-white transition-colors"
        >
          <ChevronRight size={12} className="rotate-180" /> Back to results
        </button>
        <FullArticleReader article={fullArticle} />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-3 bg-neutral-900 rounded-2xl border border-white/10 px-4 py-3">
          <Search size={16} className="text-neutral-500 shrink-0" />
          <input
            type="text"
            placeholder="Search all editions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-neutral-600"
          />
          {searching && <Loader size={14} className="text-sky-500 animate-spin" />}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Filter by author..."
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            className="flex-1 bg-neutral-900 rounded-xl border border-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600"
          />
          <button
            onClick={search}
            className="px-4 py-2 bg-sky-500 text-black text-xs font-black uppercase rounded-xl active:scale-95 transition-transform"
          >
            Search
          </button>
        </div>
      </div>

      {results && (
        <div>
          <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mb-3">
            {results.total} results across all editions
          </p>
          <div className="space-y-3">
            {results.results.map((r, i) => (
              <div key={i}
                className="p-4 bg-neutral-900/40 rounded-xl border border-white/5 cursor-pointer hover:border-sky-500/30 transition-colors"
                onClick={() => loadFullArticle(r)}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] font-mono text-sky-500 font-bold">{r.cycle ? `E${r.cycle}` : 'ARCHIVE'}</span>
                  <span className="text-[9px] text-neutral-600">{r.section}</span>
                </div>
                <h4 className="text-sm font-bold mb-1">{r.title}</h4>
                {r.subtitle && <p className="text-[10px] text-neutral-500 italic mb-1">{r.subtitle}</p>}
                {r.snippet && (
                  <p className="text-[10px] text-neutral-400 leading-relaxed line-clamp-3">{r.snippet}</p>
                )}
                <div className="flex justify-between items-center mt-2">
                  <div className="flex gap-3">
                    {r.author && <span className="text-[9px] text-neutral-500">{r.author}</span>}
                    {r.namesIndex && <span className="text-[9px] text-neutral-600 truncate max-w-[200px]">{r.namesIndex}</span>}
                  </div>
                  <span className="text-[8px] text-neutral-600 font-mono">{r.bodyLength > 1000 ? `${Math.round(r.bodyLength/1000)}k` : `${r.bodyLength}b`}</span>
                </div>
              </div>
            ))}
          </div>
          {loadingArticle && (
            <div className="p-4 text-center">
              <Loader size={16} className="text-sky-500 animate-spin mx-auto" />
            </div>
          )}
        </div>
      )}

      {!results && (
        <div className="p-12 text-center text-neutral-600">
          <Search size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Search across all editions and supplementals</p>
          <p className="text-[10px] mt-1">Full archive from Cycle 1 through current</p>
        </div>
      )}
    </section>
  );
}

function SportsSection({ city, data, color }) {
  const [showAllFeeds, setShowAllFeeds] = useState(false);
  if (!data) return null;

  const digest = typeof data.digest === 'object' ? data.digest : null;
  const feeds = Array.isArray(data.feeds) ? data.feeds : [];
  const accentColor = color === 'green' ? 'text-green-400' : 'text-red-400';
  const borderColor = color === 'green' ? 'border-green-500/20' : 'border-red-500/20';
  const bgColor = color === 'green' ? 'bg-green-500/10' : 'bg-red-500/10';

  const momentumColors = { rising: 'text-green-400', steady: 'text-sky-400', falling: 'text-amber-400', declining: 'text-red-400' };
  const eventTypeColors = {
    'roster-move': 'bg-purple-500/20 text-purple-400',
    'game-result': 'bg-sky-500/20 text-sky-400',
    'injury': 'bg-red-500/20 text-red-400',
    'milestone': 'bg-amber-500/20 text-amber-400',
    'trade': 'bg-orange-500/20 text-orange-400',
    'callup': 'bg-emerald-500/20 text-emerald-400',
    'signing': 'bg-pink-500/20 text-pink-400',
  };

  const displayFeeds = showAllFeeds ? feeds : feeds.slice(0, 5);

  return (
    <div>
      {/* Team header */}
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={14} className={accentColor} />
        <h3 className="text-xs font-black uppercase tracking-widest">{city === 'oakland' ? 'Oakland' : 'Chicago'}</h3>
      </div>

      {/* Digest card */}
      {digest && (
        <div className={`p-4 bg-neutral-900/60 rounded-2xl border ${borderColor} mb-4`}>
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className={`text-lg font-black ${accentColor}`}>{digest.teamLabel || city}</h4>
              <span className="text-[10px] text-neutral-500">{digest.seasonState}</span>
            </div>
            <div className="text-right">
              {digest.currentRecord && (
                <div className="text-xl font-black tracking-tight">{digest.currentRecord}</div>
              )}
              {digest.teamMomentum && (
                <span className={`text-[9px] font-bold uppercase ${momentumColors[digest.teamMomentum] || 'text-neutral-500'}`}>
                  {digest.teamMomentum === 'rising' ? '▲' : digest.teamMomentum === 'falling' ? '▼' : '●'} {digest.teamMomentum}
                </span>
              )}
            </div>
          </div>

          {/* Roster moves */}
          {digest.rosterMoves?.length > 0 && (
            <div className="mb-3">
              <h5 className="text-[8px] font-black uppercase tracking-widest text-neutral-600 mb-1.5">Roster Moves</h5>
              {digest.rosterMoves.map((rm, i) => (
                <div key={i} className="flex items-start gap-2 mb-1">
                  <span className="text-[9px] font-mono text-neutral-600 shrink-0">C{rm.cycle}</span>
                  <span className="text-[10px] text-neutral-400">{rm.names?.join(', ')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Player features */}
          {digest.playerFeatures?.length > 0 && (
            <div className="mb-3">
              <h5 className="text-[8px] font-black uppercase tracking-widest text-neutral-600 mb-1.5">Player Features</h5>
              {digest.playerFeatures.map((pf, i) => (
                <div key={i} className="flex items-start gap-2 mb-1">
                  <span className="text-[9px] font-mono text-neutral-600 shrink-0">C{pf.cycle}</span>
                  <span className={`text-[10px] font-bold ${accentColor}`}>{pf.names?.join(', ')}</span>
                  {pf.angle && <span className="text-[9px] text-neutral-500 italic">{pf.angle}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Story angles */}
          {digest.activeStoryAngles?.length > 0 && (
            <div className="mb-3">
              <h5 className="text-[8px] font-black uppercase tracking-widest text-neutral-600 mb-1.5">Story Angles</h5>
              <div className="flex flex-wrap gap-1.5">
                {digest.activeStoryAngles.map((angle, i) => (
                  <span key={i} className={`text-[9px] px-2 py-0.5 rounded-full ${bgColor} ${accentColor} font-bold`}>
                    {typeof angle === 'string' ? angle : angle.angle || angle.name || JSON.stringify(angle)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Player moods */}
          {digest.playerMoods?.length > 0 && (
            <div className="mb-3">
              <h5 className="text-[8px] font-black uppercase tracking-widest text-neutral-600 mb-1.5">Clubhouse</h5>
              <div className="space-y-1">
                {digest.playerMoods.map((pm, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-300 font-bold">{pm.name}</span>
                    <span className={`text-[9px] ${pm.mood === 'hot' || pm.mood === 'confident' ? 'text-green-400' : pm.mood === 'cold' || pm.mood === 'frustrated' ? 'text-red-400' : 'text-neutral-500'}`}>
                      {pm.mood}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editorial notes */}
          {digest.editorialNotes && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-[10px] text-neutral-500 italic leading-relaxed">
                {typeof digest.editorialNotes === 'string' ? digest.editorialNotes : JSON.stringify(digest.editorialNotes)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Feed events */}
      {feeds.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
              Feed Events <span className="text-neutral-600">({feeds.length})</span>
            </h5>
          </div>
          <div className="space-y-2">
            {displayFeeds.map((ev, i) => (
              <SportsFeedEvent key={i} event={ev} eventTypeColors={eventTypeColors} />
            ))}
          </div>
          {feeds.length > 5 && (
            <button
              onClick={() => setShowAllFeeds(!showAllFeeds)}
              className="w-full mt-2 py-2 text-[10px] font-bold text-neutral-500 hover:text-white transition-colors"
            >
              {showAllFeeds ? 'Show less' : `Show all ${feeds.length} events`}
            </button>
          )}
        </div>
      )}

      {!digest && feeds.length === 0 && (
        <p className="text-[10px] text-neutral-600 italic">No {city} sports data in current desk packet</p>
      )}
    </div>
  );
}

function SportsFeedEvent({ event, eventTypeColors }) {
  const [expanded, setExpanded] = useState(false);
  const ev = event;

  return (
    <div className="p-3 bg-neutral-900/40 rounded-xl border border-white/5 cursor-pointer hover:bg-neutral-900/60 transition-colors"
      onClick={() => setExpanded(!expanded)}>
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${eventTypeColors[ev.EventType] || 'bg-neutral-500/20 text-neutral-400'}`}>
            {ev.EventType}
          </span>
          <span className="text-[9px] text-neutral-500">{ev.SeasonType}</span>
        </div>
        <div className="flex items-center gap-2">
          {ev.Streak && <span className="text-[9px] font-mono text-amber-500">{ev.Streak}</span>}
          {ev['Team Record'] && <span className="text-[9px] font-mono text-neutral-600">{ev['Team Record']}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 mb-1">
        {ev.NamesUsed && <span className="text-[10px] font-bold text-neutral-300">{ev.NamesUsed}</span>}
      </div>
      <p className={`text-[10px] text-neutral-400 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>{ev.Notes}</p>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-white/5 grid grid-cols-2 gap-2">
          {ev.Stats && <MiniDetail label="Stats" value={ev.Stats} />}
          {ev.StoryAngle && <MiniDetail label="Story Angle" value={ev.StoryAngle} />}
          {ev.PlayerMood && <MiniDetail label="Mood" value={ev.PlayerMood} />}
          {ev.HomeNeighborhood && <MiniDetail label="Neighborhood" value={ev.HomeNeighborhood} />}
          {ev.TeamsUsed && <MiniDetail label="Team" value={ev.TeamsUsed} />}
          {ev.EventTrigger && <MiniDetail label="Trigger" value={ev.EventTrigger} />}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, warn }) {
  return (
    <div>
      <div className="text-[8px] font-bold text-neutral-600 uppercase">{label}</div>
      <div className={`text-xs font-mono font-bold ${warn ? 'text-red-400' : 'text-neutral-400'}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ label, count, color }) {
  const colors = {
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
  };
  return (
    <div className={`text-center p-2 rounded-xl border ${colors[color] || colors.sky}`}>
      <div className="text-lg font-black">{count}</div>
      <div className="text-[8px] font-bold uppercase tracking-widest">{label}</div>
    </div>
  );
}

function InitiativeCard({ initiative }) {
  const [expanded, setExpanded] = useState(false);
  const impl = initiative.implementation || {};
  const statusConfig = {
    'blocked': { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'BLOCKED' },
    'stalled': { icon: FileWarning, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'STALLED' },
    'clock-running': { icon: Timer, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', label: 'CLOCK RUNNING' },
    'in-progress': { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', label: 'IN PROGRESS' },
    'untracked': { icon: CircleDot, color: 'text-neutral-500', bg: 'bg-neutral-500/10', border: 'border-neutral-500/20', label: 'UNTRACKED' },
  };
  const cfg = statusConfig[impl.status] || statusConfig['untracked'];
  const StatusIcon = cfg.icon;

  return (
    <div className={`p-5 rounded-2xl border cursor-pointer transition-colors ${cfg.bg} ${cfg.border} hover:bg-neutral-900`}
      onClick={() => setExpanded(!expanded)}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <StatusIcon size={14} className={cfg.color} />
          <span className={`text-[9px] font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-neutral-600">{initiative.id}</span>
          <span className="text-[9px] font-mono text-neutral-500">C{initiative.voteCycle}</span>
        </div>
      </div>
      <h3 className="text-base font-black tracking-tight mb-1">{initiative.name}</h3>
      <div className="flex gap-3 mt-2 mb-3">
        <span className="text-[10px] text-neutral-400">{initiative.vote} vote</span>
        <span className="text-[10px] text-neutral-400">{initiative.budget}</span>
        {initiative.domain && <span className="text-[10px] text-neutral-500 capitalize">{initiative.domain}</span>}
        {initiative.relatedArticles?.length > 0 && (
          <span className="text-[10px] text-sky-500 font-bold">{initiative.relatedArticles.length} articles</span>
        )}
      </div>
      <p className="text-xs text-neutral-400 leading-relaxed">{impl.summary}</p>
      {expanded && (
        <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
          {impl.pendingItems?.length > 0 && (
            <div>
              <h5 className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">Pending</h5>
              {impl.pendingItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2 mb-1.5">
                  <CircleDot size={10} className={`${cfg.color} mt-0.5 shrink-0`} />
                  <span className="text-[11px] text-neutral-300">{item}</span>
                </div>
              ))}
            </div>
          )}
          {impl.keyContacts?.length > 0 && (
            <div>
              <h5 className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">Key Contacts</h5>
              {impl.keyContacts.map((contact, i) => (
                <p key={i} className="text-[11px] text-neutral-400 mb-1">{contact}</p>
              ))}
            </div>
          )}
          {impl.newsroomNote && (
            <div className="p-3 bg-black/40 rounded-xl">
              <h5 className="text-[9px] font-black uppercase tracking-widest text-sky-500 mb-1">Newsroom Note</h5>
              <p className="text-[11px] text-neutral-300 leading-relaxed italic">{impl.newsroomNote}</p>
            </div>
          )}
          {initiative.relatedArticles?.length > 0 && (
            <div>
              <h5 className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                Coverage Trail <span className="text-neutral-600">({initiative.relatedArticles.length} articles)</span>
              </h5>
              <div className="space-y-1.5">
                {initiative.relatedArticles.map((article, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-black/30 rounded-lg">
                    <span className="text-[9px] font-mono text-sky-500 shrink-0 mt-0.5">E{article.cycle}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-neutral-300 font-bold truncate">{article.title}</p>
                      <div className="flex gap-2 mt-0.5">
                        {article.author && <span className="text-[9px] text-neutral-500">{article.author}</span>}
                        {article.section && <span className="text-[9px] text-neutral-600">{article.section}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {initiative.engine?.voteBreakdown && (
            <div>
              <h5 className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1">Vote Record</h5>
              <p className="text-[10px] text-neutral-500 leading-relaxed">{initiative.engine.voteBreakdown}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NavButton({ icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-full transition-all ${active ? 'bg-sky-500 text-black scale-110' : 'text-neutral-500 hover:text-white'}`}
    >
      <Icon size={20} />
    </button>
  );
}
