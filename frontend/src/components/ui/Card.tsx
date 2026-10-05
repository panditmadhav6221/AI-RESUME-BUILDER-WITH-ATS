'use client'

import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  elevated?: boolean
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'muted'
}

const TONES = {
  default: 'bg-white border-border',
  muted: 'bg-surface border-border',
  primary: 'bg-primary/5 border-primary/30',
  success: 'bg-success/10 border-success/30',
  warning: 'bg-warning/10 border-warning/30',
  danger: 'bg-error/10 border-error/30',
} as const

export default function Card({ children, elevated = true, tone = 'default', className = '', ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 ${TONES[tone]} ${elevated ? 'shadow-sm' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
