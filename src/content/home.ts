import { TASKS, type Task, type ZoneId } from './tasks'

export type HomeId = 'studio' | 'one' | 'two' | 'three'
export const HOMES: { id: HomeId; name: string }[] = [
  { id: 'studio', name: 'Студия' },
  { id: 'one', name: '1 комната' },
  { id: 'two', name: '2 комнаты' },
  { id: 'three', name: '3 и больше' },
]

const LABELS: Record<ZoneId, string> = {
  kitchen: 'Кухня', hall: 'Прихожая', living: 'Гостиная', bedroom: 'Спальня',
  desk: 'Рабочий стол', bath: 'Ванная', extra: 'Ещё одна комната',
}

/** Название места для этой квартиры; null — такого места нет. Не указано — считаем как 2 комнаты. */
export function placeName(zone: ZoneId, home: HomeId | null): string | null {
  if (zone === 'extra') return home === 'three' ? LABELS.extra : null
  if (home === 'studio' && zone === 'kitchen') return 'Кухонная зона'
  if ((home === 'studio' || home === 'one') && (zone === 'living' || zone === 'bedroom')) return 'Комната'
  return LABELS[zone]
}

/** Места этой квартиры без повторов: в студии гостиная и спальня — одна комната. */
export function places(home: HomeId | null): { zone: ZoneId; name: string }[] {
  const out: { zone: ZoneId; name: string }[] = []
  for (const zone of Object.keys(LABELS) as ZoneId[]) {
    const name = placeName(zone, home)
    if (name && !out.some(p => p.name === name)) out.push({ zone, name })
  }
  return out
}

/** Подходит ли задача квартире и выбранному месту. */
export function fits(t: Task, home: HomeId | null, focus: ZoneId | null): boolean {
  const name = placeName(t.zone, home)
  return name !== null && (!focus || name === placeName(focus, home))
}

export const tasksFor = (home: HomeId | null, focus: ZoneId | null) => TASKS.filter(t => fits(t, home, focus))
