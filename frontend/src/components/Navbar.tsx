'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, BarChart3, Search, Sparkles } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/builder', label: 'Builder', icon: FileText },
  { href: '/analyzer', label: 'ATS Analyzer', icon: BarChart3 },
  { href: '/matcher', label: 'JD Matcher', icon: Search },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-border bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg text-primary">
            <Sparkles className="w-5 h-5" />
            <span>ResumeAI</span>
          </Link>
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === href || pathname.startsWith(href + '/')
                    ? 'bg-primary/10 text-primary'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
