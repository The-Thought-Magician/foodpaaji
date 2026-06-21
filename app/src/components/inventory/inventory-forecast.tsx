'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { TrendingDown, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ItemForecast {
  item_id: number
  item_name: string
  unit: string
  current_stock: number
  avg_daily_consumption: number
  days_remaining: number
  reorder_quantity: number
  reorder_point: number
  stockout_risk: 'critical' | 'high' | 'medium' | 'low'
  suggested_order_date: string
}

const RISK_CONFIG = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700 border-red-200', icon: <AlertTriangle className="w-3 h-3" /> },
  high:     { label: 'High',     className: 'bg-orange-100 text-orange-700 border-orange-200', icon: <AlertTriangle className="w-3 h-3" /> },
  medium:   { label: 'Medium',   className: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <Clock className="w-3 h-3" /> },
  low:      { label: 'Low',      className: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle className="w-3 h-3" /> },
}

const PERIODS = [7, 14, 30] as const

export function InventoryForecast() {
  const [forecasts, setForecasts] = useState<ItemForecast[]>([])
  const [days, setDays] = useState<7 | 14 | 30>(30)
  const [loading, setLoading] = useState(false)
  const [riskFilter, setRiskFilter] = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await invoke<{ success: boolean; data?: ItemForecast[] }>('get_inventory_forecast', { days }).catch(() => null)
    if (res?.success && res.data) setForecasts(res.data)
    setLoading(false)
  }, [days])

  useEffect(() => { load() }, [load])

  const filtered = riskFilter === 'all' ? forecasts : forecasts.filter(f => f.stockout_risk === riskFilter)
  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  forecasts.forEach(f => { counts[f.stockout_risk]++ })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4" />
          <h3 className="font-semibold">Inventory Forecast</h3>
          <span className="text-xs text-muted-foreground">based on consumption history</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {PERIODS.map(p => (
              <Button key={p} size="sm" variant={days === p ? 'default' : 'outline'}
                onClick={() => setDays(p)} className="h-7 px-2 text-xs">{p}d</Button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 w-7 p-0">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'critical', 'high', 'medium', 'low'] as const).map(r => (
          <button key={r} onClick={() => setRiskFilter(r)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${riskFilter === r ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
            {r === 'all' ? `All (${forecasts.length})` : `${r.charAt(0).toUpperCase() + r.slice(1)} (${counts[r]})`}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-muted-foreground text-center py-8">Calculating forecasts...</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          {forecasts.length === 0 ? 'No consumption data found. Record stock movements to enable forecasting.' : 'No items match this filter.'}
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2">Item</th>
                <th className="text-right px-3 py-2 hidden sm:table-cell">Stock</th>
                <th className="text-right px-3 py-2 hidden md:table-cell">Avg/Day</th>
                <th className="text-right px-3 py-2">Days Left</th>
                <th className="text-center px-3 py-2">Risk</th>
                <th className="text-right px-3 py-2 hidden lg:table-cell">Reorder Qty</th>
                <th className="text-right px-3 py-2 hidden md:table-cell">Order By</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(f => {
                const risk = RISK_CONFIG[f.stockout_risk]
                return (
                  <tr key={f.item_id} className={`hover:bg-muted/20 ${f.stockout_risk === 'critical' ? 'bg-red-50/40' : ''}`}>
                    <td className="px-3 py-2 font-medium">{f.item_name}</td>
                    <td className="px-3 py-2 text-right hidden sm:table-cell text-muted-foreground">
                      {f.current_stock} {f.unit}
                    </td>
                    <td className="px-3 py-2 text-right hidden md:table-cell text-muted-foreground">
                      {f.avg_daily_consumption} {f.unit}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {f.days_remaining >= 999 ? '∞' : f.days_remaining.toFixed(1)}d
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant="outline" className={`text-xs gap-1 ${risk.className}`}>
                        {risk.icon}{risk.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right hidden lg:table-cell">
                      {f.reorder_quantity} {f.unit}
                    </td>
                    <td className="px-3 py-2 text-right hidden md:table-cell text-muted-foreground text-xs">
                      {f.suggested_order_date}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Forecast uses {days}-day avg consumption. Reorder qty = 7-day supply. Reorder point = min stock + 3-day buffer.
      </p>
    </div>
  )
}
