'use client'

import { Utensils, Edit, Trash2 } from 'lucide-react'

export interface CategoryData {
  id: number
  name: string
  description: string | null
  is_active: boolean
  sort_order: number
  item_count?: number
}

interface Props {
  category: CategoryData
  onEdit: () => void
  onDelete: () => void
}

export function CategoryCard({ category, onEdit, onDelete }: Props) {
  const itemCount = category.item_count ?? 0
  return (
    <div className="card-hover bg-card rounded-2xl p-5 border border-border">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl gradient-spice">
          <Utensils className="w-5 h-5 text-white" />
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <Edit className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={onDelete} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <h3 className="font-semibold text-lg mb-1">{category.name}</h3>
      <p className="text-sm text-muted-foreground mb-4">{itemCount} items</p>

      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full gradient-spice rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, (itemCount / 20) * 100)}%` }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
          category.is_active
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
        }`}>
          {category.is_active ? 'Active' : 'Inactive'}
        </span>
        <span className="text-xs text-muted-foreground">Order: {category.sort_order}</span>
      </div>
    </div>
  )
}
