import { ConfettiBurst } from './ConfettiBurst'

interface FeedbackProps {
  message?: string
  className?: string
}

export function Feedback({ message, className = 'recognition-feedback' }: FeedbackProps) {
  return (
    <>
      <ConfettiBurst active={Boolean(message)} />
      <div className={message ? `${className} ${className}--visible` : className} aria-live="polite">
        {message ?? '\u00A0'}
      </div>
    </>
  )
}
