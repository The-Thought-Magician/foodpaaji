'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

interface Bill { total_amount: number; tax_amount: number; discount_amount: number; status: string; created_at: string }
interface PopularItem { item_name: string; order_count: number; total_revenue: number }
interface Alert { item_name: string; alert_level: string; current_stock: number; supplier_name?: string; supplier_phone?: string }
interface PayMethod { total: number; count: number }

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const today = () => new Date().toISOString().split('T')[0]

export function EodSummary() {
  const [bills, setBills] = useState<Bill[]>([])
  const [popular, setPopular] = useState<PopularItem[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [payMethods, setPayMethods] = useState<Record<string, PayMethod>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const t = today()
      const [br, pr, ar, pm] = await Promise.all([
        invoke<{ success: boolean; data: Bill[] }>('get_bills', { status: null, limit: 500 }).catch(() => ({ success: false, data: [] as Bill[] })),
        invoke<{ success: boolean; data?: PopularItem[] }>('get_popular_menu_items', { limit: 5 }).catch(() => ({ success: false, data: [] as PopularItem[] })),
        invoke<{ success: boolean; data?: { alerts: Alert[] } }>('get_low_stock_alerts', { request: { restaurant_id: 1, is_acknowledged: false, page: 1, limit: 50 } }).catch(() => ({ success: false, data: { alerts: [] } })),
        invoke<{ success: boolean; data: Record<string, PayMethod> }>('get_payment_method_summary', { fromDate: t, toDate: t }).catch(() => ({ success: false, data: {} })),
      ])
      if (br.success) setBills((br.data as Bill[]).filter(b => b.status === 'paid' && b.created_at.slice(0, 10) === t))
      if (pr.success && pr.data) setPopular(pr.data as PopularItem[])
      if (ar.success && ar.data) setAlerts((ar.data as { alerts: Alert[] }).alerts ?? [])
      if (pm.success) setPayMethods(pm.data)
      setLoading(false)
    }
    load()
  }, [])

  const revenue = bills.reduce((s, b) => s + b.total_amount, 0)
  const tax = bills.reduce((s, b) => s + b.tax_amount, 0)
  const discount = bills.reduce((s, b) => s + b.discount_amount, 0)
  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const payMethodList = (['cash', 'upi', 'card', 'wallet', 'credit'] as const).filter(m => payMethods[m])

  if (loading) return <div className="text-center py-16 text-muted-foreground">Loading EOD summary…</div>

  return (
    <div className="space-y-6 max-w-2xl mx-auto" id="eod-print">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">End of Day Summary</h2>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Print</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Bills', value: String(bills.length) },
          { label: 'Revenue', value: fmt(revenue) },
          { label: 'GST Collected', value: fmt(tax) },
          { label: 'Discounts Given', value: fmt(discount) },
        ].map(s => (
          <div key={s.label} className="bg-card border rounded-xl p-4 text-center">
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {payMethodList.length > 0 && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b"><p className="font-semibold text-sm">Payment Collection by Method</p></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border">
            {payMethodList.map(m => (
              <div key={m} className="bg-card px-4 py-3 text-center">
                <p className="text-lg font-bold">{fmt(payMethods[m].total)}</p>
                <p className="text-xs text-muted-foreground uppercase mt-0.5">{m}</p>
                <p className="text-xs text-muted-foreground">{payMethods[m].count} txn{payMethods[m].count !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {popular.length > 0 && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b"><p className="font-semibold text-sm">Top Selling Items (All Time)</p></div>
          <div className="divide-y">
            {popular.map((item, i) => (
              <div key={item.item_name} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                <span className="flex-1 truncate">{item.item_name}</span>
                <span className="text-muted-foreground shrink-0">{item.order_count} orders</span>
                <span className="font-semibold shrink-0">{fmt(item.total_revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b"><p className="font-semibold text-sm text-rose-600">Low Stock Alerts ({alerts.length})</p></div>
          <div className="divide-y">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{a.item_name}</p>
                  {a.supplier_name && <p className="text-xs text-blue-600">{a.supplier_name}{a.supplier_phone ? ` · ${a.supplier_phone}` : ''}</p>}
                </div>
                <div className="text-right shrink-0 ml-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.alert_level === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-700' : a.alert_level === 'CRITICAL' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>{a.alert_level.replace('_', ' ')}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Stock: {a.current_stock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {bills.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No paid bills today.</div>
      )}
    </div>
  )
}
