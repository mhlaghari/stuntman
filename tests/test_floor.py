"""Exercise the floor with disposable logs, HTTP servers, and fake worker CLIs."""
from concurrent.futures import ThreadPoolExecutor
import http.client
import importlib.machinery
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
# Hosts invoke these helpers as `python3 <script>`; Windows cannot exec a shebang itself.
HOOK = [sys.executable, str(ROOT / 'bin/floor-hook')]
needs_shebang_exec = unittest.skipIf(sys.platform == 'win32',
                                     'fixture scripts are executed through their shebang')
sys.path.insert(0, str(ROOT / 'bin'))
import stuntman_floor as events
loader = importlib.machinery.SourceFileLoader('floor_under_test', str(ROOT / 'bin/floor'))
spec = importlib.util.spec_from_loader(loader.name, loader)
floor = importlib.util.module_from_spec(spec)
loader.exec_module(floor)


class FloorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='stuntman floor ')
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.env = os.environ | {'STUNTMAN_FLOOR_DIR': str(self.directory)}
        self.patch = patch.object(floor, 'EVENTS', self.directory / 'events.jsonl')
        self.patch.start(); self.addCleanup(self.patch.stop)
        floor._reach_cache.clear()

    def write(self, rows):
        floor.EVENTS.write_text(''.join(json.dumps(dict(ts=time.time(), **row)) + '\n' for row in rows))

    def test_hook_detects_codex_and_retains_child_identity(self):
        payload = {'session_id':'parent', 'turn_id':'turn', 'hook_event_name':'SubagentStart',
                   'agent_id':'child-2', 'agent_type':'reviewer', 'cwd':"/projects/it's a test"}
        env = dict(self.env)
        for name in ('STUNTMAN_FLOOR_HOST','STUNTMAN_FLOOR_WORKER_ID','PLUGIN_ROOT'):
            env.pop(name,None)
        result = subprocess.run(HOOK, input=json.dumps(payload), text=True,
                                capture_output=True, env=env, timeout=5)
        self.assertEqual(result.returncode,0)
        self.assertEqual(result.stdout,'')
        event = json.loads(floor.EVENTS.read_text())
        self.assertEqual((event['host'],event['sid'],event['agent_id']),('codex','parent','child-2'))
        self.assertEqual(event['cwd'],payload['cwd'])

    def test_malformed_hook_fails_open_without_phantom_agent(self):
        for payload in ('not json','[]','{}'):
            result = subprocess.run(HOOK, input=payload, text=True,
                                    capture_output=True, env=self.env, timeout=5)
            self.assertEqual((result.returncode,result.stdout,result.stderr),(0,'',''))
        self.assertFalse(floor.EVENTS.exists())

    def test_hosts_with_same_sid_are_separate_and_children_match_by_id(self):
        self.write([{'sid':'same','host':'claude','evt':'SessionStart'},
                    {'sid':'same','host':'codex','evt':'SessionStart'},
                    {'sid':'same','host':'codex','evt':'SubagentStart','agent_id':'a','desc':'first'},
                    {'sid':'same','host':'codex','evt':'SubagentStart','agent_id':'b','desc':'second'},
                    {'sid':'same','host':'codex','evt':'SubagentStop','agent_id':'b'}])
        states = floor.reduce_sessions()
        self.assertEqual(set(states),{'claude:same','codex:same'})
        self.assertEqual(list(states['codex:same']['children']),['a'])
        self.assertIsNone(floor.session_by_sid('same'))

    def test_overlapping_tools_remain_running_until_both_finish(self):
        self.write([{'sid':'one','evt':'PreToolUse','tool':'Bash','call_id':'a'},
                    {'sid':'one','evt':'PreToolUse','tool':'Read','call_id':'b'},
                    {'sid':'one','evt':'PostToolUse','call_id':'b'}])
        self.assertEqual(floor.session_by_sid('one')['state'],'running')
        self.assertEqual(floor.session_by_sid('one')['tool'],'Bash')

    def test_permission_request_and_worker_failure_states(self):
        self.write([{'sid':'parent','host':'codex','evt':'PermissionRequest'},
                    {'sid':'job','host':'muse','worker':True,'evt':'WorkerError'}])
        self.assertEqual(floor.session_by_sid('parent')['state'],'needs_input')
        self.assertEqual(floor.session_by_sid('job')['state'],'failed')

    def test_both_transcripts_exclude_reasoning_and_tool_results(self):
        path = self.directory / 'transcript.jsonl'
        entries = [
          {'type':'user','message':{'role':'user','content':[{'type':'text','text':'Claude question'}]}},
          {'type':'assistant','message':{'role':'assistant','content':[{'type':'thinking','thinking':'private'}, {'type':'text','text':'Claude answer'}]}},
          {'type':'user','message':{'role':'user','content':[{'type':'tool_result','content':'secret tool output'}]}},
          {'type':'response_item','payload':{'type':'message','role':'user','content':[{'type':'input_text','text':'Codex question'}]}},
          {'type':'response_item','payload':{'type':'message','role':'assistant','channel':'analysis','content':[{'type':'output_text','text':'private analysis'}]}},
          {'type':'response_item','payload':{'type':'message','role':'assistant','channel':'final','content':[{'type':'output_text','text':'Codex answer'}]}},
          {'type':'event_msg','payload':{'type':'agent_message','message':'Codex answer'}},
          {'type':'response_item','payload':{'type':'function_call_output','output':'secret tool output'}},
        ]
        path.write_text('\n'.join(json.dumps(row) for row in entries)+'\n[bad\n')
        messages = floor.transcript_tail(path)
        self.assertEqual([m['text'] for m in messages],['Claude question','Claude answer','Codex question','Codex answer'])
        self.assertEqual(floor.last_assistant_text(path),'Codex answer')

    def test_event_writes_are_complete_under_concurrency_and_rotation(self):
        with patch.dict(os.environ,self.env):
            with ThreadPoolExecutor(max_workers=8) as pool:
                list(pool.map(lambda i: events.emit({'sid':str(i),'host':'codex','evt':'Stop'}),range(40)))
            rows=[json.loads(line) for line in floor.EVENTS.read_text().splitlines()]
            self.assertEqual({row['sid'] for row in rows},{str(i) for i in range(40)})
            with patch.object(events,'ROTATE_BYTES',300):
                events.emit({'sid':'last','host':'codex','evt':'Stop'})
            self.assertEqual(json.loads(floor.EVENTS.read_text().splitlines()[-1])['sid'],'last')
            self.assertLess(floor.EVENTS.stat().st_size,500)

    def session(self, **extra):
        return dict({'id':'codex:one','sid':'one','host':'codex','worker':False,
                     'state':'done','ppid':10,'process_identity':'born-at-time codex'},**extra)

    def test_dead_or_reused_process_cannot_receive_prompt(self):
        with patch.object(floor,'process_identity',return_value='another birth'), patch.object(floor.subprocess,'run') as execute:
            result=floor.send_to_session(self.session(),'hello')
            self.assertFalse(result['ok'])
            execute.assert_not_called()

    def test_workers_and_approval_prompts_are_view_only(self):
        with patch.object(floor.subprocess,'run') as execute:
            for session in [self.session(worker=True),self.session(state='needs_input'),self.session(state='ended')]:
                self.assertIsNone(floor.find_pane(session,refresh=True))
            execute.assert_not_called()

    def test_live_foreground_agent_receives_literal_text(self):
        calls=[]
        def execute(args,**kwargs):
            calls.append(args)
            text=''
            if args[:2]==['ps','-p']:
                text = '10 10\n' if args[-1]=='pgid=,tpgid=' else ('codex codex\n' if args[2]=='10' else 'bash bash\n')
            return subprocess.CompletedProcess(args,0,text,'')
        with patch.object(floor,'process_identity',return_value='born-at-time codex'), \
             patch.object(floor,'_proc_parents',return_value={10:20,20:1}), \
             patch.object(floor,'_tmux_panes',return_value={20:'%1'}), \
             patch.object(floor.subprocess,'run',side_effect=execute):
            result=floor.send_to_session(self.session(),"literal $(not-a-command)\nnext\x1b")
        self.assertTrue(result['ok'])
        self.assertIn(['tmux','send-keys','-t','%1','-l','--','literal $(not-a-command) next'],calls)

    def test_headless_app_server_is_never_promptable(self):
        with patch.object(floor,'process_identity',return_value='born-at-time codex'), \
             patch.object(floor,'_proc_parents',return_value={10:20,20:1}), \
             patch.object(floor,'_tmux_panes',return_value={20:'%1'}), \
             patch.object(floor.subprocess,'run',side_effect=lambda args,**kwargs: subprocess.CompletedProcess(args,0,
                 'codex codex app-server\n' if args[2]=='10' else 'codex codex\n','')):
            self.assertIsNone(floor.find_pane(self.session(),refresh=True))

    def test_event_lock_excludes_a_rival_and_frees_on_close(self):
        """Windows locks through msvcrt where POSIX uses flock; the contract is identical."""
        lock = self.directory / 'events.lock'
        with lock.open('a') as held:
            events._lock_exclusive(held)
            with lock.open('a') as rival:
                with self.assertRaises(BlockingIOError):
                    events._lock_exclusive(rival)
        with lock.open('a') as after_release:
            events._lock_exclusive(after_release)

    @needs_shebang_exec
    def test_worker_observer_preserves_stdout_and_exit_code(self):
        worker=self.directory/'fake worker'
        worker.write_text('#!/usr/bin/env python3\nimport json,sys\nprint(json.dumps({"session_id":"provider-session","result":"finished","is_error":False}))\nsys.exit(int(sys.argv[1]))\n')
        worker.chmod(0o755)
        for exit_code in (0,7):
            result=subprocess.run([ROOT/'bin/stuntman-floor-run',worker,'codex',str(exit_code)],env=self.env,capture_output=True,text=True)
            self.assertEqual(result.returncode,exit_code)
            self.assertEqual(json.loads(result.stdout)['result'],'finished')
            self.assertEqual(result.stderr,'')
        states=list(floor.reduce_sessions().values())
        self.assertEqual([s['state'] for s in states],['done','failed'])
        self.assertTrue(all(s['worker'] for s in states))

    @needs_shebang_exec
    def test_stunt_codex_dispatch_is_monitored_without_changing_json(self):
        fakebin=self.directory/'bin';fakebin.mkdir()
        fake=fakebin/'codex'
        fake.write_text('#!/usr/bin/env python3\nimport json\nfor e in [{"type":"thread.started","thread_id":"fake-id"},{"type":"item.completed","item":{"type":"agent_message","text":"worker output"}},{"type":"turn.completed","usage":{"input_tokens":3,"output_tokens":2}}]: print(json.dumps(e))\n')
        fake.chmod(0o755)
        env=self.env|{'PATH':str(fakebin)+os.pathsep+self.env['PATH'],'STUNTMAN_WORKER':'codex'}
        env.pop('STUNTMAN_FLOOR_WRAPPED',None)
        result=subprocess.run([ROOT/'bin/stunt','exec','fixture task'],env=env,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(json.loads(result.stdout)['session_id'],'fake-id')
        self.assertEqual(len(floor.reduce_sessions()),1)
        self.assertEqual(next(iter(floor.reduce_sessions().values()))['state'],'done')

    def test_wiring_preserves_settings_and_is_idempotent(self):
        path=self.directory/'codex'/'hooks.json'
        path.parent.mkdir()
        path.write_text(json.dumps({'description':'user hooks','hooks':{'Stop':[{'hooks':[{'type':'command','command':'my-existing-hook'}]}]}}))
        floor.wire_hooks('codex',path)
        first=path.read_bytes()
        floor.wire_hooks('codex',path)
        self.assertEqual(first,path.read_bytes())
        cfg=json.loads(first)
        self.assertEqual(cfg['description'],'user hooks')
        self.assertEqual(cfg['hooks']['Stop'][0]['hooks'][0]['command'],'my-existing-hook')
        self.assertNotIn('Notification',cfg['hooks'])
        self.assertIn('PermissionRequest',cfg['hooks'])
        self.assertEqual(len(list(path.parent.glob('*.bak-floor-*'))),1)

    def http(self):
        server=floor.ThreadingHTTPServer(('127.0.0.1',0),floor.Handler)
        server.board=ROOT/'skills/floor/board'
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        self.addCleanup(server.server_close);self.addCleanup(server.shutdown)
        return server

    def test_http_blocks_foreign_origin_and_invalid_payloads(self):
        server=self.http()
        def request(method,path,body=None,headers=None):
            conn=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=3)
            conn.request(method,path,body=body,headers=headers or {})
            response=conn.getresponse();data=response.read();conn.close()
            return response.status,data
        self.assertEqual(request('GET','/state.json',headers={'Host':'attacker.example'})[0],403)
        self.assertEqual(request('GET','/state.json',headers={'Origin':'https://attacker.example'})[0],403)
        self.assertEqual(request('POST','/send','[]',{'Content-Type':'application/json'})[0],400)
        self.assertEqual(request('POST','/send','{}',{'Content-Type':'application/json'})[0],403)
        self.assertEqual(request('GET','/../../README.md')[0],404)
        status,body=request('GET','/index.html')
        self.assertEqual(status,200)
        self.assertNotIn(b'__FLOOR_TOKEN__',body)
        self.assertEqual(request('GET','/assets/vexel-laghari.webp')[0],200)

    def _fixture_board(self):
        # Tiny fixture board with minimal index.html and tiny allowlisted assets
        td = tempfile.TemporaryDirectory(prefix='floor-fixture-')
        self.addCleanup(td.cleanup)
        board = Path(td.name) / 'board'
        board.mkdir()
        (board / 'index.html').write_text('<html>__FLOOR_TOKEN__</html>')
        assets = board / 'assets'
        assets.mkdir()
        # create tiny fixture contents for each allowlisted file
        fixtures = {
            'vexel-laghari.webp': b'fake-webp-laghari',
            'vexel-claude.webp': b'fake-webp-claude',
            'vexel-codex.webp': b'fake-webp-codex',
            'vexel-gemini.webp': b'fake-webp-gemini',
            'vexel-deepseek.webp': b'fake-webp-deepseek',
            'laghari-labs-logo.png': b'\x89PNGfixture',
            'floor-audio.js': b'console.log("audio")',
            'floor-world.js': b'console.log("world")',
            'floor-world.css': b'body{}',
            'dubai-skyline.svg': b'<svg></svg>',
        }
        for name, data in fixtures.items():
            (assets / name).write_bytes(data)
        return board, fixtures

    def _mock_handler_for_board(self, board, path, host='127.0.0.1:4517', origin=None):
        import urllib.parse, json
        from io import BytesIO
        from unittest.mock import MagicMock
        h = floor.Handler.__new__(floor.Handler)
        h.server = MagicMock()
        h.server.board = board
        h.server.server_port = 4517
        captured = {}
        def send_response(code): captured['code'] = code
        def send_header(k, v): captured.setdefault('headers', {})[k] = v
        def end_headers(): pass
        h.send_response = send_response
        h.send_header = send_header
        h.end_headers = end_headers
        h.wfile = BytesIO()
        def _json(v, c=200):
            h.wfile.write(json.dumps(v).encode())
            captured['code'] = c
            captured['headers'] = {'Content-Type': 'application/json'}
        def _body(b, ct, c=200):
            h.wfile.write(b)
            captured['code'] = c
            captured['headers'] = {'Content-Type': ct}
        h._json = _json
        h._body = _body
        h.headers = MagicMock()
        h.headers.get = lambda k, d='': {'Host': host, 'Origin': origin, 'Sec-Fetch-Site': None}.get(k, d)
        h.headers.get_content_type = lambda: ''
        h.path = path
        if not h._allowed():
            return captured['code'], captured['headers'].get('Content-Type'), h.wfile.getvalue()
        h.wfile = BytesIO()
        captured = {}
        h._json = _json
        h._body = _body
        h.do_GET()
        return captured.get('code'), captured.get('headers', {}).get('Content-Type'), h.wfile.getvalue()

    def test_http_allowlisted_assets_fixture(self):
        board, fixtures = self._fixture_board()
        assets = board / 'assets'
        # correct MIME for each allowlisted asset when present
        for name, mime in [
            ('vexel-laghari.webp', 'image/webp'),
            ('vexel-claude.webp', 'image/webp'),
            ('vexel-codex.webp', 'image/webp'),
            ('vexel-gemini.webp', 'image/webp'),
            ('vexel-deepseek.webp', 'image/webp'),
            ('laghari-labs-logo.png', 'image/png'),
            ('floor-audio.js', 'application/javascript'),
            ('floor-world.js', 'application/javascript'),
            ('floor-world.css', 'text/css'),
            ('dubai-skyline.svg', 'image/svg+xml'),
        ]:
            code, ctype, body = self._mock_handler_for_board(board, f'/assets/{name}')
            self.assertEqual(code, 200, f'{name} should be 200')
            self.assertEqual(ctype, mime, f'{name} MIME')
            self.assertEqual(body, fixtures[name])
        # missing allowlisted file -> 404
        (assets / 'floor-world.js').unlink()
        code, _, _ = self._mock_handler_for_board(board, '/assets/floor-world.js')
        self.assertEqual(code, 404)
        (assets / 'floor-world.js').write_bytes(fixtures['floor-world.js'])
        # unknown asset -> 404
        for unk in ['unknown.webp', 'not-allowlisted.js', 'evil.png', 'floor-audio.css']:
            code, _, _ = self._mock_handler_for_board(board, f'/assets/{unk}')
            self.assertEqual(code, 404, f'unknown {unk} should 404')
        # encoded traversal -> 404
        for trav in ['/assets/../index.html', '/assets/%2e%2e/index.html', '/assets/%2Fetc/passwd', '/assets/%252e%252e/index.html', '/assets/vexel-laghari.webp%00', '/assets/', '/assets/vexel-laghari.webp/extra', '/assets/%2e%2e%2findex.html']:
            code, _, _ = self._mock_handler_for_board(board, trav)
            self.assertEqual(code, 404, f'traversal {trav} should 404')
        # query string stripped
        code, ctype, _ = self._mock_handler_for_board(board, '/assets/floor-audio.js?x=1&y=2')
        self.assertEqual(code, 200)
        self.assertEqual(ctype, 'application/javascript')
        # filename symlink escaping assets -> 404
        outside = self.directory / 'outside-secret-fixture.txt'
        outside.write_text('secret')
        target = assets / 'vexel-laghari.webp'
        target.unlink()
        target.symlink_to(outside)
        try:
            code, _, _ = self._mock_handler_for_board(board, '/assets/vexel-laghari.webp')
            self.assertEqual(code, 404, 'filename symlink outside should 404')
        finally:
            target.unlink()
            target.write_bytes(fixtures['vexel-laghari.webp'])
        # symlinked assets directory escaping board -> 404
        with tempfile.TemporaryDirectory(prefix='outside-assets-') as outside_dir:
            outside_assets = Path(outside_dir) / 'evil-assets'
            outside_assets.mkdir()
            (outside_assets / 'vexel-laghari.webp').write_bytes(b'evil')
            # replace assets dir with symlink
            import shutil
            shutil.rmtree(assets)
            assets.symlink_to(outside_assets)
            try:
                code, _, _ = self._mock_handler_for_board(board, '/assets/vexel-laghari.webp')
                self.assertEqual(code, 404, 'symlinked assets dir escaping board should 404')
            finally:
                assets.unlink()
                assets.mkdir()
                for name, data in fixtures.items():
                    (assets / name).write_bytes(data)


if __name__=='__main__':
    unittest.main()
