/**
 * ============================================================================
 * Bay Tribune Photo Generator v1.0
 * ============================================================================
 *
 * Generates photojournalistic images for Bay Tribune editions using AI.
 *
 * Photographers:
 *   DJ Hartley    — street documentary, candid, wide-angle, gritty Oakland
 *   Arman Gutiérrez — editorial/portrait, formal, clean, controlled lighting
 *
 * Provider: Together AI (FLUX.1 schnell — free tier)
 * Swap to fal.ai, Replicate, or OpenAI by changing the provider function.
 *
 * Usage:
 *   const { generatePhoto, savePhoto } = require('./lib/photoGenerator');
 *   const result = await generatePhoto({
 *     headline: 'Council Approves Baylight Bond',
 *     sceneDescription: 'Oakland City Council chamber during evening vote',
 *     neighborhood: 'Downtown',
 *     weather: 'overcast evening'
 *   }, { photographer: 'DJ Hartley' });
 *   await savePhoto(result, 'output/photos', 'e83_front_page.png');
 *
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ---------------------------------------------------------------------------
// Photographer Profiles
// ---------------------------------------------------------------------------

var PHOTOGRAPHERS = {
  'DJ Hartley': {
    style: 'street documentary photography, natural available light, candid moment captured mid-action, wide-angle lens, gritty urban texture, slight film grain, realistic skin tones, shot on Canon EOS R5 with 24mm f/1.4',
    beats: ['civic', 'culture', 'letters', 'front-page'],
    creditLine: 'DJ Hartley / Bay Tribune'
  },
  'Arman Gutiérrez': {
    style: 'editorial portrait photography, controlled directional lighting, formal composition, tack-sharp focus, clean uncluttered background, professional, warm color grading, shot on Hasselblad X2D 100C with 80mm f/1.9',
    beats: ['business', 'sports', 'chicago'],
    creditLine: 'Arman Gutiérrez / Bay Tribune'
  }
};

// Normalized lookup (handles accent variations like Gutierrez vs Gutiérrez)
var PHOTOGRAPHER_ALIASES = {
  'arman gutierrez': 'Arman Gutiérrez',
  'arman gutiérrez': 'Arman Gutiérrez',
  'dj hartley': 'DJ Hartley'
};

function resolvePhotographer(name) {
  if (PHOTOGRAPHERS[name]) return name;
  var key = name.toLowerCase().trim();
  return PHOTOGRAPHER_ALIASES[key] || 'DJ Hartley';
}

// ---------------------------------------------------------------------------
// Oakland Scene Library — grounding prompts in real places
// ---------------------------------------------------------------------------

var OAKLAND_SCENES = {
  'Downtown': 'downtown Oakland, City Hall, Frank Ogawa Plaza, high-rise office buildings',
  'Jack London Square': 'Jack London Square waterfront, restaurants, marina, evening lights on the estuary',
  'Temescal': 'Temescal neighborhood, Telegraph Avenue, local shops, tree-lined residential streets',
  'Fruitvale': 'Fruitvale Transit Village, International Blvd, Latino murals, BART station plaza',
  'Lake Merritt': 'Lake Merritt, walking path around the lake, downtown skyline reflected in water',
  'West Oakland': 'West Oakland, Victorian houses, BART overpass, industrial waterfront',
  'Rockridge': 'Rockridge neighborhood, College Avenue shops, Craftsman bungalows',
  'Chinatown': 'Oakland Chinatown, 8th Street, Asian grocery stores, lanterns, foot traffic',
  'Old Oakland': 'Old Oakland, Victorian row buildings, farmers market, Washington Street',
  'Coliseum': 'Oakland Coliseum area, wide parking lots, industrial East Oakland',
  'Grand Lake': 'Grand Lake neighborhood, Grand Lake Theatre marquee, Lakeshore Avenue',
  'Montclair': 'Montclair Village, hillside homes, small-town feel in the Oakland hills',
  'East Oakland': 'East Oakland residential streets, corner stores, flat grid neighborhoods',
  'Uptown': 'Uptown Oakland, Fox Theater, art deco buildings, restaurant row on Telegraph',
  'Piedmont Avenue': 'Piedmont Avenue, boutique shops, Fentons Creamery, neighborhood charm',
  'Adams Point': 'Adams Point near Lake Merritt, apartment buildings, lake views',
  'Dimond': 'Dimond District, Fruitvale Avenue, neighborhood park, local businesses'
};

// ---------------------------------------------------------------------------
// Prompt Engineering
// ---------------------------------------------------------------------------

/**
 * Build a photojournalistic prompt from article data + photographer style.
 *
 * @param {Object} article - Article context
 * @param {string} article.headline - Article headline
 * @param {string} article.sceneDescription - What the photo should show
 * @param {string} [article.neighborhood] - Oakland neighborhood
 * @param {string} [article.weather] - Weather/atmosphere
 * @param {string} [article.timeOfDay] - Time context
 * @param {string} [article.beat] - Desk beat (civic, sports, etc.)
 * @param {string} photographer - Photographer name
 * @returns {string} The complete image prompt
 */
function buildPhotoPrompt(article, photographer) {
  var profile = PHOTOGRAPHERS[photographer] || PHOTOGRAPHERS['DJ Hartley'];

  // Start with the core scene
  var parts = [];

  // Photojournalism framing
  parts.push('Award-winning photojournalism for a major metropolitan newspaper.');
  parts.push(profile.style + '.');

  // The scene itself — this is the most important part
  if (article.sceneDescription) {
    parts.push(article.sceneDescription + '.');
  }

  // Ground in Oakland
  if (article.neighborhood && OAKLAND_SCENES[article.neighborhood]) {
    parts.push('Setting: ' + OAKLAND_SCENES[article.neighborhood] + '.');
  } else if (article.neighborhood) {
    parts.push('Setting: ' + article.neighborhood + ', Oakland, California.');
  } else {
    parts.push('Setting: Oakland, California.');
  }

  // Atmosphere
  if (article.weather) parts.push(article.weather + '.');
  if (article.timeOfDay) parts.push(article.timeOfDay + '.');

  // Quality modifiers — these matter a lot for FLUX
  parts.push('Ultra realistic, editorial quality, newspaper wire photograph.');
  parts.push('No text overlays, no watermarks, no logos, no AI artifacts.');
  parts.push('Natural imperfections, authentic moment, not posed or staged.');

  return parts.join(' ');
}

/**
 * Extract a scene description from article text using simple keyword analysis.
 * No LLM call — just pattern matching against common journalistic scenes.
 *
 * @param {string} text - Article body text (first ~500 chars is enough)
 * @param {string} headline - Article headline
 * @param {string} beat - Desk beat
 * @returns {string} A scene description for the image prompt
 */
function extractScene(text, headline, beat) {
  var lower = (text + ' ' + headline).toLowerCase();
  var scenes = [];

  // Civic scenes
  if (lower.includes('council') || lower.includes('city hall') || lower.includes('vote') || lower.includes('chamber')) {
    scenes.push('Oakland City Council chamber during a public meeting, council members at curved dais, packed gallery of citizens in folding chairs, institutional fluorescent lighting, wood-paneled walls');
  }
  if (lower.includes('protest') || lower.includes('rally') || lower.includes('march')) {
    scenes.push('Street protest in Oakland, diverse crowd holding handmade signs, city buildings in background');
  }
  if (lower.includes('groundbreaking') || lower.includes('construction') || lower.includes('development')) {
    scenes.push('Construction site with cranes and workers, city skyline visible, hard hats and high-vis vests');
  }

  // Sports scenes
  if (lower.includes('stadium') || lower.includes('coliseum') || lower.includes('ballpark') || lower.includes('baseball') ||
      lower.includes("a's") || lower.includes('war ') || lower.includes('batting') || lower.includes('pitcher') ||
      lower.includes('baseman') || lower.includes('inning') || lower.includes('home run')) {
    scenes.push('Baseball stadium during a game, players on field, crowd in the stands, green grass diamond under lights, warm summer evening atmosphere, dugout visible');
  }
  if (lower.includes('basketball') || lower.includes('warriors') || lower.includes('arena') || lower.includes('bulls') ||
      lower.includes('nba') || lower.includes('court')) {
    scenes.push('NBA basketball arena during a game, players on court, crowd energy, arena lighting');
  }

  // Community scenes
  if (lower.includes('first friday')) {
    scenes.push('First Friday art walk in Oakland, crowds on Telegraph Avenue at dusk, gallery lights spilling onto sidewalks, food vendors, live music');
  }
  if (lower.includes('farmers market') || lower.includes('market')) {
    scenes.push('Outdoor farmers market with produce stands and shoppers, morning light, colorful vegetables');
  }
  if (lower.includes('church') || lower.includes('faith') || lower.includes('congregation')) {
    scenes.push('Community gathering at a neighborhood church, warm interior light through stained glass, congregation');
  }
  if (lower.includes('restaurant') || lower.includes('cafe') || lower.includes('food')) {
    scenes.push('Local Oakland restaurant interior, diners at tables, warm ambient lighting, neighborhood character');
  }

  // Business scenes
  if (lower.includes('small business') || lower.includes('storefront') || lower.includes('shop owner')) {
    scenes.push('Small business owner in their Oakland storefront, shelves stocked, pride of ownership visible');
  }
  if (lower.includes('economy') || lower.includes('economic') || lower.includes('jobs') || lower.includes('employment')) {
    scenes.push('Oakland commercial district street scene, mix of open and closed businesses, pedestrians, everyday economic life');
  }

  // Waterfront
  if (lower.includes('waterfront') || lower.includes('marina') || lower.includes('estuary') || lower.includes('jack london')) {
    scenes.push('Oakland waterfront at Jack London Square, boats in the marina, city lights reflecting on water');
  }

  // Transit
  if (lower.includes('bart') || lower.includes('transit') || lower.includes('bus') || lower.includes('commut')) {
    scenes.push('BART station platform in Oakland, commuters waiting, train approaching, urban transit infrastructure');
  }

  // Lake Merritt
  if (lower.includes('lake merritt') || lower.includes('the lake')) {
    scenes.push('Lake Merritt at golden hour, joggers and families on the path, downtown skyline across the water');
  }

  // Crime / Safety
  if (lower.includes('crime') || lower.includes('police') || lower.includes('shooting') || lower.includes('safety')) {
    scenes.push('Oakland street corner with police tape and patrol cars, neighbors watching from porches, evening light');
  }

  // Health
  if (lower.includes('hospital') || lower.includes('clinic') || lower.includes('health center') || lower.includes('medical')) {
    scenes.push('Community health clinic waiting room, patients and staff, medical posters on walls, fluorescent lighting');
  }

  // Fallback by beat
  if (scenes.length === 0) {
    switch (beat) {
      case 'civic':
        scenes.push('Oakland City Hall exterior at dusk, lights on inside, civic architecture');
        break;
      case 'sports':
        scenes.push('Oakland sports venue exterior, fans approaching, game day energy');
        break;
      case 'business':
        scenes.push('Oakland commercial district, storefronts, everyday business activity');
        break;
      case 'culture':
        scenes.push('Oakland neighborhood street life, murals, diverse pedestrians, local character');
        break;
      case 'chicago':
        scenes.push('Chicago cityscape, downtown buildings, urban Midwest atmosphere');
        break;
      default:
        scenes.push('Oakland, California, urban street scene, diverse community, everyday life');
    }
  }

  // Use the first (most specific) scene match
  return scenes[0];
}

// ---------------------------------------------------------------------------
// Together AI Provider (FLUX.1 schnell — free tier)
// ---------------------------------------------------------------------------

/**
 * Generate an image using Together AI's FLUX.1 schnell model.
 *
 * @param {string} prompt - The image generation prompt
 * @param {Object} options - Generation options
 * @param {number} [options.width=1344] - Image width
 * @param {number} [options.height=768] - Image height
 * @param {number} [options.steps=4] - Inference steps (schnell uses 1-4)
 * @returns {Promise<Object>} { url, b64, model, provider }
 */
function generateWithTogether(prompt, options) {
  var apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) throw new Error('TOGETHER_API_KEY not set in .env — get one free at https://api.together.xyz');

  var body = JSON.stringify({
    model: 'black-forest-labs/FLUX.1-schnell',
    prompt: prompt,
    width: options.width || 1344,
    height: options.height || 768,
    steps: options.steps || 4,
    n: 1,
    response_format: 'b64_json'
  });

  return new Promise(function(resolve, reject) {
    var req = https.request({
      hostname: 'api.together.xyz',
      path: '/v1/images/generations',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      }
    }, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try {
          var json = JSON.parse(data);
          if (json.error) {
            return reject(new Error(json.error.message || JSON.stringify(json.error)));
          }
          if (json.data && json.data[0]) {
            resolve({
              url: json.data[0].url || null,
              b64: json.data[0].b64_json || null,
              model: 'FLUX.1-schnell',
              provider: 'together'
            });
          } else {
            reject(new Error('Unexpected API response: ' + data.substring(0, 300)));
          }
        } catch (e) {
          reject(new Error('JSON parse error: ' + e.message + ' | Response: ' + data.substring(0, 300)));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Generate a photo for an article.
 *
 * @param {Object} article - Article context (headline, sceneDescription, neighborhood, etc.)
 * @param {Object} [options] - Options
 * @param {string} [options.photographer='DJ Hartley'] - Photographer name
 * @param {number} [options.width=1344] - Image width
 * @param {number} [options.height=768] - Image height
 * @returns {Promise<Object>} Generation result with image data + metadata
 */
async function generatePhoto(article, options) {
  options = options || {};
  var photographer = resolvePhotographer(options.photographer || 'DJ Hartley');
  var profile = PHOTOGRAPHERS[photographer] || PHOTOGRAPHERS['DJ Hartley'];

  // Auto-extract scene if not provided
  if (!article.sceneDescription && article.text) {
    article.sceneDescription = extractScene(
      article.text.substring(0, 800),
      article.headline || '',
      article.beat || ''
    );
  }

  var prompt = buildPhotoPrompt(article, photographer);

  console.log('  Photographer: ' + photographer);
  console.log('  Prompt: ' + prompt.substring(0, 120) + '...');

  var result = await generateWithTogether(prompt, {
    width: options.width || 1344,
    height: options.height || 768,
    steps: options.steps || 4
  });

  return {
    url: result.url,
    b64: result.b64,
    model: result.model,
    provider: result.provider,
    prompt: prompt,
    photographer: photographer,
    creditLine: profile.creditLine,
    headline: article.headline || 'untitled'
  };
}

/**
 * Save a generated photo to disk.
 *
 * @param {Object} result - Result from generatePhoto()
 * @param {string} outputDir - Directory to save to
 * @param {string} filename - Filename (e.g., 'e83_front_page.png')
 * @returns {Promise<string>} Path to saved file
 */
async function savePhoto(result, outputDir, filename) {
  fs.mkdirSync(outputDir, { recursive: true });
  var filePath = path.join(outputDir, filename);

  if (result.b64) {
    var buffer = Buffer.from(result.b64, 'base64');
    fs.writeFileSync(filePath, buffer);
    console.log('  Saved: ' + filePath + ' (' + Math.round(buffer.length / 1024) + ' KB)');
    return filePath;
  }

  if (result.url) {
    return new Promise(function(resolve, reject) {
      var download = function(url) {
        var mod = url.startsWith('https') ? https : require('http');
        mod.get(url, function(res) {
          if (res.statusCode === 301 || res.statusCode === 302) {
            return download(res.headers.location);
          }
          var chunks = [];
          res.on('data', function(c) { chunks.push(c); });
          res.on('end', function() {
            var buf = Buffer.concat(chunks);
            fs.writeFileSync(filePath, buf);
            console.log('  Saved: ' + filePath + ' (' + Math.round(buf.length / 1024) + ' KB)');
            resolve(filePath);
          });
          res.on('error', reject);
        }).on('error', reject);
      };
      download(result.url);
    });
  }

  throw new Error('No image data in result (no b64 or url)');
}

// ---------------------------------------------------------------------------
// Auto Photo Assignment — Mags' Editorial Logic
// ---------------------------------------------------------------------------

/**
 * Automatically assign photos to sections based on editorial judgment.
 * This is MY call as editor — not every article needs a photo.
 *
 * Rules:
 *   - Front Page: ALWAYS (DJ Hartley — lead story, civic event)
 *   - Culture/Seasonal: ALWAYS (Arman for portraits, DJ for events/street)
 *   - Sports feature: YES if there's a dedicated feature (DJ for game action)
 *   - Chicago feature: YES if there's a feature (Arman for formal/editorial)
 *   - Civic Affairs: YES if the lead is a major story (DJ for civic)
 *   - Business: Only for major features (Arman for business portraits)
 *   - Editor's Desk, Opinion, Letters, Quick Takes: NO photos
 *   - Meta sections (Article Table, Storylines, etc.): NO photos
 *   - Max per edition: 6 photos
 *
 * @param {Object[]} sections - Parsed sections from editionParser
 * @returns {Object[]} Sections that should get photos, with photographer assigned
 */
function assignPhotos(sections) {
  var assignments = [];

  // Priority order — highest editorial priority first
  var priorities = [
    { beat: 'front-page', always: true, photographer: 'DJ Hartley', reason: 'lead story' },
    { beat: 'culture',    always: true, photographer: null,         reason: 'culture feature' },
    { beat: 'sports',     always: false, photographer: 'DJ Hartley', reason: 'sports feature' },
    { beat: 'chicago',    always: false, photographer: 'Arman Gutiérrez', reason: 'chicago feature' },
    { beat: 'civic',      always: false, photographer: 'DJ Hartley', reason: 'civic story' },
    { beat: 'business',   always: false, photographer: 'Arman Gutiérrez', reason: 'business feature' }
  ];

  var MAX_PHOTOS = 6;

  for (var p = 0; p < priorities.length && assignments.length < MAX_PHOTOS; p++) {
    var rule = priorities[p];

    for (var s = 0; s < sections.length; s++) {
      if (assignments.length >= MAX_PHOTOS) break;

      var section = sections[s];
      if (section.beat !== rule.beat) continue;

      // Skip if already assigned
      var alreadyAssigned = assignments.some(function(a) { return a.sectionIndex === s; });
      if (alreadyAssigned) continue;

      // For non-always sections, check if there's substantial content
      if (!rule.always) {
        // Need at least one article with a headline and meaningful text
        var hasFeature = section.articles && section.articles.some(function(a) {
          return a.headline && a.text && a.text.length > 500;
        });
        if (!hasFeature) continue;
      }

      // Determine photographer for culture based on content
      var photographer = rule.photographer;
      if (!photographer && rule.beat === 'culture') {
        // Events/street scenes → DJ Hartley; portraits/formal → Arman
        var lowerText = (section.text || '').toLowerCase();
        if (lowerText.includes('first friday') || lowerText.includes('festival') ||
            lowerText.includes('street') || lowerText.includes('walk') ||
            lowerText.includes('market') || lowerText.includes('crowd')) {
          photographer = 'Arman Gutiérrez';
        } else {
          photographer = 'DJ Hartley';
        }
      }

      assignments.push({
        sectionIndex: s,
        section: section,
        photographer: photographer,
        reason: rule.reason,
        beat: rule.beat
      });
    }
  }

  return assignments;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  generatePhoto: generatePhoto,
  savePhoto: savePhoto,
  buildPhotoPrompt: buildPhotoPrompt,
  extractScene: extractScene,
  resolvePhotographer: resolvePhotographer,
  assignPhotos: assignPhotos,
  PHOTOGRAPHERS: PHOTOGRAPHERS,
  OAKLAND_SCENES: OAKLAND_SCENES
};
