'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface MenuItemFormData {
  restaurant_id: number
  category_id: number
  name: string
  description: string
  short_description: string
  price: number
  preparation_time: number
  calories: number
  sku: string
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
  open: boolean
  editingId?: number
  initialData: MenuItemFormData
  categories: Category[]
  restaurantId: number
  onClose: () => void
  onSaved: () => void
}

export function MenuItemFormDialog({ open, editingId, initialData, categories, restaurantId, onClose, onSaved }: Props) {
  const [form, setForm] = useState<MenuItemFormData>(initialData)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [existingImage, setExistingImage] = useState<string | null>(null)

  useEffect(() => {
    setForm(initialData)
    setImageFile(null)
    setImagePreview('')
    setExistingImage(null)
    if (open && editingId) {
      invoke<{ success: boolean; data?: string }>('get_menu_item_by_id', { itemId: editingId, restaurantId })
        .then(res => {
          const path = (res as unknown as { data?: { image_path?: string } }).data?.image_path
          if (!path) return
          invoke<{ success: boolean; data?: string }>('get_menu_image', { imagePath: path })
            .then(r => setExistingImage(r.success && r.data ? r.data : null))
            .catch(() => {})
        })
        .catch(() => {})
    }
  }, [open, editingId, restaurantId, initialData])

  const update = <K extends keyof MenuItemFormData>(k: K, v: MenuItemFormData[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const uploadImage = async (itemId: number) => {
    if (!imageFile) return
    const reader = new FileReader()
    reader.onload = async e => {
      try {
        await invoke('upload_menu_item_image', {
          request: {
            menu_item_id: itemId, restaurant_id: restaurantId,
            image_data: e.target?.result as string,
            file_name: imageFile.name, compress: true,
            max_width: 800, max_height: 600, quality: 85,
          },
        })
      } catch (err) { console.error(err) }
    }
    reader.readAsDataURL(imageFile)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await invoke('update_menu_item', { id: editingId, request: form })
        await uploadImage(editingId)
      } else {
        const res = await invoke<{ success: boolean; data?: { id: number } }>('create_menu_item', { request: form })
        if (res.success && res.data) await uploadImage(res.data.id)
      }
      onSaved()
      onClose()
    } catch (err) { console.error(err) }
  }

  const onImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const r = new FileReader()
    r.onload = ev => setImagePreview(ev.target?.result as string)
    r.readAsDataURL(file)
  }

  const activeCategories = categories.filter(c => c.is_active)

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label>Item Name</Label>
                <Input value={form.name} required onChange={e => update('name', e.target.value)} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category_id.toString()}
                  onValueChange={(v: string | null) => update('category_id', parseInt(v ?? '0'))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {activeCategories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Short Description</Label>
                <Input value={form.short_description} placeholder="Brief description for menu display"
                  onChange={e => update('short_description', e.target.value)} />
              </div>
              <div>
                <Label>Full Description</Label>
                <Textarea value={form.description} rows={3}
                  placeholder="Detailed description with ingredients, preparation, etc."
                  onChange={e => update('description', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price (₹)</Label>
                  <Input type="number" step="0.01" min="0" required value={form.price}
                    onChange={e => update('price', parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input value={form.sku} placeholder="Stock keeping unit"
                    onChange={e => update('sku', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <div>
                <Label>Item Image</Label>
                {existingImage && !imagePreview && (
                  <div className="mb-2 relative w-full h-32 bg-muted rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={existingImage} alt="Current" className="w-full h-full object-cover" />
                    <Button size="sm" variant="destructive" className="absolute top-2 right-2 text-xs h-7"
                      onClick={async () => { if (!editingId) return; await invoke('delete_menu_item_image', { menuItemId: editingId, restaurantId }).catch(console.error); setExistingImage(null) }}>
                      Remove
                    </Button>
                  </div>
                )}
                <Input type="file" accept="image/*" onChange={onImageSelect} />
                {imagePreview && (
                  <div className="mt-2 w-full h-32 bg-muted rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prep Time (min)</Label>
                  <Input type="number" min="0" value={form.preparation_time}
                    onChange={e => update('preparation_time', parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Calories</Label>
                  <Input type="number" min="0" value={form.calories}
                    onChange={e => update('calories', parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_spicy} onCheckedChange={v => update('is_spicy', v)} />
                  <Label>Spicy</Label>
                </div>
                {form.is_spicy && (
                  <div>
                    <Label>Spice Level (1-5)</Label>
                    <Input type="number" min="1" max="5" value={form.spice_level}
                      onChange={e => update('spice_level', parseInt(e.target.value) || 1)} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {([['is_vegetarian', 'Vegetarian'], ['is_vegan', 'Vegan'], ['is_gluten_free', 'Gluten Free']] as const).map(([k, label]) => (
                  <div key={k} className="flex items-center gap-2">
                    <Switch checked={form[k]} onCheckedChange={v => update(k, v)} />
                    <Label>{label}</Label>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order}
                  onChange={e => update('sort_order', parseInt(e.target.value) || 0)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {([['is_active', 'Active'], ['is_available', 'Available'], ['is_featured', 'Featured']] as const).map(([k, label]) => (
                  <div key={k} className="flex items-center gap-2">
                    <Switch checked={form[k]} onCheckedChange={v => update(k, v)} />
                    <Label>{label}</Label>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">{editingId ? 'Update' : 'Create'} Menu Item</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
