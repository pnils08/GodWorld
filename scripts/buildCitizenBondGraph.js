'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');

const INACTIVE_STATUSES = new Set([
  'inactive',
  'terminated',
  'dissolved',
  'ended',
  'broken',
  'closed',
  'removed',
  'deleted',
  'former',
  'archived',
  'no',
  'false',
  '0',
]);

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--input' && i + 1 < argv.length) {
      args.input = argv[++i];
    } else if (arg === '--out' && i + 1 < argv.length) {
      args.out = argv[++i];
    } else if (arg === '--html' && i + 1 < argv.length) {
      args.html = argv[++i];
    } else if (arg === '--min-intensity' && i + 1 < argv.length) {
      args.minIntensity = Number(argv[++i]);
    }
  }
  return args;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseIntensity(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 1;
}

function isActiveStatus(status) {
  return typeof status === 'string' && /active/i.test(status.trim());
}

function isInactiveStatus(status) {
  if (typeof status !== 'string') return false;
  return INACTIVE_STATUSES.has(status.trim().toLowerCase());
}

function findHeaderLine(lines) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('BondId') && line.includes('CitizenA') && line.includes('CitizenB')) {
      return i;
    }
  }
  return -1;
}

function parseTsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const headerIdx = findHeaderLine(lines);
  if (headerIdx === -1) {
    throw new Error(`Could not locate TSV header in ${filePath}`);
  }

  const headers = lines[headerIdx].split('\t').map((h) => h.trim().toLowerCase());
  const col = {};
  headers.forEach((h, i) => {
    col[h] = i;
  });

  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cells = line.split('\t');
    const row = {};
    for (const key of Object.keys(col)) {
      row[key] = (cells[col[key]] || '').trim();
    }
    rows.push(row);
  }

  return rows;
}

function hashStringToColor(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & 0xffffffff;
  }
  const hue = Math.abs(hash) % 360;
  const sat = 65;
  const light = 55;
  return hslToHex(hue, sat, light);
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (v) => {
    const hex = Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function buildGraph(inputPath, options) {
  const minIntensity = Number.isFinite(options.minIntensity) ? options.minIntensity : 0;
  const rows = parseTsv(inputPath);

  let skippedBlank = 0;
  let skippedInactive = 0;
  let keptUnrecognized = 0;
  let maxTimestamp = 0;

  const linksByPair = new Map();
  const neighborhoods = new Map();
  const labels = new Map();

  for (const row of rows) {
    const a = row.citizena;
    const b = row.citizenb;
    if (!a || !b) {
      skippedBlank++;
      continue;
    }

    const status = row.status;
    if (status && isInactiveStatus(status)) {
      skippedInactive++;
      continue;
    }
    if (status && !isActiveStatus(status)) {
      keptUnrecognized++;
    }

    if (row.timestamp) {
      const ts = new Date(row.timestamp).getTime();
      if (Number.isFinite(ts) && ts > maxTimestamp) maxTimestamp = ts;
    }

    const idA = slugify(a);
    const idB = slugify(b);
    if (!labels.has(idA)) labels.set(idA, a);
    if (!labels.has(idB)) labels.set(idB, b);
    if (!neighborhoods.has(idA) && row.neighborhood) neighborhoods.set(idA, row.neighborhood);
    if (!neighborhoods.has(idB) && row.neighborhood) neighborhoods.set(idB, row.neighborhood);

    const key = [idA, idB].sort().join('|');
    const weight = parseIntensity(row.intensity);
    const existing = linksByPair.get(key);
    if (!existing || weight > existing.weight) {
      linksByPair.set(key, {
        source: idA,
        target: idB,
        relation: row.bondtype || 'bond',
        weight,
        status: status || null,
      });
    }
  }

  let links = Array.from(linksByPair.values())
    .filter((l) => l.weight >= minIntensity)
    .sort((a, b) => {
      if (a.source !== b.source) return a.source.localeCompare(b.source, 'en');
      if (a.target !== b.target) return a.target.localeCompare(b.target, 'en');
      return 0;
    });

  const nodeIds = new Set();
  const degree = new Map();
  for (const link of links) {
    nodeIds.add(link.source);
    nodeIds.add(link.target);
    degree.set(link.source, (degree.get(link.source) || 0) + 1);
    degree.set(link.target, (degree.get(link.target) || 0) + 1);
  }

  // Include isolated citizens that appeared in rows but have no remaining links
  // after filtering? The prompt implies nodes are citizens present in bonds.
  // We'll keep only citizens with at least one kept link.
  const nodes = Array.from(nodeIds)
    .map((id) => ({
      id,
      label: labels.get(id) || id,
      group: neighborhoods.get(id) || null,
      neighborhood: neighborhoods.get(id) || null,
      degree: degree.get(id) || 0,
    }))
    .sort((a, b) => a.id.localeCompare(b.id, 'en'));

  const generatedAt = maxTimestamp
    ? new Date(maxTimestamp).toISOString()
    : new Date(fs.statSync(inputPath).mtime).toISOString();

  const stats = {
    rowsRead: rows.length,
    skippedBlank,
    skippedInactive,
    keptUnrecognized,
    minIntensity,
    nodes: nodes.length,
    links: links.length,
  };

  const graph = {
    directed: false,
    multigraph: false,
    graph: {
      generatedAt,
      source: inputPath,
      stats,
    },
    nodes,
    links,
  };

  return { graph, nodes, links };
}

function renderHtml(graph, sourcePath) {
  const title = `Citizen bond graph — ${path.basename(sourcePath)}`;
  const nodesJson = JSON.stringify(graph.nodes);
  const linksJson = JSON.stringify(graph.links);
  const sourceNote = `Generated world graph from ${path.basename(sourcePath)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f0f1a; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
  header { padding: 14px 18px; background: #1a1a2e; border-bottom: 1px solid #2a2a4e; }
  header h1 { font-size: 16px; font-weight: 600; }
  header p { font-size: 12px; color: #999; margin-top: 4px; }
  #graph { flex: 1; }
</style>
</head>
<body>
<header>
  <h1>${title}</h1>
  <p>${sourceNote} &middot; ${graph.graph.stats.nodes} nodes &middot; ${graph.graph.stats.links} links</p>
</header>
<div id="graph"></div>
<script>
const RAW_NODES = ${nodesJson};
const RAW_EDGES = ${linksJson};

function hashColor(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & 0xffffffff;
  }
  const h = Math.abs(hash) % 360;
  const s = 65 / 100;
  const l = 55 / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

const nodesDS = new vis.DataSet(RAW_NODES.map((n) => ({
  id: n.id,
  label: n.label,
  group: n.group,
  title: n.neighborhood ? n.neighborhood : null,
  color: n.group ? hashColor(n.group) : '#9C755F',
  value: n.degree,
})));

const edgesDS = new vis.DataSet(RAW_EDGES.map((e, i) => ({
  id: i,
  from: e.source,
  to: e.target,
  label: e.relation,
  title: e.relation + (e.weight ? ' (intensity ' + e.weight + ')' : ''),
  width: Math.max(1, e.weight),
  color: { opacity: 0.7 },
})));

const container = document.getElementById('graph');
const network = new vis.Network(container, { nodes: nodesDS, edges: edgesDS }, {
  physics: {
    enabled: true,
    solver: 'forceAtlas2Based',
    forceAtlas2Based: {
      gravitationalConstant: -60,
      centralGravity: 0.005,
      springLength: 120,
      springConstant: 0.08,
      damping: 0.4,
      avoidOverlap: 0.8,
    },
    stabilization: { iterations: 200, fit: true },
  },
  interaction: { hover: true, tooltipDelay: 100, hideEdgesOnDrag: true },
  nodes: { shape: 'dot', borderWidth: 1.5, font: { color: '#e0e0e0' } },
  edges: { smooth: { type: 'continuous', roundness: 0.2 }, selectionWidth: 3 },
});

network.once('stabilizationIterationsDone', () => {
  network.setOptions({ physics: { enabled: false } });
});
</script>
</body>
</html>
`;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.input) {
    console.error('Usage: node scripts/buildCitizenBondGraph.js --input <path.tsv> [--out output/citizen-bond-graph.json] [--html output/citizen-bond-graph.html] [--min-intensity N]');
    process.exit(1);
  }

  const inputPath = path.resolve(args.input);
  const outPath = args.out ? path.resolve(args.out) : path.join(REPO_ROOT, 'output', 'citizen-bond-graph.json');
  const htmlPath = args.html ? path.resolve(args.html) : null;

  const { graph } = buildGraph(inputPath, { minIntensity: args.minIntensity });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(graph, null, 2) + '\n', 'utf8');

  if (htmlPath) {
    fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
    fs.writeFileSync(htmlPath, renderHtml(graph, inputPath), 'utf8');
  }

  console.log(
    `Citizen bond graph built: ${graph.graph.stats.nodes} nodes, ${graph.graph.stats.links} links ` +
    `(rows=${graph.graph.stats.rowsRead}, skipped blank=${graph.graph.stats.skippedBlank}, ` +
    `inactive=${graph.graph.stats.skippedInactive}) → ${path.relative(REPO_ROOT, outPath)}` +
    (htmlPath ? ` + ${path.relative(REPO_ROOT, htmlPath)}` : '')
  );
}

module.exports = { buildGraph, renderHtml, parseTsv, slugify };

if (require.main === module) {
  main();
}
