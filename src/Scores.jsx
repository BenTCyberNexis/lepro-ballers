import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { formatMatchDate } from './dateUtils'
import MatchDetails from './MatchDetails'
import Avatar from './Avatar'
import { avatarUrl } from './avatar'
import PhotoLightbox from './PhotoLightbox'

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
  const [selectedMatchId, setSelectedMatchId] = useState(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState(null)
  const [avatars, setAvatars] = useState({})
  const [viewPhoto, setViewPhoto] = useState(false)

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

      const { data: pl } = await supabase.from('players').select('id, avatar_path')
      setAvatars(Object.fromEntries((pl || []).map((x) => [x.id, x.avatar_path])))

      const { data: h } = await supabase
        .from('match_scores')
        .select('*')
        .eq('player_id', selectedPlayerId || userId)
      const { data: m } = await supabase
        .from('matches')
        .select('id, match_date, venue, result_entered')

      const matchIds = (h || []).map((r) => r.match_id)

      const { data: squads } = matchIds.length
        ? await supabase
            .from('match_players')
            .select('match_id, player_id, team')
            .in('match_id', matchIds)
        : { data: [] }

      const { data: goals } = matchIds.length
        ? await supabase
            .from('goals')
            .select('match_id, scorer_id, is_own_goal')
            .in('match_id', matchIds)
        : { data: [] }

      const byId = Object.fromEntries((m || []).map((x) => [x.id, x]))
      const playerTeams = {}

      ;(squads || []).forEach((player) => {
        playerTeams[`${player.match_id}:${player.player_id}`] = player.team
      })

      const results = {}
      matchIds.forEach((id) => {
        results[id] = { teamA: 0, teamB: 0, hasResult: Boolean(byId[id]?.result_entered) }
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

      const myTeams = {}
      ;(squads || []).forEach((player) => {
        if (player.player_id === (selectedPlayerId || userId)) myTeams[player.match_id] = player.team
      })

      setHistory(
        (h || [])
          .map((r) => ({
            ...r,
            match: byId[r.match_id],
            result: results[r.match_id],
            myTeam: myTeams[r.match_id],
          }))
          .sort((a, b) =>
            (b.match?.match_date || '').localeCompare(a.match?.match_date || '')
          )
      )
    }
    load()
    const timer = setInterval(load, 10000)
    return () => clearInterval(timer)
  }, [userId, selectedPlayerId])

  const activePlayerId = selectedPlayerId || userId
  const mine = stats.find((s) => s.player_id === activePlayerId)
  const num = (v) => Math.round(Number(v))
  const photoUrl = avatarUrl(avatars[activePlayerId])
  const lightbox =
    viewPhoto && photoUrl ? (
      <PhotoLightbox
        url={photoUrl}
        name={mine?.name || 'Player'}
        onClose={() => setViewPhoto(false)}
      />
    ) : null
  const noRating = (
    <p className="muted">
      No rating yet. Your card appears once enough players have rated you.
    </p>
  )

  const lastFive = history
    .filter((r) => r.result?.hasResult && r.myTeam)
    .slice(0, 5)
    .map((r) => {
      const draw = r.result.teamA === r.result.teamB
      const won =
        (r.myTeam === 'A' && r.result.teamA > r.result.teamB) ||
        (r.myTeam === 'B' && r.result.teamB > r.result.teamA)

      return {
        ...r,
        form: draw ? 'D' : won ? 'W' : 'L',
        winner: draw ? 'draw' : r.result.teamA > r.result.teamB ? 'A' : 'B',
      }
    })

  if (show === 'table' && !selectedPlayerId) {
    return (
      <div className="section">
        <h2>Leaderboard</h2>
        {error && <p className="error">{error}</p>}
        {stats.length === 0 && <p className="muted">No ranked players yet.</p>}
        {stats.map((s, i) => (
          <div className={'row' + (s.player_id === userId ? ' me' : '')} key={s.player_id}>
            <span>
              {i + 1}.{' '}
              <button
                type="button"
                className="small"
                onClick={() => setSelectedPlayerId(s.player_id)}
              >
                {s.name}
              </button>
            </span>
            <strong>{num(s.overall)}</strong>
          </div>
        ))}
      </div>
    )
  }

  if (show === 'card') {
    const short = {
      passing: 'PAS',
      shooting: 'SHO',
      defending: 'DEF',
      dribbling: 'DRI',
      work_rate: 'WRK',
      teamwork: 'TEA',
    }
    return (
      <div className="section">
        <h2>My card</h2>
        {error && <p className="error">{error}</p>}
        {!mine ? (
          noRating
        ) : (
          <div className="fut-wrap">
            <div className="fut">
              <div className="fut-main">
                <div className="fut-left">
                  <div className="fut-rating">{num(mine.overall)}</div>
                  <div className="fut-pos">OVR</div>
                  <div className="fut-sep" />
                  <div className="fut-ball">⚽</div>
                </div>
                {photoUrl ? (
                  <button
                    type="button"
                    className="fut-photo"
                    onClick={() => setViewPhoto(true)}
                    aria-label="View full photo"
                  >
                    <img src={photoUrl} alt={mine.name} />
                  </button>
                ) : (
                  <div className="fut-photo fut-photo-empty">
                    <Avatar path={null} name={mine.name} size={110} />
                  </div>
                )}
              </div>
              <div className="fut-nameplate">{mine.name}</div>
              <div className="fut-stats2">
                {CATS.map(([key]) => (
                  <div className="fut-s" key={key}>
                    <b>{num(mine[key])}</b>
                    <span>{short[key]}</span>
                  </div>
                ))}
              </div>
              {lastFive.length > 0 && (
                <div className="fut-form">
                  <span>FORM</span>
                  {lastFive.map((r) => (
                    <span
                      key={r.match_id}
                      className={'fut-chip ' + r.form}
                      title={(formatMatchDate(r.match?.match_date) || 'Match') + ': ' + r.form}
                    >
                      {r.form}
                    </span>
                  ))}
                </div>
              )}
              <div className="fut-sub">
                Based on {mine.matches_rated} match{mine.matches_rated > 1 ? 'es' : ''}
              </div>
            </div>
          </div>
        )}
        {lightbox}
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
      {selectedPlayerId && (
        <button
          type="button"
          className="small"
          onClick={() => setSelectedPlayerId(null)}
        >
          ← Back to leaderboard
        </button>
      )}
      <h2>{selectedPlayerId ? `${mine?.name || 'Player'}'s Performance` : 'My ratings'}</h2>
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

          <div style={{ margin: '20px 0' }}>
            <h2>FORM</h2>
            {lastFive.length === 0 ? (
              <p className="muted">No completed matches with results yet.</p>
            ) : (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {lastFive.map((r) => (
                  <span
                    key={r.match_id}
                    title={`${formatMatchDate(r.match?.match_date) || 'Match'}: ${r.form}`}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      color: '#fff',
                      backgroundColor:
                        r.form === 'W'
                          ? '#16a34a'
                          : r.form === 'D'
                            ? '#2563eb'
                            : '#dc2626',
                    }}
                  >
                    {r.form}
                  </span>
                ))}
              </div>
            )}
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
                  {formatMatchDate(r.match?.match_date)} {r.match?.venue && `· ${r.match.venue}`}
                  <br />
                  <strong>
                    {r.result?.hasResult
                      ? `Team A ${r.result.teamA} – ${r.result.teamB} Team B`
                      : 'Result pending'}
                  </strong>
                  {r.result?.hasResult && r.myTeam && (
                    <span className="muted">
                      {' · '}
                      {r.result.teamA === r.result.teamB
                        ? 'Draw (D)'
                        : (r.myTeam === 'A' && r.result.teamA > r.result.teamB) ||
                            (r.myTeam === 'B' && r.result.teamB > r.result.teamA)
                          ? 'Win (W)'
                          : 'Loss (L)'}
                    </span>
                  )}
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
              <button
                type="button"
                className="small"
                onClick={() => setSelectedMatchId(r.match_id)}
              >
                View match details →
              </button>
            </div>
          ))}
        </>
      )}

      {lightbox}
      {selectedMatchId && (
        <MatchDetails
          matchId={selectedMatchId}
          onClose={() => setSelectedMatchId(null)}
        />
      )}
    </div>
  )
}
