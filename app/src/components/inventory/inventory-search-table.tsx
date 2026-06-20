'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, Building2, Edit, Eye, Package } from 'lucide-react'
import { fmtCurrency, stockStatus, type SearchInventoryItem, type SearchFilters, type SearchCategory, type SearchSupplier } from './inventory-search-types'

interface Props {
  items: SearchInventoryItem[]
  totalRecords: number
  filters: SearchFilters
  loading: boolean
  categories: SearchCategory[]
  suppliers: SearchSupplier[]
  onPageChange: (page: number) => void
}

export default function InventorySearchTable({ items, totalRecords, filters, loading, categories, suppliers, onPageChange }: Props) {
  const totalPages = Math.ceil(totalRecords / filters.limit)
  const getCategoryName = (id?: number) => categories.find(c => c.id === id)?.name ?? '-'
  const getSupplierName = (id?: number) => suppliers.find(s => s.id === id)?.name ?? '-'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-2">Searching...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Details</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stock Status</TableHead>
              <TableHead className="text-right">Stock Level</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length > 0 ? items.map(item => {
              const status = stockStatus(item)
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" />{item.name}</div>
                    {item.sku && <div className="text-sm text-muted-foreground">SKU: {item.sku}</div>}
                    {item.description && <div className="text-sm text-muted-foreground max-w-48 truncate">{item.description}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{getCategoryName(item.category_id)}</div>
                    <div className="text-xs text-muted-foreground">{getSupplierName(item.supplier_id)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={status.color}>
                      {item.current_stock <= item.reorder_point && <AlertCircle className="h-3 w-3 mr-1" />}
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">{item.current_stock} {item.base_unit}</div>
                    <div className="text-xs text-muted-foreground">Min: {item.minimum_stock} | Max: {item.maximum_stock}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">{fmtCurrency(item.selling_price)}</div>
                    <div className="text-xs text-muted-foreground">Cost: {fmtCurrency(item.cost_price)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{item.location ?? 'Not set'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline"><Eye className="h-3 w-3" /></Button>
                      <Button size="sm" variant="outline"><Edit className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            }) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  {filters.search || filters.category_id || filters.supplier_id ? 'No items match your filters' : 'No inventory items found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {Math.min((filters.page - 1) * filters.limit + 1, totalRecords)}–{Math.min(filters.page * filters.limit, totalRecords)} of {totalRecords} items
          </span>
          <div className="flex items-center gap-2">
            <Button onClick={() => onPageChange(filters.page - 1)} disabled={filters.page <= 1} variant="outline" size="sm">Previous</Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, filters.page - 2)) + i
              return (
                <Button key={p} onClick={() => onPageChange(p)} variant={filters.page === p ? 'default' : 'outline'} size="sm" className="w-10">{p}</Button>
              )
            })}
            <Button onClick={() => onPageChange(filters.page + 1)} disabled={filters.page >= totalPages} variant="outline" size="sm">Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
