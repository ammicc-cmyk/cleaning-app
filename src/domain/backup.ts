import { weekPlaces } from '../content/home'
import { taskById, type ZoneId } from '../content/tasks'
import type { Done, Focus } from './planner'
import { decode, encode, type Session } from './progress'

export interface Backup { sessions: Session[]; done: Done; focus: Focus | null }

const isTime = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) > 0 && (x as number) < 1e11
export function cleanDone(x: unknown): Done {
  if (!x || typeof x !== 'object') return {}
  return Object.fromEntries(Object.entries(x).filter(([id, at]) => taskById(id) && isTime(at)))
}
export function cleanFocus(x: unknown): Focus | null {
  const f = x as Focus | null | undefined
  return f && weekPlaces('three').some(p => p.zone === f.zone) && isTime(f.since) ? { zone: f.zone, since: f.since } : null
}
/** Отметки с двух устройств: берём более поздние. */
export function mergeDone(a: Done, b: Done): Done {
  const out = { ...a }
  for (const [id, at] of Object.entries(b)) out[id] = Math.max(at, out[id] ?? 0)
  return out
}

/** Версия 2: «2~прежний код~место-когда~дело-когда.дело-когда~количество дел~end». Конец нужен, чтобы заметить обрезанную копию. */
export function encodeBackup(b: Backup): string {
  const marks = Object.entries(b.done).map(([id, at]) => `${id}-${at.toString(36)}`)
  const focus = b.focus ? `${b.focus.zone}-${b.focus.since.toString(36)}` : '0'
  return ['2', encode(b.sessions), focus, marks.join('.'), marks.length.toString(36), 'end'].join('~')
}

/** Понимает и копии первой версии. null — не наша или неполная копия. */
export function decodeBackup(input: string): Backup | null {
  const raw = input.trim()
  const mark = raw.indexOf('#restore=')
  const code = mark >= 0 ? raw.slice(mark + 9) : raw
  if (!code.startsWith('2~')) {
    const sessions = decode(code)
    return sessions && { sessions, done: {}, focus: null }
  }
  const parts = code.split('~')
  if (code.length > 2_000_000 || parts.length !== 6 || parts[5] !== 'end') return null
  const [, body, focusText, marksText, count] = parts as [string, string, string, string, string]
  const sessions = decode(body)
  const marks = marksText ? marksText.split('.') : []
  if (!sessions || !/^[0-9a-z]+$/.test(count) || marks.length !== parseInt(count, 36)) return null
  if (![...marks, ...(focusText === '0' ? [] : [focusText])].every(m => /^[0-9a-z]+-[0-9a-z]+$/.test(m))) return null
  const pair = (m: string) => { const [id, at] = m.split('-') as [string, string]; return [id, parseInt(at, 36)] as const }
  const [zone, since] = focusText === '0' ? ['', 0] as const : pair(focusText)
  return { sessions, done: cleanDone(Object.fromEntries(marks.map(pair))), focus: cleanFocus({ zone: zone as ZoneId, since }) }
}
