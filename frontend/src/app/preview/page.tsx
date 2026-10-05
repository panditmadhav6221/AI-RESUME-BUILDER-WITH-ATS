'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileDown,
  FileText,
  Gauge,
  Pencil,
  Save,
  Target,
  TriangleAlert,
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ErrorBanner from '@/components/ui/ErrorBanner'
import AtsGauge from '@/components/ui/AtsGauge'
import CopyButton from '@/components/ui/CopyButton'
import { Loading } from '@/components/ui/Loading'
import ResumeDocument from '@/components/ResumeDocument'
import { atsApi, downloadBlob, exportApi, resumesApi } from '@/lib/api'
import { getUserId } from '@/lib/user-id'
import { slugify } from '@/lib/id'
import { estimatePages, resumeToPlainText } from '@/lib/resume-text'
import type { ATSAnalysis, ResumeData, TemplateId } from '@/types'

import { BUILDER_DRAFT_KEY } from '@/lib/storage-keys'
const TEMPLATES: TemplateId[] = ['modern', 'classic', 'minimal']

function PreviewContent() {
  const params = useSearchParams()
  const resumeId = params.get('id')

  const [data, setData] = useState<ResumeData | null>(null)
  const [title, setTitle] = useState('Untitled Resume')
  const [template, setTemplate] = useState<TemplateId>('modern')
  const [isNew, setIsNew] = useState(false)
  const [scored, setScored] = useState<{ source: ResumeData; result: ATSAnalysis } | null>(null)
  const [busy, setBusy] = useState<null | 'pdf' | 'docx' | 'save'>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        if (resumeId) {
          const full = await resumesApi.get(getUserId(), resumeId)
          if (cancelled) return
          setData(full.data)
          setTitle(full.title)
          setTemplate((full.template as TemplateId) ?? 'modern')
          setIsNew(false)
        } else {
          const raw = localStorage.getItem(BUILDER_DRAFT_KEY)
          if (raw && !cancelled) {
            const parsed = JSON.parse(raw)
            if (parsed?.data) {
              setData(parsed.data)
              setTitle(parsed.title || 'Untitled Resume')
              setTemplate(parsed.template ?? 'modern')
              setIsNew(true)
            }
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load resume')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [resumeId])

  const score = useCallback(async (resumeData: ResumeData) => {
    try {
      const result = await atsApi.score(resumeData, resumeId, getUserId())
      setScored({ source: resumeData, result })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to score resume')
    }
  }, [resumeId])

  useEffect(() => {
    if (!data) return
    void score(data)
  }, [data, score])

  const scoring = data !== null && scored?.source !== data
  const analysis = scored?.result ?? null

  const text = useMemo(() => (data ? resumeToPlainText(data) : ''), [data])
  const { pages } = useMemo(() => estimatePages(text), [text])

  const handleExport = async (kind: 'pdf' | 'docx') => {
    if (!data) return
    setBusy(kind)
    setError('')
    try {
      const file = kind === 'pdf' ? await exportApi.pdf(data) : await exportApi.docx(data)
      downloadBlob(file, `${slugify(title)}.${kind}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to export ${kind.toUpperCase()}`)
    } finally {
      setBusy(null)
    }
  }

  const handleSave = async () => {
    if (!data) return
    setBusy('save')
    setError('')
    try {
      await resumesApi.save(getUserId(), title.trim() || 'Untitled Resume', data, template, null)
      localStorage.removeItem(BUILDER_DRAFT_KEY)
      setNotice('Saved to your dashboard.')
      setIsNew(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save resume')
    } finally {
      setBusy(null)
    }
  }

  if (!data) {
    return (
      <>
        <Navbar />
        {error ? (
          <main className="flex-1 max-w-2xl mx-auto px-4 py-12 space-y-4">
            <ErrorBanner message={error} />
            <Link href="/builder" className="text-primary font-semibold text-sm">
              ← Back to Builder
            </Link>
          </main>
        ) : (
          <Loading label="Preparing preview…" />
        )}
      </>
    )
  }

  const errors = analysis?.issues.filter((i) => i.severity === 'error') ?? []
  const warnings = analysis?.issues.filter((i) => i.severity === 'warning') ?? []
  const scoreValue = analysis?.score

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Executive Preview</h1>
            <p className="text-zinc-600 mt-1">ATS scan &amp; A4 layout</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={isNew ? '/builder' : `/builder${resumeId ? `?id=${resumeId}` : ''}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold border border-border bg-surface text-zinc-800 hover:bg-zinc-50"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Link>
            <Link
              href={`/matcher${resumeId ? `?id=${resumeId}` : ''}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold border border-primary text-primary hover:bg-primary/5"
            >
              <Target className="w-3.5 h-3.5" />
              Match JD
            </Link>
            {isNew ? (
              <Button loading={busy === 'save'} onClick={handleSave} icon={<Save className="w-4 h-4" />}>
                Save to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  loading={busy === 'docx'}
                  onClick={() => handleExport('docx')}
                  icon={<FileText className="w-4 h-4" />}
                >
                  DOCX
                </Button>
                <Button loading={busy === 'pdf'} onClick={() => handleExport('pdf')} icon={<FileDown className="w-4 h-4" />}>
                  Export PDF
                </Button>
              </>
            )}
          </div>
        </div>

        {error && <ErrorBanner message={error} />}
        {notice && <p className="text-[13px] font-medium text-emerald-600">{notice}</p>}

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-6">
            <AtsGauge score={scoreValue ?? 85} size="lg" showLabel={false} />
            <div className="flex-1 min-w-[220px]">
              <h2 className="font-bold text-zinc-900">{title}</h2>
              <p className="text-zinc-600">{data.contact.fullName || 'Target Candidate'}</p>
              <p
                className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
                  pages <= 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {pages <= 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {pages <= 1 ? 'Fits on 1 ATS Page' : `Estimated ${pages} pages`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Design Template</p>
              <div className="mt-2 inline-flex gap-1 bg-surface p-0.5 rounded-xl border border-border">
                {TEMPLATES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTemplate(t)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-colors ${
                      t === template ? 'bg-primary text-white' : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {scoring ? (
            <p className="mt-4 text-[13px] text-zinc-500">Scoring resume…</p>
          ) : analysis ? (
            <>
              <p className="mt-4 text-[13px] text-zinc-600">{analysis.summary}</p>
              {(errors.length > 0 || warnings.length > 0) && (
                <p className="mt-1 text-[13px] text-zinc-500">
                  Found {errors.length} critical item{errors.length === 1 ? '' : 's'} &amp; {warnings.length}{' '}
                  recommendation{warnings.length === 1 ? '' : 's'}.
                </p>
              )}
              {analysis.passedChecks.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {analysis.passedChecks.map((check) => (
                    <span
                      key={check}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {check}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </Card>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          <Card elevated={false} tone="muted" className="overflow-x-auto">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Paper Preview</p>
              <CopyButton text={text} label="Copy plain text" />
            </div>
            <div className="min-w-[640px]">
              <ResumeDocument data={data} template={template} />
            </div>
          </Card>

          <div className="space-y-4 lg:sticky lg:top-24">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Gauge className="w-4 h-4 text-primary" />
                <h2 className="font-bold text-zinc-900">ATS Diagnostic Details</h2>
              </div>
              <p className="text-[13px] text-zinc-500 -mt-1 mb-4">Fix these to maximize interview callback rates</p>
              {!analysis || analysis.issues.length === 0 ? (
                <p className="text-sm text-zinc-500">No issues detected. Nice work!</p>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto scrollbar-thin pr-1">
                  {analysis.issues.map((issue) => {
                    const isError = issue.severity === 'error'
                    return (
                      <div
                        key={issue.id}
                        className={`rounded-xl border p-3 ${
                          isError ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isError ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          ) : (
                            <TriangleAlert className="w-3.5 h-3.5 text-amber-600" />
                          )}
                          <p
                            className={`text-[10px] font-bold uppercase tracking-widest ${
                              isError ? 'text-red-700' : 'text-amber-700'
                            }`}
                          >
                            {issue.severity}
                          </p>
                        </div>
                        <p className="mt-1.5 text-[13px] font-semibold text-zinc-800">{issue.message}</p>
                        <p className="mt-1.5 rounded-lg bg-white/70 px-2.5 py-1.5 text-[12px] text-zinc-600">
                          <span className="font-semibold">Fix:</span> {issue.fix}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            <Card tone="muted">
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Export</p>
              <p className="text-[13px] text-zinc-600 mb-3">
                Downloads are generated by the backend, so the layout matches what recruiters receive.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isNew}
                  loading={busy === 'docx'}
                  onClick={() => handleExport('docx')}
                  icon={<FileText className="w-3.5 h-3.5" />}
                >
                  DOCX
                </Button>
                <Button
                  size="sm"
                  disabled={isNew}
                  loading={busy === 'pdf'}
                  onClick={() => handleExport('pdf')}
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  PDF
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </>
  )
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<Loading label="Loading preview…" />}>
      <PreviewContent />
    </Suspense>
  )
}
