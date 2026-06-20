'use client'

import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { type InventoryItem } from './inventory-card'
import InventoryItemForm, { type InventoryItemFormData } from './inventory-item-form'

const RESTAURANT_ID = 1

interface DeleteDialogProps {
  item: InventoryItem | null
  onClose: () => void
  onDeleted: () => void
}

export function DeleteInventoryDialog({ item, onClose, onDeleted }: DeleteDialogProps) {
  const handleDelete = async () => {
    if (!item) return
    await invoke('delete_inventory_item', { itemId: item.id, restaurantId: RESTAURANT_ID }).catch(console.error)
    onDeleted()
    onClose()
  }

  return (
    <Dialog open={!!item} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Delete Item</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Delete <strong>{item?.name}</strong>? This will deactivate the item and hide it from inventory.
        </p>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface RestockDialogProps {
  item: InventoryItem | null
  qty: string
  onQtyChange: (v: string) => void
  onClose: () => void
  onRestocked: () => void
}

export function RestockDialog({ item, qty, onQtyChange, onClose, onRestocked }: RestockDialogProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item) return
    const quantity = parseFloat(qty)
    if (isNaN(quantity) || quantity <= 0) return
    await invoke('create_stock_movement', {
      request: {
        restaurant_id: RESTAURANT_ID,
        inventory_item_id: item.id,
        movement_type: 'IN',
        quantity,
        unit_cost: item.cost_price ?? null,
        reference_type: 'RESTOCK',
        reference_id: null,
        batch_number: null,
        expiry_date: null,
        notes: 'Manual restock',
        user_id: 1,
      }
    }).catch(console.error)
    onRestocked()
    onClose()
  }

  return (
    <Dialog open={!!item} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Restock — {item?.name}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Quantity to add ({item?.base_unit})</Label>
            <Input type="number" step="0.01" min="0.01" placeholder="0.00"
              value={qty} onChange={e => onQtyChange(e.target.value)} autoFocus />
            <p className="text-xs text-muted-foreground">
              Current stock: {item?.current_stock} {item?.base_unit}
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!qty || parseFloat(qty) <= 0}>Add Stock</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface EditDialogProps {
  open: boolean
  item: InventoryItem | null
  onClose: () => void
  onSaved: () => void
}

export function EditInventoryDialog({ open, item, onClose, onSaved }: EditDialogProps) {
  const handleSubmit = async (data: InventoryItemFormData) => {
    if (item) {
      await invoke('update_inventory_item', {
        request: {
          id: item.id, restaurant_id: RESTAURANT_ID,
          category_id: data.category_id, supplier_id: data.supplier_id,
          name: data.name, description: data.description || null,
          sku: data.sku || null, barcode: data.barcode || null,
          unit_type: data.unit_type, base_unit: data.base_unit,
          conversion_factor: data.conversion_factor,
          minimum_stock: data.minimum_stock, maximum_stock: data.maximum_stock,
          reorder_point: data.reorder_point, cost_price: data.cost_price,
          selling_price: data.selling_price, tax_rate: data.tax_rate,
          expiry_tracking: data.expiry_tracking, batch_tracking: data.batch_tracking,
          location: data.location || null,
        }
      })
    } else {
      await invoke('create_inventory_item', {
        request: {
          restaurant_id: RESTAURANT_ID,
          category_id: data.category_id, supplier_id: data.supplier_id,
          name: data.name, description: data.description || null,
          sku: data.sku || null, barcode: data.barcode || null,
          unit_type: data.unit_type, base_unit: data.base_unit,
          conversion_factor: data.conversion_factor,
          minimum_stock: data.minimum_stock, maximum_stock: data.maximum_stock,
          reorder_point: data.reorder_point, cost_price: data.cost_price,
          selling_price: data.selling_price, tax_rate: data.tax_rate,
          expiry_tracking: data.expiry_tracking, batch_tracking: data.batch_tracking,
          location: data.location || null,
        }
      })
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <InventoryItemForm
          isEditing={!!item}
          initialData={item ? {
            name: item.name, sku: item.sku ?? '',
            category_id: item.category_id ?? null, supplier_id: item.supplier_id ?? null,
            minimum_stock: item.minimum_stock, maximum_stock: item.maximum_stock,
            cost_price: item.cost_price, selling_price: item.selling_price,
            base_unit: item.base_unit,
          } : undefined}
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}
