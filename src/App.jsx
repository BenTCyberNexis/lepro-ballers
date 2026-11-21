import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { supabase } from './supabaseClient'
import Avatar from './Avatar'

const Login = lazy(() => import('./Login'))
const Signup = lazy(() => import('./Signup'))
const ForgotPassword = lazy(() => import('./ForgotPassword'))
const ChangePassword = lazy(() => import('./ChangePassword'))
const ChangePhoto = lazy(() => import('./ChangePhoto'))
const LastMatch = lazy(() => import('./LastMatch'))
const Rate = lazy(() => import('./Rate'))
const Scores = lazy(() => import('./Scores'))
const Season = lazy(() => import('./Season'))
const TopScorers = lazy(() => import('./TopScorers'))
const Admin = lazy(() => import('./Admin'))

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
  const [changingPhoto, setChangingPhoto] = useState(false)
  const [tab, setTab] = useState('home')
  const [route, setRoute] = useState(window.location.hash)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef(null)

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (!accountOpen) return

    function handleOutsideClick(event) {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick)
    return () => document.removeEventListener('pointerdown', handleOutsideClick)
  }, [accountOpen])

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
      .select('name, username, role, status, must_change_password, avatar_path')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        setPlayer(data ?? null)
        setLoadError(error ? error.message : '')
        setFetching(false)
      })
  }, [session])

  if (checking) return <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-ball">⚽</div>
        <div className="loading-brand">LEPRO <span>BALLERS</span></div>
        <p>Getting your game ready...</p>
        <div className="loading-track"><span /></div>
      </div>
    </div>
  if (!session) {
    if (route === '#/signup') return <Signup />
    if (route === '#/forgot') return <ForgotPassword />
    return <Login />
  }
  if (fetching) return <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-ball">⚽</div>
        <div className="loading-brand">LEPRO <span>BALLERS</span></div>
        <p>Getting your game ready...</p>
        <div className="loading-track"><span /></div>
      </div>
    </div>

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

  if (changingPhoto) {
    return (
      <ChangePhoto
        userId={session.user.id}
        name={player.name}
        currentPath={player.avatar_path}
        onCancel={() => setChangingPhoto(false)}
        onDone={() => {
          setChangingPhoto(false)
          setSession({ ...session })
        }}
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
    <Suspense fallback={<div className="loading-screen">
      <div className="loading-content">
        <div className="loading-ball">⚽</div>
        <div className="loading-brand">LEPRO <span>BALLERS</span></div>
        <p>Getting your game ready...</p>
        <div className="loading-track"><span /></div>
      </div>
    </div>}>
      <div className="app">
      <header className="topbar">
        <span className="brand">⚽ Lepro Ballers</span>
        <div className="account-wrap" ref={accountRef}>
          <button
            type="button"
            className="who account-trigger"
            onClick={() => setAccountOpen(!accountOpen)}
          >
            <Avatar path={player.avatar_path} name={player.name} size={28} /> {player.name} <span>▾</span>
          </button>
          {accountOpen && (
            <div className="account-menu">
              <button type="button" onClick={() => {
                setAccountOpen(false)
                setChangingPhoto(true)
              }}>
                📷 Change profile picture
              </button>
              <button type="button" onClick={() => {
                setAccountOpen(false)
                setChanging(true)
              }}>
                🔒 Change password
              </button>
              <button type="button" onClick={() => supabase.auth.signOut()}>
                ↪ Log out
              </button>
            </div>
          )}
        </div>
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
    </Suspense>
  )
}
