'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, Calendar, TrendingUp } from 'lucide-react'

interface AttendanceRecord {
  id: number
  employee_id: number
  date: string
  clock_in?: string
  clock_out?: string
  total_hours?: number
  status: string
  notes?: string
}

interface AttendanceReport {
  records: AttendanceRecord[]
  total_hours: number
  total_days: number
  average_hours_per_day: number
}

interface Employee { id: number; name: string }

const RESTAURANT_ID = 1

function isoWeekAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}

const today = () => new Date().toISOString().split('T')[0]

export default function AttendanceReport() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [startDate, setStartDate] = useState(isoWeekAgo())
  const [endDate, setEndDate] = useState(today())
  const [report, setReport] = useState<AttendanceReport | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    invoke<{ success: boolean; data?: { id: number; first_name: string; last_name: string }[] }>('get_employees', { restaurant_id: RESTAURANT_ID })
      .then(r => {
        if (r.success && r.data) setEmployees(r.data.map(e => ({ id: e.id, name: `${e.first_name} ${e.last_name}`.trim() })))
      })
      .catch(console.error)
  }, [])

  const runReport = async () => {
    setLoading(true)
    try {
      const res = await invoke<{ success: boolean; data?: AttendanceReport }>('get_attendance_report', {
        request: {
          restaurant_id: RESTAURANT_ID,
          employee_id: selectedEmployee ? parseInt(selectedEmployee) : null,
          start_date: startDate,
          end_date: endDate,
        }
      })
      if (res.success && res.data) setReport(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fmt = (dt?: string) => dt ? new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Attendance Report</h2>
        <p className="text-sm text-muted-foreground">View clock-in/out records and hours worked</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <Label>From</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
            </div>
            <div className="w-52">
              <Label>Employee</Label>
              <Select value={selectedEmployee} onValueChange={(v: string | null) => setSelectedEmployee(v ?? '')}>
                <SelectTrigger><SelectValue placeholder="All employees" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Employees</SelectItem>
                  {employees.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="gradient-spice text-white" onClick={runReport} disabled={loading}>
              {loading ? 'Loading...' : 'Run Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Days', value: report.total_days.toString(), icon: Calendar },
              { label: 'Total Hours', value: report.total_hours.toFixed(1), icon: Clock },
              { label: 'Avg Hours/Day', value: report.average_hours_per_day.toFixed(1), icon: TrendingUp },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 gradient-spice rounded-lg"><s.icon className="w-5 h-5 text-white" /></div>
                  <div><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Records ({report.records.length})</CardTitle></CardHeader>
            <CardContent>
              {report.records.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No attendance records in this range</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-muted-foreground border-b">
                      <th className="text-left py-2 pr-4">Date</th>
                      <th className="text-left py-2 pr-4">Clock In</th>
                      <th className="text-left py-2 pr-4">Clock Out</th>
                      <th className="text-left py-2 pr-4">Hours</th>
                      <th className="text-left py-2">Status</th>
                    </tr></thead>
                    <tbody>
                      {report.records.map(r => (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="py-2 pr-4 font-medium">{r.date}</td>
                          <td className="py-2 pr-4">{fmt(r.clock_in)}</td>
                          <td className="py-2 pr-4">{fmt(r.clock_out)}</td>
                          <td className="py-2 pr-4">{r.total_hours?.toFixed(1) ?? '—'}</td>
                          <td className="py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'present' ? 'bg-green-100 text-green-700' : r.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!report && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Select date range and click Run Report</p>
        </div>
      )}
    </div>
  )
}
