"""Host compatibility checks; no live models, credentials, or APIs required."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import unittest
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]


def run(*args, cwd=None, env=None, input=None):
    return subprocess.run([str(a) for a in args], cwd=cwd, env=env, input=input,
                          text=True, capture_output=True, timeout=20)


class CompatibilityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='stuntman tests ')
        self.addCleanup(self.temp.cleanup)
        self.project = Path(self.temp.name)
        self.env = os.environ.copy()
        self.env.pop('STUNTMAN_HOST', None)

    def scaffold(self, *args):
        result = run(ROOT / 'bin/scaffold', *args, self.project, env=self.env)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result

    def test_legacy_installer_replaces_helper_links_without_changing_targets(self):
        home = self.project / 'home'
        helper_dir = home / '.local/bin'
        helper_dir.mkdir(parents=True)
        target = self.project / 'old-checkout-stunt'
        target.write_text('existing source must survive\n')
        (helper_dir / 'stunt').symlink_to(target)
        result = run(ROOT / 'install.sh', '--claude', env=self.env | {'HOME': str(home)})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(target.read_text(), 'existing source must survive\n')
        self.assertFalse((helper_dir / 'stunt').is_symlink())
        self.assertEqual((helper_dir / 'stunt').read_bytes(), (ROOT / 'bin/stunt').read_bytes())
        self.assertTrue((helper_dir / 'stuntman_floor.py').is_file())
        self.assertTrue((home / '.claude/skills/floor/board/assets/vexel-laghari.webp').is_file())

    def test_default_remains_claude(self):
        self.scaffold()
        self.assertTrue((self.project / 'CLAUDE.md').is_file())
        self.assertFalse((self.project / 'AGENTS.md').exists())

    def test_codex_scaffold_preserves_existing_contract_and_docs(self):
        (self.project / 'AGENTS.md').write_text('User rules\n')
        (self.project / 'HANDOFF.md').write_text('Existing work\n')
        self.scaffold('--host', 'codex')
        first = {p.name: p.read_bytes() for p in self.project.iterdir()}
        self.scaffold('--host', 'codex')
        self.assertEqual(first, {p.name: p.read_bytes() for p in self.project.iterdir()})
        self.assertTrue((self.project / 'AGENTS.md').read_text().startswith('User rules\n'))
        self.assertEqual((self.project / 'HANDOFF.md').read_text(), 'Existing work\n')
        self.assertFalse((self.project / 'CLAUDE.md').exists())

    def test_both_hosts_can_share_the_same_memory(self):
        self.scaffold('--host', 'both')
        for name in ('AGENTS.md', 'CLAUDE.md'):
            self.assertIn('HANDOFF.md', (self.project / name).read_text())
        self.assertEqual(len(list(self.project.glob('HANDOFF.md'))), 1)

    def test_invalid_host_writes_nothing(self):
        for helper in ('scaffold', 'wiki'):
            result = run(ROOT / 'bin' / helper, '--host', 'bogus', self.project)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(list(self.project.iterdir()), [])

    def test_explicit_host_overrides_environment(self):
        self.env['STUNTMAN_HOST'] = 'claude'
        self.scaffold('--host', 'codex')
        self.assertTrue((self.project / 'AGENTS.md').exists())
        self.assertFalse((self.project / 'CLAUDE.md').exists())

    def test_legacy_marker_is_not_duplicated(self):
        original = '<!-- stuntman:handoff:start -->\nExisting contract\n'
        (self.project / 'AGENTS.md').write_text(original)
        self.scaffold('--host', 'codex')
        self.assertEqual((self.project / 'AGENTS.md').read_text(), original)

    def test_wiki_supports_both_hosts_and_is_idempotent(self):
        for host, names in [('codex', ['AGENTS.md']), ('claude', ['CLAUDE.md']),
                            ('both', ['AGENTS.md', 'CLAUDE.md'])]:
            with self.subTest(host=host):
                args = (ROOT / 'bin/wiki', '--host', host, self.project, host + '-vault')
                result = run(*args)
                self.assertEqual(result.returncode, 0, result.stderr)
                vault = self.project / (host + '-vault')
                for name in names:
                    self.assertTrue((vault / name).is_file())
                if host != 'both':
                    other = 'CLAUDE.md' if host == 'codex' else 'AGENTS.md'
                    self.assertFalse((vault / other).exists())
                (vault / 'wiki/hot.md').write_text('Keep my notes\n')
                self.assertEqual(run(*args).returncode, 0)
                self.assertEqual((vault / 'wiki/hot.md').read_text(), 'Keep my notes\n')

    def quota(self):
        result = run(ROOT / 'bin/codex-window', '--sessions-dir', self.project)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def write_snapshot(self, name='rollout-one.jsonl', primary=None, secondary=None, age=0):
        event = {'type': 'event_msg', 'timestamp': datetime.fromtimestamp(time.time() - age, timezone.utc).isoformat(),
                 'payload': {'type': 'token_count', 'rate_limits': {'primary': primary, 'secondary': secondary}}}
        (self.project / name).write_text(json.dumps(event) + '\n')

    def test_quota_without_snapshot_is_unknown(self):
        result = self.quota()
        self.assertFalse(result['available'])
        self.assertFalse(result['live'])

    def test_quota_handles_empty_new_session_and_truncated_events(self):
        self.write_snapshot(primary={'used_percent': 75, 'resets_at': int(time.time()) + 600, 'window_minutes': 300})
        with (self.project / 'rollout-one.jsonl').open('a') as stream:
            stream.write('{"rate_limits":\n')
        new = self.project / 'rollout-new.jsonl'
        new.write_text('{"type":"session_meta"}\n')
        os.utime(new, (time.time() + 5, time.time() + 5))
        result = self.quota()
        self.assertTrue(result['available'])
        self.assertEqual(result['windows'][0]['used_percent'], 75)
        self.assertFalse(result['blocked'])

    def test_weekly_cap_remains_binding_after_short_reset(self):
        self.write_snapshot(primary={'used_percent': 100, 'resets_at': int(time.time()) - 60},
                            secondary={'used_percent': 100, 'resets_at': int(time.time()) + 86400, 'window_minutes': 10080})
        result = self.quota()
        self.assertTrue(result['blocked'])
        self.assertTrue(result['windows'][0]['expired'])
        self.assertEqual(result['windows'][0]['used_percent'], 100)  # not fabricated zero use
        self.assertFalse(result['windows'][1]['expired'])

    def test_stale_snapshot_is_explicit(self):
        self.write_snapshot(primary={'used_percent': 10, 'resets_at': int(time.time()) + 600}, age=7200)
        self.assertTrue(self.quota()['stale'])

    def test_missing_primary_and_unknown_reset_are_supported(self):
        self.write_snapshot(secondary={'used_percent': 100})
        result = self.quota()
        self.assertTrue(result['blocked'])
        self.assertIsNone(result['windows'][0]['resets_at'])

    def test_codex_installer_uses_plugin_cli_and_propagates_failure(self):
        fakebin = self.project / 'bin'
        fakebin.mkdir()
        fake = fakebin / 'codex'
        log = self.project / 'calls.jsonl'
        fake.write_text('#!/usr/bin/env python3\nimport json,os,sys\n'
                        'with open(os.environ["STUNTMAN_TEST_LOG"],"a") as f: f.write(json.dumps(sys.argv[1:])+"\\n")\n'
                        'if sys.argv[1:3] == ["plugin","add"]: sys.exit(int(os.environ.get("STUNTMAN_TEST_FAIL", "0")))\n')
        fake.chmod(0o755)
        env = self.env | {'PATH': str(fakebin) + os.pathsep + self.env['PATH'], 'STUNTMAN_TEST_LOG': str(log)}
        result = run(ROOT / 'install.sh', '--codex', env=env, cwd=self.project)
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = [json.loads(line) for line in log.read_text().splitlines()]
        self.assertEqual(calls, [['plugin', '--help'], ['plugin', 'marketplace', 'add', str(ROOT)],
                                 ['plugin', 'add', 'stuntman@stuntman']])
        result = run(ROOT / 'install.sh', '--codex', env=env | {'STUNTMAN_TEST_FAIL': '3'})
        self.assertEqual(result.returncode, 3)
        self.assertNotIn('Stuntman installed', result.stdout)

    def test_stop_hook_handles_codex_input_and_space_in_plugin_path(self):
        # A disposable Git repository exercises real status output, never the user's repository.
        for args in [('init', '-q'), ('config', 'user.name', 'Stuntman Test'),
                     ('config', 'user.email', 'test@example.invalid')]:
            self.assertEqual(run('git', *args, cwd=self.project).returncode, 0)
        (self.project / 'HANDOFF.md').write_text('Initial handoff\n')
        (self.project / 'AGENTS.md').write_text('Project rules\n')
        self.assertEqual(run('git', 'add', '.', cwd=self.project).returncode, 0)
        self.assertEqual(run('git', '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false',
                             'commit', '-qm', 'Fixture baseline', cwd=self.project).returncode, 0)
        (self.project / 'code.py').write_text('print(1)\n')
        config = json.loads((ROOT / 'hooks/hooks.json').read_text())
        command = config['hooks']['Stop'][0]['hooks'][0]['command']
        plugin_path = self.project / 'plugin bundle with spaces'
        plugin_path.symlink_to(ROOT, target_is_directory=True)
        env = self.env | {'CLAUDE_PLUGIN_ROOT': str(plugin_path), 'PLUGIN_DATA': str(self.project / 'data'),
                          'STUNTMAN_VAULT': str(self.project / 'absent-vault')}
        payload = {'cwd': str(self.project), 'hook_event_name': 'Stop', 'turn_id': 'test', 'stop_hook_active': False}
        result = run('bash', '-c', command, env=env, input=json.dumps(payload))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)['decision'], 'block')
        payload['stop_hook_active'] = True
        self.assertEqual(run('bash', '-c', command, env=env, input=json.dumps(payload)).stdout, '')
        payload['stop_hook_active'] = False
        (self.project / 'HANDOFF.md').write_text('Updated handoff\n')
        self.assertEqual(run('bash', '-c', command, env=env, input=json.dumps(payload)).stdout, '')

    def test_hooks_ignore_non_scaffolded_projects(self):
        result = run(ROOT / 'hooks/handoff-guard.sh', input=json.dumps({'cwd': str(self.project)}))
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, '')


if __name__ == '__main__':
    unittest.main()
