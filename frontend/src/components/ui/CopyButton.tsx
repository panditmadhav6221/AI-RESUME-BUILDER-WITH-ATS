'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { copyToClipboard } from '@/lib/api'

export default function CopyButton({
  text,
  label = 'Copy',
  size = 'sm',
  variant = 'outline',
}: {
  text: string
  label?: string
  size?: 'sm' | 'md'
  variant?: 'outline' | 'secondary' | 'ghost'
}) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const handleCopy = async () => {
    setError('')
    try {
      await copyToClipboard(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Clipboard blocked by the browser')
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        title={error || undefined}
        className={`inline-flex items-center gap-1.5 font-semibold rounded-lg transition-colors ${
          size === 'sm' ? 'px-3 py-1.5 text-[13px]' : 'px-4 py-2.5 text-sm'
        } ${
          variant === 'outline'
            ? 'border border-primary text-primary hover:bg-primary/5'
            : variant === 'secondary'
              ? 'border border-border bg-surface text-zinc-700 hover:bg-zinc-50'
              : 'text-primary hover:bg-primary/10'
        }`}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied' : label}
      </button>
      {error && <span className="text-[11px] text-error">{error}</span>}
    </span>
  )
}
