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
import { Plus, Tag, ToggleLeft, ToggleRight, Search, BarChart3 } from 'lucide-react'

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

interface CouponAnalytics {
  total_coupons: number; active_count: number; total_uses: number
  exhausted: number; expired: number
  avg_percent_discount: number | null; avg_flat_discount: number | null
  top_used: { code: string; description: string | null; discount_type: string; discount_value: number; used_count: number; max_uses: number | null; is_active: boolean }[]
}

export function CouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analytics, setAnalytics] = useState<CouponAnalytics | null>(null)
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

  const loadAnalytics = async () => {
    try {
      const res = await invoke<{ success: boolean; data: CouponAnalytics }>('get_coupon_analytics')
      if (res.success) setAnalytics(res.data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (showAnalytics) loadAnalytics() }, [showAnalytics])

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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4" /><h3 className="font-semibold">Coupons</h3>
          <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" /><Input className="pl-8 h-7 w-36 text-xs" placeholder="Search code…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <button onClick={() => setActiveOnly(v => !v)} className={`text-xs px-2 py-1 rounded border transition-colors ${activeOnly ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>Active only</button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={showAnalytics ? 'default' : 'outline'} onClick={() => setShowAnalytics(v => !v)}><BarChart3 className="w-4 h-4 mr-1" />Analytics</Button>
          <Button size="sm" className="gradient-spice text-white" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />New Coupon</Button>
        </div>
      </div>

      {showAnalytics && analytics && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: analytics.total_coupons },
              { label: 'Active', value: analytics.active_count, color: 'text-green-600' },
              { label: 'Total Uses', value: analytics.total_uses, color: 'text-blue-600' },
              { label: 'Exhausted', value: analytics.exhausted, color: 'text-amber-600' },
              { label: 'Expired', value: analytics.expired, color: 'text-red-600' },
            ].map(s => (
              <div key={s.label} className="border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color ?? ''}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border rounded-lg p-3">
              <p className="text-sm font-medium mb-1">Avg Discounts</p>
              <p className="text-sm text-muted-foreground">Percent: {analytics.avg_percent_discount?.toFixed(1) ?? '—'}%</p>
              <p className="text-sm text-muted-foreground">Flat: ₹{analytics.avg_flat_discount?.toFixed(0) ?? '—'}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-sm font-medium mb-2">Top Used Coupons</p>
              {analytics.top_used.length === 0 && <p className="text-xs text-muted-foreground">No usage data</p>}
              <div className="space-y-1">
                {analytics.top_used.slice(0, 5).map(t => (
                  <div key={t.code} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs">{t.code}</span>
                    <span className="text-muted-foreground">{t.used_count} uses</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {coupons.filter(c => (!search || c.code.toLowerCase().includes(search.toLowerCase()) || (c.description ?? '').toLowerCase().includes(search.toLowerCase())) && (!activeOnly || c.is_active)).map(c => (
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
