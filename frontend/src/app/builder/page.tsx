'use client'

import { useState, useCallback, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import ResumeForm from '@/components/ResumeForm'
import ResumePreview from '@/components/ResumePreview'
import AtsScoreCard from '@/components/AtsScoreCard'
import type { ResumeData, TemplateId, ATSAnalysis } from '@/types'
import {
  saveResume, listResumes, getResume, updateResume, deleteResume,
  exportPDF, exportDOCX, downloadBlob, scoreResume, tailorResume,
  type SavedResumeSummary,
} from '@/lib/api-client'
import { resumeToText } from '@/lib/resume-text'
import { Loader2, Save, FolderOpen, FileDown, FileText, Gauge, Sparkles, Trash2, X } from 'lucide-react'

const EMPTY_RESUME: ResumeData = {
  contact: { fullName: '', email: '', phone: '', location: '', linkedin: '', website: '' },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
}

const STORAGE_KEYS = {
  data: 'resume-builder-data',
  template: 'resume-builder-template',
  text: 'resume-builder-text',
  userId: 'resume-builder-user-id',
}

function getUserId(): string {
  let id = localStorage.getItem(STORAGE_KEYS.userId)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEYS.userId, id)
  }
  return id
}

function loadSavedData(): ResumeData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.data)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return { ...EMPTY_RESUME, ...parsed, contact: { ...EMPTY_RESUME.contact, ...parsed.contact } }
  } catch {
    return null
  }
}

function loadSavedTemplate(): TemplateId {
  if (typeof window === 'undefined') return 'modern'
  const t = localStorage.getItem(STORAGE_KEYS.template)
  return t === 'modern' || t === 'classic' || t === 'minimal' ? t : 'modern'
}

export default function BuilderPage() {
  const [data, setData] = useState<ResumeData>(() => loadSavedData() ?? EMPTY_RESUME)
  const [template, setTemplate] = useState<TemplateId>(() => loadSavedTemplate())
  const [showPreview, setShowPreview] = useState(true)
  const [title, setTitle] = useState('My Resume')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [savedList, setSavedList] = useState<SavedResumeSummary[]>([])
  const [showLoadMenu, setShowLoadMenu] = useState(false)
  const [busy, setBusy] = useState<null | 'save' | 'load' | 'pdf' | 'docx' | 'score' | 'tailor' | 'delete'>(null)
  const [status, setStatus] = useState('')
  const [statusError, setStatusError] = useState('')
  const [atsAnalysis, setAtsAnalysis] = useState<ATSAnalysis | null>(null)
  const [showTailor, setShowTailor] = useState(false)
  const [tailorJd, setTailorJd] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(data))
    localStorage.setItem(STORAGE_KEYS.template, template)
    localStorage.setItem(STORAGE_KEYS.text, resumeToText(data))
  }, [data, template])

  const updateData = useCallback((updater: (prev: ResumeData) => ResumeData) => {
    setData(updater)
    setAtsAnalysis(null)
  }, [])

  const handleSave = async () => {
    setBusy('save')
    setStatus('')
    setStatusError('')
    try {
      const userId = getUserId()
      if (savedId) {
        await updateResume(savedId, { title: title.trim() || 'Untitled Resume', data, template })
        setStatus('Resume updated on server.')
      } else {
        const created = await saveResume(userId, title.trim() || 'Untitled Resume', data, template)
        setSavedId(created.id)
        setStatus('Resume saved on server.')
      }
      refreshList()
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to save. Is the backend and MongoDB running?')
    } finally {
      setBusy(null)
    }
  }

  const refreshList = async () => {
    try {
      const userId = localStorage.getItem(STORAGE_KEYS.userId)
      if (!userId) return
      setSavedList(await listResumes(userId))
    } catch {
      // server unreachable - ignore
    }
  }

  const handleLoad = async (id: string) => {
    setBusy('load')
    setStatusError('')
    setStatus('')
    setShowLoadMenu(false)
    try {
      const resume = await getResume(id)
      setData(resume.data)
      setTitle(resume.title)
      setSavedId(resume.id)
      setTemplate(resume.template as TemplateId)
      setAtsAnalysis(null)
      setStatus('Resume loaded from server.')
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to load resume')
    } finally {
      setBusy(null)
    }
  }

  const handleDelete = async (id: string) => {
    setBusy('delete')
    setStatusError('')
    try {
      await deleteResume(id)
      if (id === savedId) {
        setSavedId(null)
        setStatus('Saved resume deleted.')
      }
      refreshList()
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to delete resume')
    } finally {
      setBusy(null)
    }
  }

  const handleNew = () => {
    setData(EMPTY_RESUME)
    setTitle('My Resume')
    setSavedId(null)
    setAtsAnalysis(null)
    setStatus('Started a new resume.')
  }

  const handleExport = async (kind: 'pdf' | 'docx') => {
    setBusy(kind)
    setStatusError('')
    try {
      const blob = kind === 'pdf' ? await exportPDF(data) : await exportDOCX(data)
      const base = (data.contact.fullName || 'resume').trim().replace(/\s+/g, '-')
      downloadBlob(blob, `${base}.${kind}`)
      setStatus(`${kind.toUpperCase()} exported.`)
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : `Failed to export ${kind.toUpperCase()}`)
    } finally {
      setBusy(null)
    }
  }

  const handleScore = async () => {
    setBusy('score')
    setStatusError('')
    try {
      const result = await scoreResume(data)
      setAtsAnalysis(result)
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to score resume')
    } finally {
      setBusy(null)
    }
  }

  const handleTailor = async () => {
    if (!tailorJd.trim()) return
    setBusy('tailor')
    setStatusError('')
    try {
      const result = await tailorResume(data, tailorJd.trim())
      setData(result.tailored as ResumeData)
      setAtsAnalysis(null)
      setShowTailor(false)
      setTailorJd('')
      setStatus('Resume tailored to the job description.')
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to tailor resume')
    } finally {
      setBusy(null)
    }
  }

  const actionBtn = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <>
      <Navbar />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border bg-white px-4 py-3 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-semibold text-zinc-900">Resume Builder</h1>
              <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-0.5">
                {(['modern', 'classic', 'minimal'] as TemplateId[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTemplate(t)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                      template === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm text-zinc-600 hover:text-zinc-900 lg:hidden"
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resume title"
              className="px-3 py-1.5 border border-border rounded-lg text-sm w-44"
            />
            <button onClick={handleSave} disabled={busy !== null} className={`${actionBtn} bg-primary text-white hover:bg-primary-dark`}>
              {busy === 'save' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {savedId ? 'Update' : 'Save'}
            </button>
            <div className="relative">
              <button
                onClick={() => { setShowLoadMenu(!showLoadMenu); refreshList() }}
                disabled={busy !== null}
                className={`${actionBtn} bg-zinc-100 text-zinc-700 hover:bg-zinc-200`}
              >
                {busy === 'load' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
                Load
              </button>
              {showLoadMenu && (
                <div className="absolute z-20 top-full mt-1 left-0 w-72 bg-white border border-border rounded-xl shadow-lg p-2 max-h-80 overflow-y-auto">
                  {savedList.length === 0 ? (
                    <p className="text-xs text-zinc-400 p-2">No saved resumes yet. Click Save first.</p>
                  ) : (
                    savedList.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-50">
                        <button onClick={() => handleLoad(r.id)} className="flex-1 text-left">
                          <p className="text-sm font-medium text-zinc-800">{r.title}</p>
                          <p className="text-[11px] text-zinc-400">
                            {r.template} template{r.score !== null && r.score !== undefined ? ` · ATS ${r.score}/100` : ''} · {new Date(r.updatedAt).toLocaleDateString()}
                          </p>
                        </button>
                        <button onClick={() => handleDelete(r.id)} className="text-zinc-400 hover:text-error" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <button onClick={handleNew} className={`${actionBtn} bg-zinc-100 text-zinc-700 hover:bg-zinc-200`}>
              New
            </button>
            <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
            <button onClick={handleScore} disabled={busy !== null} className={`${actionBtn} bg-zinc-100 text-zinc-700 hover:bg-zinc-200`}>
              {busy === 'score' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gauge className="w-3.5 h-3.5" />}
              ATS Score
            </button>
            <button onClick={() => setShowTailor(true)} disabled={busy !== null} className={`${actionBtn} bg-secondary/10 text-secondary hover:bg-secondary/20`}>
              <Sparkles className="w-3.5 h-3.5" />
              AI Tailor
            </button>
            <button onClick={() => handleExport('pdf')} disabled={busy !== null} className={`${actionBtn} bg-zinc-100 text-zinc-700 hover:bg-zinc-200`}>
              {busy === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              PDF
            </button>
            <button onClick={() => handleExport('docx')} disabled={busy !== null} className={`${actionBtn} bg-zinc-100 text-zinc-700 hover:bg-zinc-200`}>
              {busy === 'docx' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              DOCX
            </button>
          </div>

          {status && <p className="text-xs text-success">{status}</p>}
          {statusError && <p className="text-xs text-error">{statusError}</p>}
        </div>

        {atsAnalysis && (
          <div className="border-b border-border bg-zinc-50 px-4 py-4">
            <div className="max-w-2xl mx-auto relative">
              <button
                onClick={() => setAtsAnalysis(null)}
                className="absolute -top-2 -right-2 text-zinc-400 hover:text-zinc-700"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <AtsScoreCard analysis={atsAnalysis} />
            </div>
          </div>
        )}

        {showTailor && (
          <div className="fixed inset-0 z-30 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-zinc-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-secondary" /> Tailor Resume with AI
                </h2>
                <button onClick={() => setShowTailor(false)} className="text-zinc-400 hover:text-zinc-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-zinc-500 mb-3">
                Paste the job description and AI will rewrite your summary and experience to match it. Your current resume will be replaced.
              </p>
              <textarea
                value={tailorJd}
                onChange={(e) => setTailorJd(e.target.value)}
                rows={10}
                placeholder="Paste the full job description here..."
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowTailor(false)} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900">
                  Cancel
                </button>
                <button
                  onClick={handleTailor}
                  disabled={busy !== null || !tailorJd.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {busy === 'tailor' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Tailor Resume
                </button>
              </div>
              {statusError && busy === 'tailor' && <p className="text-xs text-error mt-3">{statusError}</p>}
            </div>
          </div>
        )}

        <div className="flex-1 flex">
          <div className={`flex-1 overflow-y-auto p-4 lg:p-6 ${showPreview ? 'lg:border-r lg:border-border' : ''}`}>
            <ResumeForm data={data} onUpdate={updateData} />
          </div>
          {showPreview && (
            <div className="hidden lg:block w-[500px] xl:w-[600px] overflow-y-auto bg-zinc-50 p-6">
              <ResumePreview data={data} template={template} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}