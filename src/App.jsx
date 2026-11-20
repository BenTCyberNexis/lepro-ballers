import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import Signup from './Signup'
import ForgotPassword from './ForgotPassword'
import Rate from './Rate'
import ChangePassword from './ChangePassword'
import Scores from './Scores'
import AdminPlayers from './AdminPlayers'
import AdminMatches from './AdminMatches'

export default function App() {
  const [session, setSession] = useState(null)
  const [player, setPlayer] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [checking, setChecking] = useState(true)
  const [changing, setChanging] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [route, setRoute] = useState(window.location.hash)

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setPlayer(null)
      setLoadError('')
      return
    }
    setFetching(true)
    supabase
      .from('players')
      .select('name, username, role, status, must_change_password')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        setPlayer(data ?? null)
        setLoadError(error ? error.message : '')
        setFetching(false)
      })
  }, [session])

  if (checking) return <div className="card">Loading...</div>
  if (!session) {
    if (route === '#/signup') return <Signup />
    if (route === '#/forgot') return <ForgotPassword />
    return <Login />
  }
  if (fetching) return <div className="card">Loading...</div>

  if (!player) {
    if (route === '#/signup') return <Signup />
    return (
      <div className="card">
        <h1>⚽ Lepro Ballers</h1>
        <p className="error">
          {loadError
            ? 'Error: ' + loadError
            : 'Your login works, but no player record was found for it.'}
        </p>
        <button onClick={() => supabase.auth.signOut()}>Log out</button>
      </div>
    )
  }

  if (player.must_change_password) {
    return <ChangePassword forced onDone={() => setSession({ ...session })} />
  }
  if (changing) {
    return (
      <ChangePassword
        onDone={() => setChanging(false)}
        onCancel={() => setChanging(false)}
      />
    )
  }

  if (player.status === 'pending') {
    return (
      <div className="card">
        <h1>⚽ Lepro Ballers</h1>
        <p>Hi {player.name}, your request has been sent.</p>
        <p className="muted">Waiting for an admin to approve your account.</p>
        <button onClick={() => supabase.auth.signOut()}>Log out</button>
      </div>
    )
  }

  return (
    <div className="card">
      <h1>⚽ Lepro Ballers</h1>
      <p>Welcome, {player.name}!</p>
      <p className="muted">Role: {player.role}</p>
      <Rate userId={session.user.id} />
      <Scores userId={session.user.id} />
      {player.role === 'admin' && <AdminMatches />}
      {player.role === 'admin' && <AdminPlayers />}
      <button onClick={() => setChanging(true)}>Change password</button>
      <button onClick={() => supabase.auth.signOut()}>Log out</button>
    </div>
  )
}
