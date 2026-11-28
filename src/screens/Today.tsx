import { useState } from 'react'
import type { Minutes, ZoneId } from '../content/tasks'
import { nextWeekZone, weekName } from '../content/home'
import { PlanList, ZoneTag } from './PlanList'
import { TIPS } from '../content/tips'
import { buildPlan, focusInfo, skip } from '../domain/planner'
import { plural } from '../domain/progress'
import type { AppState } from '../storage/store'
import hello from '../assets/minutka/minutka-hello.svg'
import welcomeBack from '../assets/minutka/minutka-return.svg'

interface Props {
  state: AppState; update: (p: Partial<AppState>) => void
  onStart: (m: Minutes, mode?: 'auto' | 'routine') => void
  onZone: (z: ZoneId) => void; onPhoto: () => void; onScenarios: () => void
}

export function Today({ state, update, onStart, onZone, onPhoto, onScenarios }: Props) {
  const [tip, setTip] = useState(() => Math.floor(Date.now() / 86_400_000) % TIPS.length)
  const now = Date.now()
  const last = state.sessions.at(-1)
  const away = !!last && now - last.at * 1000 > 2 * 86_400_000
  const plan = buildPlan(state, state.minutes, now)
  const first = plan[0]!
  const total = plan.reduce((n, t) => n + t.min, 0)
  const week = focusInfo(state, now)
  const name = weekName(week.zone, state.home)
  const next = nextWeekZone(week.zone, state.home)
  return (
    <main className="with-nav">
      {(!last || away) && <img className="helper" src={!last ? hello : welcomeBack} alt="" />}
      <h1>{!last ? 'Порядок без генеральных уборок' : away ? 'Рады вас видеть' : 'На сегодня'}</h1>
      <p className="muted">{!last ? 'Выбирать ничего не нужно: немного рутины, одно место на неделю и остановка по сигналу.'
        : away ? 'Начнём с лёгкого? Пяти минут вполне достаточно.' : 'Сделайте, сколько получится. Остановиться можно в любой момент.'}</p>
      {(week.weekOver || week.allDone) && <section className="card stack">
        <p className="task">{week.allDone ? `${name}: все дела сделаны` : `${name}: неделя прошла`}</p>
        <p className="muted">{!state.guiltFree && week.done > 0 && !week.allDone && `Сделано дел: ${week.done} из ${week.total}. `}{week.allDone ? 'Можно перейти дальше, когда захочется.' : 'Остальное вернётся на следующем круге.'}</p>
        <button onClick={() => onZone(next)}>Дальше: {weekName(next, state.home)}</button>
        {week.weekOver && <button onClick={() => onZone(week.zone)}>Остаться ещё на неделю</button>}
      </section>}
      <p className="place"><span>Место недели</span> <b>{name}</b></p>
      {!state.guiltFree && week.done > 0 && !week.weekOver && !week.allDone && <p className="muted">Сделано дел: {week.done} из {week.total}</p>}
      <section className="focus">
        <div aria-live="polite" className="stack">
          <span className="tags"><ZoneTag zone={first.zone} home={state.home} /></span>
          <p className="task">{first.text}</p>
          <p className="muted">Около {first.min} мин{plan.length > 1 && `. Дело 1 из ${plan.length}, всего около ${total} мин`}</p>
        </div>
        <button className="start" onClick={() => onStart(state.minutes)}>Запустить таймер на {state.minutes} мин</button>
        {away && state.minutes !== 5 && <button onClick={() => onStart(5, 'routine')}>Начать с 5 минут</button>}
        <button className="link" onClick={() => update({ skipped: skip(state, first.id, state.minutes, now) })}>Заменить задачу</button>
      </section>
      <div className="segments" role="group" aria-label="Длительность">
        {([5, 12, 15] as Minutes[]).map(m => <button key={m} aria-pressed={m === state.minutes} onClick={() => update({ minutes: m })}>{m} мин</button>)}
      </div>
      {plan.length > 1 && <details className="card">
        <summary>Весь список · {plan.length} {plural(plan.length, 'дело', 'дела', 'дел')} · {total} мин</summary>
        <PlanList tasks={plan} home={state.home} />
      </details>}
      <h2>Подсказка</h2>
      <section className="card stack">
        <b>{TIPS[tip]!.title}</b>
        <p>{TIPS[tip]!.text}</p>
        <button className="link" onClick={() => setTip((tip + 1) % TIPS.length)}>Ещё подсказка</button>
      </section>
      {last && <div className="rows">
        <button onClick={onPhoto}><span>Разбор по фото</span><small>скоро</small></button>
        <button onClick={onScenarios}><span>Сценарии и программы</span><small>PRO</small></button>
      </div>}
    </main>
  )
}
