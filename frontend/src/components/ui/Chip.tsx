'use client'

import type { ReactNode } from 'react'
import { Check, X } from 'lucide-react'

export type ChipTone = 'default' | 'match' | 'missing' | 'primary' | 'accent'

const TONES: Record<ChipTone, string> = {
  default: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  match: 'bg-success/10 text-emerald-700 border-emerald-300',
  missing: 'bg-error/10 text-red-700 border-red-300',
  primary: 'bg-primary/10 text-primary border-indigo-200',
  accent: 'bg-violet-50 text-violet-700 border-violet-200',
}

export function Chip({
  label,
  tone = 'default',
  icon,
  onRemove,
  onClick,
}: {
  label: string
  tone?: ChipTone
  icon?: ReactNode
  onRemove?: () => void
  onClick?: () => void
}) {
  const interactive = !!(onClick || onRemove)
  const Tag = interactive ? 'button' : 'span'
  return (
    <Tag
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold ${TONES[tone]} ${
        interactive ? 'hover:brightness-95 transition cursor-pointer' : ''
      }`}
    >
      {icon ?? (tone === 'match' ? <Check className="w-3 h-3" /> : null)}
      {label}
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          aria-label={`Remove ${label}`}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation()
              onRemove()
            }
          }}
          className="hover:text-error"
        >
          <X className="w-3 h-3" />
        </span>
      )}
    </Tag>
  )
}
