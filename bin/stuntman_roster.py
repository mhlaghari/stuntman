#!/usr/bin/env python3
"""Stuntman agent roster — managed block for scaffolded instruction files.

Invoked by bin/scaffold once for the selected contracts after the memory
contract is ensured. Captures the worker-CLI inventory once, then applies an
identical managed block to each contract path.

Standard library only. No model inference calls. No credentials reads.
Discovery only runs:
  - `opencode models` and `agy models` (timeout <= 5s each, stdout parsed for
    strict model IDs only; stderr captured but never written to any file)
  - read of $CODEX_HOME/models_cache.json or ~/.codex/models_cache.json
    (size/exception guarded; slugs validated; no other contents copied)
  - `shutil.which` presence checks for the five worker CLIs
  - no discovery for muse here beyond pointing at `muse exec --help`

Block markers: <!-- stuntman:agents:start --> ... <!-- stuntman:agents:end -->
  - On rerun only the well-formed managed block is replaced;
    surrounding user content is preserved byte-for-byte.
  - duplicate/reversed/unmatched agent markers: leave that file untouched
    with a warning on stderr.
  - no timestamp, so identical inventory is idempotent.
"""
import json
import os
import re
import shutil
import subprocess
import sys

START = "<!-- stuntman:agents:start -->"
END = "<!-- stuntman:agents:end -->"

BACKENDS = ("claude", "opencode", "codex", "agy", "muse")

# Strict model-ID format: dot/underscore/hyphen/slash segments, alnum ends.
_SEG = r"[A-Za-z0-9](?:[A-Za-z0-9._\-]{0,62}[A-Za-z0-9])?"
_ID_RE = re.compile(r"^" + _SEG + r"(?:/" + _SEG + r")*$")

MAX_IDS_PER_CATALOG = 200
MAX_CODEX_CACHE_BYTES = 512 * 1024
DISCOVERY_TIMEOUT = 5

ROLES = {
    "claude": "executor via stunt (local proxy)",
    "opencode": "executor via stunt",
    "codex": "Astra planner; other Codex models can be executors via stunt",
    "agy": "executor via stunt",
    "muse": "executor via stunt",
}

PREFLIGHT = {
    "claude": "`fcc-server`, then `claude --help`",
    "opencode": "`opencode models` / `opencode auth login`",
    "codex": "`codex login status` / `codex exec --help` (cache: `$CODEX_HOME/models_cache.json` or `~/.codex/models_cache.json`)",
    "agy": "`agy models`",
    "muse": "`muse exec --help`",
}


def _is_valid_id(token):
    if not isinstance(token, str):
        return False
    token = token.strip()
    if not token or len(token) > 128:
        return False
    return bool(_ID_RE.match(token))


def _parse_id_lines(output, require_slash):
    """Parse stdout where each line (agy: text before tab) must fully match."""
    found = []
    for raw in output.splitlines():
        field = raw.split("\t")[0].strip() if "\t" in raw else raw.strip()
        if not field:
            continue
        if require_slash and "/" not in field:
            continue
        if _is_valid_id(field):
            found.append(field)
    # Deduplicate, stable sorted, cap.
    unique = sorted(set(found))
    truncated = len(unique) > MAX_IDS_PER_CATALOG
    return unique[:MAX_IDS_PER_CATALOG], truncated


def _run_models(cli, args):
    """Run `<cli> models` with timeout; return (stdout, ok). Stderr discarded."""
    try:
        proc = subprocess.run(
            [cli] + args,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=DISCOVERY_TIMEOUT,
        )
    except (FileNotFoundError, OSError, subprocess.TimeoutExpired):
        return "", False
    except Exception:
        return "", False
    if proc.returncode != 0:
        return "", False
    return proc.stdout or "", True


def _codex_cache_path():
    home_cache = os.path.join(os.path.expanduser("~"), ".codex", "models_cache.json")
    env_home = os.environ.get("CODEX_HOME")
    if env_home:
        return os.path.join(env_home, "models_cache.json")
    return home_cache


def _collect_codex_slugs(data):
    """Extract slugs from the Codex models cache.

    Exact schema only: a top-level dict with a `models` list whose entries
    are dicts carrying an exact `slug` string. Everything else — bare
    strings, unrelated id/name arrays, supported_reasoning_levels,
    model_messages, metadata — is ignored, so non-model contents can never
    become catalog entries.
    """
    if not isinstance(data, dict):
        return []
    models = data.get("models")
    if not isinstance(models, list):
        return []
    found = []
    for entry in models:
        if not isinstance(entry, dict):
            continue
        slug = entry.get("slug")
        if isinstance(slug, str):
            token = slug.strip()
            if _is_valid_id(token):
                found.append(token)
    return found


def discover():
    """Capture inventory once. Never raises; failures become 'unavailable'."""
    installed = {}
    for backend in BACKENDS:
        try:
            installed[backend] = shutil.which(backend) is not None
        except Exception:
            installed[backend] = False

    catalogs = {}

    if installed.get("opencode"):
        out, ok = _run_models("opencode", ["models"])
        if ok:
            ids, truncated = _parse_id_lines(out, require_slash=True)
            catalogs["opencode"] = {"ids": ids, "truncated": truncated, "ok": True}
        else:
            catalogs["opencode"] = {"ids": [], "truncated": False, "ok": False}
    else:
        catalogs["opencode"] = {"ids": [], "truncated": False, "ok": False, "missing_cli": True}

    if installed.get("agy"):
        out, ok = _run_models("agy", ["models"])
        if ok:
            ids, truncated = _parse_id_lines(out, require_slash=False)
            catalogs["agy"] = {"ids": ids, "truncated": truncated, "ok": True}
        else:
            catalogs["agy"] = {"ids": [], "truncated": False, "ok": False}
    else:
        catalogs["agy"] = {"ids": [], "truncated": False, "ok": False, "missing_cli": True}

    # Codex: local cache file only, never a model call.
    cache_path = _codex_cache_path()
    try:
        size = os.path.getsize(cache_path)
        if size <= MAX_CODEX_CACHE_BYTES:
            with open(cache_path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            valid = sorted(set(s for s in _collect_codex_slugs(data) if _is_valid_id(s)))
            catalogs["codex"] = {
                "ids": valid[:MAX_IDS_PER_CATALOG],
                "truncated": len(valid) > MAX_IDS_PER_CATALOG,
                "ok": True,
            }
        else:
            catalogs["codex"] = {"ids": [], "truncated": False, "ok": False}
    except (OSError, ValueError, MemoryError):
        catalogs["codex"] = {"ids": [], "truncated": False, "ok": False}
    except Exception:
        catalogs["codex"] = {"ids": [], "truncated": False, "ok": False}

    return {"installed": installed, "catalogs": catalogs}


def _format_ids(ids, truncated):
    if not ids:
        return "_none discovered_"
    lines = [""] + ["- `%s`" % i for i in ids]
    if truncated:
        lines.append("")
        lines.append(
            "_list truncated at %d entries; run the manual discovery command for the full catalog._"
            % MAX_IDS_PER_CATALOG
        )
    return "\n".join(lines)


def _catalog_lines(title, entry, empty_msg, missing_msg):
    """Render one catalog section; failures stay 'unavailable', never abort."""
    out = [title]
    if entry.get("ok") and entry.get("ids"):
        out.append(_format_ids(entry["ids"], entry.get("truncated", False)))
    elif entry.get("ok"):
        out.append(empty_msg)
    else:
        out.append(missing_msg)
    out.append("")
    return out


def render_block(inv):
    installed = inv["installed"]
    catalogs = inv["catalogs"]
    lines = []
    lines.append(START)
    lines.append("## Stuntman agent roster (managed — do not edit inside this block)")
    lines.append("")
    lines.append(
        "Fable (Claude Code) and GPT/Astra (Codex) are the preferred specification"
        " writers and reviewers. Every other available model is an executor through"
        " `stunt`. These are role preferences, not proof of availability and not"
        " automatic login or routing. An explicit user preference always wins: keep"
        " the current host when a preferred planner is not available, and never"
        " silently switch subscriptions or models."
    )
    lines.append("")
    lines.append(
        "Installed means the CLI was found on `PATH`; it does **not** mean you are"
        " authenticated. Model catalogs below are point-in-time discovery snapshots;"
        " they are **not** entitlement or price guarantees. The `claude` worker"
        " backend is a proxy executor invoked through `stunt` and is distinct from"
        " Fable in the host session."
    )
    lines.append("")
    lines.append("| backend | status | execution role | discovery / preflight |")
    lines.append("| --- | --- | --- | --- |")
    for backend in BACKENDS:
        status = "installed" if installed.get(backend) else "missing"
        lines.append(
            "| `%s` | %s | %s | %s |"
            % (backend, status, ROLES[backend], PREFLIGHT[backend])
        )
    lines.append("")
    lines.append("### Model catalogs (snapshot; rerun scaffold to refresh)")
    lines.append("")
    lines.extend(_catalog_lines(
        "**opencode** (`opencode models`; login: `opencode auth login`):",
        catalogs.get("opencode", {"ids": [], "ok": False}),
        "_none discovered; run `opencode models` manually._",
        "_unavailable; run `opencode models` manually._",
    ))
    lines.extend(_catalog_lines(
        "**agy** (`agy models`):",
        catalogs.get("agy", {"ids": [], "ok": False}),
        "_none discovered; run `agy models` manually._",
        "_unavailable; run `agy models` manually._",
    ))
    lines.extend(_catalog_lines(
        "**codex** (local cache `$CODEX_HOME/models_cache.json` or"
        " `~/.codex/models_cache.json`; never a model call):",
        catalogs.get("codex", {"ids": [], "ok": False}),
        "_none discovered in the local cache._",
        "_unavailable; no readable local cache — see `codex exec --help`._",
    ))
    # muse + claude backend notes
    lines.append(
        "**muse**: no model discovery is performed here; check `muse exec --help`"
        " for the accepted model selection. That help text describes flags, not"
        " authentication certainty."
    )
    lines.append("")
    lines.append(
        "**claude backend**: proxy executor only (for example the local proxy on"
        " `:8082`); it has no model catalog in this block."
    )
    lines.append("")
    lines.append("### Delegation")
    lines.append("")
    lines.append("Model-pinned execution through `stunt`:")
    lines.append("")
    lines.append("```bash")
    lines.append(
        'STUNTMAN_WORKER=opencode STUNTMAN_MODEL=provider/model "$STUNTMAN_ROOT/bin/stunt" exec "<spec>"'
    )
    lines.append("```")
    lines.append("")
    lines.append(
        "Select a current zero-price model only after discovery plus a rate/price"
        " check; there is no automatic paid fallback. Rerunning the scaffolder"
        " refreshes this block's inventory snapshot in place and never installs"
        " models."
    )
    lines.append(END)
    return "\n".join(lines) + "\n"


def apply_block(path, block):
    """Apply block to one file. Returns 'appended'|'replaced'|'skipped'."""
    with open(path, "rb") as fh:
        raw = fh.read()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        print("warning: %s is not UTF-8; roster left untouched" % path, file=sys.stderr)
        return "skipped"
    n_start = text.count(START)
    n_end = text.count(END)
    if n_start == 0 and n_end == 0:
        if text == "":
            new_text = block
        elif text.endswith("\n"):
            new_text = text + "\n" + block
        else:
            new_text = text + "\n\n" + block
        with open(path, "wb") as fh:
            fh.write(new_text.encode("utf-8"))
        return "appended"
    if n_start == 1 and n_end == 1 and text.index(START) < text.index(END):
        pre = text[: text.index(START)]
        post = text[text.index(END) + len(END):]
        # Replace only the managed block; pre/post bytes pass through
        # untouched (no trailing-newline fixup — a suffix without a final
        # newline, or CRLF line endings, must survive a refresh byte-for-byte).
        new_text = pre + block.rstrip("\n") + post
        with open(path, "wb") as fh:
            fh.write(new_text.encode("utf-8"))
        return "replaced"
    print(
        "warning: %s has duplicate/reversed/unmatched roster markers; roster left untouched" % path,
        file=sys.stderr,
    )
    return "skipped"


def main(argv):
    paths = argv[1:]
    if not paths:
        print("usage: stuntman_roster.py <contract> [<contract> ...]", file=sys.stderr)
        return 2
    for path in paths:
        if not os.path.isfile(path):
            print("error: no such file: %s" % path, file=sys.stderr)
            return 1
    inv = discover()
    block = render_block(inv)
    for path in paths:
        result = apply_block(path, block)
        if result == "appended":
            print("• appended agent roster to %s" % os.path.basename(path))
        elif result == "replaced":
            print("• refreshed agent roster in %s" % os.path.basename(path))
        else:
            print("• %s roster left untouched (see warning)" % os.path.basename(path))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
