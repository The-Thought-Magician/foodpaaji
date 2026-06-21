'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Leaf } from 'lucide-react'
import type { CategoryData } from './category-card'
import type { MenuItemData } from './menu-item-card'

interface ItemModalProps {
  item: MenuItemData | null
  categories: CategoryData[]
  onClose: () => void
  onSave: (data: Partial<MenuItemData>) => void
}

export function ItemModal({ item, categories, onClose, onSave }: ItemModalProps) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    description: item?.description ?? '',
    category_id: item?.category_id ?? categories[0]?.id ?? 0,
    price: item?.price ?? 0,
    is_vegetarian: item?.is_vegetarian ?? true,
    is_spicy: item?.is_spicy ?? false,
    preparation_time: item?.preparation_time ?? 15,
    is_available: item?.is_available ?? true,
    kitchen_station: (item as (typeof item & { kitchen_station?: string }) | null)?.kitchen_station ?? '',
  })

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-semibold">{item ? 'Edit Item' : 'Add New Item'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Item Name</label>
            <input type="text" value={form.name} required
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea value={form.description ?? ''} rows={3}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: parseInt(e.target.value) }))}
                className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20">
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Price (₹)</label>
              <input type="number" value={form.price} required
                onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Prep Time (min)</label>
              <input type="number" value={form.preparation_time}
                onChange={e => setForm(f => ({ ...f, preparation_time: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Kitchen Station</label>
              <select value={form.kitchen_station} onChange={e => setForm(f => ({ ...f, kitchen_station: e.target.value }))}
                className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Any / Not set</option>
                <option value="hot">Hot Kitchen</option>
                <option value="cold">Cold / Salads</option>
                <option value="grill">Grill / Tandoor</option>
                <option value="fry">Fry Station</option>
                <option value="dessert">Dessert / Bakery</option>
                <option value="bar">Bar / Beverages</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.is_vegetarian ? 'bg-emerald-500 border-emerald-500' : 'border-border'}`}>
                {form.is_vegetarian && <Leaf className="w-3 h-3 text-white" />}
              </span>
              <span className="text-sm">Vegetarian</span>
              <input type="checkbox" checked={form.is_vegetarian} className="hidden"
                onChange={e => setForm(f => ({ ...f, is_vegetarian: e.target.checked }))} />
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className={`w-10 h-5 rounded-full relative transition-colors ${form.is_available ? 'bg-primary' : 'bg-muted'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_available ? 'left-5' : 'left-0.5'}`} />
              </span>
              <span className="text-sm">Available</span>
              <input type="checkbox" checked={form.is_available} className="hidden"
                onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} />
            </label>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 gradient-spice text-white">
              {item ? 'Update' : 'Create'} Item
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface CategoryModalProps {
  initial?: CategoryData | null
  onClose: () => void
  onSave: (data: { name: string; description: string; sort_order: number; is_active: boolean }) => void
}

export function CategoryModal({ initial, onClose, onSave }: CategoryModalProps) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    sort_order: initial?.sort_order ?? 0,
    is_active: initial?.is_active ?? true,
  })

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-semibold">{initial ? 'Edit Category' : 'Add New Category'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Category Name</label>
            <input type="text" value={form.name} required
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea value={form.description} rows={3}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Display Order</label>
            <input type="number" value={form.sort_order}
              onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className={`w-10 h-5 rounded-full relative transition-colors ${form.is_active ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'left-5' : 'left-0.5'}`} />
            </span>
            <span className="text-sm">Active</span>
            <input type="checkbox" checked={form.is_active} className="hidden"
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
          </label>
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 gradient-spice text-white">{initial ? 'Update' : 'Create'} Category</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
