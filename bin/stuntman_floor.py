"""Shared fail-open event writer for floor hooks and Stuntman workers."""
import json
import os
from pathlib import Path
import subprocess
import sys
import time

ROTATE_BYTES = 5_000_000
IS_WINDOWS = sys.platform == 'win32'

if IS_WINDOWS:
    import msvcrt
else:
    import fcntl


def _lock_exclusive(handle):
    """Non-blocking exclusive lock, raising BlockingIOError when already held."""
    if not IS_WINDOWS:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        return
    try:
        msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
    except OSError as error:
        raise BlockingIOError(str(error)) from error


def process_identity(pid):
    """Capture birth time as well as PID; a reused PID is a different process."""
    if IS_WINDOWS:
        return None  # No ps, and terminal send needs tmux, so nothing consumes it.
    try:
        result = subprocess.run(['ps', '-p', str(int(pid)), '-o', 'lstart=,comm='],
                                capture_output=True, text=True, timeout=0.5)
        return result.stdout.strip() if result.returncode == 0 else None
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return None


def emit(event):
    """One locked append; rotation shares the same lock, so writers lose no tail."""
    try:
        directory = Path(os.environ.get('STUNTMAN_FLOOR_DIR', str(Path.home() / '.stuntman/floor')))
        directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        event = dict(event, ts=event.get('ts', time.time()))
        line = (json.dumps(event, ensure_ascii=False) + '\n').encode()
        with (directory / 'events.lock').open('a') as lock:
            deadline = time.monotonic() + 0.05
            while True:
                try:
                    _lock_exclusive(lock)
                    break
                except BlockingIOError:
                    if time.monotonic() >= deadline:
                        return
                    time.sleep(0.005)
            path = directory / 'events.jsonl'
            if path.exists() and path.stat().st_size > ROTATE_BYTES:
                try:
                    with path.open('rb') as stream:
                        stream.seek(-ROTATE_BYTES // 2, os.SEEK_END)
                        stream.readline()
                        tail = stream.read()
                    temporary = directory / 'events.rotate'
                    temporary.write_bytes(tail)
                    temporary.chmod(0o600)
                    temporary.replace(path)
                except OSError:
                    pass  # Windows blocks replacing a log the board holds open; keep appending.
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
            try:
                os.write(fd, line)
            finally:
                os.close(fd)
    except (OSError, ValueError, TypeError):
        pass  # Monitoring never blocks the underlying agent.


def normalize_hook(data, parent_pid):
    if not isinstance(data, dict) or not isinstance(data.get('session_id'), str) or not data['session_id']:
        return None
    worker_id = os.environ.get('STUNTMAN_FLOOR_WORKER_ID')
    host = os.environ.get('STUNTMAN_FLOOR_HOST')
    if host not in ('claude', 'codex', 'opencode', 'agy', 'muse'):
        host = 'codex' if (os.environ.get('PLUGIN_ROOT') or data.get('turn_id')
                           or '/.codex/' in str(data.get('transcript_path', ''))) else 'claude'
    # Some hosts execute hooks through a short-lived shell. Retain the agent
    # ancestor instead; a dead hook shell must not make a live TUI unreachable.
    identity = process_identity(parent_pid)
    for _ in range(5):
        if not identity or any(name in identity.rsplit(' ', 1)[-1].lower() for name in (host, 'node')):
            break
        try:
            parent = subprocess.run(['ps', '-p', str(parent_pid), '-o', 'ppid='],
                                    capture_output=True, text=True, timeout=0.5)
            candidate = int(parent.stdout.strip())
            if candidate <= 1:
                break
            parent_pid, identity = candidate, process_identity(candidate)
        except (OSError, ValueError, subprocess.TimeoutExpired):
            break
    tool_input = data.get('tool_input') or {}
    if not isinstance(tool_input, dict):
        tool_input = {}
    def short(value, limit):
        return value[:limit] if isinstance(value, str) else None
    return {
        'evt': short(data.get('hook_event_name'), 60), 'host': host,
        'sid': worker_id or data['session_id'], 'session_id': data['session_id'],
        'worker': bool(worker_id), 'cwd': short(data.get('cwd'), 4096),
        'tool': short(data.get('tool_name'), 120), 'call_id': short(data.get('tool_use_id'), 200),
        'agent_id': short(data.get('agent_id'), 200),
        'desc': short(tool_input.get('description') or data.get('agent_type'), 160),
        'msg': short(data.get('message'), 300),
        'say': short(data.get('last_assistant_message'), 200),
        'notification_type': short(data.get('notification_type'), 100),
        'tp': short(data.get('transcript_path'), 4096),
        'ppid': parent_pid, 'process_identity': identity,
    }
