---
name: launch
description: Build a complete, research-backed product-launch plan. Fans out a multi-agent workflow that does cited web research on every competitor, sizes the market, finds the regulatory/trust tailwinds, ranks launch channels, then has strategists write the positioning, pricing, and a week-by-week launch playbook — pressure-tested by adversarial critics and compiled into one Product Success Overview (markdown + a styled HTML report). Use when the user invokes /launch, or asks how to launch / go to market / price a product, wants a competitive 360 / deep competitor research, a Product Hunt or Show HN plan, or "is my product good and how do I sell it". Best run from the product's repo so it can read the codebase + docs for grounding.
---

# stuntman: /launch — product launch strategist

You are the **orchestrator**. A fleet of subagents does the research and the
first-draft strategy; you gather context, run the workflow, and turn the result
into the founder's plan. This skill **authorizes and expects a `Workflow` call** —
that is the whole point of /launch, so don't ask permission to fan out.

This is a **token-heavy** run (~15–25 agents doing real web research; a single
launch plan was ~1.5M subagent tokens). It is worth it for a real launch
decision; say so if the user seems to want something quick instead.

## 1. Gather the product brief (grounding beats guessing)

- **If you're in the product's repo:** read the grounding docs first — `README`,
  `CLAUDE.md`, and any `SPEC` / `STATUS` / `STRATEGY` / marketing docs. Skim the
  code only enough to know what *actually ships today* vs. what's roadmap. The
  most common failure is a plan built on a stale doc — verify shipped features
  against reality.
- **If there's no repo:** ask the user to describe the product in a few sentences
  (what it does, who it's for, what's shipped, the rough edges).
- Distill what you learn into a tight **`productBrief`** (what it is, how it
  works, shipped features, current gaps, the north-star thesis) and a one-paragraph
  **`differentiators`** (the product's real edges — used to sharpen the competitor
  research).

## 2. Pin the launch brief (ask only what changes the plan)

If the user hasn't already said, use **AskUserQuestion** for the four decisions
that genuinely reshape the output (offer a "recommend for me" option on each):

1. **Beachhead** — who to win first (the plan optimizes for this).
2. **Monetization** — freemium SaaS / free + enterprise / one-time / recommend.
3. **Timeline** — when they want to launch.
4. **Resources** — solo + $0 / solo + small budget / team.

Fold the answers into a **`launchBrief`** string.

## 3. Build the competitor set

Take the competitors the user named, add the obvious category leaders, and —
critically — add the **closest direct rivals** (the ones that share the exact
wedge, not just the category), since those are usually the real threat and the
user often under-weights them. Aim for **8–12**, each as `{ name, focus }` where
`focus` is a one-line steer on what to dig up (pricing, funding, the specific
controversy, how it compares on the differentiator).

## 4. Run the workflow

Resolve the script path (works for both the plugin and the `install.sh` route):

```bash
if [ -n "$CLAUDE_PLUGIN_ROOT" ] && [ -f "$CLAUDE_PLUGIN_ROOT/skills/launch/launch-workflow.js" ]; then
  echo "$CLAUDE_PLUGIN_ROOT/skills/launch/launch-workflow.js"
else
  echo "$HOME/.claude/skills/launch/launch-workflow.js"
fi
```

Then call `Workflow` with that `scriptPath` and the assembled `args`:

```
Workflow({
  scriptPath: "<resolved path>",
  args: {
    product:        "<short name>",
    productBrief:   "<from step 1>",
    launchBrief:    "<from step 2>",
    differentiators:"<one paragraph from step 1>",
    competitors:    [ { name: "...", focus: "..." }, ... ],   // from step 3
    date:           "<today's date, e.g. 2026-06-27>",        // scripts can't read the clock
    htmlOut:        "<abs path>/launch-plan-<product>.html"   // where the HTML report is written
    // themes:      [ {label, prompt}, ... ]                  // OPTIONAL — 3 sensible defaults are built
  }
})
```

The workflow runs in the background and notifies you when done. It returns the
full `markdownReport` plus headline fields (`executiveSummary`, `productVerdict`,
`pricingHeadline`, `launchHeadline`, `betaRecommendation`, `topRecommendations`,
`biggestRisks`) and writes the styled HTML itself.

## 5. Land the deliverables and report

- Write the returned `markdownReport` to a doc the founder will keep — e.g.
  `docs/LAUNCH_PLAN.md` (in a repo) or `<product>-launch-plan.md`. The report may
  contain HTML entities (`&amp;`, `&lt;`) from the writer; **unescape them** before
  saving the markdown (`python3 -c "import html,sys; ..."` or equivalent).
- Verify the HTML file exists (`htmlOut`).
- **Report the verdict to the user in your own words**, not just a file pointer:
  is the product good, the recommended strategy, the pricing, whether they need
  beta testers, and the top next actions. If the plan recommends a **pivot off the
  briefed plan** (it often does — that's the most valuable output), surface it
  plainly and frame it as the user's decision, not a silent override.
- Skim the report's **"Sources → unverified"** list and pass any shaky figures
  (star counts, valuations, user numbers) to the user as caveats.
- Offer concrete follow-ups: draft the Show HN / Product Hunt / landing-page copy,
  turn the launch gates into tickets, etc.

## Notes

- **Real research needs web tools.** The subagents use `firecrawl_search` /
  `WebSearch` / `WebFetch`; they load schemas via `ToolSearch` on demand. In a
  headless/cron run without web access the research degrades to memory — warn the
  user if so.
- **The critics are load-bearing.** The two adversarial passes (feasibility +
  market-reality) are why the plan survives contact with reality. Don't strip them
  to save tokens.
- **Pass `date` explicitly** — workflow scripts can't read the clock.
- To re-run after editing `launch-workflow.js`, resume with
  `Workflow({ scriptPath, resumeFromRunId })` — unchanged agents return cached.
