'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Filter, Search } from 'lucide-react'

export interface MovementFilters {
  inventory_item_id?: number
  movement_type?: string
  start_date?: string
  end_date?: string
  page: number
  limit: number
}

interface SimpleItem { id: number; name: string; sku?: string }

interface Props {
  filters: MovementFilters
  items: SimpleItem[]
  searchTerm: string
  onSearchTermChange: (v: string) => void
  onChange: (key: keyof MovementFilters, value: string | number | undefined) => void
  onClear: () => void
}

const MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'WASTE', 'RETURN']

export default function StockMovementFilters({ filters, items, searchTerm, onSearchTermChange, onChange, onClear }: Props) {
  const filteredItems = items.filter(i =>
    !searchTerm || i.name.toLowerCase().includes(searchTerm.toLowerCase()) || (i.sku ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />Search & Filter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label>Search Items</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input placeholder="Item name or SKU" value={searchTerm}
                onChange={e => onSearchTermChange(e.target.value)} className="pl-10" />
            </div>
          </div>
          <div>
            <Label>Specific Item</Label>
            <Select value={filters.inventory_item_id?.toString() ?? ''}
              onValueChange={(v: string | null) => onChange('inventory_item_id', v ? parseInt(v) : undefined)}>
              <SelectTrigger><SelectValue placeholder="All items" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All items</SelectItem>
                {filteredItems.map(i => (
                  <SelectItem key={i.id} value={i.id.toString()}>{i.name}{i.sku ? ` (${i.sku})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Movement Type</Label>
            <Select value={filters.movement_type ?? ''}
              onValueChange={(v: string | null) => onChange('movement_type', v || undefined)}>
              <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                {MOVEMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t === 'IN' ? 'Stock In' : t === 'OUT' ? 'Stock Out' : t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={filters.start_date ?? ''}
              onChange={e => onChange('start_date', e.target.value || undefined)} />
          </div>
          <div>
            <Label>End Date</Label>
            <Input type="date" value={filters.end_date ?? ''}
              onChange={e => onChange('end_date', e.target.value || undefined)} />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Label>Show:</Label>
            <Select value={filters.limit.toString()}
              onValueChange={(v: string | null) => onChange('limit', parseInt(v ?? '50'))}>
              <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[25, 50, 100, 200].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">records</span>
          </div>
          <Button onClick={onClear} variant="outline" size="sm">Clear Filters</Button>
        </div>
      </CardContent>
    </Card>
  )
}
