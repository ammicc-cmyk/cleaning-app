import type { Minutes } from '../content/tasks'

/** Остаток всегда считается от часов, поэтому фон и перезагрузка его не сбивают. */
export interface ActiveTimer {
  startedAt: number
  durationMs: number
  endsAt: number
  pausedLeftMs: number | null
  plan: string[]
  i: number // какое дело сейчас
  done: string[]
  minutes: Minutes
}

export function startTimer(now: number, minutes: Minutes, plan: string[]): ActiveTimer {
  const durationMs = minutes * 60_000
  return { startedAt: now, durationMs, endsAt: now + durationMs, pausedLeftMs: null, minutes, plan, i: 0, done: [] }
}
export function leftMs(t: ActiveTimer, now: number): number {
  return Math.min(t.durationMs, Math.max(0, t.pausedLeftMs ?? t.endsAt - now))
}
export function pause(t: ActiveTimer, now: number): ActiveTimer {
  return t.pausedLeftMs !== null ? t : { ...t, pausedLeftMs: leftMs(t, now) }
}
export function resume(t: ActiveTimer, now: number): ActiveTimer {
  return t.pausedLeftMs === null ? t : { ...t, endsAt: now + t.pausedLeftMs, pausedLeftMs: null }
}
export function elapsedSec(t: ActiveTimer, now: number): number {
  return Math.round((t.durationMs - leftMs(t, now)) / 1000)
}
export function formatLeft(ms: number): string {
  const s = Math.ceil(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
