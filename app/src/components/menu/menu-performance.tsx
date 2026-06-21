'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp } from 'lucide-react'

interface PerfItem {
  id: number; name: string; category: string | null
  price: number; cost_price: number; margin_pct: number
  times_ordered: number; total_qty: number
  total_revenue: number; estimated_profit: number
}

interface PerfData {
  items: PerfItem[]; total_revenue: number
  total_estimated_profit: number; total_items: number
}

const PERIODS = [7, 30, 90] as const
const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n)

export function MenuPerformance() {
  const [data, setData] = useState<PerfData | null>(null)
  const [days, setDays] = useState<7 | 30 | 90>(30)
  const [sortBy, setSortBy] = useState<'revenue' | 'qty' | 'margin' | 'profit'>('revenue')

  const load = useCallback(async () => {
    const res = await invoke<{ success: boolean; data: PerfData }>('get_menu_performance', { days }).catch(() => null)
    if (res?.success) setData(res.data)
  }, [days])

  useEffect(() => { load() }, [load])

  const sorted = data?.items.slice().sort((a, b) => {
    if (sortBy === 'revenue') return b.total_revenue - a.total_revenue
    if (sortBy === 'qty') return b.total_qty - a.total_qty
    if (sortBy === 'margin') return b.margin_pct - a.margin_pct
    return b.estimated_profit - a.estimated_profit
  }) ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4" />Menu Performance</h3>
        <div className="flex gap-2">
          <div className="flex gap-1">
            {(['revenue', 'qty', 'margin', 'profit'] as const).map(s => (
              <Button key={s} size="sm" variant={sortBy === s ? 'default' : 'outline'} onClick={() => setSortBy(s)} className="h-7 px-2 text-xs capitalize">{s}</Button>
            ))}
          </div>
          <div className="flex gap-1">
            {PERIODS.map(p => (
              <Button key={p} size="sm" variant={days === p ? 'default' : 'outline'} onClick={() => setDays(p)} className="h-7 px-3 text-xs">{p}d</Button>
            ))}
          </div>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">{fmt(data.total_revenue)}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Est. Profit</p>
              <p className="text-2xl font-bold text-blue-600">{fmt(data.total_estimated_profit)}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Items Tracked</p>
              <p className="text-2xl font-bold">{data.total_items}</p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">Item</th>
                  <th className="text-left p-2 font-medium">Category</th>
                  <th className="text-right p-2 font-medium">Qty Sold</th>
                  <th className="text-right p-2 font-medium">Revenue</th>
                  <th className="text-right p-2 font-medium">Margin</th>
                  <th className="text-right p-2 font-medium">Profit</th>
                </tr>
              </thead>
              <tbody>
                {sorted.filter(i => i.total_qty > 0).map(i => (
                  <tr key={i.id} className="border-t">
                    <td className="p-2 font-medium">{i.name}</td>
                    <td className="p-2"><Badge variant="outline" className="text-xs">{i.category ?? '—'}</Badge></td>
                    <td className="p-2 text-right">{i.total_qty}</td>
                    <td className="p-2 text-right text-green-600">{fmt(i.total_revenue)}</td>
                    <td className="p-2 text-right">
                      <span className={i.margin_pct >= 60 ? 'text-green-600' : i.margin_pct >= 30 ? 'text-amber-600' : 'text-red-600'}>
                        {i.margin_pct}%
                      </span>
                    </td>
                    <td className="p-2 text-right font-medium">{fmt(i.estimated_profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
