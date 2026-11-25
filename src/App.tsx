import { useCallback, useEffect, useRef, useState } from 'react'
import { KEY, load, save, parseState, type AppState } from './storage/store'
import { decode, mergeSessions, type Session } from './domain/progress'
import { elapsedSec, startTimer } from './domain/timer'
import { pickNext } from './domain/taskPicker'
import { TASKS, type Minutes } from './content/tasks'
import { Today } from './screens/Today'
import { Timer } from './screens/Timer'
import { Victory } from './screens/Victory'
import { Photo } from './screens/Photo'
import { Zones } from './screens/Zones'
import { Profile } from './screens/Profile'
import type { SyncStatus } from './screens/Autosave'
import { CloudError, cloudEnabled, readCode, syncSessions } from './storage/cloud'
import { prepareSound, playSignal } from './sound'

type Screen = 'today' | 'victory' | 'photo' | 'zones' | 'profile'
const NAV: [Screen, string][] = [['today', 'Сегодня'], ['zones', 'Сценарии'], ['profile', 'Профиль']]

const readLink = (): Session[] | 'bad' | null =>
  location.hash.startsWith('#restore=') ? decode(location.hash) ?? 'bad' : null

const readCodeLink = () =>
  cloudEnabled && location.hash.startsWith('#code=') ? readCode(location.hash) ?? 'bad' : null

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

  const [sync, setSync] = useState<SyncStatus>('idle')
  // Отправляем всё и получаем объединение: повтор безопасен, потерянный ответ не страшен.
  const doSync = useCallback(async () => {
    const code = ref.current.cloudCode
    if (!cloudEnabled || !code) return
    setSync('saving')
    try {
      const remote = await syncSessions(code, ref.current.sessions)
      if (ref.current.cloudCode !== code) return
      update({ sessions: mergeSessions(ref.current.sessions, remote) })
      setSync('saved')
    } catch (e) {
      setSync(e instanceof CloudError && e.status === 401 ? 'unknown-code' : 'offline')
    }
  }, [update])
  const count = state.sessions.length
  useEffect(() => { void doSync() }, [doSync, state.cloudCode, count])
  useEffect(() => {
    const retry = () => { if (document.visibilityState === 'visible') void doSync() }
    window.addEventListener('online', retry)
    document.addEventListener('visibilitychange', retry)
    return () => { window.removeEventListener('online', retry); document.removeEventListener('visibilitychange', retry) }
  }, [doSync])

  const [linkCode, setLinkCode] = useState(readCodeLink)
  useEffect(() => {
    const onHash = () => setLinkCode(readCodeLink())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
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
    update({ sessions, recent, timer: null, zone: null, taskId: pickNext(ref.current.home, null, recent, t.taskId).id })
    setLastSec(sec)
    setScreen('victory')
    window.scrollTo(0, 0)
    if (byTimer) playSignal()
  }, [update])

  const start = (minutes: Minutes) => {
    prepareSound()
    // Просим браузер не удалять данные самому при нехватке места.
    navigator.storage?.persist?.().catch(() => {})
    const { taskId } = ref.current
    const { zone } = TASKS.find(t => t.id === taskId)!
    window.scrollTo(0, 0)
    update({ timer: startTimer(Date.now(), minutes, taskId, zone) })
  }

  const go = (s: Screen) => { setScreen(s); window.scrollTo(0, 0) }
  const restore = (s: Session[]) => update({ sessions: mergeSessions(ref.current.sessions, s) })
  const closeLink = () => {
    history.replaceState(null, '', location.pathname + location.search)
    setIncoming(null)
    setLinkCode(null)
  }

  if (incoming === 'bad' || linkCode === 'bad') return (
    <main>
      <h1>Ссылка пришла не целиком</h1>
      <p>Попробуйте скопировать её ещё раз или восстановить прогресс из файла.</p>
      <button className="primary" onClick={closeLink}>Хорошо</button>
    </main>
  )
  if (linkCode) return (
    <main>
      <h1>Подключить автосохранение?</h1>
      <p>Прогресс из сохранения появится здесь, а сессии с этого устройства добавятся к нему. Открывайте только свою личную ссылку.</p>
      <button className="primary" onClick={() => { update({ cloudCode: linkCode }); closeLink(); setScreen('profile') }}>Подключить</button>
      <button onClick={closeLink}>Не сейчас</button>
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
        ? <Timer timer={state.timer} home={state.home} onChange={timer => update({ timer })} onFinish={finish} onCancel={() => update({ timer: null })} />
        : screen === 'victory'
          ? <Victory sec={lastSec} state={state} onHome={() => setScreen('today')} onProfile={() => setScreen('profile')} />
          : <>
            {screen === 'zones'
              ? <Zones home={state.home} onRestart={() => start(5)} onZone={zone => {
                  update({ zone, taskId: pickNext(ref.current.home, zone, ref.current.recent).id })
                  go('today')
                }} />
              : screen === 'profile'
                ? <Profile state={state} update={update} onRestore={restore} sync={sync} />
                : screen === 'photo'
                  ? <Photo onBack={() => go('today')} />
                  : <Today state={state} update={update} onStart={start} onPhoto={() => go('photo')} onScenarios={() => go('zones')} />}
            <nav aria-label="Разделы">
              {NAV.map(([id, name]) => <button key={id} aria-current={screen === id ? 'page' : undefined}
                onClick={() => go(id)}>{name}</button>)}
            </nav>
          </>}
    </>
  )
}
