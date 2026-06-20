'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, ArrowRight, CheckCircle, Package } from 'lucide-react'

const RESTAURANT_ID = 1
const USER_ID = 1

interface Transfer {
  id: number
  transfer_number: string
  from_location: string
  to_location: string
  status: string
  total_items: number
  total_value: number
  notes?: string
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function InventoryTransfers() {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [actioning, setActioning] = useState<Transfer | null>(null)
  const [actionMode, setActionMode] = useState<'approve' | 'complete'>('approve')
  const [actionItemId, setActionItemId] = useState('')
  const [actionQty, setActionQty] = useState('')
  const [form, setForm] = useState({ from_location: '', to_location: '', notes: '', item_id: '', quantity: '' })

  const load = useCallback(async () => {
    try {
      const res = await invoke<{ success: boolean; data: { transfers: Transfer[] } }>('get_inventory_transfers', {
        request: { restaurant_id: RESTAURANT_ID, status: null, from_location: null, to_location: null, page: 1, limit: 50 }
      })
      if (res.success) setTransfers(res.data.transfers ?? [])
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async () => {
    if (!form.from_location || !form.to_location || !form.item_id || !form.quantity) return
    try {
      await invoke('create_inventory_transfer', {
        request: {
          restaurant_id: RESTAURANT_ID,
          from_location: form.from_location,
          to_location: form.to_location,
          notes: form.notes || null,
          requested_by: USER_ID,
          items: [{ inventory_item_id: parseInt(form.item_id), quantity: parseFloat(form.quantity), notes: null }],
        }
      })
      setShowCreate(false)
      setForm({ from_location: '', to_location: '', notes: '', item_id: '', quantity: '' })
      load()
    } catch (e) { console.error(e) }
  }

  const submitAction = async () => {
    if (!actioning || !actionItemId || !actionQty) return
    const itemId = parseInt(actionItemId)
    const qty = parseFloat(actionQty)
    try {
      if (actionMode === 'approve') {
        await invoke('approve_transfer', {
          request: { transfer_id: actioning.id, approved_by: USER_ID, approval_notes: null, item_approvals: [{ transfer_item_id: itemId, approved_quantity: qty }] }
        })
      } else {
        await invoke('complete_transfer', {
          request: { transfer_id: actioning.id, completed_by: USER_ID, completion_notes: null, item_completions: [{ transfer_item_id: itemId, transferred_quantity: qty }] }
        })
      }
      setActioning(null); setActionItemId(''); setActionQty('')
      load()
    } catch (e) { console.error(e) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Package className="w-4 h-4" /><h3 className="font-semibold">Inventory Transfers</h3></div>
        <Button size="sm" className="gradient-spice text-white" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" />New Transfer
        </Button>
      </div>

      <div className="space-y-2">
        {transfers.map(t => (
          <Card key={t.id} className="card-hover">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-medium text-sm">{t.transfer_number}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>{t.from_location}</span><ArrowRight className="w-3 h-3" /><span>{t.to_location}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{t.total_items} items · ₹{t.total_value.toFixed(0)}</span>
                <Badge className={STATUS_COLOR[t.status] || ''}>{t.status}</Badge>
                {t.status === 'PENDING' && (
                  <Button size="sm" variant="outline" onClick={() => { setActioning(t); setActionMode('approve') }}>Approve</Button>
                )}
                {t.status === 'APPROVED' && (
                  <Button size="sm" onClick={() => { setActioning(t); setActionMode('complete') }}>Complete</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {transfers.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No transfers yet</p>}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Transfer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>From Location *</Label><Input value={form.from_location} onChange={e => setForm({ ...form, from_location: e.target.value })} placeholder="e.g. Main Kitchen" /></div>
            <div><Label>To Location *</Label><Input value={form.to_location} onChange={e => setForm({ ...form, to_location: e.target.value })} placeholder="e.g. Bar" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Item ID *</Label><Input type="number" value={form.item_id} onChange={e => setForm({ ...form, item_id: e.target.value })} placeholder="Inventory ID" /></div>
              <div><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0.00" /></div>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <Button className="w-full gradient-spice text-white" onClick={create}>Create Transfer</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!actioning} onOpenChange={() => { setActioning(null); setActionItemId(''); setActionQty('') }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{actionMode === 'approve' ? 'Approve' : 'Complete'} Transfer — {actioning?.transfer_number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {actioning?.from_location} <ArrowRight className="inline w-3 h-3" /> {actioning?.to_location}
            </p>
            <div><Label>Transfer Item ID *</Label><Input type="number" value={actionItemId} onChange={e => setActionItemId(e.target.value)} placeholder="Item ID from transfer" /></div>
            <div><Label>Quantity *</Label><Input type="number" step="0.01" value={actionQty} onChange={e => setActionQty(e.target.value)} placeholder="0.00" /></div>
            <Button className="w-full gradient-spice text-white" disabled={!actionItemId || !actionQty} onClick={submitAction}>
              <CheckCircle className="w-4 h-4 mr-2" />Confirm {actionMode === 'approve' ? 'Approval' : 'Completion'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
