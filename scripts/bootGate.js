#!/usr/bin/env node
// DISABLED S308 — boot-gate reverted. It hot-reloaded into already-running
// sessions and blocked every work tool (media terminal, mid-work), because their
// boot reads happened before the gate recorded them.
//
// The settings.json wiring was removed, but a still-running session can hold the
// OLD hook config in memory and keep invoking this file per tool call. So this
// file is now a pure pass-through: consume stdin, allow everything, exit 0. That
// makes any stale invocation harmless without requiring the session to restart.
//
// Do NOT restore the gating logic without solving the live-session /
// pre-existing-read case. Prior gating implementation: git show 9b42bf90:scripts/bootGate.js

let raw = '';
process.stdin.on('data', d => (raw += d));
process.stdin.on('end', () => process.exit(0));
process.stdin.on('error', () => process.exit(0));
