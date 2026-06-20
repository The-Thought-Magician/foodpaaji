'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'

interface Category {
  id: number
  name: string
  is_active: boolean
}

interface MenuItem {
  id: number
  name: string
  price: number
  is_available: boolean
  is_vegetarian: boolean
  short_description?: string
}

interface MenuPickerProps {
  onAdd: (item: { menu_item_id: number; item_name: string; unit_price: number }) => void
}

export function MenuPicker({ onAdd }: MenuPickerProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [activeCat, setActiveCat] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    invoke<{ success: boolean; data: Category[] }>('get_menu_categories', { restaurantId: 1 })
      .then(r => {
        if (r.success && r.data.length > 0) {
          const active = r.data.filter(c => c.is_active)
          setCategories(active)
          if (active.length > 0) setActiveCat(active[0].id)
        }
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!activeCat) return
    invoke<{ success: boolean; data: MenuItem[] }>('get_menu_items_by_category', { restaurantId: 1, categoryId: activeCat })
      .then(r => { if (r.success) setItems(r.data.filter(i => i.is_available)) })
      .catch(console.error)
  }, [activeCat])

  const filtered = items.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="relative">
        <Search className="absolute left-2.5 top-2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search menu..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => { setActiveCat(c.id); setSearch('') }}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${activeCat === c.id ? 'gradient-spice text-white border-transparent' : 'bg-muted text-foreground border-border hover:bg-muted/80'}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 content-start">
        {filtered.map(item => (
          <button
            key={item.id}
            onClick={() => onAdd({ menu_item_id: item.id, item_name: item.name, unit_price: item.price })}
            className="text-left p-3 rounded-xl border border-border bg-card hover:bg-muted/60 transition-colors"
          >
            <div className="flex items-start justify-between gap-1">
              <p className="text-sm font-medium leading-tight line-clamp-2">{item.name}</p>
              {item.is_vegetarian && <span className="text-green-600 text-xs shrink-0">🌿</span>}
            </div>
            {item.short_description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.short_description}</p>}
            <Badge className="mt-1.5 bg-primary/10 text-primary border-0 text-xs">₹{item.price.toFixed(0)}</Badge>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-2 text-center text-muted-foreground text-sm py-6">No items found</p>
        )}
      </div>
    </div>
  )
}
