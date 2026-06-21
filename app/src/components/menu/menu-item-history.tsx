'use client'

import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface HistoryEntry {
  id: number; field_name: string
  old_value: string | null; new_value: string | null
  changed_by: string | null; created_at: string
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name', price: 'Price', description: 'Description',
  is_available: 'Availability', preparation_time: 'Prep Time',
  is_vegetarian: 'Vegetarian', spice_level: 'Spice Level',
}

export function MenuItemHistoryDialog({ itemId, itemName, open, onClose }: {
  itemId: number; itemName: string; open: boolean; onClose: () => void
}) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  useEffect(() => {
    if (!open) return
    invoke<{ success: boolean; data: HistoryEntry[] }>('get_menu_item_history', { menuItemId: itemId })
      .then(r => { if (r.success) setEntries(r.data) })
      .catch(() => {})
  }, [open, itemId])

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
        <DialogHeader><DialogTitle>History: {itemName}</DialogTitle></DialogHeader>
        {entries.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No changes recorded</p>}
        <div className="space-y-2">
          {entries.map(e => (
            <div key={e.id} className="border rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">{FIELD_LABELS[e.field_name] ?? e.field_name}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-red-500 line-through">{e.old_value ?? '—'}</span>
                <span>→</span>
                <span className="text-green-600 font-medium">{e.new_value ?? '—'}</span>
              </div>
              {e.changed_by && <p className="text-xs text-muted-foreground">by {e.changed_by}</p>}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
