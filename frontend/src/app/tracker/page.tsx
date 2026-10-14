'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Archive,
  Briefcase,
  CheckCircle2,
  FileText,
  Plus,
  Send,
  Trash2,
  UserCheck,
  CalendarClock,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ErrorBanner from '@/components/ui/ErrorBanner'
import Modal from '@/components/ui/Modal'
import StatCard from '@/components/ui/StatCard'
import { SelectField, TextArea, TextField } from '@/components/ui/Field'
import { Loading } from '@/components/ui/Loading'
import { applicationsApi, type ApplicationDraft } from '@/lib/api'
import { useResumeList } from '@/hooks/useResumes'
import type { ApplicationStatus, JobApplication } from '@/types'

const STAGES: { key: ApplicationStatus; label: string; icon: typeof Send; color: string }[] = [
  { key: 'wishlist', label: 'Wishlist', icon: Briefcase, color: '#64748b' },
  { key: 'applied', label: 'Applied', icon: Send, color: '#0ea5e9' },
  { key: 'interview', label: 'Interview', icon: UserCheck, color: '#8b5cf6' },
  { key: 'offer', label: 'Offer', icon: CheckCircle2, color: '#10b981' },
  { key: 'rejected', label: 'Archived', icon: Archive, color: '#ef4444' },
]

const EMPTY_FORM: ApplicationDraft = {
  companyName: '',
  roleTitle: '',
  location: '',
  salary: '',
  status: 'applied',
  notes: '',
  resumeId: null,
}

function StagePill({ status }: { status: ApplicationStatus }) {
  const stage = STAGES.find((s) => s.key === status) ?? STAGES[0]
  const Icon = stage.icon
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: `${stage.color}14`, borderColor: stage.color, color: stage.color }}
    >
      <Icon className="w-3 h-3" />
      {stage.label}
    </span>
  )
}

export default function TrackerPage() {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ApplicationDraft>(EMPTY_FORM)
  const [busy, setBusy] = useState<null | 'save' | string>(null)
  const [pendingDelete, setPendingDelete] = useState<JobApplication | null>(null)
  const { resumes } = useResumeList()

  const fetchApplications = useCallback(async () => {
    try {
      setApplications(await applicationsApi.list())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your pipeline')
    } finally {
      setLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    setError('')
    await fetchApplications()
  }, [fetchApplications])

  useEffect(() => {
    void fetchApplications()
  }, [fetchApplications])

  const stats = useMemo(
    () => ({
      active: applications.filter((a) => a.status !== 'rejected').length,
      interviews: applications.filter((a) => a.status === 'interview').length,
      offers: applications.filter((a) => a.status === 'offer').length,
    }),
    [applications],
  )

  const filtered = filter === 'all' ? applications : applications.filter((a) => a.status === filter)

  const moveStage = async (id: string, status: ApplicationStatus) => {
    setBusy(id)
    setError('')
    setNotice('')
    try {
      const updated = await applicationsApi.update(id, { status })
      setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the stage')
    } finally {
      setBusy(null)
    }
  }

  const saveApplication = async () => {
    if (!form.companyName.trim() || !form.roleTitle.trim()) {
      setError('Please enter company name and role title.')
      return
    }
    setBusy('save')
    setError('')
    try {
      const created = await applicationsApi.create({ ...form, dateApplied: new Date().toISOString().slice(0, 10) })
      setApplications((prev) => [created, ...prev])
      setForm(EMPTY_FORM)
      setModalOpen(false)
      setNotice('Application added to your pipeline.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the application')
    } finally {
      setBusy(null)
    }
  }

  const deleteApplication = async () => {
    if (!pendingDelete) return
    setBusy(pendingDelete.id)
    setError('')
    try {
      await applicationsApi.remove(pendingDelete.id)
      setApplications((prev) => prev.filter((a) => a.id !== pendingDelete.id))
      setPendingDelete(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the application')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Job Pipeline</h1>
            <p className="text-zinc-600 mt-1">Application tracker</p>
          </div>
          <Button onClick={() => setModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
            Add Role
          </Button>
        </div>

        {error && (
          <div className="space-y-2">
            <ErrorBanner message={error} />
            {!loading && (
              <Button size="sm" variant="outline" onClick={() => void load()}>
                Retry
              </Button>
            )}
          </div>
        )}
        {notice && <p className="text-[13px] font-medium text-emerald-600">{notice}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Active Pipeline"
            value={stats.active}
            subtitle="Live applications"
            icon={<Briefcase className="w-4 h-4" />}
          />
          <StatCard
            title="Interviews"
            value={stats.interviews}
            subtitle="Scheduled / round 2"
            icon={<UserCheck className="w-4 h-4" />}
            accent="#8b5cf6"
          />
          <StatCard
            title="Offers"
            value={stats.offers}
            subtitle="Received offers"
            icon={<CheckCircle2 className="w-4 h-4" />}
            accent="#10b981"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition-colors ${
              filter === 'all' ? 'bg-primary text-white border-primary' : 'bg-white border-border text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            All ({applications.length})
          </button>
          {STAGES.map((stage) => {
            const count = applications.filter((a) => a.status === stage.key).length
            return (
              <button
                key={stage.key}
                type="button"
                onClick={() => setFilter(stage.key)}
                className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition-colors ${
                  filter === stage.key
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white border-border text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {stage.label} ({count})
              </button>
            )
          })}
        </div>

        {loading ? (
          <Loading label="Loading your pipeline…" />
        ) : filtered.length === 0 ? (
          <Card elevated={false} tone="muted" className="text-center py-12">
            <span className="inline-grid place-items-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
              <Briefcase className="w-5 h-5" />
            </span>
            <h3 className="font-semibold text-zinc-900">No applications in this stage</h3>
            <p className="text-sm text-zinc-500 mt-1">Use “Add Role” to log a new application or change the filter.</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map((app) => (
              <Card key={app.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-zinc-900">{app.companyName}</h3>
                    <p className="text-[13px] font-semibold text-primary">{app.roleTitle}</p>
                    <p className="text-[12px] text-zinc-500 mt-0.5">
                      {[app.location, app.salary].filter(Boolean).join('  •  ')}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <StagePill status={app.status} />
                      {app.dateApplied && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                          <CalendarClock className="w-3 h-3" />
                          {app.dateApplied}
                        </span>
                      )}
                      {app.resumeId && (
                        <Link
                          href={`/preview?id=${app.resumeId}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                        >
                          <FileText className="w-3 h-3" />
                          {app.resumeTitle || 'Tailored resume'}
                        </Link>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(app)}
                    className="text-zinc-400 hover:text-error p-1"
                    aria-label={`Delete ${app.companyName}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {app.notes && (
                  <p className="mt-3 rounded-xl bg-surface border border-border px-3.5 py-2.5 text-[13px] text-zinc-600 whitespace-pre-wrap">
                    {app.notes}
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mr-1">Move stage:</span>
                  {STAGES.map((stage) => {
                    const Icon = stage.icon
                    const active = app.status === stage.key
                    return (
                      <button
                        key={stage.key}
                        type="button"
                        disabled={busy === app.id}
                        onClick={() => moveStage(app.id, stage.key)}
                        title={stage.label}
                        aria-label={`Move to ${stage.label}`}
                        className="w-8 h-8 rounded-lg grid place-items-center border transition-colors disabled:opacity-50"
                        style={{
                          backgroundColor: active ? stage.color : '#fff',
                          borderColor: stage.color,
                          color: active ? '#fff' : stage.color,
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    )
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Job Application"
        footer={
          <>
            <Button variant="outline" block onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button block loading={busy === 'save'} onClick={saveApplication}>
              Save Application
            </Button>
          </>
        }
      >
        <TextField
          label="Company Name *"
          value={form.companyName}
          placeholder="e.g. Netflix, Airbnb"
          onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
        />
        <TextField
          label="Role Title *"
          value={form.roleTitle}
          placeholder="e.g. Senior Backend Engineer"
          onChange={(e) => setForm((f) => ({ ...f, roleTitle: e.target.value }))}
        />
        <div className="grid sm:grid-cols-2 gap-x-4">
          <TextField
            label="Location"
            value={form.location ?? ''}
            placeholder="Remote / City"
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          />
          <TextField
            label="Target Compensation"
            value={form.salary ?? ''}
            placeholder="$160k - $190k"
            onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
          />
        </div>
        <SelectField
          label="Current Application Stage"
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ApplicationStatus }))}
        >
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </SelectField>
        {resumes.length > 0 && (
          <SelectField
            label="Attach Tailored Resume (Optional)"
            value={form.resumeId ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, resumeId: e.target.value || null }))}
          >
            <option value="">None</option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </SelectField>
        )}
        <TextArea
          label="Notes & Next Steps"
          rows={3}
          value={form.notes ?? ''}
          placeholder="Recruiter contact, interview dates, specific requirements…"
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </Modal>

      <Modal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete application"
        footer={
          <>
            <Button variant="outline" block onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" block loading={busy === pendingDelete?.id} onClick={deleteApplication}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-600">
          Remove <span className="font-semibold">{pendingDelete?.companyName}</span> from your pipeline?
        </p>
      </Modal>
    </>
  )
}
