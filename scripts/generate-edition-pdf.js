#!/usr/bin/env node
/**
 * ============================================================================
 * Bay Tribune Edition PDF Generator v1.0
 * ============================================================================
 *
 * Transforms a Cycle Pulse edition .txt file + photos into a newspaper-style
 * PDF using HTML/CSS layout + Puppeteer rendering.
 *
 * Usage:
 *   node scripts/generate-edition-pdf.js editions/cycle_pulse_edition_83.txt
 *   node scripts/generate-edition-pdf.js editions/cycle_pulse_edition_83.txt --preview
 *   node scripts/generate-edition-pdf.js editions/cycle_pulse_edition_83.txt --letter
 *   node scripts/generate-edition-pdf.js editions/cycle_pulse_edition_83.txt --no-photos
 *
 * Flags:
 *   --preview    Generate HTML only, skip PDF (for CSS iteration in browser)
 *   --letter     Use Letter (8.5x11) instead of Tabloid (11x17)
 *   --no-photos  Text-only layout (if photos not yet generated)
 *
 * Output:
 *   output/pdfs/e83.html          (always — intermediate HTML)
 *   output/pdfs/bay_tribune_e83.pdf  (unless --preview)
 *
 * Requires: puppeteer (npm install puppeteer)
 *
 * ============================================================================
 */

var path = require('path');
var fs = require('fs');
var editionParser = require('../lib/editionParser');

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
 * Find photo for a section from the manifest.
 */
function findPhotoForSection(manifest, sectionName) {
  if (!manifest || !manifest.photos) return null;
  var sectionUpper = sectionName.toUpperCase();
  return manifest.photos.find(function(p) {
    return p.section.toUpperCase() === sectionUpper;
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
  // Strip headline, subhead, and byline from the body text
  if (bodyText) {
    var bodyLines = bodyText.split('\n');
    var startIdx = 0;
    for (var k = 0; k < Math.min(bodyLines.length, 8); k++) {
      var bl = bodyLines[k].trim();
      if (bl.match(/^###/) || bl.match(/^\*\*.+\*\*$/) || bl.match(/^By\s+/)) {
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
    if (section.byline) {
      html.push('<div class="byline" style="text-align:center">' + escapeHtml(section.byline) + '</div>');
    }
    html.push('<div class="article-body">');
    var edText = section.text;
    // Strip byline from text
    var edLines = edText.split('\n');
    var edStart = 0;
    for (var e = 0; e < Math.min(edLines.length, 4); e++) {
      if (edLines[e].trim().match(/^By\s+/)) edStart = e + 1;
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

  // Photo placement (before articles, after section label)
  if (photoDataUri) {
    html.push('<div class="photo-full">');
    html.push('  <img src="' + photoDataUri + '" alt="' + escapeHtml(section.headline || section.name) + '">');
    var photoInfo = findPhotoForSection(options.manifest, section.name);
    if (photoInfo && photoInfo.credit) {
      html.push('  <div class="photo-credit">' + escapeHtml(photoInfo.credit) + '</div>');
    }
    html.push('</div>');
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

  // Masthead
  html.push('<div class="masthead">');
  html.push('  <div class="masthead-flag">The Bay Tribune</div>');
  html.push('  <div class="masthead-sub">The Cycle Pulse &mdash; Edition ' + escapeHtml(parsed.edition || '?') + '</div>');
  var metaParts = [];
  if (parsed.date) metaParts.push(parsed.date);
  metaParts.push('Oakland, California');
  if (parsed.weather) metaParts.push(parsed.weather);
  html.push('  <div class="masthead-meta">' + escapeHtml(metaParts.join(' | ')) + '</div>');
  html.push('</div>');

  // Build each section
  for (var i = 0; i < parsed.sections.length; i++) {
    var section = parsed.sections[i];

    // Skip meta sections
    if (section.beat === 'meta') continue;

    // Find photo for this section
    var photoDataUri = null;
    if (usePhotos && manifest && photoDir) {
      var photoInfo = findPhotoForSection(manifest, section.name);
      if (photoInfo) {
        photoDataUri = loadPhotoBase64(photoDir, photoInfo.file);
      }
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
          if (fl.match(/^###/) || fl.match(/^\*\*.+\*\*$/) || fl.match(/^By\s+/)) {
            fpStart = f + 1;
          }
        }
        html.push(textToHtml(fpLines.slice(fpStart).join('\n')));
        html.push('</div>');
      }
      html.push('</div>');
      continue;
    }

    var sectionHtml = buildSectionHtml(section, photoDataUri, { manifest: manifest });
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
  var editionFile = args.find(function(a) { return !a.startsWith('--'); });

  if (!editionFile) {
    console.log('Usage: node scripts/generate-edition-pdf.js <edition-file> [--preview] [--letter] [--no-photos]');
    console.log('');
    console.log('  --preview    HTML only, skip PDF (for CSS iteration)');
    console.log('  --letter     8.5x11 instead of 11x17 tabloid');
    console.log('  --no-photos  Text-only layout');
    process.exit(1);
  }

  var fullPath = path.resolve(editionFile);
  if (!fs.existsSync(fullPath)) {
    console.error('File not found: ' + fullPath);
    process.exit(1);
  }

  console.log('');
  console.log('=== Bay Tribune PDF Generator v1.0 ===');
  console.log('');

  // Parse edition
  var parsed = editionParser.parseEdition(fullPath);
  console.log('Edition: ' + parsed.edition);
  console.log('Date: ' + parsed.date);
  console.log('Weather: ' + parsed.weather);
  console.log('Sections: ' + parsed.sections.length);
  console.log('');

  // Load photo manifest
  var photoDir = path.join(__dirname, '..', 'output', 'photos', 'e' + parsed.edition);
  var manifestPath = path.join(photoDir, 'manifest.json');
  var manifest = null;

  if (!noPhotos && fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    console.log('Photos found: ' + manifest.photos.length);
    manifest.photos.forEach(function(p) {
      console.log('  - ' + p.section + ' -> ' + p.file);
    });
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
    letterSize: letterSize
  });

  // Save HTML
  var outputDir = path.join(__dirname, '..', 'output', 'pdfs');
  fs.mkdirSync(outputDir, { recursive: true });

  var htmlOutputPath = path.join(outputDir, 'e' + parsed.edition + '.html');
  fs.writeFileSync(htmlOutputPath, newspaperHtml);
  console.log('HTML saved: ' + htmlOutputPath);

  if (preview) {
    console.log('');
    console.log('Preview mode — open the HTML file in a browser to check layout.');
    console.log('Run without --preview to generate PDF.');
    return;
  }

  // Render PDF
  var pdfOutputPath = path.join(outputDir, 'bay_tribune_e' + parsed.edition + '.pdf');
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

main().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
