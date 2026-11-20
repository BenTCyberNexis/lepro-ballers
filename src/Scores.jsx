import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const CATS = [
  ['passing', 'Passing'],
  ['shooting', 'Shooting'],
  ['defending', 'Defending'],
  ['dribbling', 'Dribbling'],
  ['work_rate', 'Work rate'],
  ['teamwork', 'Teamwork'],
]

// show="card"   -> my overall rating card (Home)
// show="detail" -> my full ratings breakdown (Me)
// show="table"  -> the leaderboard
export default function Scores({ userId, show }) {
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
        .select('*')
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
  const num = (v) => Math.round(Number(v))
  const noRating = (
    <p className="muted">
      No rating yet. Your card appears once enough players have rated you.
    </p>
  )

  if (show === 'table') {
    return (
      <div className="section">
        <h2>Leaderboard</h2>
        {error && <p className="error">{error}</p>}
        {stats.length === 0 && <p className="muted">No ranked players yet.</p>}
        {stats.map((s, i) => (
          <div className={'row' + (s.player_id === userId ? ' me' : '')} key={s.player_id}>
            <span>
              {i + 1}. {s.name}
            </span>
            <strong>{num(s.overall)}</strong>
          </div>
        ))}
      </div>
    )
  }

  if (show === 'card') {
    return (
      <div className="section">
        <h2>My card</h2>
        {error && <p className="error">{error}</p>}
        {!mine ? (
          noRating
        ) : (
          <div className="fut-card">
            <div className="fut-top">
              <div className="fut-ovr">{num(mine.overall)}</div>
              <div>
                <div className="fut-name">{mine.name}</div>
                <div className="muted">
                  Based on {mine.matches_rated} match{mine.matches_rated > 1 ? 'es' : ''}
                </div>
              </div>
            </div>
            <div className="fut-stats">
              {CATS.map(([key, label]) => (
                <div className="fut-stat" key={key}>
                  <span className="fut-val">{num(mine[key])}</span>
                  <span className="fut-lab">{label}</span>
                  <div className="bar">
                    <div className="bar-fill" style={{ width: Number(mine[key]) + '%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // show === 'detail'
  const ranked = mine
    ? CATS.map(([key, label]) => ({ key, label, value: Number(mine[key]) })).sort(
        (a, b) => b.value - a.value
      )
    : []
  const best = ranked[0]
  const worst = ranked[ranked.length - 1]
  const trend = [...history].reverse().slice(-10)

  return (
    <div className="section">
      <h2>My ratings</h2>
      {error && <p className="error">{error}</p>}
      {!mine ? (
        noRating
      ) : (
        <>
          <div className="detail-top">
            <div className="detail-ovr">{num(mine.overall)}</div>
            <div>
              <div className="detail-label">Overall</div>
              <div className="muted">
                Average of every rating you received, across {mine.matches_rated} match
                {mine.matches_rated > 1 ? 'es' : ''}
              </div>
            </div>
          </div>

          <h2>By category</h2>
          {CATS.map(([key, label]) => (
            <div className="stat-row" key={key}>
              <span className="stat-name">{label}</span>
              <div className="stat-track">
                <div
                  className={'stat-fill' + (best && best.key === key ? ' best' : '')}
                  style={{ width: Number(mine[key]) + '%' }}
                />
              </div>
              <strong className="stat-num">{num(mine[key])}</strong>
            </div>
          ))}
          {best && worst && best.value !== worst.value && (
            <p className="muted">
              Strongest: <strong>{best.label}</strong> ({Math.round(best.value)}). Most
              room to grow: <strong>{worst.label}</strong> ({Math.round(worst.value)}).
            </p>
          )}

          {trend.length > 1 && (
            <>
              <h2>Recent form</h2>
              <div className="trend">
                {trend.map((r) => (
                  <div className="trend-col" key={r.match_id}>
                    <div className="trend-bar" style={{ height: Number(r.overall) * 0.7 + 'px' }} />
                    <span className="trend-num">{num(r.overall)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <h2>Match by match</h2>
          {history.map((r) => (
            <div className="match-block" key={r.match_id}>
              <div className="row">
                <span>
                  {r.match?.match_date} {r.match?.venue && `· ${r.match.venue}`}
                </span>
                <strong>{num(r.overall)}</strong>
              </div>
              <div className="mini-stats">
                {CATS.map(([key, label]) => (
                  <span key={key}>
                    <b>{num(r[key])}</b> {label}
                  </span>
                ))}
              </div>
              <p className="muted small-text">Rated by {r.ratings_count} players</p>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
