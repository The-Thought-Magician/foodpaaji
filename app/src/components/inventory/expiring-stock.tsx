'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { AlertTriangle, CalendarClock } from 'lucide-react'

interface ExpiringItem {
  id: number
  inventory_item_id: number
  item_name: string
  quantity: number
  batch_number?: string
  expiry_date: string
}

const daysUntil = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)

export function ExpiringStock() {
  const [items, setItems] = useState<ExpiringItem[]>([])
  const [days, setDays] = useState(7)

  useEffect(() => {
    invoke<{ success: boolean; data: ExpiringItem[] }>('get_expiring_stock', { restaurantId: 1, daysAhead: days })
      .then(r => { if (r.success) setItems(r.data) }).catch(() => {})
  }, [days])

  if (items.length === 0) return (
    <div className="bg-card border rounded-xl p-6 text-center text-muted-foreground text-sm">
      <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-30" />
      No stock expiring in the next {days} days
    </div>
  )

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-orange-500" />
          <p className="font-semibold text-sm">Expiring Stock ({items.length})</p>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          className="text-xs border border-border rounded px-2 py-1 bg-background">
          {[3, 7, 14, 30].map(d => <option key={d} value={d}>Next {d} days</option>)}
        </select>
      </div>
      <div className="divide-y">
        {items.map(item => {
          const d = daysUntil(item.expiry_date)
          const urgent = d <= 2
          return (
            <div key={item.id} className={`flex items-center justify-between px-4 py-3 text-sm ${urgent ? 'bg-red-50' : ''}`}>
              <div>
                <p className="font-medium">{item.item_name}</p>
                <p className="text-xs text-muted-foreground">
                  Qty: {item.quantity}{item.batch_number ? ` · Batch ${item.batch_number}` : ''}
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                {urgent && <AlertTriangle className="w-3.5 h-3.5 text-red-500 inline mr-1" />}
                <span className={`text-xs font-semibold ${urgent ? 'text-red-600' : d <= 5 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                  {d === 0 ? 'Expires today' : d < 0 ? 'Expired' : `${d}d left`}
                </span>
                <p className="text-xs text-muted-foreground">{new Date(item.expiry_date).toLocaleDateString('en-IN')}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
