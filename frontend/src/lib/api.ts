import type {
  ApplicationStatus,
  ATSAnalysis,
  ContactType,
  CoverLetterResult,
  CoverLetterTone,
  GenerateSummaryResult,
  ImproveBulletResult,
  InsertKeywordsResult,
  InterviewPrepResult,
  JDAnalysis,
  JobApplication,
  OutreachResult,
  RecruiterAuditResult,
  ResumeData,
  ResumeMeta,
  SuggestSkillsResult,
  TailorResult,
} from '@/types'
import { getUserId } from './user-id'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
const API = `${API_BASE}/api`

export function apiBase(): string {
  return API_BASE
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (typeof body?.detail === 'string') detail = body.detail
    } catch {
      // non-JSON error response
    }
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

async function blob(path: string, body: unknown, init?: RequestInit): Promise<Blob> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    body: JSON.stringify(body),
    ...init,
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const parsed = await res.json()
      if (typeof parsed?.detail === 'string') detail = parsed.detail
    } catch {
      // non-JSON error response
    }
    throw new Error(detail)
  }
  return res.blob()
}

export const resumesApi = {
  list: (userId: string) => json<ResumeMeta[]>(`/resumes?userId=${encodeURIComponent(userId)}`),
  get: (userId: string, id: string) =>
    json<ResumeMeta>(`/resumes/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`),
  save: (userId: string, title: string, data: ResumeData, template = 'modern', targetRole?: string | null) =>
    json<ResumeMeta>('/resumes', {
      method: 'POST',
      body: JSON.stringify({ userId, title, data, template, targetRole: targetRole ?? null }),
    }),
  update: (
    userId: string,
    id: string,
    patch: { title?: string; data?: ResumeData; template?: string; score?: number | null; targetRole?: string | null },
  ) =>
    json<ResumeMeta>(`/resumes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ userId, ...patch }),
    }),
  remove: (userId: string, id: string) =>
    json<{ deleted: string }>(`/resumes/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    }),
  clone: (userId: string, id: string, title?: string, targetRole?: string | null) =>
    json<ResumeMeta>(`/resumes/${encodeURIComponent(id)}/clone`, {
      method: 'POST',
      body: JSON.stringify({ userId, title, targetRole: targetRole ?? null }),
    }),
  insertKeywords: (userId: string, id: string, keywords: string[], targetSection: 'skills' | 'summary' = 'skills') =>
    json<InsertKeywordsResult>(`/resumes/${encodeURIComponent(id)}/insert-keywords`, {
      method: 'POST',
      body: JSON.stringify({ userId, keywords, targetSection }),
    }),
}

export const aiApi = {
  improveBullet: (bullet: string, role?: string | null) =>
    json<ImproveBulletResult>('/ai/improve-bullet', {
      method: 'POST',
      body: JSON.stringify({ bullet, role: role ?? null }),
    }),
  generateSummary: (input: string, targetRole?: string | null) =>
    json<GenerateSummaryResult>('/ai/generate-summary', {
      method: 'POST',
      body: JSON.stringify({ input, targetRole: targetRole ?? null }),
    }),
  suggestSkills: (targetRole: string, currentSkills: string[] = []) =>
    json<SuggestSkillsResult>('/ai/suggest-skills', {
      method: 'POST',
      body: JSON.stringify({ targetRole, currentSkills }),
    }),
  tailorResume: (resumeData: ResumeData, jd: string) =>
    json<TailorResult>('/ai/tailor-resume', {
      method: 'POST',
      body: JSON.stringify({ resumeJson: resumeData, jd }),
    }),
  analyzeJd: (jd: string, resumeText = '', userId?: string, targetRole?: string | null) =>
    json<JDAnalysis>('/ai/analyze-jd', {
      method: 'POST',
      body: JSON.stringify({ jd, resumeText, userId: userId ?? null, targetRole: targetRole ?? null }),
    }),
  generateCoverLetter: (
    resumeData: ResumeData,
    jobDescription: string,
    companyName?: string | null,
    targetRole?: string | null,
    tone: CoverLetterTone = 'professional',
  ) =>
    json<CoverLetterResult>('/ai/generate-cover-letter', {
      method: 'POST',
      body: JSON.stringify({
        resumeData,
        jobDescription,
        companyName: companyName ?? null,
        targetRole: targetRole ?? null,
        tone,
      }),
    }),
  interviewPrep: (resumeData: ResumeData, jobDescription?: string | null, targetRole?: string | null) =>
    json<InterviewPrepResult>('/ai/interview-prep', {
      method: 'POST',
      body: JSON.stringify({
        resumeData,
        jobDescription: jobDescription ?? null,
        targetRole: targetRole ?? null,
      }),
    }),
  parseRawResume: (rawText: string) =>
    json<ResumeData>('/ai/parse-raw-resume', { method: 'POST', body: JSON.stringify({ rawText }) }),
  recruiterAudit: (resumeData: ResumeData, targetRole?: string | null) =>
    json<RecruiterAuditResult>('/ai/recruiter-audit', {
      method: 'POST',
      body: JSON.stringify({ resumeData, targetRole: targetRole ?? null }),
    }),
  generateOutreach: (
    resumeData: ResumeData,
    companyName: string,
    targetRole: string,
    contactType: ContactType = 'hiring_manager',
    jobDescription?: string | null,
  ) =>
    json<OutreachResult>('/ai/generate-outreach', {
      method: 'POST',
      body: JSON.stringify({
        resumeData,
        companyName,
        targetRole,
        contactType,
        jobDescription: jobDescription ?? null,
      }),
    }),
}

export const atsApi = {
  score: (resumeData: ResumeData, resumeId?: string | null, userId?: string | null) =>
    json<ATSAnalysis>('/ats/score', {
      method: 'POST',
      body: JSON.stringify({ resumeData, resumeId: resumeId ?? null, userId: userId ?? null }),
    }),
}

export const exportApi = {
  pdf: (data: ResumeData) => blob('/export/pdf', data),
  docx: (data: ResumeData) => blob('/export/docx', data),
  text: (data: ResumeData) => json<{ text: string }>('/export/text', { method: 'POST', body: JSON.stringify(data) }),
}

export interface ApplicationDraft {
  companyName: string
  roleTitle: string
  location?: string | null
  salary?: string | null
  status: ApplicationStatus
  dateApplied?: string
  resumeId?: string | null
  notes?: string | null
}

export const applicationsApi = {
  list: () => json<JobApplication[]>(`/applications?userId=${encodeURIComponent(getUserId())}`),
  create: (draft: ApplicationDraft) =>
    json<JobApplication>('/applications', {
      method: 'POST',
      body: JSON.stringify({ userId: getUserId(), ...draft }),
    }),
  update: (id: string, patch: Partial<ApplicationDraft>) =>
    json<JobApplication>(`/applications/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ userId: getUserId(), ...patch }),
    }),
  remove: (id: string) =>
    json<{ deleted: string }>(`/applications/${encodeURIComponent(id)}?userId=${encodeURIComponent(getUserId())}`, {
      method: 'DELETE',
    }),
}

export async function parseResumeFile(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API}/resume/parse`, { method: 'POST', body: form })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (typeof body?.detail === 'string') detail = body.detail
    } catch {
      // non-JSON error response
    }
    throw new Error(detail)
  }
  return res.json() as Promise<{
    text: string
    sections: Record<string, string>
    detectedSections: Record<string, boolean>
    layout: { hasTables: boolean; singleColumn: boolean }
    analysis: ATSAnalysis
  }>
}

export function downloadBlob(blobData: Blob, filename: string) {
  const url = URL.createObjectURL(blobData)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function copyToClipboard(text: string) {
  if (!navigator.clipboard) throw new Error('Clipboard is not available in this browser')
  await navigator.clipboard.writeText(text)
}
