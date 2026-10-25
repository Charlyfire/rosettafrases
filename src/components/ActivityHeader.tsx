interface ActivityHeaderProps {
  title: string
  subtitle?: string
  onBack: () => void
}

export function ActivityHeader({ title, subtitle, onBack }: ActivityHeaderProps) {
  return (
    <header className="activity-header">
      <button className="button button--quiet" type="button" onClick={onBack} aria-label="Volver">
        <span aria-hidden="true">←</span> Volver
      </button>
      <div className="activity-header__titles">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="activity-header__balance" aria-hidden="true" />
    </header>
  )
}
