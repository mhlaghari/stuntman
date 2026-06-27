// stuntman /launch — product-launch-strategy workflow (parameterized, reusable for ANY product).
// Driven entirely by `args` so the same script serves every product. See SKILL.md for how the
// skill assembles `args`. Run with: Workflow({ scriptPath: ".../launch-workflow.js", args })
//
// args = {
//   product:        "Acme",                         // short product name (for labels/title)
//   productBrief:   "<what it is, how it works, shipped features, gaps, thesis>",
//   launchBrief:    "<beachhead, monetization, timeline, resources — the founder's decisions>",
//   differentiators:"<one paragraph of the product's real edges — used in competitor prompts>",
//   competitors:    [ { name, focus }, ... ],        // who to deep-research
//   themes:         [ { label, prompt }, ... ],      // OPTIONAL; 3 sensible defaults built if absent
//   date:           "2026-06-27",
//   htmlOut:        "/abs/path/launch-plan.html",    // the synthesizer writes the styled HTML here
// }

export const meta = {
  name: 'launch-plan',
  description: 'Deep competitive research + pricing + launch strategy for a product, compiled into a Product Success Overview',
  phases: [
    { title: 'Research', detail: 'competitor profiles + market/tailwinds/channels research, cited web research' },
    { title: 'Synthesize', detail: 'product assessment, pricing, launch playbook, positioning' },
    { title: 'Pressure-test', detail: 'feasibility + market-reality adversarial critics' },
    { title: 'Compile', detail: 'final Product Success Overview (markdown + HTML)' },
  ],
}

const PRODUCT = (args && args.product) || 'the product'
const DATE = (args && args.date) || 'today'
const PRODUCT_BRIEF = (args && args.productBrief) || '(no product brief provided)'
const LAUNCH_BRIEF = (args && args.launchBrief) || '(no launch brief provided)'
const DIFFERENTIATORS = (args && args.differentiators) || '(no differentiators provided)'
const COMPETITORS = (args && args.competitors) || []
const HTML_OUT = (args && args.htmlOut) || (PRODUCT.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-launch-plan.html')

const THEMES = (args && args.themes && args.themes.length) ? args.themes : [
  { label: 'market-sizing', prompt: `Research the MARKET for the category that ${PRODUCT} competes in, as of ${DATE}, for a go-to-market plan. Use web tools (firecrawl_search / WebSearch / WebFetch) for CURRENT data with source URLs. Cover: market size (TAM/SAM) + growth rate with a cited source; the current trends shaping the category; buyer segments and which is growing fastest; what "good" looks like to users now (the table-stakes feature set); and any data on willingness-to-pay for ${PRODUCT}'s core differentiator. Return a concise markdown brief titled "## Market & Trends Research" with cited facts and a short "implications for ${PRODUCT}" closer. Product context: ${DIFFERENTIATORS}` },
  { label: 'category-tailwinds', prompt: `Research the TAILWINDS and RISKS (regulatory, legal, trust, cultural) that bear on ${PRODUCT}'s differentiation wedge, as of ${DATE}. Use web tools with source URLs. Find specific, citable events — incidents, lawsuits, regulations, public controversies — that make ${PRODUCT}'s wedge more (or less) valuable right now, with dates + links. Then assess honestly whether ${PRODUCT}'s core differentiator is a real WILLINGNESS-TO-PAY driver or mostly a stated preference. Return a markdown brief titled "## Tailwinds & Risks Research" with cited, specific examples (these become launch-messaging ammunition) and a blunt verdict. Wedge / differentiators: ${DIFFERENTIATORS}` },
  { label: 'launch-channels', prompt: `Research the best LAUNCH CHANNELS for this specific launch, as of ${DATE}. Launch brief: ${LAUNCH_BRIEF}. Use web tools with source URLs. Cover: Product Hunt (what a top-5 finish takes now — realistic benchmarks, timing, the assets that win, a recent comparable example); Hacker News "Show HN" norms and failure modes for this kind of product; the SPECIFIC named communities/subreddits/forums where this beachhead gathers; relevant newsletters/influencers worth pitching; indie + category directories. Return a markdown brief titled "## Launch Channels Research" with specifically named channels, realistic benchmarks, and concrete tactics a founder on this budget can execute.` },
]

const COMP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    oneLiner: { type: 'string' },
    category: { type: 'string' },
    targetSegment: { type: 'string' },
    positioning: { type: 'string' },
    pricingTiers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          tier: { type: 'string' },
          monthlyPriceUSD: { type: 'string' },
          annualNote: { type: 'string' },
          keyLimits: { type: 'string' },
          unlocks: { type: 'string' },
        },
        required: ['tier', 'monthlyPriceUSD', 'unlocks'],
      },
    },
    freeTier: { type: 'string' },
    fundingValuation: { type: 'string' },
    tractionUsers: { type: 'string' },
    differentiatorPosture: { type: 'string', description: "how this competitor stacks up on the product's core differentiator" },
    keyFeatures: { type: 'array', items: { type: 'string' } },
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    distributionChannels: { type: 'array', items: { type: 'string' } },
    recentNews: { type: 'array', items: { type: 'string' } },
    threatToUs: { type: 'string' },
    howWeWin: { type: 'string' },
    sourceUrls: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'string' },
  },
  required: ['name', 'oneLiner', 'positioning', 'pricingTiers', 'strengths', 'weaknesses', 'threatToUs', 'howWeWin', 'sourceUrls', 'confidence'],
}

const compPrompt = (c) => `You are a competitive-intelligence analyst building a 360-degree market view for "${PRODUCT}". Research the competitor "${c.name}" as of ${DATE}.

Focus: ${c.focus || 'pricing, positioning, funding/traction, strengths, weaknesses, and how it stacks up against ' + PRODUCT}

DO REAL WEB RESEARCH. Use firecrawl_search (load it via ToolSearch with query "select:mcp__firecrawl__firecrawl_search" if its schema is not loaded), plus WebSearch and WebFetch, to pull CURRENT facts from pricing pages, funding announcements, G2/Capterra reviews, the product homepage, and recent news. DO NOT rely on training memory for pricing, funding, user counts, or features — those change fast and a stale number is worse than none. Open the actual pricing page and read it. For every figure include the source URL. If you cannot verify something, set it to "unverified" rather than guessing.

In "howWeWin" and "threatToUs", reason about ${PRODUCT}'s specific edges: ${DIFFERENTIATORS}. Be specific and honest about where this competitor genuinely beats ${PRODUCT}.

Return the structured competitor profile with exact dollar amounts and real tier names.`

phase('Research')
const compThunks = COMPETITORS.map((c) => () => agent(compPrompt(c), { schema: COMP_SCHEMA, label: 'research:' + c.name, phase: 'Research' }))
const themeThunks = THEMES.map((t) => () => agent(t.prompt, { label: 'research:' + t.label, phase: 'Research' }))
const research = await parallel([...compThunks, ...themeThunks])

const competitorData = research.slice(0, COMPETITORS.length).filter(Boolean)
const themeReports = research.slice(COMPETITORS.length).filter(Boolean)
log(competitorData.length + '/' + COMPETITORS.length + ' competitor profiles + ' + themeReports.length + '/' + THEMES.length + ' theme briefs collected')

const corpus = '# COMPETITOR INTELLIGENCE (structured)\n\n' +
  competitorData.map((c) => '```json\n' + JSON.stringify(c, null, 2) + '\n```').join('\n\n') +
  '\n\n# MARKET, TAILWINDS & CHANNEL RESEARCH\n\n' +
  themeReports.join('\n\n---\n\n')

phase('Synthesize')
const synthInputs = PRODUCT_BRIEF + '\n' + LAUNCH_BRIEF + '\n\n=== RESEARCH CORPUS ===\n' + corpus

const synthThunks = [
  () => agent(`You are a brutally honest product strategist and senior engineer. Using the product brief and the research corpus below, assess: is ${PRODUCT} a good v1? Produce a markdown section "## Product Assessment" with: a one-paragraph verdict (good / not-good v1 and why); an honest SWOT; the 3 things that make it genuinely differentiated; the 3 things most likely to hurt it at launch; an honest, skeptical take on whether its core differentiator is a strong enough wedge for the chosen beachhead; and a readiness checklist of what MUST be true before a public launch on the briefed timeline. Ground every claim in the brief/research. No cheerleading.\n\n${synthInputs}`, { label: 'synth:assessment', phase: 'Synthesize' }),

  () => agent(`You are a SaaS pricing strategist. Using the competitor pricing data in the corpus and the launch brief, design ${PRODUCT}'s pricing. Produce a markdown section "## Pricing Strategy" with: (1) a competitor pricing matrix using EXACT dollar figures from the research; (2) the recommended tier split — precisely what is free vs paid (or entry vs upgrade), and WHY each gate drives conversion; (3) the recommended price point(s) with rationale (anchoring to competitors, psychological pricing, monthly vs annual); (4) whether to add a one-time/lifetime, team, or enterprise tier; (5) what billing/infra the founder must stand up given their resources; (6) a simple first-year revenue sensitivity (conservative/base/optimistic: X reach -> Y% activation -> Z% paid -> revenue). Be concrete with numbers and address any cost/liability tension specific to this product's architecture.\n\n${synthInputs}`, { label: 'synth:pricing', phase: 'Synthesize' }),

  () => agent(`You are a product-launch strategist for founders on this exact budget/timeline. Using the brief and the launch-channels research in the corpus, produce a markdown section "## Launch Playbook" with: (1) a WEEK-BY-WEEK plan for the briefed timeline (T-minus schedule ending in launch day + the week after); (2) channels RANKED for this beachhead, each with effort/payoff — give concrete, named tactics for the top channels (e.g. a Product Hunt playbook, a Show HN angle + title, the SPECIFIC named communities), not categories; (3) the exact ASSETS the founder must produce (landing page, demo video/GIF, screenshots, one-liner, tagline options); (4) WHO to talk to — specific named people/communities/newsletters and how to reach them on the stated budget; (5) a BETA PROGRAM design: does the founder need beta testers before launch? how many, recruited from where, how to instrument feedback; (6) a launch-day checklist and the KPIs to watch. Be operational — names, not categories.\n\n${synthInputs}`, { label: 'synth:launch', phase: 'Synthesize' }),

  () => agent(`You are a positioning & messaging expert (April Dunford style). Using the research, craft ${PRODUCT}'s positioning for the briefed beachhead. Produce a markdown section "## Positioning & Messaging" with: (1) the core positioning statement (for whom / what category / unique value / vs which alternatives); (2) the sharpest ONE-LINER plus 5 tagline options; (3) the 3-4 key messages that matter most to this buyer, ranked; (4) the "enemy"/wedge narrative (with any real events/lawsuits from the research as tailwinds, cited); (5) objection handling: the top 5 objections this buyer will raise with a crisp answer to each; (6) landing-page hero copy (headline + subhead + 3 bullets + CTA). Make the copy genuinely good, not generic.\n\n${synthInputs}`, { label: 'synth:positioning', phase: 'Synthesize' }),
]
const [assessment, pricing, launch, positioning] = await parallel(synthThunks)

const synthBundle = '## Product Assessment\n' + (assessment || '(missing)') +
  '\n\n## Pricing Strategy\n' + (pricing || '(missing)') +
  '\n\n## Launch Playbook\n' + (launch || '(missing)') +
  '\n\n## Positioning & Messaging\n' + (positioning || '(missing)')

phase('Pressure-test')
const critiqueInputs = PRODUCT_BRIEF + '\n' + LAUNCH_BRIEF + '\n\n=== DRAFT SYNTHESIS TO ATTACK ===\n' + synthBundle + '\n\n=== RESEARCH CORPUS (for evidence) ===\n' + corpus

const critThunks = [
  () => agent(`You are a skeptical operator pressure-testing this founder's launch plan. Given the product brief, the launch brief (note the resources + timeline), and the draft synthesis, find what is UNREALISTIC, MISSING, or LIKELY TO FAIL. Interrogate specifically: can this founder actually ship what the plan assumes within the stated timeline and budget? Are there hard technical/legal/distribution gates not yet cleared? What breaks under a traffic spike? What is the single most likely reason this launch flops? Return a markdown section "## Feasibility Pressure-Test" with a prioritized risk list; each item: the risk, why it bites, and a concrete mitigation or scope-cut. Be direct.\n\n${critiqueInputs}`, { label: 'critic:feasibility', phase: 'Pressure-test' }),

  () => agent(`You are a skeptical investor/analyst pressure-testing the MARKET thesis. Given the research and synthesis, challenge: is the chosen differentiator actually a willingness-to-pay driver for the chosen beachhead, or just a nice-to-have? Why would this buyer switch from the incumbents? Is the TAM for the briefed segment big enough for the chosen business model, or is the real money in a segment the founder is de-prioritizing? Return a markdown section "## Market-Reality Pressure-Test" with the hardest truths, each backed by evidence from the research, and — importantly — for each, a constructive "if this is true, do this instead" counter-move. Be useful, not nihilistic.\n\n${critiqueInputs}`, { label: 'critic:market', phase: 'Pressure-test' }),
]
const [feasibilityCritique, marketCritique] = await parallel(critThunks)

phase('Compile')
const FINAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    executiveSummary: { type: 'string' },
    productVerdict: { type: 'string' },
    markdownReport: { type: 'string', description: 'the COMPLETE Product Success Overview in markdown' },
    htmlWritten: { type: 'boolean' },
    htmlPath: { type: 'string' },
    topRecommendations: { type: 'array', items: { type: 'string' } },
    pricingHeadline: { type: 'string' },
    launchHeadline: { type: 'string' },
    betaRecommendation: { type: 'string' },
    biggestRisks: { type: 'array', items: { type: 'string' } },
  },
  required: ['executiveSummary', 'productVerdict', 'markdownReport', 'topRecommendations', 'pricingHeadline', 'launchHeadline', 'betaRecommendation', 'biggestRisks'],
}

const finalPrompt = `You are the lead strategist compiling the final deliverable: ${PRODUCT}'s PRODUCT SUCCESS OVERVIEW — a single, comprehensive, decision-ready launch plan for the founder.

You are given: the product brief, the launch brief, the full competitor + market research corpus, four synthesis sections (Product Assessment, Pricing Strategy, Launch Playbook, Positioning & Messaging), and two pressure-test critiques (Feasibility, Market-Reality).

Weave these into ONE cohesive, non-repetitive markdown report. Reconcile contradictions. FOLD the critics' valid concerns INTO the plan — do not just append them; adjust the actual recommendations so the plan survives the critique. Use the research's hard numbers. Where sources conflict or are unverified, say so plainly.

STRUCTURE (use these exact H2 sections):
1. "## 1. Executive Summary" — the verdict (is the product good? yes/no + why), the single recommended strategy in 3-4 sentences, and the top 5 actions for the launch window.
2. "## 2. Is the Product Good?" — product assessment + SWOT + the pre-launch readiness checklist.
3. "## 3. The 360-degree Competitive Landscape" — a master comparison table (${PRODUCT} vs every researched competitor across the dimensions that matter for this category) + a 2-3 sentence "how we beat them / where they beat us" for each key competitor + a competitor pricing matrix.
4. "## 4. Positioning & Messaging" — positioning statement, one-liner, taglines, key messages, objection handling, landing-page hero copy.
5. "## 5. Pricing Strategy" — tier split, price points, rationale, billing infra, revenue sensitivity.
6. "## 6. Do You Need Beta Testers?" — a clear yes/no plus the beta program design.
7. "## 7. The Launch Playbook" — the week-by-week plan, ranked channels with concrete named tactics, assets to build, and who to talk to.
8. "## 8. Risks & How The Plan Survives Them" — the prioritized risks from both pressure-tests, each with the mitigation now baked into the plan.
9. "## 9. 90-Day Success Metrics" — concrete target numbers (reach, activation, conversion, retention).
10. "## 10. Sources" — the key URLs from the research, with a short "unverified / flagged" list of anything that couldn't be confirmed.

Be specific — real names, real prices, real communities, real dollar amounts. Lead each section with the answer, then support it. Thorough but skimmable. The H1 should be "# ${PRODUCT} — Product Success Overview & Launch Plan" with a dated subtitle.

THEN: write a polished, self-contained, professional HTML version of this EXACT report to the file:
${HTML_OUT}
Use clean modern styling in a single <style> block (system fonts, readable max-width ~820px, nicely styled tables with borders/zebra striping, a section nav/table-of-contents at the top, generous spacing, print-friendly, a tasteful accent color). No external CDN or JS dependencies — fully offline. Render the markdown content as proper HTML (real <h2>/<table>/<ul>/<p>, not a code block). Use the Write tool to create that file.

Return: executiveSummary, productVerdict, the COMPLETE markdownReport, htmlWritten + htmlPath, topRecommendations, pricingHeadline, launchHeadline, betaRecommendation, biggestRisks.

=== PRODUCT BRIEF ===
${PRODUCT_BRIEF}
=== LAUNCH BRIEF ===
${LAUNCH_BRIEF}
=== RESEARCH CORPUS ===
${corpus}
=== SYNTHESIS ===
${synthBundle}
=== FEASIBILITY PRESSURE-TEST ===
${feasibilityCritique || '(missing)'}
=== MARKET-REALITY PRESSURE-TEST ===
${marketCritique || '(missing)'}
`

const final = await agent(finalPrompt, { label: 'compile:overview', phase: 'Compile', schema: FINAL_SCHEMA })

return {
  files: { htmlPath: final && final.htmlPath, htmlWritten: final && final.htmlWritten },
  executiveSummary: final && final.executiveSummary,
  productVerdict: final && final.productVerdict,
  pricingHeadline: final && final.pricingHeadline,
  launchHeadline: final && final.launchHeadline,
  betaRecommendation: final && final.betaRecommendation,
  topRecommendations: final && final.topRecommendations,
  biggestRisks: final && final.biggestRisks,
  markdownReport: final && final.markdownReport,
  stats: { competitors: competitorData.length, themes: themeReports.length },
}
