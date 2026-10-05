'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Clock, Mail, Megaphone, Sparkles, UserCheck, Users } from 'lucide-react'
import PageShell from '@/components/PageShell'
import ResumeBanner from '@/components/ResumeBanner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ErrorBanner from '@/components/ui/ErrorBanner'
import CopyButton from '@/components/ui/CopyButton'
import PillTabs from '@/components/ui/PillTabs'
import SectionHeading from '@/components/ui/SectionHeading'
import { TextArea, TextField } from '@/components/ui/Field'
import { Loading } from '@/components/ui/Loading'
import { useActiveResume } from '@/hooks/useResumes'
import { aiApi } from '@/lib/api'
import type { ContactType, OutreachResult } from '@/types'

const CONTACT_TYPES: { key: ContactType; label: string }[] = [
  { key: 'hiring_manager', label: 'Hiring Manager' },
  { key: 'recruiter', label: 'Tech Recruiter' },
  { key: 'alumni', label: 'Alumni / Peer' },
]

type TabKey = 'connection' | 'email' | 'referral' | 'followup'

const TABS = [
  { key: 'connection', label: 'LinkedIn Note', icon: <Users className="w-3.5 h-3.5" /> },
  { key: 'email', label: 'Cold Pitch Email', icon: <Mail className="w-3.5 h-3.5" /> },
  { key: 'referral', label: 'Alumni Referral', icon: <UserCheck className="w-3.5 h-3.5" /> },
  { key: 'followup', label: 'Follow-Up', icon: <Clock className="w-3.5 h-3.5" /> },
] as const

const LINKEDIN_LIMIT = 300

function OutreachContent() {
  const params = useSearchParams()
  const resume = useActiveResume(params.get('id'))

  const [companyName, setCompanyName] = useState('')
  const [roleInput, setRoleInput] = useState<string | null>(null)
  const [contactType, setContactType] = useState<ContactType>('hiring_manager')
  const [jd, setJd] = useState('')
  const [tab, setTab] = useState<TabKey>('connection')
  const [result, setResult] = useState<OutreachResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const targetRole = roleInput ?? resume.targetRole ?? ''
  const setTargetRole = setRoleInput

  const generate = async () => {
    if (!resume.data) {
      setError('Please select or build a resume first.')
      return
    }
    if (!companyName.trim() || !targetRole.trim()) {
      setError('Please provide company name and target role.')
      return
    }
    setBusy(true)
    setError('')
    try {
      setResult(await aiApi.generateOutreach(resume.data, companyName.trim(), targetRole.trim(), contactType, jd.trim() || null))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate outreach messages')
    } finally {
      setBusy(false)
    }
  }

  const noteLength = result?.connectionNote.length ?? 0
  const withinLimit = noteLength <= LINKEDIN_LIMIT

  return (
    <PageShell
      title="Cold Outreach"
      subtitle="LinkedIn & referral pitch"
      banner={<ResumeBanner resume={resume} eyebrow="Networking outreach engine" icon={<Megaphone className="w-5 h-5" />} showView={false} />}
    >
      <div className="space-y-6">
        {error && <ErrorBanner message={error} />}

        <Card>
          <SectionHeading
            title="Target Company & Role"
            subtitle="Bypass ATS black holes by messaging decision makers directly with a compelling hook."
          />
          <div className="grid sm:grid-cols-2 gap-x-4">
            <TextField
              label="Company Name *"
              value={companyName}
              placeholder="e.g. Stripe, Uber, OpenAI"
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <TextField
              label="Target Role *"
              value={targetRole}
              placeholder="e.g. Senior Backend Engineer"
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <p className="text-[13px] font-semibold text-zinc-700 mb-2">Who Are You Messaging?</p>
            <div className="flex flex-wrap gap-2">
              {CONTACT_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setContactType(t.key)}
                  className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition-colors ${
                    contactType === t.key
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-white border-border text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <TextArea
            label="Job Description / Context (Optional)"
            rows={3}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Anything specific you want to reference…"
          />

          <Button loading={busy} onClick={generate} icon={<Sparkles className="w-4 h-4" />}>
            Generate 4 Outreach Pitch Messages
          </Button>
        </Card>

        {busy && !result && <Loading label="Generating high-converting networking messages…" />}

        {result && (
          <div className="space-y-4">
            <PillTabs tabs={TABS} activeTab={tab} onTabChange={setTab} label="Outreach message types" />

            {tab === 'connection' && (
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-zinc-900">LinkedIn Connection Note</h3>
                    <p className="text-[13px] text-zinc-500">
                      Strictly under {LINKEDIN_LIMIT} characters for non-premium connection requests.
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      withinLimit ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {noteLength} / {LINKEDIN_LIMIT} chars
                  </span>
                </div>
                <div className="rounded-xl bg-surface border border-border p-4 text-[13.5px] leading-relaxed text-zinc-800 whitespace-pre-wrap">
                  {result.connectionNote}
                </div>
                <div className="mt-3">
                  <CopyButton text={result.connectionNote} label="Copy Connection Note" size="md" variant="secondary" />
                </div>
              </Card>
            )}

            {tab === 'email' && (
              <Card>
                <h3 className="font-semibold text-zinc-900 mb-1">Hiring Manager Cold Pitch</h3>
                <p className="text-[13px] text-zinc-500 mb-3">
                  Send directly via email or LinkedIn InMail to lead with value.
                </p>
                <div className="rounded-xl bg-surface border border-border p-4 mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Subject</p>
                  <p className="text-[13.5px] font-semibold text-zinc-900">{result.coldEmailSubject}</p>
                </div>
                <div className="rounded-xl bg-surface border border-border p-4 text-[13.5px] leading-relaxed text-zinc-800 whitespace-pre-wrap">
                  {result.coldEmailBody}
                </div>
                <div className="mt-3">
                  <CopyButton
                    text={`${result.coldEmailSubject}\n\n${result.coldEmailBody}`}
                    label="Copy Pitch Email"
                    size="md"
                    variant="secondary"
                  />
                </div>
              </Card>
            )}

            {tab === 'referral' && (
              <Card>
                <h3 className="font-semibold text-zinc-900 mb-1">Alumni Referral Request</h3>
                <p className="text-[13px] text-zinc-500 mb-3">Warm, low-pressure ask to someone working at the company.</p>
                <div className="rounded-xl bg-surface border border-border p-4 text-[13.5px] leading-relaxed text-zinc-800 whitespace-pre-wrap">
                  {result.referralRequest}
                </div>
                <div className="mt-3">
                  <CopyButton text={result.referralRequest} label="Copy Referral Request" size="md" variant="secondary" />
                </div>
              </Card>
            )}

            {tab === 'followup' && (
              <Card>
                <h3 className="font-semibold text-zinc-900 mb-1">4-Day Polite Follow-Up</h3>
                <p className="text-[13px] text-zinc-500 mb-3">
                  Send 4-5 days after your initial message if no reply received.
                </p>
                <div className="rounded-xl bg-surface border border-border p-4 text-[13.5px] leading-relaxed text-zinc-800 whitespace-pre-wrap">
                  {result.followUpNote}
                </div>
                <div className="mt-3">
                  <CopyButton text={result.followUpNote} label="Copy Follow-Up" size="md" variant="secondary" />
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </PageShell>
  )
}

export default function OutreachPage() {
  return (
    <Suspense fallback={<Loading label="Loading outreach…" />}>
      <OutreachContent />
    </Suspense>
  )
}
