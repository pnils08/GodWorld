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
  Newspaper,
  MapPin,
  Shield,
  Loader,
  AlertCircle,
  ArrowRight,
  FileText,
  Briefcase,
  Zap,
  Trophy,
} from 'lucide-react';
import SportsTab from './components/SportsTab';
import EditionTab from './components/tabs/EditionTab';
import NewsroomTab from './components/tabs/NewsroomTab';
import CouncilTab from './components/tabs/CouncilTab';
import TrackerTab from './components/tabs/TrackerTab';
import IntelTab from './components/tabs/IntelTab';
import CityTab from './components/tabs/CityTab';
import SearchTab from './components/tabs/SearchTab';
import ChicagoTab from './components/tabs/ChicagoTab';
import MissionTab from './components/tabs/MissionTab';
import WorldTab from './components/tabs/WorldTab';
import { Stat, Badge, TabButton } from './components/ui';

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
  const [newsroom, setNewsroom] = useState(null);
  const [overlayArticle, setOverlayArticle] = useState(null);
  const [citizenDetail, setCitizenDetail] = useState(null);
  const [coverageTrail, setCoverageTrail] = useState(null);
  const [missionData, setMissionData] = useState(null);
  const [chicagoData, setChicagoData] = useState(null);
  const [supplementals, setSupplementals] = useState([]);
  const [world, setWorld] = useState(null);
  const [worldLoaded, setWorldLoaded] = useState(false);
  const [photos, setPhotos] = useState(null);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load data on mount
  useEffect(() => {
    async function loadAll() {
      try {
        const [h, e, c, n, cz, iv, eds] = await Promise.all([
          fetchAPI('/api/health'),
          fetchAPI('/api/edition/latest'),
          fetchAPI('/api/council'),
          fetchAPI('/api/neighborhoods'),
          fetchAPI('/api/citizens?tier=1&limit=50'),
          fetchAPI('/api/initiatives'),
          fetchAPI('/api/editions'),
        ]);
        setHealth(h);
        setEdition(e);
        setCouncil(c);
        setNeighborhoods(n);
        setCitizens(cz);
        setInitiatives(iv);
        setSupplementals(
          (eds?.editions || [])
            .filter((ed) => ed.isSupplemental)
            .sort((a, b) => (b.cycle || 0) - (a.cycle || 0))
        );
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
        const data = await fetchAPI(
          `/api/citizens?search=${encodeURIComponent(searchQuery)}&limit=20`
        );
        setSearchResults(data);
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Article search
  const runArticleSearch = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setArticleSearchResults(null);
      return;
    }
    try {
      const data = await fetchAPI(
        `/api/search/articles?q=${encodeURIComponent(q)}&limit=30`
      );
      setArticleSearchResults(data);
    } catch {
      /* ignore */
    }
  }, []);

  // Load newsroom data when NEWSROOM tab is selected
  useEffect(() => {
    if (activeTab === 'NEWSROOM' && !newsroom) {
      fetchAPI('/api/newsroom').then(setNewsroom).catch(() => {});
    }
  }, [activeTab, newsroom]);

  // Load mission data when MISSION tab is selected
  useEffect(() => {
    if (activeTab === 'MISSION' && !missionData) {
      loadMissionData();
    }
  }, [activeTab, missionData]);

  function loadMissionData() {
    Promise.all([fetchAPI('/api/health'), fetchAPI('/api/session-events')])
      .then(([h, events]) => {
        setMissionData({ health: h, events });
      })
      .catch(() => {});
  }

  // Load chicago data when CHICAGO tab is selected
  useEffect(() => {
    if (activeTab === 'CHICAGO' && !chicagoData) {
      Promise.all([
        fetchAPI('/api/sports'),
        fetchAPI('/api/search/articles?section=chicago&limit=20'),
      ])
        .then(([sportsData, articles]) => {
          const chi = sportsData?.chicago || {};
          setChicagoData({
            feeds: chi.feeds || [],
            digest: chi.digest || null,
            articles: articles?.results || [],
          });
        })
        .catch(() => {});
    }
  }, [activeTab, chicagoData]);

  // Load hooks/arcs when INTEL tab is selected
  useEffect(() => {
    if (activeTab === 'INTEL' && !hooks) {
      Promise.all([
        fetchAPI('/api/hooks'),
        fetchAPI('/api/arcs'),
        fetchAPI('/api/storylines?status=active'),
      ])
        .then(([h, a, s]) => {
          setHooks(h);
          setArcs(a);
          setStorylines(s);
        })
        .catch(() => {});
    }
  }, [activeTab, hooks]);

  // Load world bond graph and photo index when WORLD tab is selected
  useEffect(() => {
    if (activeTab === 'WORLD' && (!worldLoaded || !photosLoaded)) {
      const bondPromise = worldLoaded
        ? Promise.resolve()
        : fetchAPI('/api/world/bond-graph')
            .then((data) => setWorld(data))
            .catch(() => setWorld(null))
            .finally(() => setWorldLoaded(true));
      const photoPromise = photosLoaded
        ? Promise.resolve()
        : fetchAPI('/api/photos')
            .then((data) => setPhotos(data))
            .catch(() => setPhotos(null))
            .finally(() => setPhotosLoaded(true));
      Promise.all([bondPromise, photoPromise]).catch(() => {});
    }
  }, [activeTab, worldLoaded, photosLoaded]);

  // Load full article for overlay search
  const loadOverlayArticle = useCallback(async (r) => {
    if (r.file && r.articleIndex !== undefined) {
      try {
        const data = await fetchAPI(
          `/api/article?file=${encodeURIComponent(r.file)}&index=${r.articleIndex}`
        );
        setOverlayArticle(data);
        setCitizenDetail(null);
        setCoverageTrail(null);
      } catch {
        /* ignore */
      }
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
        const nameCoverage = await fetchAPI(
          `/api/citizen-coverage/${encodeURIComponent(
            detail.ledger.First + ' ' + detail.ledger.Last
          )}`
        );
        setCoverageTrail(nameCoverage);
      } else {
        setCoverageTrail(coverage);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleSupplementalClick = useCallback(async (s) => {
    try {
      const data = await fetchAPI(
        `/api/article/raw?file=${encodeURIComponent(s.file)}`
      );
      const label = s.file
        .replace('supplemental_', '')
        .replace(/\.txt$/, '')
        .replace(/_c\d+/, '')
        .replace(/_/g, ' ');
      setOverlayArticle({
        title: label,
        body: data.text,
        cycle: data.cycle,
        file: data.file,
      });
      setSearchOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const handleCitizenClick = useCallback(
    (popId) => {
      setSearchOpen(true);
      loadCitizenDetail(popId);
    },
    [loadCitizenDetail]
  );

  const sentimentIcon = (val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return null;
    return n >= 0.5 ? (
      <TrendingUp size={14} className="inline ml-1 text-good" />
    ) : (
      <TrendingDown size={14} className="inline ml-1 text-warn" />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="text-center">
          <Loader size={32} className="text-accent animate-spin mx-auto mb-4" />
          <p className="text-dim text-sm font-mono">Loading GodWorld...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <AlertCircle size={32} className="text-bad mx-auto mb-4" />
          <p className="text-bad text-sm font-mono mb-2">Connection Failed</p>
          <p className="text-dim text-xs">{error}</p>
          <p className="text-dim text-xs mt-4">
            Make sure the API server is running:{' '}
            <code className="text-text">npm start</code>
          </p>
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
    <div className="min-h-screen bg-ink text-text font-sans selection:bg-accent/30">
      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-50 bg-ink/90 backdrop-blur-xl border-b border-edge py-4 px-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter leading-none italic">
            Bay Tribune <span className="text-accent underline decoration-2 underline-offset-4">Oakland</span>
          </h1>
          <div className="flex gap-2 mt-1">
            <span className="text-[11px] font-mono text-dim">GODWORLD ENGINE v3.1</span>
            <span className="text-[11px] font-mono text-accent">
              CYCLE {edHeader.cycle || health?.data?.latestCycleArchive?.replace('cycle-', '') || '—'}
            </span>
            <span className="text-[11px] font-mono text-dim">{edHeader.season || ''}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            aria-label="Toggle search"
            onClick={() => {
              setSearchOpen(!searchOpen);
              setMenuOpen(false);
            }}
            className="w-10 h-10 flex items-center justify-center bg-panel rounded-full border border-edge active:scale-90 transition-transform"
          >
            <Search size={16} />
          </button>
          <button
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => {
              setMenuOpen(!menuOpen);
              setSearchOpen(false);
            }}
            className="w-10 h-10 flex items-center justify-center bg-panel rounded-full border border-edge active:scale-90 transition-transform"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* SEARCH OVERLAY — Now dual-mode: citizens + articles */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/95 pt-24 px-6 overflow-y-auto pb-24"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSearchOpen(false);
              setSearchQuery('');
              setSearchResults(null);
              setArticleSearchResults(null);
              setCitizenDetail(null);
              setCoverageTrail(null);
              setOverlayArticle(null);
            }
          }}
        >
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-3 bg-panel rounded-2xl border border-edge px-4 py-3">
              <Search size={18} className="text-dim" />
              <input
                type="text"
                placeholder="Search citizens, articles, stories..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  runArticleSearch(e.target.value);
                }}
                autoFocus
                className="flex-1 bg-transparent text-text text-sm outline-none placeholder:text-faint"
              />
              {searchQuery && (
                <button
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchQuery('');
                    setArticleSearchResults(null);
                    setSearchResults(null);
                    setCitizenDetail(null);
                    setCoverageTrail(null);
                    setOverlayArticle(null);
                  }}
                  className="text-dim"
                >
                  <X size={16} />
                </button>
              )}
              <button
                aria-label="Close search"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                  setSearchResults(null);
                  setArticleSearchResults(null);
                  setCitizenDetail(null);
                  setCoverageTrail(null);
                  setOverlayArticle(null);
                }}
                className="text-dim hover:text-text ml-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Citizen Results */}
            {searchResults && searchResults.citizens?.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] text-faint font-mono uppercase tracking-widest mb-2">
                  <Users size={10} className="inline mr-1" /> {searchResults.total} citizens
                </p>
                <div className="space-y-2">
                  {searchResults.citizens.map((c) => (
                    <div
                      key={c.popId}
                      className="p-4 bg-panel rounded-xl border border-edge flex justify-between items-center cursor-pointer hover:border-accent/30 transition-colors"
                      onClick={() => loadCitizenDetail(c.popId)}
                    >
                      <div>
                        <div className="text-sm font-bold text-text">
                          {c.firstName} {c.lastName}
                        </div>
                        <div className="text-xs text-dim mt-0.5">
                          {c.role} {c.neighborhood ? `· ${c.neighborhood}` : ''} · Tier {c.tier}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-faint">{c.popId}</span>
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
                onClose={() => {
                  setCitizenDetail(null);
                  setCoverageTrail(null);
                }}
              />
            )}

            {/* Full Article Reader (overlay) */}
            {overlayArticle && (
              <div className="mt-4">
                <button
                  onClick={() => setOverlayArticle(null)}
                  className="flex items-center gap-2 text-[11px] text-dim hover:text-text transition-colors mb-3"
                >
                  <ChevronRight size={12} className="rotate-180" /> Back to results
                </button>
                <FullArticleReader article={overlayArticle} />
              </div>
            )}

            {/* Article Results */}
            {!overlayArticle && articleSearchResults && articleSearchResults.results?.length > 0 && (
              <div className="mt-6">
                <p className="text-[11px] text-faint font-mono uppercase tracking-widest mb-2">
                  <FileText size={10} className="inline mr-1" /> {articleSearchResults.total}{' '}
                  articles
                </p>
                <div className="space-y-2">
                  {articleSearchResults.results.map((r, i) => (
                    <div
                      key={i}
                      className="p-3 bg-panel rounded-xl border border-edge cursor-pointer hover:border-accent/30 transition-colors"
                      onClick={() => loadOverlayArticle(r)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[11px] font-mono text-accent">
                          {r.cycle ? `E${r.cycle}` : 'ARCHIVE'}
                        </span>
                        <span className="text-[11px] text-dim">{r.section}</span>
                      </div>
                      <h4 className="text-xs font-bold text-text mb-1">{r.title}</h4>
                      {r.snippet && (
                        <p className="text-xs text-dim leading-relaxed line-clamp-2">{r.snippet}</p>
                      )}
                      <div className="flex justify-between items-center mt-1">
                        {r.author && <span className="text-[11px] text-dim">{r.author}</span>}
                        <span className="text-[11px] text-faint font-mono">
                          {r.bodyLength > 1000 ? `${Math.round(r.bodyLength / 1000)}k` : `${r.bodyLength}b`}
                        </span>
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
        <div className="fixed inset-0 z-40 bg-ink pt-24 px-8 space-y-6">
          {[
            { label: 'Edition Feed', view: 'feed', tab: 'EDITION' },
            { label: 'Newsroom', view: 'newsroom', tab: 'NEWSROOM' },
            { label: 'City Council', view: 'council', tab: 'COUNCIL' },
            { label: 'Initiative Tracker', view: 'tracker', tab: 'TRACKER' },
            { label: 'Story Intel', view: 'intel', tab: 'INTEL' },
            { label: 'Sports', view: 'sports', tab: 'SPORTS' },
            { label: 'Neighborhoods', view: 'neighborhoods', tab: 'CITY' },
            { label: 'World', view: 'world', tab: 'WORLD' },
            { label: 'Article Search', view: 'search', tab: 'SEARCH' },
            { label: 'Chicago', view: 'chicago', tab: 'CHICAGO' },
            { label: 'Mission Control', view: 'mission', tab: 'MISSION' },
          ].map((item) => (
            <div
              key={item.view}
              className="group cursor-pointer"
              onClick={() => {
                setView(item.view);
                setActiveTab(item.tab);
                setMenuOpen(false);
              }}
            >
              <span className="text-4xl font-black uppercase tracking-tighter group-hover:text-accent transition-colors">
                {item.label}
              </span>
              <ChevronRight
                size={24}
                className="inline ml-2 text-dim group-hover:text-accent transition-colors"
              />
            </div>
          ))}
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="pt-24 px-4 sm:px-6 pb-32 mx-auto max-w-7xl">
        {/* TELEMETRY CARDS */}
        {activeTab !== 'SPORTS' && (
          <section className="mb-8">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <MetricCard label="Cycle" value={edHeader.cycle || '—'} color="sky" />
              <MetricCard
                label="Sentiment"
                value={avgSentiment}
                color="amber"
                icon={sentimentIcon(avgSentiment)}
              />
              <MetricCard label="Neighborhoods" value={hoods.length || '17'} color="neutral" />
              <MetricCard
                label="Council"
                value={`${councilMembers.filter((c) => c.officeId?.startsWith('COUNCIL')).length} seats`}
                color="neutral"
              />
            </div>

            {/* STATUS TICKER */}
            <div className="bg-panel border border-accent/20 rounded-xl p-3 flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg shrink-0">
                <Activity size={16} className="text-accent" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-[11px] font-mono text-accent uppercase tracking-tighter">
                  System Status
                </div>
                <p className="text-xs text-dim truncate">
                  {edHeader.weather || 'API online'} ·{' '}
                  {edHeader.pattern
                    ? `Pattern: ${edHeader.pattern}`
                    : `Cycle ${health?.data?.latestCycleArchive?.replace('cycle-', '') || 'connected'}`}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* TAB BAR */}
        <div className="sticky top-16 z-30 bg-ink/90 backdrop-blur border-b border-edge -mx-4 sm:-mx-6 px-4 sm:px-6 mb-6 overflow-x-auto no-scrollbar">
          <div className="flex gap-4">
            {[
              'EDITION',
              'NEWSROOM',
              'COUNCIL',
              'TRACKER',
              'INTEL',
              'SPORTS',
              'CITY',
              'WORLD',
              'SEARCH',
              'CHICAGO',
              'MISSION',
            ].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 pt-3 text-xs font-bold tracking-wide uppercase transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-accent border-b-2 border-accent'
                    : 'text-dim hover:text-text'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'EDITION' && (
          <EditionTab
            articles={articles}
            supplementals={supplementals}
            tier1={tier1}
            ArticleCard={ArticleCard}
            onSupplementalClick={handleSupplementalClick}
            onCitizenClick={handleCitizenClick}
          />
        )}
        {activeTab === 'NEWSROOM' && <NewsroomTab newsroom={newsroom} />}
        {activeTab === 'COUNCIL' && <CouncilTab councilMembers={councilMembers} />}
        {activeTab === 'TRACKER' && <TrackerTab initiatives={initiatives} />}
        {activeTab === 'INTEL' && <IntelTab hooks={hooks} arcs={arcs} storylines={storylines} />}
        {activeTab === 'SPORTS' && <SportsTab />}
        {activeTab === 'CITY' && <CityTab hoods={hoods} />}
        {activeTab === 'SEARCH' && (
          <SearchTab fetchAPI={fetchAPI} FullArticleReader={FullArticleReader} />
        )}
        {activeTab === 'CHICAGO' && <ChicagoTab chicagoData={chicagoData} />}
        {activeTab === 'WORLD' && (
          <WorldTab world={world} photos={photos} onCitizenClick={handleCitizenClick} />
        )}
        {activeTab === 'MISSION' && (
          <MissionTab
            missionData={missionData}
            onRefresh={() => {
              setMissionData(null);
              loadMissionData();
            }}
          />
        )}
      </main>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-ink/90 backdrop-blur border-t border-edge">
        <div className="max-w-7xl mx-auto h-16 px-4 flex items-center justify-around">
          <TabButton
            icon={Newspaper}
            label="Edition"
            active={activeTab === 'EDITION'}
            onClick={() => {
              setView('feed');
              setActiveTab('EDITION');
            }}
          />
          <TabButton
            icon={Briefcase}
            label="Newsroom"
            active={activeTab === 'NEWSROOM'}
            onClick={() => {
              setView('newsroom');
              setActiveTab('NEWSROOM');
            }}
          />
          <TabButton
            icon={Shield}
            label="Council"
            active={activeTab === 'COUNCIL'}
            onClick={() => {
              setView('council');
              setActiveTab('COUNCIL');
            }}
          />
          <TabButton
            icon={Zap}
            label="Intel"
            active={activeTab === 'INTEL'}
            onClick={() => {
              setView('intel');
              setActiveTab('INTEL');
            }}
          />
          <TabButton
            icon={Trophy}
            label="Sports"
            active={activeTab === 'SPORTS'}
            onClick={() => {
              setView('sports');
              setActiveTab('SPORTS');
            }}
          />
          <TabButton
            icon={MapPin}
            label="City"
            active={activeTab === 'CITY'}
            onClick={() => {
              setView('neighborhoods');
              setActiveTab('CITY');
            }}
          />
          <TabButton
            icon={Activity}
            label="Mission"
            active={activeTab === 'MISSION'}
            onClick={() => {
              setView('mission');
              setActiveTab('MISSION');
            }}
          />
        </div>
      </nav>
    </div>
  );
}

// --- Shared Components ---

function MetricCard({ label, value, color, icon }) {
  // Thin wrapper around the shared Stat primitive; preserves the existing prop surface.
  const tone = color === 'amber' ? 'warn' : 'default';
  return (
    <Stat
      label={label}
      value={
        <>
          {value} {icon}
        </>
      }
      tone={tone}
    />
  );
}

function ArticleCard({ article, isFirst, className = '' }) {
  const [expanded, setExpanded] = useState(false);
  const sectionColors = {
    'FRONT PAGE': 'text-sky-500',
    'CIVIC AFFAIRS': 'text-emerald-500',
    SPORTS: 'text-amber-500',
    'CULTURE & COMMUNITY': 'text-purple-500',
    'BUSINESS TICKER': 'text-orange-500',
    'CHICAGO BUREAU': 'text-red-500',
    'LETTERS TO THE EDITOR': 'text-neutral-400',
  };
  const bodyLines = (article.body || '').split('\n').filter((l) => l.trim());
  const summary = bodyLines[0] || '';

  return (
    <div className="group" onClick={() => setExpanded(!expanded)}>
      {isFirst && (
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
          <span className="text-[11px] font-black text-accent uppercase tracking-widest">
            Lead Story
          </span>
        </div>
      )}
      <div
        className={`p-6 border cursor-pointer transition-colors ${
          isFirst ? 'bg-panel-2 border-edge' : 'bg-panel border-edge hover:bg-panel-2'
        } ${isFirst ? 'rounded-[2rem]' : 'rounded-[2rem]'} ${className}`}
      >
        <div className="flex justify-between items-start mb-4">
          <span
            className={`text-xs font-bold uppercase tracking-widest ${
              sectionColors[article.section] || 'text-faint'
            }`}
          >
            {article.section}
          </span>
        </div>
        <h3
          className={`${
            isFirst ? 'text-2xl' : 'text-xl'
          } font-black leading-tight tracking-tight mb-1 uppercase italic transition-colors ${
            expanded ? 'text-accent' : 'group-hover:text-accent'
          }`}
        >
          {article.title}
        </h3>
        {article.subtitle && <p className="text-xs text-dim italic mb-3">{article.subtitle}</p>}
        {!expanded && (
          <p className="text-sm text-dim leading-relaxed mb-6 line-clamp-3">{summary}</p>
        )}
        {expanded && (
          <div className="mt-4 space-y-3">
            {bodyLines.map((line, i) => (
              <p key={i} className="text-sm text-text leading-relaxed">
                {line}
              </p>
            ))}
            {article.namesIndex && (
              <div className="pt-3 border-t border-edge">
                <span className="text-[11px] font-black text-faint uppercase tracking-widest">
                  Names Index:{' '}
                </span>
                <span className="text-xs text-dim">{article.namesIndex}</span>
              </div>
            )}
          </div>
        )}
        {article.author && (
          <div
            className={`flex items-center justify-between pt-4 border-t border-edge ${
              expanded ? 'mt-4' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-panel-2 border border-edge flex items-center justify-center font-bold text-xs">
                {article.author[0]}
              </div>
              <div>
                <span className="text-xs font-bold text-text">{article.author}</span>
                {article.desk && <span className="text-[11px] text-dim block">{article.desk}</span>}
              </div>
            </div>
            <div
              className={`p-2 rounded-full transition-all ${
                expanded ? 'bg-accent text-ink rotate-90' : 'bg-edge'
              }`}
            >
              <ArrowRight size={16} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FullArticleReader({ article }) {
  const sectionColors = {
    'FRONT PAGE': 'text-sky-500',
    'CIVIC AFFAIRS': 'text-emerald-500',
    SPORTS: 'text-amber-500',
    'CULTURE & COMMUNITY': 'text-purple-500',
    'BUSINESS TICKER': 'text-orange-500',
    'CHICAGO BUREAU': 'text-red-500',
    'LETTERS TO THE EDITOR': 'text-neutral-400',
  };
  const bodyLines = (article.body || '').split('\n').filter((l) => l.trim());

  return (
    <div className="p-6 bg-panel rounded-2xl border border-edge">
      <div className="flex justify-between items-start mb-3">
        <span
          className={`text-xs font-bold uppercase tracking-widest ${
            sectionColors[article.section] || 'text-faint'
          }`}
        >
          {article.section}
        </span>
        <span className="text-[11px] font-mono text-accent">
          {article.cycle ? `E${article.cycle}` : article.source === 'drive-archive' ? 'ARCHIVE' : ''}
        </span>
      </div>

      <h2 className="text-xl font-black leading-tight tracking-tight mb-1 uppercase italic text-text">
        {article.title}
      </h2>
      {article.subtitle && <p className="text-sm text-dim italic mb-4">{article.subtitle}</p>}

      {article.author && (
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-edge">
          <div className="w-8 h-8 rounded-full bg-panel-2 border border-edge flex items-center justify-center font-bold text-xs">
            {article.author[0]}
          </div>
          <div>
            <span className="text-xs font-bold text-text">{article.author}</span>
            {article.desk && <span className="text-[11px] text-dim block">{article.desk}</span>}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {bodyLines.map((line, i) => (
          <p key={i} className="text-sm text-text leading-relaxed">
            {line}
          </p>
        ))}
      </div>

      {article.namesIndex && (
        <div className="pt-4 mt-6 border-t border-edge">
          <span className="text-[11px] font-black text-faint uppercase tracking-widest">
            Names Index:{' '}
          </span>
          <span className="text-xs text-dim">{article.namesIndex}</span>
        </div>
      )}
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
    <div className="mt-4 p-5 bg-panel rounded-2xl border border-accent/20">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-black text-text">{name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-mono text-accent">{detail.popId}</span>
            {l.Tier && (
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full font-black border ${
                  tierColors[l.Tier] || tierColors['4']
                }`}
              >
                TIER {l.Tier}
              </span>
            )}
            {l.Status && l.Status !== 'Active' && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-bad/20 text-bad font-bold">
                {l.Status}
              </span>
            )}
          </div>
        </div>
        <button aria-label="Close detail panel" onClick={onClose} className="text-dim hover:text-text">
          <X size={16} />
        </button>
      </div>

      {/* Involvement flags */}
      {(flags.universe || flags.media || flags.civic) && (
        <div className="flex gap-1.5 mb-3">
          {flags.universe && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-warn/15 text-warn font-bold border border-warn/20">
              UNI
            </span>
          )}
          {flags.media && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-bold border border-accent/20">
              MED
            </span>
          )}
          {flags.civic && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-good/15 text-good font-bold border border-good/20">
              CIV
            </span>
          )}
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
          <h4 className="text-[11px] font-black uppercase tracking-widest text-faint mb-2">
            Life History <span className="text-dim">({lifeEvents.length} events)</span>
          </h4>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {lifeEvents.map((ev, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-panel-2 rounded-lg border border-edge">
                {ev.date && (
                  <span className="text-[11px] font-mono text-faint shrink-0 mt-0.5">{ev.date}</span>
                )}
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                    lifeTagColors[ev.tag] || lifeTagColors.General
                  }`}
                >
                  {ev.tag}
                </span>
                <span className="text-xs text-text leading-relaxed">{ev.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Archive — article appearances */}
      {detail.voiceCard && detail.voiceCard.articles?.length > 0 && (
        <div className="mb-4">
          <h4 className="text-[11px] font-black uppercase tracking-widest text-warn mb-2">
            Archive{' '}
            <span className="text-dim">
              ({detail.voiceCard.totalRefs} refs, {detail.voiceCard.articles.length} sources)
            </span>
          </h4>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {detail.voiceCard.articles.map((a, i) => (
              <div key={i} className="flex items-start gap-2 p-1.5 bg-panel-2 rounded-lg border border-edge">
                <span className="text-[11px] text-warn/60 shrink-0 mt-0.5">
                  {a.source?.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-dim truncate">{a.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fallback for voice card with no articles array */}
      {detail.voiceCard && !detail.voiceCard.articles?.length && (
        <div className="mb-4">
          <h4 className="text-[11px] font-black uppercase tracking-widest text-warn mb-1">Archive</h4>
          <p className="text-xs text-dim">{detail.voiceCard.totalRefs} references</p>
        </div>
      )}

      {/* Coverage trail */}
      {coverage && coverage.totalArticles > 0 && (
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-widest text-accent mb-2">
            Coverage Trail{' '}
            <span className="text-dim">
              ({coverage.totalArticles} articles, {coverage.totalMentions} mentions)
            </span>
          </h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {coverage.trail.map((t, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-panel-2 rounded-lg border border-edge">
                <span className="text-[11px] font-mono text-accent shrink-0">E{t.cycle}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text font-bold truncate">{t.title}</p>
                  <p className="text-[11px] text-dim line-clamp-1">{t.context}</p>
                </div>
                <span className="text-[11px] font-mono text-faint shrink-0">{t.mentions}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {detail.totalAppearances === 0 && !coverage?.totalArticles && (
        <p className="text-xs text-dim italic">No coverage trail found</p>
      )}

      {/* Footer — timestamps */}
      {(flags.createdAt || flags.lastUpdated) && (
        <div className="mt-4 pt-3 border-t border-edge flex gap-4">
          {flags.createdAt && (
            <span className="text-[11px] text-faint font-mono">
              Created: {flags.createdAt.split('T')[0]}
            </span>
          )}
          {flags.lastUpdated && (
            <span className="text-[11px] text-faint font-mono">
              Updated: {flags.lastUpdated.split('T')[0]}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function MiniDetail({ label, value }) {
  return (
    <div>
      <div className="text-[11px] font-bold text-faint uppercase">{label}</div>
      <div className="text-xs text-text">{value || '—'}</div>
    </div>
  );
}
