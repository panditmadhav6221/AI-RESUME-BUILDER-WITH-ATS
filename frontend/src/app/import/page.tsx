'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckCircle2, FileUp, Sparkles, Zap } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ErrorBanner from '@/components/ui/ErrorBanner'
import SectionHeading from '@/components/ui/SectionHeading'
import { TextArea } from '@/components/ui/Field'
import { Loading } from '@/components/ui/Loading'
import { aiApi } from '@/lib/api'
import type { ResumeData } from '@/types'

import { BUILDER_DRAFT_KEY } from '@/lib/storage-keys'

const SAMPLE_RAW_RESUME = `Alex Chen
San Francisco, CA | alex.chen@example.com | (555) 345-6789 | linkedin.com/in/alexchen

PROFESSIONAL SUMMARY
Senior software engineer with 8 years of experience building payment infrastructure and developer platforms at scale.

EXPERIENCE
Senior Software Engineer, Stripe | 03/2021 - Present
- Led migration of 40+ services to Kubernetes, cutting infrastructure spend by 32% year over year.
- Designed an idempotent payments API that reduced retry-related incidents by 68%.
- Mentored 5 engineers, two of whom were promoted within 12 months.

Software Engineer, Uber | 06/2018 - 02/2021
- Built the real-time dispatch ranking engine serving 900K trips per day.
- Improved p95 ETA accuracy from 4.1 minutes to 2.3 minutes.

EDUCATION
University of Washington
BS Computer Science | 09/2014 - 05/2018 | GPA 3.8

SKILLS
Python, Go, TypeScript, Kubernetes, PostgreSQL, Redis, Terraform, Kafka, gRPC, AWS

PROJECTS
CloudScale - open-source autoscaling controller for Kubernetes (github.com/alexchen/cloudscale)`

const BENEFITS = [
  {
    title: 'Contact Details',
    body: 'Full Name, Email, Phone, City, LinkedIn.',
  },
  {
    title: 'Experience & Dates',
    body: 'Role titles, companies, MM/YYYY normalized dates, and individual achievement bullets.',
  },
  {
    title: 'Education & Skills',
    body: 'Degrees, majors, GPAs, and parsed technical skill tags.',
  },
]

export default function ImportPage() {
  const router = useRouter()
  const [rawText, setRawText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  const readFile = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => setRawText(String(reader.result ?? ''))
    reader.onerror = () => setError('Could not read that file')
    reader.readAsText(file)
  }

  const handleParse = async () => {
    if (!rawText.trim()) {
      setError('Please paste your resume or LinkedIn profile text first.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const parsed: ResumeData = await aiApi.parseRawResume(rawText)
      const title =
        parsed.experience[0]?.position ||
        (parsed.contact.fullName ? `${parsed.contact.fullName}'s Resume` : 'Imported Resume')
      const targetRole = parsed.experience[0]?.position ?? ''
      localStorage.setItem(
        BUILDER_DRAFT_KEY,
        JSON.stringify({ id: null, title, targetRole, template: 'modern', data: parsed }),
      )
      router.push('/builder')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse your resume text')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Import Resume</h1>
          <p className="text-zinc-600 mt-1">AI auto-extract &amp; fill</p>
        </div>

        <Card tone="primary">
          <div className="flex items-start gap-4">
            <span className="w-12 h-12 rounded-2xl bg-white text-primary grid place-items-center shrink-0 border border-border">
              <FileUp className="w-6 h-6" />
            </span>
            <div>
              <h2 className="font-bold text-zinc-900">1-Click Resume &amp; LinkedIn Importer</h2>
              <p className="text-[13px] text-zinc-600 mt-1">
                Paste any unformatted resume, exported PDF text, or LinkedIn profile. The AI extracts all fields,
                normalizes dates to MM/YYYY, and opens the builder with everything filled in.
              </p>
            </div>
          </div>
        </Card>

        {error && <ErrorBanner message={error} />}

        <Card>
          <SectionHeading
            title="Paste Resume / LinkedIn Text"
            subtitle="Copy all text from your existing resume or LinkedIn profile"
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setRawText(SAMPLE_RAW_RESUME)
                  setFileName('')
                  setError('')
                }}
              >
                Load Sample
              </Button>
            }
          />

          <label className="mb-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-6 cursor-pointer hover:border-primary/50 transition-colors">
            <FileUp className="w-5 h-5 text-zinc-400" />
            <span className="text-[13px] font-medium text-zinc-600">
              {fileName || 'Or upload a .txt / .md file'}
            </span>
            <input
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) readFile(file)
              }}
              className="hidden"
            />
          </label>

          <TextArea
            rows={12}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste raw text here... (e.g. John Doe, Experience, Education, Skills)"
          />

          <Button loading={busy} onClick={handleParse} icon={<Zap className="w-4 h-4" />}>
            Auto-Extract &amp; Populate Resume
          </Button>
        </Card>

        {busy && <Loading label="AI parsing your career history…" />}

        <Card elevated={false} tone="muted">
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
            What Gets Extracted Automatically
          </p>
          <ul className="space-y-2.5">
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex items-start gap-2.5 text-[13px] text-zinc-600">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>
                  <span className="font-semibold text-zinc-800">{b.title}:</span> {b.body}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <p className="text-[12px] text-zinc-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Nothing is saved until you hit Save in the builder.
        </p>
      </main>
    </>
  )
}
