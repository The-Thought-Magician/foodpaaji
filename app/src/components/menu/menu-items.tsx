'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChefHat, Plus, Edit, Trash2, Star, Image as ImageIcon, Clock, Leaf } from 'lucide-react'
import { MenuItemFormDialog } from './menu-item-form-dialog'

interface MenuItem {
  id?: number
  restaurant_id: number
  category_id: number
  name: string
  description?: string
  short_description?: string
  price: number
  preparation_time?: number
  image_path?: string
  sku?: string
  is_vegetarian: boolean
  is_vegan: boolean
  is_gluten_free: boolean
  is_spicy: boolean
  spice_level: number
  is_available: boolean
  is_active: boolean
  is_featured: boolean
  sort_order: number
}

interface Category { id: number; name: string; is_active: boolean }

interface Props {
  restaurantId: number
  categories: Category[]
  onItemsChange: () => void
}

const FORM_DEFAULTS = (restaurantId: number, categoryId: number) => ({
  restaurant_id: restaurantId, category_id: categoryId,
  name: '', description: '', short_description: '',
  price: 0, preparation_time: 0, calories: 0, sku: '',
  is_vegetarian: false, is_vegan: false, is_gluten_free: false,
  is_spicy: false, spice_level: 0, is_available: true, is_active: true,
  is_featured: false, sort_order: 0,
})

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n)

export default function MenuItems({ restaurantId, categories, onItemsChange }: Props) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  const loadItems = useCallback(async (categoryId: number) => {
    setLoading(true)
    try {
      const res = await invoke<{ success: boolean; data?: MenuItem[] }>(
        'get_menu_items_by_category', { restaurantId, categoryId }
      )
      if (res.success && res.data) setItems(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [restaurantId])

  useEffect(() => { if (selectedCategory) loadItems(selectedCategory) }, [selectedCategory, loadItems])

  const bulkSetAvailability = async (available: boolean) => {
    if (!filtered.length) return
    await Promise.all(filtered.map(item => invoke('update_menu_item', { id: item.id, request: { is_available: available } }).catch(console.error)))
    if (selectedCategory) loadItems(selectedCategory)
    onItemsChange()
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this menu item?')) return
    try {
      await invoke('delete_menu_item', { id })
      if (selectedCategory) loadItems(selectedCategory)
      onItemsChange()
    } catch (e) { console.error(e) }
  }

  const filtered = items.filter(i =>
    !search ||
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (i.sku ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const formData = editingItem
    ? { ...FORM_DEFAULTS(restaurantId, editingItem.category_id), ...editingItem }
    : FORM_DEFAULTS(restaurantId, selectedCategory ?? 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Menu Items</h2>
        <div className="flex gap-2">
          {filtered.length > 0 && <>
            <Button variant="outline" size="sm" onClick={() => bulkSetAvailability(true)}>All Available</Button>
            <Button variant="outline" size="sm" onClick={() => bulkSetAvailability(false)}>All Sold Out</Button>
          </>}
          <Button onClick={() => { setEditingItem(null); setShowForm(true) }} disabled={!selectedCategory}><Plus className="h-4 w-4 mr-2" />Add Menu Item</Button>
        </div>
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Label>Category</Label>
          <Select value={selectedCategory?.toString()}
            onValueChange={(v: string | null) => setSelectedCategory(parseInt(v ?? '0'))}>
            <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
            <SelectContent>
              {categories.filter(c => c.is_active).map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedCategory && (
          <div className="flex-1">
            <Label>Search</Label>
            <Input placeholder="Name, description, or SKU..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
        )}
      </div>

      {!selectedCategory ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <ChefHat className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Category Selected</h3>
              <p className="text-muted-foreground">Select a category to view and manage menu items.</p>
            </div>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    {item.sku && <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm"
                      onClick={() => { setEditingItem(item); setShowForm(true) }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(item.id!)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {item.image_path && (
                  <div className="mb-3 w-full h-32 bg-muted rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                {item.short_description && (
                  <p className="text-sm text-muted-foreground mb-3">{item.short_description}</p>
                )}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-bold text-green-600">{fmt(item.price)}</span>
                  <button onClick={async () => { await invoke('update_menu_item', { id: item.id, request: { is_featured: !item.is_featured } }).catch(console.error); if (selectedCategory) loadItems(selectedCategory) }} className="p-0.5 rounded transition-colors hover:bg-muted">
                    <Star className={`h-4 w-4 ${item.is_featured ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                  </button>
                </div>
                {item.preparation_time && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <Clock className="h-3 w-3" />{item.preparation_time} mins
                  </div>
                )}
                <div className="flex gap-1 flex-wrap mb-2">
                  {item.is_vegetarian && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                      <Leaf className="h-3 w-3 mr-1" />VEG
                    </Badge>
                  )}
                  {item.is_vegan && <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">VEGAN</Badge>}
                  {item.is_gluten_free && <Badge variant="secondary" className="text-xs">GF</Badge>}
                  {item.is_spicy && <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">🌶️ {item.spice_level}/5</Badge>}
                </div>
                <div className="flex gap-2">
                  <button
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${item.is_available ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' : 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200'}`}
                    onClick={async () => {
                      await invoke('update_menu_item', { id: item.id, request: { is_available: !item.is_available } }).catch(console.error)
                      if (selectedCategory) loadItems(selectedCategory)
                    }}
                  >
                    {item.is_available ? 'Available' : 'Sold Out'}
                  </button>
                  <button
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${item.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20'}`}
                    onClick={async () => { await invoke('update_menu_item', { id: item.id, request: { is_active: !item.is_active } }).catch(console.error); if (selectedCategory) loadItems(selectedCategory) }}
                  >{item.is_active ? 'Active' : 'Inactive'}</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MenuItemFormDialog
        open={showForm}
        editingId={editingItem?.id}
        initialData={formData}
        categories={categories}
        restaurantId={restaurantId}
        onClose={() => { setShowForm(false); setEditingItem(null) }}
        onSaved={() => { if (selectedCategory) loadItems(selectedCategory); onItemsChange() }}
      />
    </div>
  )
}
