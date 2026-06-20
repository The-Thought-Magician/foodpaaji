'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Save, X } from 'lucide-react'
import { operationDescription, type BulkOperation } from './bulk-operation-form'

export interface PreviewItem {
  id: number
  name: string
  current_value: number
  new_value: number
  selected: boolean
}

const fmtCurrency = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v)

function fmtValue(op: BulkOperation, v: number) {
  return op.type.includes('PRICE') || op.type === 'PERCENTAGE_MARKUP' ? fmtCurrency(v) : `${v.toFixed(2)} units`
}

interface Props {
  open: boolean
  operation: BulkOperation
  items: PreviewItem[]
  updating: boolean
  onClose: () => void
  onToggleItem: (id: number, selected: boolean) => void
  onToggleAll: (selected: boolean) => void
  onExecute: () => void
}

export default function BulkPreviewDialog({ open, operation, items, updating, onClose, onToggleItem, onToggleAll, onExecute }: Props) {
  const activeCount = items.filter(i => i.selected).length
  const allSelected = items.length > 0 && items.every(i => i.selected)

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Preview Bulk Update</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded">
            <div className="font-medium">Operation: {operationDescription(operation)}</div>
            <div className="text-sm text-muted-foreground mt-1">{activeCount} items will be updated</div>
          </div>

          <div className="rounded-md border max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox checked={allSelected} onCheckedChange={c => onToggleAll(!!c)} />
                  </TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Current Value</TableHead>
                  <TableHead className="text-right">New Value</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox checked={item.selected} onCheckedChange={c => onToggleItem(item.id, !!c)} />
                    </TableCell>
                    <TableCell><div className="font-medium">{item.name}</div></TableCell>
                    <TableCell className="text-right">{fmtValue(operation, item.current_value)}</TableCell>
                    <TableCell className="text-right">{fmtValue(operation, item.new_value)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={item.new_value >= item.current_value ? 'default' : 'destructive'}>
                        {item.new_value > item.current_value ? '+' : ''}
                        {fmtValue(operation, item.new_value - item.current_value)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}><X className="h-4 w-4 mr-2" />Cancel</Button>
            <Button onClick={onExecute} disabled={updating || activeCount === 0}>
              <Save className="h-4 w-4 mr-2" />{updating ? 'Updating...' : 'Execute Update'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
