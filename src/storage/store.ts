import { TASKS, type Minutes, type ZoneId } from '../content/tasks'
import { HOMES, places, tasksFor, type HomeId } from '../content/home'
import type { ActiveTimer } from '../domain/timer'
import { isCode } from './cloud'
import { isSession, mergeSessions, type Session } from '../domain/progress'

export interface AppState {
  v: 2
  zone: ZoneId | null // null: приложение подбирает само
  minutes: Minutes
  taskId: string
  recent: string[]
  sessions: Session[]
  backedUp: number // сколько сессий было в последней копии
  timer: ActiveTimer | null
  guiltFree: boolean
  cloudCode: string | null // личный код автосохранения
  home: HomeId | null // null: не указано
  remindAt: string
}
export const KEY = 'cleaning-app'
export const initial: AppState = {
  v: 2, zone: null, minutes: 15, taskId: 'K1', recent: [], sessions: [], backedUp: 0, timer: null,
  guiltFree: false, cloudCode: null, home: null, remindAt: '19:00',
}

export function parseState(raw: string | null): AppState {
  if (!raw) return initial
  const p = JSON.parse(raw) as Partial<AppState>
  // В версии 1 зона была выбрана всегда, даже без участия человека, поэтому её не переносим.
  const home = HOMES.some(h => h.id === p.home) ? p.home! : null
  const zone = p.v === 2 && places(home).some(x => x.zone === p.zone) ? p.zone! : null
  const tasks = tasksFor(home, zone)
  const t = p.timer
  const timerOk = !!t && [t.startedAt, t.durationMs, t.endsAt].every(Number.isFinite)
    && (t.pausedLeftMs === null || Number.isFinite(t.pausedLeftMs)) && TASKS.some(x => x.id === t.taskId)
  return {
    v: 2, zone, home,
    minutes: p.minutes === 5 || p.minutes === 12 ? p.minutes : initial.minutes,
    taskId: tasks.some(x => x.id === p.taskId) ? p.taskId! : tasks[0]!.id,
    recent: Array.isArray(p.recent) ? p.recent.filter(x => typeof x === 'string').slice(-10) : [],
    sessions: Array.isArray(p.sessions) ? mergeSessions(p.sessions.filter(isSession), []) : [],
    backedUp: Number.isFinite(p.backedUp) ? p.backedUp! : 0,
    timer: timerOk ? t : null,
    guiltFree: p.guiltFree === true,
    cloudCode: isCode(p.cloudCode) ? p.cloudCode : null,
    remindAt: /^([01]\d|2[0-3]):[0-5]\d$/.test(p.remindAt ?? '') ? p.remindAt! : initial.remindAt,
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
