'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RotateCcw } from 'lucide-react'

interface Refund {
  id: number; bill_id: number; bill_number: string | null
  refund_amount: number; reason: string; refund_method: string | null
  performed_by: string | null; created_at: string
}

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n)

export function RefundManagement() {
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<'cancel' | 'partial'>('cancel')
  const [form, setForm] = useState({ bill_id: '', reason: '', refund_amount: '', refund_method: '' })

  const load = useCallback(async () => {
    const res = await invoke<{ success: boolean; data: Refund[] }>('get_bill_refunds', {}).catch(() => null)
    if (res?.success) setRefunds(res.data)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCancel = async () => {
    const id = parseInt(form.bill_id)
    if (!id || !form.reason.trim()) return
    const res = await invoke<{ success: boolean; error?: string }>('cancel_bill', {
      billId: id, reason: form.reason.trim(),
    }).catch(() => null)
    if (res?.success) { setShowForm(false); load() }
    else if (res?.error) alert(res.error)
  }

  const handlePartial = async () => {
    const id = parseInt(form.bill_id)
    const amount = parseFloat(form.refund_amount)
    if (!id || !amount || !form.reason.trim()) return
    const res = await invoke<{ success: boolean; error?: string }>('partial_refund', {
      billId: id, refundAmount: amount, reason: form.reason.trim(),
      refundMethod: form.refund_method || null,
    }).catch(() => null)
    if (res?.success) { setShowForm(false); load() }
    else if (res?.error) alert(res.error)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><RotateCcw className="w-4 h-4" />Refunds & Cancellations</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setFormType('partial'); setForm({ bill_id: '', reason: '', refund_amount: '', refund_method: '' }); setShowForm(true) }}>Partial Refund</Button>
          <Button size="sm" variant="destructive" onClick={() => { setFormType('cancel'); setForm({ bill_id: '', reason: '', refund_amount: '', refund_method: '' }); setShowForm(true) }}>Cancel Bill</Button>
        </div>
      </div>

      {refunds.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No refunds recorded</p>}

      <div className="space-y-2">
        {refunds.map(r => (
          <div key={r.id} className="border rounded-lg p-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono">{r.bill_number ?? `Bill #${r.bill_id}`}</Badge>
                <span className="text-sm font-medium text-red-600">{fmt(r.refund_amount)}</span>
                {r.refund_method && <Badge className="text-xs bg-gray-100 text-gray-700">{r.refund_method}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{r.reason}</p>
              {r.performed_by && <p className="text-xs text-muted-foreground">by {r.performed_by}</p>}
            </div>
            <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
          </div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{formType === 'cancel' ? 'Cancel Bill' : 'Partial Refund'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Bill ID</Label><Input type="number" value={form.bill_id} onChange={e => setForm({ ...form, bill_id: e.target.value })} placeholder="Enter bill ID" /></div>
            {formType === 'partial' && (
              <>
                <div><Label>Refund Amount (₹)</Label><Input type="number" min="0" step="0.01" value={form.refund_amount} onChange={e => setForm({ ...form, refund_amount: e.target.value })} /></div>
                <div><Label>Refund Method</Label><Input value={form.refund_method} onChange={e => setForm({ ...form, refund_method: e.target.value })} placeholder="Cash, UPI, etc." /></div>
              </>
            )}
            <div><Label>Reason *</Label><Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Reason for refund/cancellation" /></div>
            <Button className={`w-full ${formType === 'cancel' ? 'bg-destructive text-destructive-foreground' : 'gradient-spice text-white'}`}
              onClick={formType === 'cancel' ? handleCancel : handlePartial}>
              {formType === 'cancel' ? 'Cancel Bill & Full Refund' : 'Process Partial Refund'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
