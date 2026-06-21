'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChefHat, Clock, RefreshCw } from 'lucide-react'

interface OrderItem { item_name: string; quantity: number; notes?: string }
interface KitchenOrder {
  id: number
  order_number: string
  table_number?: string
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

const elapsed = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  return m < 1 ? 'just now' : `${m}m ago`
}

export function KitchenDisplay() {
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing' | 'ready'>('all')

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

  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id) }, [load])

  const advance = async (order: KitchenOrder) => {
    const next = STATUS_NEXT[order.status]
    if (!next) return
    await invoke('update_order_status', { orderId: order.id, status: next }).catch(console.error)
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o))
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const counts = { pending: orders.filter(o => o.status === 'pending').length, preparing: orders.filter(o => o.status === 'preparing').length, ready: orders.filter(o => o.status === 'ready').length }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Kitchen Display</h2>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      <div className="flex gap-2">
        {(['all', 'pending', 'preparing', 'ready'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filter === s ? 'bg-primary text-primary-foreground border-transparent' : 'border-border hover:bg-muted'}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== 'all' && counts[s] > 0 && <span className="ml-1.5 text-xs bg-white/30 rounded-full px-1.5">{counts[s]}</span>}
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
        {filtered.map(order => (
          <div key={order.id} className={`rounded-2xl border-2 p-4 space-y-3 ${STATUS_COLOR[order.status] ?? ''}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg">{order.order_number}</span>
              <Badge className={`text-xs ${BADGE_COLOR[order.status] ?? ''}`}>{order.status}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm opacity-70">
              <Clock className="w-3.5 h-3.5" />
              <span>{elapsed(order.created_at)}</span>
              {order.table_number && <span>· Table {order.table_number}</span>}
            </div>
            {order.notes && <p className="text-xs bg-white/50 rounded p-1.5 italic">{order.notes}</p>}
            <div className="space-y-1">
              {(order.items ?? []).map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="font-medium">{item.quantity}× {item.item_name}</span>
                  {item.notes && <span className="text-xs opacity-60 truncate ml-2">{item.notes}</span>}
                </div>
              ))}
            </div>
            {STATUS_NEXT[order.status] && (
              <Button className="w-full" size="sm"
                onClick={() => advance(order)}>
                {STATUS_LABEL[order.status]} Cooking
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
