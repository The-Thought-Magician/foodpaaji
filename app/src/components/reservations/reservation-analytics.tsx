'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { CalendarCheck, UserX, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Analytics {
  total_reservations: number; completed: number; cancelled: number; no_shows: number
  no_show_rate: number; avg_party_size: number; avg_duration: number; completion_rate: number
  busiest_day: string; busiest_time: string
  daily_breakdown: { day: string; count: number }[]
  status_breakdown: { status: string; count: number }[]
}

const PERIODS = [7, 30, 90] as const
const STATUS_COLOR: Record<string, string> = {
  completed: 'bg-green-100 text-green-700', confirmed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700', no_show: 'bg-orange-100 text-orange-700',
  pending: 'bg-yellow-100 text-yellow-700', seated: 'bg-purple-100 text-purple-700',
}

export function ReservationAnalyticsPanel() {
  const [data, setData] = useState<Analytics | null>(null)
  const [days, setDays] = useState<7 | 30 | 90>(30)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await invoke<{ success: boolean; data?: Analytics }>('get_reservation_analytics', { days }).catch(() => null)
    if (res?.success && res.data) setData(res.data)
    setLoading(false)
  }, [days])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><CalendarCheck className="w-4 h-4" />Reservation Insights</h3>
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <Button key={p} size="sm" variant={days === p ? 'default' : 'outline'} onClick={() => setDays(p)} className="h-7 px-3 text-xs">{p}d</Button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>}

      {!loading && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total Reservations</p>
              <p className="text-2xl font-bold">{data.total_reservations}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Completion Rate</p>
              <p className="text-2xl font-bold text-green-600">{data.completion_rate}%</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><UserX className="w-3 h-3" />No-Show Rate</p>
              <p className={`text-2xl font-bold ${data.no_show_rate > 15 ? 'text-red-600' : data.no_show_rate > 5 ? 'text-amber-600' : 'text-green-600'}`}>{data.no_show_rate}%</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" />Avg Party</p>
              <p className="text-2xl font-bold">{data.avg_party_size.toFixed(1)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-3">
              <p className="text-sm font-medium mb-2">By Day of Week</p>
              <div className="space-y-1">
                {data.daily_breakdown.map(d => {
                  const max = Math.max(...data.daily_breakdown.map(x => x.count), 1)
                  return (
                    <div key={d.day} className="flex items-center gap-2 text-sm">
                      <span className="w-8 text-muted-foreground">{d.day}</span>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2" style={{ width: `${(d.count / max) * 100}%` }} />
                      </div>
                      <span className="w-6 text-right text-xs font-medium">{d.count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="border rounded-lg p-3">
              <p className="text-sm font-medium mb-2">By Status</p>
              <div className="space-y-2">
                {data.status_breakdown.map(s => (
                  <div key={s.status} className="flex items-center justify-between text-sm">
                    <Badge className={`text-xs capitalize ${STATUS_COLOR[s.status] ?? 'bg-gray-100 text-gray-700'}`}>{s.status.replace('_', ' ')}</Badge>
                    <span className="font-medium">{s.count}</span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-3 pt-2 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>Peak day</span><span className="font-medium text-foreground">{data.busiest_day}</span></div>
                <div className="flex justify-between"><span>Peak time</span><span className="font-medium text-foreground">{data.busiest_time}</span></div>
                <div className="flex justify-between"><span>Avg duration</span><span className="font-medium text-foreground">{Math.round(data.avg_duration)}m</span></div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
