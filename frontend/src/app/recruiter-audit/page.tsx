'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Flag, Pencil, Rocket, Search, Timer, Zap } from 'lucide-react'
import PageShell from '@/components/PageShell'
import ResumeBanner from '@/components/ResumeBanner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ErrorBanner from '@/components/ui/ErrorBanner'
import AtsGauge from '@/components/ui/AtsGauge'
import SectionHeading from '@/components/ui/SectionHeading'
import { TextField } from '@/components/ui/Field'
import { Loading } from '@/components/ui/Loading'
import { useActiveResume } from '@/hooks/useResumes'
import { aiApi } from '@/lib/api'
import type { RecruiterAuditResult } from '@/types'

function RecruiterAuditContent() {
  const params = useSearchParams()
  const resume = useActiveResume(params.get('id'))

  const [roleInput, setRoleInput] = useState<string | null>(null)
  const [audit, setAudit] = useState<RecruiterAuditResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const targetRole = roleInput ?? resume.targetRole ?? ''
  const setTargetRole = setRoleInput

  const run = async () => {
    if (!resume.data) {
      setError('Please select or build a resume first.')
      return
    }
    setBusy(true)
    setError('')
    try {
      setAudit(await aiApi.recruiterAudit(resume.data, targetRole || null))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run the recruiter audit')
    } finally {
      setBusy(false)
    }
  }

  const status = !audit
    ? ''
    : audit.callbackProbability >= 80
      ? 'High Priority Candidate'
      : audit.callbackProbability >= 60
        ? 'Moderate — Borderline'
        : 'High Risk — Likely Skipped'

  const editHref = resume.refId ? `/builder?id=${resume.refId}` : '/builder'

  return (
    <PageShell
      title="Recruiter 6-Second Scan"
      subtitle="Cold read & red flag audit"
      banner={<ResumeBanner resume={resume} eyebrow="Executive cold read audit" icon={<Search className="w-5 h-5" />} showView={false} />}
    >
      <div className="space-y-6">
        {error && <ErrorBanner message={error} />}

        <Card>
          <SectionHeading
            title="Recruiter 6-Second Scan Simulation"
            subtitle="Recruiters review resumes in 6 seconds. Find out exactly what catches their eye, red flags, and interview callback odds."
          />
          <TextField
            label="Target Position (Optional)"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Senior Backend Engineer"
          />
          <Button loading={busy} onClick={run} icon={<Zap className="w-4 h-4" />}>
            Simulate 6-Second Recruiter Read
          </Button>
        </Card>

        {busy && !audit && <Loading label="Running 6-second recruiter cold read simulation…" />}

        {audit && (
          <div className="space-y-4">
            <Card>
              <div className="flex flex-wrap items-center gap-6">
                <AtsGauge score={audit.callbackProbability} size="lg" showLabel={false} />
                <div className="flex-1 min-w-[220px]">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Callback Probability</p>
                  <h3 className="text-lg font-bold text-zinc-900">{status}</h3>
                  <p className="text-[13px] text-zinc-500 italic mt-0.5">{audit.executiveVerdict}</p>
                </div>
              </div>
            </Card>

            {audit.firstImpression && (
              <Card tone="primary">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-zinc-900">6-Second First Impression</h3>
                </div>
                <p className="text-[13px] text-zinc-700">{audit.firstImpression}</p>
              </Card>
            )}

            {audit.redFlags.length > 0 && (
              <Card tone="danger">
                <h3 className="font-semibold text-red-800 mb-3">Immediate Red Flags</h3>
                <ul className="space-y-2">
                  {audit.redFlags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-red-800">
                      <Flag className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      {flag}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {audit.strengths.length > 0 && (
              <Card tone="success">
                <h3 className="font-semibold text-emerald-800 mb-3">Key Selling Points</h3>
                <ul className="space-y-2">
                  {audit.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {audit.top3Fixes.length > 0 && (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <Rocket className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-zinc-900">Top {audit.top3Fixes.length} Urgent Fixes</h3>
                </div>
                <ul className="space-y-2">
                  {audit.top3Fixes.map((fix, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] text-zinc-700">
                      <span className="w-5 h-5 rounded-full bg-zinc-900 text-white grid place-items-center text-[10px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {fix}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Link
              href={editHref}
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-primary-dark"
            >
              <Pencil className="w-4 h-4" />
              Edit in Builder to Fix Issues
            </Link>
          </div>
        )}
      </div>
    </PageShell>
  )
}

export default function RecruiterAuditPage() {
  return (
    <Suspense fallback={<Loading label="Loading recruiter scan…" />}>
      <RecruiterAuditContent />
    </Suspense>
  )
}
