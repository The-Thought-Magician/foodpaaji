'use client'

import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download } from 'lucide-react'

export function SalesExport() {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const [from, setFrom] = useState(weekAgo)
  const [to, setTo] = useState(today)
  const [status, setStatus] = useState<string | null>(null)

  const handleExport = async () => {
    setStatus('Exporting...')
    const res = await invoke<{ success: boolean; data: { csv: string; count: number } }>('export_sales_csv', { fromDate: from, toDate: to }).catch(() => null)
    if (!res?.success) { setStatus('Export failed'); return }
    const blob = new Blob([res.data.csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `sales-${from}-to-${to}.csv`
    a.click(); URL.revokeObjectURL(url)
    setStatus(`Exported ${res.data.count} bills`)
  }

  return (
    <div className="space-y-4 max-w-md">
      <h3 className="font-semibold flex items-center gap-2"><Download className="w-4 h-4" />Export Sales Data</h3>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
      </div>
      <Button className="gradient-spice text-white w-full" onClick={handleExport}>
        <Download className="w-4 h-4 mr-2" />Export CSV
      </Button>
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
      <p className="text-xs text-muted-foreground">Exports bill number, date, customer, subtotal, tax, discount, total, payment method, and status.</p>
    </div>
  )
}
