import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const pad = (n) => String(n).padStart(2, '0')
const toLocalInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

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

  async function load() {
    const { data: p } = await supabase
      .from('players')
      .select('id, name, username')
      .eq('status', 'approved')
      .order('name')
    setPlayers(p || [])
    const { data: m } = await supabase
      .from('matches')
      .select('id, match_date, venue, status, rating_closes_at')
      .order('match_date', { ascending: false })
    setMatches(m || [])
  }

  useEffect(() => {
    load()
  }, [])

  const toggle = (list, setList, id) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  async function createMatch(e) {
    e.preventDefault()
    setError('')
    if (teamA.length === 0 || teamB.length === 0) {
      setError('Pick at least one player for each team')
      return
    }

    setSaving(true)
    const { data: u } = await supabase.auth.getUser()
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
    load()
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

  return (
    <div className="section">
      <h2>Create match</h2>
      <form onSubmit={createMatch}>
        <label className="muted">Match date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
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

        {error && <p className="error">{error}</p>}
        <button disabled={saving}>{saving ? 'Saving...' : 'Create match'}</button>
      </form>

      <h2>Matches ({matches.length})</h2>
      {matches.length === 0 && <p className="muted">No matches yet.</p>}
      {matches.map((m) => (
        <div className="row" key={m.id}>
          <span>
            {m.match_date} {m.venue && `· ${m.venue}`}
            <br />
            <span className="muted">
              {m.status === 'open'
                ? 'Open until ' + new Date(m.rating_closes_at).toLocaleString()
                : 'Closed'}
            </span>
          </span>
          {m.status === 'open' && (
            <button className="small" onClick={() => closeMatch(m.id)}>
              Close now
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
