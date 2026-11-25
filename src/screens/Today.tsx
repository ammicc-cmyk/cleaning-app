import { TASKS, ZONES, taskText, type Minutes } from '../content/tasks'
import { pickTask } from '../domain/taskPicker'
import type { AppState } from '../storage/store'

interface Props { state: AppState; update: (p: Partial<AppState>) => void; onStart: () => void; onProgress: () => void }

export function Today({ state, update, onStart, onProgress }: Props) {
  const task = TASKS.find(t => t.id === state.taskId)!
  const last = state.sessions.at(-1)
  const away = !!last && Date.now() - last.at * 1000 > 2 * 86_400_000
  return (
    <main>
      <h1>{!last ? 'Порядок без генеральных уборок' : away ? 'Рады вас видеть' : 'На сегодня'}</h1>
      <p className="muted">{!last ? 'По 12–15 минут. Одно понятное действие, и можно остановиться.'
        : away ? 'Начнём с лёгкого? Пяти минут вполне достаточно.' : 'Одного небольшого действия достаточно.'}</p>
      <div className="chips" role="group" aria-label="Зона">
        {ZONES.map(z => <button key={z.id} aria-pressed={z.id === state.zone}
          onClick={() => z.id !== state.zone && update({ zone: z.id, taskId: pickTask(z.id, state.recent).id })}>{z.name}</button>)}
      </div>
      <section className="card" aria-live="polite"><p className="task">{taskText(task, state.minutes)}</p></section>
      <div className="segments" role="group" aria-label="Длительность">
        {([5, 12, 15] as Minutes[]).map(m => <button key={m} aria-pressed={m === state.minutes} onClick={() => update({ minutes: m })}>{m} мин</button>)}
      </div>
      <button className="primary" onClick={onStart}>Запустить таймер</button>
      <button onClick={() => update({ taskId: pickTask(state.zone, state.recent, state.taskId).id })}>Заменить задачу</button>
      <button className="link" onClick={onProgress}>{last ? 'Мой прогресс' : 'Восстановить прогресс'}</button>
    </main>
  )
}
