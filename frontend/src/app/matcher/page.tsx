'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import type { JDAnalysis } from '@/types'
import { Loader2, CheckCircle2, XCircle, Sparkles, ClipboardPaste } from 'lucide-react'
import { analyzeJD } from '@/lib/api-client'

export default function MatcherPage() {
  const [jd, setJd] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [analysis, setAnalysis] = useState<JDAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadFromBuilder = () => {
    const saved = localStorage.getItem('resume-builder-text')
    if (saved) {
      setResumeText(saved)
      setError('')
    } else {
      setError('No resume found. Build one in the Builder or upload it in the Analyzer first.')
    }
  }

  const handleAnalyze = async () => {
    if (!jd.trim()) return
    setLoading(true)
    setError('')

    try {
      const result = await analyzeJD(jd.trim(), resumeText.trim())
      setAnalysis(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Job Description Matcher</h1>
        <p className="text-zinc-600 mb-8">Paste a job description to see how your resume matches up.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Job Description</label>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full job description here..."
              rows={12}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-700">Your Resume (optional)</label>
              <button
                onClick={loadFromBuilder}
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-dark"
              >
                <ClipboardPaste className="w-3 h-3" /> Load from Builder
              </button>
            </div>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume text here, or click 'Load from Builder'..."
              rows={12}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading || !jd.trim()}
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Analyzing...' : 'Analyze Match'}
        </button>

        {error && (
          <div className="mt-6 p-4 bg-error/10 border border-error/20 rounded-xl">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {analysis && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center gap-4 p-6 bg-zinc-50 rounded-xl">
              <div className="text-4xl font-bold text-primary">{analysis.matchPercentage}%</div>
              <div>
                <p className="font-semibold text-zinc-900">Overall Match</p>
                <p className="text-sm text-zinc-600">Based on keyword analysis of the job description</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-zinc-900 mb-3">
                  Matched Skills ({analysis.matchedSkills.length})
                </h3>
                <div className="space-y-2">
                  {analysis.matchedSkills.map((skill, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                      <span className="text-zinc-700">{skill.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 mb-3">
                  Missing Skills ({analysis.missingSkills.length})
                </h3>
                <div className="space-y-2">
                  {analysis.missingSkills.map((skill, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <XCircle className="w-4 h-4 text-error shrink-0" />
                      <span className="text-zinc-700">{skill.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {analysis.suggestions.length > 0 && (
              <div>
                <h3 className="font-semibold text-zinc-900 mb-3">Suggestions</h3>
                <div className="space-y-2">
                  {analysis.suggestions.map((s, i) => (
                    <p key={i} className="text-sm text-zinc-700 flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      {s}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}
