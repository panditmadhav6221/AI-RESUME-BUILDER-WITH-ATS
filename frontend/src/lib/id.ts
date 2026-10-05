import type { ResumeData } from '@/types'

export function nextId(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}

export function emptyResumeData(): ResumeData {
  return {
    contact: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      linkedin: null,
      website: null,
    },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  }
}

/** Titles/slugs are user-controlled, so keep the downloaded filename safe. */
export function slugify(value: string, fallback = 'resume'): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || fallback
  )
}
