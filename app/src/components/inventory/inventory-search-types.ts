export interface SearchInventoryItem {
  id: number
  name: string
  description?: string
  sku?: string
  barcode?: string
  category_id?: number
  supplier_id?: number
  unit_type: string
  base_unit: string
  current_stock: number
  minimum_stock: number
  maximum_stock: number
  reorder_point: number
  cost_price: number
  selling_price: number
  location?: string
  is_active: boolean
}

export interface SearchCategory {
  id: number
  name: string
  description?: string
}

export interface SearchSupplier {
  id: number
  name: string
  contact_person?: string
}

export interface SearchFilters {
  search?: string
  category_id?: number
  supplier_id?: number
  low_stock_only?: boolean
  page: number
  limit: number
}

export const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)

export function stockStatus(item: SearchInventoryItem) {
  if (item.current_stock <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800 border-red-200' }
  if (item.current_stock <= item.reorder_point) return { label: 'Low Stock', color: 'bg-orange-100 text-orange-800 border-orange-200' }
  if (item.current_stock > item.maximum_stock) return { label: 'Overstocked', color: 'bg-purple-100 text-purple-800 border-purple-200' }
  return { label: 'Normal', color: 'bg-green-100 text-green-800 border-green-200' }
}
