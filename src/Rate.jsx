import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { formatMatchDate } from './dateUtils'

const CATS = [
  ['passing', 'Passing'],
  ['shooting', 'Shooting'],
  ['defending', 'Defending'],
  ['dribbling', 'Dribbling'],
  ['work_rate', 'Work rate'],
  ['teamwork', 'Teamwork'],
]
const LABELS = [
  [1, 'Bad'],
  [2, 'Needs improvement'],
  [3, 'Average'],
  [4, 'Good'],
  [5, 'Excellent'],
]

export default function Rate({ userId }) {
  const [matches, setMatches] = useState([])
  const [active, setActive] = useState(null)
  const [targets, setTargets] = useState([])
  const [scores, setScores] = useState({})
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadMatches() {
    const { data } = await supabase
      .from('match_players')
      .select('team, matches(id, match_date, venue, status, rating_closes_at, result_entered)')
      .eq('player_id', userId)

    const open = (data || [])
      .filter(
        (r) =>
          r.matches &&
          r.matches.status === 'open' &&
          new Date(r.matches.rating_closes_at) > new Date()
      )
      .map((r) => ({ ...r.matches, team: r.team }))
      .sort((a, b) => b.match_date.localeCompare(a.match_date))

    if (open.length === 0) {
      setMatches([])
      return
    }

    const matchIds = open.map((m) => m.id)

    const { data: squads } = await supabase
      .from('match_players')
      .select('match_id, player_id, team')
      .in('match_id', matchIds)

    const { data: goals } = await supabase
      .from('goals')
      .select('match_id, scorer_id, is_own_goal')
      .in('match_id', matchIds)

    const playerTeams = {}
    ;(squads || []).forEach((p) => {
      playerTeams[`${p.match_id}:${p.player_id}`] = p.team
    })

    const results = {}
    open.forEach((m) => {
      results[m.id] = { teamA: 0, teamB: 0, hasResult: Boolean(m.result_entered) }
    })

    ;(goals || []).forEach((goal) => {
      const scorerTeam = playerTeams[`${goal.match_id}:${goal.scorer_id}`]
      if (!scorerTeam) return

      const creditedTeam = goal.is_own_goal
        ? (scorerTeam === 'A' ? 'B' : 'A')
        : scorerTeam

      if (creditedTeam === 'A') results[goal.match_id].teamA += 1
      if (creditedTeam === 'B') results[goal.match_id].teamB += 1
      results[goal.match_id].hasResult = true
    })

    setMatches(open.map((m) => ({ ...m, result: results[m.id] })))
  }

  useEffect(() => {
    loadMatches()
  }, [])

  async function openMatch(m) {
    setError('')
    const { data: s } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'rating_scope')
      .single()
    const scope = s?.value ?? 'everyone'

    const { data: mp } = await supabase
      .from('match_players')
      .select('player_id, team, players(name)')
      .eq('match_id', m.id)
    const { data: done } = await supabase.rpc('my_rated', { m: m.id })
    const doneIds = new Set((done || []).map((d) => d.rated_id))

    const list = (mp || [])
      .filter((p) => p.player_id !== userId)
      .filter(
        (p) =>
          scope === 'everyone' ||
          (scope === 'teammates' && p.team === m.team) ||
          (scope === 'opponents' && p.team !== m.team)
      )
      .map((p) => ({
        id: p.player_id,
        name: p.players?.name ?? 'Player',
        done: doneIds.has(p.player_id),
      }))
    setTargets(list)
    setScores({})
    setActive(m)
  }

  function setScore(id, field, value) {
    setScores({ ...scores, [id]: { ...scores[id], [field]: value } })
  }

  async function submit() {
    setError('')
    setMsg('')
    const rows = []
    for (const t of targets.filter((t) => !t.done)) {
      const sc = scores[t.id] || {}
      const filled = CATS.filter(([k]) => sc[k]).length
      if (filled === 0) continue
      if (filled < CATS.length) {
        setError('Answer every category for ' + t.name)
        return
      }
      rows.push({
        match_id: active.id,
        rater_id: userId,
        rated_id: t.id,
        ...Object.fromEntries(CATS.map(([k]) => [k, sc[k]])),
      })
    }
    if (rows.length === 0) {
      setError('Rate at least one player')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('ratings').insert(rows)
    setSaving(false)
    if (error) {
      setError(
        error.message.includes('duplicate')
          ? 'You already rated one of these players'
          : error.message
      )
      return
    }
    setMsg('Saved ' + rows.length + ' rating' + (rows.length > 1 ? 's' : ''))
    openMatch(active)
  }

  if (active) {
    return (
      <div className="section">
        <button
          className="small"
          onClick={() => {
            setActive(null)
            setMsg('')
            loadMatches()
          }}
        >
          ← Back
        </button>
        <h2>Rate players · {formatMatchDate(active.match_date)}</h2>
        <details className="legend">
          <summary>What do the ratings mean?</summary>
          <p><strong>Bad:</strong> Fails to meet basic expectations; major errors or issues.</p>
          <p><strong>Needs improvement:</strong> Below expectations; some good moments, but needs significant work.</p>
          <p><strong>Average:</strong> Meets basic expectations; acceptable, with minor flaws.</p>
          <p><strong>Good:</strong> Exceeds basic expectations; solid and reliable.</p>
          <p><strong>Excellent:</strong> Outstanding; one of the best on the pitch.</p>
        </details>
        {targets.length === 0 && (
          <p className="muted">There is nobody for you to rate in this match.</p>
        )}
        {targets.map((t) => (
          <div className="rate-card" key={t.id}>
            <strong>{t.name}</strong>
            {t.done ? (
              <p className="muted">✅ You rated this player</p>
            ) : (
              CATS.map(([key, label]) => (
                <div className="cat" key={key}>
                  <span className="muted">{label}</span>
                  <div className="pills">
                    {LABELS.map(([n, text]) => (
                      <button
                        type="button"
                        key={n}
                        className={'pill' + (scores[t.id]?.[key] === n ? ' on' : '')}
                        onClick={() => setScore(t.id, key, n)}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ))}
        {error && <p className="error">{error}</p>}
        {msg && <p className="ok">{msg}</p>}
        {targets.some((t) => !t.done) && (
          <button disabled={saving} onClick={submit}>
            {saving ? 'Saving...' : 'Submit ratings'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="section">
      <h2>Matches to rate ({matches.length})</h2>
      {matches.length === 0 && <p className="muted">Nothing to rate right now.</p>}
      {matches.map((m) => (
        <div className="row" key={m.id}>
          <span>
            {formatMatchDate(m.match_date)} {m.venue && `· ${m.venue}`}
            <br />
            <strong>
              {m.result?.hasResult
                ? `Team A ${m.result.teamA} – ${m.result.teamB} Team B`
                : 'Result pending'}
            </strong>
            <br />
            <span className="muted">
              Closes {new Date(m.rating_closes_at).toLocaleString()}
            </span>
          </span>
          <button className="small" onClick={() => openMatch(m)}>
            Rate
          </button>
        </div>
      ))}
    </div>
  )
}
