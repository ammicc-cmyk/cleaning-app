import { TASKS, ZONES, type Task, type ZoneId } from '../content/tasks'

/** Предпочитаем задачи, которых давно не было; текущую не повторяем. */
export function pickTask(zone: ZoneId, recent: string[], current?: string, rnd = Math.random): Task {
  const all = TASKS.filter(t => t.zone === zone && t.id !== current)
  const fresh = all.filter(t => !recent.slice(-5).includes(t.id))
  const pool = fresh.length ? fresh : all
  return pool[Math.floor(rnd() * pool.length)]!
}

/** Человек не выбирает зону: берём другую, чем сейчас и чем в прошлый раз. */
export function pickNext(zone: ZoneId | null, recent: string[], current?: string, rnd = Math.random): Task {
  if (zone) return pickTask(zone, recent, current, rnd)
  const avoid = [current, recent.at(-1)].map(id => TASKS.find(t => t.id === id)?.zone)
  const zones = ZONES.filter(z => !avoid.includes(z.id))
  return pickTask(zones[Math.floor(rnd() * zones.length)]!.id, recent, current, rnd)
}
