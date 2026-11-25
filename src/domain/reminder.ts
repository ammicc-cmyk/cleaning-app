import { taskText, type Minutes } from '../content/tasks'
import { placeName, type HomeId } from '../content/home'
import { pickNext } from './taskPicker'

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

/** События с готовой задачей внутри: приложение открывать не нужно. Время местное. */
export function reminderIcs(
  time: string, now: Date, o: { home: HomeId | null; minutes: Minutes; recent: string[]; days?: number },
): string {
  const [h, m] = time.split(':').map(Number) as [number, number]
  const p = (n: number) => String(n).padStart(2, '0')
  const stamp = now.toISOString().replace(/[-:]|\.\d+/g, '')
  const first = new Date(now)
  first.setHours(h, m, 0, 0)
  const shift = first <= now ? 1 : 0
  let recent = o.recent
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//cleaning-app//RU']
  for (let i = 0; i < (o.days ?? 14); i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + shift + i)
    const day = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
    const task = pickNext(o.home, null, recent, recent.at(-1))
    recent = [...recent, task.id].slice(-10)
    const place = placeName(task.zone, o.home)!
    lines.push(
      'BEGIN:VEVENT', `UID:${day}-cleaning-app`, `DTSTAMP:${stamp}`,
      `DTSTART:${day}T${p(h)}${p(m)}00`, `DURATION:PT${o.minutes}M`,
      `SUMMARY:${esc(`${place}, ${o.minutes} мин: ${taskText(task, 5)}`)}`,
      `DESCRIPTION:${esc(`${taskText(task, o.minutes)}\nЕсли сегодня нет сил, просто пропустите. Это нормально.`)}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(place)}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT')
  }
  return [...lines, 'END:VCALENDAR', ''].map(fold).join('\r\n')
}
