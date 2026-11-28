import type { ZoneId } from '../content/tasks'
import { weekPlaces } from '../content/home'
import { ZONE_ART } from '../content/zoneArt'
import tired from '../assets/minutka/minutka-tired.svg'
import { focusZone } from '../domain/planner'
import type { AppState } from '../storage/store'

interface Props { state: AppState; onZone: (z: ZoneId) => void; onRestart: () => void; onPro: () => void }

export function Zones({ state, onZone, onRestart, onPro }: Props) {
  const current = focusZone(state)
  return (
    <main className="with-nav">
      <h1>Сценарии</h1>
      <section className="card stack">
        <img className="helper" src={tired} alt="" />
        <p className="task">Быстрый перезапуск</p>
        <p className="muted">Несколько лёгких дел на 5 минут. Можно остановиться после первого.</p>
        <button className="primary" onClick={onRestart}>Начать 5 минут</button>
      </section>
      <section className="card stack">
        <p className="task">Место недели</p>
        <p className="muted">Места идут по кругу. Можно выбрать любое: сделанное не потеряется.</p>
        <div className="chips places">
          {weekPlaces(state.home).map(p => <button key={p.zone} aria-pressed={p.zone === current}
            onClick={() => { if (p.zone !== current) onZone(p.zone) }}><img src={ZONE_ART[p.zone]} alt="" />{p.name}</button>)}
        </div>
      </section>
      <div className="rows">
        <button onClick={onPro}><span>Что будет в Pro</span><small>скоро</small></button>
      </div>
    </main>
  )
}
