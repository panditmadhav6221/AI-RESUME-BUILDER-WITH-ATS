'use client'

import { Suspense, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FileText, Gauge, Plus, Sparkles, Target, Wand2 } from 'lucide-react'
import PageShell from '@/components/PageShell'
import ResumeBanner from '@/components/ResumeBanner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ErrorBanner from '@/components/ui/ErrorBanner'
import AtsGauge from '@/components/ui/AtsGauge'
import { Chip } from '@/components/ui/Chip'
import SectionHeading from '@/components/ui/SectionHeading'
import { TextArea } from '@/components/ui/Field'
import { Loading } from '@/components/ui/Loading'
import { useActiveResume } from '@/hooks/useResumes'
import { aiApi, atsApi, resumesApi } from '@/lib/api'
import { getUserId } from '@/lib/user-id'
import { resumeToPlainText } from '@/lib/resume-text'
import { MATCHER_TEXT_KEY } from '@/lib/storage-keys'
import type { JDAnalysis } from '@/types'

const subscribeToStorage = (onChange: () => void) => {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}

const readHandedText = () => {
  const handed = sessionStorage.getItem(MATCHER_TEXT_KEY)
  if (!handed) return ''
  sessionStorage.removeItem(MATCHER_TEXT_KEY)
  return handed
}

function MatcherContent() {
  const params = useSearchParams()
  const resume = useActiveResume(params.get('id'))

  const [jd, setJd] = useState('')
  const [analysis, setAnalysis] = useState<JDAnalysis | null>(null)
  const [busy, setBusy] = useState<null | 'match' | 'insert' | 'score'>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const importedText = useSyncExternalStore(subscribeToStorage, readHandedText, () => '')

  const resumeText = resume.data ? resumeToPlainText(resume.data) : importedText

  const runMatch = async () => {
    if (!jd.trim()) {
      setError('Please paste a Job Description first.')
      return
    }
    setBusy('match')
    setError('')
    setNotice('')
    try {
      setAnalysis(await aiApi.analyzeJd(jd.trim(), resumeText, getUserId(), resume.targetRole || null))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to analyze the job description')
    } finally {
      setBusy(null)
    }
  }

  const insertMissingSkills = async () => {
    if (!analysis || !resume.refId) return
    setBusy('insert')
    setError('')
    try {
      const result = await resumesApi.insertKeywords(
        getUserId(),
        resume.refId,
        analysis.missingSkills.map((s) => s.name),
        'skills',
      )
      if (result.data) resume.setData(result.data)
      setNotice(
        result.insertedKeywords.length
          ? `Added ${result.insertedKeywords.length} skill(s) to your resume: ${result.insertedKeywords.join(', ')}`
          : result.message,
      )
      setAnalysis(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to insert keywords')
    } finally {
      setBusy(null)
    }
  }

  const checkAts = async () => {
    if (!resume.data) return
    setBusy('score')
    setError('')
    try {
      const result = await atsApi.score(resume.data, resume.refId, getUserId())
      const lines = result.issues.slice(0, 6).map((i) => `• ${i.message} — ${i.fix}`)
      setNotice([`ATS Score: ${result.score}/100`, result.summary, ...lines].join('\n'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to calculate ATS score')
    } finally {
      setBusy(null)
    }
  }

  const matchHeadline = !analysis
    ? ''
    : analysis.matchPercentage >= 75
      ? 'High Keyword Alignment'
      : analysis.matchPercentage >= 50
        ? 'Moderate Match'
        : 'Low Match — Gaps Found'

  return (
    <PageShell
      title="Job Matcher"
      subtitle="Keyword & skill gap audit"
      banner={<ResumeBanner resume={resume} eyebrow="Comparing against resume" icon={<FileText className="w-5 h-5" />} />}
    >
      <div className="space-y-6">
        {error && <ErrorBanner message={error} />}
        {notice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-[13px] font-medium text-emerald-800 whitespace-pre-wrap">{notice}</p>
          </div>
        )}

        <Card>
          <SectionHeading
            title="Paste Job Description (JD)"
            subtitle="The AI will extract required keywords, hard & soft skills, and compare them against your resume."
          />
          {importedText && !resume.data && (
            <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-[13px] text-zinc-700">
              Using the text imported from the ATS Scan. Add a saved resume to enable one-click keyword insertion.
            </div>
          )}
          <TextArea
            rows={8}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste complete job description requirements here (Responsibilities, Qualifications, Technical Stack)…"
          />
          <Button loading={busy === 'match'} onClick={runMatch} icon={<Target className="w-4 h-4" />}>
            Run ATS Keyword Match
          </Button>
        </Card>

        {busy === 'match' && !analysis && <Loading label="Scanning & matching with JD…" />}

        {analysis && (
          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap items-center gap-6">
                <AtsGauge score={analysis.matchPercentage} size="lg" showLabel={false} />
                <div className="flex-1 min-w-[220px]">
                  <h3 className="font-bold text-zinc-900">{matchHeadline}</h3>
                  <p className="text-[13px] text-zinc-500">
                    {analysis.matchedSkills.length} of{' '}
                    {analysis.matchedSkills.length + analysis.missingSkills.length} key terms present in your resume.
                  </p>
                </div>
                {analysis.missingSkills.length > 0 && resume.refId && (
                  <Button
                    variant="sparkle"
                    loading={busy === 'insert'}
                    onClick={insertMissingSkills}
                    icon={<Wand2 className="w-4 h-4" />}
                  >
                    1-Tap Insert Missing Skills
                  </Button>
                )}
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <h3 className="font-semibold text-zinc-900">Matched Keywords ({analysis.matchedSkills.length})</h3>
                <p className="text-[13px] text-zinc-500 mt-0.5 mb-3">
                  Skills found in both the job description and your resume
                </p>
                {analysis.matchedSkills.length === 0 ? (
                  <p className="text-sm text-zinc-400 italic">No direct keyword matches yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {analysis.matchedSkills.map((s) => (
                      <Chip key={s.name} label={s.name} tone="match" />
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <h3 className="font-semibold text-zinc-900">Missing Skills &amp; Keywords ({analysis.missingSkills.length})</h3>
                <p className="text-[13px] text-zinc-500 mt-0.5 mb-3">
                  Key requirements found in the JD that are absent from your resume
                </p>
                {analysis.missingSkills.length === 0 ? (
                  <p className="text-sm text-zinc-400 italic">
                    Incredible! You match all extracted skill keywords.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {analysis.missingSkills.map((s) => (
                      <Chip key={s.name} label={s.name} tone="missing" icon={<Plus className="w-3 h-3" />} />
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {analysis.suggestions.length > 0 && (
              <Card>
                <h3 className="font-semibold text-zinc-900">AI Actionable Recommendations</h3>
                <p className="text-[13px] text-zinc-500 mt-0.5 mb-3">
                  Strategic tweaks to increase candidate ranking
                </p>
                <ul className="space-y-2">
                  {analysis.suggestions.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-[13px] text-zinc-700">
                      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {resume.data && (
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" loading={busy === 'score'} onClick={checkAts} icon={<Gauge className="w-4 h-4" />}>
                  Check Overall ATS Score
                </Button>
                <Link
                  href={`/preview${resume.refId ? `?id=${resume.refId}` : ''}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-border bg-surface text-zinc-800 hover:bg-zinc-50"
                >
                  Preview Resume
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  )
}

export default function MatcherPage() {
  return (
    <Suspense fallback={<Loading label="Loading matcher…" />}>
      <MatcherContent />
    </Suspense>
  )
}
