import { TASKS, type Task, type ZoneId } from '../content/tasks'

/** Предпочитаем задачи, которых давно не было; текущую не повторяем. */
export function pickTask(zone: ZoneId, recent: string[], current?: string, rnd = Math.random): Task {
  const all = TASKS.filter(t => t.zone === zone && t.id !== current)
  const fresh = all.filter(t => !recent.slice(-5).includes(t.id))
  const pool = fresh.length ? fresh : all
  return pool[Math.floor(rnd() * pool.length)]!
}
