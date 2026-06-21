'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface I18nContextType {
  locale: string
  setLocale: (locale: string) => void
  t: (key: string, fallback?: string) => string
  ready: boolean
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en', setLocale: () => {}, t: (_k, f) => f ?? '', ready: false
})

const EN_DEFAULTS: Record<string, string> = {
  'nav.dashboard': 'Dashboard', 'nav.billing': 'Billing', 'nav.pos': 'Point of Sale',
  'nav.employees': 'Employees', 'nav.customers': 'Customers', 'nav.inventory': 'Inventory',
  'nav.menu': 'Menu', 'nav.reservations': 'Reservations', 'nav.promotions': 'Promotions',
  'nav.reports': 'Reports', 'nav.settings': 'Settings', 'nav.feedback': 'Feedback',
  'common.save': 'Save', 'common.cancel': 'Cancel', 'common.delete': 'Delete',
  'common.search': 'Search', 'common.add': 'Add', 'common.edit': 'Edit',
  'common.close': 'Close', 'common.confirm': 'Confirm',
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState('en')
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [ready, setReady] = useState(false)

  const loadTranslations = useCallback(async (loc: string) => {
    if (loc === 'en') {
      setTranslations(EN_DEFAULTS)
      setReady(true)
      return
    }
    const res = await invoke<{ success: boolean; data: Record<string, string> }>('get_translations', { locale: loc }).catch(() => null)
    if (res?.success) setTranslations({ ...EN_DEFAULTS, ...res.data })
    else setTranslations(EN_DEFAULTS)
    setReady(true)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('locale') ?? 'en'
    setLocaleState(saved)
    loadTranslations(saved)
  }, [loadTranslations])

  const setLocale = (loc: string) => {
    setLocaleState(loc)
    localStorage.setItem('locale', loc)
    loadTranslations(loc)
  }

  const t = (key: string, fallback?: string) => translations[key] ?? fallback ?? key

  return <I18nContext.Provider value={{ locale, setLocale, t, ready }}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
