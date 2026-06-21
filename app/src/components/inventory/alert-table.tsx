'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle, CheckCircle, Circle, Package } from 'lucide-react'
import { alertLevelColor, formatAlertDate, type LowStockAlert, type AlertFilters } from './alert-types'

const AlertIcon = ({ level }: { level: string }) => {
  if (level === 'OUT_OF_STOCK') return <Package className="h-4 w-4 text-red-600" />
  if (level === 'CRITICAL' || level === 'LOW') return <AlertTriangle className="h-4 w-4 text-orange-600" />
  return <Circle className="h-4 w-4 text-muted-foreground" />
}

interface Props {
  alerts: LowStockAlert[]
  selected: Set<number>
  totalRecords: number
  filters: AlertFilters
  loading: boolean
  onSelectOne: (id: number, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  onAcknowledge: (id: number) => void
  onRestock: (inventoryItemId: number, itemName: string) => void
  onPageChange: (page: number) => void
}

export function AlertTable({ alerts, selected, totalRecords, filters, loading, onSelectOne, onSelectAll, onAcknowledge, onRestock, onPageChange }: Props) {
  const totalPages = Math.ceil(totalRecords / filters.limit)
  const unackCount = alerts.filter(a => !a.is_acknowledged).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-2">Loading alerts...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Checkbox
                  checked={selected.size === unackCount && alerts.length > 0}
                  onCheckedChange={c => onSelectAll(!!c)}
                />
              </TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Threshold</TableHead>
              <TableHead className="text-right">Shortage</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.length > 0 ? alerts.map(alert => (
              <TableRow key={alert.id}>
                <TableCell>
                  {!alert.is_acknowledged && (
                    <Checkbox checked={selected.has(alert.id)}
                      onCheckedChange={c => onSelectOne(alert.id, !!c)} />
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{alert.item_name}</div>
                  {alert.item_sku && <div className="text-xs text-muted-foreground">SKU: {alert.item_sku}</div>}
                </TableCell>
                <TableCell>
                  <Badge className={`flex items-center gap-1 w-fit ${alertLevelColor(alert.alert_level)}`}>
                    <AlertIcon level={alert.alert_level} />
                    {alert.alert_level.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">{alert.current_stock}</TableCell>
                <TableCell className="text-right">{alert.threshold_stock}</TableCell>
                <TableCell className="text-right text-destructive font-medium">
                  {Math.max(0, alert.threshold_stock - alert.current_stock).toFixed(2)}
                </TableCell>
                <TableCell className="text-sm">{formatAlertDate(alert.created_at)}</TableCell>
                <TableCell>
                  {alert.is_acknowledged
                    ? <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Acknowledged</Badge>
                    : <Badge className="bg-muted text-muted-foreground"><Circle className="h-3 w-3 mr-1" />Pending</Badge>
                  }
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {!alert.is_acknowledged && (
                      <Button size="sm" variant="outline" onClick={() => onAcknowledge(alert.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" />Ack
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50" onClick={() => onRestock(alert.inventory_item_id, alert.item_name)}>
                      <Package className="h-4 w-4 mr-1" />Restock
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No alerts found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {Math.min((filters.page - 1) * filters.limit + 1, totalRecords)}–
            {Math.min(filters.page * filters.limit, totalRecords)} of {totalRecords}
          </span>
          <div className="flex items-center gap-2">
            <Button onClick={() => onPageChange(filters.page - 1)} disabled={filters.page <= 1} variant="outline" size="sm">Previous</Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, filters.page - 2)) + i
              return (
                <Button key={p} onClick={() => onPageChange(p)}
                  variant={filters.page === p ? 'default' : 'outline'} size="sm" className="w-10">{p}</Button>
              )
            })}
            <Button onClick={() => onPageChange(filters.page + 1)} disabled={filters.page >= totalPages} variant="outline" size="sm">Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
