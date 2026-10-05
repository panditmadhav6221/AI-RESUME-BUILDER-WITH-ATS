'use client'

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-zinc-900/60" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[90vh] overflow-y-auto scrollbar-thin bg-white rounded-t-2xl sm:rounded-2xl shadow-xl`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-5 pt-5 pb-4 bg-white border-b border-border">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-900">{title}</h2>
            {subtitle && <p className="text-[13px] text-zinc-500 mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="sticky bottom-0 flex items-center gap-3 px-5 py-4 bg-white border-t border-border">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
