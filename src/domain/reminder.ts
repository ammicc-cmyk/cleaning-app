import type { Minutes } from '../content/tasks'
import { weekName } from '../content/home'
import { dayNum, focusZone, type PlanState } from './planner'

const esc = (s: string) => s.replace(/[\\;,]/g, c => `\\${c}`).replace(/\n/g, '\\n')

/** Формат требует строк не длиннее 75 байт; кириллица занимает по два. */
function fold(line: string): string {
  const enc = new TextEncoder()
  let out = '', size = 0
  for (const ch of line) {
    const n = enc.encode(ch).length
    if (size + n > 73) { out += '\r\n '; size = 1 }
    out += ch
    size += n
  }
  return out
}

export interface Reminder { uid: string; start: string; title: string; minutes: Minutes }

/** Дела подбираются при открытии приложения, поэтому в календаре только место и время. */
export function buildIcs(items: Reminder[], now: Date, extra: string[] = []): string {
  const stamp = now.toISOString().replace(/[-:]|\.\d+/g, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//cleaning-app//RU', ...extra]
  for (const { uid, start, title, minutes } of items) {
    lines.push(
      'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${stamp}`, `DTSTART:${start}`, `DURATION:PT${minutes}M`,
      `SUMMARY:${esc(`${title}, ${minutes} мин`)}`,
      `DESCRIPTION:${esc(`Откройте приложение: дела уже подобраны.\nЕсли сегодня нет сил, просто пропустите. Это нормально.`)}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT')
  }
  return [...lines, 'END:VCALENDAR', ''].map(fold).join('\r\n')
}

/** Файл на 14 дней. Время местное, без часового пояса. */
export function reminderIcs(
  time: string, now: Date, o: PlanState & { minutes: Minutes },
): string {
  const [h, m] = time.split(':').map(Number) as [number, number]
  const p = (n: number) => String(n).padStart(2, '0')
  const first = new Date(now)
  first.setHours(h, m, 0, 0)
  const shift = first <= now ? 1 : 0
  const weekEnd = dayNum(o.focus ? o.focus.since * 1000 : now.getTime()) + 7
  const items: Reminder[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + shift + i)
    const day = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
    // Дальше недели место может смениться, поэтому его не называем.
    const title = dayNum(d.getTime()) < weekEnd ? `Место недели: ${weekName(focusZone(o), o.home)}` : 'Небольшая уборка'
    items.push({ uid: `${day}-cleaning-app`, start: `${day}T${p(h)}${p(m)}00`, title, minutes: o.minutes })
  }
  return buildIcs(items, now)
}
