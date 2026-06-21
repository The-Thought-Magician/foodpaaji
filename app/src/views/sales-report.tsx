'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Download, BarChart2 } from 'lucide-react'

interface Bill { id: number; total_amount: number; tax_amount: number; discount_amount: number; subtotal: number; status: string; created_at: string }
interface PopularItem { menu_item_id: number; item_name: string; order_count: number; total_revenue: number }
interface DayStat { date: string; revenue: number; bills: number; tax: number; discount: number }

const fmt = (n: number) => `₹${n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0)}`

export function SalesReport() {
  const today = new Date().toISOString().split('T')[0]
  const thirtyAgo = new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0]
  const [from, setFrom] = useState(thirtyAgo)
  const [to, setTo] = useState(today)
  const [bills, setBills] = useState<Bill[]>([])
  const [popular, setPopular] = useState<PopularItem[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [br, pr] = await Promise.all([
        invoke<{ success: boolean; data: Bill[] }>('get_bills', { status: null, limit: 2000 }),
        invoke<{ success: boolean; data?: PopularItem[] }>('get_popular_menu_items', { limit: 10 }),
      ])
      if (br.success) setBills(br.data)
      if (pr.success && pr.data) setPopular(pr.data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = bills.filter(b => b.status === 'paid' && b.created_at.slice(0, 10) >= from && b.created_at.slice(0, 10) <= to)

  const byDay: Record<string, DayStat> = {}
  filtered.forEach(b => {
    const d = b.created_at.slice(0, 10)
    if (!byDay[d]) byDay[d] = { date: d, revenue: 0, bills: 0, tax: 0, discount: 0 }
    byDay[d].revenue += b.total_amount
    byDay[d].bills += 1
    byDay[d].tax += b.tax_amount
    byDay[d].discount += b.discount_amount
  })
  const days = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date))
  const totalRev = filtered.reduce((s, b) => s + b.total_amount, 0)
  const totalTax = filtered.reduce((s, b) => s + b.tax_amount, 0)
  const totalDiscount = filtered.reduce((s, b) => s + b.discount_amount, 0)
  const avgBill = filtered.length > 0 ? totalRev / filtered.length : 0
  const maxRev = Math.max(...days.map(d => d.revenue), 1)

  const exportCSV = () => {
    const rows = ['Date,Bills,Revenue,Tax,Discount', ...days.map(d => `${d.date},${d.bills},${d.revenue.toFixed(2)},${d.tax.toFixed(2)},${d.discount.toFixed(2)}`)]
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })), download: `sales-report-${from}-to-${to}.csv` })
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2"><BarChart2 className="w-6 h-6" /><h2 className="text-2xl font-bold">Sales Report</h2></div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="date" className="h-8 w-36 text-sm" value={from} onChange={e => setFrom(e.target.value)} />
          <span className="text-sm text-muted-foreground">to</span>
          <Input type="date" className="h-8 w-36 text-sm" value={to} onChange={e => setTo(e.target.value)} />
          <Button size="sm" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Apply'}</Button>
          <Button size="sm" variant="outline" onClick={exportCSV} disabled={days.length === 0}><Download className="w-4 h-4 mr-1" />CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[['Total Revenue', fmt(totalRev)], ['Total Bills', String(filtered.length)], ['Avg Bill', fmt(avgBill)], ['GST Collected', fmt(totalTax)]].map(([label, value]) => (
          <div key={label} className="bg-card rounded-2xl border border-border p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>

      {days.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-semibold mb-4">Daily Revenue</h3>
          <div className="flex items-end gap-1 h-32">
            {days.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative" title={`${d.date}: ${fmt(d.revenue)} (${d.bills} bills)`}>
                <div className="w-full bg-primary/10 rounded-t-sm relative" style={{ height: '112px' }}>
                  <div className="absolute bottom-0 left-0 right-0 gradient-spice rounded-t-sm transition-all" style={{ height: `${Math.max(3, (d.revenue / maxRev) * 112)}px` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>{days[0]?.date}</span><span>{days[days.length - 1]?.date}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {days.length > 0 && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border"><h3 className="font-semibold">Daily Breakdown</h3></div>
            <div className="divide-y divide-border max-h-72 overflow-y-auto">
              {[...days].reverse().map(d => (
                <div key={d.date} className="flex items-center justify-between p-3 text-sm hover:bg-muted/50">
                  <div><p className="font-medium">{new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}</p>
                    <p className="text-xs text-muted-foreground">{d.bills} bills · GST ₹{d.tax.toFixed(0)}</p>
                  </div>
                  <p className="font-bold">{fmt(d.revenue)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {popular.length > 0 && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border"><h3 className="font-semibold">Top Menu Items</h3></div>
            <div className="divide-y divide-border">
              {popular.map((item, i) => (
                <div key={item.menu_item_id} className="flex items-center gap-3 p-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <div className="flex-1 min-w-0"><p className="font-medium truncate">{item.item_name}</p><p className="text-xs text-muted-foreground">{item.order_count} orders</p></div>
                  <p className="font-semibold shrink-0">{fmt(item.total_revenue)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {totalDiscount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          Total discounts given in period: <strong>{fmt(totalDiscount)}</strong>
        </div>
      )}
    </div>
  )
}
