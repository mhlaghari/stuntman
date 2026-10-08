import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Level, Meter, Reading, Session } from '../types'

// One backend of `usages --json` (Stuntman): the fields this mod reads.
type Backend = {
  available: boolean
  five_hour_pct?: number | null
  five_hour_expired?: boolean
  seven_day_pct?: number | null
  weekly_pct?: number | null
  weekly_expired?: boolean
  snapshot_age_s?: number | null
  blocked?: boolean
  balance?: string
  is_available?: boolean
}

// One line of the dashboard pane.
type Row = { label: string; text: string; color?: string }

const PANE = 'dash'
const REFRESH_MS = 5 * 60_000
const MIN_GAP_MS = 60_000
const DAY_S = 86_400

// Laghari Labs palette, from lagharilabs-website tokens.css: mint, coin
// yellow, fire red, and the dark theme's muted ink.
const COIN = '#FFD23F'
const INK = { ok: '#06D6A0', warn: COIN, full: '#FF4D2E', off: '#8C8579' } as const

const meters = atom({ plugin: 'worker-meter', key: 'meters' } as const, [])
const session = atom({ plugin: 'worker-meter', key: 'session' } as const, null)
const isDashOpen = atom({ plugin: 'worker-meter', key: 'isDashOpen' } as const, false)

// Same thresholds as the status line's 5h bar.
const levelOf = (pct: number): Level => (pct >= 90 ? 'full' : pct >= 70 ? 'warn' : 'ok')

const bar = (pct: number, width: number) => {
  const filled = Math.max(0, Math.min(width, Math.round((pct * width) / 100)))

  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

const toMeter = (name: string, b: Backend): Meter => {
  if (!b.available) {
    return { name, level: 'off', readings: [], note: 'n/a' }
  }

  if (b.balance !== undefined) {
    const level = b.is_available === false ? 'full' : 'ok'

    return { name, level, readings: [], note: `$${b.balance}` }
  }

  // A window whose reset time passed since the snapshot is back to 0%.
  const readings = [
    { label: '5h', pct: b.five_hour_expired ? 0 : b.five_hour_pct },
    { label: '7d', pct: b.weekly_expired ? 0 : (b.seven_day_pct ?? b.weekly_pct) },
  ].filter((r): r is Reading => typeof r.pct === 'number')

  if (readings.length === 0) {
    return { name, level: 'off', readings, note: 'n/a' }
  }

  const age = b.snapshot_age_s ?? 0

  return {
    name,
    level: b.blocked ? 'full' : levelOf(Math.max(...readings.map(r => r.pct))),
    readings,
    note: b.blocked ? 'BLOCKED' : age > DAY_S ? `(${Math.floor(age / DAY_S)}d old)` : '',
  }
}

// The band: one worker on one line, a bar for its first window only.
const bandText = (m: Meter) => {
  const windows = m.readings.map(
    (r, i) => `${i === 0 ? `${bar(r.pct, 8)} ` : ''}${r.pct.toFixed(0)}% ${r.label}`,
  )

  return [windows.join(' · '), m.note].filter(Boolean).join(' ')
}

// The pane: one row per window, the worker's name on its first row.
const workerRows = (list: Meter[], width: number): Row[] =>
  list.flatMap(m =>
    m.readings.length === 0
      ? [{ label: m.name, text: m.note, color: INK[m.level] }]
      : m.readings.map((r, i) => ({
          label: i === 0 ? m.name : '',
          text: [`${bar(r.pct, width)} ${r.pct.toFixed(0)}% ${r.label}`, i === 0 ? m.note : '']
            .filter(Boolean)
            .join(' '),
          color: INK[m.level === 'full' ? 'full' : levelOf(r.pct)],
        })),
  )

const sessionRows = (now: Session | null, width: number): Row[] => {
  const rows: Row[] = []

  if (typeof now?.contextPct === 'number') {
    const pct = now.contextPct
    rows.push({
      label: 'context',
      text: `${bar(pct, width)} ${pct.toFixed(0)}%`,
      color: INK[levelOf(pct)],
    })
  }

  if (typeof now?.costUsd === 'number') {
    rows.push({ label: 'cost', text: `$${now.costUsd.toFixed(2)}` })
  }

  return rows
}

let fetchedAt = -Infinity

// Reads the session's own figures every time, and the workers' at most once a
// minute. Keeps the last good values when a read fails.
const refresh = async ($: EngineInterface) => {
  try {
    const usage = await $.session.usage()
    const figures = { contextPct: usage.context.percent ?? null, costUsd: usage.cost?.usd ?? null }
    await update($, session, () => figures)

    const now = await $.clock.now()

    if (now - fetchedAt < MIN_GAP_MS) {
      return
    }

    fetchedAt = now

    const home = await $.env.get('HOME')
    const { stdout } = await $.process.run([`${home}/.local/bin/usages`, '--json'])
    const board = JSON.parse(stdout) as Record<string, Backend>
    const next = Object.entries(board).map(([name, b]) => toMeter(name, b))
    await update($, meters, () => next)
  } catch (error) {
    $.ui.log(`worker-meter: refresh failed: ${String(error)}`, { to: 'debug' })
  }
}

const openDash = async ($: EngineInterface) => {
  const opened = await $.ui.open({ id: PANE, title: 'Laghari Labs', columns: 34 })
  await update($, isDashOpen, () => opened.isPlaced)

  return opened
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'dash',
      description: 'Open the Laghari Labs dashboard pane (workers and this session)',
    })
    void refresh($)
    $.clock.every(REFRESH_MS, () => void refresh($))
    // Unasked, the engine seats it only in a wide terminal; /dash asks.
    void openDash($)

    return next(e)
  })

  on('command.run', { command: 'dash' }, async $ => {
    const opened = await openDash($)

    return { text: opened.isPlaced ? 'Dashboard opened.' : `Dashboard not shown: ${opened.reason}` }
  })

  on('ui.close', { id: PANE }, async ($, e, next) => {
    const closed = await next(e)

    if (closed.deny === undefined) {
      await update($, isDashOpen, () => false)
    }

    return closed
  })

  on('turn.complete', ($, e, next) => {
    void refresh($)

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const width = Math.max(4, Math.min(12, e.props.bodyColumns - 20))
    const workers = workerRows(await read($, meters), width)
    const figures = sessionRows(await read($, session), width)
    const line = (r: Row) => (
      <Box columnGap={1}>
        <Box width={8}>
          <Text dimColor>{r.label}</Text>
        </Box>
        <Text color={r.color}>{r.text}</Text>
      </Box>
    )

    return (
      <Box flexDirection="column">
        <Text bold color={COIN}>
          WORKERS
        </Text>
        {workers.length === 0 && <Text dimColor>reading usages...</Text>}
        {workers.map(line)}
        <Box marginTop={1}>
          <Text bold color={COIN}>
            SESSION
          </Text>
        </Box>
        {figures.map(line)}
      </Box>
    )
  })

  // The band is the short form: it yields while the dashboard is open.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, meters)

    if (e.props.hasSurvey || list.length === 0 || (await read($, isDashOpen))) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexWrap="wrap" columnGap={3}>
        {list.map(m => (
          <Box key={m.name} columnGap={1}>
            <Text dimColor>{m.name}</Text>
            <Text color={INK[m.level]}>{bandText(m)}</Text>
          </Box>
        ))}
      </Box>
    )
  })
}
