import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function AdminPlayers() {
  const [players, setPlayers] = useState([])
  const [requests, setRequests] = useState([])
  const [meId, setMeId] = useState(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [openMenu, setOpenMenu] = useState(null)

  async function load() {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, username, role, status, created_at')
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    else setPlayers(data)
  }

  async function loadRequests() {
    const { data } = await supabase
      .from('reset_requests')
      .select('id, username, created_at')
      .eq('handled', false)
      .order('created_at')
    setRequests(data || [])
  }

  useEffect(() => {
    load()
    loadRequests()
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id))
  }, [])

  // Calls the Edge Function (reset / delete) and shows any error it returns
  async function callFunction(body) {
    const { error } = await supabase.functions.invoke('super-service', { body })
    if (error) {
      let msg = error.message
      try {
        const j = await error.context.json()
        msg = j.error || msg
      } catch (_) {}
      setError(msg)
      return false
    }
    return true
  }

  async function approve(id) {
    setError('')
    setInfo('')
    const { error } = await supabase
      .from('players')
      .update({ status: 'approved' })
      .eq('id', id)
    if (error) setError(error.message)
    else load()
  }

  async function resetPassword(p) {
    setError('')
    setInfo('')
    if (!window.confirm('Reset the password for ' + p.name + ' to 123456?')) return false
    const ok = await callFunction({ action: 'reset', player_id: p.id })
    if (!ok) return false
    setInfo(p.name + ' now has the password 123456. Tell them to log in and choose a new one.')
    return true
  }

  async function resetFromRequest(r, player) {
    const ok = await resetPassword(player)
    if (!ok) return
    await supabase.from('reset_requests').update({ handled: true }).eq('id', r.id)
    loadRequests()
  }

  async function dismissRequest(r) {
    await supabase.from('reset_requests').update({ handled: true }).eq('id', r.id)
    loadRequests()
  }

  async function setRole(p, role) {
    setError('')
    setInfo('')
    const question =
      role === 'admin'
        ? 'Make ' + p.name + ' an admin? Admins can approve players, create matches, reset passwords and see who gave which rating.'
        : 'Remove admin rights from ' + p.name + '?'
    if (!window.confirm(question)) return
    const { error } = await supabase.from('players').update({ role }).eq('id', p.id)
    if (error) {
      setError(error.message)
      return
    }
    setInfo(p.name + (role === 'admin' ? ' is now an admin.' : ' is no longer an admin.'))
    load()
  }

  async function deletePlayer(p) {
    setError('')
    setInfo('')
    if (
      !window.confirm(
        'Delete ' + p.name + '? This removes their account and every rating they gave or received. This cannot be undone.'
      )
    )
      return
    const ok = await callFunction({ action: 'delete', player_id: p.id })
    if (!ok) return
    setInfo(p.name + ' was deleted.')
    load()
    loadRequests()
  }

  const pending = players.filter((p) => p.status === 'pending')
  const approved = players.filter((p) => p.status === 'approved')

  return (
    <div className="section">
      {error && <p className="error">{error}</p>}
      {info && <p className="ok">{info}</p>}

      <h2>Password reset requests ({requests.length})</h2>
      {requests.length === 0 && <p className="muted">No requests.</p>}
      {requests.map((r) => {
        const player = players.find((x) => x.username === r.username)
        return (
          <div className="row" key={r.id}>
            <span>
              {player ? player.name : 'Unknown user'}{' '}
              <span className="muted">@{r.username}</span>
            </span>
            <div className="player-menu-wrap">
              <button
                type="button"
                className="player-menu-trigger"
                aria-label="Password request actions"
                aria-expanded={openMenu === `request-${r.id}`}
                onClick={() => setOpenMenu(openMenu === `request-${r.id}` ? null : `request-${r.id}`)}
              >
                ⋮
              </button>
              {openMenu === `request-${r.id}` && (
                <div className="player-menu">
                  {player && (
                    <button type="button" onClick={() => {
                      setOpenMenu(null)
                      resetFromRequest(r, player)
                    }}>Reset password</button>
                  )}
                  <button type="button" onClick={() => {
                    setOpenMenu(null)
                    dismissRequest(r)
                  }}>Dismiss request</button>
                </div>
              )}
            </div>
          </div>
        )
      })}

      <h2>Pending players ({pending.length})</h2>
      {pending.length === 0 && <p className="muted">No one is waiting.</p>}
      {pending.map((p) => (
        <div className="row" key={p.id}>
          <span>
            {p.name} <span className="muted">@{p.username}</span>
          </span>
          <div className="player-menu-wrap">
            <button
              type="button"
              className="player-menu-trigger"
              aria-label={`Actions for ${p.name}`}
              aria-expanded={openMenu === `pending-${p.id}`}
              onClick={() => setOpenMenu(openMenu === `pending-${p.id}` ? null : `pending-${p.id}`)}
            >
              ⋮
            </button>
            {openMenu === `pending-${p.id}` && (
              <div className="player-menu">
                <button type="button" onClick={() => {
                  setOpenMenu(null)
                  approve(p.id)
                }}>Approve player</button>
                <button type="button" onClick={() => {
                  setOpenMenu(null)
                  deletePlayer(p)
                }}>Reject player</button>
              </div>
            )}
          </div>
        </div>
      ))}

      <h2>Players ({approved.length})</h2>
      {approved.map((p) => (
        <div className="row" key={p.id}>
          <span>
            {p.name} <span className="muted">@{p.username} · {p.role}</span>
          </span>
          <div className="player-menu-wrap">
            <button
              type="button"
              className="player-menu-trigger"
              aria-label={`Actions for ${p.name}`}
              aria-expanded={openMenu === `player-${p.id}`}
              onClick={() => setOpenMenu(openMenu === `player-${p.id}` ? null : `player-${p.id}`)}
            >
              ⋮
            </button>
            {openMenu === `player-${p.id}` && (
              <div className="player-menu">
                <button type="button" onClick={() => {
                  setOpenMenu(null)
                  resetPassword(p)
                }}>Reset password</button>
                {p.id !== meId && (
                  <button type="button" onClick={() => {
                    setOpenMenu(null)
                    setRole(p, p.role === 'admin' ? 'player' : 'admin')
                  }}>
                    {p.role === 'admin' ? 'Remove admin' : 'Make admin'}
                  </button>
                )}
                {p.id !== meId && p.role !== 'admin' && (
                  <button type="button" onClick={() => {
                    setOpenMenu(null)
                    deletePlayer(p)
                  }}>Delete player</button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
