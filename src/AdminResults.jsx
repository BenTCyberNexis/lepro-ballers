import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { formatMatchDate } from './dateUtils'

export default function AdminResults() {
  const [matches, setMatches] = useState([])
  const [matchId, setMatchId] = useState('')
  const [squad, setSquad] = useState([])
  const [goals, setGoals] = useState([])
  const [scorer, setScorer] = useState('')
  const [assist, setAssist] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('matches')
      .select('id, match_date, venue')
      .order('match_date', { ascending: false })
      .then(({ data }) => setMatches(data || []))
  }, [])

  async function loadMatch(id) {
    setError('')
    setScorer('')
    setAssist('')
    if (!id) {
      setSquad([])
      setGoals([])
      return
    }
    const { data: mp } = await supabase
      .from('match_players')
      .select('player_id, team, players(name)')
      .eq('match_id', id)
    setSquad(
      (mp || [])
        .map((r) => ({ id: r.player_id, team: r.team, name: r.players?.name ?? 'Player' }))
        .sort((a, b) => a.team.localeCompare(b.team) || a.name.localeCompare(b.name))
    )
    const { data: g } = await supabase
      .from('goals')
      .select('id, scorer_id, assist_id')
      .eq('match_id', id)
      .order('created_at')
    setGoals(g || [])
  }

  function pickMatch(id) {
    setMatchId(id)
    loadMatch(id)
  }

  async function addGoal() {
    setError('')
    if (!scorer) {
      setError('Choose who scored')
      return
    }
    const { error } = await supabase.from('goals').insert({
      match_id: Number(matchId),
      scorer_id: scorer,
      assist_id: assist || null,
    })
    if (error) {
      setError(
        error.message.includes('check')
          ? 'The scorer and the assist must be different players'
          : error.message
      )
      return
    }
    setScorer('')
    setAssist('')
    loadMatch(matchId)
  }

  async function removeGoal(id) {
    setError('')
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) setError(error.message)
    else loadMatch(matchId)
  }

  const byId = Object.fromEntries(squad.map((p) => [p.id, p]))
  const teamGoals = (t) => goals.filter((g) => byId[g.scorer_id]?.team === t).length

  return (
    <div className="section">
      <h2>Match results</h2>
      <select value={matchId} onChange={(e) => pickMatch(e.target.value)}>
        <option value="">Choose a match</option>
        {matches.map((m) => (
          <option key={m.id} value={m.id}>
            {formatMatchDate(m.match_date)} {m.venue ? '· ' + m.venue : ''}
          </option>
        ))}
      </select>

      {matchId && (
        <>
          <p>
            <strong>
              Team A {teamGoals('A')} – {teamGoals('B')} Team B
            </strong>
          </p>

          {goals.length === 0 && <p className="muted">No goals recorded yet.</p>}
          {goals.map((g) => (
            <div className="row" key={g.id}>
              <span>
                ⚽ {byId[g.scorer_id]?.name ?? 'Player'}{' '}
                <span className="muted">
                  (Team {byId[g.scorer_id]?.team}
                  {g.assist_id ? ' · assist: ' + (byId[g.assist_id]?.name ?? 'Player') : ''})
                </span>
              </span>
              <button className="small" onClick={() => removeGoal(g.id)}>
                Remove
              </button>
            </div>
          ))}

          <h2>Add a goal</h2>
          <label className="muted">Scorer</label>
          <select value={scorer} onChange={(e) => setScorer(e.target.value)}>
            <option value="">Choose scorer</option>
            {squad.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (Team {p.team})
              </option>
            ))}
          </select>
          <label className="muted">Assist (optional)</label>
          <select value={assist} onChange={(e) => setAssist(e.target.value)}>
            <option value="">No assist</option>
            {squad.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (Team {p.team})
              </option>
            ))}
          </select>
          {error && <p className="error">{error}</p>}
          <button onClick={addGoal}>Add goal</button>
        </>
      )}
    </div>
  )
}
