export function formatMatchDate(date) {
  if (!date) return ''

  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) return date

  return parsed.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
