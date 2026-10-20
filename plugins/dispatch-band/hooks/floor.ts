import type { Agent, Floor, Frame, Room } from '../types'

import { VEXELS } from './vexels'

// Project tag colours, picked in order; each pairs with the project's name.
export const PROJECT_COLORS = ['#D97757', '#5BB8FF', '#F2C14E', '#3DDC97', '#E58BE6', '#FF9F6B', '#9FA8FF']

export type Look = { word: string; mark: string; color: string; pose: string }

const LOOKS: Record<string, Look> = {
  running: { word: 'working', mark: '●', color: '#5BB8FF', pose: 'working' },
  thinking: { word: 'thinking', mark: '◐', color: '#C3A3FF', pose: 'thinking' },
  needs_input: { word: 'needs you', mark: '▲', color: '#FFB547', pose: 'needs' },
  done: { word: 'done', mark: '✓', color: '#3DDC97', pose: 'done' },
  failed: { word: 'failed', mark: '✕', color: '#FF7A7A', pose: 'failed' },
}
const RESTING: Look = { word: 'idle', mark: '–', color: '#A3ABB5', pose: 'idle' }

// Floor hosts to Vexel skins; Muse and anything unknown wear Laghari.
const SKINS: Record<string, string> = { claude: 'claude', codex: 'codex', opencode: 'opencode', agy: 'agy' }

export const lookOf = (state: string): Look => LOOKS[state] ?? RESTING

export const frameOf = (host: string, state: string, size: 'band' | 'pane'): Frame | undefined =>
  (VEXELS[SKINS[host] ?? 'laghari'] ?? VEXELS['laghari'])?.[lookOf(state).pose]?.[size]

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')

// `@name` routes only on one exact project name (case and punctuation aside), never a
// prefix: `@s` or `@docs` must not catch an ordinary prompt.
export const matchProject = (target: string, rooms: readonly Room[]): Room | undefined => {
  const key = slug(target)
  const exact = key ? rooms.filter(r => slug(r.name) === key) : []
  return exact.length === 1 ? exact[0] : undefined
}

// `@project text`: no dot or slash in the name, so `@src/a.ts` stays a file mention.
export const parseRoute = (text: string): { target: string; body: string } | undefined => {
  const [, target, body] = /^@([A-Za-z0-9][A-Za-z0-9_-]*)\s+(\S[\s\S]*)$/.exec(text.trim()) ?? []
  return target && body ? { target, body: body.trim() } : undefined
}

// The agent that speaks for a project: its interactive session, else its first agent.
export const leadOf = (room: Room): Agent | undefined => room.agents.find(a => !a.worker) ?? room.agents[0]

export const helpersOf = (room: Room, lead: Agent) => [
  ...lead.children.map(c => ({ id: c.id, label: c.desc, kind: 'sub', host: lead.host, state: 'running' })),
  ...room.agents
    .filter(a => a !== lead)
    .map(a => ({ id: a.id, label: a.host, kind: a.worker ? 'stunt' : 'session', host: a.host, state: a.state })),
]

export const isBusy = (state: string) => state === 'running' || state === 'thinking'

export const parseFloor = (stdout: string): Floor | undefined => {
  try {
    const value = JSON.parse(stdout) as Floor
    return Array.isArray(value?.rooms) ? { rooms: value.rooms.filter(r => r.agents?.length > 0) } : undefined
  } catch {
    return undefined
  }
}

export type Cell = { char: string; color?: string; backgroundColor?: string }

// Two pixel rows per terminal row: `▀` takes the top pixel's colour, its
// background the bottom one's.
export const halfBlocks = (frame: Frame | undefined): Cell[][] => {
  if (!frame) {
    return []
  }
  const px = (y: number, x: number) => {
    const ch = frame.rows[y]?.[x]
    return ch === undefined || ch === '.' ? undefined : frame.palette[parseInt(ch, 16)]
  }
  const lines: Cell[][] = []
  for (let y = 0; y < frame.rows.length; y += 2) {
    lines.push(
      [...(frame.rows[y] ?? '')].map((_, x) => {
        const top = px(y, x)
        const bottom = px(y + 1, x)
        if (top && bottom) {
          return { char: '▀', color: top, backgroundColor: bottom }
        }
        return top ? { char: '▀', color: top } : bottom ? { char: '▄', color: bottom } : { char: ' ' }
      }),
    )
  }
  return lines
}
