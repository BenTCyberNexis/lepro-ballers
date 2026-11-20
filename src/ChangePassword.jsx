import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function ChangePassword({ forced, onDone, onCancel }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(e) {
    e.preventDefault()
    setError('')
    if (pw.length < 6) {
      setError('Use at least 6 characters')
      return
    }
    if (pw === '123456') {
      setError('Choose something other than the default password')
      return
    }
    if (pw !== pw2) {
      setError('The two passwords do not match')
      return
    }
    setSaving(true)
    const { error: e1 } = await supabase.auth.updateUser({ password: pw })
    if (e1) {
      setError(e1.message)
      setSaving(false)
      return
    }
    await supabase.rpc('clear_password_flag')
    setSaving(false)
    onDone()
  }

  return (
    <div className="card">
      <h1>⚽ Lepro Ballers</h1>
      <p className="muted">
        {forced
          ? 'Your password was reset. Choose a new password to continue.'
          : 'Choose a new password.'}
      </p>
      <form onSubmit={save}>
        <input
          type="password"
          placeholder="New password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button disabled={saving}>{saving ? 'Saving...' : 'Save password'}</button>
        {!forced && (
          <button type="button" className="pill" onClick={onCancel}>
            Cancel
          </button>
        )}
      </form>
    </div>
  )
}
