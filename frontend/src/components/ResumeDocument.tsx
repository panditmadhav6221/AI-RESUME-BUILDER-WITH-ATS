'use client'

import type { ResumeData, TemplateId } from '@/types'

const RULE = 'h-px bg-zinc-300'

function range(start: string, end: string, current?: boolean) {
  if (current || !end) return `${start} – Present`
  return `${start} – ${end}`
}

export default function ResumeDocument({
  data,
  template = 'modern',
}: {
  data: ResumeData
  template?: TemplateId
}) {
  const { contact } = data
  const contactLine = [contact.email, contact.phone, contact.location, contact.linkedin, contact.website]
    .filter(Boolean)
    .join('  •  ')

  const nameClass =
    template === 'classic'
      ? 'text-2xl font-serif text-slate-600 text-center'
      : template === 'minimal'
        ? 'text-2xl font-bold text-zinc-900 text-left tracking-tight'
        : 'text-2xl font-bold text-zinc-900 text-center tracking-tight'

  const headerRule = template === 'classic' ? 'bg-slate-400' : 'bg-zinc-300'

  return (
    <div
      className={`bg-white p-10 text-zinc-800 ${
        template === 'classic' ? 'border-2 border-zinc-400' : 'rounded-lg shadow-md'
      }`}
    >
      <header className="mb-5">
        <h1 className={nameClass}>{contact.fullName || 'Your Full Name'}</h1>
        {contactLine && <p className="mt-1.5 text-[12px] text-zinc-600 text-center">{contactLine}</p>}
        <div className={`${RULE} ${headerRule} mt-4`} />
      </header>

      {data.summary.trim() && (
        <section className="mb-5">
          <h2 className="text-[11px] font-extrabold tracking-widest text-zinc-700 mb-2">PROFESSIONAL SUMMARY</h2>
          <p className="text-[12px] leading-relaxed whitespace-pre-wrap">{data.summary}</p>
        </section>
      )}

      {data.experience.length > 0 && (
        <section className="mb-5">
          <h2 className="text-[11px] font-extrabold tracking-widest text-zinc-700 mb-2">WORK EXPERIENCE</h2>
          <div className="space-y-3">
            {data.experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[12.5px] font-bold text-zinc-900">{exp.company}</p>
                  <p className="text-[11px] text-zinc-500 whitespace-nowrap">{range(exp.startDate, exp.endDate, exp.current)}</p>
                </div>
                <p className="text-[12px] italic text-zinc-600">
                  {[exp.position, exp.location].filter(Boolean).join(' | ')}
                </p>
                {exp.bullets.filter((b) => b.trim()).length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {exp.bullets.filter((b) => b.trim()).map((b, i) => (
                      <li key={i} className="text-[12px] leading-relaxed pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-zinc-400">
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.education.length > 0 && (
        <section className="mb-5">
          <h2 className="text-[11px] font-extrabold tracking-widest text-zinc-700 mb-2">EDUCATION</h2>
          <div className="space-y-2">
            {data.education.map((edu) => (
              <div key={edu.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[12.5px] font-bold text-zinc-900">{edu.institution}</p>
                  <p className="text-[11px] text-zinc-500 whitespace-nowrap">{edu.endDate}</p>
                </div>
                <p className="text-[12px] italic text-zinc-600 -mt-0.5">
                  {[edu.degree, edu.field].filter(Boolean).join(' in ')}
                  {edu.gpa ? ` (GPA: ${edu.gpa})` : ''}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.skills.length > 0 && (
        <section className="mb-5">
          <h2 className="text-[11px] font-extrabold tracking-widest text-zinc-700 mb-2">TECHNICAL &amp; CORE SKILLS</h2>
          <p className="text-[12px] leading-relaxed">
            {data.skills
              .map((s) => s.name)
              .filter(Boolean)
              .join('  •  ')}
          </p>
        </section>
      )}

      {data.projects.length > 0 && (
        <section className="mb-5">
          <h2 className="text-[11px] font-extrabold tracking-widest text-zinc-700 mb-2">KEY PROJECTS</h2>
          <div className="space-y-2">
            {data.projects.map((p) => (
              <div key={p.id}>
                <p className="text-[12.5px] font-bold text-zinc-900">
                  {p.name}
                  {p.url && <span className="font-normal text-primary"> ({p.url})</span>}
                </p>
                {p.description && <p className="text-[12px] leading-relaxed text-zinc-700">{p.description}</p>}
                {p.technologies.length > 0 && (
                  <p className="text-[11px] text-zinc-500 mt-0.5">Tech: {p.technologies.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.certifications.length > 0 && (
        <section className="mb-5">
          <h2 className="text-[11px] font-extrabold tracking-widest text-zinc-700 mb-2">CERTIFICATIONS</h2>
          <div className="space-y-1">
            {data.certifications.map((c) => (
              <p key={c.id} className="text-[12px] text-zinc-800">
                {c.name}
                <span className="text-zinc-500">{[c.issuer, c.date].filter(Boolean).join(' | ')}</span>
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
