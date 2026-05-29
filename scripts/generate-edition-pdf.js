#!/usr/bin/env node
/**
 * ============================================================================
 * Bay Tribune Edition PDF Generator v1.1
 * ============================================================================
 *
 * Transforms a Cycle Pulse publishable artifact (edition, interview,
 * supplemental, dispatch, interview-transcript) + photos into a newspaper-
 * style PDF using HTML/CSS layout + Puppeteer rendering. Type-aware via
 * --type flag (T9).
 *
 * Usage:
 *   node scripts/generate-edition-pdf.js editions/cycle_pulse_edition_83.txt
 *   node scripts/generate-edition-pdf.js editions/cycle_pulse_edition_83.txt --preview
 *   node scripts/generate-edition-pdf.js editions/cycle_pulse_edition_83.txt --letter
 *   node scripts/generate-edition-pdf.js editions/cycle_pulse_edition_83.txt --no-photos
 *   node scripts/generate-edition-pdf.js editions/cycle_pulse_interview_92_santana.txt --type interview --cycle 92
 *
 * Flags:
 *   --type {edition|interview|supplemental|dispatch|interview-transcript}
 *           Default: edition. Determines slug + output paths + masthead label.
 *   --cycle N
 *           Required when --type ≠ edition.
 *   --preview    Generate HTML only, skip PDF (for CSS iteration in browser)
 *   --letter     Use Letter (8.5x11) instead of Tabloid (11x17)
 *   --no-photos  Text-only layout (if photos not yet generated)
 *
 * Output paths:
 *   edition       → output/pdfs/e<XX>.html, output/pdfs/bay_tribune_e<XX>.pdf
 *   non-edition   → output/pdfs/<type>_c<XX>[_<slug>].html,
 *                   output/pdfs/bay_tribune_<type>_c<XX>[_<slug>].pdf
 *
 * Requires: puppeteer (npm install puppeteer)
 *
 * ============================================================================
 */

var path = require('path');
var fs = require('fs');
var editionParser = require('../lib/editionParser');

var ALLOWED_TYPES = ['edition', 'interview', 'supplemental', 'dispatch', 'interview-transcript'];

function parseFlag(name) {
  var i = process.argv.indexOf('--' + name);
  if (i === -1 || i === process.argv.length - 1) return null;
  return process.argv[i + 1];
}

function parseType() {
  var raw = parseFlag('type');
  if (!raw) return 'edition';
  if (ALLOWED_TYPES.indexOf(raw) === -1) {
    console.error('[ERROR] --type must be one of: ' + ALLOWED_TYPES.join(', '));
    process.exit(1);
  }
  return raw;
}

function parseCycleFlag() {
  var raw = parseFlag('cycle');
  if (!raw) return null;
  var n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    console.error('[ERROR] --cycle must be a positive integer');
    process.exit(1);
  }
  return n;
}

function deriveNonEditionSlug(filename, type) {
  var base = path.basename(filename);
  var pattern = new RegExp('^cycle_pulse_' + type + '_\\d+_(.+)\\.txt$');
  var m = base.match(pattern);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Text-to-HTML Converter
// ---------------------------------------------------------------------------

/**
 * Convert edition markdown-ish text to HTML paragraphs.
 * Handles: bold, italics, cross-references, blockquotes, em-dashes.
 */
function textToHtml(text) {
  if (!text) return '';

  var lines = text.split('\n');
  var html = [];
  var inParagraph = false;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();

    // Skip metadata lines
    if (line.match(/^Names Index:/)) continue;
    if (line.match(/^\[Photo:/)) continue;
    if (line.match(/^###\s+/)) continue; // headlines handled separately
    if (line.match(/^\|/)) continue; // table rows
    if (line.match(/^By\s+.+\|/)) continue; // bylines handled separately

    // Cross-references
    if (line.match(/^->\s+See also:/)) {
      html.push('<p class="see-also">' + escapeHtml(line.replace(/^->\s+/, '')) + '</p>');
      continue;
    }

    // Status notes (bold text starting with STABILIZATION or similar)
    if (line.match(/^\*\*[A-Z]+.+STATUS/)) {
      html.push('<div class="status-note">' + formatInline(line) + '</div>');
      continue;
    }

    // Subheadings within articles (bold lines)
    if (line.match(/^\*\*[^*]+\*\*$/) && line.length < 100) {
      if (inParagraph) { html.push('</p>'); inParagraph = false; }
      html.push('<p><strong>' + escapeHtml(line.replace(/\*\*/g, '')) + '</strong></p>');
      continue;
    }

    // Quick take items (starting with em-dash)
    if (line.match(/^—\s+/)) {
      if (inParagraph) { html.push('</p>'); inParagraph = false; }
      var qtText = line.replace(/^—\s+/, '');
      // Bold the category tag (e.g., "CIVIC:" or "TRANSIT:")
      qtText = qtText.replace(/^([A-Z]+):/, '<strong>$1:</strong>');
      html.push('<div class="quick-take-item">' + formatInline(qtText) + '</div>');
      continue;
    }

    // Empty line = paragraph break
    if (!line) {
      if (inParagraph) {
        html.push('</p>');
        inParagraph = false;
      }
      continue;
    }

    // Regular text
    if (!inParagraph) {
      html.push('<p>');
      inParagraph = true;
    } else {
      html.push(' ');
    }
    html.push(formatInline(line));
  }

  if (inParagraph) html.push('</p>');
  return html.join('');
}

/**
 * Format inline text: bold, italic, quotes.
 */
function formatInline(text) {
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Escape remaining HTML entities (but keep our tags)
  // Actually, we need to escape first then add tags
  return text;
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Letter Builder
// ---------------------------------------------------------------------------

/**
 * Build HTML for letters section (each letter is its own block).
 */
function buildLettersHtml(section) {
  var html = [];
  var letterTexts = section.text.split(/^---$/m);

  for (var i = 0; i < letterTexts.length; i++) {
    var letterText = letterTexts[i].trim();
    if (!letterText) continue;

    // Extract signature line
    var lines = letterText.split('\n');
    var sigLine = '';
    var bodyLines = [];

    for (var j = 0; j < lines.length; j++) {
      var l = lines[j].trim();
      if (l.match(/^—\s+\w+/) && j >= lines.length - 3) {
        sigLine = l;
      } else if (l && !l.match(/^Names Index:/)) {
        bodyLines.push(l);
      }
    }

    html.push('<div class="letter">');
    html.push('<div class="article-body">');
    html.push(textToHtml(bodyLines.join('\n')));
    html.push('</div>');
    if (sigLine) {
      html.push('<div class="letter-sig">' + escapeHtml(sigLine) + '</div>');
    }
    html.push('</div>');
  }

  return html.join('\n');
}

// ---------------------------------------------------------------------------
// Photo Embedding
// ---------------------------------------------------------------------------

/**
 * Load a photo as a base64 data URI.
 * @param {string} photoDir - Directory containing photos
 * @param {string} filename - Photo filename
 * @returns {string|null} Base64 data URI or null
 */
function loadPhotoBase64(photoDir, filename) {
  var filePath = path.join(photoDir, filename);
  if (!fs.existsSync(filePath)) return null;

  var ext = path.extname(filename).toLowerCase();
  var mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  var buffer = fs.readFileSync(filePath);
  return 'data:' + mimeType + ';base64,' + buffer.toString('base64');
}

/**
 * Normalize a section identifier for cross-source comparison.
 *
 * S234 engine.25 G-PR6 fix: DJ photo direction writes section IDs with
 * underscore separators (`FRONT_PAGE`) while edition text writes them with
 * spaces (`FRONT PAGE`); pre-S234 comparison was uppercase-only and the
 * mismatch silently dropped FP1 photos. Normalize both sides by collapsing
 * any run of underscore-or-whitespace into a single space, uppercasing,
 * and trimming. Applies symmetrically — calling this on both the manifest
 * side and the parsed-section side guarantees equality on legitimate
 * matches regardless of which separator the writer chose.
 */
// S235 G-PR7 — single source moved to lib/editionParser. Local alias kept so
// the existing module.exports + S234 G-PR6 test suite keep resolving the
// symbol from this file.
var normalizeSectionId = editionParser.normalizeSectionId;

/**
 * Find photo for a section from the manifest.
 */
function findPhotoForSection(manifest, sectionName) {
  if (!manifest || !manifest.photos) return null;
  if (!sectionName) return null;
  var sectionNorm = normalizeSectionId(sectionName);
  return manifest.photos.find(function(p) {
    if (!p.section) return false;
    return normalizeSectionId(p.section) === sectionNorm;
  });
}

// Find ALL photos for a section (S244 ES-1, G-PR-NEW4). findPhotoForSection
// uses .find() and returns only the first match, so a section with two
// manifest entries (e.g. C95 CIVIC oari+temescal, CULTURE faith+kono, SPORTS
// cy-young+martin) silently rendered just one <img> — generator metrics said
// "5 placed" while the HTML carried 4. manifest.photos is already filtered for
// dropped/editorialFlag at load, so this returns every live placement for the
// section, in manifest order.
function findPhotosForSection(manifest, sectionName) {
  if (!manifest || !manifest.photos || !sectionName) return [];
  var sectionNorm = normalizeSectionId(sectionName);
  return manifest.photos.filter(function(p) {
    return p.section && normalizeSectionId(p.section) === sectionNorm;
  });
}

// ---------------------------------------------------------------------------
// Section HTML Builders
// ---------------------------------------------------------------------------

function buildArticleHtml(article, options) {
  options = options || {};
  var html = [];

  if (article.headline && !options.skipHeadline) {
    var headlineClass = options.headlineClass || 'headline-secondary';
    html.push('<div class="' + headlineClass + '">' + escapeHtml(article.headline) + '</div>');
  }

  if (article.subhead) {
    html.push('<div class="subhead">' + escapeHtml(article.subhead) + '</div>');
  }

  if (article.byline) {
    html.push('<div class="byline">' + escapeHtml(article.byline) + '</div>');
  }

  // Article body
  var bodyText = article.text;
  // Strip headline, subhead, and byline from the body text.
  // S235 G-PR7 — added `^# ` (h1) match. Pre-fix the strip caught `###` and
  // `**bold**` only; new editions use `# h1` for canonical headlines and the
  // unstripped h1 leaked into the body as a duplicate top line.
  if (bodyText) {
    var bodyLines = bodyText.split('\n');
    var startIdx = 0;
    for (var k = 0; k < Math.min(bodyLines.length, 8); k++) {
      var bl = bodyLines[k].trim();
      if (bl.match(/^#\s+/) || bl.match(/^###\s+/) || bl.match(/^\*\*.+\*\*$/) || bl.match(/^By\s+/)) {
        startIdx = k + 1;
      }
    }
    bodyText = bodyLines.slice(startIdx).join('\n');
  }

  var bodyClass = 'article-body' + (options.dropcap ? ' has-dropcap' : '');
  html.push('<div class="' + bodyClass + '">');
  html.push(textToHtml(bodyText));
  html.push('</div>');

  return html.join('\n');
}

function buildSectionHtml(section, photoDataUri, options) {
  options = options || {};
  var html = [];
  var beat = section.beat;

  // Section divider
  html.push('<hr class="section-divider">');
  html.push('<div class="section-label">' + escapeHtml(section.name) + '</div>');

  // Special handling by beat
  if (beat === 'editorial') {
    html.push('<div class="editors-desk">');
    // S235 G-PR7 — show editorial headline (ED slot from ARTICLE TABLE).
    // Pre-fix the editorial block rendered section-label + byline + body
    // only, dropping the canonical ED title. centered to match editors-desk
    // visual convention.
    if (section.headline) {
      html.push('<div class="headline-secondary" style="text-align:center">' + escapeHtml(section.headline) + '</div>');
    }
    if (section.byline) {
      html.push('<div class="byline" style="text-align:center">' + escapeHtml(section.byline) + '</div>');
    }
    html.push('<div class="article-body">');
    var edText = section.text;
    // Strip headline + byline from body text so they don't render twice.
    var edLines = edText.split('\n');
    var edStart = 0;
    for (var e = 0; e < Math.min(edLines.length, 6); e++) {
      var elTrim = edLines[e].trim();
      if (elTrim.match(/^#\s+/) || elTrim.match(/^###\s+/) || elTrim.match(/^\*\*.+\*\*$/) || elTrim.match(/^By\s+/)) {
        edStart = e + 1;
      }
    }
    html.push(textToHtml(edLines.slice(edStart).join('\n')));
    html.push('</div>');
    html.push('</div>');
    return html.join('\n');
  }

  if (beat === 'opinion') {
    html.push('<div class="opinion-block">');
    if (section.articles.length > 0 && section.articles[0].text && section.articles[0].text.length > 200) {
      html.push(buildArticleHtml(section.articles[0], { dropcap: false }));
    } else {
      // Fallback: render full section text (handles supplemental format where --- splits articles)
      html.push(textToHtml(section.text));
    }
    html.push('</div>');
    return html.join('\n');
  }

  if (beat === 'letters') {
    html.push('<div class="columns-2">');
    html.push(buildLettersHtml(section));
    html.push('</div>');
    return html.join('\n');
  }

  if (beat === 'quick-takes') {
    html.push('<div class="quick-takes">');
    html.push(textToHtml(section.text));
    html.push('</div>');
    return html.join('\n');
  }

  // Skip meta sections entirely
  if (beat === 'meta') {
    return '';
  }

  // Chicago section
  if (beat === 'chicago') {
    html.push('<div class="chicago-header">SKYLINE TRIBUNE &mdash; CHICAGO BUREAU</div>');
    // Extract weather if present in section name
    var chicagoWeather = section.name.match(/Weather:\s*(.+)/);
    if (chicagoWeather) {
      html.push('<div class="chicago-weather">' + escapeHtml(chicagoWeather[1]) + '</div>');
    }
  }

  // Photo placement (before articles, after section label). Renders EVERY live
  // photo the manifest assigns to this section (G-PR-NEW4), not just the first.
  // options.sectionPhotos = [{ dataUri, credit }]; falls back to the single
  // photoDataUri param when the caller didn't supply the array (back-compat).
  var sectionPhotos = options.sectionPhotos;
  if ((!sectionPhotos || !sectionPhotos.length) && photoDataUri) {
    sectionPhotos = [{ dataUri: photoDataUri, credit: (findPhotoForSection(options.manifest, section.name) || {}).credit }];
  }
  if (sectionPhotos && sectionPhotos.length) {
    for (var ph = 0; ph < sectionPhotos.length; ph++) {
      var sp = sectionPhotos[ph];
      if (!sp || !sp.dataUri) continue;
      html.push('<div class="photo-full">');
      html.push('  <img src="' + sp.dataUri + '" alt="' + escapeHtml(section.headline || section.name) + '">');
      if (sp.credit) {
        html.push('  <div class="photo-credit">' + escapeHtml(sp.credit) + '</div>');
      }
      html.push('</div>');
    }
  }

  // Determine column count
  var colClass = 'columns-3';
  if (beat === 'chicago' || beat === 'sports') colClass = 'columns-2';
  if (section.articles.length === 1 && (section.text || '').length < 2000) colClass = 'columns-2';

  html.push('<div class="' + colClass + '">');

  for (var a = 0; a < section.articles.length; a++) {
    if (a > 0) html.push('<hr class="article-separator">');
    var isLead = (a === 0);
    html.push(buildArticleHtml(section.articles[a], {
      dropcap: isLead && (beat === 'front-page' || beat === 'culture'),
      headlineClass: isLead ? 'headline-secondary' : 'headline-tertiary'
    }));
  }

  html.push('</div>');
  return html.join('\n');
}

// ---------------------------------------------------------------------------
// Full Page Builder
// ---------------------------------------------------------------------------

function buildNewspaperHtml(parsed, options) {
  options = options || {};
  var photoDir = options.photoDir;
  var manifest = options.manifest;
  var usePhotos = options.usePhotos !== false;
  var cssPath = options.cssPath;

  // Load CSS
  var css = '';
  if (cssPath && fs.existsSync(cssPath)) {
    css = fs.readFileSync(cssPath, 'utf-8');
  }

  // Override page size for letter format
  if (options.letterSize) {
    css = css.replace(/size:\s*11in\s+17in/, 'size: 8.5in 11in');
  }

  var html = [];
  html.push('<!DOCTYPE html>');
  html.push('<html lang="en">');
  html.push('<head>');
  html.push('<meta charset="UTF-8">');
  html.push('<title>Bay Tribune - Edition ' + (parsed.edition || '?') + '</title>');
  html.push('<style>');
  html.push(css);
  html.push('</style>');
  html.push('</head>');
  html.push('<body>');
  html.push('<div class="page-wrapper">');

  // Masthead — label adjusts by type. Edition keeps "Edition <N>" (back-compat);
  // non-edition uses "<TypeLabel>, Cycle <N>" so the printed banner reflects
  // the artifact category.
  var mastheadType = options.type || 'edition';
  var mastheadCycle = options.cycle != null ? options.cycle : (parsed.edition || '?');
  var mastheadSub;
  if (mastheadType === 'edition') {
    mastheadSub = 'The Cycle Pulse &mdash; Edition ' + escapeHtml(parsed.edition || '?');
  } else {
    var typeLabel = mastheadType.split('-').map(function(w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
    mastheadSub = 'The Cycle Pulse &mdash; ' + escapeHtml(typeLabel) +
      ', Cycle ' + escapeHtml(String(mastheadCycle));
  }

  html.push('<div class="masthead">');
  html.push('  <div class="masthead-flag">The Bay Tribune</div>');
  html.push('  <div class="masthead-sub">' + mastheadSub + '</div>');
  var metaParts = [];
  // G-PR17 (S215): fall back to today's formatted date when parser couldn't
  // extract a masthead date from the .txt. Pre-fix, missing date silently
  // produced "Oakland, California | Weather" with no publication date.
  if (parsed.date) {
    metaParts.push(parsed.date);
  } else {
    var today = new Date();
    var months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
    metaParts.push(months[today.getMonth()] + ' ' + today.getDate() + ', ' + today.getFullYear());
  }
  metaParts.push('Oakland, California');
  if (parsed.weather) metaParts.push(parsed.weather);
  html.push('  <div class="masthead-meta">' + escapeHtml(metaParts.join(' | ')) + '</div>');
  html.push('</div>');

  // Build each section
  for (var i = 0; i < parsed.sections.length; i++) {
    var section = parsed.sections[i];

    // Skip meta sections
    if (section.beat === 'meta') continue;

    // Find photo(s) for this section. G-PR-NEW4: load every live placement,
    // not just the first. photoDataUri stays the lead (front-page path + alt).
    var photoDataUri = null;
    var sectionPhotos = [];
    if (usePhotos && manifest && photoDir) {
      var sectionPhotoInfos = findPhotosForSection(manifest, section.name);
      for (var spi = 0; spi < sectionPhotoInfos.length; spi++) {
        var info = sectionPhotoInfos[spi];
        var uri = loadPhotoBase64(photoDir, info.file);
        if (uri) sectionPhotos.push({ dataUri: uri, credit: info.credit, file: info.file });
      }
      if (sectionPhotos.length) photoDataUri = sectionPhotos[0].dataUri;
    }

    // Front page gets special grid treatment
    if (section.beat === 'front-page') {
      html.push('<hr class="section-divider">');

      // Photo across the top
      if (photoDataUri) {
        html.push('<div class="photo-full">');
        html.push('  <img src="' + photoDataUri + '" alt="' + escapeHtml(section.headline || 'Front Page') + '">');
        var fpPhoto = findPhotoForSection(manifest, section.name);
        if (fpPhoto && fpPhoto.credit) {
          html.push('  <div class="photo-credit">' + escapeHtml(fpPhoto.credit) + '</div>');
        }
        html.push('</div>');
      }

      // Primary headline
      if (section.headline) {
        html.push('<div class="headline-primary">' + escapeHtml(section.headline) + '</div>');
      }
      if (section.articles.length > 0 && section.articles[0].subhead) {
        html.push('<div class="subhead">' + escapeHtml(section.articles[0].subhead) + '</div>');
      }
      if (section.byline) {
        html.push('<div class="byline">' + escapeHtml(section.byline) + '</div>');
      }

      // Front page body in 3 columns
      html.push('<div class="columns-3">');
      if (section.articles.length > 0) {
        html.push('<div class="article-body has-dropcap">');
        // Get body text after headline/subhead/byline
        var fpArticle = section.articles[0];
        var fpBody = fpArticle.text;
        var fpLines = fpBody.split('\n');
        var fpStart = 0;
        for (var f = 0; f < Math.min(fpLines.length, 10); f++) {
          var fl = fpLines[f].trim();
          // S235 G-PR7 — added `^# ` (h1) match so the canonical title doesn't
          // duplicate into the dropcap body.
          if (fl.match(/^#\s+/) || fl.match(/^###\s+/) || fl.match(/^\*\*.+\*\*$/) || fl.match(/^By\s+/)) {
            fpStart = f + 1;
          }
        }
        html.push(textToHtml(fpLines.slice(fpStart).join('\n')));
        html.push('</div>');
      }
      html.push('</div>');
      continue;
    }

    var sectionHtml = buildSectionHtml(section, photoDataUri, { manifest: manifest, sectionPhotos: sectionPhotos });
    if (sectionHtml) {
      html.push(sectionHtml);
    }
  }

  // Footer
  html.push('<div class="page-footer">');
  html.push('The Bay Tribune &mdash; Edition ' + escapeHtml(parsed.edition || '?') + ' &mdash; Oakland, California');
  html.push('</div>');

  html.push('</div>'); // page-wrapper
  html.push('</body>');
  html.push('</html>');

  return html.join('\n');
}

// ---------------------------------------------------------------------------
// PDF Renderer
// ---------------------------------------------------------------------------

async function renderPdf(htmlPath, pdfPath, options) {
  options = options || {};
  var puppeteer = require('puppeteer');

  console.log('Launching browser...');
  var browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  var page = await browser.newPage();

  // Load the HTML file
  var fileUrl = 'file://' + path.resolve(htmlPath);
  console.log('Loading: ' + fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for fonts to load
  await page.evaluateHandle('document.fonts.ready');

  // Generate PDF
  var pdfOptions = {
    path: pdfPath,
    printBackground: true,
    preferCSSPageSize: true
  };

  if (options.letterSize) {
    pdfOptions.format = 'Letter';
    pdfOptions.preferCSSPageSize = false;
  }

  console.log('Rendering PDF...');
  await page.pdf(pdfOptions);

  await browser.close();
  console.log('PDF saved: ' + pdfPath);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  var args = process.argv.slice(2);
  var preview = args.includes('--preview');
  var letterSize = args.includes('--letter');
  var noPhotos = args.includes('--no-photos');
  var type = parseType();
  var cycleFlag = parseCycleFlag();

  // First positional that isn't a flag value (skip --type/--cycle's value)
  var editionFile = null;
  for (var ai = 0; ai < args.length; ai++) {
    var a = args[ai];
    if (a.startsWith('--')) continue;
    var prev = args[ai - 1];
    if (prev === '--type' || prev === '--cycle') continue;
    editionFile = a;
    break;
  }

  if (!editionFile) {
    console.log('Usage: node scripts/generate-edition-pdf.js <source.txt> [--type <type>] [--cycle N] [--preview] [--letter] [--no-photos]');
    console.log('');
    console.log('  --type:        edition|interview|supplemental|dispatch|interview-transcript (default edition)');
    console.log('  --cycle N:     required when --type ≠ edition');
    console.log('  --preview      HTML only, skip PDF (for CSS iteration)');
    console.log('  --letter       8.5x11 instead of 11x17 tabloid');
    console.log('  --no-photos    Text-only layout');
    process.exit(1);
  }

  if (type !== 'edition' && cycleFlag === null) {
    console.error('[ERROR] --cycle is required for --type ' + type +
      ' (no fallback extraction for non-edition types).');
    process.exit(1);
  }

  var fullPath = path.resolve(editionFile);
  if (!fs.existsSync(fullPath)) {
    console.error('File not found: ' + fullPath);
    process.exit(1);
  }

  console.log('');
  console.log('=== Bay Tribune PDF Generator v1.1 ===');
  console.log('');

  // Parse edition
  var parsed = editionParser.parseEdition(fullPath);

  // Override slug/edition for non-edition types so output paths follow the
  // T1 contract. Edition default keeps the legacy parser-derived slug.
  if (type !== 'edition') {
    var slugSuffix = deriveNonEditionSlug(fullPath, type);
    parsed.edition = String(cycleFlag);
    parsed.slug = type + '_c' + cycleFlag + (slugSuffix ? '_' + slugSuffix : '');
  }

  var resolvedCycle = cycleFlag !== null ? cycleFlag : (parsed.edition || null);

  console.log('[METADATA] ' + JSON.stringify({
    type: type,
    cycle: resolvedCycle,
    slug: parsed.slug,
    source: path.basename(fullPath)
  }, null, 2));
  console.log('');

  console.log('Edition: ' + parsed.edition);
  console.log('Date: ' + parsed.date);
  console.log('Weather: ' + parsed.weather);
  console.log('Sections: ' + parsed.sections.length);
  console.log('');

  // Load photo manifest
  var photoDir = path.join(__dirname, '..', 'output', 'photos', parsed.slug || 'e' + parsed.edition);
  var manifestPath = path.join(photoDir, 'manifest.json');
  var manifest = null;

  if (!noPhotos && fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    // S197 BUNDLE-E (G-PR12): respect editorialFlag + dropped sidecars.
    // Pre-S197 the PDF generator read manifest.json and shipped every
    // listed photo to print, even ones the QA pipeline marked as
    // editorialFlag:true or dropped:true (3-strike auto-drop). Operator
    // had to manually edit the manifest to exclude them. Now the PDF
    // generator reads each photo's .meta.json sidecar and filters out
    // entries with `dropped: true` (silent skip) or `editorialFlag: true`
    // (skip with stderr WARN, unless --include-flagged is passed).
    var includeFlagged = process.argv.indexOf('--include-flagged') !== -1;
    var allPhotos = manifest.photos || [];
    var filteredPhotos = [];
    var droppedCount = 0;
    var flaggedCount = 0;
    for (var p = 0; p < allPhotos.length; p++) {
      var photo = allPhotos[p];
      var sidecar = path.join(photoDir, (photo.slug || photo.file.replace(/\.[^.]+$/, '')) + '.meta.json');
      var sidecarMeta = null;
      if (fs.existsSync(sidecar)) {
        try { sidecarMeta = JSON.parse(fs.readFileSync(sidecar, 'utf-8')); } catch (e) { sidecarMeta = null; }
      }
      if (sidecarMeta && sidecarMeta.dropped === true) {
        droppedCount++;
        console.log('  [DROPPED] ' + photo.section + ' -> ' + photo.file +
                    ' (reason: ' + (sidecarMeta.droppedReason || 'unspecified') + ')');
        continue;
      }
      if (sidecarMeta && sidecarMeta.editorialFlag === true && !includeFlagged) {
        flaggedCount++;
        console.error('  [FLAGGED] ' + photo.section + ' -> ' + photo.file +
                      ' (reason: ' + (sidecarMeta.editorialFlagReason || 'unspecified') +
                      ') — skipping. Pass --include-flagged to override.');
        continue;
      }
      filteredPhotos.push(photo);
    }
    manifest.photos = filteredPhotos;
    console.log('Photos found: ' + filteredPhotos.length +
                (droppedCount > 0 ? ' (' + droppedCount + ' dropped)' : '') +
                (flaggedCount > 0 ? ' (' + flaggedCount + ' editorial-flagged, skipped)' : ''));
    filteredPhotos.forEach(function(p) {
      console.log('  - ' + p.section + ' -> ' + p.file);
    });

    // G-PR16 (S215): inverse-pass warning. Pre-fix, sections that text-shipped
    // without a photo were silent — caller couldn't tell intentional skip
    // (text-only by editorial choice) from accidental gap (photo failed to
    // generate). Surface the unmatched section list so the operator decides.
    var photoSections = {};
    filteredPhotos.forEach(function(p) {
      if (p.section) photoSections[normalizeSectionId(p.section)] = true;
    });
    var META_SECTIONS = { 'ARTICLE TABLE': 1, 'NAMES INDEX': 1, 'CITIZEN USAGE LOG': 1,
      'STORYLINES UPDATED': 1, 'CONTINUITY NOTES': 1, 'BUSINESSES NAMED': 1,
      'COMING NEXT EDITION': 1, 'END EDITION': 1 };
    var missingPhotoSections = [];
    for (var ms = 0; ms < parsed.sections.length; ms++) {
      var sectionName = normalizeSectionId(parsed.sections[ms].name || '');
      if (!sectionName || META_SECTIONS[sectionName]) continue;
      if (!photoSections[sectionName]) missingPhotoSections.push(sectionName);
    }
    if (missingPhotoSections.length > 0) {
      console.log('Sections without photos: ' + missingPhotoSections.join(', ') +
                  ' (text-only — verify intentional)');
    }
  } else if (!noPhotos) {
    console.log('No photo manifest found at ' + manifestPath);
    console.log('Run generate-edition-photos.js first, or use --no-photos');
  } else {
    console.log('Photos: disabled (--no-photos)');
  }
  console.log('');

  // Build HTML
  var cssPath = path.join(__dirname, '..', 'templates', 'newspaper.css');
  var newspaperHtml = buildNewspaperHtml(parsed, {
    photoDir: photoDir,
    manifest: manifest,
    usePhotos: !noPhotos,
    cssPath: cssPath,
    letterSize: letterSize,
    type: type,
    cycle: resolvedCycle
  });

  // Photo parity check (S244 ES-1, G-PR-NEW4). Generator-side "Photos found: N"
  // counted manifest placements; the render silently dropped any beyond the
  // first per section. Count the <img> tags actually emitted and compare to the
  // live (filtered) manifest count so a future drop fails loud instead of
  // shipping a PDF that's quietly missing photos.
  if (!noPhotos && manifest && manifest.photos) {
    var renderedImgs = (newspaperHtml.match(/<img\b/g) || []).length;
    var expectedImgs = manifest.photos.length;
    if (renderedImgs === expectedImgs) {
      console.log('Photo parity: OK (' + renderedImgs + ' <img> = ' + expectedImgs + ' manifest placements)');
    } else {
      console.error('[PHOTO PARITY MISMATCH] rendered ' + renderedImgs + ' <img> but manifest has ' +
                    expectedImgs + ' live placement(s) — one or more photos were dropped at render. ' +
                    'Check findPhotosForSection coverage + per-section assignment.');
    }
  }

  // Save HTML
  var outputDir = path.join(__dirname, '..', 'output', 'pdfs');
  fs.mkdirSync(outputDir, { recursive: true });

  var fileSlug = parsed.slug || 'e' + parsed.edition;
  var htmlOutputPath = path.join(outputDir, fileSlug + '.html');
  fs.writeFileSync(htmlOutputPath, newspaperHtml);
  console.log('HTML saved: ' + htmlOutputPath);

  if (preview) {
    console.log('');
    console.log('Preview mode — open the HTML file in a browser to check layout.');
    console.log('Run without --preview to generate PDF.');
    return;
  }

  // Render PDF
  var pdfOutputPath = path.join(outputDir, 'bay_tribune_' + fileSlug + '.pdf');
  await renderPdf(htmlOutputPath, pdfOutputPath, { letterSize: letterSize });

  console.log('');
  console.log('=== Generation Complete ===');
  console.log('HTML: ' + htmlOutputPath);
  console.log('PDF:  ' + pdfOutputPath);

  // File size
  var stats = fs.statSync(pdfOutputPath);
  console.log('Size: ' + Math.round(stats.size / 1024) + ' KB');
  console.log('');
}

// S234 engine.25 G-PR6 — exports for unit testing of normalizeSectionId +
// findPhotoForSection. require.main guard keeps main() side-effect-free when
// required as a module.
module.exports = {
  normalizeSectionId: normalizeSectionId,
  findPhotoForSection: findPhotoForSection,
};

if (require.main === module) {
  main().catch(function(err) {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
