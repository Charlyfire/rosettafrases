import type { ReactNode } from 'react'

interface OptionGridProps {
  count: number
  label: string
  children: ReactNode
  className?: string
  extraClassName?: string
}

export function OptionGrid({ count, label, children, className = 'recognition-grid', extraClassName = '' }: OptionGridProps) {
  return (
    <section className={`${className} ${className}--${count} ${extraClassName}`} aria-label={label}>
      {children}
    </section>
  )
}
