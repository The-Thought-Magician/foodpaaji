'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import InventorySearchFilters from './inventory-search-filters'
import InventorySearchTable from './inventory-search-table'
import type { SearchInventoryItem, SearchCategory, SearchSupplier, SearchFilters } from './inventory-search-types'

const RESTAURANT_ID = 1
const DEFAULT_FILTERS: SearchFilters = { page: 1, limit: 20 }

export default function InventorySearch() {
  const [items, setItems] = useState<SearchInventoryItem[]>([])
  const [categories, setCategories] = useState<SearchCategory[]>([])
  const [suppliers, setSuppliers] = useState<SearchSupplier[]>([])
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory | null>(null)

  useEffect(() => {
    invoke<{ success: boolean; data?: SearchCategory[] }>('get_inventory_categories', { restaurantId: RESTAURANT_ID })
      .then(r => { if (r.success && r.data) setCategories(r.data) })
      .catch(console.error)
    invoke<{ success: boolean; data?: SearchSupplier[] }>('get_suppliers', { restaurantId: RESTAURANT_ID })
      .then(r => { if (r.success && r.data) setSuppliers(r.data) })
      .catch(console.error)
  }, [])

  const search = async (f: SearchFilters = filters) => {
    setLoading(true)
    try {
      const res = await invoke<{ success: boolean; data?: { items: SearchInventoryItem[]; total: number } }>(
        'search_inventory_items', { request: { restaurant_id: RESTAURANT_ID, ...f } }
      )
      if (res.success && res.data) { setItems(res.data.items); setTotalRecords(res.data.total) }
      else { setItems([]); setTotalRecords(0) }
    } catch (e) { console.error(e); setItems([]); setTotalRecords(0) }
    finally { setLoading(false) }
  }

  useEffect(() => { search() }, [filters])

  const setFilter = (key: keyof SearchFilters, value: string | number | boolean | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value, page: key !== 'page' ? 1 : (value as number) }))
  }

  const clearFilters = () => { setFilters(DEFAULT_FILTERS); setSelectedCategory(null) }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inventory Search & Browse</h1>
        <Button size="sm"><Plus className="h-4 w-4 mr-2" />Add New Item</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <InventorySearchFilters
            filters={filters} categories={categories} suppliers={suppliers}
            selectedCategory={selectedCategory} itemCount={items.length}
            onChange={setFilter} onClear={clearFilters} onSearch={() => search()}
            onCategorySelect={setSelectedCategory}
          />
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>
                Search Results ({totalRecords} items found)
                {filters.search && <span className="text-base font-normal text-muted-foreground ml-2">for &quot;{filters.search}&quot;</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InventorySearchTable
                items={items} totalRecords={totalRecords} filters={filters}
                loading={loading} categories={categories} suppliers={suppliers}
                onPageChange={p => setFilter('page', p)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
