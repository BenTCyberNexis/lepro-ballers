import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { formatMatchDate } from './dateUtils'
import MatchDetails from './MatchDetails'

const pad = (n) => String(n).padStart(2, '0')
const toLocalInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

const emptyGoal = (team) => ({
  id: null,
  team,
  scorer_id: '',
  assist_id: '',
  is_own_goal: false,
})

export default function AdminMatches() {
  const [players, setPlayers] = useState([])
  const [matches, setMatches] = useState([])
  const [date, setDate] = useState(toLocalInput(new Date()).slice(0, 10))
  const [venue, setVenue] = useState('')
  const [closesAt, setClosesAt] = useState(
    toLocalInput(new Date(Date.now() + 24 * 60 * 60 * 1000))
  )
  const [teamA, setTeamA] = useState([])
  const [teamB, setTeamB] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [resultSquad, setResultSquad] = useState([])
  const [scoreA, setScoreA] = useState('0')
  const [scoreB, setScoreB] = useState('0')
  const [goalEntries, setGoalEntries] = useState([])
  const [resultLoading, setResultLoading] = useState(false)
  const [resultSaving, setResultSaving] = useState(false)
  const [detailsMatchId, setDetailsMatchId] = useState(null)
  const [openMatchMenu, setOpenMatchMenu] = useState(null)

  useEffect(() => {
    if (openMatchMenu === null) return

    function handleOutsideClick(event) {
      if (!event.target.closest('.player-menu-wrap')) {
        setOpenMatchMenu(null)
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick)
    return () => document.removeEventListener('pointerdown', handleOutsideClick)
  }, [openMatchMenu])

  async function load() {
    const { data: p } = await supabase
      .from('players')
      .select('id, name, username')
      .eq('status', 'approved')
      .order('name')
    setPlayers(p || [])

    const { data: m } = await supabase
      .from('matches')
      .select('id, match_date, venue, status, rating_closes_at, result_entered')
      .order('match_date', { ascending: false })

    const matchList = m || []

    if (matchList.length === 0) {
      setMatches([])
      return
    }

    const matchIds = matchList.map((match) => match.id)

    const { data: squads } = await supabase
      .from('match_players')
      .select('match_id, player_id, team')
      .in('match_id', matchIds)

    const { data: goals } = await supabase
      .from('goals')
      .select('match_id, scorer_id, is_own_goal')
      .in('match_id', matchIds)

    const playerTeams = {}
    ;(squads || []).forEach((player) => {
      playerTeams[`${player.match_id}:${player.player_id}`] = player.team
    })

    const results = {}
    matchList.forEach((match) => {
      results[match.id] = { teamA: 0, teamB: 0, hasResult: Boolean(match.result_entered) }
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

    setMatches(
      matchList.map((match) => ({
        ...match,
        result: results[match.id],
      }))
    )
  }

  useEffect(() => {
    load()
  }, [])

  const toggle = (list, setList, id) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  function resizeGoals(team, value) {
    const count = Math.max(0, Math.min(99, Number(value) || 0))

    if (team === 'A') setScoreA(String(count))
    else setScoreB(String(count))

    setGoalEntries((previous) => {
      const currentTeamGoals = previous.filter((g) => g.team === team)
      const otherTeamGoals = previous.filter((g) => g.team !== team)

      const resized = Array.from({ length: count }, (_, index) =>
        currentTeamGoals[index] || emptyGoal(team)
      )

      return team === 'A'
        ? [...resized, ...otherTeamGoals]
        : [...otherTeamGoals, ...resized]
    })
  }

  function updateGoal(index, field, value) {
    setGoalEntries((previous) =>
      previous.map((goal, i) =>
        i === index ? { ...goal, [field]: value } : goal
      )
    )
  }

  async function openResults(id) {
    setSelectedMatchId(String(id))
    setError('')
    setResultLoading(true)
    setGoalEntries([])
    setResultSquad([])

    const { data: mp, error: squadError } = await supabase
      .from('match_players')
      .select('player_id, team, players(name)')
      .eq('match_id', id)

    if (squadError) {
      setError(squadError.message)
      setResultLoading(false)
      return
    }

    const squad = (mp || [])
      .map((r) => ({
        id: r.player_id,
        team: r.team,
        name: r.players?.name ?? 'Player',
      }))
      .sort((a, b) => a.team.localeCompare(b.team) || a.name.localeCompare(b.name))

    setResultSquad(squad)

    const { data: g, error: goalError } = await supabase
      .from('goals')
      .select('id, scorer_id, assist_id, is_own_goal')
      .eq('match_id', id)
      .order('created_at')

    if (goalError) {
      setError(goalError.message)
      setResultLoading(false)
      return
    }

    const teamByPlayer = Object.fromEntries(
      squad.map((player) => [player.id, player.team])
    )

    const existingGoals = (g || []).map((goal) => ({
      id: goal.id,
      team: goal.is_own_goal
        ? (teamByPlayer[goal.scorer_id] === 'A' ? 'B' : 'A')
        : (teamByPlayer[goal.scorer_id] || 'A'),
      scorer_id: goal.scorer_id,
      assist_id: goal.assist_id || '',
      is_own_goal: goal.is_own_goal || false,
    }))

    const aGoals = existingGoals.filter((goal) => goal.team === 'A')
    const bGoals = existingGoals.filter((goal) => goal.team === 'B')

    setScoreA(String(aGoals.length))
    setScoreB(String(bGoals.length))
    setGoalEntries([...aGoals, ...bGoals])
    setResultLoading(false)
  }

  async function createMatch(e) {
    e.preventDefault()
    setError('')

    if (teamA.length === 0 || teamB.length === 0) {
      setError('Pick at least one player for each team')
      return
    }

    setSaving(true)
    const { data: u } = await supabase.auth.getUser()

    if (!u.user) {
      setError('You must be logged in to create a match')
      setSaving(false)
      return
    }

    const { data: match, error: e1 } = await supabase
      .from('matches')
      .insert({
        match_date: date,
        venue: venue.trim() || null,
        rating_closes_at: new Date(closesAt).toISOString(),
        created_by: u.user.id,
      })
      .select()
      .single()

    if (e1) {
      setError(e1.message)
      setSaving(false)
      return
    }

    const rows = [
      ...teamA.map((player_id) => ({ match_id: match.id, player_id, team: 'A' })),
      ...teamB.map((player_id) => ({ match_id: match.id, player_id, team: 'B' })),
    ]

    const { error: e2 } = await supabase.from('match_players').insert(rows)

    if (e2) {
      await supabase.from('matches').delete().eq('id', match.id)
      setError(e2.message)
      setSaving(false)
      return
    }

    setTeamA([])
    setTeamB([])
    setVenue('')
    setSaving(false)

    await load()
    await openResults(match.id)
  }

  async function saveMatchWithResult(e) {
    e.preventDefault()
    setError('')

    if (teamA.length === 0 || teamB.length === 0) {
      setError('Pick at least one player for each team')
      return
    }

    const newSquad = [
      ...players.filter((p) => teamA.includes(p.id)).map((p) => ({ ...p, team: 'A' })),
      ...players.filter((p) => teamB.includes(p.id)).map((p) => ({ ...p, team: 'B' })),
    ]

    const incomplete = goalEntries.findIndex((goal) => !goal.scorer_id)
    if (incomplete !== -1) {
      setError(`Please select the scorer for ${goalEntries[incomplete].team === 'A' ? 'Team A' : 'Team B'} goal ${goalEntries.filter((g, i) => g.team === goalEntries[incomplete].team && i <= incomplete).length}.`)
      return
    }

    for (const goal of goalEntries) {
      const scorer = newSquad.find((p) => p.id === goal.scorer_id)
      const assister = newSquad.find((p) => p.id === goal.assist_id)

      const expectedScorerTeam = goal.is_own_goal
        ? (goal.team === 'A' ? 'B' : 'A')
        : goal.team

      if (!scorer || scorer.team !== expectedScorerTeam) {
        setError('The scorer must belong to the correct team.')
        return
      }

      if (goal.is_own_goal && goal.assist_id) {
        setError('Own goals cannot have an assist.')
        return
      }

      if (goal.assist_id && (!assister || assister.team !== goal.team)) {
        setError('The assister must belong to the same team as the scorer.')
        return
      }

      if (goal.assist_id && goal.assist_id === goal.scorer_id) {
        setError('The scorer and assister must be different players.')
        return
      }
    }

    setSaving(true)

    const { data: u } = await supabase.auth.getUser()

    if (!u.user) {
      setError('You must be logged in to create a match')
      setSaving(false)
      return
    }

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        match_date: date,
        venue: venue.trim() || null,
        rating_closes_at: new Date(closesAt).toISOString(),
        created_by: u.user.id,
      })
      .select()
      .single()

    if (matchError) {
      setError(matchError.message)
      setSaving(false)
      return
    }

    const rollback = async () => {
      await supabase.from('goals').delete().eq('match_id', match.id)
      await supabase.from('match_players').delete().eq('match_id', match.id)
      await supabase.from('matches').delete().eq('id', match.id)
    }

    const squadRows = [
      ...teamA.map((player_id) => ({ match_id: match.id, player_id, team: 'A' })),
      ...teamB.map((player_id) => ({ match_id: match.id, player_id, team: 'B' })),
    ]

    const { error: squadError } = await supabase
      .from('match_players')
      .insert(squadRows)

    if (squadError) {
      await rollback()
      setError(squadError.message)
      setSaving(false)
      return
    }

    if (goalEntries.length > 0) {
      const goalRows = goalEntries.map((goal) => ({
        match_id: match.id,
        scorer_id: goal.scorer_id,
        assist_id: goal.is_own_goal ? null : (goal.assist_id || null),
        is_own_goal: Boolean(goal.is_own_goal),
      }))

      const { error: goalsError } = await supabase
        .from('goals')
        .insert(goalRows)

      if (goalsError) {
        await rollback()
        setError(goalsError.message)
        setSaving(false)
        return
      }
    }

    const { error: resultError } = await supabase
      .from('matches')
      .update({ result_entered: true })
      .eq('id', match.id)

    if (resultError) {
      await rollback()
      setError(resultError.message)
      setSaving(false)
      return
    }

    setTeamA([])
    setTeamB([])
    setGoalEntries([])
    setScoreA('0')
    setScoreB('0')
    setVenue('')
    setSaving(false)
    setShowCreateForm(false)
    await load()
    setError('Match saved successfully.')
  }

  async function saveResult() {
    setError('')

    const incomplete = goalEntries.findIndex((goal) => !goal.scorer_id)
    if (incomplete !== -1) {
      setError(`Please select the scorer for ${goalEntries[incomplete].team === 'A' ? 'Team A' : 'Team B'} goal ${goalEntries.filter((g, i) => g.team === goalEntries[incomplete].team && i <= incomplete).length}.`)
      return
    }

    for (const goal of goalEntries) {
      const scorer = resultSquad.find((p) => p.id === goal.scorer_id)
      const assister = resultSquad.find((p) => p.id === goal.assist_id)

      const expectedScorerTeam = goal.is_own_goal
        ? (goal.team === 'A' ? 'B' : 'A')
        : goal.team

      if (!scorer || scorer.team !== expectedScorerTeam) {
        setError('The scorer must belong to the correct team.')
        return
      }

      if (goal.is_own_goal && goal.assist_id) {
        setError('Own goals cannot have an assist.')
        return
      }

      if (goal.assist_id && (!assister || assister.team !== goal.team)) {
        setError('The assister must belong to the same team as the scorer.')
        return
      }

      if (goal.assist_id && goal.assist_id === goal.scorer_id) {
        setError('The scorer and assister must be different players.')
        return
      }
    }

    setResultSaving(true)

    const savedIds = []

    for (const goal of goalEntries) {
      const values = {
        match_id: Number(selectedMatchId),
        scorer_id: goal.scorer_id,
        assist_id: goal.is_own_goal ? null : (goal.assist_id || null),
        is_own_goal: Boolean(goal.is_own_goal),
      }

      if (goal.id) {
        const { error } = await supabase
          .from('goals')
          .update(values)
          .eq('id', goal.id)

        if (error) {
          setError(error.message)
          setResultSaving(false)
          return
        }

        savedIds.push(goal.id)
      } else {
        const { data, error } = await supabase
          .from('goals')
          .insert(values)
          .select('id')
          .single()

        if (error) {
          setError(error.message)
          setResultSaving(false)
          return
        }

        savedIds.push(data.id)
      }
    }

    const { data: oldGoals, error: oldGoalsError } = await supabase
      .from('goals')
      .select('id')
      .eq('match_id', Number(selectedMatchId))

    if (oldGoalsError) {
      setError(oldGoalsError.message)
      setResultSaving(false)
      return
    }

    const removedIds = (oldGoals || [])
      .map((goal) => goal.id)
      .filter((id) => !savedIds.includes(id))

    if (removedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('goals')
        .delete()
        .in('id', removedIds)

      if (deleteError) {
        setError(deleteError.message)
        setResultSaving(false)
        return
      }
    }

    const { error: matchUpdateError } = await supabase
      .from('matches')
      .update({ result_entered: true })
      .eq('id', Number(selectedMatchId))

    if (matchUpdateError) {
      setError(matchUpdateError.message)
      setResultSaving(false)
      return
    }

    setResultSaving(false)
    await load()
    await openResults(selectedMatchId)
    setError('Result saved successfully.')
  }

  async function closeMatch(id) {
    setError('')
    const { error } = await supabase
      .from('matches')
      .update({ status: 'closed' })
      .eq('id', id)

    if (error) setError(error.message)
    else load()
  }

  async function deleteMatch(id) {
    const match = matches.find((m) => String(m.id) === String(id))
    const confirmed = window.confirm(
      `Permanently delete this match${match?.venue ? ` at ${match.venue}` : ''}? This will also delete all player ratings, goals, and squad records. This cannot be undone.`
    )

    if (!confirmed) return

    setError('')

    for (const table of ['ratings', 'goals', 'match_players']) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('match_id', id)

      if (error) {
        setError(`Could not delete ${table}: ${error.message}`)
        return
      }
    }

    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', id)

    if (error) {
      setError(`Could not delete match: ${error.message}`)
      return
    }

    if (String(selectedMatchId) === String(id)) {
      setSelectedMatchId(null)
      setResultSquad([])
      setGoalEntries([])
    }
    if (String(detailsMatchId) === String(id)) setDetailsMatchId(null)

    await load()
    setError('Match and all associated records deleted successfully.')
  }

  const byId = Object.fromEntries(resultSquad.map((p) => [p.id, p]))
  const createSquad = [
    ...players.filter((p) => teamA.includes(p.id)).map((p) => ({ ...p, team: 'A' })),
    ...players.filter((p) => teamB.includes(p.id)).map((p) => ({ ...p, team: 'B' })),
  ]
  const createById = Object.fromEntries(createSquad.map((p) => [p.id, p]))

  const selectedMatch = matches.find(
    (m) => String(m.id) === String(selectedMatchId)
  )

  return (
    <div className="section">
      <button
        type="button"
        className="primary"
        onClick={() => setShowCreateForm((visible) => !visible)}
      >
        {showCreateForm ? 'Cancel' : '+ Create Match'}
      </button>

      {showCreateForm && (
      <div className="section">
      <h2>Create match</h2>

      <form onSubmit={saveMatchWithResult}>
        <label className="muted">Match date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <input
          placeholder="Venue"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
        />

        <label className="muted">Ratings close at</label>
        <input
          type="datetime-local"
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
          required
        />

        <h2>Team A ({teamA.length})</h2>
        {players
          .filter((p) => !teamB.includes(p.id))
          .map((p) => (
            <label className="row pick" key={p.id}>
              <span>{p.name}</span>
              <input
                type="checkbox"
                checked={teamA.includes(p.id)}
                onChange={() => toggle(teamA, setTeamA, p.id)}
              />
            </label>
          ))}

        <h2>Team B ({teamB.length})</h2>
        {players
          .filter((p) => !teamA.includes(p.id))
          .map((p) => (
            <label className="row pick" key={p.id}>
              <span>{p.name}</span>
              <input
                type="checkbox"
                checked={teamB.includes(p.id)}
                onChange={() => toggle(teamB, setTeamB, p.id)}
              />
            </label>
          ))}

        <h2>Final score</h2>
        <div className="row">
          <label>
            <strong>Team A</strong>
            <input
              type="number"
              min="0"
              max="99"
              value={scoreA}
              onChange={(e) => resizeGoals('A', e.target.value)}
            />
          </label>
          <label>
            <strong>Team B</strong>
            <input
              type="number"
              min="0"
              max="99"
              value={scoreB}
              onChange={(e) => resizeGoals('B', e.target.value)}
            />
          </label>
        </div>

        <h2>Goal details</h2>
        <p className="muted">Select the scorer for every goal. Assists are optional.</p>

        {goalEntries.map((goal, index) => {
          const scorerTeam = goal.is_own_goal
            ? (goal.team === 'A' ? 'B' : 'A')
            : goal.team
          const teamPlayers = createSquad.filter((p) => p.team === scorerTeam)
          const teamGoalNumber = goalEntries
            .slice(0, index + 1)
            .filter((g) => g.team === goal.team).length

          return (
            <div className="section" key={`create-${goal.team}-${teamGoalNumber}`}>
              <h3>Team {goal.team} · Goal {teamGoalNumber}</h3>

              <label className="row pick">
                <span>Own goal</span>
                <input
                  type="checkbox"
                  checked={Boolean(goal.is_own_goal)}
                  onChange={(e) => {
                    updateGoal(index, 'is_own_goal', e.target.checked)
                    if (e.target.checked) updateGoal(index, 'assist_id', '')
                  }}
                />
              </label>

              <label className="muted">
                Who scored? {goal.is_own_goal ? '(opposing player)' : ''}
              </label>
              <select
                value={goal.scorer_id}
                onChange={(e) => updateGoal(index, 'scorer_id', e.target.value)}
              >
                <option value="">Choose goal scorer</option>
                {teamPlayers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {!goal.is_own_goal && (
                <>
                  <label className="muted">Who assisted? (Optional)</label>
                  <select
                    value={goal.assist_id}
                    onChange={(e) => updateGoal(index, 'assist_id', e.target.value)}
                  >
                    <option value="">No assist</option>
                    {teamPlayers
                      .filter((p) => p.id !== goal.scorer_id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </select>
                </>
              )}
            </div>
          )
        })}

        <h3>Result preview</h3>
        <p><strong>Team A {scoreA || 0} – {scoreB || 0} Team B</strong></p>
        {goalEntries.map((goal, index) => (
          <p key={`create-preview-${index}`}>
            ⚽ Team {goal.team}:{' '}
            <strong style={{ color: goal.is_own_goal ? '#ef4444' : '#ffffff' }}>
              {createById[goal.scorer_id]?.name || 'Scorer not selected'}
              {goal.is_own_goal && ' (OG)'}
            </strong>
            {!goal.is_own_goal && (
              goal.assist_id
                ? ` · Assist: ${createById[goal.assist_id]?.name || 'Unknown'}`
                : ' · No assist'
            )}
          </p>
        ))}

        {error && !selectedMatchId && <p className="error">{error}</p>}

        <button disabled={saving}>
          {saving ? 'Saving match...' : 'Save Match'}
        </button>
      </form>
      </div>
      )}

      {selectedMatchId && (
        <div className="section">
          <h2>
            Enter match result
            {selectedMatch && ` · ${formatMatchDate(selectedMatch.match_date)}`}
          </h2>

          {selectedMatch?.venue && (
            <p className="muted">{selectedMatch.venue}</p>
          )}

          {resultLoading ? (
            <p className="muted">Loading match players and goals...</p>
          ) : (
            <>
              <h3>What was the final score?</h3>

              <div className="row">
                <label>
                  <strong>Team A</strong>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={scoreA}
                    onChange={(e) => resizeGoals('A', e.target.value)}
                  />
                </label>

                <label>
                  <strong>Team B</strong>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={scoreB}
                    onChange={(e) => resizeGoals('B', e.target.value)}
                  />
                </label>
              </div>

              <h3>Goal details</h3>
              <p className="muted">
                Select the scorer for every goal. Assists are optional.
              </p>

              {goalEntries.length === 0 && (
                <p className="muted">No goals entered. Set the score above.</p>
              )}

              {goalEntries.map((goal, index) => {
                const scorerTeam = goal.is_own_goal
                  ? (goal.team === 'A' ? 'B' : 'A')
                  : goal.team

                const teamPlayers = resultSquad.filter(
                  (p) => p.team === scorerTeam
                )

                const teamGoalNumber =
                  goalEntries
                    .slice(0, index + 1)
                    .filter((g) => g.team === goal.team).length

                return (
                  <div className="section" key={`${goal.team}-${teamGoalNumber}`}>
                    <h3>
                      Team {goal.team} · Goal {teamGoalNumber}
                    </h3>

                    <label className="row pick">
                      <span>Own goal</span>
                      <input
                        type="checkbox"
                        checked={Boolean(goal.is_own_goal)}
                        onChange={(e) => {
                          updateGoal(index, 'is_own_goal', e.target.checked)
                          if (e.target.checked) {
                            updateGoal(index, 'assist_id', '')
                          }
                        }}
                      />
                    </label>

                    <label className="muted">
                      Who scored? {goal.is_own_goal ? '(opposing player)' : ''}
                    </label>
                    <select
                      value={goal.scorer_id}
                      onChange={(e) =>
                        updateGoal(index, 'scorer_id', e.target.value)
                      }
                    >
                      <option value="">Choose goal scorer</option>
                      {teamPlayers.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>

                    {!goal.is_own_goal && (
                    <>
                    <label className="muted">Who assisted? (Optional)</label>
                    <select
                      value={goal.assist_id}
                      onChange={(e) =>
                        updateGoal(index, 'assist_id', e.target.value)
                      }
                    >
                      <option value="">No assist</option>
                      {teamPlayers
                        .filter((p) => p.id !== goal.scorer_id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    </>
                    )}
                  </div>
                )
              })}

              <h3>Result preview</h3>
              <p>
                <strong>Team A {scoreA || 0} – {scoreB || 0} Team B</strong>
              </p>

              {goalEntries.length > 0 && (
                <div>
                  {goalEntries.map((goal, index) => (
                    <p key={`${goal.team}-preview-${index}`}>
                      ⚽ Team {goal.team}:{' '}
                      <strong style={{ color: goal.is_own_goal ? '#ef4444' : '#ffffff' }}>
                        {byId[goal.scorer_id]?.name || 'Scorer not selected'}
                        {goal.is_own_goal && ' (OG)'}
                      </strong>
                      {!goal.is_own_goal && (
                        goal.assist_id
                          ? ` · Assist: ${byId[goal.assist_id]?.name || 'Unknown'}`
                          : ' · No assist'
                      )}
                    </p>
                  ))}
                </div>
              )}

              {error && <p className={error === 'Result saved successfully.' ? 'success' : 'error'}>{error}</p>}

              <button
                type="button"
                onClick={saveResult}
                disabled={resultSaving}
              >
                {resultSaving ? 'Saving result...' : 'Confirm and save result'}
              </button>

              <button
                type="button"
                className="small"
                onClick={() => setSelectedMatchId('')}
              >
                Done
              </button>
            </>
          )}
        </div>
      )}

      <h2>Matches ({matches.length})</h2>

      {matches.length === 0 && (
        <p className="muted">No matches yet.</p>
      )}

      {matches.map((m) => (
        <div className="row match-admin-row" key={m.id}>
          <div
            className="match-admin-summary"
            role="button"
            tabIndex={0}
            onClick={() => setDetailsMatchId(m.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setDetailsMatchId(m.id)
              }
            }}
          >
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
                {m.status === 'open'
                  ? 'Open until ' + new Date(m.rating_closes_at).toLocaleString()
                  : 'Closed'}
              </span>
            </span>
          </div>

          <div className="player-menu-wrap">
            <button
              type="button"
              className="player-menu-trigger"
              aria-label={`Actions for match ${m.id}`}
              aria-expanded={openMatchMenu === m.id}
              onClick={() => setOpenMatchMenu(openMatchMenu === m.id ? null : m.id)}
            >
              ⋮
            </button>

            {openMatchMenu === m.id && (
              <div className="player-menu">
                <button type="button" onClick={() => {
                  setOpenMatchMenu(null)
                  openResults(m.id)
                }}>
                  Enter / edit result
                </button>

                {m.status === 'open' && (
                  <button type="button" onClick={() => {
                    setOpenMatchMenu(null)
                    closeMatch(m.id)
                  }}>
                    Close now
                  </button>
                )}

                <button type="button" onClick={() => {
                  setOpenMatchMenu(null)
                  deleteMatch(m.id)
                }}>
                  Delete Match
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {detailsMatchId !== null && (
        <MatchDetails
          matchId={detailsMatchId}
          isAdmin
          onClose={() => setDetailsMatchId(null)}
          onEdit={(id) => {
            setDetailsMatchId(null)
            openResults(id)
          }}
        />
      )}
    </div>
  )
}
