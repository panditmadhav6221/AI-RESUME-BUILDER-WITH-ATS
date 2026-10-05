'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronDown, Lightbulb, Target, Zap } from 'lucide-react'
import PageShell from '@/components/PageShell'
import ResumeBanner from '@/components/ResumeBanner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ErrorBanner from '@/components/ui/ErrorBanner'
import CopyButton from '@/components/ui/CopyButton'
import { Chip } from '@/components/ui/Chip'
import SectionHeading from '@/components/ui/SectionHeading'
import { TextArea, TextField } from '@/components/ui/Field'
import { Loading } from '@/components/ui/Loading'
import { useActiveResume } from '@/hooks/useResumes'
import { aiApi } from '@/lib/api'
import type { InterviewPrepResult, QuestionType, STARAnswer } from '@/types'

const STAR_BLOCKS: { key: keyof STARAnswer; label: string; hint: string; bg: string; border: string }[] = [
  { key: 'situation', label: 'Situation', hint: 'Context', bg: 'bg-sky-50', border: 'border-sky-200' },
  { key: 'task', label: 'Task', hint: 'Goal / Challenge', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { key: 'action', label: 'Action', hint: 'Specific steps you took', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { key: 'result', label: 'Result', hint: 'Quantified impact', bg: 'bg-violet-50', border: 'border-violet-200' },
]

const TYPE_TONE: Record<QuestionType, 'primary' | 'accent' | 'match'> = {
  behavioral: 'primary',
  technical: 'accent',
  leadership: 'match',
}

function InterviewPrepContent() {
  const params = useSearchParams()
  const resume = useActiveResume(params.get('id'))

  const [roleInput, setRoleInput] = useState<string | null>(null)
  const [jd, setJd] = useState('')
  const [result, setResult] = useState<InterviewPrepResult | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const targetRole = roleInput ?? resume.targetRole ?? ''
  const setTargetRole = setRoleInput

  const generate = async () => {
    if (!resume.data) {
      setError('Please build or select a resume first.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const prep = await aiApi.interviewPrep(resume.data, jd.trim() || null, targetRole || null)
      setResult(prep)
      setExpandedId(prep.questions[0]?.id ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate interview prep')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell
      title="Interview Prep"
      subtitle="STAR behavioral simulator"
      banner={<ResumeBanner resume={resume} eyebrow="Interview candidate" icon={<Target className="w-5 h-5" />} showView={false} />}
    >
      <div className="space-y-6">
        {error && <ErrorBanner message={error} />}

        <Card>
          <SectionHeading
            title="Interview Target"
            subtitle="AI analyzes your experience bullets & target role to craft realistic STAR scenarios."
          />
          <TextField
            label="Target Position / Job Title"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Senior Product Designer"
          />
          <TextArea
            label="Target Job Description / Key Requirements (Optional)"
            rows={4}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the job description to sharpen the questions…"
          />
          <Button loading={busy} onClick={generate} icon={<Zap className="w-4 h-4" />}>
            Simulate Interview &amp; Generate STAR Answers
          </Button>
        </Card>

        {busy && !result && <Loading label="Generating interview simulation & STAR answers…" />}

        {result && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-900">
                Curated Interview Questions ({result.questions.length})
              </h2>
              <p className="text-[13px] text-zinc-500">
                Role: {result.role} • Click any card to reveal the model STAR answer
              </p>
            </div>

            <div className="space-y-3">
              {result.questions.map((q, index) => {
                const open = expandedId === q.id
                return (
                  <Card key={q.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedId(open ? null : q.id)}
                      className="w-full text-left"
                      aria-expanded={open}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary grid place-items-center text-[11px] font-bold shrink-0">
                          Q{index + 1}
                        </span>
                        <Chip label={q.type.toUpperCase()} tone={TYPE_TONE[q.type] ?? 'default'} />
                        <ChevronDown
                          className={`w-4 h-4 ml-auto text-zinc-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                      </div>
                      <p className="mt-3 font-semibold text-zinc-900 text-[15px]">{q.question}</p>
                    </button>

                    {q.whyAsked && (
                      <div className="mt-3 border-l-[3px] border-primary bg-surface rounded-r-lg px-3 py-2">
                        <p className="text-[13px] text-zinc-600">
                          <span className="font-semibold">Recruiter&apos;s intent:</span> {q.whyAsked}
                        </p>
                      </div>
                    )}

                    {open && (
                      <div className="mt-4 space-y-4">
                        {q.keyPointsToCover.length > 0 && (
                          <div className="rounded-xl bg-surface border border-border p-3">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                              Key Points to Hit
                            </p>
                            <ul className="space-y-1">
                              {q.keyPointsToCover.map((point, i) => (
                                <li key={i} className="flex gap-2 text-[13px] text-zinc-700">
                                  <span className="text-zinc-400">•</span>
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {q.sampleStarAnswer && (
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                                Model Answer (STAR Method)
                              </p>
                              <CopyButton
                                text={STAR_BLOCKS.map((b) => `${b.label}: ${q.sampleStarAnswer?.[b.key] ?? ''}`).join('\n\n')}
                                label="Copy STAR answer"
                              />
                            </div>
                            <div className="grid sm:grid-cols-2 gap-3">
                              {STAR_BLOCKS.map((block) => (
                                <div key={block.key} className={`rounded-xl border p-3 ${block.bg} ${block.border}`}>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                    {block.label} <span className="font-normal">({block.hint})</span>
                                  </p>
                                  <p className="mt-1.5 text-[13px] text-zinc-700">
                                    {q.sampleStarAnswer?.[block.key] || '—'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>

            {result.generalTips.length > 0 && (
              <Card tone="primary">
                <h3 className="font-semibold text-zinc-900">Recruiter Tips for This Role</h3>
                <p className="text-[13px] text-zinc-500 mt-0.5 mb-3">Proven strategies to convert to an offer</p>
                <ul className="space-y-2">
                  {result.generalTips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-zinc-700">
                      <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}
      </div>
    </PageShell>
  )
}

export default function InterviewPrepPage() {
  return (
    <Suspense fallback={<Loading label="Loading interview prep…" />}>
      <InterviewPrepContent />
    </Suspense>
  )
}
