import { useState } from 'react'
import { decode, encode, plural, summary, type Session } from '../domain/progress'
import { reminderIcs } from '../domain/reminder'
import { downloadText } from '../download'
import type { AppState } from '../storage/store'

interface Props { state: AppState; update: (p: Partial<AppState>) => void; onRestore: (s: Session[]) => void }

export function Profile({ state, update, onRestore }: Props) {
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [reminderMsg, setReminderMsg] = useState('')
  const s = summary(state.sessions, Date.now())
  const code = encode(state.sessions)
  const unsaved = Math.max(0, state.sessions.length - state.backedUp)
  const backedUp = () => update({ backedUp: state.sessions.length })

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}${location.pathname}#restore=${code}`)
      backedUp()
      setMsg('Ссылка скопирована. Отправьте её себе в сообщения или заметки.')
    } catch { setMsg('Не получилось скопировать. Попробуйте скачать файл.') }
  }
  const download = () => {
    downloadText(`mikrouborka-${new Date().toLocaleDateString('sv')}.txt`, code, 'text/plain')
    backedUp()
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
    <main className="with-nav">
      <h1>Профиль</h1>
      {!state.guiltFree && <section className="card">
        <p className="task">{s.minutes} мин за 30 дней</p>
        <p className="muted">{s.days} {plural(s.days, 'день', 'дня', 'дней')} заботы о доме. Всего сессий: {s.total}.</p>
      </section>}

      <h2>Режим без вины</h2>
      <label className="check">
        <input type="checkbox" checked={state.guiltFree} onChange={e => update({ guiltFree: e.target.checked })} />
        Не показывать счётчики минут и дней
      </label>
      <p className="muted">Пропуски здесь никогда не обнуляют прогресс.</p>

      <h2>Мягкое напоминание</h2>
      <label className="field">Время
        <input type="time" required value={state.remindAt} onChange={e => e.target.value && update({ remindAt: e.target.value })} />
      </label>
      <button onClick={() => {
        downloadText('napominanie.ics', reminderIcs(state.remindAt, new Date()), 'text/calendar')
        setReminderMsg('Откройте скачанный файл, чтобы добавить напоминание в календарь.')
      }}>Добавить в календарь</button>
      <p className="muted" role="status">{reminderMsg || 'Раз в день. Изменить или отключить можно в самом календаре.'}</p>

      {state.sessions.length > 0 && <>
        <h2>Сохранить копию прогресса</h2>
        <p className="muted">Данные пока хранятся только в этом браузере. Копия поможет вернуть их после очистки или на другом телефоне.{unsaved > 0 && !state.guiltFree && ` Новых сессий без копии: ${unsaved}.`}</p>
        <button onClick={copy}>Скопировать ссылку</button>
        <button onClick={download}>Скачать файл</button>
      </>}

      <h2>Восстановить прогресс</h2>
      <label className="field">Ссылка или код
        <textarea rows={3} value={text} onChange={e => setText(e.target.value)} />
      </label>
      <button disabled={!text.trim()} onClick={() => restore(text)}>Восстановить из текста</button>
      <label className="field">Или файл
        <input type="file" accept=".txt,text/plain" onChange={e => { void pickFile(e.target.files?.[0]); e.target.value = '' }} />
      </label>
      <p role="status">{msg}</p>

      <h2>PRO</h2>
      <p className="muted">Пока не подключён. Всё, что сейчас работает, бесплатно.</p>
    </main>
  )
}
