import { useState } from 'react'
import AdminPlayers from './AdminPlayers'
import AdminMatches from './AdminMatches'
import AdminResults from './AdminResults'

const PARTS = [
  ['players', 'Players'],
  ['matches', 'New match'],
  ['results', 'Results'],
]

export default function Admin() {
  const [part, setPart] = useState('players')
  return (
    <div>
      <div className="pills">
        {PARTS.map(([key, label]) => (
          <button
            type="button"
            key={key}
            className={'pill' + (part === key ? ' on' : '')}
            onClick={() => setPart(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {part === 'players' && <AdminPlayers />}
      {part === 'matches' && <AdminMatches />}
      {part === 'results' && <AdminResults />}
    </div>
  )
}
