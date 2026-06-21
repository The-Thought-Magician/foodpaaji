'use client'

import { useState } from 'react'
import { SalesReport } from '@/views/sales-report'
import { EodSummary } from '@/components/reports/eod-summary'
import { GstReport } from '@/components/reports/gst-report'

type Tab = 'sales' | 'eod' | 'gst'

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('sales')
  const tabs: { key: Tab; label: string }[] = [
    { key: 'sales', label: 'Sales Report' },
    { key: 'eod', label: 'End of Day' },
    { key: 'gst', label: 'GST Report' },
  ]
  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'sales' && <SalesReport />}
      {tab === 'eod' && <EodSummary />}
      {tab === 'gst' && <GstReport />}
    </div>
  )
}
