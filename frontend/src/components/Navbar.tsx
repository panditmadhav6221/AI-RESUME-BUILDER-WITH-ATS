'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Briefcase,
  FileText,
  FileUp,
  Mail,
  Megaphone,
  Search,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'

export const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: FileText },
  { href: '/builder', label: 'Builder', icon: Sparkles },
  { href: '/analyzer', label: 'ATS Scan', icon: BarChart3 },
  { href: '/matcher', label: 'JD Matcher', icon: Target },
  { href: '/cover-letter', label: 'Cover Letter', icon: Mail },
  { href: '/interview-prep', label: 'Interview Prep', icon: Users },
  { href: '/recruiter-audit', label: 'Recruiter Scan', icon: Search },
  { href: '/outreach', label: 'Outreach', icon: Megaphone },
  { href: '/tracker', label: 'Tracker', icon: Briefcase },
  { href: '/import', label: 'Import', icon: FileUp },
]

export default function Navbar() {
  const pathname = usePathname()
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg text-primary shrink-0">
            <Sparkles className="w-5 h-5" />
            <span className="hidden sm:inline">ResumeAI</span>
          </Link>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                title={label}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive(href) ? 'bg-primary/10 text-primary' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden xl:inline">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
