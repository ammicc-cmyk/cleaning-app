import { HOMES, tasksFor, type HomeId } from '../content/home'
import { taskById, type Minutes } from '../content/tasks'
import { cleanDone, cleanFocus } from '../domain/backup'
import type { PlanState } from '../domain/planner'
import { isSession, mergeSessions, type Session } from '../domain/progress'
import type { ActiveTimer } from '../domain/timer'
import { isCode } from './cloud'

export interface AppState extends PlanState {
  v: 3
  minutes: Minutes
  sessions: Session[]
  backedUp: number // сколько сессий было в последней копии
  timer: ActiveTimer | null
  guiltFree: boolean
  cloudCode: string | null // личный код автосохранения
  remindAt: string
}
export const KEY = 'cleaning-app'
export const initial: AppState = {
  v: 3, home: null, focus: null, done: {}, skipped: { day: 0, ids: [] }, nextFive: 'routine',
  minutes: 15, sessions: [], backedUp: 0, timer: null, guiltFree: false, cloudCode: null, remindAt: '19:00',
}

function parseTimer(x: unknown, home: HomeId | null): ActiveTimer | null {
  const t = x as (ActiveTimer & { zone?: string }) | null | undefined
  if (!t || ![t.startedAt, t.durationMs, t.endsAt].every(Number.isFinite)
    || !(t.pausedLeftMs === null || Number.isFinite(t.pausedLeftMs)) || ![5, 12, 15].includes(t.minutes)) return null
  const base = { startedAt: t.startedAt, durationMs: t.durationMs, endsAt: t.endsAt, pausedLeftMs: t.pausedLeftMs, minutes: t.minutes }
  // Таймер прежней версии: одно дело из того же места, время не теряем.
  if (!Array.isArray(t.plan)) {
    const all = tasksFor(home)
    return { ...base, plan: [(all.find(k => k.zone === t.zone) ?? all[0]!).id], i: 0, done: [] }
  }
  if (!t.plan.every(id => taskById(id)) || !Number.isInteger(t.i) || t.i < 0 || t.i >= t.plan.length) return null
  return { ...base, plan: t.plan, i: t.i, done: Array.isArray(t.done) ? t.done.filter(id => taskById(id)) : [] }
}

export function parseState(raw: string | null): AppState {
  if (!raw) return initial
  const p = JSON.parse(raw) as Partial<AppState>
  const home = HOMES.some(h => h.id === p.home) ? p.home! : null
  const sk = p.skipped
  return {
    v: 3, home,
    focus: cleanFocus(p.focus),
    done: cleanDone(p.done),
    skipped: sk && Number.isInteger(sk.day) && Array.isArray(sk.ids) ? { day: sk.day, ids: sk.ids.filter(id => taskById(id)) } : initial.skipped,
    nextFive: p.nextFive === 'deep' ? 'deep' : 'routine',
    minutes: p.minutes === 5 || p.minutes === 12 ? p.minutes : initial.minutes,
    sessions: Array.isArray(p.sessions) ? mergeSessions(p.sessions.filter(isSession), []) : [],
    backedUp: Number.isFinite(p.backedUp) ? p.backedUp! : 0,
    timer: parseTimer(p.timer, home),
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
