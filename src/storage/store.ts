import { TASKS, ZONES, type Minutes, type ZoneId } from '../content/tasks'
import type { ActiveTimer } from '../domain/timer'
import { isSession, mergeSessions, type Session } from '../domain/progress'

export interface AppState {
  v: 1
  zone: ZoneId
  minutes: Minutes
  taskId: string
  recent: string[]
  sessions: Session[]
  backedUp: number // сколько сессий было в последней копии
  timer: ActiveTimer | null
}
export const KEY = 'cleaning-app'
export const initial: AppState = {
  v: 1, zone: 'kitchen', minutes: 12, taskId: 'K1', recent: [], sessions: [], backedUp: 0, timer: null,
}

export function parseState(raw: string | null): AppState {
  if (!raw) return initial
  const p = JSON.parse(raw) as Partial<AppState>
  const zone = ZONES.some(z => z.id === p.zone) ? p.zone! : initial.zone
  const t = p.timer
  const timerOk = !!t && [t.startedAt, t.durationMs, t.endsAt].every(Number.isFinite)
    && (t.pausedLeftMs === null || Number.isFinite(t.pausedLeftMs)) && TASKS.some(x => x.id === t.taskId)
  return {
    v: 1, zone,
    minutes: p.minutes === 5 || p.minutes === 15 ? p.minutes : 12,
    taskId: TASKS.some(x => x.id === p.taskId && x.zone === zone) ? p.taskId! : TASKS.find(x => x.zone === zone)!.id,
    recent: Array.isArray(p.recent) ? p.recent.filter(x => typeof x === 'string').slice(-10) : [],
    sessions: Array.isArray(p.sessions) ? mergeSessions(p.sessions.filter(isSession), []) : [],
    backedUp: Number.isFinite(p.backedUp) ? p.backedUp! : 0,
    timer: timerOk ? t : null,
  }
}
export function load(): AppState {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
    return parseState(raw)
  } catch {
    // Не затираем нечитаемые данные: оставляем копию для ручного восстановления.
    try { if (raw) localStorage.setItem(`${KEY}-broken`, raw) } catch { /* хранилище недоступно */ }
    return initial
  }
}
export function save(s: AppState): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true } catch { return false }
}
