'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp } from 'lucide-react'

interface ProfitCustomer {
  id: number; name: string; phone: string | null; loyalty_points: number
  order_count: number; revenue: number; avg_order: number
  last_order: string; cancellations: number; cancel_rate: number
  monthly_frequency: number
}

interface ProfitData {
  customers: ProfitCustomer[]
  total_revenue: number; top_20_pct_revenue: number
}

const PERIODS = [30, 90, 180] as const
const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n)

export function CustomerProfitability() {
  const [data, setData] = useState<ProfitData | null>(null)
  const [days, setDays] = useState<30 | 90 | 180>(90)

  const load = useCallback(async () => {
    const res = await invoke<{ success: boolean; data: ProfitData }>('get_customer_profitability', { days }).catch(() => null)
    if (res?.success) setData(res.data)
  }, [days])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4" />Customer Profitability</h3>
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <Button key={p} size="sm" variant={days === p ? 'default' : 'outline'} onClick={() => setDays(p)} className="h-7 px-3 text-xs">{p}d</Button>
          ))}
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total Revenue ({days}d)</p>
              <p className="text-2xl font-bold text-green-600">{fmt(data.total_revenue)}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Top 20% Contribution</p>
              <p className="text-2xl font-bold">{data.top_20_pct_revenue}%</p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">Customer</th>
                  <th className="text-right p-2 font-medium">Orders</th>
                  <th className="text-right p-2 font-medium">Revenue</th>
                  <th className="text-right p-2 font-medium">Avg Order</th>
                  <th className="text-right p-2 font-medium">Freq/mo</th>
                  <th className="text-right p-2 font-medium">Cancel%</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((c, i) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {i < 3 && <Badge className="text-xs bg-amber-100 text-amber-700">#{i + 1}</Badge>}
                        <div>
                          <p className="font-medium">{c.name}</p>
                          {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-right">{c.order_count}</td>
                    <td className="p-2 text-right font-medium text-green-600">{fmt(c.revenue)}</td>
                    <td className="p-2 text-right">{fmt(c.avg_order)}</td>
                    <td className="p-2 text-right">{c.monthly_frequency}</td>
                    <td className="p-2 text-right">
                      <span className={c.cancel_rate > 20 ? 'text-red-600' : c.cancel_rate > 10 ? 'text-amber-600' : 'text-green-600'}>
                        {c.cancel_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.customers.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No order data for this period</p>}
        </>
      )}
    </div>
  )
}
