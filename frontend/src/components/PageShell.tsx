'use client'

import type { ReactNode } from 'react'

export default function PageShell({
  title,
  subtitle,
  actions,
  banner,
  children,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  banner?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{title}</h1>
          {subtitle && <p className="text-zinc-600 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
      {banner}
      <div className="w-full">{children}</div>
    </div>
  )
}
