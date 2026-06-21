'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ChefHat, Clock, RefreshCw, CheckCircle2, Circle } from 'lucide-react'

interface OrderItem { item_name: string; quantity: number; notes?: string; kitchen_station?: string }
interface KitchenOrder {
  id: number
  order_number: string
  table_number?: string
  order_type?: string
  status: string
  notes?: string
  created_at: string
  items?: OrderItem[]
}

const STATUS_NEXT: Record<string, string> = { pending: 'preparing', preparing: 'ready' }
const STATUS_LABEL: Record<string, string> = { pending: 'Start', preparing: 'Ready' }
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 border-yellow-300 text-yellow-900',
  preparing: 'bg-blue-100 border-blue-300 text-blue-900',
  ready: 'bg-green-100 border-green-300 text-green-900',
}
const BADGE_COLOR: Record<string, string> = {
  pending: 'bg-yellow-200 text-yellow-800',
  preparing: 'bg-blue-200 text-blue-800',
  ready: 'bg-green-200 text-green-800',
}

const elapsedMin = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
const elapsed = (iso: string) => { const m = elapsedMin(iso); return m < 1 ? 'just now' : `${m}m ago` }
const urgency = (status: string, iso: string): 'critical' | 'warning' | 'normal' => {
  const m = elapsedMin(iso)
  if (status === 'pending' && m >= 15) return 'critical'
  if (status === 'pending' && m >= 8) return 'warning'
  if (status === 'preparing' && m >= 25) return 'critical'
  if (status === 'preparing' && m >= 15) return 'warning'
  return 'normal'
}

interface KitchenStats { total_today: number; avg_prep_min: number; completed_with_times: number; pending_count: number; preparing_count: number }

function QualityCheckModal({ order, onConfirm, onCancel }: { order: KitchenOrder; onConfirm: () => void; onCancel: () => void }) {
  const items = order.items ?? []
  const [checked, setChecked] = useState<boolean[]>(items.map(() => false))
  const allChecked = checked.every(Boolean)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold">Quality Check — {order.order_number}</h3>
          {order.table_number && <p className="text-sm text-muted-foreground">Table {order.table_number}</p>}
        </div>
        <p className="text-sm text-muted-foreground">Confirm each dish is plated and ready:</p>
        <div className="space-y-2">
          {items.map((item, i) => (
            <button key={i} onClick={() => setChecked(c => c.map((v, j) => j === i ? !v : v))}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${checked[i] ? 'bg-green-50 border-green-300' : 'border-border hover:bg-muted'}`}>
              {checked[i]
                ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                : <Circle className="w-5 h-5 text-muted-foreground shrink-0" />}
              <span className="text-sm font-medium">{item.quantity}× {item.item_name}</span>
              {item.notes && <span className="text-xs text-muted-foreground ml-auto truncate">{item.notes}</span>}
            </button>
          ))}
        </div>
        <div className="flex gap-3 pt-2">
          <Button className="flex-1" disabled={!allChecked} onClick={onConfirm}>
            Mark Ready
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
        {!allChecked && <p className="text-xs text-center text-muted-foreground">Check all items to proceed</p>}
      </div>
    </div>
  )
}

export function KitchenDisplay() {
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing' | 'ready'>('all')
  const [stationFilter, setStationFilter] = useState<string>('all')
  const [kitchenStats, setKitchenStats] = useState<KitchenStats | null>(null)
  const [checkOrder, setCheckOrder] = useState<KitchenOrder | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await invoke<{ success: boolean; data: KitchenOrder[] }>('get_orders', { status: null, limit: 50 })
      if (!res.success) return
      const active = res.data.filter(o => ['pending', 'preparing', 'ready'].includes(o.status))
      const withItems = await Promise.all(
        active.map(async o => {
          const d = await invoke<{ success: boolean; data?: { items: OrderItem[] } }>('get_order_details', { orderId: o.id }).catch(() => null)
          return { ...o, items: d?.success ? d.data?.items ?? [] : [] }
        })
      )
      setOrders(withItems)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  const loadStats = useCallback(async () => {
    const res = await invoke<{ success: boolean; data: KitchenStats }>('get_kitchen_stats').catch(() => null)
    if (res?.success) setKitchenStats(res.data)
  }, [])

  useEffect(() => {
    load(); loadStats()
    const id = setInterval(() => { load(); loadStats() }, 15000)
    return () => clearInterval(id)
  }, [load, loadStats])

  const advance = async (order: KitchenOrder) => {
    const next = STATUS_NEXT[order.status]
    if (!next) return
    if (order.status === 'preparing') {
      setCheckOrder(order)
      return
    }
    await invoke('update_order_status', { orderId: order.id, status: next }).catch(console.error)
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o))
  }

  const confirmReady = async () => {
    if (!checkOrder) return
    await invoke('update_order_status', { orderId: checkOrder.id, status: 'ready' }).catch(console.error)
    setOrders(prev => prev.map(o => o.id === checkOrder.id ? { ...o, status: 'ready' } : o))
    setCheckOrder(null)
  }

  const filtered = orders
    .filter(o => filter === 'all' || o.status === filter)
    .filter(o => stationFilter === 'all' || (o.items ?? []).some(i => (i.kitchen_station ?? '') === stationFilter || (!i.kitchen_station && stationFilter === 'none')))
    .map(o => ({
      ...o,
      items: stationFilter === 'all' ? o.items : (o.items ?? []).filter(i => (i.kitchen_station ?? '') === stationFilter || (!i.kitchen_station && stationFilter === 'none')),
    }))
  const counts = { pending: orders.filter(o => o.status === 'pending').length, preparing: orders.filter(o => o.status === 'preparing').length, ready: orders.filter(o => o.status === 'ready').length }

  return (
    <div className="space-y-4">
      {checkOrder && (
        <QualityCheckModal
          order={checkOrder}
          onConfirm={confirmReady}
          onCancel={() => setCheckOrder(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Kitchen Display</h2>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      {kitchenStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Orders Today', value: String(kitchenStats.total_today) },
            { label: 'Avg Prep Time', value: kitchenStats.avg_prep_min > 0 ? `${kitchenStats.avg_prep_min.toFixed(1)}m` : '—' },
            { label: 'Pending', value: String(kitchenStats.pending_count) },
            { label: 'In Progress', value: String(kitchenStats.preparing_count) },
          ].map(s => (
            <div key={s.label} className="bg-card border rounded-xl px-4 py-3 text-center">
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'preparing', 'ready'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filter === s ? 'bg-primary text-primary-foreground border-transparent' : 'border-border hover:bg-muted'}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== 'all' && counts[s] > 0 && <span className="ml-1.5 text-xs bg-white/30 rounded-full px-1.5">{counts[s]}</span>}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'All Stations' },
          { key: 'hot', label: 'Hot Kitchen' },
          { key: 'cold', label: 'Cold / Salads' },
          { key: 'grill', label: 'Grill / Tandoor' },
          { key: 'fry', label: 'Fry Station' },
          { key: 'dessert', label: 'Dessert' },
          { key: 'bar', label: 'Bar' },
        ].map(s => (
          <button key={s.key} onClick={() => setStationFilter(s.key)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${stationFilter === s.key ? 'bg-orange-500 text-white border-transparent' : 'border-border hover:bg-muted'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <ChefHat className="w-12 h-12 mb-3 opacity-30" />
          <p>No {filter === 'all' ? 'active' : filter} orders</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(order => {
          const u = urgency(order.status, order.created_at)
          const urgencyBorder = u === 'critical' ? 'ring-2 ring-red-500 animate-pulse' : u === 'warning' ? 'ring-2 ring-orange-400' : ''
          return (
          <div key={order.id} className={`rounded-2xl border-2 p-4 space-y-3 ${STATUS_COLOR[order.status] ?? ''} ${urgencyBorder}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg">{order.order_number}</span>
              <div className="flex items-center gap-1.5">
                {u === 'critical' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                {u === 'warning' && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                <Badge className={`text-xs ${BADGE_COLOR[order.status] ?? ''}`}>{order.status}</Badge>
              </div>
            </div>
            <div className={`flex items-center gap-2 text-sm flex-wrap ${u === 'critical' ? 'text-red-700 font-semibold' : u === 'warning' ? 'text-orange-700' : 'opacity-70'}`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{elapsed(order.created_at)}</span>
              {order.table_number && <span>· T{order.table_number}</span>}
              {order.order_type && order.order_type !== 'dine_in' && (
                <span className={`text-xs rounded px-1.5 py-0.5 font-medium ${order.order_type === 'delivery' ? 'bg-purple-200 text-purple-800' : 'bg-blue-200 text-blue-800'}`}>
                  {order.order_type === 'delivery' ? '🛵 Delivery' : '📦 Takeaway'}
                </span>
              )}
            </div>
            {order.notes && <p className="text-xs bg-white/50 rounded p-1.5 italic">{order.notes}</p>}
            <div className="space-y-1">
              {(order.items ?? []).map((item, i) => (
                <div key={i} className="text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{item.quantity}× {item.item_name}</span>
                    {item.kitchen_station && stationFilter === 'all' && (
                      <span className="text-xs bg-orange-100 text-orange-700 rounded px-1.5 ml-1">{item.kitchen_station}</span>
                    )}
                  </div>
                  {item.notes && <span className="text-xs opacity-60">{item.notes}</span>}
                </div>
              ))}
            </div>
            {STATUS_NEXT[order.status] && (
              <Button className="w-full" size="sm" onClick={() => advance(order)}>
                {STATUS_LABEL[order.status]} Cooking
              </Button>
            )}
          </div>
        )})}
      </div>
    </div>
  )
}
