import type { CSSProperties } from 'react'

const colors = ['#ef5b4c', '#18a58c', '#f4bb32', '#5878d5', '#d96aa7', '#81ad45', '#f18c3c']

interface ConfettiBurstProps {
  active: boolean
}

export function ConfettiBurst({ active }: ConfettiBurstProps) {
  if (!active) return null

  return (
    <div className="confetti-burst" aria-hidden="true">
      <span className="confetti-glow" />
      {Array.from({ length: 58 }, (_, index) => {
        const fromLeft = index % 2 === 0
        const origin = fromLeft ? 3 : 97
        const target = 8 + ((index * 47) % 85)
        const drift = ((index * 19) % 17) - 8
        const turn = 420 + (index * 73) % 620
        const style = {
          left: `${origin}%`,
          backgroundColor: colors[index % colors.length],
          animationDelay: `${(index % 10) * 24}ms`,
          animationDuration: `${1.75 + (index % 7) * 0.09}s`,
          '--burst-x': `${target - origin}vw`,
          '--fall-x': `${target - origin + drift}vw`,
          '--burst-y': `${-(58 + (index * 13) % 34)}vh`,
          '--turn': `${turn}deg`,
          '--turn-end': `${Math.round(turn * 1.8)}deg`,
        } as CSSProperties
        return <i className={`confetti-piece confetti-piece--${index % 4}`} key={index} style={style} />
      })}
    </div>
  )
}
