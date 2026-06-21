'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { cn } from '@/lib/utils'
import { MenuDashboard } from '@/components/menu/menu-dashboard'
import { type CategoryData } from '@/components/menu/category-card'
import PricingManagement from '@/components/menu/pricing-management'
import MenuCategories from '@/components/menu/menu-categories'
import RecipeManagement from '@/components/menu/recipe-management'
import MenuItems from '@/components/menu/menu-items'
import { ComboDeals } from '@/components/menu/combo-deals'

const RESTAURANT_ID = 1

type Tab = 'dashboard' | 'items' | 'categories' | 'pricing' | 'recipes' | 'combos'

const TABS: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'items', label: 'Menu Items' },
  { key: 'categories', label: 'Categories' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'recipes', label: 'Recipes' },
  { key: 'combos', label: 'Combos' },
]

export function MenuManagement() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [categories, setCategories] = useState<CategoryData[]>([])

  const loadCategories = useCallback(async () => {
    try {
      const res = await invoke<{ success: boolean; data: CategoryData[] }>('get_menu_categories', { restaurantId: RESTAURANT_ID })
      if (res.success) setCategories(res.data)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === t.key ? 'gradient-spice text-white shadow-md' : 'bg-card hover:bg-muted')}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && <MenuDashboard onNavigate={tab => setActiveTab(tab as Tab)} />}
      {activeTab === 'items' && <MenuItems restaurantId={RESTAURANT_ID} categories={categories} onItemsChange={() => {}} />}
      {activeTab === 'categories' && <MenuCategories restaurantId={RESTAURANT_ID} onCategoriesChange={loadCategories} />}
      {activeTab === 'pricing' && <PricingManagement restaurantId={RESTAURANT_ID} categories={categories as []} onPricesChange={() => {}} />}
      {activeTab === 'recipes' && <RecipeManagement />}
      {activeTab === 'combos' && <ComboDeals />}
    </div>
  )
}
