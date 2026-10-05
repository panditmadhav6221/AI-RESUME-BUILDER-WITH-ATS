'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail, RefreshCw, Sparkles } from 'lucide-react'
import PageShell from '@/components/PageShell'
import ResumeBanner from '@/components/ResumeBanner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ErrorBanner from '@/components/ui/ErrorBanner'
import CopyButton from '@/components/ui/CopyButton'
import SectionHeading from '@/components/ui/SectionHeading'
import { TextArea, TextField } from '@/components/ui/Field'
import { Loading } from '@/components/ui/Loading'
import { useActiveResume } from '@/hooks/useResumes'
import { aiApi } from '@/lib/api'
import type { CoverLetterResult, CoverLetterTone } from '@/types'

const TONES: { key: CoverLetterTone; label: string }[] = [
  { key: 'professional', label: 'Professional' },
  { key: 'enthusiastic', label: 'Enthusiastic' },
  { key: 'executive', label: 'Executive' },
]

function CoverLetterContent() {
  const params = useSearchParams()
  const resume = useActiveResume(params.get('id'))

  const [companyName, setCompanyName] = useState('')
  const [roleInput, setRoleInput] = useState<string | null>(null)
  const [jd, setJd] = useState('')
  const [tone, setTone] = useState<CoverLetterTone>('professional')
  const [result, setResult] = useState<CoverLetterResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const targetRole = roleInput ?? resume.targetRole ?? ''
  const setTargetRole = setRoleInput

  const generate = async () => {
    if (!resume.data) {
      setError('Please create or select a resume first.')
      return
    }
    if (!jd.trim()) {
      setError('Please paste the target Job Description.')
      return
    }
    setBusy(true)
    setError('')
    try {
      setResult(
        await aiApi.generateCoverLetter(resume.data, jd.trim(), companyName || null, targetRole || null, tone),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate the cover letter')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell
      title="AI Cover Letter"
      subtitle="Targeted 1-click match"
      banner={<ResumeBanner resume={resume} eyebrow="Linked resume" icon={<Mail className="w-5 h-5" />} showView={false} />}
    >
      <div className="space-y-6">
        {error && <ErrorBanner message={error} />}

        <Card>
          <SectionHeading
            title="Target Role & Job Description"
            subtitle="The AI will highlight your most relevant experience to match this role."
          />
          <div className="grid sm:grid-cols-2 gap-x-4">
            <TextField
              label="Company Name"
              value={companyName}
              placeholder="e.g. Google, Stripe, Microsoft"
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <TextField
              label="Target Job Title"
              value={targetRole}
              placeholder="e.g. Senior Frontend Engineer"
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <p className="text-[13px] font-semibold text-zinc-700 mb-2">Voice &amp; Tone</p>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTone(t.key)}
                  className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition-colors ${
                    tone === t.key
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-white border-border text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <TextArea
            label="Job Description (Responsibilities & Requirements) *"
            rows={6}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description…"
          />

          <Button loading={busy} onClick={generate} icon={<Sparkles className="w-4 h-4" />}>
            Generate Tailored Cover Letter
          </Button>
        </Card>

        {busy && !result && <Loading label="Crafting tailored cover letter…" />}

        {result && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-zinc-900">Generated Cover Letter</h2>
                <p className="text-[13px] text-zinc-500">
                  Aligned with {companyName || 'the company'} • {tone.toUpperCase()} tone
                </p>
              </div>
              <CopyButton text={result.fullText} label="Copy Full Text" size="md" />
            </div>

            <Card elevated tone="muted" className="bg-white">
              <div className="space-y-4 text-[13.5px] leading-relaxed text-zinc-800">
                <div>
                  <p className="font-semibold text-zinc-900">{resume.data?.contact.fullName || 'Your Name'}</p>
                  <p className="text-zinc-500 text-[12px]">
                    {[resume.data?.contact.email, resume.data?.contact.phone, resume.data?.contact.location]
                      .filter(Boolean)
                      .join(' | ')}
                  </p>
                </div>
                <div className="h-0.5 bg-zinc-200" />
                <p className="font-bold">{result.salutation}</p>
                <p>{result.opening}</p>
                {result.bodyParagraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                <p>{result.closing}</p>
                <p className="whitespace-pre-wrap font-semibold">{result.signoff}</p>
              </div>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" loading={busy} onClick={generate} icon={<RefreshCw className="w-4 h-4" />}>
                Regenerate Letter
              </Button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-primary text-primary hover:bg-primary/5"
              >
                Back to Resumes
              </Link>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}

export default function CoverLetterPage() {
  return (
    <Suspense fallback={<Loading label="Loading cover letter…" />}>
      <CoverLetterContent />
    </Suspense>
  )
}
