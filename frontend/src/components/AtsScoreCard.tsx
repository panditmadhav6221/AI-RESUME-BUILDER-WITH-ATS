'use client'

import type { ATSAnalysis } from '@/types'
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'

interface Props {
  analysis: ATSAnalysis
}

export default function AtsScoreCard({ analysis }: Props) {
  const scoreColor = analysis.score >= 80 ? 'text-success' : analysis.score >= 60 ? 'text-warning' : 'text-error'
  const scoreBg = analysis.score >= 80 ? 'bg-success/10' : analysis.score >= 60 ? 'bg-warning/10' : 'bg-error/10'

  const severityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <XCircle className="w-4 h-4 text-error mt-0.5 shrink-0" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
      case 'info': return <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
      default: return <Info className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
    }
  }

  return (
    <div className="space-y-6">
      <div className={`rounded-xl ${scoreBg} p-6 text-center`}>
        <div className={`text-5xl font-bold ${scoreColor}`}>{analysis.score}</div>
        <p className={`text-sm font-medium mt-1 ${scoreColor}`}>out of 100</p>
        <p className="text-sm text-zinc-600 mt-3">{analysis.summary}</p>
      </div>

      {analysis.issues.length > 0 && (
        <div>
          <h3 className="font-semibold text-zinc-900 mb-3">Issues Found ({analysis.issues.length})</h3>
          <div className="space-y-3">
            {analysis.issues.map((issue) => (
              <div key={issue.id} className="border border-border rounded-lg p-3">
                <div className="flex items-start gap-2">
                  {severityIcon(issue.severity)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900">{issue.message}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{issue.fix}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.passedChecks.length > 0 && (
        <div>
          <h3 className="font-semibold text-zinc-900 mb-3">Passed Checks ({analysis.passedChecks.length})</h3>
          <div className="space-y-2">
            {analysis.passedChecks.map((check, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                <span className="text-sm text-zinc-700">{check}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
