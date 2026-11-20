import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const CATS = [
  ['attack', 'Attack'],
  ['defence', 'Defence'],
  ['teamwork', 'Teamwork'],
  ['effort', 'Effort'],
]

export default function Scores({ userId }) {
  const [stats, setStats] = useState([])
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: s, error: e1 } = await supabase
        .from('player_stats')
        .select('*')
        .order('overall', { ascending: false })
      if (e1) {
        setError(e1.message)
        return
      }
      setStats(s || [])

      const { data: h } = await supabase
        .from('match_scores')
        .select('match_id, overall, ratings_count')
        .eq('player_id', userId)
      const { data: m } = await supabase
        .from('matches')
        .select('id, match_date, venue')
      const byId = Object.fromEntries((m || []).map((x) => [x.id, x]))
      setHistory(
        (h || [])
          .map((r) => ({ ...r, match: byId[r.match_id] }))
          .sort((a, b) =>
            (b.match?.match_date || '').localeCompare(a.match?.match_date || '')
          )
      )
    }
    load()
    const timer = setInterval(load, 10000)
    return () => clearInterval(timer)
  }, [userId])

  const mine = stats.find((s) => s.player_id === userId)

  return (
    <div className="section">
      <h2>My scores</h2>
      {error && <p className="error">{error}</p>}
      {!mine ? (
        <p className="muted">
          No scores yet. Scores appear after a match closes and enough players
          have rated you.
        </p>
      ) : (
        <>
          <div className="big">{mine.overall}<span className="muted"> / 10</span></div>
          <p className="muted">
            Overall average across {mine.matches_rated} match
            {mine.matches_rated > 1 ? 'es' : ''}
          </p>
          {CATS.map(([key, label]) => (
            <div className="row" key={key}>
              <span className="muted">{label}</span>
              <span>{mine[key] ?? '—'}</span>
            </div>
          ))}
        </>
      )}

      {history.length > 0 && (
        <>
          <h2>My match history</h2>
          {history.map((r) => (
            <div className="row" key={r.match_id}>
              <span>
                {r.match?.match_date} {r.match?.venue && `· ${r.match.venue}`}
              </span>
              <strong>{r.overall}</strong>
            </div>
          ))}
        </>
      )}

      <h2>Leaderboard</h2>
      {stats.length === 0 && <p className="muted">No ranked players yet.</p>}
      {stats.map((s, i) => (
        <div className={'row' + (s.player_id === userId ? ' me' : '')} key={s.player_id}>
          <span>
            {i + 1}. {s.name}
          </span>
          <strong>{s.overall}</strong>
        </div>
      ))}
    </div>
  )
}
