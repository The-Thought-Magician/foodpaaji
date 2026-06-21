'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import BulkOperationForm, { type BulkOperation } from './bulk-operation-form'
import BulkPreviewDialog, { type PreviewItem } from './bulk-preview-dialog'

interface InventoryItem {
  id: number
  name: string
  sku?: string
  current_stock: number
  cost_price: number
  selling_price: number
  minimum_stock: number
  maximum_stock: number
  reorder_point: number
  base_unit: string
}

const RESTAURANT_ID = 1

const fmtCurrency = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)

function getCurrentValue(item: InventoryItem, op: BulkOperation): number {
  if (op.type === 'STOCK_ADJUSTMENT') return item.current_stock
  if (op.type === 'REORDER_LEVELS') {
    if (op.field === 'minimum_stock') return item.minimum_stock
    if (op.field === 'maximum_stock') return item.maximum_stock
    if (op.field === 'reorder_point') return item.reorder_point
  }
  if (op.field === 'cost_price') return item.cost_price
  return item.selling_price
}

function getNewValue(item: InventoryItem, op: BulkOperation): number {
  if (op.type === 'STOCK_ADJUSTMENT') return item.current_stock + (op.value ?? 0)
  if (op.type === 'PERCENTAGE_MARKUP') return getCurrentValue(item, op) * (1 + (op.percentage ?? 0) / 100)
  return op.value ?? 0
}

export default function BulkInventoryUpdate() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [operation, setOperation] = useState<BulkOperation>({ type: 'PRICE_UPDATE' })
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => { loadItems() }, [])

  const loadItems = async () => {
    setLoading(true)
    try {
      const res = await invoke<{ success: boolean; data?: InventoryItem[] }>('get_inventory_items', { restaurantId: RESTAURANT_ID })
      if (res.success && res.data) setItems(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const filtered = items.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const toggleItem = (id: number, checked: boolean) => {
    setSelected(s => { const n = new Set(s); if (checked) n.add(id); else n.delete(id); return n })
  }

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(filtered.map(i => i.id)) : new Set())
  }

  const generatePreview = () => {
    const preview = items.filter(i => selected.has(i.id)).map(i => ({
      id: i.id, name: i.name,
      current_value: getCurrentValue(i, operation),
      new_value: getNewValue(i, operation),
      selected: true,
    }))
    setPreviewItems(preview)
    setShowPreview(true)
  }

  const executeUpdate = async () => {
    setUpdating(true)
    try {
      const item_ids = previewItems.filter(i => i.selected).map(i => i.id)
      await invoke('bulk_update_inventory_items', {
        request: {
          restaurant_id: RESTAURANT_ID,
          item_ids,
          operation_type: operation.type,
          field: operation.field,
          value: operation.value,
          percentage: operation.percentage,
        }
      })
      await loadItems()
      setShowPreview(false)
      setSelected(new Set())
      setPreviewItems([])
    } catch (e) { console.error(e) }
    finally { setUpdating(false) }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Bulk Inventory Update</h1>
        <div className="text-sm text-muted-foreground">{selected.size} of {filtered.length} items selected</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BulkOperationForm operation={operation} selectedCount={selected.size}
          onChange={setOperation} onPreview={generatePreview} />

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Select Items for Update</CardTitle>
            <div className="flex items-center gap-4">
              <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
              <Button onClick={() => toggleAll(selected.size !== filtered.length)} variant="outline" size="sm">
                {selected.size === filtered.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <span className="ml-2">Loading items...</span>
              </div>
            ) : (
              <div className="rounded-md border max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox checked={selected.size === filtered.length && filtered.length > 0}
                          onCheckedChange={toggleAll} />
                      </TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Cost Price</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox checked={selected.has(item.id)}
                            onCheckedChange={c => toggleItem(item.id, !!c)} />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          {item.sku && <div className="text-sm text-muted-foreground">SKU: {item.sku}</div>}
                        </TableCell>
                        <TableCell className="text-right">{item.current_stock} {item.base_unit}</TableCell>
                        <TableCell className="text-right">{fmtCurrency(item.cost_price)}</TableCell>
                        <TableCell className="text-right">{fmtCurrency(item.selling_price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BulkPreviewDialog open={showPreview} operation={operation} items={previewItems}
        updating={updating} onClose={() => setShowPreview(false)}
        onToggleItem={(id, s) => setPreviewItems(prev => prev.map(i => i.id === id ? { ...i, selected: s } : i))}
        onToggleAll={s => setPreviewItems(prev => prev.map(i => ({ ...i, selected: s })))}
        onExecute={executeUpdate} />
    </div>
  )
}
