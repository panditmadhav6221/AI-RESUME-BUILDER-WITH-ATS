'use client'

import type { ReactNode } from 'react'
import { Check, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'
import { Spinner } from './Loading'

export interface PendingAiChange {
  title: string
  subtitle?: string
  original?: string
  proposed: string
  accept: () => void
  regenerate?: () => void
}

export default function AiDiffModal({
  change,
  loading,
  onClose,
}: {
  change: PendingAiChange | null
  loading?: boolean
  onClose: () => void
}) {
  if (!change) return null
  const hasOriginal = !!change.original?.trim()

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={change.title}
      subtitle={change.subtitle ?? 'Review the proposed change before applying it'}
      footer={
        <>
          {change.regenerate && (
            <Button
              variant="outline"
              block
              disabled={loading}
              onClick={change.regenerate}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Regenerate
            </Button>
          )}
          <Button
            block
            disabled={loading || !change.proposed}
            onClick={() => {
              change.accept()
              onClose()
            }}
            icon={<Check className="w-4 h-4" />}
          >
            Apply Changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {hasOriginal && (
          <div className="rounded-xl bg-zinc-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 mb-2">Current</p>
            <p className="text-sm text-zinc-500 whitespace-pre-wrap line-through">{change.original}</p>
          </div>
        )}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              AI Enhanced (ATS-optimized)
            </p>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <TriangleAlert className="w-3 h-3" />
              Action + Quantified
            </span>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700 py-2">
              <Spinner />
              Crafting perfection…
            </div>
          ) : (
            <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">{change.proposed}</p>
          )}
        </div>
      </div>
    </Modal>
  )
}

export function AiNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-indigo-200 bg-primary/5 px-4 py-3 text-[13px] text-zinc-600">
      {children}
    </div>
  )
}
