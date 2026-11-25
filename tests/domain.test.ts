import { describe, expect, it } from 'vitest'
import { TASKS, ZONES } from '../src/content/tasks'
import { decode, encode, mergeSessions, plural, summary } from '../src/domain/progress'
import { elapsedSec, formatLeft, leftMs, pause, resume, startTimer } from '../src/domain/timer'
import { pickNext, pickTask } from '../src/domain/taskPicker'
import { reminderIcs } from '../src/domain/reminder'
import { initial, parseState } from '../src/storage/store'

describe('таймер', () => {
  const t = startTimer(1000, 12, 'K1', 'kitchen')
  it('считает от часов и не уходит в минус', () => {
    expect(leftMs(t, 61_000)).toBe(660_000)
    expect(leftMs(t, 9e9)).toBe(0)
    expect(formatLeft(660_000)).toBe('11:00')
  })
  it('пауза не теряет время', () => {
    const p = pause(t, 61_000)
    expect(leftMs(p, 9e9)).toBe(660_000)
    const r = resume(p, 500_000)
    expect(leftMs(r, 560_000)).toBe(600_000)
    expect(elapsedSec(r, 560_000)).toBe(120)
  })
  it('перевод часов назад не даёт лишнего времени', () => expect(leftMs(t, -9e9)).toBe(720_000))
  it('переживает сохранение', () =>
    expect(parseState(JSON.stringify({ ...initial, timer: t })).timer).toEqual(t))
})

describe('копия прогресса', () => {
  const a = [{ at: 1_790_000_000, sec: 720 }, { at: 1_790_090_000, sec: 300 }]
  it('читается из кода и ссылки', () => {
    expect(decode(encode(a))).toEqual(a)
    expect(decode(`https://x.io/app/#restore=${encode(a)}`)).toEqual(a)
  })
  it('повторное восстановление не дублирует, объединение не теряет', () => {
    expect(mergeSessions(a, a)).toEqual(a)
    expect(mergeSessions([a[0]!], [a[1]!])).toEqual(a)
  })
  it('чужая и обрезанная копия отклоняется', () => {
    const cut = encode(a).split('.').slice(0, -1).join('.')
    for (const x of ['', 'привет', '1', '2.1.a-b', '1.1.a-zzzzz', cut]) expect(decode(x)).toBeNull()
  })
  it('год ежедневных сессий: компактный код', () =>
    expect(encode(Array.from({ length: 365 }, (_, i) => ({ at: 1_790_000_000 + i * 86_400, sec: 720 }))).length).toBeLessThan(4000))
  it('итог за 30 дней', () =>
    expect(summary(a, 1_790_100_000_000)).toMatchObject({ minutes: 17, total: 2 }))
})

describe('контент', () => {
  it('по 9 задач в зоне, id уникальны', () => {
    for (const z of ZONES) expect(TASKS.filter(t => t.zone === z.id)).toHaveLength(9)
    expect(new Set(TASKS.map(t => t.id)).size).toBe(36)
  })
  it('замена не повторяет текущую и недавние', () => {
    for (let i = 0; i < 100; i++)
      expect(['K1', 'K2', 'K3']).not.toContain(pickTask('kitchen', ['K2', 'K3'], 'K1').id)
  })
  it('подбор без выбора меняет зону, выбранная зона сохраняется', () => {
    for (let i = 0; i < 100; i++) {
      expect(['kitchen', 'bath']).not.toContain(pickNext(null, ['W1'], 'K1').zone)
      expect(pickNext('bath', ['W1'], 'W2').zone).toBe('bath')
    }
  })
  it('данные первой версии сохраняются, автозона сбрасывается', () => {
    const s = parseState(JSON.stringify({ v: 1, zone: 'bath', taskId: 'W2', minutes: 5, sessions: [{ at: 9, sec: 60 }] }))
    expect(s).toMatchObject({ v: 2, zone: null, taskId: 'W2', minutes: 5, sessions: [{ at: 9, sec: 60 }], remindAt: '19:00' })
  })
  it('напоминание: прошедшее сегодня время переносится на завтра', () => {
    const now = new Date(2026, 10, 30, 20, 0)
    expect(reminderIcs('19:00', now)).toContain('DTSTART:20261201T190000')
    expect(reminderIcs('21:05', now)).toContain('DTSTART:20261130T210500')
  })
  it('склонения', () => expect([1, 2, 5, 11, 21].map(n => plural(n, 'а', 'б', 'в')).join('')).toBe('абвва'))
})
