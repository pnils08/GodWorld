import React, { useState } from 'react';
import { Search, ChevronRight, Loader, FileText } from 'lucide-react';
import { Card, SectionHeader, Badge } from '../ui';

export default function SearchTab({ fetchAPI, FullArticleReader }) {
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
    } catch {
      /* ignore */
    }
    setSearching(false);
  };

  const loadFullArticle = async (r) => {
    if (r.file && r.articleIndex !== undefined) {
      setLoadingArticle(true);
      try {
        const data = await fetchAPI(
          `/api/article?file=${encodeURIComponent(r.file)}&index=${r.articleIndex}`
        );
        setFullArticle(data);
      } catch {
        /* ignore */
      }
      setLoadingArticle(false);
    }
  };

  if (fullArticle) {
    return (
      <section className="space-y-4 pb-20">
        <button
          onClick={() => setFullArticle(null)}
          className="flex items-center gap-2 text-[11px] text-dim hover:text-text transition-colors"
        >
          <ChevronRight size={12} className="rotate-180" /> Back to results
        </button>
        <FullArticleReader article={fullArticle} />
      </section>
    );
  }

  return (
    <section className="space-y-4 pb-20">
      <Card>
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-panel rounded-2xl border border-edge px-4 py-3">
            <Search size={16} className="text-dim shrink-0" />
            <input
              type="text"
              placeholder="Search all editions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              className="flex-1 bg-transparent text-text text-sm outline-none placeholder:text-faint"
            />
            {searching && <Loader size={14} className="text-accent animate-spin" />}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Filter by author..."
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              className="flex-1 bg-panel rounded-xl border border-edge px-3 py-2 text-xs text-text outline-none placeholder:text-faint"
            />
            <button
              onClick={search}
              className="px-4 py-2 bg-accent text-ink text-xs font-black uppercase rounded-xl active:scale-95 transition-transform"
            >
              Search
            </button>
          </div>
        </div>
      </Card>

      {results && (
        <div>
          <SectionHeader title="Results" sub={`${results.total} results across all editions`} />
          <div className="space-y-3">
            {results.results.map((r, i) => (
              <Card
                key={i}
                className="cursor-pointer hover:border-accent/30 transition-colors"
                onClick={() => loadFullArticle(r)}
              >
                <div className="flex justify-between items-start mb-2">
                  <Badge tone="accent">{r.cycle ? `E${r.cycle}` : 'ARCHIVE'}</Badge>
                  <span className="text-[11px] text-dim">{r.section}</span>
                </div>
                <h4 className="text-sm font-bold mb-1 text-text">{r.title}</h4>
                {r.subtitle && <p className="text-xs text-dim italic mb-1">{r.subtitle}</p>}
                {r.snippet && (
                  <p className="text-xs text-dim leading-relaxed line-clamp-3">{r.snippet}</p>
                )}
                <div className="flex justify-between items-center mt-2">
                  <div className="flex gap-3">
                    {r.author && <span className="text-[11px] text-dim">{r.author}</span>}
                    {r.namesIndex && (
                      <span className="text-[11px] text-dim truncate max-w-[200px]">
                        {r.namesIndex}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-faint font-mono">
                    {r.bodyLength > 1000 ? `${Math.round(r.bodyLength / 1000)}k` : `${r.bodyLength}b`}
                  </span>
                </div>
              </Card>
            ))}
          </div>
          {loadingArticle && (
            <div className="p-4 text-center">
              <Loader size={16} className="text-accent animate-spin mx-auto" />
            </div>
          )}
        </div>
      )}

      {!results && (
        <Card className="py-12 text-center">
          <FileText size={32} className="mx-auto mb-3 opacity-30 text-dim" />
          <p className="text-sm text-dim">Search across all editions and supplementals</p>
          <p className="text-xs mt-1 text-faint">Full archive from Cycle 1 through current</p>
        </Card>
      )}
    </section>
  );
}
