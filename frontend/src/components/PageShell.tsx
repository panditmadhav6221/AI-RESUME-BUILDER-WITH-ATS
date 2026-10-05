'use client'

import type { ReactNode } from 'react'
import Navbar from './Navbar'

export default function PageShell({
  title,
  subtitle,
  actions,
  banner,
  children,
  wide = false,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  banner?: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  return (
    <>
      <Navbar />
      <main className="flex-1 w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>
            {subtitle && <p className="text-zinc-600 mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
        {banner}
        <div className={wide ? '' : 'max-w-4xl'}>{children}</div>
      </main>
    </>
  )
}
