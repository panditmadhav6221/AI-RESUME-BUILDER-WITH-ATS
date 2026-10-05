'use client'

import { Loader2 } from 'lucide-react'

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Loader2 className="w-7 h-7 text-primary animate-spin" />
      <p className="text-[13px] font-medium text-zinc-500">{label}</p>
    </div>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`w-4 h-4 animate-spin ${className}`} />
}
