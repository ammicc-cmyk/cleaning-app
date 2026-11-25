import { isSession, type Session } from '../domain/progress'

/** Адрес сервера не секрет. Пока не задан, автосохранение в интерфейсе скрыто. */
const API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
export const cloudEnabled = !!API

export class CloudError extends Error { constructor(readonly status: number) { super(`cloud ${status}`) } }

async function call<T>(method: string, path: string, code?: string, body?: unknown): Promise<T> {
  const r = await fetch(API + path, {
    method, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10_000),
    headers: { ...(code && { Authorization: `Bearer ${code}` }), ...(body !== undefined && { 'Content-Type': 'application/json' }) },
  })
  if (!r.ok) throw new CloudError(r.status)
  return (r.status === 204 ? undefined : await r.json()) as T
}

export const createProfile = async () => {
  const { code } = await call<{ code: string }>('POST', '/v1/profile')
  if (!isCode(code)) throw new CloudError(0)
  return code
}
export const syncSessions = async (code: string, sessions: Session[]) => {
  const r = await call<{ sessions: unknown[] }>('POST', '/v1/progress', code, { sessions })
  return r.sessions.filter(isSession)
}
export const deleteProfile = (code: string) => call<void>('DELETE', '/v1/profile', code)
export const createCalendar = async (code: string, cfg: object) =>
  API + (await call<{ path: string }>('PUT', '/v1/calendar', code, cfg)).path

export const isCode = (x: unknown): x is string => typeof x === 'string' && /^[a-z0-9]{28}$/.test(x)
/** Код из строки или из ссылки; пробелы и дефисы не важны. */
export function readCode(input: string): string | null {
  const i = input.indexOf('#code=')
  const c = (i >= 0 ? input.slice(i + 6) : input).replace(/[\s-]/g, '').toLowerCase()
  return isCode(c) ? c : null
}
export const codeLink = (code: string) => `${location.origin}${location.pathname}#code=${code}`
