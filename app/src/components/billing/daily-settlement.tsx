'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { IndianRupee, TrendingUp, Banknote, CreditCard, Smartphone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PaymentBreakdown {
  method: string
  transaction_count: number
  total_amount: number
}

interface Settlement {
  date: string
  total_bills: number
  paid_bills: number
  cancelled_bills: number
  gross_sales: number
  total_discount: number
  total_tax: number
  net_revenue: number
  cash_total: number
  upi_total: number
  card_total: number
  other_total: number
  payment_breakdown: PaymentBreakdown[]
  avg_bill_value: number
  peak_hour: number
  expected_closing_cash: number
}

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatHour(h: number) {
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:00 ${ampm}`
}

const METHOD_ICON: Record<string, React.ReactNode> = {
  cash: <Banknote className="w-4 h-4" />,
  upi: <Smartphone className="w-4 h-4" />,
  card: <CreditCard className="w-4 h-4" />,
}

export function DailySettlement({ onClose }: { onClose: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [data, setData] = useState<Settlement | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await invoke<{ success: boolean; data?: Settlement }>('get_daily_settlement', { date }).catch(() => null)
    if (res?.success && res.data) setData(res.data)
    setLoading(false)
  }, [date])

  useEffect(() => { load() }, [load])

  return (
    <div className="border rounded-xl p-4 space-y-4 bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          <h3 className="font-semibold">Daily Settlement</h3>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-8 w-36 text-sm" />
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>}

      {!loading && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Net Revenue</p>
              <p className="text-xl font-bold text-green-600">{fmt(data.net_revenue)}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Bills Paid</p>
              <p className="text-xl font-bold">{data.paid_bills} <span className="text-sm font-normal text-muted-foreground">/ {data.total_bills}</span></p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Avg Bill</p>
              <p className="text-xl font-bold">{fmt(data.avg_bill_value)}</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Peak Hour</p>
              <p className="text-xl font-bold">{formatHour(data.peak_hour)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium">Payment Methods</p>
              {data.payment_breakdown.length === 0 && (
                <p className="text-xs text-muted-foreground">No completed payments</p>
              )}
              {data.payment_breakdown.map(p => (
                <div key={p.method} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 capitalize">
                    {METHOD_ICON[p.method] ?? <IndianRupee className="w-4 h-4" />}
                    {p.method}
                    <span className="text-xs text-muted-foreground">×{p.transaction_count}</span>
                  </div>
                  <span className="font-medium">{fmt(p.total_amount)}</span>
                </div>
              ))}
            </div>

            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium">Breakdown</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Gross Sales</span><span>{fmt(data.gross_sales)}</span></div>
                <div className="flex justify-between text-red-600"><span>Discounts</span><span>-{fmt(data.total_discount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax (GST)</span><span>{fmt(data.total_tax)}</span></div>
                <div className="flex justify-between font-semibold border-t pt-1"><span>Net Revenue</span><span className="text-green-600">{fmt(data.net_revenue)}</span></div>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expected Cash in Drawer</span>
                  <span className="font-semibold">{fmt(data.expected_closing_cash)}</span>
                </div>
                {data.cancelled_bills > 0 && (
                  <p className="text-xs text-red-500 mt-1">{data.cancelled_bills} cancelled bill{data.cancelled_bills > 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
