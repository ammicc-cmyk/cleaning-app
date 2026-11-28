import { useEffect, useState } from 'react'
import { taskById } from '../content/tasks'
import type { HomeId } from '../content/home'
import { PlanList, ZoneTag } from './PlanList'
import { formatLeft, leftMs, pause, resume, type ActiveTimer } from '../domain/timer'
import working from '../assets/minutka/minutka-work.svg'

interface Props {
  timer: ActiveTimer
  home: HomeId | null
  onChange: (t: ActiveTimer) => void
  onFinish: (byTimer: boolean) => void
  onStep: (done: boolean) => void
  onCancel: () => void
}

export function Timer({ timer, home, onChange, onFinish, onStep, onCancel }: Props) {
  const [now, setNow] = useState(Date.now)
  const paused = timer.pausedLeftMs !== null

  useEffect(() => {
    if (paused) return
    const tick = () => {
      const n = Date.now()
      setNow(n)
      if (leftMs(timer, n) === 0) onFinish(true)
    }
    tick()
    const id = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [timer, paused, onFinish])

  useEffect(() => {
    if (paused) return
    let lock: WakeLockSentinel | null = null
    let gone = false
    const request = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const l = await navigator.wakeLock?.request('screen')
        if (gone) void l?.release(); else lock = l ?? null
      } catch { /* экран погаснет как обычно, таймер продолжит считать */ }
    }
    void request()
    document.addEventListener('visibilitychange', request)
    return () => { gone = true; void lock?.release(); document.removeEventListener('visibilitychange', request) }
  }, [paused])

  const task = taskById(timer.plan[timer.i]!)!
  const last = timer.i === timer.plan.length - 1
  return (
    <main className="center">
      <section className="focus">
        <div className="focus-head">
          <img className="helper small" src={working} alt="" />
          <p className="muted">Дело {timer.i + 1} из {timer.plan.length}</p>
        </div>
        <p className="clock" role="timer">{formatLeft(leftMs(timer, now))}</p>
        <div className="stack" aria-live="polite">
          <span className="tags"><ZoneTag zone={task.zone} home={home} /></span>
          <p className="task">{task.text}</p>
          <p className="muted">Около {task.min} мин</p>
        </div>
        <button className="start" onClick={() => onStep(true)}>{last ? 'Готово' : 'Готово, дальше'}</button>
        <button className="link" onClick={() => onStep(false)}>Пропустить</button>
      </section>
      {timer.plan.length > 1 && <details className="card">
        <summary>Весь список · сделано {timer.done.length} из {timer.plan.length}</summary>
        <PlanList tasks={timer.plan.map(id => taskById(id)!)} home={home} current={timer.i} done={timer.done} />
      </details>}
      <p className="muted">По сигналу можно остановиться, даже если не всё готово. Если экран погаснет, звука может не быть, но время не собьётся.</p>
      <button onClick={() => { const n = Date.now(); setNow(n); onChange(paused ? resume(timer, n) : pause(timer, n)) }}>{paused ? 'Продолжить' : 'Пауза'}</button>
      <button onClick={() => onFinish(false)}>Хватит на сегодня</button>
      <button className="link" onClick={onCancel}>Выйти без записи</button>
    </main>
  )
}
