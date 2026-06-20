'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Package, Plus, Search, X, Trash2, BarChart3, ArrowLeftRight, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import InventoryCard, { type InventoryItem } from '@/components/inventory/inventory-card'
import WasteTracking from '@/components/inventory/waste-tracking'
import InventoryAnalytics from '@/components/inventory/inventory-analytics'
import InventoryTransfers from '@/components/inventory/inventory-transfers'
import InventoryReports from '@/components/inventory/inventory-reports'
import { DeleteInventoryDialog, RestockDialog, EditInventoryDialog } from '@/components/inventory/inventory-dialogs'

const RESTAURANT_ID = 1
const ITEMS_PER_PAGE = 12
type Tab = 'items' | 'waste' | 'analytics' | 'transfers' | 'reports'

export function InventoryManagement() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all')
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<Tab>('items')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null)
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null)
  const [restockQty, setRestockQty] = useState('')

  const loadItems = useCallback(() => {
    invoke<{ success: boolean; data?: InventoryItem[] }>('get_inventory_items', { restaurantId: RESTAURANT_ID })
      .then(res => { if (res.success && res.data) setItems(res.data) })
      .catch(e => console.error('Failed to load inventory:', e))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  const getStatus = (item: InventoryItem) => {
    if (item.current_stock <= 0) return 'out_of_stock'
    if (item.current_stock <= item.minimum_stock * 1.5) return 'low_stock'
    return 'in_stock'
  }

  const filtered = useMemo(() => {
    let result = items
    if (search) result = result.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku ?? '').toLowerCase().includes(search.toLowerCase()))
    if (filterStatus !== 'all') result = result.filter(i => getStatus(i) === filterStatus)
    return result.sort((a, b) => a.name.localeCompare(b.name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, search, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, page])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 gradient-spice rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Package className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Inventory Management</h2>
          <p className="text-muted-foreground">Manage your restaurant inventory and stock levels</p>
        </div>
        <Button className="gradient-spice text-white shadow-lg" onClick={() => { setEditItem(null); setShowForm(true) }}>
          <Plus className="w-4 h-4 mr-2" />Add Item
        </Button>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        <button onClick={() => setTab('items')}
          className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
            tab === 'items' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
          <Package className="w-4 h-4" /> Items
        </button>
        <button onClick={() => setTab('waste')}
          className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
            tab === 'waste' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
          <Trash2 className="w-4 h-4" /> Waste Tracking
        </button>
        <button onClick={() => setTab('analytics')}
          className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
            tab === 'analytics' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
          <BarChart3 className="w-4 h-4" /> Analytics
        </button>
        <button onClick={() => setTab('transfers')}
          className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
            tab === 'transfers' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
          <ArrowLeftRight className="w-4 h-4" /> Transfers
        </button>
        <button onClick={() => setTab('reports')}
          className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
            tab === 'reports' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
          <FileText className="w-4 h-4" /> Reports
        </button>
      </div>

      {tab === 'waste' && <WasteTracking />}
      {tab === 'analytics' && <InventoryAnalytics />}
      {tab === 'transfers' && <InventoryTransfers />}
      {tab === 'reports' && <InventoryReports />}

      {tab === 'items' && (
        <>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input type="text" placeholder="Search items by name or SKU..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
              className="px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer text-sm">
              <option value="all">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-border">
              <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No items found</h3>
              <p className="text-muted-foreground">{search || filterStatus !== 'all' ? 'Try adjusting your filters' : 'Add your first inventory item to get started'}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginated.map(item => (
                  <InventoryCard key={item.id} item={item}
                    onEdit={() => { setEditItem(item); setShowForm(true) }}
                    onDelete={() => setDeleteItem(item)}
                    onRestock={() => { setRestockItem(item); setRestockQty('') }} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} items
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className={cn('w-9 h-9 rounded-lg text-sm font-medium transition-all', page === p ? 'gradient-spice text-white shadow-md' : 'hover:bg-muted')}>
                          {p}
                        </button>
                      )
                    })}
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      <DeleteInventoryDialog item={deleteItem} onClose={() => setDeleteItem(null)} onDeleted={loadItems} />
      <RestockDialog item={restockItem} qty={restockQty} onQtyChange={setRestockQty}
        onClose={() => { setRestockItem(null); setRestockQty('') }} onRestocked={loadItems} />
      <EditInventoryDialog open={showForm} item={editItem}
        onClose={() => { setShowForm(false); setEditItem(null) }} onSaved={loadItems} />
    </div>
  )
}
