import type { Minutes, Task, ZoneId } from '../content/tasks'
import { tasksFor, weekZone, type HomeId } from '../content/home'

/** id дела → когда сделано, unix-секунды. */
export type Done = Record<string, number>
export interface Focus { zone: ZoneId; since: number }
export interface PlanState {
  home: HomeId | null
  focus: Focus | null // null: неделя начнётся с первой сессии
  done: Done
  skipped: { day: number; ids: string[] }
  nextFive: 'routine' | 'deep'
}

/** Номер местного календарного дня. */
export const dayNum = (ms: number) => {
  const d = new Date(ms)
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000)
}
export const focusZone = (s: PlanState): ZoneId => weekZone(s.focus?.zone ?? 'kitchen', s.home)
export const skippedToday = (s: PlanState, now: number) => s.skipped.day === dayNum(now) ? s.skipped.ids : []

function hash(text: string): number {
  let a = 2166136261
  for (const ch of text) a = Math.imul(a ^ ch.codePointAt(0)!, 16777619)
  a = Math.imul(a ^ (a >>> 15), 2246822507)
  return (a ^ (a >>> 13)) >>> 0
}
/** Насколько делу пора: от 1 предлагаем. Больше 2 не растёт, пропуски не копятся в долг. */
function readiness(t: Task, s: PlanState, now: number): number {
  const at = s.done[t.id]
  if (at === undefined) return 2
  const days = dayNum(now) - dayNum(at * 1000)
  return days < 0 ? 2 : Math.min(2, days / t.every) // отметка из будущего: часы сбились
}
const sum = (list: Task[]) => list.reduce((n, t) => n + t.min, 0)

/** Порядок дел, которым пора. Внутри дня не меняется, поэтому план стоит на месте. */
function ready(tasks: Task[], s: PlanState, now: number): Task[] {
  const key = (t: Task) => hash(`${dayNum(now)}:${t.id}`)
  return tasks.map(t => ({ t, r: readiness(t, s, now) })).filter(x => x.r >= 1)
    .sort((a, b) => b.r - a.r || key(a.t) - key(b.t)).map(x => x.t)
}
function take(from: Task[], budget: number): Task[] {
  const out: Task[] = []
  for (const t of from) if (sum(out) + t.min <= budget) out.push(t)
  return out
}

/** Дела одного места подряд, чтобы не ходить туда-обратно. Место недели в конце: за ним идут его большие дела. */
function byPlace(list: Task[], home: HomeId | null, last: ZoneId): Task[] {
  const places = [...new Set(list.map(t => weekZone(t.zone, home)))].sort((a, b) => Number(a === last) - Number(b === last))
  return places.flatMap(p => list.filter(t => weekZone(t.zone, home) === p))
}

/** Дела на одну сессию: сначала короткая рутина, затем место недели. */
export function buildPlan(s: PlanState, minutes: Minutes, now: number, mode: 'auto' | 'routine' = 'auto'): Task[] {
  const make = (skip: string[]): Task[] => {
    const all = tasksFor(s.home).filter(t => !skip.includes(t.id))
    // Одно еженедельное дело впереди: иначе его каждый раз вытесняли бы ежедневные.
    const weekly = ready(all.filter(t => t.layer === 'weekly'), s, now)
    const daily = ready(all.filter(t => t.layer === 'routine'), s, now)
    // Лёгкий режим начинаем с самого простого.
    const routine = mode === 'routine'
      ? [...daily].sort((a, b) => a.min - b.min)
      : [...weekly.slice(0, 1), ...daily, ...weekly.slice(1)]
    const zone = focusZone(s)
    // Несделанное раньше сделанного на прошлом круге; внутри — от простого к сложному.
    const deep = mode === 'routine' ? [] : all
      .filter(t => t.layer === 'deep' && weekZone(t.zone, s.home) === zone && readiness(t, s, now) >= 1)
      .sort((a, b) => (s.done[a.id] ?? 0) - (s.done[b.id] ?? 0))

    const part = !deep.length ? minutes : minutes === 5 && s.nextFive === 'deep' ? 0 : 5
    let small = take(routine, part)
    let big = take(deep, minutes - sum(small))
    // Остались только большие дела: берём одно, рутину сокращаем.
    if (!big.length && deep.length && part < minutes) {
      big = [deep.reduce((a, b) => b.min < a.min ? b : a)]
      small = take(small, minutes - sum(big))
    }
    small.push(...take(routine.filter(t => !small.includes(t)), minutes - sum(small) - sum(big)))
    return [...byPlace(small.sort((a, b) => a.min - b.min), s.home, zone), ...big]
  }
  const plan = make(skippedToday(s, now))
  if (plan.length) return plan
  const again = make([])
  if (again.length) return again
  // Всё свежее: предлагаем самое лёгкое.
  const easy = tasksFor(s.home).filter(t => t.layer === 'routine')
  return [easy.reduce((a, b) => b.min < a.min ? b : a)]
}

/** Отложить дело до завтра. Если отложено уже всё, начинаем список заново. */
export function skip(s: PlanState, id: string, minutes: Minutes, now: number): PlanState['skipped'] {
  const day = dayNum(now)
  const ids = [...new Set([...skippedToday(s, now), id])]
  const stuck = buildPlan({ ...s, skipped: { day, ids } }, minutes, now).some(t => ids.includes(t.id))
  return { day, ids: stuck ? [id] : ids }
}

export function focusInfo(s: PlanState, now: number) {
  const zone = focusZone(s)
  const list = tasksFor(s.home).filter(t => t.layer === 'deep' && weekZone(t.zone, s.home) === zone)
  const done = list.filter(t => readiness(t, s, now) < 1).length
  return {
    zone, total: list.length, done, allDone: done === list.length,
    weekOver: !!s.focus && dayNum(now) - dayNum(s.focus.since * 1000) >= 7,
  }
}
