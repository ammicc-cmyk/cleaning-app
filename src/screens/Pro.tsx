// Здесь только описание. Само платное содержание в код не кладём: репозиторий и сборка публичны.
const FEATURES = [
  ['Разбор по фото', 'Сфотографируйте один угол, и мы подскажем 3–5 маленьких дел именно для него.', '1 разбор бесплатно'],
  ['Сценарии', '«Гости скоро», «После тяжёлой недели», «Перед отпуском». Готовый короткий план под ситуацию.', null],
  ['Программы', '7–14 спокойных дней, по одному шагу в день.', 'Первые 2 дня бесплатно'],
] as const

export function Pro({ onBack }: { onBack: () => void }) {
  return (
    <main className="with-nav">
      <h1>Pro</h1>
      <p className="muted">Скоро. Всё, что работает сейчас, останется бесплатным.</p>
      {FEATURES.map(([name, about, free], n) => <section key={name} className={n === 0 ? 'card stack pro-main' : 'card stack'}>
        <p className="pro-head"><b>{name}</b><small className="soon">скоро</small></p>
        <p className="muted">{about}</p>
        {free && <p className="gain">{free}</p>}
      </section>)}
      <button onClick={onBack}>Назад</button>
    </main>
  )
}
