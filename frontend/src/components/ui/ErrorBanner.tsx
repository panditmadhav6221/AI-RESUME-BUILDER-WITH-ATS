'use client'

import { AlertTriangle } from 'lucide-react'

export default function ErrorBanner({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
      <p className="text-[13px] font-medium text-red-700 break-words">{message}</p>
    </div>
  )
}
