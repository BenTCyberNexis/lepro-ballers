import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function ForgotPassword() {
  const [username, setUsername] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    const uname = username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,20}$/.test(uname)) {
      setError('Enter your username')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('reset_requests').insert({ username: uname })
    setLoading(false)
    // A duplicate open request is fine: show the same message
    if (error && error.code !== '23505') {
      setError('Could not send the request. Try again.')
      return
    }
    setSent(true)
  }

  return (
    <div className="card">
      <h1>⚽ Lepro Ballers</h1>
      {sent ? (
        <>
          <p>Request sent.</p>
          <p className="muted">
            An admin will reset your password to 123456. Log in with that and
            you will be asked to choose a new one.
          </p>
        </>
      ) : (
        <>
          <p className="muted">Enter your username and an admin will reset your password.</p>
          <form onSubmit={submit}>
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              required
            />
            {error && <p className="error">{error}</p>}
            <button disabled={loading}>{loading ? 'Sending...' : 'Request reset'}</button>
          </form>
        </>
      )}
      <p className="muted">
        <a className="link" href="#/">Back to login</a>
      </p>
    </div>
  )
}
