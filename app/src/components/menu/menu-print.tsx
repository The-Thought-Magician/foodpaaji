'use client'

import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Printer, Loader2 } from 'lucide-react'

const RESTAURANT_ID = 1

export function MenuPrint() {
  const [loading, setLoading] = useState(false)

  const handlePrint = async () => {
    setLoading(true)
    try {
      const res = await invoke<{ success: boolean; data: string }>('export_menu_html', { restaurantId: RESTAURANT_ID })
      if (!res?.success) return

      const win = window.open('', '_blank')
      if (!win) return
      win.document.write(res.data)
      win.document.close()
      win.focus()
      win.print()
    } catch (e) {
      console.error('Menu export failed:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handlePrint} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
      Print Menu
    </Button>
  )
}
