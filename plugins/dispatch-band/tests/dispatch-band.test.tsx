import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { crabFrame } from '../hooks/crab'
import { halfBlocks, matchProject, parseRoute } from '../hooks/floor'

const SITE = { scroll: { offset: 0, bodyRows: 20 }, view: {} }

const band = (maxRows: number) =>
  ({
    plugin: 'dispatch-band',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows, bodyColumns: 120, ...SITE },
  }) as const

const agent = (id: string, host: string, state: string, extra: object = {}) => ({
  id, sid: id, host, worker: false, state, children: [], say: null, reach: 'tmux', ...extra,
})

// The shape `floor --json` prints, trimmed to what the mod reads.
const FLOOR = {
  rooms: [
    {
      name: 'trading-desk',
      cwd: '/p/trading-desk',
      agents: [
        agent('claude:t1', 'claude', 'running', { children: [{ id: 'k1', desc: 'code-reviewer' }] }),
        agent('opencode:w1', 'opencode', 'running', { worker: true, reach: 'none' }),
      ],
    },
    { name: 'spark', cwd: '/p/spark', agents: [agent('claude:s1', 'claude', 'needs_input')] },
    { name: 'Tatweer OS', cwd: '/p/tatweer', agents: [agent('codex:a1', 'codex', 'done')] },
  ],
}

const SENT = { ok: true, project: 'spark', agent: 'claude:s1', sent_at: 1 }
const REFUSED = { ok: false, reason: 'unreachable', detail: 'Wait for this turn to finish.' }

const start = async ($: Engine, on: On, floor: object = FLOOR) => {
  const clock = mock.clock(on)
  const calls: (readonly string[])[] = []
  const filled: string[] = []
  mock.env(on, { HOME: '/home/me', STUNTMAN_FLOOR_BIN: '/opt/floor' })
  on('process.run', (_, e) => {
    calls.push(e.argv)
    const stdout = JSON.stringify(e.argv.includes('send') ? (e.argv.includes('/p/tatweer') ? REFUSED : SENT) : floor)
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.log', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('session.id', () => ({ value: 'me' }))
  on('fs.exists', (_, e) => ({ value: e.path === 'docs' }))
  on('prompt.fill', (_, e) => {
    filled.push(e.text)
    return { isFilled: true }
  })
  on('ui.render', { component: 'AbovePrompt' }, ($$, e) => {
    const { Text } = $$.ui.resolve(e)
    return <Text>engine band</Text>
  })
  await $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })
  await clock.advance(0)
  return { calls, filled }
}

const submit = ($: Engine, text: string) =>
  $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } } as never)

test('the band counts every agent and draws one column per project', async ($, on) => {
  const { calls } = await start($, on)
  const ui = await $.ui.mount(band(20))

  expect(calls[0]).toEqual(['python3', '/opt/floor', '--json'])
  expect((await ui.find({ type: 'Text', text: 'agents' }))?.text).toBe('5 agents')
  expect((await ui.find({ type: 'Text', text: 'working' }))?.text).toBe('● 3 working')
  expect((await ui.find({ type: 'Text', text: 'trading-desk' }))?.props.color).toBeDefined()
  expect((await ui.find({ type: 'Text', text: '+2 working' }))?.text).toBe('+2 working')
  expect((await ui.find({ type: 'Text', text: 'needs you' }))?.text).toBe('▲ 1 needs you')
  expect((await ui.findAll({ type: 'Text', text: '▀' })).length).toBeGreaterThan(20)
})

test('a short band drops the crabs and keeps the words', async ($, on) => {
  await start($, on)
  const ui = await $.ui.mount(band(6))

  expect((await ui.findAll({ type: 'Text', text: '▀' })).length).toBe(0)
  expect((await ui.find({ type: 'Text', text: 'spark' }))?.text).toBe('spark')
})

test('@project sends to that agent through the floor and never reaches the model', async ($, on) => {
  const { calls } = await start($, on)
  const result = await submit($, '@spark yes, approve the pip install')

  expect(calls[calls.length - 1]).toEqual([
    'python3', '/opt/floor', 'send', '--not', 'me', '--', '/p/spark', 'yes, approve the pip install',
  ])
  expect(result).toEqual({ drop: 'Sent to spark.' })
})

test('a file mention, a prefix, a folder here or an unknown name is an ordinary prompt', async ($, on) => {
  await start($, on)

  for (const text of ['@src/app.ts explain this', '@nobody hello', '@trad run tests', '@-h x']) {
    expect(await submit($, text)).toEqual({ text })
  }
})

test('a refused send says why and puts the words back in the prompt box', async ($, on) => {
  const { filled } = await start($, on)
  const result = await submit($, '@tatweer-os what is open?')

  expect(result).toEqual({ drop: 'Not sent to Tatweer OS: Wait for this turn to finish.' })
  expect(filled).toEqual(['@tatweer-os what is open?'])
})

test('routing rules match the floor resolver', () => {
  expect(parseRoute('@tatweer-os what is open?')).toEqual({ target: 'tatweer-os', body: 'what is open?' })
  expect(parseRoute('@README.md read it')).toBeUndefined()
  expect(matchProject('tatweer-os', FLOOR.rooms)?.name).toBe('Tatweer OS')
  expect(matchProject('tr', FLOOR.rooms)).toBeUndefined()
  expect(parseRoute('@-h x')).toBeUndefined()
})

test('half blocks pair two pixel rows into one terminal row', () => {
  const rows = halfBlocks({ palette: ['#ff0000', '#00ff00'], rows: ['0.1', '1.0'] })

  expect(rows).toEqual([
    [
      { char: '▀', color: '#ff0000', backgroundColor: '#00ff00' },
      { char: ' ' },
      { char: '▀', color: '#00ff00', backgroundColor: '#ff0000' },
    ],
  ])
})

test('a crab wears its host: Claude bare, Codex a cap, workers a helmet', () => {
  const pixels = (host: string, state: string) => crabFrame('#D97757', host, state).rows.slice(0, 3).join('')

  expect(pixels('claude', 'running')).not.toMatch(/[23]/)
  expect(pixels('codex', 'done')).toMatch(/2/)
  expect(pixels('opencode', 'running')).toMatch(/3/)
  expect(pixels('agy', 'failed')).not.toMatch(/[23]/)
  expect(crabFrame('#D97757', 'claude', 'idle').palette[0]).not.toBe('#D97757')
  expect(crabFrame('#D97757', 'claude', 'done').rows).toHaveLength(10)
})

test('one agent reads singular, and this session is labelled as itself', async ($, on) => {
  const home = { rooms: [{ name: 'mlaghari', cwd: '/home/me', agents: [agent('claude:me', 'claude', 'thinking')] }] }
  await start($, on, home)
  const ui = await $.ui.mount(band(20))

  expect((await ui.find({ type: 'Text', text: 'agent' }))?.text).toBe('1 agent')
  expect((await ui.find({ type: 'Text', text: 'this session' }))?.text).toBe('this session')
})
