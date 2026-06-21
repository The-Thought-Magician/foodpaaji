'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { BarChart2, TrendingUp, Users, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface TableUtilization {
  table_id: number
  table_number: string
  capacity: number
  location?: string
  total_reservations: number
  completed_reservations: number
  cancelled_reservations: number
  no_show_count: number
  avg_party_size: number
  utilization_rate: number
  avg_duration_minutes: number
  revenue_estimate: number
}

interface Summary {
  tables: TableUtilization[]
  busiest_day: string
  busiest_hour: number
  overall_utilization: number
  total_covers: number
}

const PERIODS = [7, 30, 90] as const

function utilizationColor(rate: number) {
  if (rate >= 70) return 'bg-green-500'
  if (rate >= 40) return 'bg-amber-500'
  return 'bg-red-400'
}

function formatHour(h: number) {
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:00 ${ampm}`
}

export function TableUtilizationAnalytics() {
  const [days, setDays] = useState<7 | 30 | 90>(30)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await invoke<{ success: boolean; data?: Summary }>('get_table_utilization', { days }).catch(() => null)
    if (res?.success && res.data) setSummary(res.data)
    setLoading(false)
  }, [days])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4" />
          <h3 className="font-semibold">Table Utilization</h3>
        </div>
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <Button key={p} size="sm" variant={days === p ? 'default' : 'outline'}
              onClick={() => setDays(p)} className="h-7 px-3 text-xs">
              {p}d
            </Button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>}

      {!loading && summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Overall Utilization</p>
              <p className="text-2xl font-bold">{summary.overall_utilization}%</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Total Covers</p>
              <p className="text-2xl font-bold flex items-center gap-1"><Users className="w-4 h-4" />{summary.total_covers}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Busiest Day</p>
              <p className="text-2xl font-bold">{summary.busiest_day}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Peak Hour</p>
              <p className="text-2xl font-bold flex items-center gap-1"><Clock className="w-4 h-4" />{formatHour(summary.busiest_hour)}</p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2">Table</th>
                  <th className="text-left px-3 py-2 hidden sm:table-cell">Location</th>
                  <th className="text-center px-3 py-2">Cap.</th>
                  <th className="text-center px-3 py-2">Bookings</th>
                  <th className="text-center px-3 py-2 hidden md:table-cell">Avg Party</th>
                  <th className="text-center px-3 py-2 hidden md:table-cell">Avg Duration</th>
                  <th className="text-right px-3 py-2">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {summary.tables.map(t => (
                  <tr key={t.table_id} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{t.table_number}</td>
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{t.location || '—'}</td>
                    <td className="px-3 py-2 text-center">{t.capacity}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="font-medium">{t.completed_reservations}</span>
                      {t.no_show_count > 0 && (
                        <Badge variant="outline" className="ml-1 text-xs text-red-600">{t.no_show_count} no-show</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center hidden md:table-cell">
                      {t.avg_party_size > 0 ? t.avg_party_size.toFixed(1) : '—'}
                    </td>
                    <td className="px-3 py-2 text-center hidden md:table-cell">
                      {t.avg_duration_minutes > 0 ? `${Math.round(t.avg_duration_minutes)}m` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-16 bg-muted rounded-full h-1.5 hidden lg:block">
                          <div className={`h-1.5 rounded-full ${utilizationColor(t.utilization_rate)}`}
                            style={{ width: `${Math.min(t.utilization_rate, 100)}%` }} />
                        </div>
                        <span className="text-xs font-medium w-10 text-right">{t.utilization_rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {summary.tables.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No tables configured</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            Utilization = completed reservations ÷ estimated available slots ({days * 10} slots over {days} days)
          </div>
        </>
      )}
    </div>
  )
}
