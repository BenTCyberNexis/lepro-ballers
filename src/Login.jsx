import { useState } from 'react'
import { supabase, toEmail } from './supabaseClient'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password,
    })
    if (error) setError('Wrong username or password')
    setLoading(false)
  }

  return (
    <div className="card">
      <h1>⚽ Lepro Ballers</h1>
      <p className="muted">Player Performance System</p>
      <form onSubmit={handleLogin}>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button disabled={loading}>{loading ? 'Logging in...' : 'Log in'}</button>
      </form>
      <p className="muted">
        New player? <a className="link" href="#/signup">Sign up</a>
      </p>
      <p className="muted">
        <a className="link" href="#/forgot">Forgot password?</a>
      </p>
    </div>
  )
}
