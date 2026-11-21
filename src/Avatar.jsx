import { avatarUrl } from './avatar'

// Shows the player's photo, or their initials if they have none yet
export default function Avatar({ path, name = '', size = 40 }) {
  const url = avatarUrl(path)
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) }
  if (url) {
    return <img className="avatar" src={url} alt={name} style={style} loading="lazy" />
  }
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => (w[0] || '').toUpperCase())
    .join('')
  return (
    <span className="avatar avatar-fallback" style={style} aria-label={name}>
      {initials || '?'}
    </span>
  )
}
