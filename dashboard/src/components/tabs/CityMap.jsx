import React, { useMemo, useState, useRef } from 'react';
import hoodsGeoRaw from '../../assets/oakland-neighborhoods.geojson?raw';
import { Card, Badge } from '../ui';
import SupportChip, { useCascade } from '../SupportChip';

const hoodsGeo = JSON.parse(hoodsGeoRaw);

/**
 * Canon 22-hood mapping to the 131 Oakland sub-neighborhood polygons in the
 * GeoJSON asset (properties.neighbhd). Each entry records how the canon name
 * resolves so the UI can flag approximate / aliased / union geometry.
 */
export const HOOD_MAP = {
  // exact 1:1
  Downtown: { constituents: ['Downtown'], match: 'exact' },
  Temescal: { constituents: ['Temescal'], match: 'exact' },
  Laurel: { constituents: ['Laurel'], match: 'exact' },
  Rockridge: { constituents: ['Rockridge'], match: 'exact' },
  'Adams Point': { constituents: ['Adams Point'], match: 'exact' },
  'Grand Lake': { constituents: ['Grand Lake'], match: 'exact' },
  Chinatown: { constituents: ['Chinatown'], match: 'exact' },
  Glenview: { constituents: ['Glenview'], match: 'exact' },
  Dimond: { constituents: ['Dimond'], match: 'exact' },
  'Ivy Hill': { constituents: ['Ivy Hill'], match: 'exact' },
  // alias: canon name differs slightly from the dataset label
  'Piedmont Ave': { constituents: ['Piedmont Avenue'], match: 'alias' },
  'San Antonio': { constituents: ['Rancho San Antonio'], match: 'alias' },
  'Lake Merritt': { constituents: ['Merritt'], match: 'alias' },
  // union: several polygons merged to represent one canon district
  'West Oakland': {
    constituents: ['Acorn', 'Acorn Industrial', 'Clawson', 'McClymonds', 'Oak Center', 'Prescott', 'South Prescott'],
    match: 'union',
  },
  KONO: { constituents: ['Northgate/Waverly'], match: 'union' },
  'East Oakland': {
    constituents: [
      'Elmhurst Park', 'Castlemont', 'Eastmont', 'Eastmont Hills', 'Brookfield Village',
      'Sobrante Park', 'Foothill Square', 'Havenscourt', 'Seminary', 'Millsmont',
      'North Stonehurst', 'South Stonehurst', 'Columbia Gardens', 'Toler Heights',
      'Caballo Hills', 'Sequoyah', 'Leona Heights', 'Oak Knoll-Golf Links',
    ],
    match: 'union',
  },
  Fruitvale: {
    constituents: ['Fruitvale Station', 'Fairfax', 'Fairfax Business', 'East 14th Street Business', 'Patten'],
    match: 'union',
  },
  // approx: best available polygon(s) for a canon hood with no exact match
  'Jack London': { constituents: ['Produce and Waterfront'], match: 'approx' },
  Brooklyn: { constituents: ['Clinton'], match: 'approx' },
  Eastlake: { constituents: ['Cleveland Heights'], match: 'approx' },
  Uptown: { constituents: ['San Pablo Gateway'], match: 'approx' },
  // missing: canon-invented districts with no real-world polygon; rendered as stat chips
  'Baylight District': { constituents: [], match: 'exact' },
};

// Design-token hex values (authorized hard-coded source for color interpolation).
const TOKEN_RGB = {
  ink: { r: 10, g: 10, b: 15 },
  panel: { r: 18, g: 18, b: 24 },
  'panel-2': { r: 23, g: 23, b: 31 },
  edge: { r: 38, g: 38, b: 46 },
  text: { r: 231, g: 231, b: 234 },
  dim: { r: 154, g: 154, b: 165 },
  faint: { r: 107, g: 107, b: 118 },
  accent: { r: 56, g: 189, b: 248 },
  warn: { r: 245, g: 158, b: 11 },
  good: { r: 52, g: 211, b: 153 },
  bad: { r: 248, g: 113, b: 113 },
};

const VIEWBOX_W = 1000;
const VIEWBOX_H = 620;
const PADDING = 20;

function rgbString({ r, g, b }) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
  return {
    r: lerp(c1.r, c2.r, t),
    g: lerp(c1.g, c2.g, t),
    b: lerp(c1.b, c2.b, t),
  };
}

function interpolateColor(stops, t) {
  // stops: [{ t: 0, color: {r,g,b} }, ...] sorted by t ascending
  if (t <= stops[0].t) return rgbString(stops[0].color);
  if (t >= stops[stops.length - 1].t) return rgbString(stops[stops.length - 1].color);
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a.t && t <= b.t) {
      const local = (t - a.t) / (b.t - a.t || 1);
      return rgbString(lerpColor(a.color, b.color, local));
    }
  }
  return rgbString(stops[stops.length - 1].color);
}

function flattenFeatureCoords(feature) {
  const coords = [];
  const geom = feature.geometry;
  if (geom.type === 'Polygon') {
    geom.coordinates.forEach((ring) => ring.forEach(([lon, lat]) => coords.push([lon, lat])));
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates.forEach((polygon) =>
      polygon.forEach((ring) => ring.forEach(([lon, lat]) => coords.push([lon, lat])))
    );
  }
  return coords;
}

function pathForGeometry(geometry, project) {
  const rings = [];
  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach((ring) => rings.push(ring));
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((polygon) => polygon.forEach((ring) => rings.push(ring)));
  }
  return rings
    .map((ring) => {
      const pts = ring.map(([lon, lat]) => {
        const { x, y } = project(lon, lat);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      });
      return `M ${pts.join(' L ')} Z`;
    })
    .join(' ');
}

function useGeometry() {
  return useMemo(() => {
    const features = hoodsGeo.features || [];
    const byName = new Map();
    features.forEach((f) => {
      const name = f.properties?.neighbhd;
      if (!name) return;
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(f);
    });

    const canonEntries = Object.entries(HOOD_MAP).map(([canonName, meta]) => {
      const matchedFeatures = [];
      meta.constituents.forEach((constituent) => {
        const found = byName.get(constituent) || [];
        matchedFeatures.push(...found);
      });
      return { canonName, meta, features: matchedFeatures };
    });

    const usedNames = new Set();
    canonEntries.forEach((entry) => {
      entry.meta.constituents.forEach((c) => usedNames.add(c));
    });
    const backgroundFeatures = features.filter((f) => !usedNames.has(f.properties?.neighbhd));

    // bbox over all matched canon polygon coordinates
    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    let count = 0;
    canonEntries.forEach((entry) => {
      entry.features.forEach((f) => {
        flattenFeatureCoords(f).forEach(([lon, lat]) => {
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          count++;
        });
      });
    });

    let bbox = null;
    let project = null;
    if (count > 0) {
      const meanLat = (minLat + maxLat) / 2;
      const meanLatRad = (meanLat * Math.PI) / 180;
      const cosLat = Math.cos(meanLatRad);
      const projW = (maxLon - minLon) * cosLat;
      const projH = maxLat - minLat;
      const innerW = VIEWBOX_W - PADDING * 2;
      const innerH = VIEWBOX_H - PADDING * 2;
      const scale = Math.min(innerW / projW, innerH / projH);
      project = (lon, lat) => ({
        x: (lon - minLon) * cosLat * scale + PADDING,
        y: (maxLat - lat) * scale + PADDING,
      });
      bbox = { minLon, maxLon, minLat, maxLat, meanLat };
    }

    return { features, byName, canonEntries, backgroundFeatures, bbox, project };
  }, []);
}

function useHoodLookup(neighborhoods) {
  return useMemo(() => {
    const arr = Array.isArray(neighborhoods) ? neighborhoods : neighborhoods?.neighborhoods || [];
    const map = new Map();
    arr.forEach((h) => {
      if (h?.name) map.set(h.name, h);
    });
    return { arr, map };
  }, [neighborhoods]);
}

function metricSpec(housingField) {
  const base = [
    { key: 'sentiment', label: 'Sentiment', field: 'sentiment', format: (v) => (v == null ? '—' : Number(v).toFixed(2)) },
    { key: 'crime', label: 'Crime', field: 'crimeIndex', format: (v) => (v == null ? '—' : Number(v).toFixed(2)) },
    { key: 'retail', label: 'Retail', field: 'retailVitality', format: (v) => (v == null ? '—' : Number(v).toFixed(1)) },
  ];
  if (housingField) {
    base.push({ key: 'housing', label: 'Housing pressure', field: housingField, format: (v) => (v == null ? '—' : Number(v).toFixed(2)) });
  }
  return base;
}

function colorForMetric(metricKey, value, values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min || 1;
  const t = (value - min) / range;

  if (metricKey === 'sentiment') {
    // Center the scale on the median so half the city reads warm, half cool.
    const median = sorted[Math.floor(sorted.length / 2)];
    const lo = min;
    const hi = max;
    const center = median;
    if (value <= center) {
      const local = (value - lo) / (center - lo || 1);
      return interpolateColor(
        [
          { t: 0, color: TOKEN_RGB.bad },
          { t: 1, color: TOKEN_RGB.panel },
        ],
        local
      );
    }
    const local = (value - center) / (hi - center || 1);
    return interpolateColor(
      [
        { t: 0, color: TOKEN_RGB.panel },
        { t: 1, color: TOKEN_RGB.good },
      ],
      local
    );
  }

  if (metricKey === 'crime') {
    // Three-stop: low crime is good, median is warn, high is bad.
    const median = sorted[Math.floor(sorted.length / 2)];
    if (value <= median) {
      const local = (value - min) / (median - min || 1);
      return interpolateColor(
        [
          { t: 0, color: TOKEN_RGB.good },
          { t: 1, color: TOKEN_RGB.warn },
        ],
        local
      );
    }
    const local = (value - median) / (max - median || 1);
    return interpolateColor(
      [
        { t: 0, color: TOKEN_RGB.warn },
        { t: 1, color: TOKEN_RGB.bad },
      ],
      local
    );
  }

  if (metricKey === 'retail') {
    return interpolateColor(
      [
        { t: 0, color: TOKEN_RGB.panel },
        { t: 1, color: TOKEN_RGB.accent },
      ],
      t
    );
  }

  // housing pressure: same diverging pattern as crime (low pressure good, high bad)
  const median = sorted[Math.floor(sorted.length / 2)];
  if (value <= median) {
    const local = (value - min) / (median - min || 1);
    return interpolateColor(
      [
        { t: 0, color: TOKEN_RGB.good },
        { t: 1, color: TOKEN_RGB.warn },
      ],
      local
    );
  }
  const local = (value - median) / (max - median || 1);
  return interpolateColor(
    [
      { t: 0, color: TOKEN_RGB.warn },
      { t: 1, color: TOKEN_RGB.bad },
    ],
    local
  );
}

export default function CityMap({ neighborhoods }) {
  const { arr: hoods, map: hoodLookup } = useHoodLookup(neighborhoods);
  const { canonEntries, backgroundFeatures, bbox, project } = useGeometry();
  const [metric, setMetric] = useState('sentiment');
  const cascade = useCascade();
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState(null);
  const svgRef = useRef(null);

  const housingField = useMemo(() => {
    if (hoods.some((h) => h.housingPressure != null)) return 'housingPressure';
    if (hoods.some((h) => h.housing_pressure != null)) return 'housing_pressure';
    return null;
  }, [hoods]);
  const specs = useMemo(() => metricSpec(housingField), [housingField]);
  const currentSpec = specs.find((s) => s.key === metric) || specs[0];

  // values across the 22 canon hoods for normalization
  const canonValues = useMemo(() => {
    const values = [];
    canonEntries.forEach(({ canonName }) => {
      const h = hoodLookup.get(canonName);
      const raw = h?.[currentSpec.field];
      if (raw != null) values.push(Number(raw));
    });
    return values;
  }, [canonEntries, hoodLookup, currentSpec]);

  const missingEntries = useMemo(
    () => canonEntries.filter((e) => e.features.length === 0),
    [canonEntries]
  );

  const sortedCanonValues = useMemo(
    () => canonValues.slice().sort((a, b) => a - b),
    [canonValues]
  );

  const legendStops = useMemo(() => {
    if (sortedCanonValues.length < 2) return [];
    const min = sortedCanonValues[0];
    const max = sortedCanonValues[sortedCanonValues.length - 1];
    const steps = 5;
    return Array.from({ length: steps }, (_, i) => {
      const t = i / (steps - 1);
      const v = min + (max - min) * t;
      const color = colorForMetric(metric, v, sortedCanonValues);
      return { offset: `${t * 100}%`, color };
    });
  }, [sortedCanonValues, metric]);

  function handleMouseMove(e) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({
      x: e.clientX - rect.left + 12,
      y: e.clientY - rect.top + 12,
    });
  }

  function hoodFill(canonName) {
    const h = hoodLookup.get(canonName);
    const raw = h?.[currentSpec.field];
    if (raw == null || sortedCanonValues.length < 2) return 'var(--color-panel-2)';
    return colorForMetric(metric, Number(raw), sortedCanonValues);
  }

  function selectedHoodData() {
    if (!selected) return null;
    const h = hoodLookup.get(selected);
    const entry = canonEntries.find((e) => e.canonName === selected);
    return { h, entry };
  }

  const selectedData = selectedHoodData();

  return (
    <Card title="CITY MAP" className="relative overflow-visible">
      {/* Metric toggles + cascade provenance */}
      <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
        {specs.map((s) => (
          <button
            key={s.key}
            onClick={() => setMetric(s.key)}
            className={`px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-wide transition-colors ${
              metric === s.key
                ? 'bg-accent/10 border-accent/30 text-accent'
                : 'bg-panel border-edge text-dim hover:text-text'
            }`}
          >
            {s.label}
          </button>
        ))}
        <span className="ml-auto">
          <SupportChip cascade={cascade} />
        </span>
      </div>

      {/* Map */}
      <div className="relative mt-4">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          className="w-full h-auto"
          onMouseMove={handleMouseMove}
        >
          <defs>
            <linearGradient id="citymap-legend" x1="0%" y1="0%" x2="100%" y2="0%">
              {legendStops.map((stop, i) => (
                <stop key={i} offset={stop.offset} stopColor={stop.color} />
              ))}
            </linearGradient>
          </defs>

          {/* Non-canon background land */}
          {project &&
            backgroundFeatures.map((f, i) => (
              <path
                key={`bg-${i}`}
                d={pathForGeometry(f.geometry, project)}
                className="fill-panel stroke-edge"
                style={{ opacity: 0.35 }}
              />
            ))}

          {/* Canon hoods */}
          {project &&
            canonEntries.map((entry) => {
              if (entry.features.length === 0) return null;
              const isSelected = selected === entry.canonName;
              const fill = hoodFill(entry.canonName);
              return (
                <g
                  key={entry.canonName}
                  className="cursor-pointer"
                  onMouseEnter={() => setHovered(entry.canonName)}
                  onMouseLeave={() => setHovered((prev) => (prev === entry.canonName ? null : prev))}
                  onClick={() => setSelected(entry.canonName)}
                >
                  {entry.features.map((f, i) => (
                    <path
                      key={`${entry.canonName}-${i}`}
                      d={pathForGeometry(f.geometry, project)}
                      fill={fill}
                      stroke={isSelected ? 'var(--color-accent)' : 'var(--color-edge)'}
                      strokeWidth={isSelected ? 2.5 : 0.75}
                      strokeDasharray={fill === 'var(--color-panel-2)' ? '3 2' : undefined}
                      style={{ transition: 'fill 200ms ease, stroke 200ms ease' }}
                    />
                  ))}
                </g>
              );
            })}
        </svg>

        {/* Hover tooltip */}
        {hovered && !selected && (() => {
          const h = hoodLookup.get(hovered);
          const entry = canonEntries.find((e) => e.canonName === hovered);
          return (
            <div
              className="absolute z-20 pointer-events-none bg-panel-2 border border-edge rounded-xl p-3 shadow-xl min-w-[160px]"
              style={{ left: tooltipPos.x, top: tooltipPos.y }}
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="text-xs font-bold text-text">{hovered}</span>
                {entry && entry.meta.match !== 'exact' && (
                  <span className="text-[10px] text-dim uppercase">{entry.meta.match} geometry</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {specs.map((s) => {
                  const raw = h?.[s.field];
                  return (
                    <div key={s.key}>
                      <div className="text-[10px] font-bold text-faint uppercase">{s.label}</div>
                      <div className={`text-xs font-mono font-bold ${metric === s.key ? 'text-accent' : 'text-text'}`}>
                        {s.format(raw)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Detail strip for selected hood */}
      {selectedData?.h && (
        <div className="mx-5 mb-4 p-3 bg-panel-2 border border-accent/20 rounded-xl">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-sm font-bold text-text">{selected}</span>
            {selectedData.entry && selectedData.entry.meta.match !== 'exact' && (
              <Badge tone="default">{selectedData.entry.meta.match} geometry</Badge>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {specs.map((s) => {
              const raw = selectedData.h[s.field];
              return (
                <div key={s.key}>
                  <div className="text-[10px] font-bold text-faint uppercase">{s.label}</div>
                  <div className={`text-sm font-mono font-bold ${metric === s.key ? 'text-accent' : 'text-text'}`}>
                    {s.format(raw)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between text-[10px] text-dim font-mono uppercase mb-1.5">
          <span>{sortedCanonValues.length >= 2 ? currentSpec.format(sortedCanonValues[0]) : '—'}</span>
          <span>{currentSpec.label}</span>
          <span>{sortedCanonValues.length >= 2 ? currentSpec.format(sortedCanonValues[sortedCanonValues.length - 1]) : '—'}</span>
        </div>
        <div
          className="h-2 rounded-full border border-edge"
          style={{
            background:
              legendStops.length > 1
                ? `linear-gradient(to right, ${legendStops.map((s) => `${s.color} ${s.offset}`).join(', ')})`
                : 'var(--color-panel-2)',
          }}
        />

        {/* Missing-geometry chips */}
        {missingEntries.length > 0 && (
          <div className="mt-4">
            <div className="text-[10px] font-bold text-faint uppercase mb-2">No polygon match</div>
            <div className="flex flex-wrap gap-2">
              {missingEntries.map(({ canonName }) => {
                const h = hoodLookup.get(canonName);
                return (
                  <div
                    key={canonName}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-edge bg-panel"
                  >
                    <span className="text-xs text-text">{canonName}</span>
                    {h && (
                      <>
                        <Badge tone={h.sentiment >= 0.9 ? 'good' : h.sentiment >= 0.85 ? 'warn' : 'bad'}>
                          {h.sentiment.toFixed(2)}
                        </Badge>
                        <Badge tone={h.crimeIndex > 1 ? 'bad' : 'default'}>{h.crimeIndex.toFixed(1)}</Badge>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
