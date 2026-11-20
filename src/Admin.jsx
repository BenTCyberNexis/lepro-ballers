import { useState } from 'react'
import AdminPlayers from './AdminPlayers'
import AdminMatches from './AdminMatches'

const PARTS = [
  ['players', 'Players'],
  ['matches', 'Matches'],
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
    </div>
  )
}
