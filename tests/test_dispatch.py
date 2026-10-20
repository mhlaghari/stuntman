"""Dispatch verbs: resolve a project, send, wait and spawn, with fake floors and tmux."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'bin'))
import stuntman_dispatch as dispatch


def agent(aid, state='done', worker=False, reach='tmux', host='claude', children=()):
    return {'id': aid, 'sid': aid.split(':')[-1], 'host': host, 'worker': worker, 'state': state,
            'reach': reach, 'children': list(children), 'say': None}


def room(name, *agents, cwd=None):
    return {'name': name, 'cwd': cwd or '/p/' + name, 'agents': list(agents)}


ROOMS = [room('trading-desk', agent('claude:t1', 'running'), agent('opencode:w1', 'running', worker=True)),
         room('Tatweer OS', agent('claude:a1')),
         room('tatweer-harness', agent('codex:h1')),
         room('spark', agent('opencode:w2', worker=True))]


def fake_floor(rooms=ROOMS, sessions=None, send_result=None):
    sessions = sessions or {}
    sent = []
    def send_to_session(session, text):
        sent.append((session['id'], text))
        return send_result or {'ok': True}
    return SimpleNamespace(reduce_state=lambda: {'rooms': rooms}, sent=sent,
                           session_by_sid=lambda key: sessions.get(key),
                           send_to_session=send_to_session,
                           last_assistant_text=lambda tp: None)


class ResolveTests(unittest.TestCase):
    def test_exact_name_ignores_case_spaces_and_punctuation(self):
        self.assertEqual(dispatch.resolve('tatweer-os', ROOMS)[0]['name'], 'Tatweer OS')
        self.assertEqual(dispatch.resolve('TRADING_DESK', ROOMS)[0]['name'], 'trading-desk')

    def test_unique_prefix_matches_and_shared_prefix_is_ambiguous(self):
        self.assertEqual(dispatch.resolve('trad', ROOMS)[0]['name'], 'trading-desk')
        found, error = dispatch.resolve('tatweer', ROOMS)
        self.assertIsNone(found)
        self.assertIn('more than one project', error)

    def test_unknown_project_lists_known_ones(self):
        found, error = dispatch.resolve('nope', ROOMS)
        self.assertIsNone(found)
        self.assertIn('spark', error)

    def test_agent_id_selects_its_room_and_itself(self):
        found, _ = dispatch.resolve('codex:h1', ROOMS)
        self.assertEqual(found['name'], 'tatweer-harness')
        self.assertEqual(dispatch.pick_agent(found, 'codex:h1')[0]['id'], 'codex:h1')
        self.assertEqual(dispatch.resolve('/p/spark', ROOMS)[0]['name'], 'spark')

    def test_pick_agent_prefers_reachable_idle_session_and_never_a_worker(self):
        busy, idle = agent('claude:x', 'running'), agent('claude:y', 'idle')
        far = agent('claude:z', 'idle', reach='none')
        picked, _ = dispatch.pick_agent(room('r', busy, far, idle, agent('opencode:w', worker=True)), 'r')
        self.assertEqual(picked['id'], 'claude:y')
        self.assertEqual(dispatch.pick_agent(room('r', agent('opencode:w', worker=True)), 'r'), (None, None))

    def test_two_ready_sessions_are_ambiguous_and_the_caller_is_skipped(self):
        two = room('r', agent('claude:me', 'idle'), agent('claude:other', 'done'))
        picked, error = dispatch.pick_agent(two, 'r')
        self.assertIsNone(picked)
        self.assertIn('claude:me, claude:other', error)
        self.assertEqual(dispatch.pick_agent(two, 'r', exclude='me')[0]['id'], 'claude:other')
        self.assertEqual(dispatch.pick_agent(room('r', agent('claude:me', 'idle')), 'r', exclude='claude:me'), (None, None))


class SendWaitTests(unittest.TestCase):
    def test_send_targets_the_project_session(self):
        floor = fake_floor(sessions={'claude:a1': {'id': 'claude:a1'}})
        result = dispatch.send(floor, 'tatweer-os', 'what is open?')
        self.assertTrue(result['ok'])
        self.assertEqual((result['project'], result['agent']), ('Tatweer OS', 'claude:a1'))
        self.assertEqual(floor.sent, [('claude:a1', 'what is open?')])

    def test_send_to_worker_only_project_suggests_spawn(self):
        floor = fake_floor()
        result = dispatch.send(floor, 'spark', 'hi')
        self.assertEqual(result['reason'], 'no-session')
        self.assertIn('floor spawn spark', result['detail'])
        self.assertEqual(floor.sent, [])

    def test_send_passes_through_the_floor_refusal(self):
        refusal = {'ok': False, 'reason': 'unreachable', 'detail': 'View-only'}
        floor = fake_floor(sessions={'claude:a1': {'id': 'claude:a1'}}, send_result=refusal)
        result = dispatch.send(floor, 'tatweer-os', 'hi')
        self.assertEqual((result['ok'], result['reason']), (False, 'unreachable'))

    def test_wait_ignores_the_state_from_before_the_prompt(self):
        # A late event from the old turn (needs_input at 10.5) must not end the wait.
        states = iter([{'state': 'done', 'prompt_ts': 3}, {'state': 'needs_input', 'prompt_ts': 3},
                       {'state': 'thinking', 'prompt_ts': 11}, {'state': 'done', 'prompt_ts': 11}])
        def session_by_sid(key):
            return dict(next(states), tp=None, say='42 tests pass', msg=None)
        floor = SimpleNamespace(session_by_sid=session_by_sid, last_assistant_text=lambda tp: None)
        result = dispatch.wait(floor, 'claude:a1', since=10, sleep=lambda s: None)
        self.assertEqual((result['ok'], result['state'], result['say']), (True, 'done', '42 tests pass'))

    def test_wait_reports_needs_input_and_timeout(self):
        floor = SimpleNamespace(last_assistant_text=lambda tp: None, session_by_sid=lambda key: {
            'state': 'needs_input', 'prompt_ts': 20, 'tp': None, 'say': None, 'msg': 'Approve pip?'})
        self.assertEqual(dispatch.wait(floor, 'a', since=10)['msg'], 'Approve pip?')
        ticks = iter([0, 1, 2, 3])
        busy = SimpleNamespace(session_by_sid=lambda key: {'state': 'running', 'last_ts': 20})
        result = dispatch.wait(busy, 'a', timeout=2, clock=lambda: next(ticks), sleep=lambda s: None)
        self.assertEqual((result['ok'], result['reason']), (False, 'timeout'))


class SpawnTests(unittest.TestCase):
    def test_argv_for_each_tmux_situation(self):
        inside = dispatch.spawn_argv('/p/spark', 'claude', 'run $(rm -rf ~); tests', True, False)
        self.assertEqual(inside, ['tmux', 'new-window', '-d', '-n', 'spark', '-c', '/p/spark',
                                  "claude 'run $(rm -rf ~); tests'"])
        self.assertEqual(dispatch.spawn_argv('/p/spark', 'codex', '', False, True)[:5],
                         ['tmux', 'new-window', '-d', '-t', 'stuntman:'])
        self.assertEqual(dispatch.spawn_argv('/p/spark', 'claude', '', False, False)[:5],
                         ['tmux', 'new-session', '-d', '-s', 'stuntman'])

    def test_spawn_resolves_project_folder_and_cleans_the_prompt(self):
        calls = []
        def run(argv, **kwargs):
            calls.append(argv)
            return SimpleNamespace(returncode=0)
        with patch.object(dispatch.shutil, 'which', return_value='/bin/x'), \
             patch.object(dispatch.subprocess, 'run', run), patch.dict(os.environ, {'TMUX': '/tmp/t'}):
            result = dispatch.spawn(fake_floor(), 'trading', prompt='fix\nit')
        self.assertTrue(result['ok'])
        self.assertEqual(calls[-1][-2:], ['/p/trading-desk', "claude 'fix it'"])

    def test_spawn_refuses_without_tmux_or_with_a_bad_host(self):
        with patch.object(dispatch.shutil, 'which', return_value=None):
            self.assertEqual(dispatch.spawn(fake_floor(), 'spark')['reason'], 'missing-tool')
        self.assertEqual(dispatch.spawn(fake_floor(), 'spark', host='bash')['reason'], 'bad-host')
        self.assertEqual(dispatch.spawn(fake_floor(), 'nope')['reason'], 'unknown-project')

    def test_spawn_refuses_a_prompt_that_reads_as_a_flag_and_a_missing_folder(self):
        flag = dispatch.spawn(fake_floor(), 'spark', prompt='--dangerously-skip-permissions')
        self.assertEqual(flag['reason'], 'invalid-text')
        self.assertEqual(dispatch.spawn(fake_floor(), './no-such-folder')['reason'], 'unknown-project')


class CliTests(unittest.TestCase):
    def test_floor_who_and_send_from_the_command_line(self):
        with tempfile.TemporaryDirectory() as directory:
            rows = [{'sid': 's1', 'host': 'claude', 'evt': 'Stop', 'cwd': '/p/spark', 'ts': time.time()},
                    {'sid': 'w1', 'host': 'opencode', 'worker': True, 'evt': 'WorkerStart',
                     'cwd': '/p/spark', 'ts': time.time()}]
            Path(directory, 'events.jsonl').write_text(''.join(json.dumps(r) + '\n' for r in rows))
            env = os.environ | {'STUNTMAN_FLOOR_DIR': directory}
            def run(*args):
                return subprocess.run([sys.executable, str(ROOT / 'bin/floor'), *args],
                                      capture_output=True, text=True, env=env, timeout=20)
            listed = run('who')
            self.assertEqual(listed.returncode, 0)
            self.assertIn('spark', listed.stdout)
            self.assertIn('opencode:w1  opencode worker  running', listed.stdout)
            sent = run('send', '--', 'spark', '--wait', 'hello')
            self.assertEqual(sent.returncode, 1)  # Not inside tmux here: view only.
            result = json.loads(sent.stdout)
            self.assertEqual((result['reason'], result['agent']), ('unreachable', 'claude:s1'))
            self.assertNotIn('reply', result)  # `--wait` after `--` is prompt text, not a flag.


if __name__ == '__main__':
    unittest.main()
