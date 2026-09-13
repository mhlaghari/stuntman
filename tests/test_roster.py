"""Roster block tests; all discovery is mocked — no live CLI or model calls."""
import importlib.util
import os
import stat
import subprocess
import tempfile
from pathlib import Path
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "stuntman_roster", str(ROOT / "bin" / "stuntman_roster.py"))
roster = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(roster)

START = "<!-- stuntman:agents:start -->"
END = "<!-- stuntman:agents:end -->"


def run(*args, cwd=None, env=None, input=None):
    return subprocess.run([str(a) for a in args], cwd=cwd, env=env, input=input,
                          text=True, capture_output=True, timeout=20)


def shadow_env(base_env, isol):
    """Shadow worker CLIs with failing fakes; empty Codex cache dir."""
    fakebin = Path(isol) / "fakebin"
    fakebin.mkdir(parents=True, exist_ok=True)
    for name in ("claude", "opencode", "codex", "agy", "muse"):
        fake = fakebin / name
        fake.write_text("#!/bin/sh\nexit 1\n")
        fake.chmod(0o755)
    codex_home = Path(isol) / "codex-home"
    codex_home.mkdir(parents=True, exist_ok=True)
    env = base_env.copy()
    env["PATH"] = str(fakebin) + os.pathsep + env.get("PATH", "")
    env["CODEX_HOME"] = str(codex_home)
    env.pop("STUNTMAN_HOST", None)
    return env


def extract_block(text):
    return text[text.index(START):text.index(END) + len(END)]


class RosterBlockTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="roster ")
        self.addCleanup(self.temp.cleanup)
        self.isol = tempfile.TemporaryDirectory(prefix="roster-isol ")
        self.addCleanup(self.isol.cleanup)
        self.project = Path(self.temp.name) / "proj"
        self.project.mkdir()

    def scaffold(self, *args):
        env = shadow_env(os.environ, self.isol.name)
        result = run(ROOT / "bin" / "scaffold", *args, self.project, env=env)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result

    def test_prefix_suffix_preserved_byte_for_byte(self):
        target = self.project / "CLAUDE.md"
        target.write_bytes(b"PREFIX line\nsecond\n")
        with open(target, "ab") as fh:
            fh.write(b"\nSUFFIX tail\n")
        # Insert roster between prefix and suffix via two applies: first append,
        # then manually sandwich to simulate user content on both sides.
        before = target.read_bytes()
        inv = {"installed": {b: False for b in roster.BACKENDS},
               "catalogs": {"opencode": {"ids": [], "ok": False},
                            "agy": {"ids": [], "ok": False},
                            "codex": {"ids": [], "ok": False}}}
        block = roster.render_block(inv)
        # Simulate user file with explicit suffix after block.
        target.write_text("USER PREFIX\n" + block + "USER SUFFIX\n")
        original = target.read_bytes()
        self.assertEqual(roster.apply_block(str(target), block), "replaced")
        self.assertEqual(target.read_bytes(), original)
        text = target.read_text()
        self.assertTrue(text.startswith("USER PREFIX\n"))
        self.assertTrue(text.endswith("USER SUFFIX\n"))
        self.assertEqual(text.count(START), 1)
        self.assertEqual(text.count(END), 1)
        self.assertNotEqual(before, target.read_bytes())

    def test_initial_and_repeat_both_hosts_deterministic(self):
        self.scaffold("--host", "both")
        first = {p.name: p.read_bytes() for p in self.project.iterdir()}
        self.assertIn("CLAUDE.md", first)
        self.assertIn("AGENTS.md", first)
        for name in ("CLAUDE.md", "AGENTS.md"):
            text = (self.project / name).read_text()
            self.assertEqual(text.count(START), 1, name)
            self.assertEqual(text.count(END), 1, name)
        block_a = extract_block((self.project / "CLAUDE.md").read_text())
        block_b = extract_block((self.project / "AGENTS.md").read_text())
        # One inventory snapshot shared by both hosts.
        self.assertEqual(block_a, block_b)
        self.scaffold("--host", "both")
        second = {p.name: p.read_bytes() for p in self.project.iterdir()}
        self.assertEqual(first, second)

    def test_legacy_scaffold_retains_content_gets_one_roster(self):
        original = "<!-- stuntman:handoff:start -->\nExisting contract\n"
        (self.project / "AGENTS.md").write_text(original)
        self.scaffold("--host", "codex")
        text = (self.project / "AGENTS.md").read_text()
        self.assertTrue(text.startswith(original))
        self.assertEqual(text.count("<!-- stuntman:handoff:start -->"), 1)
        self.assertEqual(text.count(START), 1)
        self.assertEqual(text.count(END), 1)
        self.assertFalse((self.project / "CLAUDE.md").exists())

    def test_changed_inventory_replaces_only_own_block(self):
        target = self.project / "CLAUDE.md"
        target.write_text("USER PREFIX\n")
        inv_a = {"installed": {b: False for b in roster.BACKENDS},
                 "catalogs": {"opencode": {"ids": [], "ok": False},
                              "agy": {"ids": [], "ok": False},
                              "codex": {"ids": [], "ok": False}}}
        block_a = roster.render_block(inv_a)
        self.assertEqual(roster.apply_block(str(target), block_a), "appended")
        with open(target, "a") as fh:
            fh.write("USER SUFFIX\n")
        inv_b = {"installed": {b: True for b in roster.BACKENDS},
                 "catalogs": {"opencode": {"ids": ["openai/gpt-5"], "ok": True,
                                           "truncated": False},
                              "agy": {"ids": [], "ok": False},
                              "codex": {"ids": [], "ok": False}}}
        block_b = roster.render_block(inv_b)
        self.assertNotEqual(block_a, block_b)
        self.assertEqual(roster.apply_block(str(target), block_b), "replaced")
        text = target.read_text()
        self.assertTrue(text.startswith("USER PREFIX\n"))
        self.assertTrue(text.endswith("USER SUFFIX\n"))
        self.assertEqual(text.count(START), 1)
        self.assertEqual(text.count(END), 1)
        self.assertIn("openai/gpt-5", text)
        self.assertIn(extract_block(block_b), text)

    def test_suffix_without_final_newline_survives_refresh(self):
        target = self.project / "CLAUDE.md"
        inv_a = {"installed": {b: False for b in roster.BACKENDS},
                 "catalogs": {"opencode": {"ids": [], "ok": False},
                              "agy": {"ids": [], "ok": False},
                              "codex": {"ids": [], "ok": False}}}
        block_a = roster.render_block(inv_a)
        # Suffix with no trailing newline glued right after the block.
        target.write_bytes(("USER PREFIX\n" + block_a + "USER SUFFIX no newline").encode())
        inv_b = {"installed": {b: True for b in roster.BACKENDS},
                 "catalogs": {"opencode": {"ids": ["openai/gpt-5"], "ok": True,
                                           "truncated": False},
                              "agy": {"ids": [], "ok": False},
                              "codex": {"ids": [], "ok": False}}}
        block_b = roster.render_block(inv_b)
        self.assertEqual(roster.apply_block(str(target), block_b), "replaced")
        raw = target.read_bytes()
        self.assertTrue(raw.startswith(b"USER PREFIX\n"))
        self.assertTrue(raw.endswith(b"USER SUFFIX no newline"))
        self.assertEqual(raw.count(START.encode()), 1)
        self.assertEqual(raw.count(END.encode()), 1)
        self.assertIn(b"openai/gpt-5", raw)

    def test_crlf_prefix_suffix_retain_exact_bytes(self):
        target = self.project / "CLAUDE.md"
        inv_a = {"installed": {b: False for b in roster.BACKENDS},
                 "catalogs": {"opencode": {"ids": [], "ok": False},
                              "agy": {"ids": [], "ok": False},
                              "codex": {"ids": [], "ok": False}}}
        block_a = roster.render_block(inv_a)
        pre = b"USER PREFIX\r\nsecond line\r\n"
        post = b"\r\nUSER SUFFIX\r\ntail\r\n"
        target.write_bytes(pre + block_a.encode() + post)
        inv_b = {"installed": {b: True for b in roster.BACKENDS},
                 "catalogs": {"opencode": {"ids": [], "ok": False},
                              "agy": {"ids": ["gemini-3.7-flash-high"], "ok": True,
                                      "truncated": False},
                              "codex": {"ids": [], "ok": False}}}
        block_b = roster.render_block(inv_b)
        self.assertEqual(roster.apply_block(str(target), block_b), "replaced")
        raw = target.read_bytes()
        self.assertTrue(raw.startswith(pre))
        self.assertTrue(raw.endswith(post))
        self.assertEqual(raw.count(START.encode()), 1)
        self.assertIn(b"gemini-3.7-flash-high", raw)

    def test_malformed_markers_preserve_file(self):
        cases = [
            "a\n" + START + "\nbody\n" + START + "\nmore\n" + END + "\nb\n",
            "a\n" + END + "\nbody\n" + START + "\nb\n",
            "a\n" + START + "\nno end here\n",
            "a\nno start here\n" + END + "\nb\n",
            "a\n" + START + "\nx\n" + END + "\ny\n" + START + "\nz\n" + END + "\n",
        ]
        inv = {"installed": {b: False for b in roster.BACKENDS},
               "catalogs": {"opencode": {"ids": [], "ok": False},
                            "agy": {"ids": [], "ok": False},
                            "codex": {"ids": [], "ok": False}}}
        block = roster.render_block(inv)
        for i, content in enumerate(cases):
            with self.subTest(case=i):
                target = self.project / ("bad-%d.md" % i)
                target.write_bytes(content.encode())
                self.assertEqual(roster.apply_block(str(target), block), "skipped")
                self.assertEqual(target.read_bytes(), content.encode())

    def test_catalog_timeout_and_malformed_stdout_never_serialized(self):
        import subprocess as sp

        def fake_run(cmd, **kwargs):
            if cmd[0] == "opencode":
                raise sp.TimeoutExpired(cmd, timeout=5)
            if cmd[0] == "agy":
                return sp.CompletedProcess(
                    cmd, 0,
                    stdout="hello world\n!!!\n/bad\nprovider/\n"
                           "just words here\nopenai\n"
                           "gemini-3.7-flash-high\tEXTRA COL AFTER TAB\n"
                           "bad id with spaces\n",
                    stderr="SECRET-STDERR-TOKEN-XYZ")
            raise AssertionError(cmd)

        with mock.patch.object(roster.shutil, "which", return_value="/fake/bin"), \
             mock.patch.object(roster.subprocess, "run", side_effect=fake_run):
            with mock.patch.dict(os.environ, {"CODEX_HOME": str(Path(self.isol.name) / "no-cache")}):
                inv = roster.discover()
        block = roster.render_block(inv)
        for bad in ("hello world", "!!!", "just words",
                    "bad id with spaces", "SECRET-STDERR-TOKEN-XYZ"):
            self.assertNotIn(bad, block)
        # Bullet form for tokens that also appear in the delegation example
        # (`STUNTMAN_MODEL=provider/model`) or near other block text.
        self.assertNotIn("- `/bad`", block)
        self.assertNotIn("- `provider/`", block)
        # Timeout on opencode -> unavailable + manual command, no abort.
        self.assertIn("`opencode models`", block)
        self.assertIn("unavailable", block)
        # agy valid pre-tab slug survives; bare 'openai' without tab is a
        # well-formed single-segment ID so it may also survive — but the
        # multi-word lines must never be serialized whole.
        self.assertIn("gemini-3.7-flash-high", block)

    def test_malformed_opencode_stdout_rejected_and_stderr_never_copied(self):
        import subprocess as sp

        def fake_run(cmd, **kwargs):
            return sp.CompletedProcess(
                cmd, 0,
                stdout="not a model !!!\n/bad\n\n   \nopenai/gpt-5 extra column\n",
                stderr="CREDENTIAL-SHOULD-NEVER-APPEAR-123")
            raise AssertionError(cmd)

        with mock.patch.object(roster.shutil, "which",
                               side_effect=lambda c: "/fake" if c == "opencode" else None), \
             mock.patch.object(roster.subprocess, "run", side_effect=fake_run):
            with mock.patch.dict(os.environ, {"CODEX_HOME": str(Path(self.isol.name) / "no-cache")}):
                inv = roster.discover()
        block = roster.render_block(inv)
        self.assertNotIn("not a model", block)
        self.assertNotIn("CREDENTIAL-SHOULD-NEVER-APPEAR-123", block)
        # 'openai/gpt-5 extra column' is a full-line mismatch -> rejected.
        self.assertNotIn("openai/gpt-5 extra column", block)

    def test_strict_id_format(self):
        ids, _ = roster._parse_id_lines("openai/gpt-5\nhello\n", require_slash=True)
        self.assertEqual(ids, ["openai/gpt-5"])
        ids, _ = roster._parse_id_lines("hello world\n/bad\nprovider/\n", require_slash=False)
        self.assertEqual(ids, [])
        ids, _ = roster._parse_id_lines("gemini-3.7-flash-high\n", require_slash=False)
        self.assertEqual(ids, ["gemini-3.7-flash-high"])

    def test_codex_cache_exact_schema_only(self):
        import json
        cache_dir = Path(self.isol.name) / "codex-home"
        cache_dir.mkdir(parents=True, exist_ok=True)
        # Mirrors the real Codex cache shape: top-level `models` list of
        # dicts with `slug`, alongside reasoning levels, message metadata,
        # unrelated id/name arrays, and bare strings — none of which are
        # models. Written with json.dump so the fixture is always valid JSON.
        payload = {
            "models": [
                {"slug": "gpt-5.4-codex",
                 "supported_reasoning_levels": ["low", "high"],
                 "model_messages": {"info": "detail"}},
                {"slug": "gpt-5-codex"},
                {"slug": "not well formed !!"},
                {"name": "valid-format-but-wrong-key",
                 "id": "also-valid-format-but-wrong-key"},
                "bare-string-never-a-model",
            ],
            "supported_reasoning_levels": ["low"],
            "model_messages": {"unrelated": True},
            "ids": ["unrelated-id-array-entry"],
            "names": ["unrelated-name-array-entry"],
        }
        with open(cache_dir / "models_cache.json", "w", encoding="utf-8") as fh:
            json.dump(payload, fh)
        with mock.patch.object(roster.shutil, "which", return_value=None), \
             mock.patch.object(roster.subprocess, "run",
                               side_effect=AssertionError("no CLI calls")):
            with mock.patch.dict(os.environ, {"CODEX_HOME": str(cache_dir)}):
                inv = roster.discover()
        block = roster.render_block(inv)
        self.assertIn("- `gpt-5.4-codex`", block)
        self.assertIn("- `gpt-5-codex`", block)
        for bad in ("not well formed", "valid-format-but-wrong-key",
                    "also-valid-format-but-wrong-key",
                    "bare-string-never-a-model", "unrelated-id-array-entry",
                    "unrelated-name-array-entry", "supported_reasoning_levels",
                    "model_messages"):
            self.assertNotIn(bad, block)

    def test_codex_cache_missing_malformed_oversize_are_unavailable(self):
        import json
        # Missing cache file.
        with mock.patch.object(roster.shutil, "which", return_value=None):
            with mock.patch.dict(os.environ, {"CODEX_HOME": str(Path(self.isol.name) / "no-cache")}):
                inv = roster.discover()
        self.assertFalse(inv["catalogs"]["codex"]["ok"])
        self.assertIn("no readable local cache",
                      roster.render_block(inv))
        # Malformed JSON.
        cache_dir = Path(self.isol.name) / "codex-bad"
        cache_dir.mkdir(parents=True, exist_ok=True)
        (cache_dir / "models_cache.json").write_text("{not valid json\n")
        with mock.patch.object(roster.shutil, "which", return_value=None):
            with mock.patch.dict(os.environ, {"CODEX_HOME": str(cache_dir)}):
                inv = roster.discover()
        self.assertFalse(inv["catalogs"]["codex"]["ok"])
        # Oversize cache is skipped without reading.
        big_dir = Path(self.isol.name) / "codex-big"
        big_dir.mkdir(parents=True, exist_ok=True)
        payload = {"models": [{"slug": "gpt-5-codex"}]}
        with open(big_dir / "models_cache.json", "w", encoding="utf-8") as fh:
            json.dump(payload, fh)
        with mock.patch.object(roster.shutil, "which", return_value=None), \
             mock.patch.object(roster, "MAX_CODEX_CACHE_BYTES", 10):
            with mock.patch.dict(os.environ, {"CODEX_HOME": str(big_dir)}):
                inv = roster.discover()
        self.assertFalse(inv["catalogs"]["codex"]["ok"])
        self.assertNotIn("gpt-5-codex", roster.render_block(inv))

    def test_catalog_sorting_dedup_and_cap(self):
        ids, truncated = roster._parse_id_lines(
            "zeta/ai\nbeta/ai\nbeta/ai\nzeta/ai\nalpha/ai\n", require_slash=True)
        self.assertEqual(ids, ["alpha/ai", "beta/ai", "zeta/ai"])
        self.assertFalse(truncated)
        many = "".join("m-%03d/x\n" % i for i in range(10))
        with mock.patch.object(roster, "MAX_IDS_PER_CATALOG", 3):
            ids, truncated = roster._parse_id_lines(many, require_slash=True)
        self.assertEqual(len(ids), 3)
        self.assertTrue(truncated)
        self.assertEqual(ids, sorted(ids))
        block_ids = ["m-009/x", "m-000/x", "m-005/x"]
        inv = {"installed": {b: False for b in roster.BACKENDS},
               "catalogs": {"opencode": {"ids": sorted(block_ids), "ok": True,
                                         "truncated": True},
                            "agy": {"ids": [], "ok": False},
                            "codex": {"ids": [], "ok": False}}}
        block = roster.render_block(inv)
        self.assertIn("truncated at 200 entries", block)

    def test_missing_clis_and_disclaimers(self):
        with mock.patch.object(roster.shutil, "which", return_value=None):
            with mock.patch.dict(os.environ, {"CODEX_HOME": str(Path(self.isol.name) / "no-cache")}):
                inv = roster.discover()
        block = roster.render_block(inv)
        # Table shows missing, never absolute paths.
        self.assertIn("missing", block)
        self.assertNotIn(self.temp.name, block)
        self.assertNotIn(self.isol.name, block)
        for phrase in (
            "preferred specification",
            "Astra planner",
            "other Codex models can be executors",
            "not proof of availability",
            "always wins",
            "never",
            "silently switch",
            "Installed means",
            "does **not** mean you are",
            "authenticated",
            "not** entitlement or price guarantees",
            "distinct from",
            "never installs",
            "no automatic paid fallback",
            "`codex login status`",
            "`muse exec --help`",
            "STUNTMAN_WORKER=opencode",
            'STUNTMAN_MODEL=provider/model',
            '"$STUNTMAN_ROOT/bin/stunt" exec',
        ):
            self.assertIn(phrase, block)


if __name__ == "__main__":
    unittest.main()
