'use client'

import { useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QrCode, Download, Printer } from 'lucide-react'

interface Table {
  id: number
  table_number: string
  capacity: number
  location?: string
}

function TableQrCanvas({ table }: { table: Table }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const qrData = `foodpaaji://table/${table.id}?number=${table.table_number}`

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, qrData, {
      width: 240,
      margin: 2,
      color: { dark: '#1a1a1a', light: '#ffffff' },
    }).catch(console.error)
  }, [qrData])

  const download = () => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `table-${table.table_number}-qr.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="p-4 bg-white rounded-xl border border-border shadow-sm">
        <canvas ref={canvasRef} />
        <div className="text-center mt-3">
          <p className="font-bold text-lg text-gray-900">Table {table.table_number}</p>
          {table.location && <p className="text-xs text-gray-500">{table.location}</p>}
          <p className="text-xs text-gray-400 mt-1">Scan to order</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={download}>
          <Download className="w-4 h-4 mr-1" />Download
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-1" />Print
        </Button>
      </div>
    </div>
  )
}

export function TableQrManager() {
  const [tables, setTables] = useState<Table[]>([])
  const [selected, setSelected] = useState<Table | null>(null)

  useEffect(() => {
    invoke<{ success: boolean; data: Table[] }>('get_tables')
      .then(r => { if (r.success) setTables(r.data) })
      .catch(console.error)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <QrCode className="w-5 h-5" />
        <h3 className="font-semibold">Table QR Codes</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {tables.map(t => (
          <button
            key={t.id}
            onClick={() => setSelected(t)}
            className="p-4 rounded-xl border border-border bg-card hover:bg-muted/60 transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Table {t.table_number}</p>
                <p className="text-xs text-muted-foreground">{t.capacity} seats{t.location ? ` · ${t.location}` : ''}</p>
              </div>
              <QrCode className="w-5 h-5 text-muted-foreground" />
            </div>
          </button>
        ))}
        {tables.length === 0 && (
          <p className="col-span-3 text-center text-muted-foreground py-6 text-sm">No tables found — add tables in Reservations</p>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code — Table {selected?.table_number}</DialogTitle>
          </DialogHeader>
          {selected && <TableQrCanvas table={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
