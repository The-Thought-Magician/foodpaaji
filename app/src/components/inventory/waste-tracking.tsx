'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, Plus, AlertTriangle, TrendingDown, RefreshCw, Download } from 'lucide-react'

interface InventoryItem {
  id: number
  name: string
  current_stock: number
  unit: string
  cost_price?: number
}

interface WasteEntry {
  id: number
  item_name: string
  quantity: number
  unit: string
  reason: string
  cost_per_unit?: number
  notes?: string
  recorded_by?: string
  wasted_at: string
}

interface WasteSummary {
  by_reason: { reason: string; count: number; total_qty: number; total_cost: number }[]
  total_cost: number
  days: number
}

const REASONS = ['expired', 'spoiled', 'overproduction', 'dropped', 'other'] as const
const REASON_LABEL: Record<string, string> = { expired: 'Expired', spoiled: 'Spoiled', overproduction: 'Overproduction', dropped: 'Dropped/Damaged', other: 'Other' }

const FORM_DEFAULTS = { inventory_item_id: '', item_name: '', quantity: '', unit: '', reason: '', notes: '' }

export default function WasteTracking() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [entries, setEntries] = useState<WasteEntry[]>([])
  const [summary, setSummary] = useState<WasteSummary | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [days, setDays] = useState(30)
  const [form, setForm] = useState(FORM_DEFAULTS)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [itemsRes, entriesRes, summaryRes] = await Promise.all([
        invoke<{ success: boolean; data?: InventoryItem[] }>('get_inventory_items', { restaurantId: 1 }),
        invoke<{ success: boolean; data?: WasteEntry[] }>('get_waste_entries', { days }),
        invoke<{ success: boolean; data?: WasteSummary }>('get_waste_summary', { days }),
      ])
      if (itemsRes.success && itemsRes.data) setItems(itemsRes.data)
      if (entriesRes.success && entriesRes.data) setEntries(entriesRes.data)
      if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [days])

  useEffect(() => { load() }, [load])

  const selectedItem = items.find(i => i.id === Number(form.inventory_item_id))

  const handleItemChange = (id: string | null) => {
    const item = items.find(i => i.id === Number(id))
    setForm(f => ({ ...f, inventory_item_id: id ?? '', item_name: item?.name ?? '', unit: item?.unit ?? '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const qty = parseFloat(form.quantity)
    if (!form.reason || isNaN(qty) || qty <= 0) return
    const request = {
      inventory_item_id: form.inventory_item_id ? Number(form.inventory_item_id) : null,
      item_name: form.item_name.trim() || selectedItem?.name || 'Unknown',
      quantity: qty,
      unit: form.unit.trim() || selectedItem?.unit || 'unit',
      reason: form.reason,
      cost_per_unit: selectedItem?.cost_price ?? null,
      notes: form.notes.trim() || null,
      recorded_by: null,
    }
    try {
      const res = await invoke<{ success: boolean }>('create_waste_entry', { request })
      if (res.success) { setForm(FORM_DEFAULTS); setShowForm(false); load() }
    } catch (e) { console.error(e) }
  }

  const exportCSV = () => {
    const rows = ['Item,Qty,Unit,Reason,Cost/Unit,Notes,Date',
      ...entries.map(e => `"${e.item_name}",${e.quantity},"${e.unit}","${e.reason}",${e.cost_per_unit ?? ''},"${e.notes ?? ''}","${e.wasted_at}"`)
    ]
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })),
      download: `waste-log-${new Date().toISOString().split('T')[0]}.csv`
    })
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg"><Trash2 className="w-5 h-5 text-destructive" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{entries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg"><TrendingDown className="w-5 h-5 text-orange-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Loss ({days}d)</p>
                <p className="text-2xl font-bold">₹{(summary?.total_cost ?? 0).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg"><AlertTriangle className="w-5 h-5 text-yellow-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Top Reason</p>
                <p className="text-lg font-bold capitalize">{summary?.by_reason[0] ? REASON_LABEL[summary.by_reason[0].reason] ?? summary.by_reason[0].reason : '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {summary && summary.by_reason.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Waste by Reason</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {summary.by_reason.map(r => (
                <div key={r.reason} className="text-center p-3 bg-muted/40 rounded-lg">
                  <p className="text-xs text-muted-foreground capitalize mb-1">{REASON_LABEL[r.reason] ?? r.reason}</p>
                  <p className="font-bold text-sm">{r.count} entries</p>
                  <p className="text-xs text-destructive">₹{r.total_cost.toFixed(0)} loss</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Waste Log</CardTitle>
          <div className="flex gap-2 items-center">
            <Select value={String(days)} onValueChange={v => setDays(Number(v))}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!entries.length}><Download className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
            <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />Log Waste</Button>
          </div>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Trash2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No waste records in this period</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {entries.map(entry => (
                <div key={entry.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{entry.item_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{REASON_LABEL[entry.reason] ?? entry.reason}{entry.notes ? ` · ${entry.notes}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{new Date(entry.wasted_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="mb-1">{entry.quantity} {entry.unit}</Badge>
                    {entry.cost_per_unit != null && (
                      <p className="text-xs text-muted-foreground">₹{(entry.cost_per_unit * entry.quantity).toFixed(2)} loss</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Waste</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Item (from inventory)</Label>
              <Select value={form.inventory_item_id} onValueChange={handleItemChange}>
                <SelectTrigger><SelectValue placeholder="Select item..." /></SelectTrigger>
                <SelectContent>
                  {items.map(item => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name} ({item.current_stock} {item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!form.inventory_item_id && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Item Name</Label>
                  <Input placeholder="e.g. Tomatoes" value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input placeholder="kg" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Quantity Wasted</Label>
              <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              {selectedItem?.cost_price && form.quantity && (
                <p className="text-xs text-muted-foreground">
                  Est. loss: ₹{(parseFloat(form.quantity || '0') * selectedItem.cost_price).toFixed(2)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={form.reason} onValueChange={v => setForm(f => ({ ...f, reason: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                <SelectContent>
                  {REASONS.map(r => <SelectItem key={r} value={r as string}>{REASON_LABEL[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea placeholder="Any additional details..." value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" variant="destructive"
                disabled={(!form.inventory_item_id && !form.item_name) || !form.quantity || !form.reason}>
                Log Waste
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
