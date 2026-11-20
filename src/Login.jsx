import { useState } from 'react'
import { supabase, toEmail } from './supabaseClient'
import loginPhoto from './assets/lepro-login-photo.jpg'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password,
    })
    if (error) setError('Wrong username or password. Please try again.')
    setLoading(false)
  }

  return (
    <main className="login-page">
      <section className="login-visual" style={{ backgroundImage: `linear-gradient(180deg, rgba(5, 28, 20, .12), rgba(5, 28, 20, .82)), url(${loginPhoto})` }}>
        <div className="login-visual-top">
          <span className="login-mark">LB</span>
          <span className="login-brand">LEPRO <b>BALLERS</b></span>
        </div>
        <div className="login-visual-copy">
          <span className="login-kicker"><i /> PLAYER PERFORMANCE SYSTEM</span>
          <h1>More than<br />just a game.</h1>
          <p>Every match. Every player. Every performance counts.</p>
        </div>
        <span className="login-photo-caption">THE GAME IS YOURS. OWN YOUR PERFORMANCE.</span>
      </section>

      <section className="login-panel">
        <div className="login-form-wrap">
          <div className="login-mobile-brand"><span className="login-mark">LB</span><span>LEPRO <b>BALLERS</b></span></div>
          <div className="login-heading">
            <span className="login-kicker">WELCOME BACK</span>
            <h2>Sign in to your account</h2>
            <p>Pick up where your game left off.</p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="login-username">Username</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">@</span>
              <input
                id="login-username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoCapitalize="none"
                autoComplete="username"
                required
              />
            </div>

            <div className="login-password-label">
              <label htmlFor="login-password">Password</label>
              <a href="#/forgot">Forgot password?</a>
            </div>
            <div className="login-input-wrap">
              <span className="login-input-icon">▣</span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button className="login-show-password" type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? 'Signing you in…' : 'Sign in'} <span>→</span>
            </button>
          </form>

          <p className="login-signup">New to the squad? <a href="#/signup">Create an account</a></p>
          <div className="login-footnote"><span>⚽</span> YOUR GAME. YOUR NUMBERS. YOUR LEGACY.</div>
        </div>
      </section>
    </main>
  )
}
