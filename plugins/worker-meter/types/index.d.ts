export type Level = 'ok' | 'warn' | 'full' | 'off'

// One quota window of a worker: its label (`5h`, `7d`) and percent used.
export type Reading = { label: string; pct: number }

export type Meter = { name: string; level: Level; readings: Reading[]; note: string }

export type Session = { contextPct: number | null; costUsd: number | null }

declare module 'claude-code' {
  interface PluginState {
    'worker-meter': { meters: Meter[]; session: Session | null; isDashOpen: boolean }
  }
}
