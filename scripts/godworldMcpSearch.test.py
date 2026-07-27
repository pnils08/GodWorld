#!/usr/bin/env python3
"""Offline contract tests for GodWorld MCP Supermemory retrieval."""

import json
import runpy
import threading
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import dotenv


ROOT = Path(__file__).resolve().parent.parent
with patch.object(dotenv, 'load_dotenv'):
    MODULE = runpy.run_path(str(ROOT / 'scripts' / 'godworld-mcp.py'))


def completed(stdout, returncode=0):
    return SimpleNamespace(stdout=stdout, stderr='', returncode=returncode)


class SupermemorySearchTests(unittest.TestCase):
    def test_published_canon_uses_filter_and_projects_provenance(self):
        payload = {
            'results': [{
                'id': 'internal-document-id',
                'title': 'Bay Tribune Edition 101',
                'memory': 'The published fact.',
                'similarity': 0.8764,
                'updatedAt': '2026-07-25T10:00:00Z',
                'filepath': '/internal/path',
                'rootMemoryId': 'internal-root',
                'metadata': {
                    'source': 'edition-ingest',
                    'cycle': 101,
                    'type': 'edition',
                },
            }],
        }
        calls = []

        def fake_run(cmd, **kwargs):
            calls.append((cmd, kwargs))
            return completed(json.dumps(payload))

        with patch.object(MODULE['subprocess'], 'run', side_effect=fake_run):
            result = MODULE['published_canon_search']('apprenticeship', 5)

        self.assertEqual(len(calls), 1)
        cmd = calls[0][0]
        self.assertEqual(cmd[cmd.index('--tag') + 1], 'bay-tribune')
        self.assertEqual(cmd[cmd.index('--mode') + 1], 'hybrid')
        self.assertEqual(cmd[cmd.index('--threshold') + 1], '0.3')
        self.assertEqual(
            json.loads(cmd[cmd.index('--filter') + 1]),
            MODULE['PUBLISHED_CANON_FILTER'],
        )
        self.assertIn('--json', cmd)
        self.assertIn('published provenance only', result)
        self.assertIn('Bay Tribune Edition 101', result)
        self.assertIn('source=edition-ingest', result)
        self.assertIn('cycle=101', result)
        self.assertIn('The published fact.', result)
        self.assertNotIn('/internal/path', result)
        self.assertNotIn('internal-root', result)
        self.assertNotIn('internal-document-id', result)

    def test_projected_json_failure_is_loud_and_does_not_fall_back(self):
        with patch.object(
            MODULE['subprocess'],
            'run',
            return_value=completed('not-json'),
        ):
            result = MODULE['published_canon_search']('query')

        self.assertTrue(result.startswith('Search error: invalid Supermemory JSON'))
        self.assertNotEqual(result, 'not-json')

    def test_recency_overfetches_then_sorts_deterministically(self):
        payload = {
            'results': [
                {
                    'title': 'Older Edition',
                    'memory': 'Older.',
                    'updatedAt': '2026-07-20T00:00:00Z',
                    'metadata': {'source': 'edition-ingest'},
                },
                {
                    'title': 'Newest Edition',
                    'memory': 'Newest.',
                    'updatedAt': '2026-07-26T00:00:00Z',
                    'metadata': {'source': 'edition-ingest'},
                },
            ],
        }
        commands = []

        def fake_run(cmd, **kwargs):
            commands.append(cmd)
            return completed(json.dumps(payload))

        with patch.object(MODULE['subprocess'], 'run', side_effect=fake_run):
            result = MODULE['published_canon_search']('citizen', 2, sort='recency')

        cmd = commands[0]
        self.assertEqual(cmd[cmd.index('--limit') + 1], '10')
        self.assertLess(result.index('Newest Edition'), result.index('Older Edition'))

    def test_world_search_fans_out_only_over_domain_tags(self):
        seen = []
        lock = threading.Lock()

        def fake_run(cmd, **kwargs):
            tag = cmd[cmd.index('--tag') + 1]
            with lock:
                seen.append(tag)
            payload = {
                'results': [{
                    'title': f'{tag} result',
                    'memory': f'{tag} body',
                    'metadata': {'type': 'card'},
                }],
            }
            return completed(json.dumps(payload))

        with patch.object(MODULE['subprocess'], 'run', side_effect=fake_run):
            result = MODULE['search_world_domains']('Oakland')

        self.assertEqual(set(seen), set(MODULE['WORLD_DOMAIN_TAGS']))
        self.assertNotIn('world-data', seen)
        for tag in MODULE['WORLD_DOMAIN_TAGS']:
            self.assertIn(f'=== {tag}; 1 hit(s) ===', result)

    def test_cli_nonzero_is_reported_without_raw_stderr(self):
        failure = SimpleNamespace(
            stdout='',
            stderr='sensitive upstream diagnostic',
            returncode=2,
        )
        with patch.object(MODULE['subprocess'], 'run', return_value=failure):
            result = MODULE['published_canon_search']('query')

        self.assertEqual(
            result,
            'Search error: Supermemory CLI exited 2 for bay-tribune',
        )
        self.assertNotIn('sensitive', result)


if __name__ == '__main__':
    unittest.main()
