'use client'

import { useState, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Upload, Download, CheckCircle, XCircle } from 'lucide-react'

interface ImportRow { name: string; unit_type: string; base_unit: string; current_stock: number; minimum_stock: number; cost_price: number; selling_price: number }
interface ImportResult { name: string; ok: boolean; error?: string }

const RESTAURANT_ID = 1
const TEMPLATE = 'name,unit_type,base_unit,current_stock,minimum_stock,cost_price,selling_price\nTomatoes,weight,kg,50,10,30,0\nRice,weight,kg,100,20,60,0'

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split('\n').slice(1)
  return lines.map(l => {
    const [name, unit_type, base_unit, current_stock, minimum_stock, cost_price, selling_price] = l.split(',').map(s => s.trim().replace(/^"|"$/g, ''))
    return { name, unit_type: unit_type || 'piece', base_unit: base_unit || 'pc', current_stock: parseFloat(current_stock) || 0, minimum_stock: parseFloat(minimum_stock) || 0, cost_price: parseFloat(cost_price) || 0, selling_price: parseFloat(selling_price) || 0 }
  }).filter(r => r.name)
}

export default function InventoryCsvImport() {
  const [results, setResults] = useState<ImportResult[]>([])
  const [importing, setImporting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv' })), download: 'inventory-import-template.csv' })
    a.click()
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const rows = parseCSV(text)
    if (!rows.length) return
    setImporting(true); setResults([])
    const out: ImportResult[] = []
    for (const row of rows) {
      try {
        await invoke('create_inventory_item', { request: { restaurant_id: RESTAURANT_ID, name: row.name, unit_type: row.unit_type, base_unit: row.base_unit, minimum_stock: row.minimum_stock, cost_price: row.cost_price, selling_price: row.selling_price, category_id: null, supplier_id: null } })
        if (row.current_stock > 0) {
          await invoke('adjust_stock_level', { restaurantId: RESTAURANT_ID, itemName: row.name, quantity: row.current_stock, reason: 'CSV import' }).catch(() => null)
        }
        out.push({ name: row.name, ok: true })
      } catch (err) {
        out.push({ name: row.name, ok: false, error: String(err) })
      }
    }
    setResults(out); setImporting(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={downloadTemplate}><Download className="w-4 h-4 mr-2" />Download Template</Button>
        <Button onClick={() => inputRef.current?.click()} disabled={importing}><Upload className="w-4 h-4 mr-2" />{importing ? 'Importing…' : 'Import CSV'}</Button>
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      </div>
      <p className="text-xs text-muted-foreground">CSV columns: name, unit_type, base_unit, current_stock, minimum_stock, cost_price, selling_price</p>
      {results.length > 0 && (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {r.ok ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
              <span className={r.ok ? '' : 'text-red-600'}>{r.name}{r.error ? ` — ${r.error}` : ''}</span>
            </div>
          ))}
          <p className="text-xs text-muted-foreground pt-1">{results.filter(r => r.ok).length}/{results.length} imported</p>
        </div>
      )}
    </div>
  )
}
