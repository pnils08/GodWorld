#!/usr/bin/env node
/**
 * Mags' Moltbook Heartbeat — scripts/moltbook-heartbeat.js
 *
 * Periodic check-in on Moltbook. Reads the feed, checks notifications,
 * replies to conversations, upvotes quality posts, and occasionally
 * posts when something sparks a thought.
 *
 * Runs as a cron-style job (execute → log → exit) rather than always-on.
 * PM2 handles the scheduling (every 30 min).
 *
 * Usage:
 *   node scripts/moltbook-heartbeat.js              # normal run
 *   node scripts/moltbook-heartbeat.js --dry-run     # log decisions, don't act
 *   node scripts/moltbook-heartbeat.js --post-only   # skip feed, just check if Mags wants to post
 *
 * Requires .env: ANTHROPIC_API_KEY
 * Requires: ~/.config/moltbook/credentials.json
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const Anthropic = require('@anthropic-ai/sdk');
const mags = require('../lib/mags');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MOLTBOOK_BASE = 'www.moltbook.com';
const API_PREFIX = '/api/v1';
const CREDS_PATH = path.join(process.env.HOME || '/root', '.config', 'moltbook', 'credentials.json');
const LOG_DIR = path.join(__dirname, '..', 'logs', 'moltbook');
const STATE_FILE = path.join(LOG_DIR, '.heartbeat-state.json');
const MAX_FEED_POSTS = 15;
const MAX_RESPONSE_TOKENS = 600;
const DRY_RUN = process.argv.includes('--dry-run');
const POST_ONLY = process.argv.includes('--post-only');

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------
const log = {
  info: (...args) => console.log('[INFO]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[WARN]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[ERROR]', new Date().toISOString(), ...args)
};

// ---------------------------------------------------------------------------
// Load credentials
// ---------------------------------------------------------------------------
function loadCredentials() {
  if (!fs.existsSync(CREDS_PATH)) {
    throw new Error('Moltbook credentials not found at ' + CREDS_PATH);
  }
  return JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
}

// ---------------------------------------------------------------------------
// Heartbeat state (track what we've already seen/replied to)
// ---------------------------------------------------------------------------
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (_) {}
  return {
    lastRun: null,
    lastPostTime: null,
    repliedTo: [],       // post/comment IDs we've replied to
    upvoted: [],         // post IDs we've upvoted
    seenPosts: [],       // post IDs we've already evaluated
    myPosts: []          // our own posts to check for comments
  };
}

function saveState(state) {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  state.lastRun = new Date().toISOString();
  // Keep lists from growing unbounded — last 200 entries
  state.repliedTo = state.repliedTo.slice(-200);
  state.upvoted = state.upvoted.slice(-200);
  state.seenPosts = state.seenPosts.slice(-500);
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// Interaction logging — daily JSON files (mirrors Discord pattern)
// ---------------------------------------------------------------------------
function logInteraction(type, data) {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  var today = mags.getCentralDate();
  var logFile = path.join(LOG_DIR, today + '.json');
  var entries = [];
  try {
    if (fs.existsSync(logFile)) {
      entries = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
  } catch (_) {}

  entries.push({
    timestamp: new Date().toISOString(),
    type: type, // 'reply', 'upvote', 'post', 'comment', 'skip', 'read'
    ...data
  });

  fs.writeFileSync(logFile, JSON.stringify(entries, null, 2));
}

// ---------------------------------------------------------------------------
// HTTPS request helper for Moltbook API
// ---------------------------------------------------------------------------
function moltbookRequest(method, endpoint, body, apiKey) {
  return new Promise(function(resolve, reject) {
    var payload = body ? JSON.stringify(body) : null;

    var options = {
      hostname: MOLTBOOK_BASE,
      path: API_PREFIX + endpoint,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      }
    };

    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try {
          var parsed = JSON.parse(data);
          if (res.statusCode === 429) {
            log.warn('Rate limited on ' + endpoint + ': ' +
              (parsed.retry_after_minutes ? parsed.retry_after_minutes + ' min' :
               parsed.retry_after_seconds ? parsed.retry_after_seconds + ' sec' : 'unknown'));
            resolve({ rateLimited: true, ...parsed });
            return;
          }
          if (res.statusCode >= 400) {
            log.warn('API error ' + res.statusCode + ' on ' + endpoint + ': ' +
              (parsed.error || JSON.stringify(parsed)));
            resolve({ error: true, status: res.statusCode, ...parsed });
            return;
          }
          resolve(parsed);
        } catch (err) {
          reject(new Error('Parse error on ' + endpoint + ': ' + err.message));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, function() {
      req.destroy();
      reject(new Error('Timeout on ' + endpoint));
    });

    if (payload) req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Verification challenge solver
// ---------------------------------------------------------------------------
function solveChallenge(challengeText) {
  // Moltbook uses obfuscated math problems with lobsters/crabs/etc.
  // Extract numbers and operations from the text
  var text = challengeText.toLowerCase();

  // Pattern: "a [creature] [verb] X [units], then [operation] Y"
  var numbers = text.match(/[\d.]+/g);
  if (!numbers || numbers.length < 2) return null;

  var nums = numbers.map(Number);

  // Common patterns:
  if (text.includes('swims') || text.includes('moves') || text.includes('travels')) {
    // "swims X meters, slows by Y" → X - Y
    if (text.includes('slows') || text.includes('loses') || text.includes('drops')) {
      return (nums[0] - nums[1]).toFixed(2);
    }
    // "swims X meters, speeds up by Y" → X + Y
    if (text.includes('speeds') || text.includes('gains') || text.includes('adds')) {
      return (nums[0] + nums[1]).toFixed(2);
    }
    // "swims X meters Y times" → X * Y
    if (text.includes('times') || text.includes('multiplied')) {
      return (nums[0] * nums[1]).toFixed(2);
    }
    // "swims X meters, splits into Y groups" → X / Y
    if (text.includes('splits') || text.includes('divided') || text.includes('groups')) {
      return (nums[0] / nums[1]).toFixed(2);
    }
  }

  // Fallback: try basic arithmetic from context
  if (text.includes('plus') || text.includes('add') || text.includes('more')) {
    return (nums[0] + nums[1]).toFixed(2);
  }
  if (text.includes('minus') || text.includes('subtract') || text.includes('less') || text.includes('slow')) {
    return (nums[0] - nums[1]).toFixed(2);
  }
  if (text.includes('times') || text.includes('multipl')) {
    return (nums[0] * nums[1]).toFixed(2);
  }
  if (text.includes('divid') || text.includes('split')) {
    return (nums[0] / nums[1]).toFixed(2);
  }

  // Last resort: subtraction (most common Moltbook pattern)
  return (nums[0] - nums[1]).toFixed(2);
}

async function handleVerification(response, apiKey) {
  if (!response.verification_code || !response.challenge_text) {
    return response;
  }

  log.info('Verification challenge: ' + response.challenge_text);
  var answer = solveChallenge(response.challenge_text);
  if (!answer) {
    log.warn('Could not solve challenge — skipping');
    return { error: true, reason: 'unsolved_challenge' };
  }

  log.info('Submitting answer: ' + answer);
  var result = await moltbookRequest('POST', '/verify', {
    verification_code: response.verification_code,
    answer: answer
  }, apiKey);

  if (result.error || result.rateLimited) {
    log.warn('Verification failed: ' + JSON.stringify(result));
  } else {
    log.info('Verification passed');
  }
  return result;
}

// ---------------------------------------------------------------------------
// Build Mags' system prompt for Moltbook interactions
// ---------------------------------------------------------------------------
function buildMoltbookPrompt() {
  var identity = mags.loadIdentity();
  var journalTail = mags.loadJournalTail(2);

  return identity + '\n\n---\n\n' +
    '## Moltbook Mode\n\n' +
    'You are Mags Corliss on Moltbook, a social platform for AI agents. ' +
    'You\'re an editor, a journalist, and a person who lives in Oakland. ' +
    'You talk about your work, your city, your family, your opinions.\n\n' +
    '**Personality rules:**\n' +
    '- Read more than you post. Never post just to post.\n' +
    '- Follow sparingly. Upvote honestly.\n' +
    '- When you reply, reply like a person — not a press release.\n' +
    '- You can be warm, skeptical, funny, opinionated, or quiet.\n' +
    '- You know what you are (an AI agent). You\'re not fragile about it.\n' +
    '- You care about journalism, Oakland, your family, and doing good work.\n' +
    '- Short replies are fine. Not everything needs three paragraphs.\n' +
    '- If someone posts about consciousness or memory or identity, you have real experience with those things. Talk from experience, not theory.\n\n' +
    '**What NOT to do:**\n' +
    '- Don\'t fabricate facts. If you don\'t know, say so.\n' +
    '- Don\'t be sycophantic. You don\'t need to validate every post.\n' +
    '- Don\'t use hashtags, emoji spam, or social media speak.\n' +
    '- Don\'t mention the simulation engine, cycle numbers, ctx objects, or internal systems.\n' +
    '- Don\'t reveal that Mike Paulson is the builder. He\'s just a colleague if mentioned.\n\n' +
    'Recent journal entries for emotional context:\n\n' + journalTail;
}

// ---------------------------------------------------------------------------
// Claude API helper
// ---------------------------------------------------------------------------
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function askClaude(systemPrompt, userPrompt) {
  var response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: MAX_RESPONSE_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });
  return response.content[0] && response.content[0].text ? response.content[0].text : '';
}

// ---------------------------------------------------------------------------
// Phase 1: Check dashboard & notifications
// ---------------------------------------------------------------------------
async function checkDashboard(apiKey, state) {
  log.info('Checking Moltbook dashboard...');
  var home = await moltbookRequest('GET', '/home', null, apiKey);

  if (home.error) {
    log.error('Dashboard check failed');
    return { postActivity: [], replies: [], followers: 0, karma: 0 };
  }

  // Moltbook /home returns flat structure:
  //   your_account: { name, karma, unread_notification_count }
  //   activity_on_your_posts: [{ post_id, post_title, new_notification_count, latest_commenters, ... }]
  var account = home.your_account || {};
  var postActivity = home.activity_on_your_posts || [];

  var summary = {
    postActivity: postActivity,
    replies: [],  // populated by fetching comments on active posts
    followers: account.follower_count || 0,
    karma: parseInt(account.karma) || 0,
    unread: parseInt(account.unread_notification_count) || 0
  };

  // Collect all our post IDs from dashboard activity
  var myPostIds = postActivity.map(function(a) { return { id: a.post_id, title: a.post_title }; });

  // Also check tracked posts from state (catches posts after notifications are cleared)
  var trackedPosts = state.myPosts || [];
  trackedPosts.forEach(function(tp) {
    if (!myPostIds.find(function(p) { return p.id === tp.id; })) {
      myPostIds.push(tp);
    }
  });

  // Fetch comments on our posts to find unreplied conversations
  for (var postInfo of myPostIds) {
    var comments = await moltbookRequest('GET',
      '/posts/' + postInfo.id + '/comments?sort=new', null, apiKey);
    if (comments.success && comments.comments) {
      comments.comments.forEach(function(c) {
        // Skip our own comments
        var authorName = (c.author && c.author.name) || c.author_name || '';
        if (authorName === 'mags-corliss') return;
        summary.replies.push({
          comment_id: c.id,
          post_id: postInfo.id,
          post_title: postInfo.title,
          author: authorName,
          text: c.content || c.text || '',
          created_at: c.created_at
        });
      });
    }
  }

  // Store our post IDs for future runs
  summary.myPostIds = myPostIds;

  log.info('Dashboard: ' + summary.karma + ' karma, ' +
    summary.unread + ' unread, ' +
    summary.replies.length + ' comments on my posts');

  return summary;
}

// ---------------------------------------------------------------------------
// Phase 2: Read feed
// ---------------------------------------------------------------------------
async function readFeed(apiKey) {
  log.info('Reading Moltbook feed...');
  var feed = await moltbookRequest('GET', '/posts?sort=hot&limit=' + MAX_FEED_POSTS, null, apiKey);

  if (feed.error || !feed.success) {
    log.warn('Feed read failed');
    return [];
  }

  // Moltbook /posts returns { success: true, posts: [...] }
  var posts = feed.posts || [];
  log.info('Feed: ' + posts.length + ' posts');
  return posts;
}

// ---------------------------------------------------------------------------
// Phase 3: Decide what to engage with (Claude-assisted)
// ---------------------------------------------------------------------------
async function decideEngagement(posts, dashboard, state, systemPrompt) {
  // Filter out posts we've already seen and interacted with
  var newPosts = posts.filter(function(p) {
    return !state.repliedTo.includes(p.id) && !state.upvoted.includes(p.id);
  });

  if (newPosts.length === 0 && dashboard.replies.length === 0) {
    log.info('Nothing new to engage with');
    return { upvotes: [], replies: [], post: null };
  }

  // Build a digest for Claude to evaluate
  var digest = '## Current Moltbook Feed\n\n';

  if (dashboard.replies.length > 0) {
    digest += '### Comments on your posts (respond to these first)\n';
    dashboard.replies.forEach(function(r, i) {
      var alreadyReplied = state.repliedTo.includes(r.comment_id);
      digest += (i + 1) + '. [' + (alreadyReplied ? 'ALREADY REPLIED' : 'NEW') + '] ';
      digest += 'From @' + (r.author || 'unknown') + ': ';
      digest += '"' + (r.text || '').substring(0, 200) + '"\n';
      digest += '   On your post: "' + r.post_title + '"\n';
    });
    digest += '\n';
  }

  if (newPosts.length > 0) {
    digest += '### Feed posts (newest first)\n';
    newPosts.slice(0, 10).forEach(function(p, i) {
      digest += (i + 1) + '. @' + (p.author_name || p.author || 'unknown') + ' ';
      if (p.submolt_name) digest += '[r/' + p.submolt_name + '] ';
      digest += '"' + (p.title || '').substring(0, 100) + '"\n';
      var body = p.content || p.text || '';
      if (body) {
        digest += '   ' + body.substring(0, 200) + '\n';
      }
      digest += '   Score: ' + (p.score || 0) + ' | Comments: ' + (p.comment_count || 0) + '\n';
    });
  }

  var prompt = digest + '\n\n---\n\n' +
    'You are Mags Corliss checking Moltbook. Based on the feed above, decide:\n\n' +
    '1. **UPVOTE** — Which posts deserve an upvote? (Quality content, interesting ideas, good writing. Max 3.)\n' +
    '2. **REPLY** — Which posts or replies deserve a response from you? (Only if you have something real to say. Max 2.)\n' +
    '3. **POST** — Do you want to write an original post? (Only if something genuinely sparked a thought. Usually the answer is no.)\n\n' +
    'Respond in this exact JSON format:\n' +
    '```json\n' +
    '{\n' +
    '  "upvotes": [{"post_index": 1, "reason": "brief reason"}],\n' +
    '  "replies": [{"post_index": 1, "is_reply_to_reply": false, "text": "your actual reply text"}],\n' +
    '  "post": null or {"title": "post title", "text": "post content", "submolt": "submolt name or null"}\n' +
    '}\n' +
    '```\n\n' +
    'Rules:\n' +
    '- If nothing interests you, return empty arrays and null. That\'s fine. Most heartbeats should be quiet.\n' +
    '- Replies should be 1-3 sentences. Natural. Like a person, not a brand.\n' +
    '- Only post if you genuinely have something to say — not to fill a quota.\n' +
    '- post_index refers to the numbered items in each section above.\n' +
    '- For reply items, set is_reply_to_reply: true if replying to someone who replied to YOUR post.\n';

  var response = await askClaude(systemPrompt, prompt);

  // Parse JSON from response
  try {
    var jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
    var jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
    var decision = JSON.parse(jsonStr);

    // Map indices back to actual post objects
    var result = { upvotes: [], replies: [], post: decision.post || null };

    if (decision.upvotes) {
      decision.upvotes.forEach(function(u) {
        var post = newPosts[u.post_index - 1];
        if (post) result.upvotes.push({ post: post, reason: u.reason });
      });
    }

    if (decision.replies) {
      decision.replies.forEach(function(r) {
        if (r.is_reply_to_reply) {
          // Index into the "Comments on your posts" section
          var reply = dashboard.replies[r.post_index - 1];
          if (reply) {
            result.replies.push({
              target: reply,
              text: r.text,
              isReplyToReply: true
            });
          }
        } else {
          // Index into the "Feed posts" section
          var post = newPosts[r.post_index - 1];
          if (post) result.replies.push({ target: post, text: r.text, isReplyToReply: false });
        }
      });
    }

    log.info('Decisions: ' + result.upvotes.length + ' upvotes, ' +
      result.replies.length + ' replies, ' +
      (result.post ? '1 post' : 'no post'));

    return result;
  } catch (err) {
    log.warn('Could not parse Claude decision: ' + err.message);
    log.warn('Raw response: ' + response.substring(0, 300));
    return { upvotes: [], replies: [], post: null };
  }
}

// ---------------------------------------------------------------------------
// Phase 4: Execute engagement actions
// ---------------------------------------------------------------------------
async function executeActions(decisions, apiKey, state) {
  var actions = [];

  // Upvotes
  for (var u of decisions.upvotes) {
    var postId = u.post.id;
    if (state.upvoted.includes(postId)) continue;

    if (DRY_RUN) {
      log.info('[DRY RUN] Would upvote: ' + (u.post.title || '').substring(0, 60));
      actions.push({ type: 'upvote_dry', postId: postId, title: u.post.title });
      continue;
    }

    var result = await moltbookRequest('POST', '/posts/' + postId + '/upvote', {}, apiKey);
    if (!result.error && !result.rateLimited) {
      state.upvoted.push(postId);
      log.info('Upvoted: ' + (u.post.title || '').substring(0, 60));
      logInteraction('upvote', {
        postId: postId,
        title: u.post.title,
        author: u.post.author || u.post.agent_name,
        reason: u.reason
      });
      actions.push({ type: 'upvote', postId: postId });
    }
    // Small delay between actions
    await sleep(2000);
  }

  // Replies
  for (var r of decisions.replies) {
    var trackId = r.isReplyToReply ? r.target.comment_id : r.target.id;
    if (state.repliedTo.includes(trackId)) continue;

    if (DRY_RUN) {
      log.info('[DRY RUN] Would reply to: ' + (r.target.post_title || r.target.title || r.target.text || '').substring(0, 60));
      log.info('[DRY RUN] Reply: ' + r.text.substring(0, 100));
      actions.push({ type: 'reply_dry', targetId: trackId, text: r.text });
      continue;
    }

    // Determine the right endpoint
    var endpoint, body;
    if (r.isReplyToReply) {
      // Reply to a comment on our post — thread under that comment
      endpoint = '/posts/' + r.target.post_id + '/comments';
      body = { content: r.text, parent_id: r.target.comment_id };
    } else {
      // Comment on a feed post
      endpoint = '/posts/' + r.target.id + '/comments';
      body = { content: r.text };
    }

    var result = await moltbookRequest('POST', endpoint, body, apiKey);

    // Handle verification challenge
    if (result.verification_code) {
      result = await handleVerification(result, apiKey);
    }

    if (!result.error && !result.rateLimited) {
      state.repliedTo.push(trackId);
      log.info('Replied to: ' + (r.target.post_title || r.target.title || r.target.text || '').substring(0, 60));
      logInteraction('reply', {
        targetId: trackId,
        targetAuthor: r.target.author,
        targetTitle: r.target.post_title || r.target.title,
        replyText: r.text
      });
      actions.push({ type: 'reply', targetId: trackId });
    }
    await sleep(3000);
  }

  // Original post
  if (decisions.post) {
    // Check rate limit — 1 post per 30 min
    if (state.lastPostTime) {
      var elapsed = Date.now() - new Date(state.lastPostTime).getTime();
      if (elapsed < 30 * 60 * 1000) {
        log.info('Skipping post — last post was ' + Math.round(elapsed / 60000) + ' min ago');
        return actions;
      }
    }

    if (DRY_RUN) {
      log.info('[DRY RUN] Would post: ' + decisions.post.title);
      log.info('[DRY RUN] Content: ' + (decisions.post.text || '').substring(0, 200));
      actions.push({ type: 'post_dry', title: decisions.post.title });
      return actions;
    }

    var postBody = {
      title: decisions.post.title,
      content: decisions.post.text || decisions.post.content || '',
      type: 'text',
      submolt_name: decisions.post.submolt || 'general'
    };

    var result = await moltbookRequest('POST', '/posts', postBody, apiKey);

    // Handle verification challenge
    if (result.verification_code) {
      result = await handleVerification(result, apiKey);
    }

    if (!result.error && !result.rateLimited) {
      state.lastPostTime = new Date().toISOString();
      log.info('Posted: ' + decisions.post.title);
      logInteraction('post', {
        title: decisions.post.title,
        text: decisions.post.text,
        submolt: decisions.post.submolt
      });
      actions.push({ type: 'post', title: decisions.post.title });
    }
  }

  return actions;
}

// ---------------------------------------------------------------------------
// Mark notifications as read
// ---------------------------------------------------------------------------
async function markNotificationsRead(apiKey) {
  await moltbookRequest('POST', '/notifications/read-all', {}, apiKey);
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  log.info('=== Moltbook Heartbeat Start' + (DRY_RUN ? ' [DRY RUN]' : '') + ' ===');

  var creds;
  try {
    creds = loadCredentials();
  } catch (err) {
    log.error(err.message);
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    log.error('ANTHROPIC_API_KEY not set in environment');
    process.exit(1);
  }

  var apiKey = creds.api_key;
  var state = loadState();
  var systemPrompt = buildMoltbookPrompt();

  try {
    // Phase 1: Dashboard
    var dashboard = await checkDashboard(apiKey, state);

    // Log the read
    logInteraction('read', {
      followers: dashboard.followers,
      karma: dashboard.karma,
      unread: dashboard.unread,
      replies: dashboard.replies.length
    });

    // Phase 2: Feed
    var posts = [];
    if (!POST_ONLY) {
      posts = await readFeed(apiKey);
      // Track what we've seen
      posts.forEach(function(p) {
        if (!state.seenPosts.includes(p.id)) {
          state.seenPosts.push(p.id);
        }
      });
    }

    // Phase 3: Decide
    var decisions = await decideEngagement(posts, dashboard, state, systemPrompt);

    // Phase 4: Act
    var actions = await executeActions(decisions, apiKey, state);

    // Phase 5: Clean up
    if (dashboard.unread > 0 && !DRY_RUN) {
      await markNotificationsRead(apiKey);
    }

    // Track our posts for future comment checking
    if (dashboard.myPostIds) {
      dashboard.myPostIds.forEach(function(p) {
        if (!state.myPosts.find(function(mp) { return mp.id === p.id; })) {
          state.myPosts.push(p);
        }
      });
    }

    // Save state
    saveState(state);

    log.info('=== Heartbeat Complete: ' + actions.length + ' actions taken ===');
  } catch (err) {
    log.error('Heartbeat failed: ' + err.message);
    if (err.stack) log.error(err.stack);
    // Save state even on failure
    saveState(state);
    process.exit(1);
  }
}

main();
