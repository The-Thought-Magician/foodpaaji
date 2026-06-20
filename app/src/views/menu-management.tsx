'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Utensils, Plus, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MenuDashboard } from '@/components/menu/menu-dashboard'
import { MenuItemCard, type MenuItemData } from '@/components/menu/menu-item-card'
import { CategoryCard, type CategoryData } from '@/components/menu/category-card'
import { ItemModal, CategoryModal } from '@/components/menu/menu-modals'

const RESTAURANT_ID = 1

type Tab = 'dashboard' | 'items' | 'categories'

export function MenuManagement() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [items, setItems] = useState<MenuItemData[]>([])
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null)
  const [showItemModal, setShowItemModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null)

  const loadCategories = useCallback(async () => {
    try {
      const res = await invoke<{ success: boolean; data: CategoryData[] }>('get_menu_categories', {
        restaurantId: RESTAURANT_ID,
      })
      if (res.success) setCategories(res.data)
    } catch (e) {
      console.error(e)
    }
  }, [])

  const loadItems = useCallback(async () => {
    try {
      const res = await invoke<{ success: boolean; data: MenuItemData[] }>('get_menu_items_by_category', {
        categoryId: selectedCategory,
        restaurantId: RESTAURANT_ID,
      })
      if (res.success) setItems(res.data)
    } catch (e) {
      console.error(e)
    }
  }, [selectedCategory])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { if (activeTab === 'items') loadItems() }, [activeTab, loadItems])

  const handleSaveItem = async (data: Partial<MenuItemData>) => {
    try {
      if (editingItem?.id) {
        await invoke('update_menu_item', { id: editingItem.id, request: { ...data, restaurant_id: RESTAURANT_ID } })
      } else {
        await invoke('create_menu_item', { request: { ...data, restaurant_id: RESTAURANT_ID } })
      }
      setShowItemModal(false)
      setEditingItem(null)
      loadItems()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteItem = async (id: number) => {
    try {
      await invoke('delete_menu_item', { id })
      loadItems()
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggleItem = async (item: MenuItemData) => {
    try {
      await invoke('update_menu_item', { id: item.id, request: { is_available: !item.is_available } })
      loadItems()
    } catch (e) {
      console.error(e)
    }
  }

  const handleSaveCategory = async (data: { name: string; description: string; sort_order: number; is_active: boolean }) => {
    try {
      if (editingCategory) {
        await invoke('update_menu_category', { id: editingCategory.id, request: { ...data, restaurant_id: RESTAURANT_ID } })
      } else {
        await invoke('create_menu_category', { request: { ...data, restaurant_id: RESTAURANT_ID } })
      }
      setShowCategoryModal(false)
      setEditingCategory(null)
      loadCategories()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteCategory = async (id: number) => {
    try {
      await invoke('delete_menu_category', { id })
      loadCategories()
    } catch (e) {
      console.error(e)
    }
  }

  const filteredItems = items.filter(item => {
    const matchCat = selectedCategory === null || item.category_id === selectedCategory
    const matchSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description ?? '').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'items', label: 'Menu Items' },
    { key: 'categories', label: 'Categories' },
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === t.key ? 'gradient-spice text-white shadow-md' : 'bg-card hover:bg-muted')}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <MenuDashboard onNavigate={tab => setActiveTab(tab as Tab)} />
      )}

      {activeTab === 'items' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Menu Items</h2>
              <p className="text-muted-foreground">Manage your restaurant menu items</p>
            </div>
            <Button onClick={() => { setEditingItem(null); setShowItemModal(true) }} className="gradient-spice text-white shadow-lg">
              <Plus className="w-4 h-4 mr-2" />Add Item
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input type="text" placeholder="Search menu items..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setSelectedCategory(null)}
                className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  selectedCategory === null ? 'gradient-spice text-white shadow-md' : 'bg-card hover:bg-muted border border-border')}>
                All
              </button>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                  className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    selectedCategory === cat.id ? 'gradient-spice text-white shadow-md' : 'bg-card hover:bg-muted border border-border')}>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <MenuItemCard key={item.id} item={item}
                onEdit={() => { setEditingItem(item); setShowItemModal(true) }}
                onDelete={() => handleDeleteItem(item.id)}
                onToggle={() => handleToggleItem(item)} />
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-20 bg-card rounded-2xl border border-border">
              <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Utensils className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No items found</h3>
              <p className="text-muted-foreground mb-6">
                {search ? 'Try adjusting your search' : 'Add your first menu item to get started'}
              </p>
              {!search && (
                <Button onClick={() => setShowItemModal(true)} className="gradient-spice text-white">
                  <Plus className="w-4 h-4 mr-2" />Add First Item
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Categories</h2>
              <p className="text-muted-foreground">Organize your menu into categories</p>
            </div>
            <Button onClick={() => setShowCategoryModal(true)} className="gradient-spice text-white shadow-lg">
              <Plus className="w-4 h-4 mr-2" />Add Category
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <CategoryCard key={cat.id} category={cat}
                onEdit={() => { setEditingCategory(cat); setShowCategoryModal(true) }}
                onDelete={() => handleDeleteCategory(cat.id)} />
            ))}
          </div>
        </div>
      )}

      {showItemModal && (
        <ItemModal item={editingItem} categories={categories}
          onClose={() => { setShowItemModal(false); setEditingItem(null) }}
          onSave={handleSaveItem} />
      )}

      {showCategoryModal && (
        <CategoryModal initial={editingCategory} onClose={() => { setShowCategoryModal(false); setEditingCategory(null) }} onSave={handleSaveCategory} />
      )}
    </div>
  )
}
