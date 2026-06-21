'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { CheckCircle } from 'lucide-react'

interface TableRow { id: number; table_number: string; capacity: number; location?: string; needs_cleaning?: boolean }
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

  const markClean = async (tableNumber: string) => {
    await invoke('mark_table_clean', { tableNumber }).catch(console.error)
    load()
  }

  const activeStatuses = new Set(['pending', 'preparing', 'ready'])
  const activeByTable = orders.reduce<Record<string, Order[]>>((acc, o) => {
    if (o.table_number && activeStatuses.has(o.status)) {
      acc[o.table_number] = [...(acc[o.table_number] ?? []), o]
    }
    return acc
  }, {})

  const occupied = tables.filter(t => activeByTable[t.table_number])
  const needsCleaning = tables.filter(t => !activeByTable[t.table_number] && t.needs_cleaning)
  const free = tables.filter(t => !activeByTable[t.table_number] && !t.needs_cleaning)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />Free ({free.length})</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />Occupied ({occupied.length})</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" />Needs Cleaning ({needsCleaning.length})</span>
      </div>

      {tables.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No tables configured. Add tables in Reservations.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tables.map(table => {
          const tableOrders = activeByTable[table.table_number] ?? []
          const isOccupied = tableOrders.length > 0
          const cleaning = !isOccupied && table.needs_cleaning
          const earliest = tableOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]

          const borderCls = isOccupied
            ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/20'
            : cleaning
              ? 'border-orange-400 bg-orange-50/60 dark:bg-orange-950/20'
              : 'border-green-300 bg-green-50/40 dark:bg-green-950/20'

          return (
            <div key={table.id} className={`rounded-xl border-2 p-4 transition-colors ${borderCls}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-lg">{table.table_number}</p>
                  <p className="text-xs text-muted-foreground">Cap {table.capacity}{table.location ? ` · ${table.location}` : ''}</p>
                </div>
                <span className={`w-3 h-3 rounded-full mt-1 ${isOccupied ? 'bg-amber-500' : cleaning ? 'bg-orange-400' : 'bg-green-500'}`} />
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
              ) : cleaning ? (
                <div className="mt-2">
                  <p className="text-xs text-orange-600 font-medium">Needs cleaning</p>
                  <button
                    onClick={() => markClean(table.table_number)}
                    className="mt-1.5 flex items-center gap-1 text-xs text-green-700 hover:text-green-800 font-medium"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Mark Clean
                  </button>
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
