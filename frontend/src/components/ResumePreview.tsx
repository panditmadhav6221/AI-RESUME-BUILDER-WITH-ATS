'use client'

import type { ResumeData, TemplateId } from '@/types'

interface Props {
  data: ResumeData
  template: TemplateId
}

export default function ResumePreview({ data, template }: Props) {
  return (
    <div className="bg-white shadow-sm border border-border rounded-lg overflow-hidden">
      <div className="p-8 min-h-[600px]">
        {template === 'modern' && <ModernTemplate data={data} />}
        {template === 'classic' && <ClassicTemplate data={data} />}
        {template === 'minimal' && <MinimalTemplate data={data} />}
      </div>
    </div>
  )
}

function Header({ data, variant }: { data: ResumeData; variant: 'modern' | 'classic' | 'minimal' }) {
  const contactLine = [data.contact.email, data.contact.phone, data.contact.location].filter(Boolean).join(' | ')
  const linksLine = [data.contact.linkedin, data.contact.website].filter(Boolean).join(' | ')

  if (variant === 'classic') {
    return (
      <div className="text-center border-b-4 border-double border-zinc-800 pb-4 mb-6">
        <h1 className="font-serif text-3xl font-bold text-zinc-900 tracking-wide">{data.contact.fullName}</h1>
        {contactLine && <p className="font-serif text-xs text-zinc-700 mt-1.5">{contactLine}</p>}
        {linksLine && <p className="font-serif text-xs text-zinc-500 mt-0.5">{linksLine}</p>}
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <div className="mb-6">
        <h1 className="text-2xl font-extralight uppercase tracking-[0.3em] text-zinc-900">{data.contact.fullName}</h1>
        {contactLine && <p className="text-xs text-zinc-500 mt-2">{contactLine}</p>}
        {linksLine && <p className="text-xs text-zinc-400 mt-0.5">{linksLine}</p>}
      </div>
    )
  }

  return (
    <div className="text-center pb-5 mb-6 border-b border-zinc-200">
      <h1 className="text-2xl font-bold text-zinc-900">{data.contact.fullName}</h1>
      {contactLine && <p className="text-xs text-zinc-600 mt-1.5">{contactLine}</p>}
      {linksLine && <p className="text-xs text-zinc-500 mt-0.5">{linksLine}</p>}
    </div>
  )
}

function SectionTitle({ title, variant }: { title: string; variant: 'modern' | 'classic' | 'minimal' }) {
  if (variant === 'classic') {
    return (
      <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-zinc-900 mb-2.5">
        {title}
      </h2>
    )
  }
  if (variant === 'minimal') {
    return (
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-400 mb-2.5">
        {title}
      </h2>
    )
  }
  return (
    <h2 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-zinc-200 pb-1.5 mb-3">
      {title}
    </h2>
  )
}

function ExperienceBlock({ data, variant }: { data: ResumeData; variant: 'modern' | 'classic' | 'minimal' }) {
  return (
    <>
      {data.experience.map((exp) => (
        <div key={exp.id} className="mb-4 last:mb-0">
          <div className="flex justify-between items-start">
            <div>
              <p className={`font-semibold ${variant === 'classic' ? 'font-serif text-sm' : 'text-sm'} text-zinc-900`}>
                {exp.company}
              </p>
              <p className="text-xs text-zinc-600">{exp.position}{exp.location ? ` | ${exp.location}` : ''}</p>
            </div>
            <p className="text-xs text-zinc-500 whitespace-nowrap ml-4">{exp.startDate} - {exp.current ? 'Present' : exp.endDate}</p>
          </div>
          {exp.bullets.filter(b => b.trim()).map((bullet, i) => (
            <p key={i} className="text-xs text-zinc-700 mt-1 pl-3">• {bullet}</p>
          ))}
        </div>
      ))}
    </>
  )
}

function SkillsBlock({ data, variant }: { data: ResumeData; variant: 'modern' | 'classic' | 'minimal' }) {
  if (variant === 'minimal') {
    return (
      <p className="text-xs leading-relaxed text-zinc-700">
        {data.skills.map((s) => s.name).filter(Boolean).join(' · ')}
      </p>
    )
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {data.skills.map((skill) => (
        <span
          key={skill.id}
          className={
            variant === 'classic'
              ? 'text-xs text-zinc-700'
              : 'text-[11px] px-2 py-0.5 bg-primary/5 text-primary rounded-full'
          }
        >
          {skill.name}
        </span>
      ))}
    </div>
  )
}

function ModernTemplate({ data }: { data: ResumeData }) {
  return (
    <div>
      <Header data={data} variant="modern" />
      <div className="space-y-5">
        {data.summary && (
          <div>
            <SectionTitle title="Professional Summary" variant="modern" />
            <p className="text-xs leading-relaxed text-zinc-700">{data.summary}</p>
          </div>
        )}
        {data.experience.length > 0 && (
          <div>
            <SectionTitle title="Experience" variant="modern" />
            <ExperienceBlock data={data} variant="modern" />
          </div>
        )}
        {data.education.length > 0 && (
          <div>
            <SectionTitle title="Education" variant="modern" />
            {data.education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-start mb-2 last:mb-0">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{edu.institution}</p>
                  <p className="text-xs text-zinc-600">{edu.degree} in {edu.field}{edu.gpa ? ` | GPA: ${edu.gpa}` : ''}</p>
                </div>
                <p className="text-xs text-zinc-500 whitespace-nowrap ml-4">{edu.startDate} - {edu.endDate}</p>
              </div>
            ))}
          </div>
        )}
        {data.skills.length > 0 && (
          <div>
            <SectionTitle title="Skills" variant="modern" />
            <SkillsBlock data={data} variant="modern" />
          </div>
        )}
        {data.projects.length > 0 && (
          <div>
            <SectionTitle title="Projects" variant="modern" />
            {data.projects.map((proj) => (
              <div key={proj.id} className="mb-3 last:mb-0">
                <p className="text-sm font-semibold text-zinc-900">{proj.name}{proj.url ? <span className="text-xs text-primary font-normal ml-1">{proj.url}</span> : ''}</p>
                <p className="text-xs text-zinc-700 mt-0.5">{proj.description}</p>
                {proj.technologies.length > 0 && (
                  <p className="text-xs text-zinc-500 mt-0.5">Technologies: {proj.technologies.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        )}
        {data.certifications.length > 0 && (
          <div>
            <SectionTitle title="Certifications" variant="modern" />
            {data.certifications.map((cert) => (
              <div key={cert.id} className="mb-1.5 last:mb-0">
                <p className="text-sm font-semibold text-zinc-900">{cert.name}</p>
                <p className="text-xs text-zinc-600">{cert.issuer} | {cert.date}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ClassicTemplate({ data }: { data: ResumeData }) {
  return (
    <div className="font-serif">
      <Header data={data} variant="classic" />
      <div className="space-y-5">
        {data.summary && (
          <div>
            <SectionTitle title="Professional Summary" variant="classic" />
            <p className="text-xs leading-relaxed text-zinc-800">{data.summary}</p>
          </div>
        )}
        {data.experience.length > 0 && (
          <div>
            <SectionTitle title="Experience" variant="classic" />
            <ExperienceBlock data={data} variant="classic" />
          </div>
        )}
        {data.education.length > 0 && (
          <div>
            <SectionTitle title="Education" variant="classic" />
            {data.education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-start mb-2 last:mb-0">
                <div>
                  <p className="font-serif text-sm font-semibold text-zinc-900">{edu.institution}</p>
                  <p className="font-serif text-xs text-zinc-700">{edu.degree} in {edu.field}{edu.gpa ? ` | GPA: ${edu.gpa}` : ''}</p>
                </div>
                <p className="font-serif text-xs text-zinc-500 whitespace-nowrap ml-4">{edu.startDate} - {edu.endDate}</p>
              </div>
            ))}
          </div>
        )}
        {data.skills.length > 0 && (
          <div>
            <SectionTitle title="Skills" variant="classic" />
            <SkillsBlock data={data} variant="classic" />
          </div>
        )}
        {data.projects.length > 0 && (
          <div>
            <SectionTitle title="Projects" variant="classic" />
            {data.projects.map((proj) => (
              <div key={proj.id} className="mb-3 last:mb-0">
                <p className="font-serif text-sm font-semibold text-zinc-900">{proj.name}{proj.url ? <span className="text-xs font-normal text-zinc-500 ml-1">{proj.url}</span> : ''}</p>
                <p className="font-serif text-xs text-zinc-700 mt-0.5">{proj.description}</p>
                {proj.technologies.length > 0 && (
                  <p className="font-serif text-xs text-zinc-500 mt-0.5">Technologies: {proj.technologies.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        )}
        {data.certifications.length > 0 && (
          <div>
            <SectionTitle title="Certifications" variant="classic" />
            {data.certifications.map((cert) => (
              <div key={cert.id} className="mb-1.5 last:mb-0">
                <p className="font-serif text-sm font-semibold text-zinc-900">{cert.name}</p>
                <p className="font-serif text-xs text-zinc-600">{cert.issuer} | {cert.date}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MinimalTemplate({ data }: { data: ResumeData }) {
  return (
    <div>
      <Header data={data} variant="minimal" />
      <div className="space-y-6">
        {data.summary && (
          <div>
            <SectionTitle title="Professional Summary" variant="minimal" />
            <p className="text-xs leading-relaxed text-zinc-600">{data.summary}</p>
          </div>
        )}
        {data.experience.length > 0 && (
          <div>
            <SectionTitle title="Experience" variant="minimal" />
            <ExperienceBlock data={data} variant="minimal" />
          </div>
        )}
        {data.education.length > 0 && (
          <div>
            <SectionTitle title="Education" variant="minimal" />
            {data.education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-start mb-2 last:mb-0">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{edu.institution}</p>
                  <p className="text-xs text-zinc-500">{edu.degree} in {edu.field}{edu.gpa ? ` | GPA: ${edu.gpa}` : ''}</p>
                </div>
                <p className="text-xs text-zinc-400 whitespace-nowrap ml-4">{edu.startDate} - {edu.endDate}</p>
              </div>
            ))}
          </div>
        )}
        {data.skills.length > 0 && (
          <div>
            <SectionTitle title="Skills" variant="minimal" />
            <SkillsBlock data={data} variant="minimal" />
          </div>
        )}
        {data.projects.length > 0 && (
          <div>
            <SectionTitle title="Projects" variant="minimal" />
            {data.projects.map((proj) => (
              <div key={proj.id} className="mb-3 last:mb-0">
                <p className="text-sm font-medium text-zinc-900">{proj.name}{proj.url ? <span className="text-xs text-zinc-400 font-normal ml-1">{proj.url}</span> : ''}</p>
                <p className="text-xs text-zinc-600 mt-0.5">{proj.description}</p>
                {proj.technologies.length > 0 && (
                  <p className="text-xs text-zinc-400 mt-0.5">Technologies: {proj.technologies.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        )}
        {data.certifications.length > 0 && (
          <div>
            <SectionTitle title="Certifications" variant="minimal" />
            {data.certifications.map((cert) => (
              <div key={cert.id} className="mb-1.5 last:mb-0">
                <p className="text-sm font-medium text-zinc-900">{cert.name}</p>
                <p className="text-xs text-zinc-500">{cert.issuer} | {cert.date}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}