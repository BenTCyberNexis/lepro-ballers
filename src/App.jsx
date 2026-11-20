import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import Signup from './Signup'
import ForgotPassword from './ForgotPassword'
import ChangePassword from './ChangePassword'
import LastMatch from './LastMatch'
import Rate from './Rate'
import Scores from './Scores'
import Season from './Season'
import TopScorers from './TopScorers'
import Admin from './Admin'

const TABS = [
  ['home', 'Home', '🏠'],
  ['rate', 'Rate', '⭐'],
  ['table', 'Table', '🏆'],
  ['me', 'Me', '👤'],
]

export default function App() {
  const [session, setSession] = useState(null)
  const [player, setPlayer] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [checking, setChecking] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [changing, setChanging] = useState(false)
  const [tab, setTab] = useState('home')
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
      setTab('home')
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

  const userId = session.user.id
  const isAdmin = player.role === 'admin'
  const tabs = isAdmin ? [...TABS, ['admin', 'Admin', '⚙️']] : TABS
  const active = tabs.some((t) => t[0] === tab) ? tab : 'home'

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">⚽ Lepro Ballers</span>
        <span className="who">{player.name}</span>
      </header>

      <main className="card">
        {active === 'home' && (
          <>
            <Scores userId={userId} show="card" />
            <LastMatch />
            <TopScorers />
          </>
        )}
        {active === 'rate' && <Rate userId={userId} />}
        {active === 'table' && <Scores userId={userId} show="table" />}
        {active === 'me' && (
          <>
            <Scores userId={userId} show="detail" />
            <Season userId={userId} />
            <div className="section">
              <h2>Account</h2>
              <div className="actions left">
                <button className="small" onClick={() => setChanging(true)}>
                  Change password
                </button>
                <button className="small" onClick={() => supabase.auth.signOut()}>
                  Log out
                </button>
              </div>
            </div>
          </>
        )}
        {active === 'admin' && isAdmin && <Admin />}
      </main>

      <nav className="tabbar">
        {tabs.map(([key, label, icon]) => (
          <button
            type="button"
            key={key}
            className={'tab' + (active === key ? ' on' : '')}
            onClick={() => setTab(key)}
          >
            <span className="ico">{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}
