import type { ZoneId } from '../content/tasks'
import { places, type HomeId } from '../content/home'

// Содержание платного сюда не добавляем: репозиторий и сборка публичны.
const PRO = [
  ['Сценарии', 'Гости скоро, после тяжёлой недели, перед отпуском'],
  ['Программы', '7–14 спокойных дней, первые 2 дня бесплатно'],
  ['Подборки', 'Пятна, запахи, кухня'],
] as const

interface Props { home: HomeId | null; onZone: (z: ZoneId) => void; onRestart: () => void }

export function Zones({ home, onZone, onRestart }: Props) {
  return (
    <main className="with-nav">
      <h1>Сценарии</h1>
      <section className="card stack">
        <p className="task">Быстрый перезапуск</p>
        <p className="muted">Одно лёгкое действие на 5 минут. Подойдёт после любого перерыва.</p>
        <button className="primary" onClick={onRestart}>Начать 5 минут</button>
      </section>
      <details className="card">
        <summary>Скоро в PRO</summary>
        <dl>{PRO.map(([name, about]) => <div key={name}><dt>{name}</dt><dd>{about}</dd></div>)}</dl>
      </details>
      <details className="card">
        <summary>Выбрать место самому</summary>
        <div className="chips">
          {places(home).map(p => <button key={p.zone} onClick={() => onZone(p.zone)}>{p.name}</button>)}
        </div>
      </details>
    </main>
  )
}
