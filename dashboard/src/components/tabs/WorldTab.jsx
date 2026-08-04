import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Card, Badge } from '../ui';
import CityMap from './CityMap';

/**
 * Deterministic HSL color for a neighborhood name.
 */
function neighborhoodColor(neighborhood) {
  const s = String(neighborhood || 'Unknown');
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    background: `hsl(${hue} 72% 58%)`,
    border: `hsl(${hue} 72% 42%)`,
    highlight: { background: `hsl(${hue} 82% 66%)`, border: `hsl(${hue} 82% 50%)` },
    hover: { background: `hsl(${hue} 82% 66%)`, border: `hsl(${hue} 82% 50%)` },
  };
}

function BondWeb({ world, onCitizenClick }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);

  useEffect(() => {
    if (!world || !world.nodes) return;

    let cancelled = false;

    function initNetwork() {
      if (cancelled || !containerRef.current || !window.vis) return;

      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }

      const nodes = new window.vis.DataSet(
        world.nodes.map((n) => ({
          id: n.id,
          label: n.label,
          title: `${n.label}<br/>${n.neighborhood || '—'} · degree ${n.degree ?? 0}`,
          size: Math.min(5 + (n.degree ?? 0) * 2, 30),
          color: neighborhoodColor(n.neighborhood),
          font: { color: '#e5e7eb' },
        }))
      );

      const edges = new window.vis.DataSet(
        (world.links || []).map((l) => ({
          from: l.source,
          to: l.target,
          label: l.relation,
          title: l.relation,
          width: Math.max(1, l.weight ?? 1),
          color: { color: 'rgba(148,163,184,0.45)', highlight: '#60a5fa', hover: '#60a5fa' },
        }))
      );

      const options = {
        nodes: {
          shape: 'dot',
          borderWidth: 1,
          borderWidthSelected: 3,
          font: { color: '#e5e7eb', size: 12, face: 'sans-serif' },
        },
        edges: {
          font: { color: '#94a3b8', size: 10, align: 'middle' },
          smooth: { type: 'continuous' },
        },
        physics: {
          enabled: true,
          solver: 'forceAtlas2Based',
          forceAtlas2Based: {
            gravitationalConstant: -80,
            centralGravity: 0.02,
            springLength: 110,
            springConstant: 0.06,
            damping: 0.4,
            avoidOverlap: 0.2,
          },
          stabilization: { iterations: 800, updateInterval: 50 },
        },
        interaction: { hover: true, tooltipDelay: 200, hideEdgesOnDrag: true },
        layout: { randomSeed: 42 },
      };

      const network = new window.vis.Network(containerRef.current, { nodes, edges }, options);
      networkRef.current = network;

      network.once('stabilizationIterationsDone', () => {
        if (cancelled) return;
        network.setOptions({ physics: { enabled: false } });
        network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
      });
      // Headless/slow-render fallback: re-fit once positions have settled even if
      // the stabilization event already fired mid-drift. Guarded by `cancelled` —
      // the effect's cleanup (tab switch or re-run) destroys the network, and
      // calling fit() on a destroyed instance throws.
      setTimeout(() => {
        if (!cancelled) network.fit({ animation: false });
      }, 4000);

      network.on('click', (params) => {
        if (params.nodes.length > 0 && onCitizenClick) {
          const node = nodes.get(params.nodes[0]);
          if (!node) return;
          // Node ids are slugified POPIDs (pop-00001) when the bond ledger used
          // POPIDs; fall back to the display label otherwise.
          const key = /^pop-\d+$/i.test(node.id) ? node.id.toUpperCase() : node.label;
          if (key) onCitizenClick(key);
        }
      });
    }

    if (window.vis) {
      initNetwork();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/vis-network/standalone/umd/vis-network.min.js';
      script.async = true;
      script.onload = initNetwork;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [world, onCitizenClick]);

  if (!world) {
    return (
      <Card title="CITIZEN BOND WEB">
        <p className="text-sm text-dim italic">
          Bond graph not generated — run scripts/buildCitizenBondGraph.js
        </p>
      </Card>
    );
  }

  return (
    <Card title="CITIZEN BOND WEB" className="overflow-hidden">
      <div ref={containerRef} className="w-full h-[560px] bg-transparent" />
    </Card>
  );
}

function PhotoWire({ photos }) {
  const [selected, setSelected] = useState(null);

  const photoList = (Array.isArray(photos) ? photos : photos?.photos || [])
    .slice()
    .sort((a, b) => (b.cycle ?? 0) - (a.cycle ?? 0))
    .slice(0, 12);

  useEffect(() => {
    if (!selected) return;
    function onKey(e) {
      if (e.key === 'Escape') setSelected(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  if (photoList.length === 0) {
    return (
      <Card title="PHOTO WIRE">
        <p className="text-sm text-dim italic">
          No photo index — run scripts/buildPhotoIndex.js
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card title="PHOTO WIRE">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {photoList.map((p, i) => {
            const src = '/photos/' + String(p.path || '').replace('output/photos/', '');
            return (
              <button
                key={`${p.slug || i}-${p.cycle ?? i}`}
                onClick={() => setSelected(p)}
                className="text-left group overflow-hidden rounded-xl border border-edge bg-panel hover:border-accent/30 transition-colors"
              >
                <div className="aspect-[16/10] overflow-hidden bg-panel-2">
                  <img
                    loading="lazy"
                    src={src}
                    alt={p.storyline || p.slug || 'photo'}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                <div className="p-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-text font-medium truncate">
                    {p.storyline || p.slug || 'Untitled'}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge tone="default">C{p.cycle ?? '—'}</Badge>
                    {p.section && <span className="text-[11px] text-dim uppercase">{p.section}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-ink/95 flex items-center justify-center p-4 sm:p-8"
          onClick={() => setSelected(null)}
        >
          <div className="relative max-w-5xl w-full max-h-full flex flex-col items-center">
            <button
              aria-label="Close"
              onClick={() => setSelected(null)}
              className="absolute -top-10 right-0 text-dim hover:text-text"
            >
              <X size={24} />
            </button>
            <img
              src={'/photos/' + String(selected.path || '').replace('output/photos/', '')}
              alt={selected.storyline || selected.slug || 'photo'}
              className="max-w-full max-h-[70vh] object-contain rounded-xl border border-edge"
            />
            <div className="mt-4 text-center max-w-2xl">
              <h4 className="text-lg font-bold text-text mb-1">
                {selected.storyline || selected.slug || 'Untitled'}
              </h4>
              {(selected.thesis || selected.mood) && (
                <p className="text-sm text-dim">
                  {selected.thesis && <span className="block">{selected.thesis}</span>}
                  {selected.mood && <span className="block mt-1 italic">Mood: {selected.mood}</span>}
                </p>
              )}
              <div className="mt-2 flex items-center justify-center gap-2">
                <Badge tone="default">C{selected.cycle ?? '—'}</Badge>
                {selected.section && <span className="text-xs text-dim uppercase">{selected.section}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function WorldTab({ world, photos, neighborhoods, onCitizenClick }) {
  return (
    <div className="space-y-6 pb-20">
      <BondWeb world={world} onCitizenClick={onCitizenClick} />
      <PhotoWire photos={photos} />
      <CityMap neighborhoods={neighborhoods} />
    </div>
  );
}
