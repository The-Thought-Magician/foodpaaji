'use client'

import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Settings, Store, CreditCard, Percent, Download, Upload, FlaskConical } from 'lucide-react'
import { getSettings } from '@/lib/settings'

const SETTINGS_KEY = 'foodpaaji_settings'

type RestaurantSettings = ReturnType<typeof getSettings>

export default function SettingsPage() {
  const [settings, setSettings] = useState<RestaurantSettings>(getSettings)
  const [saved, setSaved] = useState(false)
  const [backupPath, setBackupPath] = useState('')
  const [restorePath, setRestorePath] = useState('')
  const [backupMsg, setBackupMsg] = useState('')
  const [seedMsg, setSeedMsg] = useState('')
  const [seeding, setSeeding] = useState(false)

  const runBackup = async () => {
    if (!backupPath.trim()) return
    try {
      const ok = await invoke<boolean>('backup_database', { targetPath: backupPath.trim() })
      setBackupMsg(ok ? 'Backup created successfully' : 'Backup failed')
    } catch (e) { setBackupMsg(`Error: ${e}`) }
    setTimeout(() => setBackupMsg(''), 3000)
  }

  const seedData = async () => {
    if (!confirm('This will insert demo menu items, inventory, and customers. Continue?')) return
    setSeeding(true)
    try {
      const res = await invoke<{ success: boolean; message?: string }>('seed_sample_data', { restaurantId: 1 })
      setSeedMsg(res.success ? (res.message ?? 'Demo data seeded successfully') : 'Seed failed')
    } catch (e) { setSeedMsg(`Error: ${e}`) }
    setSeeding(false)
    setTimeout(() => setSeedMsg(''), 4000)
  }

  const runRestore = async () => {
    if (!restorePath.trim()) return
    if (!confirm('Restore will overwrite current data. Continue?')) return
    try {
      const ok = await invoke<boolean>('restore_database', { sourcePath: restorePath.trim() })
      setBackupMsg(ok ? 'Restored successfully — restart app to apply' : 'Restore failed')
    } catch (e) { setBackupMsg(`Error: ${e}`) }
    setTimeout(() => setBackupMsg(''), 5000)
  }

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

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Download className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold">Database Backup & Restore</h3>
          </div>
          <div className="space-y-2">
            <Label>Backup — destination file path</Label>
            <div className="flex gap-2">
              <Input placeholder="/home/user/backup.db" value={backupPath} onChange={e => setBackupPath(e.target.value)} />
              <Button variant="outline" onClick={runBackup} disabled={!backupPath.trim()}>
                <Download className="w-4 h-4 mr-1" />Backup
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Restore — source file path</Label>
            <div className="flex gap-2">
              <Input placeholder="/home/user/backup.db" value={restorePath} onChange={e => setRestorePath(e.target.value)} />
              <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={runRestore} disabled={!restorePath.trim()}>
                <Upload className="w-4 h-4 mr-1" />Restore
              </Button>
            </div>
          </div>
          {backupMsg && <p className={`text-sm font-medium ${backupMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{backupMsg}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold">Demo Data</h3>
          </div>
          <p className="text-sm text-muted-foreground">Populate the app with sample menu items, inventory, customers, and tables to explore features.</p>
          <Button variant="outline" onClick={seedData} disabled={seeding}>
            <FlaskConical className="w-4 h-4 mr-1" />{seeding ? 'Seeding...' : 'Seed Demo Data'}
          </Button>
          {seedMsg && <p className={`text-sm font-medium ${seedMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{seedMsg}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
