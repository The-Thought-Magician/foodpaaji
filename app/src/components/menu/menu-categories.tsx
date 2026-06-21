'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import { MenuImage } from '@/components/ui/menu-image'
import CategoryFormDialog, { type MenuCategory, type CategoryFormData } from './category-form-dialog'

interface Props {
  restaurantId: number
  onCategoriesChange: () => void
}

export default function MenuCategories({ restaurantId, onCategoriesChange }: Props) {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<MenuCategory | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await invoke<{ success: boolean; data?: MenuCategory[] }>('get_menu_categories', { restaurantId })
      if (res.success && res.data) setCategories(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [restaurantId])

  useEffect(() => { load() }, [load])

  const handleImageUpload = async (categoryId?: number, file?: File | null) => {
    if (!file || !categoryId) return
    const reader = new FileReader()
    reader.onload = async e => {
      try {
        await invoke('upload_menu_category_image', {
          request: { category_id: categoryId, restaurant_id: restaurantId,
            image_data: e.target?.result as string, file_name: file.name,
            compress: true, max_width: 400, max_height: 300, quality: 85 }
        })
      } catch (err) { console.error(err) }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (data: CategoryFormData, image: File | null) => {
    try {
      if (editing) {
        const res = await invoke<{ success: boolean }>('update_menu_category', { id: editing.id, request: data })
        if (res.success) { await handleImageUpload(editing.id, image); setShowForm(false); load(); onCategoriesChange() }
      } else {
        const res = await invoke<{ success: boolean; data?: MenuCategory }>('create_menu_category', { request: { ...data, restaurant_id: restaurantId } })
        if (res.success && res.data) { await handleImageUpload(res.data.id, image); setShowForm(false); load(); onCategoriesChange() }
      }
    } catch (e) { console.error(e) }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this category?')) return
    try {
      const res = await invoke<{ success: boolean }>('delete_menu_category', { id })
      if (res.success) { load(); onCategoriesChange() }
    } catch (e) { console.error(e) }
  }

  const getParentName = (parentId?: number) =>
    parentId ? (categories.find(c => c.id === parentId)?.name ?? 'Unknown') : 'Root Category'

  const openAdd = () => { setEditing(null); setShowForm(true) }
  const openEdit = (cat: MenuCategory) => { setEditing(cat); setShowForm(true) }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Menu Categories</h2>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Category</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => (
          <Card key={cat.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{cat.name}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(cat)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(cat.id!)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {cat.image_path && (
                <div className="mb-3">
                  <MenuImage imagePath={cat.image_path} alt={cat.name} />
                </div>
              )}
              {cat.description && <p className="text-sm text-muted-foreground mb-3">{cat.description}</p>}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Parent:</span>
                  <span>{getParentName(cat.parent_id)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sort Order:</span>
                  <span>{cat.sort_order}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${cat.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20'}`}
                    onClick={async () => { await invoke('update_menu_category', { id: cat.id, request: { is_active: !cat.is_active } }).catch(console.error); load(); onCategoriesChange() }}
                  >{cat.is_active ? 'Active' : 'Inactive'}</button>
                  <button
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${cat.display_in_menu ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'}`}
                    onClick={async () => { await invoke('update_menu_category', { id: cat.id, request: { display_in_menu: !cat.display_in_menu } }).catch(console.error); load(); onCategoriesChange() }}
                  >{cat.display_in_menu ? <><Eye className="h-3 w-3" />Visible</> : <><EyeOff className="h-3 w-3" />Hidden</>}</button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CategoryFormDialog open={showForm} editing={editing} categories={categories}
        restaurantId={restaurantId} onClose={() => setShowForm(false)} onSubmit={handleSubmit} />
    </div>
  )
}
