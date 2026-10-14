import Link from 'next/link'
import { Sparkles } from 'lucide-react'

const FOOTER_LINKS = [
  { href: '/builder', label: 'Resume Builder' },
  { href: '/analyzer', label: 'ATS Analyzer' },
  { href: '/matcher', label: 'JD Matcher' },
  { href: '/cover-letter', label: 'Cover Letter' },
  { href: '/interview-prep', label: 'Interview Prep' },
  { href: '/tracker', label: 'Job Tracker' },
  { href: '/import', label: 'Import Resume' },
  { href: '/', label: 'Dashboard' },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-white">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg text-primary">
              <Sparkles className="w-5 h-5" />
              <span>ResumeAI</span>
            </Link>
            <p className="mt-3 text-[13px] leading-relaxed text-zinc-500">
              Build ATS-optimized resumes with AI-powered content assistance, job-description matching,
              and one-click PDF or DOCX export.
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-2">
            {FOOTER_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className="text-[13px] text-zinc-600 hover:text-primary transition-colors">
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-zinc-400">© {year} ResumeAI. All rights reserved.</p>
          <p className="text-[12px] text-zinc-400">Built for job seekers who want to beat the ATS.</p>
        </div>
      </div>
    </footer>
  )
}
