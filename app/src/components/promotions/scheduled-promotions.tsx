'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

interface ScheduledPromo {
  id: number; name: string; description: string | null
  discount_type: string; discount_value: number
  start_time: string; end_time: string; days_of_week: string; is_active: boolean
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function ScheduledPromotions() {
  const [promos, setPromos] = useState<ScheduledPromo[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', discount_type: 'percent', discount_value: '10',
    start_time: '12:00', end_time: '15:00', days: [0, 1, 2, 3, 4, 5, 6] as number[],
  })

  const load = useCallback(async () => {
    const res = await invoke<{ success: boolean; data: ScheduledPromo[] }>('get_scheduled_promotions').catch(() => null)
    if (res?.success) setPromos(res.data)
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.name.trim()) return
    await invoke('create_scheduled_promotion', {
      name: form.name.trim(), description: form.description || null,
      discountType: form.discount_type, discountValue: parseFloat(form.discount_value) || 0,
      startTime: form.start_time, endTime: form.end_time,
      daysOfWeek: form.days.join(','),
    }).catch(console.error)
    setShowForm(false)
    load()
  }

  const toggle = async (id: number) => {
    await invoke('toggle_scheduled_promotion', { id }).catch(console.error)
    load()
  }

  const remove = async (id: number) => {
    await invoke('delete_scheduled_promotion', { id }).catch(console.error)
    load()
  }

  const toggleDay = (d: number) => {
    setForm(f => ({ ...f, days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d].sort() }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><Clock className="w-4 h-4" />Scheduled Promotions</h3>
        <Button size="sm" className="gradient-spice text-white" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" />Add Schedule
        </Button>
      </div>

      {promos.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No scheduled promotions</p>}

      <div className="space-y-2">
        {promos.map(p => (
          <div key={p.id} className={`border rounded-lg p-3 flex items-center justify-between gap-3 ${!p.is_active ? 'opacity-50' : ''}`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{p.name}</span>
                <Badge variant="outline" className="text-xs">
                  {p.discount_type === 'percent' ? `${p.discount_value}%` : `₹${p.discount_value}`} off
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{p.start_time} – {p.end_time}</span>
                <div className="flex gap-0.5">
                  {p.days_of_week.split(',').map(d => (
                    <Badge key={d} className="text-[10px] px-1 py-0 bg-muted text-muted-foreground">{DAYS[parseInt(d)]}</Badge>
                  ))}
                </div>
              </div>
              {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
            </div>
            <div className="flex gap-1">
              <button onClick={() => toggle(p.id)} className="text-muted-foreground hover:text-foreground">
                {p.is_active ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
              </button>
              <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Scheduled Promotion</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Happy Hour" /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Discount Type</Label>
                <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v ?? 'percent' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent (%)</SelectItem>
                    <SelectItem value="flat">Flat (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Value</Label><Input type="number" min="0" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Time</Label><Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
              <div><Label>End Time</Label><Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
            </div>
            <div>
              <Label>Days</Label>
              <div className="flex gap-1 mt-1">
                {DAYS.map((d, i) => (
                  <button key={i} onClick={() => toggleDay(i)}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${form.days.includes(i) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full gradient-spice text-white" onClick={save}>Create Schedule</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
