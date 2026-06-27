# 🎬 stuntman

**Claude doesn't do its own stunts.** · [Website](https://mhlaghari.github.io/stuntman/)

Claude Code plans the scene and reviews the take. A near-free model — DeepSeek,
Gemini, Groq, a local Ollama, whatever — takes the hits. Your expensive
subscription tokens go only where intelligence actually matters.

![stuntman demo](docs/assets/demo.gif)

```
  PLAN                EXECUTE               REVIEW              ITERATE
  Claude (sub) ──▶    stunt double ──▶      Claude (sub) ──▶    feedback ↩
  reads the code,     headless Claude       reads the diff,     same worker
  writes a spec       Code instance,        runs the tests      session resumes,
  with zero open      any model via         itself — trusts     fixes in place.
  decisions           a local proxy         nothing             max 2 rounds,
                                                                then Claude
                                                                takes over
```

## Commands

From a normal (subscription) Claude Code session, in any project:

| Command | What it does | Spans |
|---|---|---|
| **`/delegate <task>`** | Claude plans + reviews; a near-free model executes the spec through a local proxy. | cost |
| **`/relay <task>`** | Keeps the cheap worker going across Claude's 5-hour usage limit; Claude resumes at reset. | the rate limit |
| **`/scaffold`** | Stands up a project's self-resuming memory — a `CLAUDE.md` contract + four living docs (HANDOFF · STATUS · SPEC · STRATEGY). | the context boundary |
| **`/handoff`** | Reads those docs and continues exactly where the last session stopped. | new sessions / `/clear` |
| **`/wiki`** | Builds a "second brain" across a folder of projects — an Obsidian vault + a graphify knowledge graph + a live MCP for cross-project recall. | every project |
| **`/launch`** | Fans out a multi-agent workflow — cited competitor research, market sizing, channel ranking, then pricing + positioning + a week-by-week launch playbook, pressure-tested by adversarial critics — into one Product Success Overview (markdown + HTML). | the blank-page launch |

Each is detailed in its own section below.

## The pain point

You pay for a Claude subscription. And then you watch Opus burn through your
usage limits **typing boilerplate** — CRUD endpoints, test scaffolding,
mechanical refactors. Work a model that costs fractions of a cent does just
fine.

The obvious fix — "just use a cheaper model" — fails, because cheap models
are bad at exactly the two things that matter: **deciding what to build** and
**judging whether it's right**. Hand DeepSeek a vague task and you get
confident garbage. Hand it a spec with every decision already made, and it
executes beautifully.

So split the loop:

- **Claude thinks.** It explores your codebase and writes a spec with zero
  design decisions left open. This is where the expensive tokens earn their keep.
- **A free model types.** A second, headless Claude Code instance — same
  harness, same tools, different brain — executes the spec autonomously.
- **Claude checks.** It reads the diff, runs the tests itself, and sends
  review feedback back into the *same worker session* until it passes.

No API credits. The orchestrator runs on the subscription you already pay
for; the worker runs through your own keys on a near-free backend (several
have free tiers).

## The trick

Claude Code respects `ANTHROPIC_BASE_URL`. Point it at a local
Anthropic-compatible proxy ([free-claude-code](https://github.com/Alishahryar1/free-claude-code),
17 backends supported) and you get a fully functional Claude Code whose brain
is any model you want. Run that headlessly (`claude -p --output-format json`)
and your main Claude session can spawn it, parse its results, and drive it
through review rounds (`--resume <session_id>`) — like a senior engineer
managing a very fast, very cheap contractor.

The worker gets its own `CLAUDE_CONFIG_DIR`, so it never touches your
subscription's login or session state.

## Field report

First real run, on a real codebase: Claude picked an open item off the
project's backlog, explored the code, and wrote the spec. DeepSeek executed a
3-file change (new feature flag wired through two modules, plus a test) in
**65 seconds**. Claude's review found zero issues, the full test suite passed,
lint clean. Total Anthropic tokens spent on implementation: **zero**.

## The benchmark: Opus DIY vs. the stunt double

Same task, two paths: build a landing page for this repo (dark cinematic
design, 4-step workflow section, stats, install commands — a real frontend
brief). Path A: Opus does everything itself. Path B: Opus writes the spec,
DeepSeek executes, Opus reviews. Identical brief, measured identically from
`--output-format json` usage.

| | Opus DIY | stuntman |
|---|---|---|
| Claude output tokens | **50,955** | **9,737** (8,782 plan + 955 review) |
| API-equivalent Claude cost | **~$4.92** | **~$0.65** |
| Wall-clock | **18 min — never finished** | **~3 min** (63s execution) |
| Review verdict | n/a (it was the builder) | PASS, zero iterations |
| Result | the slightly nicer page | ~90% of the page, $0 on implementation |

That "never finished" is real: after building the page in ~7 minutes, Opus
spent 11 more minutes verifying its own work in a browser — and deadlocked
clicking its own copy button (`navigator.clipboard.writeText` blocks forever
in a permissionless headless browser). The page was already done. That
self-verification spiral is exactly the expensive-model behavior you're
paying for by the token — and exactly what the harness moves off your bill.

**5.2× the Claude tokens, 7.6× the cost, 6× the wall-clock — for a margin
best described as taste.** And the punchline: the Opus page was the better
artifact, so it's [this repo's actual website](https://mhlaghari.github.io/stuntman/)
— built by the benchmark that proves you usually don't need it.

| DeepSeek (63s, $0 Claude tokens) | Opus (18 min, ~$4.92) |
|---|---|
| ![DeepSeek's page](docs/assets/benchmark-deepseek.jpeg) | ![Opus's page](docs/assets/benchmark-opus.jpeg) |

*(Screenshots taken with reveal animations force-disabled; the gray wash on
DeepSeek's hero is the screenshot hack blowing its 4%-opacity film grain to
100% — the real page is clean.)*

## Install

Prerequisites:

1. [Claude Code](https://claude.com/claude-code) with a subscription (the orchestrator).
2. A worker backend — pick one:

   **Route A — Claude Code worker via [free-claude-code](https://github.com/Alishahryar1/free-claude-code)**
   (same agentic harness as the orchestrator, any of fcc's 17 backends):
   ```bash
   uv tool install free-claude-code
   fcc-init     # pick your backend + paste your key (DeepSeek, OpenRouter, Groq, Ollama…)
   fcc-server   # leave it running (localhost:8082)
   ```

   **Route B — [opencode](https://opencode.ai) worker** (no proxy at all — opencode talks
   to DeepSeek/Groq/Ollama and 75+ providers natively):
   ```bash
   brew install sst/tap/opencode
   opencode auth login          # or export a provider key, e.g. DEEPSEEK_API_KEY
   export STUNTMAN_WORKER=opencode
   export STUNTMAN_MODEL=deepseek/deepseek-v4-flash   # any provider/model opencode knows
   ```

### Option A — Claude Code plugin (recommended)

Inside Claude Code:

```
/plugin marketplace add mhlaghari/stuntman
/plugin install stuntman@stuntman
```

### Option B — plain install script

```bash
git clone https://github.com/mhlaghari/stuntman && cd stuntman && ./install.sh
```

Copies the `/delegate`, `/relay`, `/scaffold`, `/handoff`, `/wiki`, and `/launch`
skills to `~/.claude/skills/` and the `stunt` worker, `window` probe, `scaffold`,
and `wiki` tools to `~/.local/bin/`.

## Usage

From your normal (subscription) Claude Code session, in any project:

```
/delegate add input validation to the upload endpoint
```

What happens:

1. Claude explores the code and writes a self-contained spec (you'll see it).
2. The stunt double executes it headlessly — file edits, running tests, the lot.
3. Claude diffs the work against the spec and runs verification itself.
4. Problems go back to the same worker session as review feedback. After two
   failed rounds, Claude declares the task "heavy" and finishes it personally —
   which is exactly the work you bought the subscription for.

## Choosing your stunt double

Two knobs: `STUNTMAN_WORKER` picks the backend (`claude` via the local proxy —
the default — or `opencode`), `STUNTMAN_MODEL` pins the model:

```bash
# Route A (proxy): any id from the proxy's /v1/models
export STUNTMAN_MODEL="anthropic/deepseek/deepseek-v4-flash"

# Route B (opencode): provider/model, no proxy required
export STUNTMAN_WORKER=opencode
export STUNTMAN_MODEL="deepseek/deepseek-v4-flash"
```

Route A's worker is a full headless Claude Code (same tools and agentic loop
as the orchestrator). Route B trades that harness fidelity for zero proxy
setup — opencode authenticates to providers directly.

Good stunt doubles, roughly in order of bang-per-buck:

| Backend | Why |
|---|---|
| DeepSeek | Strong coder, absurdly cheap |
| Groq / Cerebras | Fast open models, free tiers |
| NVIDIA NIM | Free tier, solid open models |
| Gemini Flash | Cheap, large context |
| Ollama / LM Studio | Literally free, fully local |

## Working across the 5-hour limit

Long autonomous runs eventually hit Claude's 5-hour usage window. `/relay`
spans it automatically. It reads your window — how much is used and the exact
reset time — from the same endpoint `/usage` uses, at **zero token cost** (no
Claude call, safe to poll even while you're capped). Then:

- **While you have headroom**, Claude does its normal plan/review work.
- **When the window caps**, the stunt double keeps going — it bills your own
  near-free key, not Anthropic, so the 5-hour limit never touches it — and a
  handoff is saved to `.stuntman/relay-state.json`.
- **When the window reopens**, the Claude side resumes: hands-free if the reset
  is under ~55 min away (it schedules its own wakeup), or on your next ping for
  longer gaps (a scheduled wakeup is clamped to one hour, and Claude can't wake
  itself mid-blackout).

```
/loop relay this backlog across the limit
```

The probe is useful on its own, too — `window` prints your live 5-hour and
weekly utilization plus reset times as one JSON line.

## Scaffolding project memory

`/delegate` saves cost and `/relay` survives the rate limit; **`/scaffold`** and
**`/handoff`** make a project survive the **context** boundary — clearing
context, or starting fresh tomorrow.

**`/scaffold`** — run once. It writes a contract into your `CLAUDE.md` (a "read
this first" list + a "before you stop" process contract) and creates the docs it
references — four **living documents** — then fills them in from your project:

- **`HANDOFF.md`** — the session baton: what changed, the next step, the gotchas.
- **`STATUS.md`** — the board: built / in progress / planned.
- **`SPEC.md`** — the contract: what this is, the load-bearing principles, where it's going.
- **`STRATEGY.md`** — the honest why / direction.

Each self-declares as a living doc with a changelog. It's idempotent and never
clobbers existing content. The contract then keeps them current — each session
refreshes the docs (and `README.md`, when the surface changes) before stopping.

**`/handoff`** (or just say *"execute handoff"*) — run at the start of any
session. It reads `HANDOFF.md`, `STATUS.md`, `README.md`, and whatever else the
contract lists, then picks up exactly where the last session left off — zero
re-explaining, even in a brand-new session after clearing context.

The mechanism: `CLAUDE.md` auto-loads every session, so the read-first /
update-before-stopping contract is always in context. A **Stop hook** (plugin
install) backs it up — in scaffolded projects only, it nudges once if you changed
code but didn't update the docs. Together the commands make long autonomous runs
cheap, rate-limit-proof, and context-proof.

## A second brain across all your projects

`/delegate`, `/relay`, `/scaffold` work *inside* one project. **`/wiki`** works
*across* them: run it in a folder and it builds a navigable **second brain** — an
Obsidian vault of notes-about-projects plus a
[graphify](https://pypi.org/project/graphifyy/) knowledge graph — so a future
session can ask *"did I already solve this?"* and find the answer in another project.

```
cd ~/code      # a folder of projects (or a single project)
/wiki
```

One shot, auto-detecting scope:

- **Scaffolds** the vault at `<folder>-wiki/` — a `CLAUDE.md` note-schema,
  `wiki/{projects,concepts,patterns,lessons-learned}`, an `index.md` catalog, a
  Map of Content, and an `.obsidian/` config (graph pre-colored by status).
- **Writes a note per project** from its README/code — what it is, its stack, the
  load-bearing decisions and lessons — with selective `[[wikilinks]]` between
  related projects.
- **Builds a graphify graph** (interactive `graph.html`, queryable `graph.json`, an
  Obsidian `graph.canvas`) that clusters projects into families and surfaces
  cross-project connections you'd never think to look for.
- **Wires the graphify MCP** at user scope, so Claude can query the brain live in
  *every* future session — cross-project recall becomes automatic.

Idempotent (safe to re-run as projects evolve) and **notes only** — your project
code is never touched.

## From a blank page to a launch plan

`/delegate` ships the product; **`/launch`** figures out how to sell it. Run it in
the product's repo and it fans out a multi-agent workflow that does the
market homework you'd otherwise pay a consultant for:

```
cd ~/code/my-product
/launch
```

It reads your repo for grounding, asks the four decisions that shape a
go-to-market (beachhead · monetization · timeline · resources), then:

- **Researches every competitor with cited web sources** — current pricing,
  funding, traction, the real controversies — plus market sizing, the
  regulatory/trust tailwinds, and ranked launch channels.
- **Drafts the strategy in parallel** — an honest product assessment, a pricing
  model anchored to the competitor matrix, positioning + messaging, and a
  **week-by-week launch playbook** (Product Hunt / Show HN / the specific
  communities to post in, and who to talk to).
- **Pressure-tests it** with two adversarial critics (feasibility + market
  reality) and **folds their objections back into the plan** — so it pushes back
  on a weak go-to-market instead of flattering it.
- **Compiles one Product Success Overview** — a `LAUNCH_PLAN.md` plus a styled
  HTML report — answering: *is the product good, what's the strategy, how do I
  launch it, do I need beta testers, and how do I price it?*

A token-heavy run (it does real research — ~15–25 agents), so it's for a real
launch decision, not a quick look.

## Why the spec quality matters

This is the one non-obvious lesson: **the harness works because the spec
leaves the worker zero design decisions.** Exact files, exact signatures,
exact test to add, exact verification commands. Weak models executing great
instructions beat strong models executing vague ones — and writing great
instructions is precisely what your expensive model is for.

## Security note

The worker runs with `--dangerously-skip-permissions` so it can edit files
and run tests unattended. That means it can execute arbitrary commands in
your project directory. Only delegate inside repos you trust, and prefer
delegating from a clean branch — review then covers exactly the worker's
changes, and a bad take is one `git checkout` away from the cutting-room floor.

## FAQ

**Does this burn my Anthropic credits?**
No. The worker talks to your local proxy with your own backend keys. Your
subscription pays only for the plan and review phases — the thinking.

**Is the worker really Claude Code?**
Yes — same agentic harness, tools, and editing loop. Only the model behind
`/v1/messages` changes. That's why it can be driven with `-p`, `--resume`,
and `--output-format json` like any other Claude Code instance.

**What if the worker produces garbage?**
That's the point of the review phase. Claude trusts nothing: it reads the
diff and runs the tests itself. Garbage gets caught, fed back, and fixed —
or Claude takes over.

**Can I use a different proxy?**
Anything that speaks the Anthropic Messages API works. Edit `bin/stunt` and
point `ANTHROPIC_BASE_URL` wherever you like.

**Do I need the proxy at all?**
Not with the opencode backend (`STUNTMAN_WORKER=opencode`) — opencode talks
to DeepSeek, Groq, Ollama, and 75+ providers natively. The proxy route's
advantage is that the worker is a full headless Claude Code instance (same
tools and editing loop as the orchestrator).

**Does the `window` probe cost tokens or eat my limit?**
No. It reads the same OAuth usage endpoint `/usage` reads, with the credentials
Claude Code already stores. No `/v1/messages` call — so it's free to poll, even
while you're rate-limited.

## Credits

- [free-claude-code](https://github.com/Alishahryar1/free-claude-code) by
  Alishahryar1 — the proxy that makes the trick possible.
- Built with (and by) Claude Code.

## License

MIT
