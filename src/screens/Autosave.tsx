import { useState } from 'react'
import { codeLink, createCalendar, createProfile, deleteProfile, readCode } from '../storage/cloud'
import type { AppState } from '../storage/store'

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'unknown-code'
const STATUS: Record<SyncStatus, string> = {
  idle: '', saving: 'Сохраняем…', saved: 'Всё сохранено.',
  offline: 'Сохранится, когда появится связь.',
  'unknown-code': 'Сохранение с этим кодом не найдено. Прогресс на устройстве на месте.',
}

interface Props {
  state: AppState; status: SyncStatus
  onCode: (code: string | null) => void
}

export function Autosave({ state, status, onCode }: Props) {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState('')
  const [cal, setCal] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const code = state.cloudCode

  const run = async (f: () => Promise<void>) => {
    setBusy(true); setMsg('')
    try { await f() } catch { setMsg('Сервер сейчас не отвечает. Попробуйте чуть позже.') }
    setBusy(false)
  }
  const copy = async (s: string, ok: string) => {
    try { await navigator.clipboard.writeText(s); setMsg(ok) } catch { setMsg('Не получилось скопировать. Выделите текст вручную.') }
  }

  if (!code) return (
    <>
      <h2>Автосохранение</h2>
      <p className="muted">Время и длительность сессий будут храниться на нашем сервере. Без имени, почты и телефона. Отметки дел остаются на устройстве и в копии прогресса.</p>
      <button className="primary" disabled={busy} onClick={() => run(async () => onCode(await createProfile()))}>Включить</button>
      <label className="field">Уже есть личный код
        <input type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} value={text} onChange={e => setText(e.target.value)} />
      </label>
      <button disabled={!text.trim()} onClick={() => {
        const c = readCode(text)
        if (c) { onCode(c); setText('') } else setMsg('Код не похож на наш. Проверьте, что он целиком.')
      }}>Подключить по коду</button>
      <p role="status">{msg}</p>
    </>
  )
  return (
    <>
      <h2>Автосохранение включено</h2>
      <p className="muted" role="status">{STATUS[status]}</p>
      <p className="muted">Сохраните личную ссылку один раз, например в заметках. После очистки браузера она вернёт весь прогресс. Не показывайте её другим.</p>
      <code className="code">{code.match(/.{4}/g)!.join('-')}</code>
      <button className="primary" onClick={() => copy(codeLink(code), 'Ссылка скопирована.')}>Скопировать личную ссылку</button>
      <button disabled={busy} onClick={() => run(async () => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        setCal(await createCalendar(code, { time: state.remindAt, minutes: state.minutes, home: state.home, tz }))
      })}>Создать ссылку для календаря</button>
      {cal && <>
        <code className="code">{cal}</code>
        <button onClick={() => copy(cal, 'Ссылка календаря скопирована.')}>Скопировать ссылку календаря</button>
        <p className="muted">Добавьте её в календарь как подписку и проверьте, что уведомления для неё включены. Новая ссылка отменяет прежнюю.</p>
      </>}
      <button className="link" onClick={() => onCode(null)}>Отключить на этом устройстве</button>
      {!confirmDelete
        ? <button className="link" onClick={() => setConfirmDelete(true)}>Удалить данные с сервера</button>
        : <button disabled={busy} onClick={() => run(async () => { await deleteProfile(code); onCode(null) })}>Да, удалить с сервера</button>}
      <p role="status">{msg}</p>
    </>
  )
}
