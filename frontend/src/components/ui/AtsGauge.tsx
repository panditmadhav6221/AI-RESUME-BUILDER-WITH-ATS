'use client'

type Size = 'sm' | 'md' | 'lg'

const SIZES: Record<Size, { box: number; score: number; suffix: number }> = {
  sm: { box: 48, score: 15, suffix: 9 },
  md: { box: 64, score: 19, suffix: 10 },
  lg: { box: 80, score: 24, suffix: 11 },
}

export function atsTone(score: number) {
  if (score >= 85) return { ring: '#10b981', text: 'text-emerald-600', label: 'ATS Ready' }
  if (score >= 70) return { ring: '#f59e0b', text: 'text-amber-600', label: 'Good Potential' }
  return { ring: '#ef4444', text: 'text-red-600', label: 'Needs Polish' }
}

export default function AtsGauge({ score, size = 'md', showLabel = true }: { score: number; size?: Size; showLabel?: boolean }) {
  const tone = atsTone(score)
  const { box, score: scoreSize, suffix } = SIZES[size]
  const clamped = Math.max(0, Math.min(100, score))

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative rounded-full grid place-items-center shrink-0"
        style={{
          width: box,
          height: box,
          background: `conic-gradient(${tone.ring} ${clamped * 3.6}deg, #e2e8f0 0deg)`,
        }}
      >
        <div className="absolute inset-[3.5px] rounded-full bg-white grid place-items-center">
          <div className="flex items-baseline">
            <span className="font-extrabold leading-none" style={{ fontSize: scoreSize, color: tone.ring }}>
              {clamped}
            </span>
            <span className="text-zinc-400" style={{ fontSize: suffix }}>
              /100
            </span>
          </div>
        </div>
      </div>
      {showLabel && size !== 'sm' && (
        <div>
          <p className={`text-sm font-bold ${tone.text}`}>{tone.label}</p>
          <p className="text-[11px] text-zinc-500">ATS Compatibility</p>
        </div>
      )}
    </div>
  )
}
