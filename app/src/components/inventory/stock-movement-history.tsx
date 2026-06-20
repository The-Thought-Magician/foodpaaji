'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, RefreshCw } from 'lucide-react'
import StockMovementFilters, { type MovementFilters } from './stock-movement-filters'
import StockMovementTable, { type StockMovement } from './stock-movement-table'

interface SimpleItem { id: number; name: string; sku?: string }

const RESTAURANT_ID = 1
const DEFAULT_FILTERS: MovementFilters = { page: 1, limit: 50 }

export default function StockMovementHistory() {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [inventoryItems, setInventoryItems] = useState<SimpleItem[]>([])
  const [filters, setFilters] = useState<MovementFilters>(DEFAULT_FILTERS)
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const loadMovements = useCallback(async (f: MovementFilters = filters) => {
    setLoading(true)
    try {
      const res = await invoke<{ success: boolean; data?: { movements: StockMovement[]; total: number } }>(
        'get_stock_movements', { request: { restaurant_id: RESTAURANT_ID, ...f } }
      )
      if (res.success && res.data) { setMovements(res.data.movements); setTotalRecords(res.data.total) }
      else { setMovements([]); setTotalRecords(0) }
    } catch (e) { console.error(e); setMovements([]); setTotalRecords(0) }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => {
    invoke<{ success: boolean; data?: SimpleItem[] }>('get_inventory_items', { restaurantId: RESTAURANT_ID })
      .then(r => { if (r.success && r.data) setInventoryItems(r.data) })
      .catch(console.error)
  }, [])

  useEffect(() => { loadMovements(filters) }, [filters])

  const setFilter = (key: keyof MovementFilters, value: string | number | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value, page: key !== 'page' ? 1 : (value as number) }))
  }

  const clearFilters = () => { setFilters(DEFAULT_FILTERS); setSearchTerm('') }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Stock Movement History</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          <Button onClick={() => loadMovements()} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
        </div>
      </div>

      <StockMovementFilters
        filters={filters} items={inventoryItems} searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm} onChange={setFilter} onClear={clearFilters}
      />

      <Card>
        <CardHeader><CardTitle>Movement Records ({totalRecords} total)</CardTitle></CardHeader>
        <CardContent>
          <StockMovementTable
            movements={movements} totalRecords={totalRecords} filters={filters}
            loading={loading} onPageChange={p => setFilter('page', p)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
