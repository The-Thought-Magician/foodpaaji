'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus, AlertTriangle, TrendingDown, RefreshCw } from 'lucide-react'

const RESTAURANT_ID = 1

interface InventoryItem {
  id: number
  name: string
  sku?: string
  current_stock: number
  unit: string
  cost_price?: number
}

interface WasteRecord {
  id?: number
  inventory_item_id: number
  item_name: string
  quantity: number
  unit_cost?: number
  total_cost?: number
  notes?: string
  movement_date?: string
}

interface WasteFormData {
  inventory_item_id: string
  quantity: string
  reason: string
}

const WASTE_REASONS = [
  'Expired',
  'Spoiled',
  'Damaged',
  'Overcooked',
  'Contaminated',
  'Preparation waste',
  'Quality rejection',
  'Other',
]

export default function WasteTracking() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<WasteFormData>({ inventory_item_id: '', quantity: '', reason: '' })
  const [totalWasteCost, setTotalWasteCost] = useState(0)

  const loadItems = useCallback(async () => {
    const res = await invoke<{ success: boolean; data?: InventoryItem[] }>(
      'get_inventory_items', { restaurantId: RESTAURANT_ID }
    ).catch(() => ({ success: false, data: undefined }))
    if (res.success && res.data) setItems(res.data)
  }, [])

  const loadWasteHistory = useCallback(async () => {
    setLoading(true)
    const res = await invoke<{ success: boolean; data?: { movements: WasteRecord[] } }>(
      'get_stock_movements', {
        request: { restaurant_id: RESTAURANT_ID, movement_type: 'WASTE', page: 1, limit: 50 }
      }
    ).catch(() => ({ success: false, data: undefined }))
    if (res.success && res.data) {
      setWasteRecords(res.data.movements)
      setTotalWasteCost(res.data.movements.reduce((sum, r) => sum + (r.total_cost ?? 0), 0))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadItems()
    loadWasteHistory()
  }, [loadItems, loadWasteHistory])

  const selectedItem = items.find(i => i.id === Number(form.inventory_item_id))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.inventory_item_id || !form.quantity || !form.reason) return

    const qty = parseFloat(form.quantity)
    if (isNaN(qty) || qty <= 0) return

    const res = await invoke<{ success: boolean; error?: string }>(
      'create_stock_movement', {
        request: {
          restaurant_id: RESTAURANT_ID,
          inventory_item_id: Number(form.inventory_item_id),
          movement_type: 'WASTE',
          quantity: qty,
          unit_cost: selectedItem?.cost_price ?? null,
          reference_type: 'WASTE_TRACKING',
          reference_id: null,
          batch_number: null,
          expiry_date: null,
          notes: form.reason,
          user_id: 1,
        }
      }
    ).catch(err => ({ success: false, error: String(err) }))

    if (res.success) {
      setForm({ inventory_item_id: '', quantity: '', reason: '' })
      setShowForm(false)
      await loadWasteHistory()
      await loadItems()
    }
  }

  const wasteCostThisMonth = wasteRecords
    .filter(r => r.movement_date && r.movement_date.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((sum, r) => sum + (r.total_cost ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{wasteRecords.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <TrendingDown className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month Loss</p>
                <p className="text-2xl font-bold">₹{wasteCostThisMonth.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Loss</p>
                <p className="text-2xl font-bold">₹{totalWasteCost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Waste Records</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadWasteHistory} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1" /> Log Waste
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {wasteRecords.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Trash2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No waste records yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {wasteRecords.map((record, i) => (
                <div key={record.id ?? i} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{record.item_name}</p>
                    <p className="text-xs text-muted-foreground">{record.notes}</p>
                    <p className="text-xs text-muted-foreground">
                      {record.movement_date ? new Date(record.movement_date).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="mb-1">{record.quantity} units</Badge>
                    {record.total_cost != null && record.total_cost > 0 && (
                      <p className="text-xs text-muted-foreground">₹{record.total_cost.toFixed(2)} loss</p>
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
          <DialogHeader>
            <DialogTitle>Log Waste</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Item</Label>
              <Select value={form.inventory_item_id} onValueChange={v => setForm(f => ({ ...f, inventory_item_id: v as string }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item..." />
                </SelectTrigger>
                <SelectContent>
                  {items.map(item => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name} ({item.current_stock} {item.unit} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity Wasted</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={selectedItem?.current_stock}
                placeholder="0.00"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              />
              {selectedItem && (
                <p className="text-xs text-muted-foreground">
                  Available: {selectedItem.current_stock} {selectedItem.unit}
                  {selectedItem.cost_price && ` · Est. loss: ₹${(parseFloat(form.quantity || '0') * selectedItem.cost_price).toFixed(2)}`}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={form.reason} onValueChange={v => setForm(f => ({ ...f, reason: v as string }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  {WASTE_REASONS.map(r => <SelectItem key={r} value={r as string}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" variant="destructive"
                disabled={!form.inventory_item_id || !form.quantity || !form.reason}>
                Log Waste
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
