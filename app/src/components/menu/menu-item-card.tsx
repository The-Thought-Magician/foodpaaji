'use client'

import { Button } from '@/components/ui/button'
import { Edit, Trash2, Image as ImageIcon, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MenuItemData {
  id: number
  name: string
  description: string | null
  category_id: number
  price: number
  image_path: string | null
  is_available: boolean
  is_vegetarian: boolean
  is_spicy: boolean
  spice_level: number
  preparation_time: number | null
}

interface Props {
  item: MenuItemData
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}

export function MenuItemCard({ item, onEdit, onDelete, onToggle }: Props) {
  return (
    <div className="card-hover bg-card rounded-2xl overflow-hidden border border-border">
      <div className="relative h-36 bg-muted">
        {item.image_path ? (
          <img src={item.image_path} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          {item.is_vegetarian && (
            <span className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
          )}
          {item.is_spicy && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white bg-orange-500">
              Spicy
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3">
          <button
            onClick={onToggle}
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              item.is_available ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'
            )}
          >
            {item.is_available ? 'Available' : 'Sold Out'}
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold truncate pr-2">{item.name}</h3>
          <p className="font-bold text-lg gradient-spice bg-clip-text text-transparent">₹{item.price}</p>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{item.description}</p>
        {item.preparation_time && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
            <Clock className="w-3.5 h-3.5" />
            <span>{item.preparation_time} min</span>
          </div>
        )}
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Edit className="w-3.5 h-3.5 mr-1" />Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
