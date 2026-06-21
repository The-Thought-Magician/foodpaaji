'use client'

import { useState, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, AlertTriangle, TrendingUp, Download } from 'lucide-react'

const RESTAURANT_ID = 1

interface StockSummaryReport {
  item_id: number
  item_name: string
  sku?: string
  category_name?: string
  current_stock: number
  minimum_stock: number
  maximum_stock: number
  reorder_point: number
}

interface MovementReport {
  item_id: number
  item_name: string
  movement_type: string
  total_quantity: number
  total_value: number
  movement_count: number
}

interface LowStockReport {
  item_id: number
  item_name: string
  sku?: string
  current_stock: number
  reorder_point: number
  shortage: number
  days_of_stock?: number
  supplier_name?: string
}

type ReportType = 'stock' | 'movement' | 'lowstock'

export default function InventoryReports() {
  const [reportType, setReportType] = useState<ReportType>('lowstock')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [stockRows, setStockRows] = useState<StockSummaryReport[]>([])
  const [movementRows, setMovementRows] = useState<MovementReport[]>([])
  const [lowStockRows, setLowStockRows] = useState<LowStockReport[]>([])
  const [loading, setLoading] = useState(false)

  const run = useCallback(async () => {
    setLoading(true)
    try {
      if (reportType === 'stock') {
        const res = await invoke<{ success: boolean; data: StockSummaryReport[] }>('get_stock_summary_report', {
          request: { restaurant_id: RESTAURANT_ID, start_date: startDate || null, end_date: endDate || null, category_id: null, supplier_id: null }
        })
        if (res.success) setStockRows(res.data ?? [])
      } else if (reportType === 'movement') {
        const res = await invoke<{ success: boolean; data: MovementReport[] }>('get_movement_report', {
          request: { restaurant_id: RESTAURANT_ID, start_date: startDate || null, end_date: endDate || null, category_id: null, supplier_id: null }
        })
        if (res.success) setMovementRows(res.data ?? [])
      } else {
        const res = await invoke<{ success: boolean; data: LowStockReport[] }>('get_low_stock_report', {
          restaurantId: RESTAURANT_ID
        })
        if (res.success) setLowStockRows(res.data ?? [])
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [reportType, startDate, endDate])

  const exportCSV = () => {
    let csv = ''
    if (reportType === 'stock' && stockRows.length) {
      csv = 'Item,SKU,Category,Current Stock,Min Stock,Reorder Point\n' + stockRows.map(r => `"${r.item_name}","${r.sku ?? ''}","${r.category_name ?? ''}",${r.current_stock},${r.minimum_stock},${r.reorder_point}`).join('\n')
    } else if (reportType === 'movement' && movementRows.length) {
      csv = 'Item,Type,Total Quantity,Total Value,Count\n' + movementRows.map(r => `"${r.item_name}","${r.movement_type}",${r.total_quantity},${r.total_value.toFixed(2)},${r.movement_count}`).join('\n')
    } else if (reportType === 'lowstock' && lowStockRows.length) {
      csv = 'Item,SKU,Current Stock,Reorder Point,Shortage,Supplier\n' + lowStockRows.map(r => `"${r.item_name}","${r.sku ?? ''}",${r.current_stock},${r.reorder_point},${r.shortage},"${r.supplier_name ?? ''}"`).join('\n')
    }
    if (!csv) return
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `inventory-${reportType}-${new Date().toISOString().split('T')[0]}.csv` })
    a.click()
  }

  const TABS: { key: ReportType; label: string; icon: React.ReactNode }[] = [
    { key: 'lowstock', label: 'Low Stock', icon: <AlertTriangle className="w-4 h-4" /> },
    { key: 'stock', label: 'Stock Summary', icon: <FileText className="w-4 h-4" /> },
    { key: 'movement', label: 'Movement', icon: <TrendingUp className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setReportType(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${reportType === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {t.icon}{t.label}
          </button>
        ))}
        {reportType !== 'lowstock' && (
          <div className="flex items-center gap-2 ml-2">
            <div className="flex items-center gap-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 w-36 text-sm" />
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 w-36 text-sm" />
            </div>
          </div>
        )}
        <Button size="sm" onClick={run} disabled={loading} className="gradient-spice text-white ml-auto">
          {loading ? 'Running...' : 'Run Report'}
        </Button>
        <Button size="sm" variant="outline" onClick={exportCSV}
          disabled={stockRows.length + movementRows.length + lowStockRows.length === 0}>
          <Download className="w-4 h-4 mr-1" />CSV
        </Button>
      </div>

      {reportType === 'lowstock' && (
        <Card>
          <CardContent className="p-0">
            {lowStockRows.length === 0
              ? <p className="text-center text-muted-foreground py-10 text-sm">Run report to see low stock items</p>
              : (
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Item</th>
                      <th className="px-4 py-3 font-medium">SKU</th>
                      <th className="px-4 py-3 font-medium">Stock</th>
                      <th className="px-4 py-3 font-medium">Reorder At</th>
                      <th className="px-4 py-3 font-medium">Shortage</th>
                      <th className="px-4 py-3 font-medium">Days Left</th>
                      <th className="px-4 py-3 font-medium">Supplier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockRows.map(r => (
                      <tr key={r.item_id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{r.item_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.sku ?? '—'}</td>
                        <td className="px-4 py-3"><Badge className="bg-red-100 text-red-700">{r.current_stock.toFixed(1)}</Badge></td>
                        <td className="px-4 py-3">{r.reorder_point.toFixed(1)}</td>
                        <td className="px-4 py-3 text-red-600 font-medium">{r.shortage.toFixed(1)}</td>
                        <td className="px-4 py-3">{r.days_of_stock != null ? `${r.days_of_stock.toFixed(0)}d` : '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.supplier_name ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </CardContent>
        </Card>
      )}

      {reportType === 'stock' && (
        <Card>
          <CardContent className="p-0">
            {stockRows.length === 0
              ? <p className="text-center text-muted-foreground py-10 text-sm">Run report to see stock summary</p>
              : (
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Item</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Current</th>
                      <th className="px-4 py-3 font-medium">Min</th>
                      <th className="px-4 py-3 font-medium">Max</th>
                      <th className="px-4 py-3 font-medium">Reorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockRows.map(r => (
                      <tr key={r.item_id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{r.item_name}<span className="text-xs text-muted-foreground ml-1">{r.sku}</span></td>
                        <td className="px-4 py-3 text-muted-foreground">{r.category_name ?? '—'}</td>
                        <td className="px-4 py-3">{r.current_stock.toFixed(1)}</td>
                        <td className="px-4 py-3">{r.minimum_stock.toFixed(1)}</td>
                        <td className="px-4 py-3">{r.maximum_stock.toFixed(1)}</td>
                        <td className="px-4 py-3">{r.reorder_point.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </CardContent>
        </Card>
      )}

      {reportType === 'movement' && (
        <Card>
          <CardContent className="p-0">
            {movementRows.length === 0
              ? <p className="text-center text-muted-foreground py-10 text-sm">Run report to see movement data</p>
              : (
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Item</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Qty</th>
                      <th className="px-4 py-3 font-medium">Value</th>
                      <th className="px-4 py-3 font-medium">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementRows.map((r, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{r.item_name}</td>
                        <td className="px-4 py-3"><Badge className="bg-blue-100 text-blue-700 text-xs">{r.movement_type}</Badge></td>
                        <td className="px-4 py-3">{r.total_quantity.toFixed(1)}</td>
                        <td className="px-4 py-3">₹{r.total_value.toFixed(0)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.movement_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
