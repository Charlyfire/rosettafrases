interface AudioButtonProps {
  label?: string
  ariaLabel?: string
  disabled?: boolean
  className?: string
  onClick: () => void
}

export function AudioIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="M16 9.2a4 4 0 0 1 0 5.6M18.5 6.7a7.5 7.5 0 0 1 0 10.6" />
    </svg>
  )
}

export function AudioButton({
  label = 'Escuchar',
  ariaLabel,
  disabled,
  className = 'recognition-audio-button',
  onClick,
}: AudioButtonProps) {
  return (
    <button className={className} type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel ?? label}>
      <AudioIcon />
      <span>{label}</span>
    </button>
  )
}
