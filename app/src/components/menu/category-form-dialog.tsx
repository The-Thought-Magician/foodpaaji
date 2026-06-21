'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Upload } from 'lucide-react'

export interface MenuCategory {
  id?: number
  restaurant_id: number
  name: string
  description?: string
  parent_id?: number
  slug: string
  image_path?: string
  sort_order: number
  is_active: boolean
  display_in_menu: boolean
  created_at?: string
  updated_at?: string
}

export type CategoryFormData = Partial<MenuCategory>

interface Props {
  open: boolean
  editing: MenuCategory | null
  categories: MenuCategory[]
  restaurantId: number
  onClose: () => void
  onSubmit: (data: CategoryFormData, image: File | null) => void
}

const defaults = (restaurantId: number): CategoryFormData => ({
  restaurant_id: restaurantId, name: '', description: '',
  parent_id: undefined, sort_order: 0, is_active: true, display_in_menu: true,
})

export default function CategoryFormDialog({ open, editing, categories, restaurantId, onClose, onSubmit }: Props) {
  const [formData, setFormData] = useState<CategoryFormData>(defaults(restaurantId))
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')

  useEffect(() => {
    if (editing) {
      setFormData({ name: editing.name, description: editing.description, parent_id: editing.parent_id,
        sort_order: editing.sort_order, is_active: editing.is_active, display_in_menu: editing.display_in_menu })
    } else {
      setFormData(defaults(restaurantId))
    }
    setSelectedImage(null)
    setImagePreview('')
  }, [editing, restaurantId, open])

  const set = (patch: Partial<CategoryFormData>) => setFormData(prev => ({ ...prev, ...patch }))

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedImage(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData, selectedImage)
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Category' : 'Add New Category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Category Name</Label>
            <Input value={formData.name ?? ''} required onChange={e => set({ name: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={formData.description ?? ''} rows={3} onChange={e => set({ description: e.target.value })} />
          </div>
          <div>
            <Label>Parent Category</Label>
            <Select value={formData.parent_id?.toString() ?? 'none'}
              onValueChange={(v: string | null) => set({ parent_id: !v || v === 'none' ? undefined : parseInt(v) })}>
              <SelectTrigger><SelectValue placeholder="Root Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Root Category</SelectItem>
                {categories.filter(c => c.id !== editing?.id).map(c => (
                  <SelectItem key={c.id} value={c.id!.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category Image</Label>
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/*" onChange={handleImageSelect} />
              <Button type="button" variant="outline" size="sm"><Upload className="h-4 w-4" /></Button>
            </div>
            {imagePreview && (
              <div className="mt-2 w-full h-32 bg-muted rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <div>
            <Label>Sort Order</Label>
            <Input type="number" value={formData.sort_order ?? 0}
              onChange={e => set({ sort_order: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={!!formData.is_active} onCheckedChange={v => set({ is_active: v })} />
              <Label>Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!formData.display_in_menu} onCheckedChange={v => set({ display_in_menu: v })} />
              <Label>Show in Menu</Label>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">{editing ? 'Update' : 'Create'} Category</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
