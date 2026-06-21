'use client'

import { useState, useRef, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface BillItem {
  item_name: string
  quantity: number
  unit_price: number
  discount_amount: number
}

interface MenuSuggestion {
  id: number
  name: string
  price: number
}

interface Props {
  item: BillItem
  index: number
  onUpdate: (i: number, field: keyof BillItem, value: string | number) => void
  onRemove: (i: number) => void
}

const RESTAURANT_ID = 1

export function BillItemRow({ item, index, onUpdate, onRemove }: Props) {
  const [suggestions, setSuggestions] = useState<MenuSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const onNameChange = async (val: string) => {
    onUpdate(index, 'item_name', val)
    if (val.length > 1) {
      const res = await invoke<{ success: boolean; data?: MenuSuggestion[] }>(
        'get_menu_items_by_category', { categoryId: null, restaurantId: RESTAURANT_ID }
      ).catch(() => null)
      if (res?.success && res.data) {
        const filtered = res.data.filter(m => m.name.toLowerCase().includes(val.toLowerCase())).slice(0, 6)
        setSuggestions(filtered)
        setOpen(filtered.length > 0)
      }
    } else {
      setSuggestions([]); setOpen(false)
    }
  }

  const pick = (s: MenuSuggestion) => {
    onUpdate(index, 'item_name', s.name)
    onUpdate(index, 'unit_price', s.price)
    setSuggestions([]); setOpen(false)
  }

  return (
    <div ref={ref} className="relative grid grid-cols-12 gap-2 items-center">
      <div className="col-span-4 relative">
        <Input placeholder="Item name" value={item.item_name} onChange={e => onNameChange(e.target.value)} onFocus={() => suggestions.length > 0 && setOpen(true)} />
        {open && suggestions.length > 0 && (
          <div className="absolute z-20 top-full left-0 w-full bg-popover border border-border rounded-lg shadow-lg mt-0.5 max-h-48 overflow-y-auto">
            {suggestions.map(s => (
              <button key={s.id} onMouseDown={() => pick(s)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex justify-between">
                <span>{s.name}</span><span className="text-muted-foreground">₹{s.price}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <Input className="col-span-2" type="number" placeholder="Qty" value={item.quantity} onChange={e => onUpdate(index, 'quantity', parseInt(e.target.value) || 1)} />
      <Input className="col-span-3" type="number" placeholder="Price" value={item.unit_price} onChange={e => onUpdate(index, 'unit_price', parseFloat(e.target.value) || 0)} />
      <Input className="col-span-2" type="number" placeholder="Disc" value={item.discount_amount} onChange={e => onUpdate(index, 'discount_amount', parseFloat(e.target.value) || 0)} />
      <Button variant="ghost" size="sm" className="col-span-1" onClick={() => onRemove(index)}>✕</Button>
    </div>
  )
}
