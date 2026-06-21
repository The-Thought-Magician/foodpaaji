'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { ShoppingCart, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Suggestion {
  supplier_id: number | null
  supplier_name: string | null
  item_id: number
  item_name: string
  sku: string | null
  unit_name: string | null
  current_stock: number
  reorder_point: number
  maximum_stock: number
  suggested_qty: number
  cost_price: number
  estimated_cost: number
}

interface SupplierGroup {
  supplier_name: string | null
  supplier_id: number | null
  items: Suggestion[]
  total_cost: number
}

const RESTAURANT_ID = 1

export default function PurchaseOrders() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [qty, setQty] = useState<Record<number, number>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await invoke<{ success: boolean; data?: Suggestion[] }>('get_purchase_order_suggestions', { restaurantId: RESTAURANT_ID })
      if (res.success && res.data) {
        setSuggestions(res.data)
        const init: Record<number, number> = {}
        res.data.forEach(s => { init[s.item_id] = Math.ceil(s.suggested_qty) })
        setQty(init)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const groups: SupplierGroup[] = Object.values(
    suggestions.reduce<Record<string, SupplierGroup>>((acc, s) => {
      const key = s.supplier_name ?? '__no_supplier__'
      if (!acc[key]) acc[key] = { supplier_name: s.supplier_name, supplier_id: s.supplier_id, items: [], total_cost: 0 }
      acc[key].items.push(s)
      acc[key].total_cost += (qty[s.item_id] ?? s.suggested_qty) * s.cost_price
      return acc
    }, {})
  )

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (loading) return <div className="py-16 text-center text-muted-foreground text-sm">Loading suggestions…</div>

  if (suggestions.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
      <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
      <p className="font-medium">All stock levels are above reorder points</p>
      <p className="text-xs mt-1">No purchase orders needed right now</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Purchase Order Suggestions</h3>
          <p className="text-sm text-muted-foreground">{suggestions.length} item{suggestions.length !== 1 ? 's' : ''} below reorder point</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
      </div>

      {groups.map(group => (
        <div key={group.supplier_name ?? 'no-supplier'} className="bg-card border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">{group.supplier_name ?? 'No Supplier Assigned'}</span>
              <span className="text-xs text-muted-foreground">· {group.items.length} item{group.items.length !== 1 ? 's' : ''}</span>
            </div>
            <span className="text-sm font-semibold text-orange-600">
              Est. {fmt(group.items.reduce((s, i) => s + (qty[i.item_id] ?? i.suggested_qty) * i.cost_price, 0))}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left px-5 py-2">Item</th>
                <th className="text-right px-3 py-2">Current</th>
                <th className="text-right px-3 py-2">Reorder at</th>
                <th className="text-right px-3 py-2">Order Qty</th>
                <th className="text-right px-5 py-2">Est. Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {group.items.map(s => (
                <tr key={s.item_id} className="hover:bg-muted/20">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {s.current_stock <= 0 && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                      <div>
                        <p className="font-medium">{s.item_name}</p>
                        {s.sku && <p className="text-xs text-muted-foreground">{s.sku}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="text-right px-3 py-3">
                    <span className={s.current_stock <= 0 ? 'text-red-600 font-semibold' : 'text-orange-600'}>
                      {s.current_stock.toFixed(2)} {s.unit_name ?? ''}
                    </span>
                  </td>
                  <td className="text-right px-3 py-3 text-muted-foreground">{s.reorder_point.toFixed(2)}</td>
                  <td className="text-right px-3 py-3">
                    <input type="number" min={1} value={qty[s.item_id] ?? Math.ceil(s.suggested_qty)}
                      onChange={e => setQty(q => ({ ...q, [s.item_id]: parseFloat(e.target.value) || 0 }))}
                      className="w-20 text-right border border-border rounded px-2 py-1 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
                    <span className="ml-1 text-muted-foreground">{s.unit_name ?? ''}</span>
                  </td>
                  <td className="text-right px-5 py-3 font-medium">
                    {fmt((qty[s.item_id] ?? s.suggested_qty) * s.cost_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="bg-muted/40 rounded-xl p-4 flex justify-between items-center">
        <span className="font-semibold">Total Estimated Cost</span>
        <span className="text-lg font-bold text-orange-600">
          {fmt(suggestions.reduce((s, i) => s + (qty[i.item_id] ?? i.suggested_qty) * i.cost_price, 0))}
        </span>
      </div>
    </div>
  )
}
