import { TASKS, ZONES, taskText, type Minutes } from '../content/tasks'
import { pickNext } from '../domain/taskPicker'
import type { AppState } from '../storage/store'

interface Props { state: AppState; update: (p: Partial<AppState>) => void; onStart: (m: Minutes) => void }

export function Today({ state, update, onStart }: Props) {
  const task = TASKS.find(t => t.id === state.taskId)!
  const last = state.sessions.at(-1)
  const away = !!last && Date.now() - last.at * 1000 > 2 * 86_400_000
  const focus = ZONES.find(z => z.id === state.zone)
  return (
    <main className="with-nav">
      <h1>{!last ? 'Порядок без генеральных уборок' : away ? 'Рады вас видеть' : 'На сегодня'}</h1>
      <p className="muted">{!last ? 'Выбирать ничего не нужно. Сделайте одно действие и остановитесь по сигналу.'
        : away ? 'Начнём с лёгкого? Пяти минут вполне достаточно.' : 'Одного небольшого действия достаточно.'}</p>
      <section className="card" aria-live="polite"><p className="task">{taskText(task, state.minutes)}</p></section>
      {focus && <button className="link" onClick={() => update({ zone: null, taskId: pickNext(null, state.recent, state.taskId).id })}>{focus.name}. Вернуть подбор без выбора</button>}
      <button className="primary" onClick={() => onStart(state.minutes)}>Запустить таймер</button>
      {away && state.minutes !== 5 && <button onClick={() => onStart(5)}>Начать с 5 минут</button>}
      <button onClick={() => update({ taskId: pickNext(state.zone, state.recent, state.taskId).id })}>Заменить задачу</button>
      <div className="segments" role="group" aria-label="Длительность">
        {([5, 12, 15] as Minutes[]).map(m => <button key={m} aria-pressed={m === state.minutes} onClick={() => update({ minutes: m })}>{m} мин</button>)}
      </div>
    </main>
  )
}
