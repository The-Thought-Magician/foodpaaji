'use client'

import { useState, useCallback, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface HourSlot {
  hour: number
  bill_count: number
  revenue: number
  avg_bill: number
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const label = (h: number) => {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

export function HourlySales() {
  const today = new Date().toISOString().slice(0, 10)
  const sevenAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)

  const [from, setFrom] = useState(sevenAgo)
  const [to, setTo] = useState(today)
  const [data, setData] = useState<HourSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [metric, setMetric] = useState<'revenue' | 'bill_count'>('revenue')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await invoke<{ success: boolean; data: HourSlot[] }>('get_hourly_sales', { fromDate: from, toDate: to })
      if (res.success) setData(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [from, to])

  useEffect(() => { void load() }, [load])

  const allHours: HourSlot[] = Array.from({ length: 24 }, (_, i) => {
    const found = data.find(d => d.hour === i)
    return found ?? { hour: i, bill_count: 0, revenue: 0, avg_bill: 0 }
  })

  const max = Math.max(...allHours.map(h => metric === 'revenue' ? h.revenue : h.bill_count), 1)
  const peakHour = allHours.reduce((a, b) => (metric === 'revenue' ? b.revenue > a.revenue : b.bill_count > a.bill_count) ? b : a, allHours[0])
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0)
  const totalBills = data.reduce((s, d) => s + d.bill_count, 0)

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
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          <button onClick={() => setMetric('revenue')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${metric === 'revenue' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
            Revenue
          </button>
          <button onClick={() => setMetric('bill_count')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${metric === 'bill_count' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
            Orders
          </button>
        </div>
        <button onClick={load} disabled={loading}
          className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
          {loading ? 'Loading…' : 'Apply'}
        </button>
      </div>

      {data.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border rounded-xl px-4 py-3 text-center">
            <p className="text-lg font-bold">{label(peakHour.hour)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Peak Hour</p>
          </div>
          <div className="bg-card border rounded-xl px-4 py-3 text-center">
            <p className="text-lg font-bold">{fmt(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Revenue</p>
          </div>
          <div className="bg-card border rounded-xl px-4 py-3 text-center">
            <p className="text-lg font-bold">{totalBills}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Orders</p>
          </div>
        </div>
      )}

      <div className="bg-card border rounded-xl p-5">
        <h4 className="text-sm font-semibold mb-4">{metric === 'revenue' ? 'Revenue' : 'Orders'} by Hour</h4>
        {data.length === 0 && !loading ? (
          <p className="text-center text-muted-foreground text-sm py-8">No paid bills in this date range.</p>
        ) : (
          <div className="flex items-end gap-1 h-40">
            {allHours.map(h => {
              const val = metric === 'revenue' ? h.revenue : h.bill_count
              const pct = max > 0 ? (val / max) * 100 : 0
              const isPeak = h.hour === peakHour.hour && val > 0
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                    <div className="bg-popover border rounded-lg shadow px-2 py-1 text-xs whitespace-nowrap">
                      <div className="font-semibold">{label(h.hour)}</div>
                      <div>{metric === 'revenue' ? fmt(h.revenue) : `${h.bill_count} orders`}</div>
                      {h.bill_count > 0 && <div className="text-muted-foreground">avg {fmt(h.avg_bill)}</div>}
                    </div>
                  </div>
                  <div className="w-full rounded-t-sm transition-all"
                    style={{ height: `${pct}%`, background: isPeak ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.35)', minHeight: val > 0 ? 2 : 0 }} />
                  <span className="text-[9px] text-muted-foreground leading-none">{h.hour % 3 === 0 ? label(h.hour) : ''}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
