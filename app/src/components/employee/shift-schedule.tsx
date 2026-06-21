'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Plus, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Employee } from '@/types/employee'

interface Shift {
  id: number
  employee_id: number
  employee_name: string
  role: string
  shift_date: string
  start_time: string
  end_time: string
  role_note?: string
  status: 'scheduled' | 'completed' | 'cancelled'
}

const statusColor: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

function weekDates(anchor: Date): string[] {
  const monday = new Date(anchor)
  monday.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export function ShiftSchedule() {
  const today = new Date()
  const [anchor, setAnchor] = useState(today)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ employee_id: '', shift_date: today.toISOString().slice(0, 10), start_time: '09:00', end_time: '17:00', role_note: '' })

  const dates = weekDates(anchor)

  const load = useCallback(async () => {
    try {
      const res = await invoke<{ success: boolean; data: Shift[] }>('get_shifts', { fromDate: dates[0], toDate: dates[6] })
      if (res.success) setShifts(res.data)
    } catch (e) { console.error(e) }
  }, [dates[0], dates[6]])

  useEffect(() => {
    invoke<{ success: boolean; data: Employee[] }>('get_employees').then(r => { if (r.success) setEmployees(r.data) }).catch(() => {})
  }, [])

  useEffect(() => { void load() }, [load])

  const prevWeek = () => { const d = new Date(anchor); d.setDate(d.getDate() - 7); setAnchor(d) }
  const nextWeek = () => { const d = new Date(anchor); d.setDate(d.getDate() + 7); setAnchor(d) }

  const submit = async () => {
    if (!form.employee_id) return
    try {
      await invoke('create_shift', {
        employeeId: parseInt(form.employee_id),
        shiftDate: form.shift_date,
        startTime: form.start_time,
        endTime: form.end_time,
        roleNote: form.role_note || null,
      })
      setShowForm(false)
      void load()
    } catch (e) { console.error(e) }
  }

  const remove = async (id: number) => {
    await invoke('delete_shift', { shiftId: id }).catch(console.error)
    void load()
  }

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevWeek} className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted">‹</button>
          <span className="text-sm font-medium">
            {new Date(dates[0]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} –{' '}
            {new Date(dates[6]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <button onClick={nextWeek} className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted">›</button>
          <button onClick={() => setAnchor(today)} className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted text-muted-foreground">Today</button>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />Add Shift</Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dayLabels.map((label, i) => {
          const date = dates[i]
          const dayShifts = shifts.filter(s => s.shift_date === date)
          const isToday = date === today.toISOString().slice(0, 10)
          return (
            <div key={date} className={`min-h-32 rounded-xl border p-2 space-y-1.5 ${isToday ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
              <div className={`text-center mb-1 ${isToday ? 'font-bold text-primary' : ''}`}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold">{new Date(date + 'T00:00:00').getDate()}</p>
              </div>
              {dayShifts.map(s => (
                <div key={s.id} className="rounded-lg bg-background border p-1.5 group relative">
                  <p className="text-xs font-medium leading-tight truncate">{s.employee_name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{s.start_time}–{s.end_time}</span>
                  </div>
                  {s.role_note && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{s.role_note}</p>}
                  <span className={`text-[9px] px-1 rounded-full font-medium ${statusColor[s.status]}`}>{s.status}</span>
                  <button onClick={() => remove(s.id)}
                    className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center w-4 h-4 rounded-full hover:bg-destructive/10 text-destructive">
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Schedule Shift</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Employee</Label>
              <select value={form.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Select employee</option>
                {employees.filter(e => e.status === 'active').map(e => (
                  <option key={e.id} value={e.id}>{e.name} — {e.role}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.shift_date} onChange={e => setForm(p => ({ ...p, shift_date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start</Label><Input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} /></div>
              <div><Label>End</Label><Input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input placeholder="e.g. Opening shift" value={form.role_note} onChange={e => setForm(p => ({ ...p, role_note: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={submit}>Schedule</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
