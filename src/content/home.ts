import { TASKS, type ZoneId } from './tasks'

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
const oneRoom = (home: HomeId | null) => home === 'studio' || home === 'one'

/** Название места для этой квартиры; null — такого места нет. Не указано — считаем как 2 комнаты. */
export function placeName(zone: ZoneId, home: HomeId | null): string | null {
  if (zone === 'extra') return home === 'three' ? LABELS.extra : null
  if (home === 'studio' && zone === 'kitchen') return 'Кухонная зона'
  if (oneRoom(home) && (zone === 'living' || zone === 'bedroom')) return 'Комната'
  return LABELS[zone]
}

/** Место недели, к которому относится зона: стол идёт вместе со спальней, в одной комнате всё вместе. */
export function weekZone(zone: ZoneId, home: HomeId | null): ZoneId {
  if (zone === 'desk' || (zone === 'living' && oneRoom(home))) return 'bedroom'
  return zone === 'extra' && home !== 'three' ? 'kitchen' : zone
}

export const weekName = (zone: ZoneId, home: HomeId | null) =>
  zone === 'bedroom' && !oneRoom(home) ? 'Спальня и рабочий стол' : placeName(zone, home)!

const ORDER: ZoneId[] = ['kitchen', 'bath', 'hall', 'bedroom', 'living', 'extra']
/** Порядок мест по неделям для этой квартиры. */
export const weekPlaces = (home: HomeId | null) => ORDER
  .filter(z => weekZone(z, home) === z)
  .map(zone => ({ zone, name: weekName(zone, home) }))

export function nextWeekZone(zone: ZoneId, home: HomeId | null): ZoneId {
  const list = weekPlaces(home)
  return list[(list.findIndex(p => p.zone === weekZone(zone, home)) + 1) % list.length]!.zone
}

export const tasksFor = (home: HomeId | null) => TASKS.filter(t => placeName(t.zone, home) !== null)
