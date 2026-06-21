'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Users, Plus, CheckCircle, XCircle, RefreshCw, Clock } from 'lucide-react'

interface WalkinEntry {
  id: number
  customer_name: string
  phone?: string
  party_size: number
  status: string
  notes?: string
  table_number?: string
  added_at: string
  estimated_wait?: number
  wait_minutes: number
}

const FORM_DEFAULTS = { customer_name: '', phone: '', party_size: '2', notes: '', estimated_wait: '' }

export function WalkinQueue() {
  const [queue, setQueue] = useState<WalkinEntry[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showSeat, setShowSeat] = useState<WalkinEntry | null>(null)
  const [tableInput, setTableInput] = useState('')
  const [form, setForm] = useState(FORM_DEFAULTS)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await invoke<{ success: boolean; data?: WalkinEntry[] }>('get_walkin_queue').catch(() => null)
    if (res?.success && res.data) setQueue(res.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const handleAdd = async () => {
    if (!form.customer_name.trim()) return
    await invoke('add_to_walkin_queue', {
      request: {
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim() || null,
        party_size: parseInt(form.party_size) || 2,
        notes: form.notes.trim() || null,
        estimated_wait: form.estimated_wait ? parseInt(form.estimated_wait) : null,
      }
    }).catch(console.error)
    setForm(FORM_DEFAULTS)
    setShowAdd(false)
    load()
  }

  const handleSeat = async () => {
    if (!showSeat) return
    await invoke('seat_walkin_guest', { entryId: showSeat.id, tableNumber: tableInput.trim() || null }).catch(console.error)
    setShowSeat(null)
    setTableInput('')
    load()
  }

  const handleStatus = async (id: number, status: string) => {
    await invoke('update_walkin_status', { entryId: id, status }).catch(console.error)
    load()
  }

  const waitColor = (m: number) => m < 15 ? 'text-green-600' : m < 30 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <h3 className="font-semibold">Walk-in Queue</h3>
          {queue.length > 0 && <Badge variant="secondary">{queue.length} waiting</Badge>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" />Add Walk-in</Button>
        </div>
      </div>

      {queue.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No guests waiting</p>
      ) : (
        <div className="space-y-2">
          {queue.map((entry, i) => (
            <div key={entry.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{entry.customer_name}</p>
                  <Badge variant="outline" className="text-xs shrink-0"><Users className="w-3 h-3 mr-0.5" />{entry.party_size}</Badge>
                </div>
                {entry.phone && <p className="text-xs text-muted-foreground">{entry.phone}</p>}
                {entry.notes && <p className="text-xs text-muted-foreground italic">{entry.notes}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-semibold flex items-center gap-1 ${waitColor(entry.wait_minutes)}`}>
                  <Clock className="w-3 h-3" />{entry.wait_minutes}m
                </p>
                {entry.estimated_wait && <p className="text-xs text-muted-foreground">est. {entry.estimated_wait}m</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="outline" className="h-7 px-2 text-green-700 border-green-200 hover:bg-green-50"
                  onClick={() => { setShowSeat(entry); setTableInput('') }}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />Seat
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:bg-destructive/10"
                  onClick={() => handleStatus(entry.id, 'no_show')}>
                  <XCircle className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Walk-in</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Guest name" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Optional" /></div>
              <div><Label>Party Size</Label><Input type="number" min="1" value={form.party_size} onChange={e => setForm(f => ({ ...f, party_size: e.target.value }))} /></div>
            </div>
            <div><Label>Est. Wait (min)</Label><Input type="number" min="0" value={form.estimated_wait} onChange={e => setForm(f => ({ ...f, estimated_wait: e.target.value }))} placeholder="e.g. 15" /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Special requests..." /></div>
            <Button className="w-full" onClick={handleAdd} disabled={!form.customer_name.trim()}>Add to Queue</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showSeat} onOpenChange={() => setShowSeat(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Seat {showSeat?.customer_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Party of {showSeat?.party_size} · waited {showSeat?.wait_minutes}m</p>
            <div><Label>Table Number (optional)</Label><Input value={tableInput} onChange={e => setTableInput(e.target.value)} placeholder="e.g. T3" /></div>
            <Button className="w-full" onClick={handleSeat}>Confirm Seated</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
