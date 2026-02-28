#!/usr/bin/env node
/**
 * renderPodcast.js — Renders a podcast transcript to audio via Podcastfy
 *
 * Usage: node scripts/renderPodcast.js <cycle> [format]
 *   cycle  — cycle number (e.g., 84)
 *   format — show format: morning_edition (default), postgame, debrief
 *
 * Reads transcript from: output/podcasts/c{cycle}_transcript.txt
 * Writes audio to:       output/podcasts/c{cycle}_{format}.mp3
 * Voice config from:     config/podcast_voices.yaml
 *
 * Requires: Podcastfy installed in .venv/podcastfy
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VENV_PYTHON = path.join(ROOT, '.venv', 'podcastfy', 'bin', 'python');
const TRANSCRIPT_DIR = path.join(ROOT, 'output', 'podcasts');
const CONFIG_PATH = path.join(ROOT, 'config', 'podcast_voices.yaml');

// Parse args
const cycle = process.argv[2];
const format = process.argv[3] || 'morning_edition';

if (!cycle) {
  console.error('Usage: node scripts/renderPodcast.js <cycle> [format]');
  console.error('  format: morning_edition (default), postgame, debrief');
  process.exit(1);
}

const transcriptPath = path.join(TRANSCRIPT_DIR, `c${cycle}_transcript.txt`);
const outputPath = path.join(TRANSCRIPT_DIR, `c${cycle}_${format}.mp3`);

// Verify transcript exists
if (!fs.existsSync(transcriptPath)) {
  console.error(`Transcript not found: ${transcriptPath}`);
  console.error('Run the podcast-desk agent first to generate the transcript.');
  process.exit(1);
}

// Verify venv exists
if (!fs.existsSync(VENV_PYTHON)) {
  console.error(`Podcastfy venv not found at: ${VENV_PYTHON}`);
  console.error('Run: python3 -m venv .venv/podcastfy && .venv/podcastfy/bin/pip install podcastfy');
  process.exit(1);
}

// Read transcript to verify format
const transcript = fs.readFileSync(transcriptPath, 'utf-8');
if (!transcript.includes('<Person1>') || !transcript.includes('<Person2>')) {
  console.error('Transcript does not contain <Person1>/<Person2> tags.');
  console.error('The podcast-desk agent must produce Podcastfy-format XML dialogue.');
  process.exit(1);
}

const exchangeCount = (transcript.match(/<Person[12]>/g) || []).length;
console.log(`Transcript loaded: ${exchangeCount} exchanges (~${Math.round(exchangeCount * 0.25)} minutes)`);

// Build the Python render command
// Uses Podcastfy's transcript_file mode — skips LLM, goes straight to TTS
const pythonScript = `
import os
import sys
import yaml

# Set output directory
os.environ.setdefault('PODCAST_OUTPUT_DIR', '${TRANSCRIPT_DIR}')

# Pass through API keys from Node env if available
for key in ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY', 'ELEVENLABS_API_KEY']:
    val = os.environ.get(key, '')
    if val:
        os.environ[key] = val

from podcastfy.client import generate_podcast

# Load voice config
config_path = '${CONFIG_PATH}'
format_name = '${format}'

conversation_config = {}
if os.path.exists(config_path):
    with open(config_path) as f:
        all_config = yaml.safe_load(f)
    if format_name in all_config:
        fmt = all_config[format_name]
        conversation_config = {
            'text_to_speech': {
                'default_tts_model': fmt.get('tts_model', 'edge'),
                fmt.get('tts_model', 'edge'): {
                    'default_voices': fmt.get('voices', {})
                },
                'output_directories': {
                    'audio': '${TRANSCRIPT_DIR}',
                    'transcripts': '${TRANSCRIPT_DIR}'
                }
            }
        }

try:
    audio_file = generate_podcast(
        transcript_file='${transcriptPath}',
        tts_model=conversation_config.get('text_to_speech', {}).get('default_tts_model', 'edge'),
        conversation_config=conversation_config if conversation_config else None
    )
    print(f'AUDIO_OUTPUT:{audio_file}')
except Exception as e:
    print(f'ERROR:{e}', file=sys.stderr)
    sys.exit(1)
`;

console.log(`Rendering audio with format: ${format}`);
console.log('TTS engine starting...');

// Write Python script to a temp file to avoid shell escaping issues
const os = require('os');
const tmpScript = path.join(os.tmpdir(), `podcastfy_render_${cycle}.py`);
fs.writeFileSync(tmpScript, pythonScript);

try {
  const result = execSync(
    `${VENV_PYTHON} "${tmpScript}"`,
    {
      encoding: 'utf-8',
      timeout: 300000, // 5 minute timeout
      env: { ...process.env },
      cwd: ROOT
    }
  );

  // Extract output path from Python
  const audioMatch = result.match(/AUDIO_OUTPUT:(.+)/);
  if (audioMatch) {
    const generatedPath = audioMatch[1].trim();

    // Move to our expected output path if different
    if (generatedPath !== outputPath && fs.existsSync(generatedPath)) {
      fs.copyFileSync(generatedPath, outputPath);
      console.log(`Audio saved to: ${outputPath}`);
    } else if (fs.existsSync(generatedPath)) {
      console.log(`Audio saved to: ${generatedPath}`);
    }

    // Report file size
    const stats = fs.statSync(fs.existsSync(outputPath) ? outputPath : generatedPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
    console.log(`File size: ${sizeMB} MB`);
    console.log('Done.');
  } else {
    console.log('Podcastfy output:', result);
  }
} catch (err) {
  console.error('Audio rendering failed:');
  console.error(err.stderr || err.message);
  process.exit(1);
} finally {
  // Clean up temp script
  try { fs.unlinkSync(tmpScript); } catch (_) {}
}
