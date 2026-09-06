'use client'

import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { ArrowRight, FileText, BarChart3, Search, Sparkles } from 'lucide-react'

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered ATS Optimization
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-zinc-900 mb-4">
            Build Resumes That<br />Pass the ATS Test
          </h1>
          <p className="text-lg text-zinc-600 max-w-2xl mx-auto mb-10">
            Create professional, ATS-optimized resumes with AI-powered content assistance.
            Get real-time scoring, match against job descriptions, and export in PDF/DOCX.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/builder"
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors"
            >
              Start Building
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/analyzer"
              className="inline-flex items-center gap-2 border border-border text-zinc-700 px-6 py-3 rounded-xl font-medium hover:bg-zinc-50 transition-colors"
            >
              Check ATS Score
            </Link>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                title: 'Smart Resume Builder',
                desc: 'Multi-step form with live preview. Choose from ATS-safe templates.',
              },
              {
                icon: BarChart3,
                title: 'ATS Score Analyzer',
                desc: 'Upload or build a resume and get a detailed 0-100 ATS compatibility score.',
              },
              {
                icon: Search,
                title: 'JD Matcher',
                desc: 'Paste a job description and see how your resume measures up.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="border border-border rounded-xl p-6 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-zinc-900 mb-1">{title}</h3>
                <p className="text-sm text-zinc-600">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
