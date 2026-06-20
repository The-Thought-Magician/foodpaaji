'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Filter, Search, Tag } from 'lucide-react'
import type { SearchFilters, SearchCategory, SearchSupplier } from './inventory-search-types'

interface Props {
  filters: SearchFilters
  categories: SearchCategory[]
  suppliers: SearchSupplier[]
  selectedCategory: SearchCategory | null
  itemCount: number
  onChange: (key: keyof SearchFilters, value: string | number | boolean | undefined) => void
  onClear: () => void
  onSearch: () => void
  onCategorySelect: (cat: SearchCategory | null) => void
}

export default function InventorySearchFilters({
  filters, categories, suppliers, selectedCategory, itemCount,
  onChange, onClear, onSearch, onCategorySelect
}: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Filter className="h-4 w-4" />Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Search Items</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input placeholder="Name, SKU, or barcode" value={filters.search ?? ''}
                onChange={e => onChange('search', e.target.value || undefined)} className="pl-10" />
            </div>
          </div>

          <div>
            <Label>Category</Label>
            <Select value={filters.category_id?.toString() ?? ''}
              onValueChange={(v: string | null) => {
                const id = v ? parseInt(v) : undefined
                onChange('category_id', id)
                onCategorySelect(id ? categories.find(c => c.id === id) ?? null : null)
              }}>
              <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All categories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Supplier</Label>
            <Select value={filters.supplier_id?.toString() ?? ''}
              onValueChange={(v: string | null) => onChange('supplier_id', v ? parseInt(v) : undefined)}>
              <SelectTrigger><SelectValue placeholder="All suppliers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All suppliers</SelectItem>
                {suppliers.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="low_stock" checked={filters.low_stock_only ?? false}
              onChange={e => onChange('low_stock_only', e.target.checked || undefined)} />
            <Label htmlFor="low_stock">Low stock only</Label>
          </div>

          <div className="flex gap-2">
            <Button onClick={onClear} variant="outline" size="sm" className="flex-1">Clear All</Button>
            <Button onClick={onSearch} size="sm" className="flex-1">Search</Button>
          </div>
        </CardContent>
      </Card>

      {selectedCategory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Tag className="h-4 w-4" />Category Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="font-medium">{selectedCategory.name}</div>
            {selectedCategory.description && <div className="text-sm text-muted-foreground">{selectedCategory.description}</div>}
            <div className="text-sm text-muted-foreground">{itemCount} items in this category</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
