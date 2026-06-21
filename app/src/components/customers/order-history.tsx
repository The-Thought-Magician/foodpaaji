'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Order {
  id: number; order_type: string; status: string
  total_amount: number; items_summary: string | null; created_at: string
}

interface OrderHistory {
  orders: Order[]; total_orders: number
  lifetime_spend: number; avg_order_value: number
}

const STATUS_COLOR: Record<string, string> = {
  completed: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700', preparing: 'bg-blue-100 text-blue-700',
}

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n)

export function CustomerOrderHistory({ customerId, customerName, open, onClose }: {
  customerId: number; customerName: string; open: boolean; onClose: () => void
}) {
  const [data, setData] = useState<OrderHistory | null>(null)

  useEffect(() => {
    if (!open) return
    invoke<{ success: boolean; data: OrderHistory }>('get_customer_order_history', { customerId })
      .then(r => { if (r.success) setData(r.data) })
      .catch(() => {})
  }, [open, customerId])

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[75vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Orders: {customerName}</DialogTitle></DialogHeader>

        {data && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="border rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="text-lg font-bold">{data.total_orders}</p>
              </div>
              <div className="border rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Lifetime Spend</p>
                <p className="text-lg font-bold text-green-600">{fmt(data.lifetime_spend)}</p>
              </div>
              <div className="border rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Avg Order</p>
                <p className="text-lg font-bold">{fmt(data.avg_order_value)}</p>
              </div>
            </div>

            {data.orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No orders found</p>}

            <div className="space-y-2">
              {data.orders.map(o => (
                <div key={o.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">#{o.id}</span>
                      <Badge className={`text-xs capitalize ${STATUS_COLOR[o.status] ?? 'bg-gray-100 text-gray-700'}`}>{o.status}</Badge>
                      <Badge variant="outline" className="text-xs">{o.order_type}</Badge>
                    </div>
                    <span className="font-semibold text-sm">{fmt(o.total_amount)}</span>
                  </div>
                  {o.items_summary && <p className="text-xs text-muted-foreground">{o.items_summary}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(o.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
