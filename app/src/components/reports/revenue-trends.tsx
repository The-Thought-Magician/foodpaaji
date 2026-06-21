'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { TrendingUp } from 'lucide-react'

interface DayEntry {
  day: string; bill_count: number; revenue: number
  tax: number; discount: number; avg_bill: number
}

interface TrendData {
  daily: DayEntry[]; total_revenue: number; total_bills: number
  avg_daily_revenue: number; best_day: string | null; best_day_revenue: number
}

const PERIODS = [7, 30, 90] as const
const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n)

export function RevenueTrends() {
  const [data, setData] = useState<TrendData | null>(null)
  const [days, setDays] = useState<7 | 30 | 90>(30)

  const load = useCallback(async () => {
    const res = await invoke<{ success: boolean; data: TrendData }>('get_revenue_trends', { days }).catch(() => null)
    if (res?.success) setData(res.data)
  }, [days])

  useEffect(() => { load() }, [load])

  const maxRev = data ? Math.max(...data.daily.map(d => d.revenue), 1) : 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4" />Revenue Trends</h3>
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <Button key={p} size="sm" variant={days === p ? 'default' : 'outline'} onClick={() => setDays(p)} className="h-7 px-3 text-xs">{p}d</Button>
          ))}
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-bold text-green-600">{fmt(data.total_revenue)}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total Bills</p>
              <p className="text-xl font-bold">{data.total_bills}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Avg Daily Revenue</p>
              <p className="text-xl font-bold">{fmt(data.avg_daily_revenue)}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Best Day</p>
              <p className="text-sm font-bold">{data.best_day ?? '—'}</p>
              <p className="text-xs text-green-600">{fmt(data.best_day_revenue)}</p>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <p className="text-sm font-medium mb-3">Daily Revenue</p>
            <div className="space-y-1">
              {data.daily.map(d => (
                <div key={d.day} className="flex items-center gap-2 text-sm">
                  <span className="w-20 text-xs text-muted-foreground">{d.day.slice(5)}</span>
                  <div className="flex-1 bg-muted rounded-full h-4 relative">
                    <div className="bg-green-500 rounded-full h-4 transition-all" style={{ width: `${(d.revenue / maxRev) * 100}%` }} />
                  </div>
                  <span className="w-24 text-right text-xs font-medium">{fmt(d.revenue)}</span>
                  <span className="w-12 text-right text-xs text-muted-foreground">{d.bill_count}b</span>
                </div>
              ))}
            </div>
          </div>

          {data.daily.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No revenue data for this period</p>}
        </>
      )}
    </div>
  )
}
