import { useCallback, useEffect, useRef, useState } from 'react'
import { KEY, load, save, parseState, type AppState } from './storage/store'
import { decode, mergeSessions, type Session } from './domain/progress'
import { elapsedSec, startTimer } from './domain/timer'
import { pickNext, pickTask } from './domain/taskPicker'
import { TASKS, type Minutes } from './content/tasks'
import { Today } from './screens/Today'
import { Timer } from './screens/Timer'
import { Victory } from './screens/Victory'
import { Zones } from './screens/Zones'
import { Profile } from './screens/Profile'
import { prepareSound, playSignal } from './sound'

type Screen = 'today' | 'victory' | 'zones' | 'profile'
const NAV: [Screen, string][] = [['today', 'Сегодня'], ['zones', 'Сценарии'], ['profile', 'Профиль']]

const readLink = (): Session[] | 'bad' | null =>
  location.hash.startsWith('#restore=') ? decode(location.hash) ?? 'bad' : null

export function App() {
  const [state, setState] = useState<AppState>(load)
  const ref = useRef(state)
  const [screen, setScreen] = useState<Screen>('today')
  const [lastSec, setLastSec] = useState(0)
  const [saveOk, setSaveOk] = useState(true)
  const [incoming, setIncoming] = useState(readLink)

  const update = useCallback((patch: Partial<AppState>) => {
    ref.current = { ...ref.current, ...patch }
    setState(ref.current)
    setSaveOk(save(ref.current))
  }, [])

  useEffect(() => {
    // Другая вкладка изменила данные: подхватываем, чтобы не затереть.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return
      try { ref.current = parseState(e.newValue); setState(ref.current) } catch { /* оставляем текущее */ }
    }
    const onHash = () => setIncoming(readLink())
    window.addEventListener('storage', onStorage)
    window.addEventListener('hashchange', onHash)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('hashchange', onHash)
    }
  }, [])

  const finish = useCallback((byTimer: boolean) => {
    const t = ref.current.timer
    if (!t) return
    const sec = byTimer ? t.durationMs / 1000 : elapsedSec(t, Date.now())
    const sessions = mergeSessions(ref.current.sessions, [{ at: Math.floor(t.startedAt / 1000), sec }])
    const recent = [...ref.current.recent, t.taskId].slice(-10)
    update({ sessions, recent, timer: null, zone: null, taskId: pickNext(null, recent, t.taskId).id })
    setLastSec(sec)
    setScreen('victory')
    if (byTimer) playSignal()
  }, [update])

  const start = (minutes: Minutes) => {
    prepareSound()
    // Просим браузер не удалять данные самому при нехватке места.
    navigator.storage?.persist?.().catch(() => {})
    const { taskId } = ref.current
    const { zone } = TASKS.find(t => t.id === taskId)!
    update({ timer: startTimer(Date.now(), minutes, taskId, zone) })
  }

  const restore = (s: Session[]) => update({ sessions: mergeSessions(ref.current.sessions, s) })
  const closeLink = () => {
    history.replaceState(null, '', location.pathname + location.search)
    setIncoming(null)
  }

  if (incoming === 'bad') return (
    <main>
      <h1>Ссылка пришла не целиком</h1>
      <p>Попробуйте скопировать её ещё раз или восстановить прогресс из файла.</p>
      <button className="primary" onClick={closeLink}>Хорошо</button>
    </main>
  )
  if (incoming) return (
    <main>
      <h1>Нашлась копия прогресса</h1>
      <p>Сессий в копии: {incoming.length}. Добавим их к тому, что уже есть здесь. Ничего не сотрётся.</p>
      <button className="primary" onClick={() => { restore(incoming); closeLink(); setScreen('profile') }}>Восстановить</button>
      <button onClick={closeLink}>Не сейчас</button>
    </main>
  )

  return (
    <>
      {!saveOk && <p className="notice" role="alert">Браузер не даёт сохранять данные. Сохраните копию на экране «Профиль», не закрывая вкладку.</p>}
      {state.timer
        ? <Timer timer={state.timer} onChange={timer => update({ timer })} onFinish={finish} onCancel={() => update({ timer: null })} />
        : screen === 'victory'
          ? <Victory sec={lastSec} state={state} onHome={() => setScreen('today')} onProfile={() => setScreen('profile')} />
          : <>
            {screen === 'zones'
              ? <Zones onRestart={() => start(5)} onZone={zone => {
                  update({ zone, taskId: pickTask(zone, ref.current.recent).id })
                  setScreen('today')
                  window.scrollTo(0, 0)
                }} />
              : screen === 'profile'
                ? <Profile state={state} update={update} onRestore={restore} />
                : <Today state={state} update={update} onStart={start} />}
            <nav aria-label="Разделы">
              {NAV.map(([id, name]) => <button key={id} aria-current={screen === id ? 'page' : undefined}
                onClick={() => { setScreen(id); window.scrollTo(0, 0) }}>{name}</button>)}
            </nav>
          </>}
    </>
  )
}
