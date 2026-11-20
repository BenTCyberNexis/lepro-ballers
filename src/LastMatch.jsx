import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import MatchDetails from './MatchDetails'

export default function LastMatch() {
  const [info, setInfo] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [selectedMatchId, setSelectedMatchId] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: m } = await supabase
        .from('matches')
        .select('id, match_date, venue')
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
        .select('id, scorer_id, assist_id')
        .eq('match_id', match.id)
        .order('created_at')

      const { data: top } = await supabase
        .from('match_scores')
        .select('player_id, overall')
        .eq('match_id', match.id)
        .order('overall', { ascending: false })
        .limit(1)

      setInfo({ match, squad: mp || [], goals: g || [], top: top?.[0] || null })
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

  const { match, squad, goals, top } = info
  const byId = Object.fromEntries(
    squad.map((p) => [
      p.player_id,
      { name: p.players?.name ?? 'Player', team: p.team },
    ])
  )

  const teamGoals = (team) =>
    goals.filter((g) => byId[g.scorer_id]?.team === team).length

  return (
    <>
      <div className="section">
        <h2>Last match</h2>
        <p className="muted">
          {match.match_date} {match.venue && `· ${match.venue}`}
        </p>

        {goals.length === 0 ? (
          <p className="muted">Result not entered yet.</p>
        ) : (
          <>
            <p className="score">
              Team A {teamGoals('A')} – {teamGoals('B')} Team B
            </p>
            {goals.map((g) => (
              <div className="row" key={g.id}>
                <span>⚽ {byId[g.scorer_id]?.name ?? 'Player'}</span>
                <span className="muted">
                  {g.assist_id
                    ? 'assist: ' + (byId[g.assist_id]?.name ?? 'Player')
                    : ''}
                </span>
              </div>
            ))}
          </>
        )}

        {top ? (
          <p>
            ⭐ Top rated: <strong>{byId[top.player_id]?.name ?? 'Player'}</strong>{' '}
            <span className="muted">({Math.round(Number(top.overall))})</span>
          </p>
        ) : (
          <p className="muted">Ratings are still coming in.</p>
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
