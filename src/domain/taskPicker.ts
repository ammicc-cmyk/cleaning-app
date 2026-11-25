import { TASKS, type Task, type ZoneId } from '../content/tasks'
import { placeName, tasksFor, type HomeId } from '../content/home'

/** Человек не выбирает место: берём другое, чем сейчас и чем в прошлый раз.
 *  Если место выбрано (focus), остаёмся в нём. Недавние задачи по возможности не повторяем. */
export function pickNext(
  home: HomeId | null, focus: ZoneId | null, recent: string[], current?: string, rnd = Math.random,
): Task {
  const avoid = focus ? [] : [current, recent.at(-1)].map(id => {
    const t = TASKS.find(x => x.id === id)
    return t ? placeName(t.zone, home) : undefined
  })
  const all = tasksFor(home, focus).filter(t => t.id !== current && !avoid.includes(placeName(t.zone, home)))
  const fresh = all.filter(t => !recent.slice(-5).includes(t.id))
  const pool = fresh.length ? fresh : all
  return pool[Math.floor(rnd() * pool.length)]!
}
