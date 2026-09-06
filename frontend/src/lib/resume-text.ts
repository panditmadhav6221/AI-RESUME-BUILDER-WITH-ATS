import type { ResumeData } from '@/types'

export function resumeToText(data: ResumeData): string {
  const lines: string[] = []

  if (data.contact.fullName) lines.push(data.contact.fullName)
  const contact = [
    data.contact.email,
    data.contact.phone,
    data.contact.location,
    data.contact.linkedin,
    data.contact.website,
  ].filter(Boolean).join(' | ')
  if (contact) lines.push(contact)

  if (data.summary) {
    lines.push('')
    lines.push('SUMMARY')
    lines.push(data.summary)
  }

  if (data.experience.length) {
    lines.push('')
    lines.push('EXPERIENCE')
    for (const exp of data.experience) {
      lines.push(`${exp.company} - ${exp.position} (${exp.startDate} - ${exp.current ? 'Present' : exp.endDate})`)
      for (const b of exp.bullets) if (b.trim()) lines.push(`- ${b}`)
    }
  }

  if (data.education.length) {
    lines.push('')
    lines.push('EDUCATION')
    for (const edu of data.education) {
      lines.push(`${edu.institution} - ${edu.degree} in ${edu.field} (${edu.startDate} - ${edu.endDate})`)
    }
  }

  if (data.skills.length) {
    lines.push('')
    lines.push('SKILLS')
    lines.push(data.skills.map((s) => s.name).join(', '))
  }

  if (data.projects.length) {
    lines.push('')
    lines.push('PROJECTS')
    for (const proj of data.projects) {
      lines.push(`${proj.name}${proj.url ? ` (${proj.url})` : ''}`)
      if (proj.description) lines.push(proj.description)
      if (proj.technologies.length) lines.push(`Technologies: ${proj.technologies.join(', ')}`)
    }
  }

  if (data.certifications.length) {
    lines.push('')
    lines.push('CERTIFICATIONS')
    for (const cert of data.certifications) {
      lines.push(`${cert.name} - ${cert.issuer} (${cert.date})`)
    }
  }

  return lines.join('\n')
}