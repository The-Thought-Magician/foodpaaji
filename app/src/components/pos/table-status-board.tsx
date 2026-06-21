'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface TableRow { id: number; table_number: string; capacity: number; location?: string }
interface Order { id: number; table_number?: string; status: string; order_number: string; created_at: string }

const elapsed = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  return m < 1 ? 'just now' : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60}m`
}

export function TableStatusBoard() {
  const [tables, setTables] = useState<TableRow[]>([])
  const [orders, setOrders] = useState<Order[]>([])

  const load = () => {
    invoke<{ success: boolean; data: TableRow[] }>('get_tables', { restaurantId: 1 })
      .then(r => { if (r.success) setTables(r.data) }).catch(() => {})
    invoke<{ success: boolean; data: Order[] }>('get_orders', { status: null, limit: 100 })
      .then(r => { if (r.success) setOrders(r.data) }).catch(() => {})
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [])

  const activeStatuses = new Set(['pending', 'preparing', 'ready'])

  const activeByTable = orders.reduce<Record<string, Order[]>>((acc, o) => {
    if (o.table_number && activeStatuses.has(o.status)) {
      acc[o.table_number] = [...(acc[o.table_number] ?? []), o]
    }
    return acc
  }, {})

  const occupied = tables.filter(t => activeByTable[t.table_number])
  const free = tables.filter(t => !activeByTable[t.table_number])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />Free ({free.length})</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />Occupied ({occupied.length})</span>
      </div>

      {tables.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No tables configured. Add tables in Reservations.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tables.map(table => {
          const tableOrders = activeByTable[table.table_number] ?? []
          const isOccupied = tableOrders.length > 0
          const earliest = tableOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]
          return (
            <div key={table.id} className={`rounded-xl border-2 p-4 transition-colors ${isOccupied ? 'border-amber-400 bg-amber-50/60' : 'border-green-300 bg-green-50/40'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-lg">{table.table_number}</p>
                  <p className="text-xs text-muted-foreground">Cap {table.capacity}{table.location ? ` · ${table.location}` : ''}</p>
                </div>
                <span className={`w-3 h-3 rounded-full mt-1 ${isOccupied ? 'bg-amber-500' : 'bg-green-500'}`} />
              </div>
              {isOccupied ? (
                <div className="mt-2 space-y-1">
                  {tableOrders.map(o => (
                    <div key={o.id} className="text-xs flex justify-between">
                      <span className="font-mono text-muted-foreground">{o.order_number}</span>
                      <span className={`px-1.5 py-0.5 rounded font-medium ${o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : o.status === 'preparing' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{o.status}</span>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground mt-1">Since {elapsed(earliest.created_at)}</p>
                </div>
              ) : (
                <p className="text-xs text-green-600 font-medium mt-2">Available</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
