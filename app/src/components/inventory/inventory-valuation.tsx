'use client'

import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, BarChart3 } from 'lucide-react'

const RESTAURANT_ID = 1
const METHODS = ['FIFO', 'LIFO', 'WEIGHTED_AVERAGE', 'STANDARD_COST']

interface ValuationItem {
  item_id: number
  item_name: string
  current_stock: number
  total_value: number
  average_unit_cost: number
  valuation_method: string
}

interface ValuationSummary {
  total_inventory_value: number
  total_items: number
  valuation_method: string
  items: ValuationItem[]
}

interface ComparisonRow {
  item_id: number
  item_name: string
  current_stock: number
  fifo_value: number
  lifo_value: number
  weighted_average_value: number
  standard_cost_value: number
}

type Mode = 'single' | 'compare'

export default function InventoryValuation() {
  const [mode, setMode] = useState<Mode>('single')
  const [method, setMethod] = useState('FIFO')
  const [summary, setSummary] = useState<ValuationSummary | null>(null)
  const [comparison, setComparison] = useState<ComparisonRow[]>([])
  const [loading, setLoading] = useState(false)

  const runSingle = async () => {
    setLoading(true)
    try {
      const res = await invoke<{ success: boolean; data: ValuationSummary }>('calculate_inventory_valuation', {
        request: { restaurant_id: RESTAURANT_ID, method, category_id: null }
      })
      if (res.success && res.data) setSummary(res.data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const runCompare = async () => {
    setLoading(true)
    try {
      const res = await invoke<{ success: boolean; data: ComparisonRow[] }>('compare_valuation_methods', {
        restaurantId: RESTAURANT_ID
      })
      if (res.success && res.data) setComparison(res.data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          <button onClick={() => setMode('single')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${mode === 'single' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
            <DollarSign className="w-3.5 h-3.5" />Single Method
          </button>
          <button onClick={() => setMode('compare')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${mode === 'compare' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
            <BarChart3 className="w-3.5 h-3.5" />Compare All
          </button>
        </div>

        {mode === 'single' && (
          <select value={method} onChange={e => setMethod(e.target.value)}
            className="px-3 py-1.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
            {METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
          </select>
        )}

        <Button size="sm" onClick={mode === 'single' ? runSingle : runCompare} disabled={loading} className="gradient-spice text-white">
          {loading ? 'Calculating...' : 'Calculate'}
        </Button>
      </div>

      {mode === 'single' && summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">₹{summary.total_inventory_value.toFixed(0)}</p>
                <Badge className="mt-1 text-xs bg-blue-100 text-blue-700">{summary.valuation_method}</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Items Valued</p>
                <p className="text-2xl font-bold">{summary.total_items}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Avg per Item</p>
                <p className="text-2xl font-bold">₹{summary.total_items > 0 ? (summary.total_inventory_value / summary.total_items).toFixed(0) : 0}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-4 py-3 font-medium">Stock</th>
                    <th className="px-4 py-3 font-medium">Avg Cost</th>
                    <th className="px-4 py-3 font-medium">Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.items.map(item => (
                    <tr key={item.item_id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{item.item_name}</td>
                      <td className="px-4 py-3">{item.current_stock.toFixed(1)}</td>
                      <td className="px-4 py-3">₹{item.average_unit_cost.toFixed(2)}</td>
                      <td className="px-4 py-3 font-semibold">₹{item.total_value.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {mode === 'compare' && comparison.length > 0 && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="border-b">
                <tr className="text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">FIFO</th>
                  <th className="px-4 py-3 font-medium">LIFO</th>
                  <th className="px-4 py-3 font-medium">Weighted Avg</th>
                  <th className="px-4 py-3 font-medium">Std Cost</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map(row => (
                  <tr key={row.item_id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{row.item_name}</td>
                    <td className="px-4 py-3">{row.current_stock.toFixed(1)}</td>
                    <td className="px-4 py-3">₹{row.fifo_value.toFixed(0)}</td>
                    <td className="px-4 py-3">₹{row.lifo_value.toFixed(0)}</td>
                    <td className="px-4 py-3">₹{row.weighted_average_value.toFixed(0)}</td>
                    <td className="px-4 py-3">₹{row.standard_cost_value.toFixed(0)}</td>
                  </tr>
                ))}
                <tr className="bg-muted/50 font-semibold">
                  <td className="px-4 py-3" colSpan={2}>Total</td>
                  <td className="px-4 py-3">₹{comparison.reduce((s, r) => s + r.fifo_value, 0).toFixed(0)}</td>
                  <td className="px-4 py-3">₹{comparison.reduce((s, r) => s + r.lifo_value, 0).toFixed(0)}</td>
                  <td className="px-4 py-3">₹{comparison.reduce((s, r) => s + r.weighted_average_value, 0).toFixed(0)}</td>
                  <td className="px-4 py-3">₹{comparison.reduce((s, r) => s + r.standard_cost_value, 0).toFixed(0)}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {mode === 'compare' && comparison.length === 0 && !loading && (
        <p className="text-center text-muted-foreground py-10 text-sm">Click Calculate to compare valuation methods</p>
      )}
      {mode === 'single' && !summary && !loading && (
        <p className="text-center text-muted-foreground py-10 text-sm">Select method and click Calculate</p>
      )}
    </div>
  )
}
