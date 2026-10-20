// One Vexel frame: up to 15 colours and rows of one hex digit per pixel, `.` transparent.
export type Frame = { palette: string[]; rows: string[] }

// The parts of `floor --json` this mod reads.
export type Child = { id: string; desc: string }

export type Agent = {
  id: string
  host: string
  worker: boolean
  state: string
  children: Child[]
  say: string | null
  reach: string
}

export type Room = { name: string; cwd: string; agents: Agent[] }

export type Floor = { rooms: Room[] }

declare module 'claude-code' {
  interface PluginState {
    'dispatch-band': { floor: Floor | null; isPaneOpen: boolean }
  }
}
