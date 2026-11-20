import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function Season({ userId }) {
  const [rows, setRows] = useState([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('goal_stats')
        .select('year, goals, assists')
        .eq('player_id', userId)
        .order('year', { ascending: false })
      setRows(data || [])
    }
    load()
    const timer = setInterval(load, 10000)
    return () => clearInterval(timer)
  }, [userId])

  const thisYear = new Date().getFullYear()
  const current = rows.find((r) => r.year === thisYear)
  const earlier = rows.filter((r) => r.year !== thisYear)

  return (
    <div className="section">
      <h2>My season {thisYear}</h2>
      <div className="row">
        <span>⚽ Goals</span>
        <strong>{current ? current.goals : 0}</strong>
      </div>
      <div className="row">
        <span>🅰️ Assists</span>
        <strong>{current ? current.assists : 0}</strong>
      </div>
      {earlier.length > 0 && (
        <>
          <h2>Earlier years</h2>
          {earlier.map((r) => (
            <div className="row" key={r.year}>
              <span>{r.year}</span>
              <span>
                {r.goals} goals · {r.assists} assists
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
