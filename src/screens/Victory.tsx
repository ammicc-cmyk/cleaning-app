import { plural, summary } from '../domain/progress'
import type { AppState } from '../storage/store'

interface Props { sec: number; state: AppState; onHome: () => void; onProfile: () => void }

export function Victory({ sec, state, onHome, onProfile }: Props) {
  const m = Math.round(sec / 60)
  const s = summary(state.sessions, Date.now())
  return (
    <main className="center">
      <h1>{state.guiltFree ? 'Готово' : m > 0 ? `+${m} ${plural(m, 'минута', 'минуты', 'минут')} к порядку` : 'Небольшой шаг к порядку'}</h1>
      <p>На сегодня достаточно. Шкафы внутри не трогаем.</p>
      {!state.guiltFree && <p className="muted">За 30 дней: {s.minutes} мин заботы о доме, {s.days} {plural(s.days, 'день', 'дня', 'дней')}.</p>}
      <button className="primary" onClick={onHome}>Хорошо</button>
      {!state.cloudCode && state.sessions.length > state.backedUp && <button className="link" onClick={onProfile}>Сохранить копию прогресса</button>}
    </main>
  )
}
