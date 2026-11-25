import { useState } from 'react'
import { TASKS, taskText, type Minutes } from '../content/tasks'
import { placeName } from '../content/home'
import { TIPS } from '../content/tips'
import { pickNext } from '../domain/taskPicker'
import type { AppState } from '../storage/store'

interface Props {
  state: AppState; update: (p: Partial<AppState>) => void; onStart: (m: Minutes) => void
  onPhoto: () => void; onScenarios: () => void
}

export function Today({ state, update, onStart, onPhoto, onScenarios }: Props) {
  const [tip, setTip] = useState(() => Math.floor(Date.now() / 86_400_000) % TIPS.length)
  const task = TASKS.find(t => t.id === state.taskId)!
  const last = state.sessions.at(-1)
  const away = !!last && Date.now() - last.at * 1000 > 2 * 86_400_000
  return (
    <main className="with-nav">
      <h1>{!last ? 'Порядок без генеральных уборок' : away ? 'Рады вас видеть' : 'На сегодня'}</h1>
      <p className="muted">{!last ? 'Выбирать ничего не нужно. Сделайте одно действие и остановитесь по сигналу.'
        : away ? 'Начнём с лёгкого? Пяти минут вполне достаточно.' : 'Одного небольшого действия достаточно.'}</p>
      <div aria-live="polite" className="stack">
        <p className="place"><span>Где</span> <b>{placeName(task.zone, state.home)}</b></p>
        <section className="card"><p className="task">{taskText(task, state.minutes)}</p></section>
      </div>
      {state.zone && <button className="link" onClick={() => update({ zone: null, taskId: pickNext(state.home, null, state.recent, state.taskId).id })}>Вернуть подбор без выбора</button>}
      <button className="primary" onClick={() => onStart(state.minutes)}>Запустить таймер</button>
      {away && state.minutes !== 5 && <button onClick={() => onStart(5)}>Начать с 5 минут</button>}
      <button onClick={() => update({ taskId: pickNext(state.home, state.zone, state.recent, state.taskId).id })}>Заменить задачу</button>
      <div className="segments" role="group" aria-label="Длительность">
        {([5, 12, 15] as Minutes[]).map(m => <button key={m} aria-pressed={m === state.minutes} onClick={() => update({ minutes: m })}>{m} мин</button>)}
      </div>
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
