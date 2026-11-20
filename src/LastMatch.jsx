import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { formatMatchDate } from './dateUtils'
import MatchDetails from './MatchDetails'

export default function LastMatch() {
  const [info, setInfo] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [selectedMatchId, setSelectedMatchId] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: m } = await supabase
        .from('matches')
        .select('id, match_date, venue, result_entered')
        .order('match_date', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)

      const match = m?.[0]
      if (!match) {
        setInfo(null)
        setLoaded(true)
        return
      }

      const { data: mp } = await supabase
        .from('match_players')
        .select('player_id, team, players(name)')
        .eq('match_id', match.id)

      const { data: g } = await supabase
        .from('goals')
        .select('id, scorer_id, assist_id, is_own_goal')
        .eq('match_id', match.id)
        .order('created_at')

      setInfo({ match, squad: mp || [], goals: g || [] })
      setLoaded(true)
    }

    load()
    const timer = setInterval(load, 10000)
    return () => clearInterval(timer)
  }, [])

  if (!loaded) return null

  if (!info) {
    return (
      <div className="section">
        <h2>Last match</h2>
        <p className="muted">No matches yet.</p>
      </div>
    )
  }

  const { match, squad, goals } = info
  const byId = Object.fromEntries(
    squad.map((p) => [
      p.player_id,
      { name: p.players?.name ?? 'Player', team: p.team },
    ])
  )

  const creditedTeam = (goal) => {
    const scorerTeam = byId[goal.scorer_id]?.team
    if (!scorerTeam) return null
    return goal.is_own_goal
      ? (scorerTeam === 'A' ? 'B' : 'A')
      : scorerTeam
  }

  const teamAGoals = goals.filter((g) => creditedTeam(g) === 'A').length
  const teamBGoals = goals.filter((g) => creditedTeam(g) === 'B').length

  return (
    <>
      <div className="section">
        <h2>Last match</h2>
        <p className="muted">
          {formatMatchDate(match.match_date)} {match.venue && `· ${match.venue}`}
        </p>

        {match.result_entered ? (
          <p className="score">
            Team A {teamAGoals} – {teamBGoals} Team B
          </p>
        ) : (
          <p className="muted">Result not entered yet.</p>
        )}

        <button
          type="button"
          className="small"
          onClick={() => setSelectedMatchId(match.id)}
        >
          View full match details →
        </button>
      </div>

      {selectedMatchId && (
        <MatchDetails
          matchId={selectedMatchId}
          onClose={() => setSelectedMatchId(null)}
        />
      )}
    </>
  )
}
