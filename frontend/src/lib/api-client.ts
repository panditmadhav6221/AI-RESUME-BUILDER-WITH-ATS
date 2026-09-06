import type { ResumeData, ATSAnalysis } from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export async function parseResume(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/api/resume/parse`, { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Failed to parse resume')
  }
  return res.json()
}

export async function scoreResume(data: unknown): Promise<ATSAnalysis> {
  return request<ATSAnalysis>('/api/ats/score', {
    method: 'POST',
    body: JSON.stringify({ resumeData: data }),
  })
}

export async function analyzeJD(jd: string, resumeText?: string) {
  return request<{
    matchedSkills: { name: string; matched: boolean }[]
    missingSkills: { name: string; matched: boolean }[]
    matchPercentage: number
    keywords: string[]
    suggestions: string[]
  }>('/api/ai/analyze-jd', {
    method: 'POST',
    body: JSON.stringify({ jd, resumeText: resumeText || '' }),
  })
}

export async function improveBullet(bullet: string, role?: string) {
  return request<{ original: string; improved: string }>('/api/ai/improve-bullet', {
    method: 'POST',
    body: JSON.stringify({ bullet, role }),
  })
}

export async function generateSummary(input: string, targetRole?: string) {
  return request<{ summary: string }>('/api/ai/generate-summary', {
    method: 'POST',
    body: JSON.stringify({ input, targetRole }),
  })
}

export async function suggestSkills(targetRole: string, currentSkills?: string[]) {
  return request<{ skills: string[] }>('/api/ai/suggest-skills', {
    method: 'POST',
    body: JSON.stringify({ targetRole, currentSkills }),
  })
}

export async function tailorResume(resumeJson: unknown, jd: string) {
  return request<{ tailored: unknown }>('/api/ai/tailor-resume', {
    method: 'POST',
    body: JSON.stringify({ resumeJson, jd }),
  })
}

export async function exportPDF(data: unknown): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/export/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('PDF export failed')
  return res.blob()
}

export async function exportDOCX(data: unknown): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/export/docx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('DOCX export failed')
  return res.blob()
}

export interface SavedResumeSummary {
  id: string
  title: string
  template: string
  score: number | null
  updatedAt: string
}

export interface SavedResume extends SavedResumeSummary {
  data: ResumeData
}

export async function saveResume(userId: string, title: string, data: ResumeData, template: string): Promise<SavedResumeSummary> {
  return request<SavedResumeSummary>('/api/resumes', {
    method: 'POST',
    body: JSON.stringify({ userId, title, data, template }),
  })
}

export async function listResumes(userId: string): Promise<SavedResumeSummary[]> {
  return request<SavedResumeSummary[]>(`/api/resumes?userId=${encodeURIComponent(userId)}`)
}

export async function getResume(id: string): Promise<SavedResume> {
  return request<SavedResume>(`/api/resumes/${id}`)
}

export async function updateResume(id: string, patch: { title?: string; data?: ResumeData; template?: string; score?: number }): Promise<SavedResumeSummary> {
  return request<SavedResumeSummary>(`/api/resumes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  })
}

export async function deleteResume(id: string): Promise<unknown> {
  return request<unknown>(`/api/resumes/${id}`, { method: 'DELETE' })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
