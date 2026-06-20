'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Settings, Store, CreditCard, Percent } from 'lucide-react'

interface RestaurantSettings {
  restaurant_name: string
  upi_id: string
  gstin: string
  default_tax_percent: number
  service_charge_percent: number
  address: string
  phone: string
}

const SETTINGS_KEY = 'foodpaaji_settings'

function loadSettings(): RestaurantSettings {
  if (typeof window === 'undefined') return defaultSettings()
  try {
    const s = localStorage.getItem(SETTINGS_KEY)
    return s ? JSON.parse(s) : defaultSettings()
  } catch {
    return defaultSettings()
  }
}

function defaultSettings(): RestaurantSettings {
  return {
    restaurant_name: 'FoodPaaji',
    upi_id: 'restaurant@upi',
    gstin: '',
    default_tax_percent: 5,
    service_charge_percent: 0,
    address: '',
    phone: '',
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<RestaurantSettings>(loadSettings)
  const [saved, setSaved] = useState(false)

  const update = (field: keyof RestaurantSettings, value: string | number) => {
    setSettings(s => ({ ...s, [field]: value }))
    setSaved(false)
  }

  const save = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const sections = [
    {
      icon: Store,
      title: 'Restaurant Info',
      fields: [
        { label: 'Restaurant Name', key: 'restaurant_name' as const, type: 'text' },
        { label: 'Address', key: 'address' as const, type: 'text' },
        { label: 'Phone', key: 'phone' as const, type: 'tel' },
        { label: 'GSTIN', key: 'gstin' as const, type: 'text' },
      ],
    },
    {
      icon: CreditCard,
      title: 'Payment',
      fields: [
        { label: 'UPI ID', key: 'upi_id' as const, type: 'text' },
      ],
    },
    {
      icon: Percent,
      title: 'Tax & Charges',
      fields: [
        { label: 'Default Tax %', key: 'default_tax_percent' as const, type: 'number' },
        { label: 'Service Charge %', key: 'service_charge_percent' as const, type: 'number' },
      ],
    },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6" />
        <h2 className="text-2xl font-bold">Settings</h2>
      </div>

      {sections.map(section => (
        <Card key={section.title}>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <section.icon className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold">{section.title}</h3>
            </div>
            {section.fields.map(f => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <Input
                  type={f.type}
                  value={settings[f.key]}
                  onChange={e => update(f.key, f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Button className="gradient-spice text-white" onClick={save}>
        {saved ? 'Saved!' : 'Save Settings'}
      </Button>
    </div>
  )
}
