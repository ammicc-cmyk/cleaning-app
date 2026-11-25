import { describe, expect, it } from 'vitest'
import { TASKS, taskById } from '../src/content/tasks'
import { decode, encode, mergeSessions, plural, summary } from '../src/domain/progress'
import { elapsedSec, formatLeft, leftMs, pause, resume, startTimer } from '../src/domain/timer'
import { nextWeekZone, placeName, tasksFor, weekName, weekPlaces, weekZone } from '../src/content/home'
import { buildPlan, dayNum, focusInfo, skip } from '../src/domain/planner'
import { decodeBackup, encodeBackup } from '../src/domain/backup'
import { reminderIcs } from '../src/domain/reminder'
import { initial, parseState, type AppState } from '../src/storage/store'

describe('таймер', () => {
  const t = startTimer(1000, 12, ['k1', 'kd1'])
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
  it('таймер прежней версии не теряет время', () => {
    const old = { startedAt: 1, durationMs: 720_000, endsAt: 720_001, pausedLeftMs: null, taskId: 'W2', zone: 'bath', minutes: 12 }
    const got = parseState(JSON.stringify({ v: 2, timer: old })).timer!
    expect(got).toMatchObject({ startedAt: 1, endsAt: 720_001, i: 0 })
    expect(taskById(got.plan[0]!)!.zone).toBe('bath')
  })
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
  it('новая копия: отметки и место недели; старая читается, обрезанная нет', () => {
    const b = { sessions: a, done: { k1: 1_790_000_100, kd1: 1_790_000_200 }, focus: { zone: 'bath' as const, since: 1_790_000_000 } }
    const full = encodeBackup(b)
    expect(decodeBackup(full)).toEqual(b)
    expect(decodeBackup(`https://x.io/#restore=${encodeBackup({ ...b, focus: null })}`)).toEqual({ ...b, focus: null })
    expect(decodeBackup(encode(a))).toEqual({ sessions: a, done: {}, focus: null })
    for (let i = 0; i < full.length; i++) expect(decodeBackup(full.slice(0, i))).toBeNull()
    expect(decodeBackup(full.replace('kd1', 'zz9'))!.done).toEqual({ k1: 1_790_000_100 })
  })
  it('итог за 30 дней', () =>
    expect(summary(a, 1_790_100_000_000)).toMatchObject({ minutes: 17, total: 2 }))
})

const NOW = new Date(2026, 10, 25, 19).getTime()
const DAY = 86_400_000
const at = (days: number) => Math.floor((NOW + days * DAY) / 1000)
const HOMES = [null, 'studio', 'one', 'two', 'three'] as const
const marks = (list: { id: string }[], now: number) => Object.fromEntries(list.map(t => [t.id, Math.floor(now / 1000)]))

describe('контент', () => {
  it('id уникальны, дела короткие, в каждом месте хватает глубоких', () => {
    expect(TASKS.length).toBeGreaterThanOrEqual(100)
    expect(new Set(TASKS.map(t => t.id)).size).toBe(TASKS.length)
    for (const t of TASKS) { expect(t.min).toBeGreaterThan(0); expect(t.min).toBeLessThanOrEqual(8); expect(t.id).toMatch(/^[a-z]+\d+$/) }
    for (const home of HOMES) for (const p of weekPlaces(home)) {
      expect(tasksFor(home).filter(t => t.layer === 'deep' && weekZone(t.zone, home) === p.zone).length).toBeGreaterThanOrEqual(7)
    }
  })
  it('места недели под квартиру, круг замкнут', () => {
    expect(weekPlaces('studio').map(p => p.name)).toEqual(['Кухонная зона', 'Ванная', 'Прихожая', 'Комната'])
    expect(weekPlaces(null).map(p => p.name)).toEqual(['Кухня', 'Ванная', 'Прихожая', 'Спальня и рабочий стол', 'Гостиная'])
    expect(weekPlaces('three')).toHaveLength(6)
    expect(nextWeekZone('bedroom', 'studio')).toBe('kitchen')
    expect(nextWeekZone('living', 'two')).toBe('kitchen')
    expect(weekName(weekZone('desk', 'one'), 'one')).toBe('Комната')
  })
  it('данные прежних версий сохраняются, мусор отбрасывается', () => {
    const s = parseState(JSON.stringify({ v: 2, zone: 'bath', taskId: 'W2', minutes: 5, home: 'one', recent: ['W2'], sessions: [{ at: 9, sec: 60 }] }))
    expect(s).toMatchObject({ v: 3, focus: null, done: {}, minutes: 5, home: 'one', sessions: [{ at: 9, sec: 60 }], remindAt: '19:00' })
    expect(parseState(JSON.stringify({ ...initial, done: { k1: 5, x: 5, k2: 'x' }, focus: { zone: 'moon', since: 1 } }))).toMatchObject({ done: { k1: 5 }, focus: null })
  })
  it('склонения', () => expect([1, 2, 5, 11, 21].map(n => plural(n, 'а', 'б', 'в')).join('')).toBe('абвва'))
})

describe('план сессии', () => {
  it('укладывается во время, без повторов и чужих мест, 60 дней подряд', () => {
    for (const home of HOMES) for (const minutes of [5, 12, 15] as const) {
      let s: AppState = { ...initial, home, focus: { zone: 'kitchen', since: at(0) } }
      for (let d = 0; d < 60; d++) {
        const now = NOW + d * DAY
        if (focusInfo(s, now).weekOver) s = { ...s, focus: { zone: nextWeekZone(s.focus!.zone, home), since: Math.floor(now / 1000) } }
        const plan = buildPlan(s, minutes, now)
        expect(new Set(plan).size).toBe(plan.length)
        const sum = plan.reduce((n, t) => n + t.min, 0)
        // Больше времени сессии может занять только одно большое дело.
        if (plan.length > 1) expect(sum).toBeLessThanOrEqual(minutes)
        expect(sum).toBeGreaterThanOrEqual(minutes - 2)
        for (const t of plan) {
          expect(placeName(t.zone, home)).not.toBeNull()
          if (t.layer === 'deep') expect(weekZone(t.zone, home)).toBe(weekZone(s.focus!.zone, home))
        }
        s = { ...s, nextFive: plan.some(t => t.layer === 'deep') ? 'routine' : 'deep', done: { ...s.done, ...marks(plan, now) } }
      }
    }
  })
  it('15 минут: рутина и место недели; 5 минут чередуются', () => {
    const p = buildPlan(initial, 15, NOW)
    expect(p.some(t => t.layer === 'deep') && p.some(t => t.layer !== 'deep')).toBe(true)
    expect(buildPlan(initial, 5, NOW).every(t => t.layer !== 'deep')).toBe(true)
    expect(buildPlan({ ...initial, nextFive: 'deep' }, 5, NOW).some(t => t.layer === 'deep')).toBe(true)
    expect(buildPlan({ ...initial, nextFive: 'deep' }, 5, NOW, 'routine').every(t => t.layer === 'routine')).toBe(true)
  })
  it('сделанное сегодня не предлагается, завтра возвращается ежедневное', () => {
    const done = marks(TASKS.filter(t => t.layer !== 'deep'), NOW)
    expect(buildPlan({ ...initial, done }, 15, NOW).every(t => t.layer === 'deep')).toBe(true)
    expect(buildPlan({ ...initial, done }, 5, NOW + DAY).every(t => t.every === 1)).toBe(true)
  })
  it('за 5 недель по 15 минут доходит до каждого еженедельного дела и всей кухни за неделю', () => {
    let s: AppState = { ...initial, focus: { zone: 'kitchen', since: at(0) } }
    for (let d = 0; d < 35; d++) {
      const now = NOW + d * DAY
      s = { ...s, done: { ...s.done, ...marks(buildPlan(s, 15, now), now) } }
      if (d === 6) expect(focusInfo(s, now).done).toBeGreaterThanOrEqual(12)
    }
    expect(TASKS.filter(t => t.layer !== 'deep' && t.zone !== 'extra' && !s.done[t.id]).map(t => t.id)).toEqual([])
  })
  it('всё сделано: план не пуст', () =>
    expect(buildPlan({ ...initial, done: marks(TASKS, NOW) }, 15, NOW)).toHaveLength(1))
  it('замена меняет первое дело и не застревает', () => {
    for (const minutes of [5, 15] as const) {
      let s: AppState = { ...initial }
      for (let i = 0; i < 200; i++) {
        const first = buildPlan(s, minutes, NOW)[0]!
        s = { ...s, skipped: skip(s, first.id, minutes, NOW) }
        expect(buildPlan(s, minutes, NOW)[0]!.id).not.toBe(first.id)
      }
      expect(s.skipped.day).toBe(dayNum(NOW))
    }
  })
  it('через 7 дней предложение, при «остаться» сделанное не теряется', () => {
    const s: AppState = { ...initial, focus: { zone: 'kitchen', since: at(-6) }, done: { kd1: at(-5) } }
    expect(focusInfo(s, NOW)).toMatchObject({ weekOver: false, done: 1, total: 14 })
    expect(focusInfo(s, NOW + DAY).weekOver).toBe(true)
    expect(focusInfo({ ...s, focus: { zone: 'kitchen', since: at(1) } }, NOW + DAY)).toMatchObject({ weekOver: false, done: 1 })
    expect(focusInfo(s, NOW + 28 * DAY).done).toBe(0)
  })
  it('напоминания: 14 дней, место только в пределах недели, строки до 75 байт', () => {
    const now = new Date(2026, 10, 30, 20, 0)
    const ics = reminderIcs('19:00', now, { ...initial, home: 'studio', minutes: 12 })
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(14)
    expect(ics).toContain('DTSTART:20261201T190000')
    expect(ics).toContain('DTSTART:20261214T190000')
    expect(reminderIcs('21:05', now, initial)).toContain('DTSTART:20261130T210500')
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    const flat = ics.replace(/\r\n /g, '')
    expect(flat.match(/SUMMARY:Место недели: Кухонная зона\\, 12 мин/g)).toHaveLength(6)
    expect(flat.match(/SUMMARY:Небольшая уборка/g)).toHaveLength(8)
  })
})
