'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, ArrowRight, RefreshCw } from 'lucide-react'

interface UnitConversion {
  id?: number
  restaurant_id: number
  from_unit: string
  to_unit: string
  conversion_factor: number
  is_active: boolean
  created_at?: string
}

const RESTAURANT_ID = 1

export default function UnitConversions() {
  const [conversions, setConversions] = useState<UnitConversion[]>([])
  const [loading, setLoading] = useState(false)
  const [fromUnit, setFromUnit] = useState('')
  const [toUnit, setToUnit] = useState('')
  const [factor, setFactor] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [setupDone, setSetupDone] = useState(false)
  const [cvtQty, setCvtQty] = useState('')
  const [cvtFrom, setCvtFrom] = useState('')
  const [cvtTo, setCvtTo] = useState('')
  const [cvtResult, setCvtResult] = useState<{ converted_quantity: number; converted_unit: string } | null>(null)

  const runConvert = async () => {
    const qty = parseFloat(cvtQty)
    if (isNaN(qty) || !cvtFrom || !cvtTo) return
    try {
      const res = await invoke<{ success: boolean; data?: { converted_quantity: number; converted_unit: string }; error?: string }>('convert_units', { request: { restaurant_id: RESTAURANT_ID, quantity: qty, from_unit: cvtFrom, to_unit: cvtTo } })
      if (res.success && res.data) setCvtResult(res.data)
      else setCvtResult(null)
    } catch { setCvtResult(null) }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await invoke<{ success: boolean; data?: UnitConversion[] }>('get_unit_conversions', { restaurantId: RESTAURANT_ID })
      if (res.success && res.data) setConversions(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const setupDefaults = async () => {
    try {
      await invoke('setup_default_conversions', { restaurantId: RESTAURANT_ID })
      setSetupDone(true)
      load()
    } catch (e) { console.error(e) }
  }

  const addConversion = async () => {
    if (!fromUnit.trim() || !toUnit.trim() || !factor) return
    const f = parseFloat(factor)
    if (isNaN(f) || f <= 0) { setMsg('Factor must be > 0'); setTimeout(() => setMsg(''), 2000); return }
    setSaving(true)
    try {
      const res = await invoke<{ success: boolean; error?: string }>('create_unit_conversion', {
        request: { restaurant_id: RESTAURANT_ID, from_unit: fromUnit.trim(), to_unit: toUnit.trim(), conversion_factor: f }
      })
      if (res.success) {
        setFromUnit(''); setToUnit(''); setFactor('')
        setMsg('Conversion added')
        load()
      } else {
        setMsg(res.error ?? 'Failed')
      }
    } catch (e) { setMsg(`Error: ${e}`) }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Unit Conversions</h2>
          <p className="text-sm text-muted-foreground">Define how inventory units convert between each other</p>
        </div>
        {!setupDone && conversions.length === 0 && (
          <Button variant="outline" size="sm" onClick={setupDefaults}>
            <RefreshCw className="w-4 h-4 mr-1" />Setup Defaults
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Add Conversion</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[100px]">
              <Label>From Unit</Label>
              <Input value={fromUnit} onChange={e => setFromUnit(e.target.value)} placeholder="e.g. kg" />
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground mb-2 flex-shrink-0" />
            <div className="flex-1 min-w-[100px]">
              <Label>To Unit</Label>
              <Input value={toUnit} onChange={e => setToUnit(e.target.value)} placeholder="e.g. g" />
            </div>
            <div className="w-36">
              <Label>Factor (1 From = ? To)</Label>
              <Input type="number" min="0" step="any" value={factor} onChange={e => setFactor(e.target.value)} placeholder="e.g. 1000" />
            </div>
            <Button className="gradient-spice text-white mb-0.5" onClick={addConversion} disabled={saving || !fromUnit || !toUnit || !factor}>
              <Plus className="w-4 h-4 mr-1" />{saving ? 'Adding...' : 'Add'}
            </Button>
          </div>
          {msg && <p className={`text-sm font-medium ${msg.startsWith('Error') || msg === 'Failed' ? 'text-red-500' : 'text-green-600'}`}>{msg}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Quick Converter</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 flex-wrap">
            <div className="w-28"><Label>Quantity</Label><Input type="number" value={cvtQty} onChange={e => setCvtQty(e.target.value)} placeholder="e.g. 5" /></div>
            <div className="w-24"><Label>From</Label><Input value={cvtFrom} onChange={e => setCvtFrom(e.target.value)} placeholder="kg" /></div>
            <ArrowRight className="w-4 h-4 text-muted-foreground mb-2" />
            <div className="w-24"><Label>To</Label><Input value={cvtTo} onChange={e => setCvtTo(e.target.value)} placeholder="g" /></div>
            <Button variant="outline" size="sm" onClick={runConvert} className="mb-0.5">Convert</Button>
            {cvtResult && <span className="text-sm font-medium text-green-600 mb-0.5">= {cvtResult.converted_quantity.toFixed(4)} {cvtResult.converted_unit}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Active Conversions ({conversions.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : conversions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No conversions defined. Add one above or use Setup Defaults.</p>
          ) : (
            <div className="space-y-2">
              {conversions.map((c, i) => (
                <div key={c.id ?? i} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg text-sm">
                  <span className="font-mono font-medium w-16 text-right">1 {c.from_unit}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono font-medium">{c.conversion_factor} {c.to_unit}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
