/** Ежедневное мягкое напоминание для календаря телефона. Время местное, без часового пояса. */
export function reminderIcs(time: string, now: Date): string {
  const [h, m] = time.split(':').map(Number) as [number, number]
  const start = new Date(now)
  start.setHours(h, m, 0, 0)
  if (start <= now) start.setDate(start.getDate() + 1)
  const p = (n: number) => String(n).padStart(2, '0')
  const local = `${start.getFullYear()}${p(start.getMonth() + 1)}${p(start.getDate())}T${p(h)}${p(m)}00`
  const stamp = now.toISOString().replace(/[-:]|\.\d+/g, '')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//cleaning-app//RU', 'BEGIN:VEVENT',
    'UID:daily-reminder-cleaning-app', `DTSTAMP:${stamp}`, `DTSTART:${local}`, 'DURATION:PT15M',
    'RRULE:FREQ=DAILY', 'SUMMARY:Несколько минут для дома\\, если есть силы',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Несколько минут для дома', 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n')
}
