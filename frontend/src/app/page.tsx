'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Briefcase,
  Copy,
  FileText,
  FileUp,
  Mail,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trash2,
  Users,
  Eye,
  Gauge,
  Check,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ErrorBanner from '@/components/ui/ErrorBanner'
import AtsGauge from '@/components/ui/AtsGauge'
import StatCard from '@/components/ui/StatCard'
import Modal from '@/components/ui/Modal'
import { Loading } from '@/components/ui/Loading'
import { useResumeList } from '@/hooks/useResumes'
import { resumesApi } from '@/lib/api'
import { getUserId } from '@/lib/user-id'
import type { ResumeMeta } from '@/types'

const TOOLKIT = [
  { href: '/cover-letter', title: 'Cover Letter', sub: '1-Click Match', icon: Mail, tint: '#EEF2FF', color: '#4f46e5' },
  { href: '/interview-prep', title: 'Interview Prep', sub: 'STAR Simulator', icon: Users, tint: '#FAF5FF', color: '#7c3aed' },
  { href: '/tracker', title: 'Job Pipeline', sub: 'Kanban Board', icon: Briefcase, tint: '#F0FDF4', color: '#059669' },
  { href: '/recruiter-audit', title: 'Recruiter Scan', sub: '6s Cold Read', icon: Search, tint: '#FFF7ED', color: '#ea580c' },
  { href: '/outreach', title: 'Cold Outreach', sub: 'LinkedIn & Pitch', icon: Megaphone, tint: '#FDF2F8', color: '#db2777' },
  { href: '/import', title: 'Import Text', sub: 'Auto-Fill Fields', icon: FileUp, tint: '#F0F9FF', color: '#0284c7' },
]

const AI_SHORTCUTS = [
  { href: 'cover-letter', label: 'Cover Letter', icon: Mail },
  { href: 'interview-prep', label: 'Prep', icon: Users },
  { href: 'recruiter-audit', label: 'Scan', icon: Search },
  { href: 'outreach', label: 'Pitch', icon: Megaphone },
]

export default function DashboardPage() {
  const router = useRouter()
  const { resumes, loading, error, reload } = useResumeList()
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<null | string>(null)
  const [actionError, setActionError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<ResumeMeta | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return resumes
    return resumes.filter(
      (r) => r.title.toLowerCase().includes(q) || (r.targetRole ?? '').toLowerCase().includes(q),
    )
  }, [resumes, query])

  const stats = useMemo(() => {
    const scored = resumes.filter((r) => typeof r.score === 'number')
    const avg = scored.length ? Math.round(scored.reduce((s, r) => s + (r.score ?? 0), 0) / scored.length) : 0
    return {
      total: resumes.length,
      avg,
      ready: resumes.filter((r) => (r.score ?? 0) >= 80).length,
    }
  }, [resumes])

  const handleDelete = async () => {
    if (!pendingDelete) return
    setBusy(pendingDelete.id)
    setActionError('')
    try {
      await resumesApi.remove(getUserId(), pendingDelete.id)
      setPendingDelete(null)
      await reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to delete resume')
    } finally {
      setBusy(null)
    }
  }

  const handleClone = async (resume: ResumeMeta) => {
    setBusy(resume.id)
    setActionError('')
    try {
      const clone = await resumesApi.clone(getUserId(), resume.id, undefined, resume.targetRole ?? null)
      await reload()
      router.push(`/builder?id=${clone.id}`)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to duplicate resume')
      setBusy(null)
    }
  }

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="relative overflow-hidden rounded-3xl bg-zinc-900 text-white px-6 sm:px-10 py-10">
          <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-primary/30 blur-3xl" aria-hidden />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[11px] font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              ATS SCORE MAXIMIZER
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">Build Resumes That Beat the Bot</h1>
            <p className="mt-2 text-zinc-300 max-w-2xl">
              Keyword-matched, single-column formatted, and tailored for 100% ATS readability.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/builder"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark px-5 py-3 rounded-xl font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create New Resume
              </Link>
              <Link
                href="/import"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-3 rounded-xl font-semibold transition-colors"
              >
                <FileUp className="w-4 h-4" />
                Import Text
              </Link>
              <Link
                href="/matcher"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-3 rounded-xl font-semibold transition-colors"
              >
                <Target className="w-4 h-4" />
                Match with JD
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Resumes" value={stats.total} subtitle="Saved profiles" icon={<FileText className="w-4 h-4" />} />
          <StatCard
            title="Avg ATS Score"
            value={stats.avg || '—'}
            subtitle={stats.avg >= 80 ? 'Top 15% tier' : 'Needs polish'}
            icon={<Gauge className="w-4 h-4" />}
            accent={stats.avg >= 80 ? '#10b981' : '#f59e0b'}
          />
          <StatCard
            title="ATS Ready"
            value={stats.ready}
            subtitle="High compatibility"
            icon={<Check className="w-4 h-4" />}
            accent="#0ea5e9"
          />
        </section>

        <section>
          <h2 className="text-lg font-bold tracking-tight text-zinc-900">AI Career Toolkit</h2>
          <p className="text-[13px] text-zinc-500 mt-0.5 mb-4">High-impact accelerators for your job search</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {TOOLKIT.map(({ href, title, sub, icon: Icon, tint, color }) => (
              <Link
                key={href}
                href={href}
                className="rounded-2xl border border-border bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <span
                  className="w-9 h-9 rounded-lg grid place-items-center mb-3"
                  style={{ backgroundColor: tint, color }}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <p className="font-semibold text-zinc-900 text-sm">{title}</p>
                <p className="text-[12px] text-zinc-500">{sub}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-900">Your Resumes</h2>
              <p className="text-[13px] text-zinc-500 mt-0.5">{filtered.length} profile(s) ready</p>
            </div>
            {resumes.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by role or title…"
                    className="pl-9 pr-8 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>
                <Button variant="secondary" size="sm" onClick={() => void reload()} icon={<RefreshCw className="w-3.5 h-3.5" />}>
                  Refresh
                </Button>
              </div>
            )}
          </div>

          {error && <ErrorBanner message={error} />}
          {actionError && <ErrorBanner message={actionError} />}

          {loading ? (
            <Loading label="Loading your resumes…" />
          ) : filtered.length === 0 ? (
            <Card elevated={false} tone="muted" className="text-center py-12">
              <span className="inline-grid place-items-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
                <FileText className="w-6 h-6" />
              </span>
              <h3 className="font-semibold text-zinc-900">No resumes found</h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
                {resumes.length > 0
                  ? 'No resumes match your search. Clear the filter to view all.'
                  : 'Create your first ATS-optimized resume in minutes with AI assistance.'}
              </p>
              <Link
                href="/builder"
                className="inline-flex items-center gap-2 mt-5 bg-primary hover:bg-primary-dark px-5 py-2.5 rounded-xl text-white font-semibold text-sm"
              >
                <Sparkles className="w-4 h-4" />
                Create First Resume
              </Link>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filtered.map((resume) => {
                const q = `id=${resume.id}`
                return (
                  <Card key={resume.id}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-zinc-900 truncate">{resume.title}</h3>
                          {resume.parentId && (
                            <span className="rounded-full bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 text-[10px] font-bold">
                              VARIANT
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-zinc-500 mt-0.5">
                          {resume.targetRole ? (
                            <span className="inline-flex items-center gap-1">
                              <Target className="w-3.5 h-3.5" />
                              {resume.targetRole}
                            </span>
                          ) : (
                            <em>General Purpose Resume</em>
                          )}
                        </p>
                        {resume.updatedAt && (
                          <p className="text-[11px] text-zinc-400 mt-1">Updated {new Date(resume.updatedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                      <AtsGauge score={resume.score ?? 85} size="sm" showLabel={false} />
                    </div>

                    <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center gap-2">
                      <Link
                        href={`/builder?${q}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold bg-primary text-white hover:bg-primary-dark"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit Resume
                      </Link>
                      <Link
                        href={`/preview?${q}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold border border-border bg-surface text-zinc-800 hover:bg-zinc-50"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                      </Link>
                      <button
                        type="button"
                        disabled={busy === resume.id}
                        onClick={() => void handleClone(resume)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold border border-border text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                        title="Duplicate resume as a tailored variant"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(resume)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold text-error hover:bg-error/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>

                    <div className="mt-4 rounded-xl bg-surface border border-border p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                        AI Action Shortcuts
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {AI_SHORTCUTS.map(({ href, label, icon: Icon }) => (
                          <Link
                            key={href}
                            href={`${href}?${q}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15"
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <Modal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete resume"
        footer={
          <>
            <Button variant="outline" block onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" block loading={busy === pendingDelete?.id} onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-600">
          Are you sure you want to delete <span className="font-semibold">{pendingDelete?.title}</span>? This cannot be undone.
        </p>
      </Modal>
    </>
  )
}
