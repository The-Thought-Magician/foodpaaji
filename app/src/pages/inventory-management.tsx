import { useState, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import {
  Package,
  Plus,
  Search,
  MoreVertical,
  Truck,
  AlertCircle,
  Edit,
  Trash2,
  X,
  Filter,
  ArrowUpDown
} from 'lucide-react'
import type { ApiResponse } from '@/types/api'
import { cn } from '@/lib/utils'

interface InventoryItem {
  id: number
  name: string
  sku: string
  category: string
  currentStock: number
  unit: string
  minStock: number
  maxStock: number
  supplier: string
  unitPrice: number
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
}

interface InventoryDto {
  id: number
  item_name: string
  sku: string
  category_name: string
  current_quantity: number
  unit: string
  reorder_point: number
  max_stock_level: number
  supplier_name?: string
  unit_price?: number
}

const categoryConfig: Record<string, { color: string; icon: string }> = {
  vegetables: { color: 'bg-gradient-to-br from-green-500 to-green-600', icon: '' },
  dairy: { color: 'bg-gradient-to-br from-blue-500 to-blue-600', icon: '' },
  meat: { color: 'bg-gradient-to-br from-rose-500 to-rose-600', icon: '' },
  grains: { color: 'bg-gradient-to-br from-amber-500 to-amber-600', icon: '' },
  condiments: { color: 'bg-gradient-to-br from-orange-500 to-orange-600', icon: '' },
  beverages: { color: 'bg-gradient-to-br from-purple-500 to-purple-600', icon: '' },
}

const statusConfig = {
  in_stock: { label: 'In Stock', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  low_stock: { label: 'Low Stock', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  out_of_stock: { label: 'Out of Stock', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
}

const categories = ['All', 'Vegetables', 'Dairy', 'Meat', 'Grains', 'Condiments', 'Beverages']
const suppliers = ['All', 'Fresh Farms', 'Agro Supplies', 'Meat Masters', 'Dairy Fresh', 'City Wholesale']

export function InventoryManagement() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterSupplier, setFilterSupplier] = useState('All')
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddForm, setShowAddForm] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const itemsPerPage = 12

  const loadInventory = async () => {
    try {
      setLoading(true)
      const response = await invoke('get_inventory_items', {
        restaurant_id: 1,
      }) as ApiResponse<InventoryDto[]>

      if (response.success && Array.isArray(response.data)) {
        const mapped = response.data.map((item) => {
          const stockRatio = item.current_quantity / item.reorder_point
          let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock'
          if (item.current_quantity <= 0) status = 'out_of_stock'
          else if (stockRatio <= 1.5) status = 'low_stock'

          return {
            id: item.id,
            name: item.item_name,
            sku: item.sku,
            category: item.category_name.toLowerCase(),
            currentStock: item.current_quantity,
            unit: item.unit,
            minStock: item.reorder_point,
            maxStock: item.max_stock_level,
            supplier: item.supplier_name || 'Unknown',
            unitPrice: item.unit_price || 0,
            status,
          }
        }) as InventoryItem[]
        setItems(mapped)
      }
    } catch (error) {
      console.error('Failed to load inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  useMemo(() => {
    loadInventory()
  }, [])

  const filteredItems = useMemo(() => {
    let result = items

    if (searchTerm) {
      result = result.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterCategory !== 'All') {
      result = result.filter(item => item.category.toLowerCase() === filterCategory.toLowerCase())
    }

    if (filterSupplier !== 'All') {
      result = result.filter(item => item.supplier === filterSupplier)
    }

    if (filterStatus !== 'all') {
      result = result.filter(item => item.status === filterStatus)
    }

    result.sort((a, b) => {
      let aVal: string | number, bVal: string | number
      if (sortBy === 'name') { aVal = a.name; bVal = b.name }
      else if (sortBy === 'stock') { aVal = a.currentStock; bVal = b.currentStock }
      else { aVal = a.unitPrice; bVal = b.unitPrice }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal)
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })

    return result
  }, [items, searchTerm, filterCategory, filterSupplier, filterStatus, sortBy, sortOrder])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage))
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredItems.slice(start, start + itemsPerPage)
  }, [filteredItems, currentPage])

  const handleSort = (column: 'name' | 'stock' | 'price') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

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
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Inventory Management
          </h2>
          <p className="text-muted-foreground">
            Manage your restaurant inventory and stock levels
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
          <Button onClick={() => setShowAddForm(true)} className="gradient-spice text-white shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search items by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  filterCategory === cat
                    ? 'gradient-spice text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <select
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            className="px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer text-sm"
          >
            {suppliers.map((s) => (
              <option key={s} value={s}>{s === 'All' ? 'All Suppliers' : s}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer text-sm"
          >
            <option value="all">All Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No items found</h3>
          <p className="text-muted-foreground mb-6">
            {searchTerm || filterCategory !== 'All' || filterSupplier !== 'All' || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first inventory item to get started'}
          </p>
          {!searchTerm && filterCategory === 'All' && filterSupplier === 'All' && filterStatus === 'all' && (
            <Button onClick={() => setShowAddForm(true)} className="gradient-spice text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add First Item
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedItems.map((item, index) => (
              <InventoryCard
                key={item.id}
                item={item}
                delay={index * 50}
                onEdit={() => console.log('Edit', item.id)}
                onDelete={() => console.log('Delete', item.id)}
                onRestock={() => console.log('Restock', item.id)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          'w-9 h-9 rounded-lg text-sm font-medium transition-all',
                          currentPage === pageNum
                            ? 'gradient-spice text-white shadow-md'
                            : 'hover:bg-muted'
                        )}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add New Item</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-muted-foreground text-center py-8">Item form will be implemented here</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface InventoryCardProps {
  item: InventoryItem
  delay?: number
  onEdit: () => void
  onDelete: () => void
  onRestock: () => void
}

function InventoryCard({ item, delay = 0, onEdit, onDelete, onRestock }: InventoryCardProps) {
  const categoryInfo = categoryConfig[item.category] || { color: 'bg-muted', icon: '' }
  const statusInfo = statusConfig[item.status]
  const stockPercentage = (item.currentStock / item.maxStock) * 100
  const isLow = item.status === 'low_stock' || item.status === 'out_of_stock'

  return (
    <div
      className="card-hover bg-card rounded-2xl p-5 border border-border animate-fade-in"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${categoryInfo.color} rounded-xl flex items-center justify-center text-white font-bold shadow-md`}>
            {item.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{item.name}</h4>
            <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
          </div>
        </div>
        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground capitalize">{item.category.replace('_', ' ')}</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Truck className="w-3.5 h-3.5" />
          <span className="truncate">{item.supplier}</span>
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Stock Level</span>
            <span className={cn('font-medium', isLow ? 'text-rose-600' : 'text-foreground')}>
              {item.currentStock} / {item.maxStock} {item.unit}
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isLow ? 'bg-rose-500' : stockPercentage < 50 ? 'bg-amber-500' : 'bg-accent'
              )}
              style={{ width: `${Math.max(5, Math.min(100, stockPercentage))}%` }}
            />
          </div>
        </div>

        {isLow && item.currentStock > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Low stock - reorder soon</span>
          </div>
        )}

        {item.currentStock <= 0 && (
          <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-500/10 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Out of stock</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <span className="font-semibold text-foreground">₹{item.unitPrice.toFixed(2)}/{item.unit}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRestock}
            className={cn(
              'text-xs',
              isLow && 'border-rose-500/30 text-rose-600 hover:bg-rose-500/10'
            )}
          >
            Update Stock
          </Button>
          <button
            onClick={onEdit}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-rose-500/10 rounded-lg transition-colors group"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground group-hover:text-rose-600" />
          </button>
        </div>
      </div>
    </div>
  )
}
