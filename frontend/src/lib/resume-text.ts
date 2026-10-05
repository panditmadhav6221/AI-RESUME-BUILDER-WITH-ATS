import type { Education, ResumeData, WorkExperience } from '@/types'

// Heuristics tuned to the backend export template: US Letter, 10pt, ~0.55/0.6in margins.
const LINE_CHARS = 95
const LINES_PER_PAGE = 46

function formatRange(start: string, end: string, current?: boolean): string {
  if (current || !end) return `${start || ''} – Present`
  return `${start || ''} – ${end || ''}`
}

function experienceText(exp: WorkExperience): string {
  const lines = [`${exp.position} - ${exp.company}`]
  if (exp.location) lines.push(exp.location)
  lines.push(formatRange(exp.startDate, exp.endDate, exp.current))
  for (const bullet of exp.bullets) {
    const trimmed = bullet.trim()
    if (trimmed) lines.push(`- ${trimmed}`)
  }
  return lines.join('\n')
}

function educationText(edu: Education): string {
  return [
    edu.institution,
    [edu.degree, edu.field].filter(Boolean).join(' in '),
    formatRange(edu.startDate, edu.endDate, false),
    edu.gpa ? `GPA: ${edu.gpa}` : '',
  ]
    .filter(Boolean)
    .join(' - ')
}

/** ATS-friendly plain-text rendering used for keyword matching and copy/paste into ATS forms. */
export function resumeToPlainText(d: ResumeData): string {
  const sections: string[] = []

  const header: string[] = []
  if (d.contact.fullName) header.push(d.contact.fullName.toUpperCase())
  const contactLine = [d.contact.email, d.contact.phone, d.contact.location, d.contact.linkedin, d.contact.website]
    .filter(Boolean)
    .join(' | ')
  if (contactLine) header.push(contactLine)
  if (header.length) sections.push(header.join('\n'))

  if (d.summary.trim()) sections.push(`SUMMARY\n${d.summary.trim()}`)

  const experience = d.experience.map(experienceText).filter(Boolean)
  if (experience.length) sections.push(`EXPERIENCE\n${experience.join('\n\n')}`)

  const education = d.education.map(educationText).filter(Boolean)
  if (education.length) sections.push(`EDUCATION\n${education.join('\n')}`)

  const skills = d.skills.map((s) => s.name).filter(Boolean).join(', ')
  if (skills) sections.push(`SKILLS\n${skills}`)

  const projects = d.projects
    .map((p) =>
      [
        p.name,
        p.description,
        p.technologies.length ? `Technologies: ${p.technologies.join(', ')}` : '',
        p.url,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .filter(Boolean)
  if (projects.length) sections.push(`PROJECTS\n${projects.join('\n\n')}`)

  const certs = d.certifications
    .map((c) => `${c.name}${c.issuer ? ` - ${c.issuer}` : ''}${c.date ? ` (${c.date})` : ''}`)
    .filter(Boolean)
  if (certs.length) sections.push(`CERTIFICATIONS\n${certs.join('\n')}`)

  return sections.join('\n\n')
}

/** Compact digest of a resume handed to the AI as grounding context. */
export function buildSourceText(d: ResumeData): string {
  return [
    d.summary.trim(),
    ...d.experience.map((e) =>
      [e.position, e.company, e.location, formatRange(e.startDate, e.endDate, e.current), ...e.bullets]
        .filter(Boolean)
        .join(' '),
    ),
    ...d.education.map((e) => [e.institution, e.degree, e.field].filter(Boolean).join(' ')),
    d.skills.map((s) => s.name).join(', '),
  ]
    .filter(Boolean)
    .join('\n')
}

export function estimatePages(text: string): { pages: number; pageOneEndIndex: number } {
  let total = 0
  let cursor = 0
  let boundary = -1
  let boundaryIndex = text.length

  for (const line of text.split('\n')) {
    const nl = text.indexOf('\n', cursor)
    const end = nl === -1 ? text.length : nl
    const lines = Math.max(1, Math.ceil(line.length / LINE_CHARS))
    if (boundary === -1 && total + lines > LINES_PER_PAGE) {
      const consumed = total + lines - LINES_PER_PAGE
      const idx = cursor + Math.min(line.length, consumed * LINE_CHARS)
      const nextBreak = text.indexOf('\n', idx)
      boundaryIndex = nextBreak === -1 ? text.length : nextBreak + 1
      boundary = 1
    }
    total += lines
    cursor = end + 1
  }

  return { pages: Math.max(1, Math.ceil(total / LINES_PER_PAGE)), pageOneEndIndex: boundaryIndex }
}
