import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Floor, Room } from '../types'

import { crabFrame } from './crab'
import {
  colorOf,
  halfBlocks,
  helpersOf,
  isBusy,
  leadOf,
  lookOf,
  matchProject,
  parseFloor,
  parseRoute,
} from './floor'

const PANE = 'crew'
const REFRESH_MS = 5_000
const COLUMN = 14
// Crab rows plus name, state and helpers lines: the band draws crabs only when they fit.
const TALL_ROWS = 9

const floorAtom = atom({ plugin: 'dispatch-band', key: 'floor' } as const, null)
const isPaneOpen = atom({ plugin: 'dispatch-band', key: 'isPaneOpen' } as const, false)

let floorBin: string[] | undefined
let readAt = -Infinity

const byVersion = (a: string, b: string) => {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const d = (pa[i] || 0) - (pb[i] || 0)
    if (d !== 0) {
      return d
    }
  }
  return 0
}

// STUNTMAN_FLOOR_BIN, else the newest installed Stuntman plugin, else install.sh's copy.
const findFloor = async ($: EngineInterface): Promise<string[]> => {
  if (floorBin) {
    return floorBin
  }
  const python = (await $.env.get('OS')) === 'Windows_NT' ? 'python' : 'python3'
  const own = await $.env.get('STUNTMAN_FLOOR_BIN')
  floorBin = [python, own || (await installedFloor($))]
  return floorBin
}

const installedFloor = async ($: EngineInterface) => {
  const home = (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE')) ?? ''
  const cache = `${home}/.claude/plugins/cache/stuntman/stuntman`
  const versions = (await $.fs.list(cache).catch(() => []))
    .filter(v => v.kind === 'dir' && /^\d+(\.\d+)*$/.test(v.name))
    .map(v => v.name)
    .sort(byVersion)
  const newest = versions[versions.length - 1]
  return newest ? `${cache}/${newest}/bin/floor` : `${home}/.local/bin/floor`
}

const runFloor = async ($: EngineInterface, args: string[]) => {
  const { stdout } = await $.process.run([...(await findFloor($)), ...args])
  return stdout
}

const refresh = async ($: EngineInterface, isForced = false) => {
  const now = await $.clock.now()
  if (!isForced && now - readAt < REFRESH_MS - 500) {
    return
  }
  readAt = now
  try {
    const floor = parseFloor(await runFloor($, ['--json']))
    if (floor) {
      await update($, floorAtom, () => floor)
    }
  } catch (error) {
    $.ui.log(`dispatch-band: floor read failed: ${String(error)}`, { to: 'debug' })
  }
}

const countsOf = (floor: Floor) => {
  const counts = { agents: 0, working: 0, needs: 0, done: 0 }
  for (const room of floor.rooms) {
    for (const agent of room.agents) {
      counts.agents += 1 + agent.children.length
      counts.working += (isBusy(agent.state) ? 1 : 0) + agent.children.length
      counts.needs += agent.state === 'needs_input' ? 1 : 0
      counts.done += agent.state === 'done' ? 1 : 0
    }
  }
  return counts
}

// Sends by folder, so the floor routes to the room this hook matched; never to this session.
const send = async ($: EngineInterface, body: string, room: Room): Promise<{ ok: boolean; text: string }> => {
  try {
    const self = await $.session.id()
    const result = JSON.parse(await runFloor($, ['send', '--not', self, '--', room.cwd, body]))
    return result.ok
      ? { ok: true, text: `Sent to ${result.project}.` }
      : { ok: false, text: `Not sent to ${room.name}: ${result.detail ?? result.reason}` }
  } catch (error) {
    return { ok: false, text: `Not sent to ${room.name}: the floor did not answer (${String(error)}).` }
  }
}

const openPane = async ($: EngineInterface) => {
  const opened = await $.ui.open({ id: PANE, title: 'Crew', columns: 46 })
  await update($, isPaneOpen, () => opened.isPlaced)
  return opened
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'crew', description: 'Open the crew pane: every project agent on the floor' })
    void refresh($, true)
    $.clock.every(REFRESH_MS, () => void refresh($))
    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    void refresh($)
    return next(e)
  })

  on('command.run', { command: 'crew' }, async $ => {
    const opened = await openPane($)
    return { text: opened.isPlaced ? 'Crew pane opened.' : `Crew pane not shown: ${opened.reason}` }
  })

  on('ui.close', { id: PANE }, async ($, e, next) => {
    const closed = await next(e)
    if (closed.deny === undefined) {
      await update($, isPaneOpen, () => false)
    }
    return closed
  })

  // `@project text` from the person goes to that project's agent; nothing reaches this model.
  on('prompt.submit', async ($, e, next) => {
    const route = e.command || e.isMeta || !['composer', 'bridge'].includes(e.origin.kind) ? undefined : parseRoute(e.text)
    if (!route) {
      return next(e)
    }
    await refresh($, true)
    const room = matchProject(route.target, (await read($, floorAtom))?.rooms ?? [])
    // A file or folder of that name here is a mention, not a project.
    if (!room || (await $.fs.exists(route.target).catch(() => false))) {
      return next(e)
    }
    const sent = await send($, route.body, room)
    $.ui.toast(sent.text)
    if (!sent.ok) {
      // Give the person their words back to edit or resend.
      await $.prompt.fill({ text: e.text })
    }
    return { drop: sent.text }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const floor = await read($, floorAtom)
    if (e.props.hasSurvey || !floor || floor.rooms.length === 0 || (await read($, isPaneOpen))) {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)
    const counts = countsOf(floor)
    const isTall = e.props.maxRows >= TALL_ROWS
    const fit = Math.max(1, Math.floor(e.props.bodyColumns / COLUMN))
    const shown = floor.rooms.slice(0, fit)

    const crab = (room: Room, host: string, state: string) =>
      halfBlocks(crabFrame(colorOf(room.name), host, state)).map((cells, y) => (
        <Box key={`v${y}`}>
          {cells.map((c, x) => (
            <Text key={`c${x}`} color={c.color} backgroundColor={c.backgroundColor}>
              {c.char}
            </Text>
          ))}
        </Box>
      ))

    const column = (room: Room) => {
      const lead = leadOf(room)
      if (!lead) {
        return undefined
      }
      const look = lookOf(lead.state)
      const helpers = helpersOf(room, lead).filter(h => isBusy(h.state)).length
      return (
        <Box key={room.cwd} flexDirection="column" width={COLUMN}>
          {isTall && crab(room, lead.host, lead.state)}
          <Text color={colorOf(room.name)} wrap="truncate">
            {room.name}
          </Text>
          <Text color={look.color}>{`${look.mark} ${look.word}`}</Text>
          <Text dimColor>{helpers > 0 ? `+${helpers} working` : lead.host}</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Box columnGap={2}>
          <Text bold>{`${counts.agents} agents`}</Text>
          <Text color="#5BB8FF">{`● ${counts.working} working`}</Text>
          <Text color="#FFB547">{`▲ ${counts.needs} needs you`}</Text>
          <Text color="#3DDC97">{`✓ ${counts.done} done`}</Text>
          <Text dimColor>@project sends to it</Text>
        </Box>
        <Box>
          {shown.map(column)}
          {floor.rooms.length > shown.length && <Text dimColor>{`+${floor.rooms.length - shown.length} more`}</Text>}
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const floor = await read($, floorAtom)
    if (!floor || floor.rooms.length === 0) {
      return <Text dimColor>No agents on the floor yet.</Text>
    }
    const card = (room: Room) => {
      const lead = leadOf(room)
      if (!lead) {
        return undefined
      }
      const look = lookOf(lead.state)
      return (
        <Box key={room.cwd} columnGap={1} marginBottom={1}>
          <Box flexDirection="column">
            {halfBlocks(crabFrame(colorOf(room.name), lead.host, lead.state)).map((cells, y) => (
              <Box key={`v${y}`}>
                {cells.map((c, x) => (
                  <Text key={`c${x}`} color={c.color} backgroundColor={c.backgroundColor}>
                    {c.char}
                  </Text>
                ))}
              </Box>
            ))}
          </Box>
          <Box flexDirection="column" flexShrink={1}>
            <Text bold color={colorOf(room.name)} wrap="truncate">
              {room.name}
            </Text>
            <Text color={look.color}>{`${look.mark} ${look.word} · ${lead.host}${lead.reach === 'tmux' ? '' : ' · view only'}`}</Text>
            {lead.say && <Text wrap="truncate">{lead.say}</Text>}
            {helpersOf(room, lead).map(h => (
              <Text key={h.id} wrap="truncate" color={lookOf(h.state).color}>
                {`${lookOf(h.state).mark} ${h.kind} ${h.label}`}
              </Text>
            ))}
          </Box>
        </Box>
      )
    }
    return <Box flexDirection="column">{floor.rooms.map(card)}</Box>
  })
}
