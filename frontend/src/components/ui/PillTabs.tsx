'use client'

import type { ReactNode } from 'react'

export interface TabItem<T extends string> {
  key: T
  label: string
  icon?: ReactNode
}

export default function PillTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  label,
}: {
  tabs: readonly TabItem<T>[]
  activeTab: T
  onTabChange: (key: T) => void
  label?: string
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1" role="tablist" aria-label={label}>
      {tabs.map(({ key, label: text, icon }) => (
        <button
          key={key}
          role="tab"
          type="button"
          aria-selected={key === activeTab}
          onClick={() => onTabChange(key)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-colors ${
            key === activeTab ? 'bg-primary text-white' : 'bg-surface text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          {icon}
          {text}
        </button>
      ))}
    </div>
  )
}
