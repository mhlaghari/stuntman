"""Dispatch verbs for the floor: list projects, send a prompt, wait for the reply, start a session."""
import argparse
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import time

VERBS = ('who', 'send', 'wait', 'spawn')
SETTLED = ('done', 'idle', 'needs_input', 'failed', 'ended')
SPAWN_HOSTS = ('claude', 'codex')
TMUX_SESSION = 'stuntman'


def slug(name):
    return re.sub(r'[^a-z0-9]', '', str(name).lower())


def clean_text(text):
    """One line, no control characters: the same rule the floor applies before tmux."""
    text = re.sub(r'[\r\n]+', ' ', text or '')
    return re.sub(r'[\x00-\x1f\x7f]', '', text).strip()


def resolve(target, rooms):
    """Find one project by agent id, folder, exact name or unique prefix. Returns (room, error)."""
    for room in rooms:
        if any(target in (a['id'], a['sid']) for a in room['agents']) or target == room['cwd']:
            return room, None
    key = slug(target)
    if not key:
        return None, 'Name a project.'
    exact = [r for r in rooms if slug(r['name']) == key]
    prefix = [r for r in rooms if slug(r['name']).startswith(key)]
    for matches in (exact, prefix):
        if len(matches) == 1:
            return matches[0], None
        if matches:
            names = ', '.join(sorted(f"{r['name']} ({r['cwd']})" for r in matches))
            return None, f'"{target}" matches more than one project: {names}.'
    names = ', '.join(sorted(r['name'] for r in rooms)) or 'none'
    return None, f'No project on the floor matches "{target}". Projects: {names}.'


def pick_agent(room, target, exclude=None):
    """The agent id named, else the project's one interactive session that can take a prompt now.

    Returns (agent, error). Two ready sessions are ambiguous: name one by its id."""
    for agent in room['agents']:
        if target in (agent['id'], agent['sid']):
            return agent, None
    seats = [a for a in room['agents'] if not a['worker'] and exclude not in (a['id'], a['sid'])]
    ready = [a for a in seats if a['reach'] == 'tmux' and a['state'] in ('idle', 'done')]
    if len(ready) > 1:
        return None, f"{room['name']} has {len(ready)} ready sessions: {', '.join(a['id'] for a in ready)}. Name one."
    seats.sort(key=lambda a: (a['reach'] != 'tmux', a['state'] not in ('idle', 'done')))
    return (seats[0] if seats else None), None


def who(floor):
    rooms = floor.reduce_state()['rooms']
    if not rooms:
        return 'No agents on the floor. Sessions appear after their hooks report.'
    lines = []
    for room in rooms:
        lines.append(f"{room['name']}  ({room['cwd']})")
        for a in room['agents']:
            role = 'worker' if a['worker'] else 'session'
            kids = f", {len(a['children'])} subagents" if a['children'] else ''
            reach = 'can send' if a['reach'] == 'tmux' else 'view only'
            lines.append(f"  {a['id']}  {a['host']} {role}  {a['state']}{kids}  [{reach}]")
            if a.get('say'):
                lines.append(f"    last: {a['say']}")
    return '\n'.join(lines)


def send(floor, target, text, exclude=None):
    room, error = resolve(target, floor.reduce_state()['rooms'])
    if error:
        return {'ok': False, 'reason': 'unknown-project', 'detail': error}
    agent, error = pick_agent(room, target, exclude)
    if error:
        return {'ok': False, 'reason': 'ambiguous-session', 'project': room['name'], 'detail': error}
    if not agent:
        return {'ok': False, 'reason': 'no-session', 'project': room['name'], 'cwd': room['cwd'],
                'detail': f"{room['name']} has only workers. Start a session with: floor spawn {room['name']}"}
    session = floor.session_by_sid(agent['id'])
    if not session:
        return {'ok': False, 'reason': 'unknown-session', 'detail': 'That session left the floor.'}
    sent_at = time.time()
    result = floor.send_to_session(session, text)
    return dict(result, project=room['name'], agent=agent['id'], sent_at=sent_at)


def wait(floor, agent_id, since=0.0, timeout=900.0, poll=1.0, clock=time.time, sleep=time.sleep):
    """Block until the agent took a prompt after `since` and then settled; report its reply."""
    deadline = clock() + timeout
    while True:
        session = floor.session_by_sid(agent_id)
        if not session:
            return {'ok': False, 'reason': 'unknown-session', 'agent': agent_id}
        if session.get('prompt_ts', 0) >= since and session['state'] in SETTLED:
            say = floor.last_assistant_text(session['tp']) or session['say']
            return {'ok': True, 'agent': agent_id, 'state': session['state'], 'say': say,
                    'msg': session['msg']}
        if clock() >= deadline:
            return {'ok': False, 'reason': 'timeout', 'agent': agent_id, 'state': session['state']}
        sleep(poll)


def spawn_argv(directory, host, prompt, inside_tmux, session_exists):
    # One quoted command string: tmux runs it through sh on every version.
    agent = [shlex.join([host] + ([prompt] if prompt else []))]
    name = Path(directory).name or 'agent'
    if inside_tmux:
        return ['tmux', 'new-window', '-d', '-n', name, '-c', directory] + agent
    if session_exists:
        return ['tmux', 'new-window', '-d', '-t', TMUX_SESSION + ':', '-n', name, '-c', directory] + agent
    return ['tmux', 'new-session', '-d', '-s', TMUX_SESSION, '-n', name, '-c', directory] + agent


def spawn(floor, target, host='claude', prompt=''):
    if host not in SPAWN_HOSTS:
        return {'ok': False, 'reason': 'bad-host', 'detail': 'Start claude or codex.'}
    prompt = clean_text(prompt)
    if len(prompt) > 8000 or prompt.startswith('-'):
        return {'ok': False, 'reason': 'invalid-text',
                'detail': 'Use a prompt of at most 8,000 characters that does not start with "-".'}
    path = Path(target).expanduser()
    if target.startswith(('/', '~', '.')) or os.sep in target or '/' in target:
        if not path.is_dir():
            return {'ok': False, 'reason': 'unknown-project', 'detail': f'{target} is not a folder.'}
        directory = str(path.resolve())
    else:
        room, error = resolve(target, floor.reduce_state()['rooms'])
        if error:
            return {'ok': False, 'reason': 'unknown-project',
                    'detail': error + ' Pass the project folder path instead.'}
        directory = room['cwd']
    if not shutil.which('tmux') or not shutil.which(host):
        return {'ok': False, 'reason': 'missing-tool', 'detail': f'Starting a session needs tmux and {host} on PATH.'}
    inside = bool(os.environ.get('TMUX'))
    try:
        exists = not inside and subprocess.run(['tmux', 'has-session', '-t', TMUX_SESSION],
                                               capture_output=True, timeout=3).returncode == 0
        argv = spawn_argv(directory, host, prompt, inside, exists)
        subprocess.run(argv, check=True, capture_output=True, timeout=5)
    except (OSError, subprocess.SubprocessError):
        return {'ok': False, 'reason': 'tmux-error', 'detail': 'tmux could not open the window.'}
    where = 'this tmux session' if inside else f'tmux session "{TMUX_SESSION}"'
    return {'ok': True, 'cwd': directory, 'host': host, 'window': Path(directory).name, 'where': where}


def main(argv, floor):
    parser = argparse.ArgumentParser(prog='floor', description=__doc__)
    verbs = parser.add_subparsers(dest='verb', required=True)
    verbs.add_parser('who', help='list projects and agents')
    p = verbs.add_parser('send', help='send a prompt to a project agent')
    p.add_argument('target')
    p.add_argument('text', nargs='+')
    p.add_argument('--wait', action='store_true', help='block until the agent settles')
    p.add_argument('--timeout', type=float, default=900)
    p.add_argument('--not', dest='exclude', help='never send to this session id (the caller)')
    p = verbs.add_parser('wait', help='wait for an agent to settle')
    p.add_argument('agent')
    p.add_argument('--since', type=float, default=0.0)
    p.add_argument('--timeout', type=float, default=900)
    p = verbs.add_parser('spawn', help='start a session for a project in tmux')
    p.add_argument('target')
    p.add_argument('--host', choices=SPAWN_HOSTS, default='claude')
    p.add_argument('--prompt', default='')
    args = parser.parse_args(argv)
    if args.verb == 'who':
        print(who(floor))
        return 0
    if args.verb == 'send':
        result = send(floor, args.target, ' '.join(args.text), args.exclude)
        if result['ok'] and args.wait:
            result['reply'] = wait(floor, result['agent'], result['sent_at'], args.timeout)
    elif args.verb == 'wait':
        result = wait(floor, args.agent, args.since, args.timeout)
    else:
        result = spawn(floor, args.target, args.host, args.prompt)
    print(json.dumps(result))
    return 0 if result['ok'] else 1
