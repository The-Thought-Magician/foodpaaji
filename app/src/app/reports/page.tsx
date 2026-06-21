'use client'

import { useState } from 'react'
import { SalesReport } from '@/views/sales-report'
import { EodSummary } from '@/components/reports/eod-summary'

export default function ReportsPage() {
  const [tab, setTab] = useState<'sales' | 'eod'>('sales')
  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button onClick={() => setTab('sales')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'sales' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Sales Report</button>
        <button onClick={() => setTab('eod')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'eod' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>End of Day</button>
      </div>
      {tab === 'sales' ? <SalesReport /> : <EodSummary />}
    </div>
  )
}
