import { useState } from 'react'
import { supabase, toEmail } from './supabaseClient'

export default function Signup() {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e) {
    e.preventDefault()
    setError('')
    const uname = username.trim().toLowerCase()

    if (!/^[a-z0-9_]{3,20}$/.test(uname)) {
      setError('Username must be 3-20 letters, numbers or _')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: toEmail(uname),
      password,
    })
    if (signUpError) {
      setError(
        signUpError.message.toLowerCase().includes('already')
          ? 'That username is taken, try another'
          : signUpError.message
      )
      setLoading(false)
      return
    }
    if (!data.session) {
      setError('Signup needs email confirmation turned off. Tell the admin.')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('players').insert({
      id: data.user.id,
      username: uname,
      name: name.trim(),
      role: 'player',
      status: 'pending',
    })
    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    // Reload without the #/signup part so the waiting screen shows
    window.location.href = window.location.pathname
  }

  return (
    <div className="card">
      <h1>⚽ Join Lepro Ballers</h1>
      <p className="muted">Create your account. An admin will approve you.</p>
      <form onSubmit={handleSignup}>
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
          required
        />
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</button>
      </form>
      <p className="muted">
        Already have an account? <a className="link" href="#/">Log in</a>
      </p>
    </div>
  )
}
