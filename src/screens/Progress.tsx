import { useState } from 'react'
import { decode, encode, plural, summary, type Session } from '../domain/progress'
import type { AppState } from '../storage/store'

interface Props { state: AppState; onRestore: (s: Session[]) => void; onBackedUp: () => void; onHome: () => void }

export function Progress({ state, onRestore, onBackedUp, onHome }: Props) {
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const s = summary(state.sessions, Date.now())
  const code = encode(state.sessions)
  const unsaved = Math.max(0, state.sessions.length - state.backedUp)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}${location.pathname}#restore=${code}`)
      onBackedUp()
      setMsg('Ссылка скопирована. Отправьте её себе в сообщения или заметки.')
    } catch { setMsg('Не получилось скопировать. Попробуйте скачать файл.') }
  }
  const download = () => {
    const a = document.createElement('a')
    const url = URL.createObjectURL(new Blob([code], { type: 'text/plain' }))
    a.href = url
    a.download = `mikrouborka-${new Date().toLocaleDateString('sv')}.txt`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    onBackedUp()
    setMsg('Файл с копией передан в загрузки.')
  }
  const restore = (raw: string) => {
    const got = decode(raw)
    if (!got) { setMsg('Это не похоже на копию прогресса. Проверьте, что она вставлена целиком.'); return }
    onRestore(got)
    setText('')
    setMsg(`Готово. Сессий в копии: ${got.length}.`)
  }
  const pickFile = async (f?: File) => {
    if (!f) return
    try { restore(await f.text()) } catch { setMsg('Не получилось прочитать файл.') }
  }

  return (
    <main>
      <h1>Мой прогресс</h1>
      <section className="card">
        <p className="task">{s.minutes} мин за 30 дней</p>
        <p className="muted">{s.days} {plural(s.days, 'день', 'дня', 'дней')} заботы о доме. Всего сессий: {s.total}.</p>
      </section>
      {state.sessions.length > 0 && <>
        <h2>Сохранить копию</h2>
        <p className="muted">Данные пока хранятся только в этом браузере. Копия поможет вернуть их после очистки или на другом телефоне.{unsaved > 0 && ` Новых сессий без копии: ${unsaved}.`}</p>
        <button className="primary" onClick={copy}>Скопировать ссылку</button>
        <button onClick={download}>Скачать файл</button>
      </>}
      <h2>Восстановить</h2>
      <label className="field">Ссылка или код
        <textarea rows={3} value={text} onChange={e => setText(e.target.value)} />
      </label>
      <button disabled={!text.trim()} onClick={() => restore(text)}>Восстановить из текста</button>
      <label className="field">Или файл
        <input type="file" accept=".txt,text/plain" onChange={e => { void pickFile(e.target.files?.[0]); e.target.value = '' }} />
      </label>
      <p role="status">{msg}</p>
      <button className="link" onClick={onHome}>На главную</button>
    </main>
  )
}
