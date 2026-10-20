import type { Frame } from '../types'

// A 13×10 pixel crab: three rows of hat space, then the crab. Colour = project,
// hat = host, pose = state. Letters index the palette below; `.` is empty.
const BODY = [
  '.............',
  '.............',
  '.............',
  '..BBBBBBBBB..',
  '..BBEBBBEBB..',
  'CCBBEBBBEBBCC',
  'CCBBBBBBBBBCC',
  '..BBBBBBBBB..',
  '...L.L.L.L...',
  '...L.L.L.L...',
]

// Codex wears a cap, stunt workers (opencode, agy, muse) a helmet, Claude nothing.
const HATS: Record<string, string[]> = {
  codex: ['.............', '...WWWWWWW...', '.WWWWWWWWW...'],
  // The dark brim keeps the helmet apart from a yellow crab.
  helmet: ['...YYYKYYY...', '..YYYYKYYYY..', '.KKKKKKKKKKK.'],
}

const hatOf = (host: string) => (host === 'claude' ? undefined : host === 'codex' ? HATS.codex : HATS.helmet)

const put = (grid: string[][], x: number, y: number, ch: string) => {
  const row = grid[y]
  if (row && x >= 0 && x < row.length) {
    row[x] = ch
  }
}

// Pose changes on top of the base crab, by state.
const POSES: Record<string, (g: string[][]) => void> = {
  // Claws up, busy.
  running: g => {
    for (const x of [0, 1, 11, 12]) {
      put(g, x, 5, '.')
      put(g, x, 6, '.')
      put(g, x, 3, 'C')
      put(g, x, 4, 'C')
    }
  },
  // Eyes look up.
  thinking: g => {
    put(g, 4, 5, 'B')
    put(g, 8, 5, 'B')
  },
  // One claw waves high.
  needs_input: g => {
    for (const y of [5, 6]) {
      put(g, 11, y, '.')
      put(g, 12, y, '.')
    }
    for (const y of [1, 2, 3]) {
      put(g, 12, y, 'C')
    }
    put(g, 11, 3, 'C')
  },
  // Happy closed eyes: a line low in the face.
  done: g => {
    put(g, 4, 4, 'B')
    put(g, 8, 4, 'B')
  },
  // Flat on its back: legs up, eyes as crosses.
  failed: g => {
    for (const x of [3, 5, 7, 9]) {
      put(g, x, 8, '.')
      put(g, x, 9, '.')
      put(g, x, 1, 'L')
      put(g, x, 2, 'L')
    }
    put(g, 4, 4, 'X')
    put(g, 8, 4, 'X')
  },
}

const EYES = '#0D1014'

// Idle crabs are drawn dimmed: the project colour mixed halfway to the background.
const dim = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  const mix = (shift: number) => Math.round(((n >> shift) & 255) * 0.5 + 13 * 0.5)
  return `#${[16, 8, 0].map(s => mix(s).toString(16).padStart(2, '0')).join('')}`
}

export const crabFrame = (color: string, host: string, state: string): Frame => {
  const grid = BODY.map(r => [...r])
  const hat = state === 'failed' ? undefined : hatOf(host)
  hat?.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && put(grid, x, y, ch)))
  POSES[state]?.(grid)
  const body = ['running', 'thinking', 'needs_input', 'done', 'failed'].includes(state) ? color : dim(color)
  // Palette order matches the hex digits the rows are turned into.
  const palette = [body, EYES, '#E6E8EB', '#F2C14E', '#3A2A10', '#FF7A7A']
  const code: Record<string, string> = { B: '0', C: '0', L: '0', E: '1', W: '2', Y: '3', K: '4', X: '5' }
  return { palette, rows: grid.map(r => r.map(ch => code[ch] ?? '.').join('')) }
}
