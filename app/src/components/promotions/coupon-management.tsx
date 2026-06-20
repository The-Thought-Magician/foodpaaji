'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Tag, ToggleLeft, ToggleRight } from 'lucide-react'

interface Coupon {
  id: number
  code: string
  description?: string
  discount_type: string
  discount_value: number
  min_order_amount: number
  max_uses?: number
  used_count: number
  valid_until?: string
  is_active: boolean
}

export function CouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    code: '', description: '', discount_type: 'percent',
    discount_value: '10', min_order_amount: '0', max_uses: '', valid_until: '',
  })

  const load = async () => {
    try {
      const res = await invoke<{ success: boolean; data: Coupon[] }>('get_coupons')
      if (res.success) setCoupons(res.data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    try {
      await invoke('create_coupon', {
        request: {
          code: form.code.trim().toUpperCase(),
          description: form.description || null,
          discount_type: form.discount_type,
          discount_value: parseFloat(form.discount_value) || 0,
          min_order_amount: parseFloat(form.min_order_amount) || 0,
          max_uses: form.max_uses ? parseInt(form.max_uses) : null,
          valid_until: form.valid_until || null,
        }
      })
      setShowForm(false)
      setForm({ code: '', description: '', discount_type: 'percent', discount_value: '10', min_order_amount: '0', max_uses: '', valid_until: '' })
      load()
    } catch (e) { console.error(e) }
  }

  const toggle = async (id: number) => {
    try {
      await invoke('toggle_coupon', { couponId: id })
      load()
    } catch (e) { console.error(e) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Tag className="w-4 h-4" /><h3 className="font-semibold">Coupons</h3></div>
        <Button size="sm" className="gradient-spice text-white" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" />New Coupon
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {coupons.map(c => (
          <Card key={c.id} className={`card-hover ${!c.is_active ? 'opacity-60' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-sm">{c.code}</Badge>
                    <Badge className={c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
                  <p className="text-sm mt-1">
                    {c.discount_type === 'percent' ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
                    {c.min_order_amount > 0 && ` · min ₹${c.min_order_amount}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Used {c.used_count}{c.max_uses ? `/${c.max_uses}` : ''} times
                    {c.valid_until && ` · expires ${new Date(c.valid_until).toLocaleDateString()}`}
                  </p>
                </div>
                <button onClick={() => toggle(c.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                  {c.is_active ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
        {coupons.length === 0 && <p className="col-span-2 text-center text-muted-foreground py-8 text-sm">No coupons yet</p>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Coupon</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Code *</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. SAVE20" /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
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
              <div><Label>Min Order (₹)</Label><Input type="number" min="0" value={form.min_order_amount} onChange={e => setForm({ ...form, min_order_amount: e.target.value })} /></div>
              <div><Label>Max Uses</Label><Input type="number" min="1" value={form.max_uses} placeholder="Unlimited" onChange={e => setForm({ ...form, max_uses: e.target.value })} /></div>
            </div>
            <div><Label>Valid Until</Label><Input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} /></div>
            <Button className="w-full gradient-spice text-white" onClick={save}>Create Coupon</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
