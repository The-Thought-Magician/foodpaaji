'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TrendingUp, TrendingDown, RotateCcw, RefreshCw } from 'lucide-react'
import type { MovementFilters } from './stock-movement-filters'

export interface StockMovement {
  id: number
  item_name: string
  item_sku?: string
  movement_type: string
  quantity: number
  unit_cost?: number
  total_cost?: number
  batch_number?: string
  expiry_date?: string
  notes?: string
  movement_date?: string
}

interface Props {
  movements: StockMovement[]
  totalRecords: number
  filters: MovementFilters
  loading: boolean
  onPageChange: (page: number) => void
}

const TYPE_COLOR: Record<string, string> = {
  IN: 'bg-green-100 text-green-800 border-green-200',
  OUT: 'bg-red-100 text-red-800 border-red-200',
  ADJUSTMENT: 'bg-blue-100 text-blue-800 border-blue-200',
  TRANSFER: 'bg-purple-100 text-purple-800 border-purple-200',
  WASTE: 'bg-orange-100 text-orange-800 border-orange-200',
  RETURN: 'bg-teal-100 text-teal-800 border-teal-200',
}

function MovementIcon({ type }: { type: string }) {
  if (type === 'IN' || type === 'RETURN') return <TrendingUp className="h-4 w-4 text-green-600" />
  if (type === 'OUT' || type === 'WASTE') return <TrendingDown className="h-4 w-4 text-red-600" />
  if (type === 'ADJUSTMENT') return <RotateCcw className="h-4 w-4 text-blue-600" />
  if (type === 'TRANSFER') return <RefreshCw className="h-4 w-4 text-purple-600" />
  return null
}

const fmtCurrency = (v?: number) => v ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v) : '-'
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

export default function StockMovementTable({ movements, totalRecords, filters, loading, onPageChange }: Props) {
  const totalPages = Math.ceil(totalRecords / filters.limit)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-2">Loading movements...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
              <TableHead>Batch/Expiry</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length > 0 ? movements.map(m => (
              <TableRow key={m.id}>
                <TableCell className="text-sm">{fmtDate(m.movement_date)}</TableCell>
                <TableCell>
                  <div className="font-medium">{m.item_name}</div>
                  {m.item_sku && <div className="text-sm text-muted-foreground">SKU: {m.item_sku}</div>}
                </TableCell>
                <TableCell>
                  <Badge className={`flex items-center gap-1 w-fit ${TYPE_COLOR[m.movement_type] ?? 'bg-muted text-muted-foreground'}`}>
                    <MovementIcon type={m.movement_type} />{m.movement_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">{m.quantity}</TableCell>
                <TableCell className="text-right">{fmtCurrency(m.unit_cost)}</TableCell>
                <TableCell className="text-right font-medium">{fmtCurrency(m.total_cost)}</TableCell>
                <TableCell className="text-sm">
                  {m.batch_number && <div>Batch: {m.batch_number}</div>}
                  {m.expiry_date && <div>Exp: {new Date(m.expiry_date).toLocaleDateString()}</div>}
                </TableCell>
                <TableCell><div className="text-sm max-w-48 truncate" title={m.notes ?? ''}>{m.notes ?? '-'}</div></TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No stock movements found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {Math.min((filters.page - 1) * filters.limit + 1, totalRecords)}–{Math.min(filters.page * filters.limit, totalRecords)} of {totalRecords} records
          </span>
          <div className="flex items-center gap-2">
            <Button onClick={() => onPageChange(filters.page - 1)} disabled={filters.page <= 1} variant="outline" size="sm">Previous</Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, filters.page - 2)) + i
              return <Button key={p} onClick={() => onPageChange(p)} variant={filters.page === p ? 'default' : 'outline'} size="sm" className="w-10">{p}</Button>
            })}
            <Button onClick={() => onPageChange(filters.page + 1)} disabled={filters.page >= totalPages} variant="outline" size="sm">Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
