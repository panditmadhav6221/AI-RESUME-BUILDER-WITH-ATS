'use client'

import { useState } from 'react'
import type { ResumeData, SectionId, WorkExperience, Education, Project, Certification, Skill } from '@/types'
import { Plus, Trash2, Sparkles, Loader2, Wand2 } from 'lucide-react'
import { improveBullet, generateSummary, suggestSkills } from '@/lib/api-client'

interface Props {
  data: ResumeData
  onUpdate: (updater: (prev: ResumeData) => ResumeData) => void
}

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'contact', label: 'Contact Info' },
  { id: 'summary', label: 'Professional Summary' },
  { id: 'experience', label: 'Work Experience' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'certifications', label: 'Certifications' },
]

export default function ResumeForm({ data, onUpdate }: Props) {
  const [activeSection, setActiveSection] = useState<SectionId>('contact')

  const set = <K extends keyof ResumeData>(key: K, value: ResumeData[K]) => {
    onUpdate((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex gap-2 flex-wrap mb-6">
        {SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              activeSection === id
                ? 'bg-primary text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeSection === 'contact' && (
          <ContactForm contact={data.contact} onChange={(c) => set('contact', c)} />
        )}
        {activeSection === 'summary' && (
          <SummaryForm
            value={data.summary}
            contact={data.contact}
            skills={data.skills}
            onChange={(v) => set('summary', v)}
          />
        )}
        {activeSection === 'experience' && (
          <ExperienceForm items={data.experience} onChange={(v) => set('experience', v)} />
        )}
        {activeSection === 'education' && (
          <EducationForm items={data.education} onChange={(v) => set('education', v)} />
        )}
        {activeSection === 'skills' && (
          <SkillsForm items={data.skills} onChange={(v) => set('skills', v)} />
        )}
        {activeSection === 'projects' && (
          <ProjectsForm items={data.projects} onChange={(v) => set('projects', v)} />
        )}
        {activeSection === 'certifications' && (
          <CertsForm items={data.certifications} onChange={(v) => set('certifications', v)} />
        )}
      </div>
    </div>
  )
}

function ContactForm({ contact, onChange }: { contact: ResumeData['contact']; onChange: (c: ResumeData['contact']) => void }) {
  const fields: { key: keyof typeof contact; label: string; placeholder: string }[] = [
    { key: 'fullName', label: 'Full Name', placeholder: 'John Doe' },
    { key: 'email', label: 'Email', placeholder: 'john@example.com' },
    { key: 'phone', label: 'Phone', placeholder: '+1 (555) 123-4567' },
    { key: 'location', label: 'Location', placeholder: 'San Francisco, CA' },
    { key: 'linkedin', label: 'LinkedIn URL', placeholder: 'linkedin.com/in/johndoe' },
    { key: 'website', label: 'Website', placeholder: 'johndoe.com' },
  ]

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-zinc-900">Contact Information</h2>
      {fields.map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
          <input
            type="text"
            value={contact[key] || ''}
            onChange={(e) => onChange({ ...contact, [key]: e.target.value })}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      ))}
    </div>
  )
}

function SummaryForm({ value, contact, skills, onChange }: { value: string; contact: ResumeData['contact']; skills: Skill[]; onChange: (v: string) => void }) {
  const [targetRole, setTargetRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    try {
      const fallback = [contact.fullName, `Skills: ${skills.map((s) => s.name).join(', ')}`].filter(Boolean).join(' - ')
      const input = value.trim() || fallback
      const result = await generateSummary(input, targetRole.trim() || undefined)
      onChange(result.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-zinc-900">Professional Summary</h2>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-dark disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {loading ? 'Generating...' : 'AI Generate'}
        </button>
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
      <input
        type="text"
        value={targetRole}
        onChange={(e) => setTargetRole(e.target.value)}
        placeholder="Target role (e.g. Senior Frontend Engineer) - optional"
        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write a brief professional summary describing your key qualifications and career goals... (or leave blank and let AI draft one from your contact info)"
        rows={5}
        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
      />
      {value && <p className="text-xs text-zinc-400">Tip: click AI Generate to polish what you wrote.</p>}
    </div>
  )
}

function ExperienceForm({ items, onChange }: { items: WorkExperience[]; onChange: (v: WorkExperience[]) => void }) {
  const [improvingIdx, setImprovingIdx] = useState<{ expId: string; bulletIdx: number } | null>(null)
  const [error, setError] = useState('')

  const add = () => {
    onChange([...items, { id: crypto.randomUUID(), company: '', position: '', location: '', startDate: '', endDate: '', current: false, bullets: [''] }])
  }
  const update = (id: string, upd: Partial<WorkExperience>) => {
    onChange(items.map((i) => (i.id === id ? { ...i, ...upd } : i)))
  }
  const remove = (id: string) => onChange(items.filter((i) => i.id !== id))

  const handleImprove = async (exp: WorkExperience, bulletIdx: number) => {
    const bullet = exp.bullets[bulletIdx]
    if (!bullet.trim()) return
    setImprovingIdx({ expId: exp.id, bulletIdx })
    setError('')
    try {
      const result = await improveBullet(bullet, exp.position || undefined)
      const newBullets = [...exp.bullets]
      newBullets[bulletIdx] = result.improved
      update(exp.id, { bullets: newBullets })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to improve bullet')
    } finally {
      setImprovingIdx(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-zinc-900">Work Experience</h2>
        <button onClick={add} className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-dark">
          <Plus className="w-3 h-3" /> Add Experience
        </button>
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
      {items.map((exp) => (
        <div key={exp.id} className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex justify-between">
            <div className="grid grid-cols-2 gap-3 flex-1">
              <input type="text" value={exp.company} onChange={(e) => update(exp.id, { company: e.target.value })} placeholder="Company" className="px-3 py-2 border border-border rounded-lg text-sm" />
              <input type="text" value={exp.position} onChange={(e) => update(exp.id, { position: e.target.value })} placeholder="Position" className="px-3 py-2 border border-border rounded-lg text-sm" />
              <input type="text" value={exp.location} onChange={(e) => update(exp.id, { location: e.target.value })} placeholder="Location" className="px-3 py-2 border border-border rounded-lg text-sm" />
              <div className="flex gap-2">
                <input type="text" value={exp.startDate} onChange={(e) => update(exp.id, { startDate: e.target.value })} placeholder="Start date" className="flex-1 px-3 py-2 border border-border rounded-lg text-sm" />
                {!exp.current && <input type="text" value={exp.endDate} onChange={(e) => update(exp.id, { endDate: e.target.value })} placeholder="End date" className="flex-1 px-3 py-2 border border-border rounded-lg text-sm" />}
              </div>
            </div>
            <button onClick={() => remove(exp.id)} className="text-zinc-400 hover:text-error ml-2"><Trash2 className="w-4 h-4" /></button>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input type="checkbox" checked={exp.current} onChange={(e) => update(exp.id, { current: e.target.checked })} className="rounded" />
            Currently working here
          </label>
          <div className="space-y-2">
            {exp.bullets.map((bullet, bi) => (
              <div key={bi} className="flex gap-2">
                <input
                  type="text"
                  value={bullet}
                  onChange={(e) => {
                    const newBullets = [...exp.bullets]
                    newBullets[bi] = e.target.value
                    update(exp.id, { bullets: newBullets })
                  }}
                  placeholder="Describe an achievement or responsibility..."
                  className="flex-1 px-3 py-2 border border-border rounded-lg text-sm"
                />
                <button
                  onClick={() => handleImprove(exp, bi)}
                  disabled={improvingIdx?.expId === exp.id && improvingIdx?.bulletIdx === bi}
                  title="Improve with AI"
                  className="text-primary hover:text-primary-dark disabled:opacity-40"
                >
                  {improvingIdx?.expId === exp.id && improvingIdx?.bulletIdx === bi ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                </button>
                {exp.bullets.length > 1 && (
                  <button onClick={() => update(exp.id, { bullets: exp.bullets.filter((_, i) => i !== bi) })} className="text-zinc-400 hover:text-error"><Trash2 className="w-3 h-3" /></button>
                )}
              </div>
            ))}
            <button
              onClick={() => update(exp.id, { bullets: [...exp.bullets, ''] })}
              className="text-xs text-primary hover:text-primary-dark"
            >
              + Add bullet point
            </button>
            {exp.bullets.some((b) => b.trim()) && (
              <p className="text-xs text-zinc-400">Tip: click the wand icon on any bullet to rewrite it with AI.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function EducationForm({ items, onChange }: { items: Education[]; onChange: (v: Education[]) => void }) {
  const add = () => onChange([...items, { id: crypto.randomUUID(), institution: '', degree: '', field: '', startDate: '', endDate: '' }])
  const update = (id: string, upd: Partial<Education>) => onChange(items.map((i) => (i.id === id ? { ...i, ...upd } : i)))
  const remove = (id: string) => onChange(items.filter((i) => i.id !== id))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-zinc-900">Education</h2>
        <button onClick={add} className="inline-flex items-center gap-1 text-xs text-primary"><Plus className="w-3 h-3" /> Add Education</button>
      </div>
      {items.map((edu) => (
        <div key={edu.id} className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex justify-between">
            <div className="grid grid-cols-2 gap-3 flex-1">
              <input type="text" value={edu.institution} onChange={(e) => update(edu.id, { institution: e.target.value })} placeholder="Institution" className="px-3 py-2 border border-border rounded-lg text-sm" />
              <input type="text" value={edu.degree} onChange={(e) => update(edu.id, { degree: e.target.value })} placeholder="Degree" className="px-3 py-2 border border-border rounded-lg text-sm" />
              <input type="text" value={edu.field} onChange={(e) => update(edu.id, { field: e.target.value })} placeholder="Field of study" className="px-3 py-2 border border-border rounded-lg text-sm" />
              <input type="text" value={edu.gpa || ''} onChange={(e) => update(edu.id, { gpa: e.target.value })} placeholder="GPA (optional)" className="px-3 py-2 border border-border rounded-lg text-sm" />
              <input type="text" value={edu.startDate} onChange={(e) => update(edu.id, { startDate: e.target.value })} placeholder="Start date" className="px-3 py-2 border border-border rounded-lg text-sm" />
              <input type="text" value={edu.endDate} onChange={(e) => update(edu.id, { endDate: e.target.value })} placeholder="End date" className="px-3 py-2 border border-border rounded-lg text-sm" />
            </div>
            <button onClick={() => remove(edu.id)} className="text-zinc-400 hover:text-error ml-2"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      ))}
    </div>
  )
}

function SkillsForm({ items, onChange }: { items: Skill[]; onChange: (v: Skill[]) => void }) {
  const [input, setInput] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addSkill = () => {
    if (!input.trim()) return
    onChange([...items, { id: crypto.randomUUID(), name: input.trim() }])
    setInput('')
  }

  const handleSuggest = async () => {
    if (!targetRole.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await suggestSkills(targetRole.trim(), items.map((s) => s.name))
      const existing = new Set(items.map((s) => s.name.toLowerCase()))
      const fresh = result.skills.filter((s) => !existing.has(s.toLowerCase()))
      if (fresh.length === 0) {
        setError('AI suggestions already in your list.')
      } else {
        onChange([...items, ...fresh.map((name) => ({ id: crypto.randomUUID(), name }))])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suggest skills')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-zinc-900">Skills</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          placeholder="Target role for AI suggestions..."
          className="px-3 py-2 border border-border rounded-lg text-sm"
        />
        <button
          onClick={handleSuggest}
          disabled={loading || !targetRole.trim()}
          className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? 'Suggesting...' : 'AI Suggest Skills'}
        </button>
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
          placeholder="Type a skill and press Enter..."
          className="flex-1 px-3 py-2 border border-border rounded-lg text-sm"
        />
        <button onClick={addSkill} className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium">Add</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((skill) => (
          <span key={skill.id} className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-100 rounded-full text-sm">
            {skill.name}
            <button onClick={() => onChange(items.filter((s) => s.id !== skill.id))} className="text-zinc-400 hover:text-error"><Trash2 className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
    </div>
  )
}

function ProjectsForm({ items, onChange }: { items: Project[]; onChange: (v: Project[]) => void }) {
  const add = () => onChange([...items, { id: crypto.randomUUID(), name: '', description: '', url: '', technologies: [] }])
  const update = (id: string, upd: Partial<Project>) => onChange(items.map((i) => (i.id === id ? { ...i, ...upd } : i)))
  const remove = (id: string) => onChange(items.filter((i) => i.id !== id))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-zinc-900">Projects</h2>
        <button onClick={add} className="inline-flex items-center gap-1 text-xs text-primary"><Plus className="w-3 h-3" /> Add Project</button>
      </div>
      {items.map((proj) => (
        <div key={proj.id} className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex justify-between">
            <div className="grid grid-cols-2 gap-3 flex-1">
              <input type="text" value={proj.name} onChange={(e) => update(proj.id, { name: e.target.value })} placeholder="Project name" className="px-3 py-2 border border-border rounded-lg text-sm" />
              <input type="text" value={proj.url || ''} onChange={(e) => update(proj.id, { url: e.target.value })} placeholder="URL (optional)" className="px-3 py-2 border border-border rounded-lg text-sm" />
            </div>
            <button onClick={() => remove(proj.id)} className="text-zinc-400 hover:text-error ml-2"><Trash2 className="w-4 h-4" /></button>
          </div>
          <textarea value={proj.description} onChange={(e) => update(proj.id, { description: e.target.value })} placeholder="Project description..." rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none" />
          <input type="text" value={proj.technologies.join(', ')} onChange={(e) => update(proj.id, { technologies: e.target.value.split(',').map(s => s.trim()) })} placeholder="Technologies (comma separated)" className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
        </div>
      ))}
    </div>
  )
}

function CertsForm({ items, onChange }: { items: Certification[]; onChange: (v: Certification[]) => void }) {
  const add = () => onChange([...items, { id: crypto.randomUUID(), name: '', issuer: '', date: '' }])
  const update = (id: string, upd: Partial<Certification>) => onChange(items.map((i) => (i.id === id ? { ...i, ...upd } : i)))
  const remove = (id: string) => onChange(items.filter((i) => i.id !== id))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-zinc-900">Certifications</h2>
        <button onClick={add} className="inline-flex items-center gap-1 text-xs text-primary"><Plus className="w-3 h-3" /> Add Certification</button>
      </div>
      {items.map((cert) => (
        <div key={cert.id} className="border border-border rounded-lg p-4 flex justify-between">
          <div className="grid grid-cols-3 gap-3 flex-1">
            <input type="text" value={cert.name} onChange={(e) => update(cert.id, { name: e.target.value })} placeholder="Certification name" className="px-3 py-2 border border-border rounded-lg text-sm" />
            <input type="text" value={cert.issuer} onChange={(e) => update(cert.id, { issuer: e.target.value })} placeholder="Issuer" className="px-3 py-2 border border-border rounded-lg text-sm" />
            <div className="flex gap-2">
              <input type="text" value={cert.date} onChange={(e) => update(cert.id, { date: e.target.value })} placeholder="Date" className="flex-1 px-3 py-2 border border-border rounded-lg text-sm" />
              <button onClick={() => remove(cert.id)} className="text-zinc-400 hover:text-error"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
