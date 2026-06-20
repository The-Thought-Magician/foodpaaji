const SETTINGS_KEY = 'foodpaaji_settings'

interface AppSettings {
  restaurant_name: string
  upi_id: string
  gstin: string
  default_tax_percent: number
  service_charge_percent: number
  address: string
  phone: string
}

const defaults: AppSettings = {
  restaurant_name: 'FoodPaaji',
  upi_id: 'restaurant@upi',
  gstin: '',
  default_tax_percent: 5,
  service_charge_percent: 0,
  address: '',
  phone: '',
}

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return defaults
  try {
    const s = localStorage.getItem(SETTINGS_KEY)
    return s ? { ...defaults, ...JSON.parse(s) } : defaults
  } catch {
    return defaults
  }
}
