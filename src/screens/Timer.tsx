import { useEffect, useState } from 'react'
import { TASKS, taskText } from '../content/tasks'
import { formatLeft, leftMs, pause, resume, type ActiveTimer } from '../domain/timer'

interface Props {
  timer: ActiveTimer
  onChange: (t: ActiveTimer) => void
  onFinish: (byTimer: boolean) => void
  onCancel: () => void
}

export function Timer({ timer, onChange, onFinish, onCancel }: Props) {
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

  const task = TASKS.find(t => t.id === timer.taskId)!
  return (
    <main className="center">
      <p className="clock" role="timer">{formatLeft(leftMs(timer, now))}</p>
      <section className="card"><p className="task">{taskText(task, timer.minutes)}</p></section>
      <p className="muted">По сигналу можно остановиться, даже если не всё готово. Если экран погаснет, звука может не быть, но время не собьётся.</p>
      <button className="primary" onClick={() => onFinish(false)}>Готово раньше</button>
      <button onClick={() => { const n = Date.now(); setNow(n); onChange(paused ? resume(timer, n) : pause(timer, n)) }}>{paused ? 'Продолжить' : 'Пауза'}</button>
      <button className="link" onClick={onCancel}>Выйти без записи</button>
    </main>
  )
}
