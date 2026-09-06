export interface ContactInfo {
  fullName: string
  email: string
  phone: string
  location: string
  linkedin?: string
  website?: string
}

export interface WorkExperience {
  id: string
  company: string
  position: string
  location: string
  startDate: string
  endDate: string
  current: boolean
  bullets: string[]
}

export interface Education {
  id: string
  institution: string
  degree: string
  field: string
  startDate: string
  endDate: string
  gpa?: string
}

export interface Skill {
  id: string
  name: string
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
}

export interface Project {
  id: string
  name: string
  description: string
  url?: string
  technologies: string[]
}

export interface Certification {
  id: string
  name: string
  issuer: string
  date: string
  url?: string
}

export interface ResumeData {
  contact: ContactInfo
  summary: string
  experience: WorkExperience[]
  education: Education[]
  skills: Skill[]
  projects: Project[]
  certifications: Certification[]
}

export type TemplateId = 'modern' | 'classic' | 'minimal'

export type SectionId = 'contact' | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications'

export interface ATSIssue {
  id: string
  severity: 'error' | 'warning' | 'info'
  category: string
  message: string
  fix: string
}

export interface ATSAnalysis {
  score: number
  issues: ATSIssue[]
  passedChecks: string[]
  summary: string
}

export interface SkillMatch {
  name: string
  matched: boolean
  category?: string
}

export interface JDAnalysis {
  matchedSkills: SkillMatch[]
  missingSkills: SkillMatch[]
  matchPercentage: number
  keywords: string[]
  suggestions: string[]
}
