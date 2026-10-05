'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent = '#2563eb',
  href,
  onClick,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  accent?: string
  href?: string
  onClick?: () => void
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
        {icon && (
          <span
            className="w-7 h-7 rounded-lg grid place-items-center shrink-0"
            style={{ backgroundColor: `${accent}1a`, color: accent }}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold tracking-tight mt-1" style={{ color: accent }}>
        {value}
      </p>
      {subtitle && <p className="text-[11px] text-zinc-500 mt-0.5">{subtitle}</p>}
    </>
  )

  const className = 'flex-1 rounded-xl border border-border bg-white p-3 shadow-sm text-left transition-shadow hover:shadow-md'

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    )
  }
  return <div className={className}>{content}</div>
}
