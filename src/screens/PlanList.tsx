import type { Task } from '../content/tasks'
import { placeName, type HomeId } from '../content/home'

/** Цветная метка места. «Комната» в однокомнатной квартире — одно место, значит и цвет один. */
export function ZoneTag({ zone, home }: { zone: Task['zone']; home: HomeId | null }) {
  const place = placeName(zone, home)
  if (!place) return null
  return <span className="zone" data-zone={place === 'Комната' ? 'bedroom' : zone}>{place}</span>
}

interface Props {
  tasks: Task[]; home: HomeId | null
  /** Во время таймера: какое дело сейчас и какие сделаны. */
  current?: number; done?: string[]
}

export function PlanList({ tasks, home, current, done = [] }: Props) {
  return (
    <ol className="plan">{tasks.map((t, n) => {
      const ok = done.includes(t.id)
      const state = ok ? 'done' : current === undefined ? undefined : n === current ? 'now' : n < current ? 'past' : undefined
      return <li key={t.id} data-state={state} aria-current={state === 'now' ? 'step' : undefined}>
        <span className="tags">
          <span className="num" aria-label={ok ? 'сделано' : undefined}>{ok ? '✓' : n + 1}</span>
          <ZoneTag zone={t.zone} home={home} />
        </span>
        <span className="row"><span>{t.text}</span><small>{t.min} мин</small></span>
      </li>
    })}</ol>
  )
}
