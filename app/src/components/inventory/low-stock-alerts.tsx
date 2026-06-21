'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, Trash2, RefreshCw, Filter, Search, Download } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTable } from './alert-table'
import type { LowStockAlert, AlertSummary, AlertFilters } from './alert-types'

const RESTAURANT_ID = 1

const SUMMARY_STATS = [
  { key: 'total_alerts' as const, label: 'Total Alerts', color: '' },
  { key: 'out_of_stock_alerts' as const, label: 'Out of Stock', color: 'text-red-600' },
  { key: 'critical_alerts' as const, label: 'Critical', color: 'text-orange-600' },
  { key: 'low_alerts' as const, label: 'Low Stock', color: 'text-yellow-600' },
  { key: 'unacknowledged_alerts' as const, label: 'Unacknowledged', color: 'text-blue-600' },
]

export default function LowStockAlerts() {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([])
  const [summary, setSummary] = useState<AlertSummary | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [filters, setFilters] = useState<AlertFilters>({ page: 1, limit: 25 })
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [restock, setRestock] = useState<{ itemId: number; name: string } | null>(null)
  const [restockQty, setRestockQty] = useState('10')

  const loadAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await invoke<{ success: boolean; data?: { alerts: LowStockAlert[]; total: number } }>(
        'get_low_stock_alerts', { request: { restaurant_id: RESTAURANT_ID, ...filters } }
      )
      if (res.success && res.data) { setAlerts(res.data.alerts); setTotal(res.data.total) }
      else { setAlerts([]); setTotal(0) }
    } catch (e) { console.error(e); setAlerts([]); setTotal(0) }
    finally { setLoading(false) }
  }, [filters])

  const loadSummary = useCallback(async () => {
    try {
      const res = await invoke<{ success: boolean; data?: AlertSummary }>('get_alert_summary', { restaurantId: RESTAURANT_ID })
      if (res.success && res.data) setSummary(res.data)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => {
    loadAlerts(); loadSummary()
    const t = setInterval(() => { loadAlerts(); loadSummary() }, 60000)
    return () => clearInterval(t)
  }, [loadAlerts, loadSummary])

  const acknowledge = async (alertId: number) => {
    try {
      await invoke('acknowledge_alert', { request: { alert_id: alertId, user_id: 1, restaurant_id: RESTAURANT_ID } })
      loadAlerts(); loadSummary()
    } catch (e) { console.error(e) }
  }

  const bulkAcknowledge = async () => {
    if (!selected.size) return
    try {
      await invoke('bulk_acknowledge_alerts', { request: { restaurant_id: RESTAURANT_ID, user_id: 1, alert_ids: Array.from(selected) } })
      setSelected(new Set()); loadAlerts(); loadSummary()
    } catch (e) { console.error(e) }
  }

  const doRestock = async () => {
    if (!restock) return
    const qty = parseFloat(restockQty)
    if (qty <= 0) return
    try {
      await invoke('adjust_stock_level', { request: { restaurant_id: RESTAURANT_ID, inventory_item_id: restock.itemId, new_quantity: qty, reason: 'Restock from low-stock alert', adjusted_by: 1 } })
      setRestock(null); loadAlerts(); loadSummary()
    } catch (e) { console.error(e) }
  }

  const clearAcknowledged = async () => {
    try {
      await invoke('clear_acknowledged_alerts', { restaurantId: RESTAURANT_ID })
      loadAlerts(); loadSummary()
    } catch (e) { console.error(e) }
  }

  const selectOne = (id: number, checked: boolean) => {
    setSelected(s => { const n = new Set(s); if (checked) n.add(id); else n.delete(id); return n })
  }

  const selectAll = (checked: boolean) => {
    setSelected(checked ? new Set(alerts.filter(a => !a.is_acknowledged).map(a => a.id)) : new Set())
  }

  const filtered = alerts.filter(a =>
    !search || a.item_name.toLowerCase().includes(search.toLowerCase()) || (a.item_sku ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const setFilter = (patch: Partial<AlertFilters>) => setFilters(f => ({ ...f, ...patch, page: 1 }))

  const exportCSV = () => {
    if (!filtered.length) return
    const rows = ['Item,SKU,Current Stock,Threshold,Alert Level,Acknowledged', ...filtered.map(a => `"${a.item_name}","${a.item_sku ?? ''}",${a.current_stock},${a.threshold_stock},"${a.alert_level}",${a.is_acknowledged}`)]
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })), download: `low-stock-${new Date().toISOString().split('T')[0]}.csv` })
    a.click()
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Low Stock Alerts</h1>
        <div className="flex gap-2">
          <Button onClick={exportCSV} variant="outline" size="sm" disabled={!filtered.length}><Download className="h-4 w-4 mr-2" />Export</Button>
          <Button onClick={clearAcknowledged} variant="outline" size="sm"><Trash2 className="h-4 w-4 mr-2" />Clear Acknowledged</Button>
          <Button onClick={loadAlerts} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {SUMMARY_STATS.map(s => (
            <Card key={s.key}>
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{summary[s.key]}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />Filters</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input placeholder="Name or SKU" value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div>
              <Label>Alert Level</Label>
              <Select value={filters.alert_level ?? ''}
                onValueChange={(v: string | null) => setFilter({ alert_level: v || undefined })}>
                <SelectTrigger><SelectValue placeholder="All levels" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All levels</SelectItem>
                  <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="LOW">Low Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filters.is_acknowledged !== undefined ? String(filters.is_acknowledged) : ''}
                onValueChange={(v: string | null) => setFilter({ is_acknowledged: v === '' ? undefined : v === 'true' })}>
                <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="false">Unacknowledged</SelectItem>
                  <SelectItem value="true">Acknowledged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Per Page</Label>
              <Select value={String(filters.limit)}
                onValueChange={(v: string | null) => setFilter({ limit: parseInt(v ?? '25') })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selected.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-800">{selected.size} selected</span>
              <Button onClick={bulkAcknowledge} size="sm">
                <CheckCircle className="h-4 w-4 mr-2" />Acknowledge Selected
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Alert Details ({total} total)</CardTitle></CardHeader>
        <CardContent>
          <AlertTable
            alerts={filtered} selected={selected} totalRecords={total}
            filters={filters} loading={loading}
            onSelectOne={selectOne} onSelectAll={selectAll}
            onAcknowledge={acknowledge}
            onRestock={(itemId, name) => { setRestock({ itemId, name }); setRestockQty('10') }}
            onPageChange={p => setFilters(f => ({ ...f, page: p }))}
          />
        </CardContent>
      </Card>
      <Dialog open={!!restock} onOpenChange={() => setRestock(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Restock — {restock?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Add Quantity</Label><Input type="number" min="0.01" step="0.01" value={restockQty} onChange={e => setRestockQty(e.target.value)} /></div>
            <Button className="w-full gradient-spice text-white" onClick={doRestock}>Confirm Restock</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
