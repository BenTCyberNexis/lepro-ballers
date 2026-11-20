import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function MatchDetails({ matchId, onClose, isAdmin = false, onEdit }) {
  const [match, setMatch] = useState(null)
  const [squad, setSquad] = useState([])
  const [goals, setGoals] = useState([])
  const [top, setTop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')

      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('id, match_date, venue, status, rating_closes_at')
        .eq('id', matchId)
        .single()

      if (matchError) {
        if (active) {
          setError(matchError.message)
          setLoading(false)
        }
        return
      }

      const { data: playerData, error: playerError } = await supabase
        .from('match_players')
        .select('player_id, team, players(name)')
        .eq('match_id', matchId)

      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('id, scorer_id, assist_id')
        .eq('match_id', matchId)
        .order('created_at')

      const { data: ratingData } = await supabase
        .from('match_scores')
        .select('player_id, overall')
        .eq('match_id', matchId)
        .order('overall', { ascending: false })
        .limit(1)

      if (!active) return

      if (playerError || goalError) {
        setError(playerError?.message || goalError?.message)
        setLoading(false)
        return
      }

      setMatch(matchData)
      setSquad(
        (playerData || []).map((p) => ({
          id: p.player_id,
          team: p.team,
          name: p.players?.name || 'Player',
        }))
      )
      setGoals(goalData || [])
      setTop(ratingData?.[0] || null)
      setLoading(false)
    }

    load()

    return () => {
      active = false
    }
  }, [matchId])

  const byId = Object.fromEntries(squad.map((p) => [p.id, p]))
  const teamAGoals = goals.filter((g) => byId[g.scorer_id]?.team === 'A')
  const teamBGoals = goals.filter((g) => byId[g.scorer_id]?.team === 'B')

  return (
    <div className="match-modal-overlay" onClick={onClose}>
      <div
        className="match-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Match details"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="match-modal-header">
          <div>
            <span className="match-modal-kicker">LEPRO BALLERS</span>
            <h2>Match Centre</h2>
          </div>
          <button type="button" className="match-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {loading ? (
          <p className="muted">Loading match details...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <>
            <div className="match-modal-meta">
              <span>{match?.match_date}</span>
              {match?.venue && <span>📍 {match.venue}</span>}
              <span>{match?.status === 'open' ? 'Ratings open' : 'Match closed'}</span>
            </div>

            <div className="match-scoreboard">
              <div className="match-team team-orange">
                <span className="team-bib">A</span>
                <strong>TEAM A</strong>
                <small>Orange bibs</small>
              </div>

              <div className="match-final-score">
                <strong>{teamAGoals.length}</strong>
                <span>–</span>
                <strong>{teamBGoals.length}</strong>
                <small>FULL TIME</small>
              </div>

              <div className="match-team team-green">
                <span className="team-bib">B</span>
                <strong>TEAM B</strong>
                <small>Green bibs</small>
              </div>
            </div>

            {goals.length > 0 ? (
              <div className="match-goals">
                <h3>Goals & assists</h3>
                {goals.map((goal) => {
                  const scorer = byId[goal.scorer_id]
                  const assister = byId[goal.assist_id]

                  return (
                    <div className="match-goal-row" key={goal.id}>
                      <span>{scorer?.team === 'A' ? '🟠' : '🟢'}</span>
                      <div>
                        <strong>{scorer?.name || 'Unknown player'}</strong>
                        <small>
                          {assister ? `Assist: ${assister.name}` : 'Unassisted'}
                        </small>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="muted match-no-goals">No result has been entered yet.</p>
            )}

            <div className="match-squads">
              <div>
                <h3>Team A · Orange</h3>
                {squad.filter((p) => p.team === 'A').map((p) => (
                  <p key={p.id}>{p.name}</p>
                ))}
              </div>
              <div>
                <h3>Team B · Green</h3>
                {squad.filter((p) => p.team === 'B').map((p) => (
                  <p key={p.id}>{p.name}</p>
                ))}
              </div>
            </div>

            {top && (
              <p className="match-top-player">
                ⭐ Top rated: <strong>{byId[top.player_id]?.name || 'Player'}</strong>
                {' '}({Math.round(Number(top.overall))})
              </p>
            )}

            {isAdmin && onEdit && (
              <button
                type="button"
                className="match-edit-button"
                onClick={() => onEdit(matchId)}
              >
                Edit match result
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
