'use client'

import type { ReactNode } from 'react'

export default function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-zinc-900">{title}</h2>
        {subtitle && <p className="text-[13px] text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
