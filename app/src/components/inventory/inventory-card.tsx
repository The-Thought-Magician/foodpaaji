'use client'

import { Button } from '@/components/ui/button'
import { AlertCircle, Edit, Trash2, Truck, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface InventoryItem {
  id: number
  name: string
  sku?: string
  category_id?: number
  supplier_id?: number
  current_stock: number
  minimum_stock: number
  maximum_stock: number
  base_unit: string
  cost_price: number
  selling_price: number
  is_active: boolean
}

interface Props {
  item: InventoryItem
  onEdit: () => void
  onDelete: () => void
  onRestock: () => void
}

const CATEGORY_COLORS: Record<number, string> = {
  1: 'bg-gradient-to-br from-green-500 to-green-600',
  2: 'bg-gradient-to-br from-blue-500 to-blue-600',
  3: 'bg-gradient-to-br from-rose-500 to-rose-600',
  4: 'bg-gradient-to-br from-amber-500 to-amber-600',
}

function stockStatus(item: InventoryItem) {
  if (item.current_stock <= 0) return 'out_of_stock'
  if (item.current_stock <= item.minimum_stock * 1.5) return 'low_stock'
  return 'in_stock'
}

const STATUS_STYLES = {
  in_stock: { label: 'In Stock', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  low_stock: { label: 'Low Stock', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  out_of_stock: { label: 'Out of Stock', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
}

export default function InventoryCard({ item, onEdit, onDelete, onRestock }: Props) {
  const status = stockStatus(item)
  const statusInfo = STATUS_STYLES[status]
  const isLow = status !== 'in_stock'
  const stockPct = item.maximum_stock > 0 ? (item.current_stock / item.maximum_stock) * 100 : 0
  const catColor = CATEGORY_COLORS[item.category_id ?? 0] ?? 'bg-gradient-to-br from-muted to-muted-foreground'

  return (
    <div className="card-hover bg-card rounded-2xl p-5 border border-border animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${catColor} rounded-xl flex items-center justify-center text-white font-bold shadow-md`}>
            {item.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{item.name}</h4>
            {item.sku && <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>}
          </div>
        </div>
        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="w-3.5 h-3.5" />
            <span>Unit: {item.base_unit}</span>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Stock Level</span>
            <span className={cn('font-medium', isLow ? 'text-rose-600' : 'text-foreground')}>
              {item.current_stock} / {item.maximum_stock} {item.base_unit}
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', isLow ? 'bg-rose-500' : stockPct < 50 ? 'bg-amber-500' : 'bg-accent')}
              style={{ width: `${Math.max(5, Math.min(100, stockPct))}%` }} />
          </div>
        </div>

        {isLow && item.current_stock > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Low stock — reorder soon</span>
          </div>
        )}
        {item.current_stock <= 0 && (
          <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-500/10 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Out of stock</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <span className="font-semibold text-foreground">₹{item.selling_price.toFixed(2)}/{item.base_unit}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRestock}
            className={cn('text-xs', isLow && 'border-rose-500/30 text-rose-600 hover:bg-rose-500/10')}>
            Update Stock
          </Button>
          <button onClick={onEdit} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <Edit className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={onDelete} className="p-2 hover:bg-rose-500/10 rounded-lg transition-colors group">
            <Trash2 className="w-4 h-4 text-muted-foreground group-hover:text-rose-600" />
          </button>
        </div>
      </div>
    </div>
  )
}
