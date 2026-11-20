import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function TopScorers() {
  const [rows, setRows] = useState([])
  const [names, setNames] = useState({})
  const [range, setRange] = useState('year')

  useEffect(() => {
    async function load() {
      const { data: g } = await supabase
        .from('goal_stats')
        .select('player_id, year, goals, assists')
      setRows(g || [])
      const { data: p } = await supabase
        .from('players')
        .select('id, name')
        .eq('status', 'approved')
      setNames(Object.fromEntries((p || []).map((x) => [x.id, x.name])))
    }
    load()
    const timer = setInterval(load, 10000)
    return () => clearInterval(timer)
  }, [])

  const thisYear = new Date().getFullYear()
  const totals = {}
  rows
    .filter((r) => range === 'all' || r.year === thisYear)
    .forEach((r) => {
      const t = totals[r.player_id] || { goals: 0, assists: 0 }
      t.goals += Number(r.goals)
      t.assists += Number(r.assists)
      totals[r.player_id] = t
    })

  const list = (key) =>
    Object.entries(totals)
      .filter(([, t]) => t[key] > 0)
      .sort((a, b) => b[1][key] - a[1][key])
      .slice(0, 10)

  const scorers = list('goals')
  const assisters = list('assists')

  return (
    <div className="section">
      <h2>Top scorers and assists</h2>
      <div className="pills">
        <button
          type="button"
          className={'pill' + (range === 'year' ? ' on' : '')}
          onClick={() => setRange('year')}
        >
          This year
        </button>
        <button
          type="button"
          className={'pill' + (range === 'all' ? ' on' : '')}
          onClick={() => setRange('all')}
        >
          All time
        </button>
      </div>

      <h2>⚽ Top scorers</h2>
      {scorers.length === 0 && <p className="muted">No goals yet.</p>}
      {scorers.map(([id, t], i) => (
        <div className="row" key={id}>
          <span>
            {i + 1}. {names[id] ?? 'Player'}
          </span>
          <strong>{t.goals}</strong>
        </div>
      ))}

      <h2>🅰️ Top assists</h2>
      {assisters.length === 0 && <p className="muted">No assists yet.</p>}
      {assisters.map(([id, t], i) => (
        <div className="row" key={id}>
          <span>
            {i + 1}. {names[id] ?? 'Player'}
          </span>
          <strong>{t.assists}</strong>
        </div>
      ))}
    </div>
  )
}
