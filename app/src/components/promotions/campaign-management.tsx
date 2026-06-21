'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Trash2, Play, Pause, Target } from 'lucide-react'

interface Campaign {
  id: number; name: string; description?: string; campaign_type: string
  target_segment?: string; discount_percent?: number; discount_amount?: number
  min_order_value?: number; promo_code?: string; start_date: string; end_date: string
  status: string; budget?: number; spent: number; redemption_count: number; max_redemptions?: number
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700', completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
}

const TYPES = ['discount', 'bogo', 'loyalty_bonus', 'free_item', 'custom'] as const
const SEGMENTS = ['all', 'vip', 'loyal', 'regular', 'new', 'at_risk'] as const

const DEFAULTS = { name: '', description: '', campaign_type: 'discount', target_segment: 'all',
  discount_percent: '', discount_amount: '', min_order_value: '', promo_code: '',
  start_date: new Date().toISOString().split('T')[0], end_date: '', budget: '', max_redemptions: '' }

export function CampaignManagement() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(DEFAULTS)
  const [filter, setFilter] = useState<string>('all')

  const load = useCallback(async () => {
    const res = await invoke<{ success: boolean; data?: Campaign[] }>('get_campaigns', {
      status: filter === 'all' ? null : filter
    }).catch(() => null)
    if (res?.success && res.data) setCampaigns(res.data)
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.name.trim() || !form.end_date) return
    await invoke('create_campaign', {
      request: {
        name: form.name.trim(), description: form.description.trim() || null,
        campaign_type: form.campaign_type, target_segment: form.target_segment || null,
        discount_percent: form.discount_percent ? parseFloat(form.discount_percent) : null,
        discount_amount: form.discount_amount ? parseFloat(form.discount_amount) : null,
        min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : null,
        promo_code: form.promo_code.trim() || null, start_date: form.start_date, end_date: form.end_date,
        budget: form.budget ? parseFloat(form.budget) : null,
        max_redemptions: form.max_redemptions ? parseInt(form.max_redemptions) : null,
      }
    }).catch(console.error)
    setShowCreate(false); setForm(DEFAULTS); load()
  }

  const updateStatus = async (id: number, status: string) => {
    await invoke('update_campaign_status', { campaignId: id, status }).catch(console.error)
    load()
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this campaign?')) return
    await invoke('delete_campaign', { campaignId: id }).catch(console.error)
    load()
  }

  const f = (k: string, v: string) => setForm({ ...form, [k]: v })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" />
          <h3 className="font-semibold">Campaigns</h3>
          <Badge variant="secondary">{campaigns.length}</Badge>
        </div>
        <div className="flex gap-2">
          <select className="border rounded-md px-2 py-1 text-sm bg-background" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />New Campaign</Button>
        </div>
      </div>

      {campaigns.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No campaigns found</p>}

      <div className="space-y-3">
        {campaigns.map(c => (
          <div key={c.id} className="border rounded-lg p-4 bg-card">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{c.name}</h4>
                  <Badge className={`text-xs ${STATUS_COLOR[c.status]}`}>{c.status}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{c.campaign_type.replace('_', ' ')}</Badge>
                  {c.target_segment && c.target_segment !== 'all' && (
                    <Badge variant="outline" className="text-xs capitalize">{c.target_segment}</Badge>
                  )}
                </div>
                {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
              </div>
              <div className="flex gap-1">
                {c.status === 'draft' && (
                  <Button size="sm" variant="outline" className="h-7" onClick={() => updateStatus(c.id, 'active')}>
                    <Play className="w-3 h-3 mr-1" />Activate
                  </Button>
                )}
                {c.status === 'active' && (
                  <Button size="sm" variant="outline" className="h-7" onClick={() => updateStatus(c.id, 'paused')}>
                    <Pause className="w-3 h-3 mr-1" />Pause
                  </Button>
                )}
                {c.status === 'paused' && (
                  <Button size="sm" variant="outline" className="h-7" onClick={() => updateStatus(c.id, 'active')}>
                    <Play className="w-3 h-3 mr-1" />Resume
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>{c.start_date} → {c.end_date}</span>
              {c.discount_percent && <span>{c.discount_percent}% off</span>}
              {c.discount_amount && <span>₹{c.discount_amount} off</span>}
              {c.promo_code && <span>Code: <strong>{c.promo_code}</strong></span>}
              <span>{c.redemption_count} redeemed{c.max_redemptions ? ` / ${c.max_redemptions}` : ''}</span>
              {c.budget && <span>Budget: ₹{c.spent.toFixed(0)} / ₹{c.budget.toFixed(0)}</span>}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={v => { if (!v) { setShowCreate(false); setForm(DEFAULTS) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => f('name', e.target.value)} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => f('description', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Type</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.campaign_type} onChange={e => f('campaign_type', e.target.value)}>
                  {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <Label>Target Segment</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.target_segment} onChange={e => f('target_segment', e.target.value)}>
                  {SEGMENTS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Discount %</Label><Input type="number" min="0" max="100" value={form.discount_percent} onChange={e => f('discount_percent', e.target.value)} /></div>
              <div><Label>Discount ₹</Label><Input type="number" min="0" value={form.discount_amount} onChange={e => f('discount_amount', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Min Order ₹</Label><Input type="number" min="0" value={form.min_order_value} onChange={e => f('min_order_value', e.target.value)} /></div>
              <div><Label>Promo Code</Label><Input value={form.promo_code} onChange={e => f('promo_code', e.target.value)} placeholder="e.g. SAVE20" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Start Date *</Label><Input type="date" value={form.start_date} onChange={e => f('start_date', e.target.value)} /></div>
              <div><Label>End Date *</Label><Input type="date" value={form.end_date} onChange={e => f('end_date', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Budget ₹</Label><Input type="number" min="0" value={form.budget} onChange={e => f('budget', e.target.value)} /></div>
              <div><Label>Max Redemptions</Label><Input type="number" min="0" value={form.max_redemptions} onChange={e => f('max_redemptions', e.target.value)} /></div>
            </div>
            <Button className="w-full" disabled={!form.name.trim() || !form.end_date} onClick={handleCreate}>Create Campaign</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
