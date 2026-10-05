'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Eye, FileText } from 'lucide-react'
import type { ActiveResume } from '@/hooks/useResumes'
import { Loading } from './ui/Loading'

export default function ResumeBanner({
  resume,
  eyebrow,
  icon,
  showView = true,
}: {
  resume: ActiveResume
  eyebrow: string
  icon: ReactNode
  showView?: boolean
}) {
  if (resume.loading) return <Loading label="Loading your resume…" />

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
          {icon ?? <FileText className="w-5 h-5" />}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">{eyebrow}</p>
          <p className="font-semibold text-zinc-900 truncate">{resume.title}</p>
          {resume.data?.contact.fullName && (
            <p className="text-[13px] text-zinc-500 truncate">{resume.data.contact.fullName}</p>
          )}
        </div>
      </div>
      {showView && resume.refId && (
        <Link
          href={`/preview?id=${resume.refId}`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold text-primary hover:bg-primary/10"
        >
          <Eye className="w-4 h-4" />
          View Resume
        </Link>
      )}
    </div>
  )
}
