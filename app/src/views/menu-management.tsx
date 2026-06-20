'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Utensils, Plus, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MenuDashboard } from '@/components/menu/menu-dashboard'
import { MenuItemCard, type MenuItemData } from '@/components/menu/menu-item-card'
import { CategoryCard, type CategoryData } from '@/components/menu/category-card'
import { ItemModal, CategoryModal } from '@/components/menu/menu-modals'
import PricingManagement from '@/components/menu/pricing-management'
import MenuCategories from '@/components/menu/menu-categories'
import RecipeManagement from '@/components/menu/recipe-management'
import MenuItems from '@/components/menu/menu-items'

const RESTAURANT_ID = 1

type Tab = 'dashboard' | 'items' | 'categories' | 'pricing' | 'recipes'

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
  const [quickPriceItem, setQuickPriceItem] = useState<MenuItemData | null>(null)
  const [quickPrice, setQuickPrice] = useState('')

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

  const saveQuickPrice = async () => {
    if (!quickPriceItem) return
    const price = parseFloat(quickPrice)
    if (isNaN(price) || price < 0) return
    try {
      await invoke('update_menu_item_price', { request: { menu_item_id: quickPriceItem.id, restaurant_id: RESTAURANT_ID, new_price: price, reason: null } })
      setQuickPriceItem(null); setQuickPrice('')
      loadItems()
    } catch (e) { console.error(e) }
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
    { key: 'pricing', label: 'Pricing' },
    { key: 'recipes', label: 'Recipes' },
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
        <MenuItems restaurantId={RESTAURANT_ID} categories={categories} onItemsChange={loadItems} />
      )}

      {activeTab === 'categories' && (
        <MenuCategories restaurantId={RESTAURANT_ID} onCategoriesChange={loadCategories} />
      )}

      {activeTab === 'pricing' && <PricingManagement restaurantId={RESTAURANT_ID} categories={categories as []} onPricesChange={loadItems} />}
      {activeTab === 'recipes' && <RecipeManagement />}

      {showItemModal && (
        <ItemModal item={editingItem} categories={categories}
          onClose={() => { setShowItemModal(false); setEditingItem(null) }}
          onSave={handleSaveItem} />
      )}

      {showCategoryModal && (
        <CategoryModal initial={editingCategory} onClose={() => { setShowCategoryModal(false); setEditingCategory(null) }} onSave={handleSaveCategory} />
      )}

      <Dialog open={!!quickPriceItem} onOpenChange={() => { setQuickPriceItem(null); setQuickPrice('') }}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Update Price — {quickPriceItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>New Price (₹)</Label><Input type="number" step="0.01" min="0" value={quickPrice} onChange={e => setQuickPrice(e.target.value)} autoFocus /></div>
            <Button className="w-full gradient-spice text-white" onClick={saveQuickPrice} disabled={!quickPrice}>Save Price</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
