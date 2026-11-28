import { useState } from 'react'
import { plural, summary } from '../domain/progress'
import { HOMES } from '../content/home'
import { decodeBackup, encodeBackup, type Backup } from '../domain/backup'
import { reminderIcs } from '../domain/reminder'
import { Autosave, type SyncStatus } from './Autosave'
import { cloudEnabled } from '../storage/cloud'
import { downloadText } from '../download'
import type { AppState } from '../storage/store'

interface Props { state: AppState; update: (p: Partial<AppState>) => void; onRestore: (b: Backup) => void; sync: SyncStatus; onPro: () => void }

export function Profile({ state, update, onRestore, sync, onPro }: Props) {
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [reminderMsg, setReminderMsg] = useState('')
  const s = summary(state.sessions, Date.now())
  const code = encodeBackup(state)
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
    const got = decodeBackup(raw)
    if (!got) { setMsg('Это не похоже на копию прогресса. Проверьте, что она вставлена целиком.'); return }
    onRestore(got)
    setText('')
    setMsg(`Готово. Сессий в копии: ${got.sessions.length}.`)
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

      <h2>Моя квартира</h2>
      <div className="chips" role="group" aria-label="Моя квартира">
        {HOMES.map(h => <button key={h.id} aria-pressed={h.id === state.home} onClick={() => update({ home: h.id })}>{h.name}</button>)}
      </div>
      <p className="muted">Подберём задачи и названия мест под ваш дом.</p>

      <h2>Режим без вины</h2>
      <label className="check">
        <input type="checkbox" checked={state.guiltFree} onChange={e => update({ guiltFree: e.target.checked })} />
        Не показывать счётчики минут, дней и дел
      </label>
      <p className="muted">Пропуски здесь никогда не обнуляют прогресс.</p>

      <h2>Напоминания в календарь</h2>
      <p className="muted">Добавим 14 дней с местом недели. Дела приложение подберёт, когда вы его откроете.</p>
      <label className="field">Время
        <input type="time" required value={state.remindAt} onChange={e => e.target.value && update({ remindAt: e.target.value })} />
      </label>
      <button onClick={() => {
        downloadText('napominanie.ics', reminderIcs(state.remindAt, new Date(), state), 'text/calendar')
        setReminderMsg('Откройте скачанный файл, чтобы добавить дни в календарь. Повторите через две недели.')
      }}>Добавить в календарь</button>
      <p className="muted" role="status">{reminderMsg || 'Раз в день. Любой день можно удалить в самом календаре.'}</p>

      {cloudEnabled && <Autosave state={state} status={sync} onCode={cloudCode => update({ cloudCode })} />}

      {state.sessions.length > 0 && <>
        <h2>Сохранить копию прогресса</h2>
        <p className="muted">{state.cloudCode ? 'Запасной способ: копия' : 'Данные пока хранятся только в этом браузере. Копия'} поможет вернуть их после очистки или на другом телефоне.{unsaved > 0 && !state.guiltFree && ` Новых сессий без копии: ${unsaved}.`}</p>
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
      <div className="rows">
        <button onClick={onPro}><span>Что будет в Pro</span><small>скоро</small></button>
      </div>
    </main>
  )
}
