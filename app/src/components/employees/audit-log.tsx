'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface AuditEntry {
  id: number; entity_type: string; entity_id: number
  action: string; changes: string | null; performed_by: string | null
  created_at: string
}

const ACTION_COLOR: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
}

export function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [filter, setFilter] = useState('all')
  const [limit, setLimit] = useState(50)

  const load = useCallback(async () => {
    const params: Record<string, unknown> = { limit }
    if (filter !== 'all') params.entityType = filter
    const res = await invoke<{ success: boolean; data: AuditEntry[] }>('get_audit_log', params).catch(() => null)
    if (res?.success) setEntries(res.data)
  }, [filter, limit])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Audit Log</h3>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={v => setFilter(v ?? 'all')}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="menu">Menu</SelectItem>
              <SelectItem value="inventory">Inventory</SelectItem>
              <SelectItem value="order">Order</SelectItem>
              <SelectItem value="bill">Bill</SelectItem>
            </SelectContent>
          </Select>
          {entries.length >= limit && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setLimit(l => l + 50)}>Load More</Button>
          )}
        </div>
      </div>

      {entries.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No audit entries</p>}

      <div className="space-y-2">
        {entries.map(e => (
          <div key={e.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className={`text-xs capitalize ${ACTION_COLOR[e.action] ?? 'bg-gray-100 text-gray-700'}`}>{e.action}</Badge>
                <Badge variant="outline" className="text-xs">{e.entity_type} #{e.entity_id}</Badge>
                {e.performed_by && <span className="text-xs text-muted-foreground">by {e.performed_by}</span>}
              </div>
              {e.changes && <p className="text-xs text-muted-foreground">{e.changes}</p>}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {new Date(e.created_at).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
