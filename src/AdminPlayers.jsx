import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function AdminPlayers() {
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, username, role, status, created_at')
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    else setPlayers(data)
  }

  useEffect(() => {
    load()
  }, [])

  async function approve(id) {
    setError('')
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
    const password = window.prompt(
      'New temporary password for ' + p.name + ' (min 6 characters):'
    )
    if (!password) return
    const { error } = await supabase.functions.invoke('super-service', {
      body: { action: 'reset', player_id: p.id, password },
    })
    if (error) {
      let msg = error.message
      try {
        const j = await error.context.json()
        msg = j.error || msg
      } catch (_) {}
      setError(msg)
      return
    }
    setInfo('Password reset for ' + p.name + '. Tell them the new password.')
  }

  const pending = players.filter((p) => p.status === 'pending')
  const approved = players.filter((p) => p.status === 'approved')

  return (
    <div className="section">
      <h2>Pending players ({pending.length})</h2>
      {error && <p className="error">{error}</p>}
      {info && <p className="ok">{info}</p>}
      {pending.length === 0 && <p className="muted">No one is waiting.</p>}
      {pending.map((p) => (
        <div className="row" key={p.id}>
          <span>
            {p.name} <span className="muted">@{p.username}</span>
          </span>
          <button className="small" onClick={() => approve(p.id)}>
            Approve
          </button>
        </div>
      ))}

      <h2>Players ({approved.length})</h2>
      {approved.map((p) => (
        <div className="row" key={p.id}>
          <span>
            {p.name} <span className="muted">@{p.username}</span>
          </span>
          <span>
            <span className="muted">{p.role} </span>
            <button className="small" onClick={() => resetPassword(p)}>
              Reset password
            </button>
          </span>
        </div>
      ))}
    </div>
  )
}
