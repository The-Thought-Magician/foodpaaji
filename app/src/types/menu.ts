export interface MenuItem {
  id: number
  name: string
  name_hi?: string
  description: string
  short_description?: string
  category_id: number
  price: number
  image_url?: string
  image_path?: string
  is_available: boolean
  is_active?: boolean
  is_featured?: boolean
  is_vegetarian: boolean
  spice_level: 'mild' | 'medium' | 'hot' | 'extra_hot'
  preparation_time: number
  stock_count: number
  low_stock_threshold: number
  total_orders: number
}

export interface MenuCategory {
  id: number
  name: string
  name_hi?: string
  description?: string
  icon?: string
  display_order: number
  is_active: boolean
  item_count: number
}

export interface TopSellingItem {
  id: number
  name: string
  category: string
  orders: number
  revenue: string
  trend: 'up' | 'down' | 'neutral'
}
