'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart3 } from 'lucide-react'

interface StaffMember {
  id: number; name: string; role: string
  days_present: number; total_hours: number; avg_hours_per_day: number
  shifts_assigned: number; attendance_rate: number
}

interface PerfData {
  staff: StaffMember[]; total_staff: number
  total_hours: number; avg_hours_per_staff: number
}

const PERIODS = [7, 30, 90] as const

export function StaffPerformance() {
  const [data, setData] = useState<PerfData | null>(null)
  const [days, setDays] = useState<7 | 30 | 90>(30)

  const load = useCallback(async () => {
    const res = await invoke<{ success: boolean; data: PerfData }>('get_staff_performance', { days }).catch(() => null)
    if (res?.success) setData(res.data)
  }, [days])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4" />Staff Performance</h3>
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <Button key={p} size="sm" variant={days === p ? 'default' : 'outline'} onClick={() => setDays(p)} className="h-7 px-3 text-xs">{p}d</Button>
          ))}
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Active Staff</p>
              <p className="text-2xl font-bold">{data.total_staff}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total Hours</p>
              <p className="text-2xl font-bold text-blue-600">{data.total_hours}h</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Avg Hours/Staff</p>
              <p className="text-2xl font-bold">{data.avg_hours_per_staff}h</p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">Name</th>
                  <th className="text-left p-2 font-medium">Role</th>
                  <th className="text-right p-2 font-medium">Days</th>
                  <th className="text-right p-2 font-medium">Hours</th>
                  <th className="text-right p-2 font-medium">Avg/Day</th>
                  <th className="text-right p-2 font-medium">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {data.staff.map(s => (
                  <tr key={s.id} className="border-t">
                    <td className="p-2 font-medium">{s.name}</td>
                    <td className="p-2"><Badge variant="outline" className="text-xs">{s.role}</Badge></td>
                    <td className="p-2 text-right">{s.days_present}</td>
                    <td className="p-2 text-right font-medium">{s.total_hours}h</td>
                    <td className="p-2 text-right">{s.avg_hours_per_day}h</td>
                    <td className="p-2 text-right">
                      <span className={s.attendance_rate >= 90 ? 'text-green-600' : s.attendance_rate >= 70 ? 'text-amber-600' : 'text-red-600'}>
                        {s.attendance_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.staff.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No attendance data for this period</p>}
        </>
      )}
    </div>
  )
}
