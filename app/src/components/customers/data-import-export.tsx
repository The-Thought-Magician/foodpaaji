'use client'

import { useState, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Download, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface ImportResult { imported: number; skipped: number }

export function CustomerDataImportExport() {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setExporting(true)
    setMessage(null)
    try {
      const res = await invoke<{ success: boolean; data: string; count: number }>('export_customers_csv')
      if (!res?.success) throw new Error('Export failed')
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setMessage({ type: 'success', text: `Exported ${res.count} customers` })
    } catch (e) {
      setMessage({ type: 'error', text: `Export failed: ${e}` })
    } finally { setExporting(false) }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setMessage(null)
    try {
      const text = await file.text()
      const res = await invoke<{ success: boolean } & ImportResult>('import_customers_csv', { csvData: text })
      if (!res?.success) throw new Error('Import failed')
      setMessage({ type: 'success', text: `Imported ${res.imported}, skipped ${res.skipped} (duplicates)` })
    } catch (err) {
      setMessage({ type: 'error', text: `Import failed: ${err}` })
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5">
        {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        Export CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing} className="gap-1.5">
        {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        Import CSV
      </Button>
      <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
      {message && (
        <span className={`text-xs flex items-center gap-1 ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
          {message.type === 'success' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {message.text}
        </span>
      )}
    </div>
  )
}
