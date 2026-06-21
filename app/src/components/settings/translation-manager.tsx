'use client'

import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Languages, Plus, Trash2, Save, Search } from 'lucide-react'

interface LocaleInfo { locale: string; key_count: number }

const SUPPORTED_LOCALES = [
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'mr', name: 'Marathi (मराठी)' },
]

const DEFAULT_KEYS = [
  'nav.dashboard', 'nav.billing', 'nav.pos', 'nav.employees', 'nav.customers',
  'nav.inventory', 'nav.menu', 'nav.reservations', 'nav.promotions', 'nav.reports',
  'nav.settings', 'nav.feedback', 'common.save', 'common.cancel', 'common.delete',
  'common.search', 'common.add', 'common.edit', 'common.close', 'common.confirm',
  'billing.total', 'billing.subtotal', 'billing.tax', 'billing.discount',
  'billing.payment', 'billing.cash', 'billing.upi', 'billing.card',
  'menu.category', 'menu.item', 'menu.price', 'menu.available',
  'order.dinein', 'order.takeaway', 'order.delivery', 'order.status',
]

export function TranslationManager() {
  const [locales, setLocales] = useState<LocaleInfo[]>([])
  const [activeLocale, setActiveLocale] = useState('hi')
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [dirty, setDirty] = useState(false)

  const loadLocales = useCallback(async () => {
    const res = await invoke<{ success: boolean; data: LocaleInfo[] }>('get_available_locales').catch(() => null)
    if (res?.success) setLocales(res.data)
  }, [])

  const loadTranslations = useCallback(async () => {
    const res = await invoke<{ success: boolean; data: Record<string, string> }>('get_translations', { locale: activeLocale }).catch(() => null)
    if (res?.success) setTranslations(res.data)
    setDirty(false)
  }, [activeLocale])

  useEffect(() => { loadLocales() }, [loadLocales])
  useEffect(() => { loadTranslations() }, [loadTranslations])

  const updateValue = (key: string, value: string) => {
    setTranslations(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const saveAll = async () => {
    const entries: [string, string][] = Object.entries(translations).filter(([, v]) => v.trim())
    await invoke('bulk_upsert_translations', { locale: activeLocale, entries }).catch(() => {})
    setDirty(false)
    loadLocales()
  }

  const addEntry = async () => {
    if (!newKey.trim()) return
    await invoke('upsert_translation', { locale: activeLocale, key: newKey.trim(), value: newValue.trim() }).catch(() => {})
    setNewKey('')
    setNewValue('')
    loadTranslations()
    loadLocales()
  }

  const removeEntry = async (key: string) => {
    await invoke('delete_translation', { locale: activeLocale, key }).catch(() => {})
    loadTranslations()
    loadLocales()
  }

  const seedDefaults = async () => {
    const entries: [string, string][] = DEFAULT_KEYS.filter(k => !translations[k]).map(k => [k, ''])
    if (entries.length === 0) return
    await invoke('bulk_upsert_translations', { locale: activeLocale, entries }).catch(() => {})
    loadTranslations()
    loadLocales()
  }

  const allKeys = Object.keys(translations).sort()
  const filteredKeys = search ? allKeys.filter(k => k.toLowerCase().includes(search.toLowerCase()) || (translations[k] ?? '').toLowerCase().includes(search.toLowerCase())) : allKeys

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><Languages className="w-4 h-4" />Translation Manager</h3>
        <div className="flex items-center gap-2">
          {dirty && <Badge variant="outline" className="text-amber-600">Unsaved</Badge>}
          <Button size="sm" onClick={saveAll} disabled={!dirty} className="gap-1"><Save className="w-3 h-3" />Save All</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {SUPPORTED_LOCALES.map(l => {
          const info = locales.find(loc => loc.locale === l.code)
          return (
            <button key={l.code} onClick={() => setActiveLocale(l.code)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${activeLocale === l.code ? 'gradient-spice text-white border-transparent' : 'border-border hover:bg-muted'}`}>
              {l.name} {info && <span className="text-xs opacity-70">({info.key_count})</span>}
            </button>
          )
        })}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search keys or values..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={seedDefaults} className="text-xs whitespace-nowrap">Seed Default Keys</Button>
      </div>

      <div className="border rounded-lg divide-y max-h-[500px] overflow-y-auto">
        {filteredKeys.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No translations. Click &quot;Seed Default Keys&quot; to get started.</p>
        )}
        {filteredKeys.map(key => (
          <div key={key} className="flex items-center gap-2 p-2 hover:bg-muted/50">
            <code className="text-xs text-muted-foreground w-48 shrink-0 truncate" title={key}>{key}</code>
            <Input className="flex-1 h-8 text-sm" value={translations[key] ?? ''} onChange={e => updateValue(key, e.target.value)} placeholder="Enter translation..." />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeEntry(key)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label className="text-xs">Key</Label>
          <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="e.g. menu.item_name" className="mt-1" />
        </div>
        <div className="flex-1">
          <Label className="text-xs">Value</Label>
          <Input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Translation" className="mt-1" />
        </div>
        <Button size="sm" onClick={addEntry} disabled={!newKey.trim()} className="gap-1"><Plus className="w-3 h-3" />Add</Button>
      </div>
    </div>
  )
}
