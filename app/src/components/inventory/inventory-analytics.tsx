'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Card, CardContent } from '@/components/ui/card'
import { BarChart3, TrendingUp, TrendingDown, Package, AlertTriangle } from 'lucide-react'

const RESTAURANT_ID = 1

interface Analytics {
  total_items: number
  total_inventory_value: number
  low_stock_items: number
  out_of_stock_items: number
  overstocked_items: number
  total_categories: number
  average_stock_level: number
}

interface TopItem {
  item_name: string
  total_quantity_out: number
  total_value_out: number
  movement_frequency: number
}

interface SlowItem {
  item_name: string
  current_stock: number
  days_since_last_movement: number | null
  total_value: number
}

export default function InventoryAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [topItems, setTopItems] = useState<TopItem[]>([])
  const [slowItems, setSlowItems] = useState<SlowItem[]>([])

  useEffect(() => {
    invoke<{ success: boolean; data: Analytics }>('get_inventory_analytics', { restaurantId: RESTAURANT_ID })
      .then(r => { if (r.success) setAnalytics(r.data) }).catch(console.error)

    invoke<{ success: boolean; data: TopItem[] }>('get_top_moving_items_report', {
      request: { restaurant_id: RESTAURANT_ID, start_date: null, end_date: null, category_id: null, supplier_id: null },
      limit: 10,
    }).then(r => { if (r.success) setTopItems(r.data) }).catch(console.error)

    invoke<{ success: boolean; data: SlowItem[] }>('get_slow_moving_items_report', {
      restaurantId: RESTAURANT_ID,
      daysThreshold: 30,
    }).then(r => { if (r.success) setSlowItems(r.data) }).catch(console.error)
  }, [])

  const stats = analytics ? [
    { label: 'Total Items', value: analytics.total_items, icon: Package, color: 'text-blue-600' },
    { label: 'Inventory Value', value: `₹${analytics.total_inventory_value.toFixed(0)}`, icon: BarChart3, color: 'text-green-600' },
    { label: 'Low Stock', value: analytics.low_stock_items, icon: AlertTriangle, color: 'text-amber-600' },
    { label: 'Out of Stock', value: analytics.out_of_stock_items, icon: AlertTriangle, color: 'text-red-600' },
  ] : []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color}`} />
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <h3 className="font-semibold">Top Moving Items</h3>
            </div>
            <div className="space-y-2">
              {topItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No movement data</p>}
              {topItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1 mr-2">{item.item_name}</span>
                  <div className="text-right shrink-0">
                    <span className="font-medium">{item.total_quantity_out.toFixed(1)} units</span>
                    <span className="text-muted-foreground ml-2">₹{item.total_value_out.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold">Slow Moving Items <span className="text-xs text-muted-foreground font-normal">(30+ days)</span></h3>
            </div>
            <div className="space-y-2">
              {slowItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No slow-moving items</p>}
              {slowItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1 mr-2">{item.item_name}</span>
                  <div className="text-right shrink-0">
                    <span className="font-medium">{item.current_stock.toFixed(1)} in stock</span>
                    {item.days_since_last_movement != null && (
                      <span className="text-muted-foreground ml-2">{item.days_since_last_movement}d idle</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
