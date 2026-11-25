import { ZONES, type ZoneId } from '../content/tasks'

// Шаги платных сценариев сюда не добавляем: репозиторий и сборка публичны.
const SOON = [
  { name: 'Гости скоро', about: 'Что заметно с порога, если есть полчаса.' },
  { name: 'После тяжёлой недели', about: 'Бережный разбор завала короткими шагами.' },
]

interface Props { onZone: (z: ZoneId) => void; onRestart: () => void }

export function Zones({ onZone, onRestart }: Props) {
  return (
    <main className="with-nav">
      <h1>Зоны и сценарии</h1>
      <p className="muted">Сюда заходить необязательно: на главной всё уже подобрано.</p>
      <h2>Сценарии</h2>
      <section className="card stack">
        <p className="task">Быстрый перезапуск</p>
        <p className="muted">Одно лёгкое действие на 5 минут. Подойдёт после любого перерыва.</p>
        <button className="primary" onClick={onRestart}>Начать 5 минут</button>
      </section>
      {SOON.map(s => (
        <section className="card stack" key={s.name}>
          <p className="task">{s.name}</p>
          <p className="muted">{s.about}</p>
          <p className="muted">Скоро в PRO</p>
        </section>
      ))}
      <h2>Если хочется выбрать зону</h2>
      <div className="chips">
        {ZONES.map(z => <button key={z.id} onClick={() => onZone(z.id)}>{z.name}</button>)}
      </div>
    </main>
  )
}
