'use client'

import { useState, useCallback, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface GstBreakdown {
  month: string
  tax_percent: number
  bill_count: number
  taxable_value: number
  total_gst: number
  cgst: number
  sgst: number
  total_with_gst: number
}

interface GstSummary {
  total_bills: number
  total_taxable: number
  total_gst: number
  cgst: number
  sgst: number
  total_discount: number
  grand_total: number
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function GstReport() {
  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = today.slice(0, 7) + '-01'

  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [summary, setSummary] = useState<GstSummary | null>(null)
  const [breakdown, setBreakdown] = useState<GstBreakdown[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await invoke<{ success: boolean; data: { summary: GstSummary; breakdown: GstBreakdown[] } }>('get_gst_report', { fromDate: from, toDate: to })
      if (res.success) { setSummary(res.data.summary); setBreakdown(res.data.breakdown) }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [from, to])

  useEffect(() => { void load() }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <button onClick={load} disabled={loading}
          className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
          {loading ? 'Loading…' : 'Generate'}
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Bills', value: String(summary.total_bills) },
            { label: 'Taxable Value', value: fmt(summary.total_taxable) },
            { label: 'CGST Collected', value: fmt(summary.cgst) },
            { label: 'SGST Collected', value: fmt(summary.sgst) },
          ].map(s => (
            <div key={s.label} className="bg-card border rounded-xl px-4 py-3 text-center">
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {summary && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-wrap gap-6 text-sm">
          <div><span className="text-muted-foreground">Total GST: </span><span className="font-bold text-amber-700">{fmt(summary.total_gst)}</span></div>
          <div><span className="text-muted-foreground">Total Discount: </span><span className="font-semibold">{fmt(summary.total_discount)}</span></div>
          <div><span className="text-muted-foreground">Grand Total (incl. GST): </span><span className="font-bold">{fmt(summary.grand_total)}</span></div>
        </div>
      )}

      {breakdown.length > 0 && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['Month', 'GST Rate', 'Bills', 'Taxable Value', 'CGST', 'SGST', 'Total GST', 'Total w/ GST'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {breakdown.map((row, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-4 py-3">{row.month}</td>
                  <td className="px-4 py-3">{row.tax_percent}%</td>
                  <td className="px-4 py-3">{row.bill_count}</td>
                  <td className="px-4 py-3">{fmt(row.taxable_value)}</td>
                  <td className="px-4 py-3">{fmt(row.cgst)}</td>
                  <td className="px-4 py-3">{fmt(row.sgst)}</td>
                  <td className="px-4 py-3 font-semibold text-amber-700">{fmt(row.total_gst)}</td>
                  <td className="px-4 py-3">{fmt(row.total_with_gst)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && breakdown.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">No paid bills in this date range.</div>
      )}
    </div>
  )
}
