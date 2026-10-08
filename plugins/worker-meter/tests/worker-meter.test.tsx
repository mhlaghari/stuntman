import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const SITE = { scroll: { offset: 0, bodyRows: 10 }, view: {} }

const BAND = {
  plugin: 'worker-meter',
  surface: 'terminal',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, ...SITE },
} as const

const PANE = {
  plugin: 'worker-meter',
  surface: 'terminal',
  component: 'Pane',
  requestId: 'dash',
  props: { title: 'Laghari Labs', isFocused: false, bodyColumns: 32, placement: 'dock', ...SITE },
} as const

// The shape `usages --json` printed on 2026-10-08, weekly_pct null included.
const BOARD = {
  claude: { available: true, five_hour_pct: 75, seven_day_pct: 91, blocked: false },
  codex: {
    available: true,
    five_hour_pct: 12,
    five_hour_expired: false,
    weekly_pct: null,
    weekly_expired: false,
    snapshot_age_s: 252,
  },
  deepseek: { available: true, balance: '9.59', is_available: true },
  agy: { available: false, reason: 'nothing written locally' },
}

const USAGE = {
  startedAt: 0,
  context: { window: 1_000_000, percent: 24 },
  rateLimits: [],
  cost: { usd: 12.4 },
}

const TURN = { reason: 'answer', answer: 'done', durationMs: 1, isAborted: false, turnId: 't1' } as const

// Starts a session whose `usages --json` prints `stdout`. `isWide` says whether
// the terminal seats the dashboard pane the mod opens unasked.
const start = async ($: Engine, on: On, stdout: string, isWide = false) => {
  const clock = mock.clock(on)
  const calls: (readonly string[])[] = []
  mock.env(on, { HOME: '/home/me' })
  on('process.run', (_, e) => {
    calls.push(e.argv)

    return {
      value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
    }
  })
  on('session.usage', () => ({ value: USAGE }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({
    value: isWide ? { isPlaced: true } : { isPlaced: false, reason: 'narrow terminal' },
  }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.log', () => ({ value: undefined }))
  on('ui.render', { component: 'AbovePrompt' }, ($$, e) => {
    const { Text } = $$.ui.resolve(e)

    return <Text>engine band</Text>
  })

  await $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })
  await clock.advance(0)

  return { calls, clock }
}

test('the band draws one meter per worker, colored by its worst window', async ($, on) => {
  const { calls } = await start($, on, JSON.stringify(BOARD))
  const ui = await $.ui.mount(BAND)

  expect(calls).toEqual([['/home/me/.local/bin/usages', '--json']])

  const claude = await ui.find({ type: 'Text', text: '7d' })
  expect(claude?.text).toBe('██████░░ 75% 5h · 91% 7d')
  expect(claude?.props.color).toBe('#FF4D2E')

  const codex = await ui.find({ type: 'Text', text: '12%' })
  expect(codex?.text).toBe('█░░░░░░░ 12% 5h')
  expect(codex?.props.color).toBe('#06D6A0')

  expect((await ui.find({ type: 'Text', text: '$' }))?.text).toBe('$9.59')
  expect((await ui.find({ type: 'Text', text: 'n/a' }))?.props.color).toBe('#8C8579')
})

test('an expired window reads 0% and an old snapshot says so', async ($, on) => {
  const codex = { ...BOARD.codex, five_hour_expired: true, snapshot_age_s: 3 * 86_400 }
  await start($, on, JSON.stringify({ codex }))
  const ui = await $.ui.mount(BAND)

  expect((await ui.find({ type: 'Text', text: '5h' }))?.text).toBe('░░░░░░░░ 0% 5h (3d old)')
})

test('leaves the band to the engine when usages prints no JSON', async ($, on) => {
  await start($, on, 'command not found')
  const ui = await $.ui.mount(BAND)

  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine band')
})

test('reads usages again after a turn, at most once a minute', async ($, on) => {
  on('turn.complete', () => ({ text: 'done' }))
  const { calls, clock } = await start($, on, JSON.stringify(BOARD))

  await $.turn.complete(TURN)
  await clock.advance(0)
  expect(calls.length).toBe(1)

  await clock.advance(61_000)
  await $.turn.complete(TURN)
  await clock.advance(0)
  expect(calls.length).toBe(2)
})

test('the dashboard pane draws a row per window, then the session', async ($, on) => {
  await start($, on, JSON.stringify(BOARD), true)
  const ui = await $.ui.mount(PANE)
  const texts = (await ui.findAll({ type: 'Text' })).map(t => t.text)

  expect(texts).toEqual([
    'WORKERS',
    'claude',
    '█████████░░░ 75% 5h',
    '',
    '███████████░ 91% 7d',
    'codex',
    '█░░░░░░░░░░░ 12% 5h',
    'deepseek',
    '$9.59',
    'agy',
    'n/a',
    'SESSION',
    'context',
    '███░░░░░░░░░ 24%',
    'cost',
    '$12.40',
  ])
  // claude is past 90% on one window: both of its rows read as full.
  expect((await ui.find({ type: 'Text', text: '75%' }))?.props.color).toBe('#FF4D2E')
  expect((await ui.find({ type: 'Text', text: '24%' }))?.props.color).toBe('#06D6A0')
})

test('the band yields while the dashboard is open', async ($, on) => {
  await start($, on, JSON.stringify(BOARD), true)
  const ui = await $.ui.mount(BAND)

  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine band')
})
