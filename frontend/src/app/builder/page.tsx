'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Award,
  Eye,
  FileText,
  FolderGit2,
  GraduationCap,
  Plus,
  Save,
  Sparkles,
  Target,
  User,
  Wand2,
  X,
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ErrorBanner from '@/components/ui/ErrorBanner'
import PillTabs from '@/components/ui/PillTabs'
import SectionHeading from '@/components/ui/SectionHeading'
import { TextArea, TextField } from '@/components/ui/Field'
import { Chip } from '@/components/ui/Chip'
import AiDiffModal, { AiNotice, type PendingAiChange } from '@/components/ui/AiDiffModal'
import { Loading } from '@/components/ui/Loading'
import { aiApi, resumesApi } from '@/lib/api'
import { getUserId } from '@/lib/user-id'
import { buildSourceText } from '@/lib/resume-text'
import { BUILDER_DRAFT_KEY } from '@/lib/storage-keys'
import { emptyResumeData, nextId } from '@/lib/id'
import type { ResumeData, TemplateId } from '@/types'

type TabKey = 'contact' | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications'
type Busy = null | 'load' | 'save' | 'summary' | 'skills' | 'bullets'

const TABS = [
  { key: 'contact', label: 'Contact', icon: <User className="w-3.5 h-3.5" /> },
  { key: 'summary', label: 'Summary', icon: <FileText className="w-3.5 h-3.5" /> },
  { key: 'experience', label: 'Experience', icon: <FolderGit2 className="w-3.5 h-3.5" /> },
  { key: 'education', label: 'Education', icon: <GraduationCap className="w-3.5 h-3.5" /> },
  { key: 'skills', label: 'Skills', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { key: 'projects', label: 'Projects', icon: <FolderGit2 className="w-3.5 h-3.5" /> },
  { key: 'certifications', label: 'Certs', icon: <Award className="w-3.5 h-3.5" /> },
] as const

interface Draft {
  id: string | null
  title: string
  targetRole: string
  template: TemplateId
  data: ResumeData
}

function BuilderContent() {
  const router = useRouter()
  const params = useSearchParams()
  const resumeId = params.get('id')

  const [tab, setTab] = useState<TabKey>('contact')
  const [draft, setDraft] = useState<Draft>({
    id: null,
    title: 'Untitled Resume',
    targetRole: '',
    template: 'modern',
    data: emptyResumeData(),
  })
  const [hydrated, setHydrated] = useState(false)
  const [busy, setBusy] = useState<Busy>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [skillInput, setSkillInput] = useState('')
  const [pendingChange, setPendingChange] = useState<PendingAiChange | null>(null)

  useEffect(() => {
    let cancelled = false
    const hydrate = async () => {
      if (resumeId) {
        setBusy('load')
        try {
          const full = await resumesApi.get(getUserId(), resumeId)
          if (cancelled) return
          setDraft({
            id: full.id,
            title: full.title,
            targetRole: full.targetRole ?? '',
            template: (full.template as TemplateId) ?? 'modern',
            data: full.data ?? emptyResumeData(),
          })
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load resume')
        } finally {
          if (!cancelled) setBusy(null)
        }
      } else {
        try {
          const raw = localStorage.getItem(BUILDER_DRAFT_KEY)
          if (raw && !cancelled) {
            const parsed = JSON.parse(raw) as Draft
            if (parsed?.data) setDraft({ ...parsed, id: null })
          }
        } catch {
          // ignore corrupt draft
        }
      }
      if (!cancelled) setHydrated(true)
    }
    void hydrate()
    return () => {
      cancelled = true
    }
  }, [resumeId])

  useEffect(() => {
    if (!hydrated || draft.id) return
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(BUILDER_DRAFT_KEY, JSON.stringify(draft))
      } catch {
        // storage full / private mode
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [draft, hydrated])

  const patch = useCallback((update: Partial<ResumeData>) => {
    setDraft((d) => ({ ...d, data: { ...d.data, ...update } }))
  }, [])

  const updateListItem = useCallback(
    <K extends 'experience' | 'education' | 'projects' | 'certifications'>(key: K, index: number, fields: Partial<ResumeData[K][number]>) => {
      setDraft((d) => {
        const next = [...d.data[key]]
        next[index] = { ...next[index], ...fields }
        return { ...d, data: { ...d.data, [key]: next } }
      })
    },
    [],
  )

  const removeListItem = useCallback(
    (key: 'experience' | 'education' | 'projects' | 'certifications', index: number) => {
      setDraft((d) => ({ ...d, data: { ...d.data, [key]: d.data[key].filter((_, i) => i !== index) } }))
    },
    [],
  )

  const handleSave = async () => {
    setBusy('save')
    setError('')
    setSaved('')
    try {
      const userId = getUserId()
      const title = draft.title.trim() || 'Untitled Resume'
      if (draft.id) {
        await resumesApi.update(userId, draft.id, {
          title,
          data: draft.data,
          template: draft.template,
          targetRole: draft.targetRole || null,
        })
        localStorage.removeItem(BUILDER_DRAFT_KEY)
        setSaved('Resume updated.')
      } else {
        const created = await resumesApi.save(userId, title, draft.data, draft.template, draft.targetRole || null)
        localStorage.removeItem(BUILDER_DRAFT_KEY)
        setDraft((d) => ({ ...d, id: created.id, title }))
        setSaved('Resume saved to your dashboard.')
        router.replace(`/builder?id=${created.id}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save resume')
    } finally {
      setBusy(null)
    }
  }

  const aiSummary = async () => {
    const source = buildSourceText(draft.data)
    if (!source.trim()) {
      setError('Please add some experience or education first so the AI has context.')
      return
    }
    setBusy('summary')
    setError('')
    try {
      const result = await aiApi.generateSummary(source, draft.targetRole || null)
      const improved = result.summary.trim()
      setPendingChange({
        title: 'Rewrite your summary',
        subtitle: 'AI will rewrite the summary to be ATS-friendly and role-targeted',
        original: draft.data.summary,
        proposed: improved,
        accept: () => patch({ summary: improved }),
        regenerate: aiSummary,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate summary')
    } finally {
      setBusy(null)
    }
  }

  const aiSkills = async () => {
    const role = draft.targetRole.trim() || draft.data.experience[0]?.position || ''
    if (!role) {
      setError('Please specify a Target Role at the top of the builder so AI can recommend relevant skills.')
      return
    }
    setBusy('skills')
    setError('')
    try {
      const current = draft.data.skills.map((s) => s.name)
      const result = await aiApi.suggestSkills(role, current)
      const missing = result.skills.filter(
        (s) => s.trim() && !current.some((c) => c.toLowerCase() === s.trim().toLowerCase()),
      )
      if (missing.length === 0) {
        setSaved('All matched — your skills already cover the top AI recommendations.')
        return
      }
      setPendingChange({
        title: 'Add recommended skills',
        subtitle: 'AI picked these ATS keywords for your target role',
        proposed: missing.join('  •  '),
        accept: () =>
          patch({ skills: [...draft.data.skills, ...missing.map((name) => ({ id: nextId('sk'), name }))] }),
        regenerate: aiSkills,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to suggest skills')
    } finally {
      setBusy(null)
    }
  }

  const aiSharpenBullets = async (index: number) => {
    const exp = draft.data.experience[index]
    const raw = exp.bullets.filter((b) => b.trim()).join('\n')
    if (!raw.trim()) {
      setError('Add at least one bullet to sharpen first.')
      return
    }
    setBusy('bullets')
    setError('')
    try {
      const normalize = (value: string) =>
        value
          .trim()
          .split('\n')
          .map((l) => l.replace(/^[-•*]\s*/, '').trim())
          .filter(Boolean)

      const result = await aiApi.improveBullet(raw, exp.position)
      setPendingChange({
        title: 'Sharpen achievement bullets',
        subtitle: 'Action verbs + quantified impact wins ATS ranking',
        original: raw,
        proposed: result.improved.trim(),
        accept: () => updateListItem('experience', index, { bullets: normalize(result.improved) }),
        regenerate: () => aiSharpenBullets(index),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to sharpen bullets')
    } finally {
      setBusy(null)
    }
  }

  const addSkill = () => {
    const name = skillInput.trim()
    if (!name) return
    const exists = draft.data.skills.some((s) => s.name.toLowerCase() === name.toLowerCase())
    if (!exists) patch({ skills: [...draft.data.skills, { id: nextId('sk'), name }] })
    setSkillInput('')
  }

  const previewHref = draft.id ? `/preview?id=${draft.id}` : '/preview?draft=1'

  const d = draft.data

  const panels = {
    contact: (
        <Card>
          <SectionHeading title="Contact Information" subtitle="Essential details for recruiter contact & ATS parsing" />
          <div className="grid sm:grid-cols-2 gap-x-4">
            <TextField
              label="Full Name *"
              value={d.contact.fullName}
              onChange={(e) => patch({ contact: { ...d.contact, fullName: e.target.value } })}
            />
            <TextField
              label="Location (City, State / Country)"
              value={d.contact.location}
              onChange={(e) => patch({ contact: { ...d.contact, location: e.target.value } })}
            />
            <TextField
              label="Email *"
              type="email"
              value={d.contact.email}
              onChange={(e) => patch({ contact: { ...d.contact, email: e.target.value } })}
            />
            <TextField
              label="Phone *"
              type="tel"
              value={d.contact.phone}
              onChange={(e) => patch({ contact: { ...d.contact, phone: e.target.value } })}
            />
            <TextField
              label="LinkedIn URL"
              value={d.contact.linkedin ?? ''}
              onChange={(e) => patch({ contact: { ...d.contact, linkedin: e.target.value } })}
            />
            <TextField
              label="Portfolio / GitHub URL"
              value={d.contact.website ?? ''}
              onChange={(e) => patch({ contact: { ...d.contact, website: e.target.value } })}
            />
          </div>
        </Card>
      ),
      summary: (
        <Card>
          <SectionHeading
            title="Professional Summary"
            subtitle="2-4 sentences highlighting your core impact and target role"
            action={
              <Button size="sm" variant="sparkle" loading={busy === 'summary'} onClick={aiSummary} icon={<Wand2 className="w-3.5 h-3.5" />}>
                AI Generate
              </Button>
            }
          />
          <TextArea
            rows={6}
            value={d.summary}
            onChange={(e) => patch({ summary: e.target.value })}
            placeholder="Results-driven professional with 5+ years of experience in..."
          />
          <AiNotice>
            <span className="font-semibold text-zinc-800">ATS Tip:</span> Include your target job title, years of
            experience, and 2-3 key technical proficiencies in your summary.
          </AiNotice>
        </Card>
      ),
      experience: (
        <Card>
          <SectionHeading
            title="Work Experience"
            subtitle="Quantified bullets starting with strong action verbs"
            action={
              <Button
                size="sm"
                variant="outline"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() =>
                  patch({
                    experience: [
                      ...d.experience,
                      { id: nextId('exp'), company: '', position: '', location: '', startDate: '', endDate: '', current: false, bullets: [] },
                    ],
                  })
                }
              >
                Add Position
              </Button>
            }
          />
          {d.experience.length === 0 ? (
            <p className="text-sm text-zinc-500 rounded-xl border border-dashed border-border p-6 text-center">
              No work experience added yet. Use “Add Position” to build your career history.
            </p>
          ) : (
            <div className="space-y-5">
              {d.experience.map((exp, i) => (
                <div key={exp.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Position {i + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeListItem('experience', i)}
                      className="text-zinc-400 hover:text-error"
                      aria-label="Remove position"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-x-4">
                    <TextField
                      label="Company / Employer *"
                      value={exp.company}
                      onChange={(e) => updateListItem('experience', i, { company: e.target.value })}
                    />
                    <TextField
                      label="Job Title / Role *"
                      value={exp.position}
                      onChange={(e) => updateListItem('experience', i, { position: e.target.value })}
                    />
                    <TextField
                      label="Location"
                      value={exp.location}
                      onChange={(e) => updateListItem('experience', i, { location: e.target.value })}
                    />
                    <TextField
                      label="Start Date (MM/YYYY)"
                      value={exp.startDate}
                      placeholder="03/2021"
                      onChange={(e) => updateListItem('experience', i, { startDate: e.target.value })}
                    />
                    <TextField
                      label={exp.current ? 'End Date (Present)' : 'End Date (MM/YYYY)'}
                      value={exp.current ? 'Present' : exp.endDate}
                      disabled={exp.current}
                      placeholder="02/2024"
                      onChange={(e) => updateListItem('experience', i, { endDate: e.target.value })}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-[13px] font-medium text-zinc-700 mb-4">
                    <input
                      type="checkbox"
                      checked={exp.current}
                      onChange={(e) => updateListItem('experience', i, { current: e.target.checked })}
                      className="w-4 h-4 rounded border-border text-primary"
                    />
                    I currently work here
                  </label>

                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Achievement Bullets</p>
                    <Button
                      size="sm"
                      variant="sparkle"
                      loading={busy === 'bullets'}
                      onClick={() => aiSharpenBullets(i)}
                      icon={<Wand2 className="w-3.5 h-3.5" />}
                    >
                      AI Polish
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {exp.bullets.map((bullet, bi) => (
                      <div key={bi} className="flex items-start gap-2">
                        <span className="text-zinc-400 mt-3">•</span>
                        <TextArea
                          rows={2}
                          value={bullet}
                          onChange={(e) => {
                            const bullets = [...exp.bullets]
                            bullets[bi] = e.target.value
                            updateListItem('experience', i, { bullets })
                          }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateListItem('experience', i, { bullets: exp.bullets.filter((_, k) => k !== bi) })
                          }
                          className="text-zinc-400 hover:text-error mt-3"
                          aria-label="Remove bullet"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => updateListItem('experience', i, { bullets: [...exp.bullets, ''] })}
                  >
                    Add Bullet
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      ),
      education: (
        <Card>
          <SectionHeading
            title="Education"
            subtitle="Degrees, colleges/universities, and graduation dates"
            action={
              <Button
                size="sm"
                variant="outline"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() =>
                  patch({
                    education: [
                      ...d.education,
                      { id: nextId('edu'), institution: '', degree: '', field: '', startDate: '', endDate: '', gpa: '' },
                    ],
                  })
                }
              >
                Add Degree
              </Button>
            }
          />
          <div className="space-y-5">
            {d.education.map((edu, i) => (
              <div key={edu.id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Degree {i + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeListItem('education', i)}
                    className="text-zinc-400 hover:text-error"
                    aria-label="Remove degree"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-x-4">
                  <TextField
                    label="Institution / University *"
                    value={edu.institution}
                    onChange={(e) => updateListItem('education', i, { institution: e.target.value })}
                  />
                  <TextField
                    label="Degree *"
                    value={edu.degree}
                    onChange={(e) => updateListItem('education', i, { degree: e.target.value })}
                  />
                  <TextField
                    label="Major / Field of Study"
                    value={edu.field}
                    onChange={(e) => updateListItem('education', i, { field: e.target.value })}
                  />
                  <TextField
                    label="Graduation Date (MM/YYYY)"
                    value={edu.endDate}
                    onChange={(e) => updateListItem('education', i, { endDate: e.target.value })}
                  />
                  <TextField
                    label="GPA (Optional)"
                    value={edu.gpa ?? ''}
                    onChange={(e) => updateListItem('education', i, { gpa: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ),
      skills: (
        <Card>
          <SectionHeading
            title="Skills & Competencies"
            subtitle="Core hard skills & technologies recognizable by ATS parsers"
            action={
              <Button size="sm" variant="sparkle" loading={busy === 'skills'} onClick={aiSkills} icon={<Wand2 className="w-3.5 h-3.5" />}>
                AI Suggest
              </Button>
            }
          />
          {d.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {d.skills.map((skill) => (
                <Chip
                  key={skill.id}
                  label={skill.name}
                  tone="primary"
                  onRemove={() => patch({ skills: d.skills.filter((s) => s.id !== skill.id) })}
                />
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextField
                label="Add a skill"
                value={skillInput}
                placeholder="e.g. Python, Docker"
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addSkill()
                  }
                }}
              />
            </div>
            <Button onClick={addSkill} icon={<Plus className="w-4 h-4" />}>
              Add
            </Button>
          </div>
        </Card>
      ),
      projects: (
        <Card>
          <SectionHeading
            title="Projects"
            subtitle="Highlight key portfolio projects & technical stack"
            action={
              <Button
                size="sm"
                variant="outline"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() =>
                  patch({ projects: [...d.projects, { id: nextId('proj'), name: '', description: '', url: '', technologies: [] }] })
                }
              >
                Add Project
              </Button>
            }
          />
          <div className="space-y-5">
            {d.projects.map((proj, i) => (
              <div key={proj.id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Project {i + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeListItem('projects', i)}
                    className="text-zinc-400 hover:text-error"
                    aria-label="Remove project"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <TextField
                  label="Project Name *"
                  value={proj.name}
                  onChange={(e) => updateListItem('projects', i, { name: e.target.value })}
                />
                <TextArea
                  label="Description"
                  rows={3}
                  value={proj.description}
                  onChange={(e) => updateListItem('projects', i, { description: e.target.value })}
                />
                <div className="grid sm:grid-cols-2 gap-x-4">
                  <TextField
                    label="Live URL / Repository"
                    value={proj.url ?? ''}
                    onChange={(e) => updateListItem('projects', i, { url: e.target.value })}
                  />
                  <TextField
                    label="Technologies (comma separated)"
                    value={proj.technologies.join(', ')}
                    onChange={(e) =>
                      updateListItem('projects', i, {
                        technologies: e.target.value
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ),
      certifications: (
        <Card>
          <SectionHeading
            title="Certifications & Licenses"
            subtitle="Recognized credentials with issuer & dates"
            action={
              <Button
                size="sm"
                variant="outline"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() =>
                  patch({ certifications: [...d.certifications, { id: nextId('cert'), name: '', issuer: '', date: '', url: '' }] })
                }
              >
                Add Cert
              </Button>
            }
          />
          <div className="space-y-5">
            {d.certifications.map((cert, i) => (
              <div key={cert.id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Certificate {i + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeListItem('certifications', i)}
                    className="text-zinc-400 hover:text-error"
                    aria-label="Remove certificate"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-x-4">
                  <TextField
                    label="Certification Name *"
                    value={cert.name}
                    onChange={(e) => updateListItem('certifications', i, { name: e.target.value })}
                  />
                  <TextField
                    label="Issuer"
                    value={cert.issuer}
                    onChange={(e) => updateListItem('certifications', i, { issuer: e.target.value })}
                  />
                  <TextField
                    label="Date Received"
                    value={cert.date}
                    onChange={(e) => updateListItem('certifications', i, { date: e.target.value })}
                  />
                  <TextField
                    label="Credential URL"
                    value={cert.url ?? ''}
                    onChange={(e) => updateListItem('certifications', i, { url: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ),
  }

  if (busy === 'load' && !hydrated) {
    return (
      <>
        <Navbar />
        <Loading label="Loading your resume…" />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="sticky top-16 z-30 border-b border-border bg-white/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Resume Title (e.g. Tech Lead)"
              className="flex-1 min-w-[180px] px-3 py-2 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Link
              href={previewHref}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold border border-primary text-primary hover:bg-primary/5"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </Link>
            <Button size="sm" loading={busy === 'save'} onClick={handleSave} icon={<Save className="w-3.5 h-3.5" />}>
              Save
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-zinc-500 inline-flex items-center gap-1.5 shrink-0">
              <Target className="w-3.5 h-3.5" />
              Role:
            </span>
            <input
              value={draft.targetRole}
              onChange={(e) => setDraft((d) => ({ ...d, targetRole: e.target.value }))}
              placeholder="Target role (e.g. Senior React Native Dev)"
              className="flex-1 px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {error && <ErrorBanner message={error} />}
        {saved && <p className="text-[13px] font-medium text-emerald-600">{saved}</p>}

        <PillTabs tabs={TABS} activeTab={tab} onTabChange={setTab} label="Resume sections" />

        {panels[tab]}

        <div className="flex justify-end pt-2">
          <Button loading={busy === 'save'} onClick={handleSave} icon={<Save className="w-4 h-4" />}>
            {draft.id ? 'Update Resume' : 'Save Resume'}
          </Button>
        </div>
      </main>

      <AiDiffModal change={pendingChange} loading={busy === 'summary' || busy === 'skills' || busy === 'bullets'} onClose={() => setPendingChange(null)} />
    </>
  )
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<Loading label="Loading builder…" />}>
      <BuilderContent />
    </Suspense>
  )
}
