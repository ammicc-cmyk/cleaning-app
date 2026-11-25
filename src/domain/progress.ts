/** Одна сессия: at — начало (unix-секунды, служит ключом), sec — длительность. */
export interface Session { at: number; sec: number }

export function mergeSessions(a: Session[], b: Session[]): Session[] {
  const map = new Map<number, number>()
  for (const s of [...a, ...b]) map.set(s.at, Math.max(s.sec, map.get(s.at) ?? 0))
  return [...map].map(([at, sec]) => ({ at, sec })).sort((x, y) => x.at - y.at)
}

export function isSession(x: unknown): x is Session {
  const s = x as Session | null
  return !!s && Number.isSafeInteger(s.at) && s.at > 0 && s.at < 1e11
    && Number.isSafeInteger(s.sec) && s.sec >= 0 && s.sec <= 900
}

/** Код: версия.количество.записи, запись — "дельтаВремени-секунды" в base36.
 *  Количество нужно, чтобы заметить обрезанную при пересылке копию. */
export function encode(sessions: Session[]): string {
  let prev = 0
  const list = mergeSessions(sessions, [])
  const body = list.map(s => {
    const part = `${(s.at - prev).toString(36)}-${s.sec.toString(36)}`
    prev = s.at
    return part
  })
  return ['1', list.length.toString(36), ...body].join('.')
}

/** Принимает код или ссылку целиком. null — не наша или неполная копия. */
export function decode(input: string): Session[] | null {
  const raw = input.trim()
  const mark = raw.indexOf('#restore=')
  const code = mark >= 0 ? raw.slice(mark + 9) : raw
  if (code.length > 2_000_000 || !/^1\.[0-9a-z]+(\.[0-9a-z]+-[0-9a-z]+)+$/.test(code)) return null
  const parts = code.split('.').slice(1)
  if (parseInt(parts[0]!, 36) !== parts.length - 1) return null
  const out: Session[] = []
  let at = 0
  for (const part of parts.slice(1)) {
    const [d, s] = part.split('-') as [string, string]
    at += parseInt(d, 36)
    const item = { at, sec: parseInt(s, 36) }
    if (!isSession(item)) return null
    out.push(item)
  }
  return out
}

export function summary(sessions: Session[], nowMs: number) {
  const recent = sessions.filter(s => s.at * 1000 > nowMs - 30 * 86_400_000)
  return {
    minutes: Math.round(recent.reduce((n, s) => n + s.sec, 0) / 60),
    days: new Set(recent.map(s => new Date(s.at * 1000).toDateString())).size,
    total: sessions.length,
  }
}

export function plural(n: number, one: string, few: string, many: string): string {
  const d = n % 10, h = n % 100
  if (d === 1 && h !== 11) return one
  return d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many
}
