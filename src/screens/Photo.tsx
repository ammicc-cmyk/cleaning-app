export function Photo({ onBack }: { onBack: () => void }) {
  return (
    <main className="with-nav">
      <h1>Разбор по фото</h1>
      <section className="card stack">
        <p className="task">Покажите один угол, и мы подскажем первый шаг</p>
        <p className="muted">Скоро. Одна проба будет бесплатной. Сейчас фото не загружаются и никуда не отправляются.</p>
      </section>
      <button onClick={onBack}>На главную</button>
    </main>
  )
}
