'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import AtsScoreCard from '@/components/AtsScoreCard'
import type { ATSAnalysis } from '@/types'
import { Upload, Loader2, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { parseResume } from '@/lib/api-client'

export default function AnalyzerPage() {
  const [analysis, setAnalysis] = useState<ATSAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resumeText, setResumeText] = useState<string | null>(null)
  const [showText, setShowText] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError('')
    try {
      const result = await parseResume(file)
      setAnalysis(result.analysis)
      setResumeText(result.text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse resume')
    } finally {
      setLoading(false)
    }
  }

  const useInMatcher = () => {
    if (!resumeText) return
    localStorage.setItem('resume-builder-text', resumeText)
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">ATS Score Analyzer</h1>
        <p className="text-zinc-600 mb-8">Upload or use your built resume to check its ATS compatibility.</p>

        <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-12 cursor-pointer hover:border-primary/50 transition-colors">
          <Upload className="w-8 h-8 text-zinc-400 mb-3" />
          <p className="text-sm text-zinc-600 font-medium">Upload your resume (PDF or DOCX)</p>
          <p className="text-xs text-zinc-400 mt-1">Max file size: 10MB</p>
          <input type="file" accept=".pdf,.docx" onChange={handleFileUpload} className="hidden" />
        </label>

        {error && (
          <div className="mt-6 p-4 bg-error/10 border border-error/20 rounded-xl">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="ml-2 text-sm text-zinc-600">Analyzing your resume...</span>
          </div>
        )}

        {analysis && (
          <div className="mt-8 max-w-2xl mx-auto">
            <AtsScoreCard analysis={analysis} />
          </div>
        )}

        {resumeText && (
          <div className="mt-8 max-w-2xl mx-auto border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowText(!showText)}
              className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors"
            >
              <span className="text-sm font-medium text-zinc-700">Extracted resume text ({resumeText.length} chars)</span>
              {showText ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
            </button>
            {showText && (
              <pre className="px-4 py-3 text-xs text-zinc-600 whitespace-pre-wrap max-h-64 overflow-y-auto">{resumeText}</pre>
            )}
            <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-3">
              <button
                onClick={useInMatcher}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark"
              >
                Use this text in JD Matcher <ArrowRight className="w-4 h-4" />
              </button>
              <Link href="/matcher" className="text-xs text-zinc-400 hover:text-zinc-600">Go to Matcher →</Link>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
