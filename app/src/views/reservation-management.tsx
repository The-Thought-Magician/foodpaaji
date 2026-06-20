'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Plus, Clock, Users } from 'lucide-react'

interface Reservation {
  id: number
  customer_name: string
  customer_phone: string
  table_id?: number
  table_number?: string
  party_size: number
  date: string
  time: string
  duration: number
  status: string
  special_requests?: string
}

interface Table {
  id: number
  table_number: string
  capacity: number
  location?: string
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  seated: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-orange-100 text-orange-700',
}

const STATUSES = ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show']

export function ReservationManagement() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', table_id: '', party_size: '2', reservation_date: '', reservation_time: '19:00', duration_minutes: '90', special_requests: '' })

  const loadReservations = useCallback(async () => {
    try {
      const res = await invoke<{ success: boolean; data: Reservation[] }>('get_reservations', { date, status: null })
      if (res.success) setReservations(res.data)
    } catch (e) { console.error(e) }
  }, [date])

  const loadTables = async () => {
    try {
      const res = await invoke<{ success: boolean; data: Table[] }>('get_tables')
      if (res.success) setTables(res.data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => { loadReservations(); loadTables() }, [loadReservations])

  const openCreate = () => { setForm({ ...form, reservation_date: date }); setShowForm(true) }

  const save = async () => {
    try {
      await invoke('create_reservation', {
        request: {
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          table_id: form.table_id ? parseInt(form.table_id) : null,
          party_size: parseInt(form.party_size),
          reservation_date: form.reservation_date,
          reservation_time: form.reservation_time,
          duration_minutes: parseInt(form.duration_minutes),
          special_requests: form.special_requests || null,
        }
      })
      setShowForm(false)
      loadReservations()
    } catch (e) { console.error(e) }
  }

  const updateStatus = async (id: number, status: string) => {
    try {
      await invoke('update_reservation_status', { reservationId: id, status })
      loadReservations()
    } catch (e) { console.error(e) }
  }

  const seated = reservations.filter(r => r.status === 'seated').length
  const confirmed = reservations.filter(r => r.status === 'confirmed').length
  const pending = reservations.filter(r => r.status === 'pending').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" />
          </div>
          <div className="flex gap-2">
            <Badge className="bg-green-100 text-green-700">{seated} Seated</Badge>
            <Badge className="bg-blue-100 text-blue-700">{confirmed} Confirmed</Badge>
            <Badge className="bg-yellow-100 text-yellow-700">{pending} Pending</Badge>
          </div>
        </div>
        <Button onClick={openCreate} className="gradient-spice text-white"><Plus className="w-4 h-4 mr-2" />New Reservation</Button>
      </div>

      <div className="space-y-3">
        {reservations.map(r => (
          <Card key={r.id} className="card-hover">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center min-w-[60px]">
                  <p className="font-bold text-lg">{r.time}</p>
                  <p className="text-xs text-muted-foreground">{r.duration}min</p>
                </div>
                <div>
                  <p className="font-semibold">{r.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{r.customer_phone}</p>
                  {r.special_requests && <p className="text-xs text-amber-600 mt-1">{r.special_requests}</p>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />{r.party_size} guests
                </div>
                {r.table_number && (
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Clock className="w-4 h-4" />Table {r.table_number}
                  </div>
                )}
                <Badge className={STATUS_COLOR[r.status] || ''}>{r.status}</Badge>
                <Select value={r.status} onValueChange={(v: string | null) => updateStatus(r.id, v ?? r.status)}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
        {reservations.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No reservations for {date}</p>
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Reservation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Guest Name *</Label><Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
            <div><Label>Phone *</Label><Input value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date *</Label><Input type="date" value={form.reservation_date} onChange={e => setForm({ ...form, reservation_date: e.target.value })} /></div>
              <div><Label>Time *</Label><Input type="time" value={form.reservation_time} onChange={e => setForm({ ...form, reservation_time: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Party Size</Label><Input type="number" min="1" value={form.party_size} onChange={e => setForm({ ...form, party_size: e.target.value })} /></div>
              <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} /></div>
            </div>
            <div>
              <Label>Table</Label>
              <Select value={form.table_id} onValueChange={(v: string | null) => setForm({ ...form, table_id: v ?? '' })}>
                <SelectTrigger><SelectValue placeholder="Auto-assign" /></SelectTrigger>
                <SelectContent>
                  {tables.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.table_number} (cap. {t.capacity}){t.location ? ` — ${t.location}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Special Requests</Label><Input value={form.special_requests} onChange={e => setForm({ ...form, special_requests: e.target.value })} /></div>
            <Button className="w-full gradient-spice text-white" onClick={save}>Create Reservation</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
