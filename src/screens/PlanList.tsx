import type { Task } from '../content/tasks'
import { placeName, weekName, weekZone, type HomeId } from '../content/home'

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

const minutes = (list: Task[]) => list.reduce((n, t) => n + t.min, 0)

/** Две части: быстрая рутина по дому и дела места недели. */
export function PlanList({ tasks, home, current, done = [] }: Props) {
  const rows = tasks.map((t, n) => ({ t, n }))
  const quick = rows.filter(r => r.t.layer !== 'deep')
  const week = rows.filter(r => r.t.layer === 'deep')
  const both = quick.length > 0 && week.length > 0

  const item = ({ t, n }: { t: Task; n: number }) => {
    const ok = done.includes(t.id)
    const state = ok ? 'done' : current === undefined ? undefined : n === current ? 'now' : n < current ? 'past' : undefined
    return <li key={t.id} data-state={state} aria-current={state === 'now' ? 'step' : undefined}>
      <span className="tags">
        <span className="num" aria-label={ok ? 'сделано' : undefined}>{ok ? '✓' : n + 1}</span>
        <ZoneTag zone={t.zone} home={home} />
      </span>
      <span className="row"><span>{t.text}</span><small>{t.min} мин</small></span>
    </li>
  }
  const part = (title: string, list: typeof rows) => <>
    {both && <p className="plan-part">{title} · {minutes(list.map(r => r.t))} мин</p>}
    {list.length > 0 && <ol className="plan">{list.map(item)}</ol>}
  </>

  return <>
    {part('Быстро по дому', quick)}
    {week.length > 0 && part(`Место недели: ${weekName(weekZone(week[0]!.t.zone, home), home)}`, week)}
  </>
}
