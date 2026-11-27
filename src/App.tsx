import { useCallback, useEffect, useRef, useState } from 'react'
import { KEY, load, save, parseState, type AppState } from './storage/store'
import { mergeSessions } from './domain/progress'
import { cleanDone, decodeBackup, mergeDone, type Backup } from './domain/backup'
import { buildPlan, focusZone, skip } from './domain/planner'
import { elapsedSec, leftMs, startTimer } from './domain/timer'
import { taskById, type Minutes, type ZoneId } from './content/tasks'
import { Today } from './screens/Today'
import { Timer } from './screens/Timer'
import { Victory, type Result } from './screens/Victory'
import { Photo } from './screens/Photo'
import { Zones } from './screens/Zones'
import { Profile } from './screens/Profile'
import type { SyncStatus } from './screens/Autosave'
import { CloudError, cloudEnabled, readCode, syncSessions } from './storage/cloud'
import { prepareSound, playSignal } from './sound'
import { NavIcon } from './NavIcon'

type Screen = 'today' | 'victory' | 'photo' | 'zones' | 'profile'
const NAV: [Screen, string][] = [['today', 'Сегодня'], ['zones', 'Сценарии'], ['profile', 'Профиль']]

const readLink = (): Backup | 'bad' | null =>
  location.hash.startsWith('#restore=') ? decodeBackup(location.hash) ?? 'bad' : null

const readCodeLink = () =>
  cloudEnabled && location.hash.startsWith('#code=') ? readCode(location.hash) ?? 'bad' : null

export function App() {
  const [state, setState] = useState<AppState>(load)
  const ref = useRef(state)
  const [screen, setScreen] = useState<Screen>('today')
  const [result, setResult] = useState<Result>({ sec: 0, done: [], pending: null })
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
    // 5 минут чередуются: рутина, потом место недели.
    const nextFive = t.minutes !== 5 ? ref.current.nextFive : t.plan.some(id => taskById(id)?.layer === 'deep') ? 'routine' : 'deep'
    update({ sessions, nextFive, timer: null })
    setResult({ sec, done: t.done, pending: t.plan[t.i] ?? null })
    setScreen('victory')
    window.scrollTo(0, 0)
    if (byTimer) playSignal()
  }, [update])

  const markDone = (id: string) => mergeDone(ref.current.done, cleanDone({ [id]: Math.floor(Date.now() / 1000) }))
  const step = (done: boolean) => {
    const t = ref.current.timer
    if (!t) return
    const now = Date.now()
    // Время уже вышло, пока экран спал: последнее дело можно отметить на экране завершения.
    if (leftMs(t, now) === 0) { finish(true); return }
    const id = t.plan[t.i]!
    const timer = { ...t, i: t.i + 1, done: done ? [...t.done, id] : t.done }
    const patch = done ? { done: markDone(id) } : { skipped: skip(ref.current, id, t.minutes, now) }
    ref.current = { ...ref.current, ...patch, timer }
    if (timer.i < timer.plan.length) update({})
    else finish(false)
  }

  const start = (minutes: Minutes, mode: 'auto' | 'routine' = 'auto') => {
    prepareSound()
    // Просим браузер не удалять данные самому при нехватке места.
    navigator.storage?.persist?.().catch(() => {})
    const now = Date.now()
    const s = ref.current
    window.scrollTo(0, 0)
    update({
      focus: s.focus ?? { zone: focusZone(s), since: Math.floor(now / 1000) },
      timer: startTimer(now, minutes, buildPlan(s, minutes, now, mode).map(t => t.id)),
    })
  }
  const setFocus = (zone: ZoneId) => update({ focus: { zone, since: Math.floor(Date.now() / 1000) } })

  const go = (s: Screen) => { setScreen(s); window.scrollTo(0, 0) }
  const restore = (b: Backup) => {
    const c = ref.current
    // Место недели из копии берём, только если своего ещё нет.
    update({ sessions: mergeSessions(c.sessions, b.sessions), done: mergeDone(c.done, b.done), focus: c.focus ?? b.focus })
  }
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
      <p>Сессий в копии: {incoming.sessions.length}. Добавим их к тому, что уже есть здесь. Ничего не сотрётся.</p>
      <button className="primary" onClick={() => { restore(incoming); closeLink(); setScreen('profile') }}>Восстановить</button>
      <button onClick={closeLink}>Не сейчас</button>
    </main>
  )

  return (
    <>
      {!saveOk && <p className="notice" role="alert">Браузер не даёт сохранять данные. Сохраните копию на экране «Профиль», не закрывая вкладку.</p>}
      {state.timer
        ? <Timer timer={state.timer} home={state.home} onChange={timer => update({ timer })} onFinish={finish} onStep={step} onCancel={() => update({ timer: null })} />
        : screen === 'victory'
          ? <Victory result={result} state={state} onMark={id => { update({ done: markDone(id) }); setResult(r => ({ ...r, done: [...r.done, id], pending: null })) }} onHome={() => setScreen('today')} onProfile={() => setScreen('profile')} />
          : <>
            {screen === 'zones'
              ? <Zones state={state} onRestart={() => start(5, 'routine')} onZone={zone => { setFocus(zone); go('today') }} />
              : screen === 'profile'
                ? <Profile state={state} update={update} onRestore={restore} sync={sync} />
                : screen === 'photo'
                  ? <Photo onBack={() => go('today')} />
                  : <Today state={state} update={update} onStart={start} onZone={setFocus} onPhoto={() => go('photo')} onScenarios={() => go('zones')} />}
            <nav aria-label="Разделы">
              {NAV.map(([id, name]) => <button key={id} aria-current={screen === id ? 'page' : undefined}
                onClick={() => go(id)}><NavIcon name={id === 'zones' ? 'zones' : id === 'profile' ? 'profile' : 'today'} />{name}</button>)}
            </nav>
          </>}
    </>
  )
}
