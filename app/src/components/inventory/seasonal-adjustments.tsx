'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sun, Snowflake, Leaf, Cloud, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

interface Adjustment {
  id: number; inventory_item_id: number; item_name: string | null
  season_name: string; start_month: number; end_month: number
  demand_multiplier: number; reorder_point_override: number | null
  notes: string | null; is_active: boolean
}

interface InventoryItem { id: number; name: string }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const SEASON_ICON: Record<string, React.ReactNode> = {
  Summer: <Sun className="w-4 h-4 text-amber-500" />,
  Winter: <Snowflake className="w-4 h-4 text-blue-500" />,
  Monsoon: <Cloud className="w-4 h-4 text-gray-500" />,
  Festival: <Leaf className="w-4 h-4 text-green-500" />,
}

export function SeasonalAdjustments() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    inventory_item_id: '', season_name: 'Summer',
    start_month: '4', end_month: '6', demand_multiplier: '1.5',
    reorder_point_override: '', notes: '',
  })

  const load = useCallback(async () => {
    const res = await invoke<{ success: boolean; data: Adjustment[] }>('get_seasonal_adjustments', {}).catch(() => null)
    if (res?.success) setAdjustments(res.data)
  }, [])

  const loadItems = useCallback(async () => {
    const res = await invoke<{ success: boolean; data: { items: InventoryItem[] } }>('get_inventory_items', { restaurantId: 1 }).catch(() => null)
    if (res?.success) setItems(res.data.items)
  }, [])

  useEffect(() => { load(); loadItems() }, [load, loadItems])

  const save = async () => {
    if (!form.inventory_item_id) return
    await invoke('create_seasonal_adjustment', {
      inventoryItemId: parseInt(form.inventory_item_id),
      seasonName: form.season_name,
      startMonth: parseInt(form.start_month),
      endMonth: parseInt(form.end_month),
      demandMultiplier: parseFloat(form.demand_multiplier) || 1.0,
      reorderPointOverride: form.reorder_point_override ? parseFloat(form.reorder_point_override) : null,
      notes: form.notes || null,
    }).catch(console.error)
    setShowForm(false)
    load()
  }

  const remove = async (id: number) => {
    await invoke('delete_seasonal_adjustment', { id }).catch(console.error)
    load()
  }

  const toggle = async (id: number) => {
    await invoke('toggle_seasonal_adjustment', { id }).catch(console.error)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><Sun className="w-4 h-4" />Seasonal Adjustments</h3>
        <Button size="sm" className="gradient-spice text-white" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" />Add Rule
        </Button>
      </div>

      {adjustments.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No seasonal rules configured</p>}

      <div className="space-y-2">
        {adjustments.map(a => (
          <div key={a.id} className={`border rounded-lg p-3 flex items-center justify-between gap-3 ${!a.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3">
              {SEASON_ICON[a.season_name] ?? <Leaf className="w-4 h-4" />}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{a.item_name ?? `Item #${a.inventory_item_id}`}</span>
                  <Badge variant="outline" className="text-xs">{a.season_name}</Badge>
                  <span className="text-xs text-muted-foreground">{MONTHS[a.start_month - 1]}–{MONTHS[a.end_month - 1]}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>Demand: {a.demand_multiplier}×</span>
                  {a.reorder_point_override !== null && <span>Reorder: {a.reorder_point_override}</span>}
                  {a.notes && <span>{a.notes}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => toggle(a.id)} className="text-muted-foreground hover:text-foreground">
                {a.is_active ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
              </button>
              <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Seasonal Rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Inventory Item</Label>
              <Select value={form.inventory_item_id} onValueChange={v => setForm({ ...form, inventory_item_id: v ?? '' })}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>{items.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Season</Label>
                <Select value={form.season_name} onValueChange={v => setForm({ ...form, season_name: v ?? 'Summer' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Summer','Winter','Monsoon','Festival','Custom'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Month</Label>
                <Select value={form.start_month} onValueChange={v => setForm({ ...form, start_month: v ?? '1' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>End Month</Label>
                <Select value={form.end_month} onValueChange={v => setForm({ ...form, end_month: v ?? '12' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Demand Multiplier</Label><Input type="number" step="0.1" min="0.1" value={form.demand_multiplier} onChange={e => setForm({ ...form, demand_multiplier: e.target.value })} /></div>
              <div><Label>Reorder Point Override</Label><Input type="number" min="0" placeholder="Optional" value={form.reorder_point_override} onChange={e => setForm({ ...form, reorder_point_override: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Mango season spike" /></div>
            <Button className="w-full gradient-spice text-white" onClick={save}>Create Rule</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
