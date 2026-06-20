'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Utensils,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Image as ImageIcon,
  Flame,
  Clock,
  Leaf
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MenuDashboard } from '@/components/menu/menu-dashboard'
import type { MenuItem, MenuCategory } from '@/types/menu'

const spiceColors = {
  mild: 'bg-emerald-500',
  medium: 'bg-yellow-500',
  hot: 'bg-orange-500',
  extra_hot: 'bg-red-500'
}

const spiceLabels = {
  mild: 'Mild',
  medium: 'Medium',
  hot: 'Hot',
  extra_hot: 'Extra Hot'
}

export function MenuManagement() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'items' | 'categories'>('dashboard')
  // const [items, setItems] = useState<MenuItem[]>([])
  // const [categories, setCategories] = useState<MenuCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  // const [loading, setLoading] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  const mockItems: MenuItem[] = [
    {
      id: 1,
      name: 'Butter Chicken',
      description: 'Tender chicken in rich tomato-based curry with butter and cream',
      category_id: 1,
      price: 350,
      image_url: '',
      is_available: true,
      is_vegetarian: false,
      spice_level: 'medium',
      preparation_time: 25,
      stock_count: 25,
      low_stock_threshold: 5,
      total_orders: 156
    },
    {
      id: 2,
      name: 'Paneer Tikka',
      description: 'Marinated and grilled cottage cheese cubes with spices',
      category_id: 1,
      price: 280,
      image_url: '',
      is_available: true,
      is_vegetarian: true,
      spice_level: 'medium',
      preparation_time: 20,
      stock_count: 18,
      low_stock_threshold: 5,
      total_orders: 128
    },
    {
      id: 3,
      name: 'Dal Makhani',
      description: 'Creamy black lentils simmered with butter and spices',
      category_id: 2,
      price: 220,
      image_url: '',
      is_available: true,
      is_vegetarian: true,
      spice_level: 'mild',
      preparation_time: 30,
      stock_count: 30,
      low_stock_threshold: 5,
      total_orders: 112
    },
    {
      id: 4,
      name: 'Garlic Naan',
      description: 'Soft bread topped with garlic and butter',
      category_id: 3,
      price: 60,
      image_url: '',
      is_available: true,
      is_vegetarian: true,
      spice_level: 'mild',
      preparation_time: 10,
      stock_count: 50,
      low_stock_threshold: 10,
      total_orders: 198
    },
    {
      id: 5,
      name: 'Chicken Biryani',
      description: 'Aromatic basmati rice with spiced chicken',
      category_id: 4,
      price: 380,
      image_url: '',
      is_available: true,
      is_vegetarian: false,
      spice_level: 'hot',
      preparation_time: 35,
      stock_count: 15,
      low_stock_threshold: 5,
      total_orders: 145
    },
    {
      id: 6,
      name: 'Gulab Jamun',
      description: 'Deep-fried milk solids soaked in sugar syrup',
      category_id: 5,
      price: 120,
      image_url: '',
      is_available: false,
      is_vegetarian: true,
      spice_level: 'mild',
      preparation_time: 15,
      stock_count: 0,
      low_stock_threshold: 5,
      total_orders: 85
    }
  ]

  const mockCategories: MenuCategory[] = [
    { id: 1, name: 'Starters', is_active: true, item_count: 12, display_order: 1 },
    { id: 2, name: 'Main Course', is_active: true, item_count: 18, display_order: 2 },
    { id: 3, name: 'Breads', is_active: true, item_count: 8, display_order: 3 },
    { id: 4, name: 'Rice & Biryani', is_active: true, item_count: 6, display_order: 4 },
    { id: 5, name: 'Desserts', is_active: true, item_count: 5, display_order: 5 },
    { id: 6, name: 'Beverages', is_active: true, item_count: 7, display_order: 6 }
  ]

  const filteredItems = mockItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === parseInt(selectedCategory)
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const lowStockItems = mockItems.filter(item => item.stock_count <= item.low_stock_threshold)

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'dashboard'
              ? 'gradient-spice text-white shadow-md'
              : 'bg-card hover:bg-muted'
          )}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'items'
              ? 'gradient-spice text-white shadow-md'
              : 'bg-card hover:bg-muted'
          )}
        >
          Menu Items
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'categories'
              ? 'gradient-spice text-white shadow-md'
              : 'bg-card hover:bg-muted'
          )}
        >
          Categories
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <MenuDashboard onNavigate={(tab) => setActiveTab(tab as 'dashboard' | 'items' | 'categories')} />
      )}

      {activeTab === 'items' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Menu Items
              </h2>
              <p className="text-muted-foreground">Manage your restaurant menu items</p>
            </div>
            <Button onClick={() => setShowItemModal(true)} className="gradient-spice text-white shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          {lowStockItems.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Flame className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    {lowStockItems.length} items running low on stock
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {lowStockItems.map(i => i.name).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory('all')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  selectedCategory === 'all'
                    ? 'gradient-spice text-white shadow-md'
                    : 'bg-card hover:bg-muted border border-border'
                )}
              >
                All Items
              </button>
              {mockCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id.toString())}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    selectedCategory === cat.id.toString()
                      ? 'gradient-spice text-white shadow-md'
                      : 'bg-card hover:bg-muted border border-border'
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item, index) => (
              <MenuItemCard
                key={item.id}
                item={item}
                delay={index * 50}
                onEdit={() => {
                  setEditingItem(item)
                  setShowItemModal(true)
                }}
                onDelete={() => {}}
                onToggleAvailability={() => {}}
              />
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-20 bg-card rounded-2xl border border-border">
              <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Utensils className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No items found</h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm ? 'Try adjusting your search' : 'Add your first menu item to get started'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowItemModal(true)} className="gradient-spice text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Item
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
              <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Categories
              </h2>
              <p className="text-muted-foreground">Organize your menu into categories</p>
            </div>
            <Button onClick={() => setShowCategoryModal(true)} className="gradient-spice text-white shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockCategories.map((category, index) => (
              <CategoryCard
                key={category.id}
                category={category}
                delay={index * 50}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {showItemModal && (
        <ItemModal
          item={editingItem}
          categories={mockCategories}
          onClose={() => {
            setShowItemModal(false)
            setEditingItem(null)
          }}
          onSave={() => {
            setShowItemModal(false)
            setEditingItem(null)
          }}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          onClose={() => setShowCategoryModal(false)}
          onSave={() => setShowCategoryModal(false)}
        />
      )}
    </div>
  )
}

interface MenuItemCardProps {
  item: MenuItem
  delay?: number
  onEdit: () => void
  onDelete: () => void
  onToggleAvailability: () => void
}

function MenuItemCard({ item, delay = 0, onEdit, onDelete, onToggleAvailability }: MenuItemCardProps) {
  const isLowStock = item.stock_count <= item.low_stock_threshold

  return (
    <div
      className="card-hover bg-card rounded-2xl overflow-hidden border border-border animate-fade-in"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="relative h-36 bg-muted">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          {item.is_vegetarian && (
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
          )}
          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${
            spiceColors[item.spice_level]
          }`}>
            {spiceLabels[item.spice_level]}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <button
            onClick={onToggleAvailability}
            className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
              item.is_available
                ? 'bg-emerald-500/90 text-white'
                : 'bg-rose-500/90 text-white'
            }`}
          >
            {item.is_available ? 'Available' : 'Sold Out'}
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-foreground truncate pr-2">{item.name}</h3>
          <p className="font-bold text-lg gradient-spice bg-clip-text text-transparent">
            ₹{item.price}
          </p>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{item.description}</p>

        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{item.preparation_time} min</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={cn(
              'w-2 h-2 rounded-full',
              isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
            )} />
            <span className={isLowStock ? 'text-amber-600' : ''}>
              {item.stock_count} in stock
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onEdit}
          >
            <Edit className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface CategoryCardProps {
  category: MenuCategory
  delay?: number
  onEdit: () => void
  onDelete: () => void
}

function CategoryCard({ category, delay = 0, onEdit, onDelete }: CategoryCardProps) {
  return (
    <div
      className="card-hover bg-card rounded-2xl p-5 border border-border animate-fade-in"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl gradient-spice">
          <Utensils className="w-5 h-5 text-white" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <h3 className="font-semibold text-lg mb-1">{category.name}</h3>
      <p className="text-sm text-muted-foreground mb-4">{category.item_count} items</p>

      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full gradient-spice rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, (category.item_count / 20) * 100)}%` }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          category.is_active
            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
        }`}>
          {category.is_active ? 'Active' : 'Inactive'}
        </span>
        <span className="text-xs text-muted-foreground">Order: {category.display_order}</span>
      </div>
    </div>
  )
}

interface ItemModalProps {
  item: MenuItem | null
  categories: MenuCategory[]
  onClose: () => void
  onSave: () => void
}

function ItemModal({ item, categories, onClose, onSave }: ItemModalProps) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    category_id: item?.category_id || categories[0]?.id || 0,
    price: item?.price || 0,
    is_vegetarian: item?.is_vegetarian ?? true,
    spice_level: item?.spice_level || 'medium',
    preparation_time: item?.preparation_time || 15,
    is_available: item?.is_available ?? true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-semibold">{item ? 'Edit Item' : 'Add New Item'}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Item Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Price (₹)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Prep Time (min)</label>
              <input
                type="number"
                value={formData.preparation_time}
                onChange={(e) => setFormData({ ...formData, preparation_time: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Spice Level</label>
              <select
                value={formData.spice_level}
                onChange={(e) => setFormData({ ...formData, spice_level: e.target.value as 'mild' | 'medium' | 'hot' | 'extra_hot' })}
                className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="mild">Mild</option>
                <option value="medium">Medium</option>
                <option value="hot">Hot</option>
                <option value="extra_hot">Extra Hot</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                formData.is_vegetarian ? 'bg-emerald-500 border-emerald-500' : 'border-border'
              }`}>
                {formData.is_vegetarian && <Leaf className="w-3 h-3 text-white" />}
              </span>
              <span className="text-sm">Vegetarian</span>
              <input
                type="checkbox"
                checked={formData.is_vegetarian}
                onChange={(e) => setFormData({ ...formData, is_vegetarian: e.target.checked })}
                className="hidden"
              />
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <span className={`w-10 h-5 rounded-full relative transition-colors ${
                formData.is_available ? 'bg-primary' : 'bg-muted'
              }`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  formData.is_available ? 'left-5' : 'left-0.5'
                }`} />
              </span>
              <span className="text-sm">Available</span>
              <input
                type="checkbox"
                checked={formData.is_available}
                onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 gradient-spice text-white">
              {item ? 'Update' : 'Create'} Item
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface CategoryModalProps {
  onClose: () => void
  onSave: () => void
}

function CategoryModal({ onClose, onSave }: CategoryModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    display_order: 0,
    is_active: true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl max-w-md w-full animate-scale-in">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add New Category</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Category Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Display Order</label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <span className={`w-10 h-5 rounded-full relative transition-colors ${
              formData.is_active ? 'bg-primary' : 'bg-muted'
            }`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                formData.is_active ? 'left-5' : 'left-0.5'
              }`} />
            </span>
            <span className="text-sm">Active</span>
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="hidden"
            />
          </label>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 gradient-spice text-white">
              Create Category
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
