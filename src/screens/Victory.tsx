import { taskById } from '../content/tasks'
import { plural, summary } from '../domain/progress'
import type { AppState } from '../storage/store'
import resting from '../assets/minutka/minutka-rest.svg'

export interface Result { sec: number; done: string[]; pending: string | null }
interface Props { result: Result; state: AppState; onMark: (id: string) => void; onHome: () => void; onProfile: () => void }

export function Victory({ result, state, onMark, onHome, onProfile }: Props) {
  const m = Math.round(result.sec / 60)
  const s = summary(state.sessions, Date.now())
  const pending = result.pending ? taskById(result.pending) : undefined
  return (
    <main className="center">
      <img className="helper" src={resting} alt="" />
      <h1 className={state.guiltFree ? undefined : 'gain'}>{state.guiltFree ? 'Готово' : m > 0 ? `+${m} ${plural(m, 'минута', 'минуты', 'минут')} к порядку` : 'Небольшой шаг к порядку'}</h1>
      <p>На сегодня достаточно. Остальное спокойно подождёт.</p>
      {result.done.length > 0 && <section className="card">
        <ul className="list">{result.done.map(id => <li key={id}>✓ {taskById(id)!.text}</li>)}</ul>
      </section>}
      {pending && <section className="card stack">
        <p>{pending.text}</p>
        <button onClick={() => onMark(pending.id)}>Это тоже сделано</button>
      </section>}
      {!state.guiltFree && <p className="muted">За 30 дней: {s.minutes} мин заботы о доме, {s.days} {plural(s.days, 'день', 'дня', 'дней')}.</p>}
      <button className="primary" onClick={onHome}>Хорошо</button>
      {!state.cloudCode && state.sessions.length > state.backedUp && <button className="link" onClick={onProfile}>Сохранить копию прогресса</button>}
    </main>
  )
}
