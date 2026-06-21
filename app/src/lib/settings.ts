const SETTINGS_KEY = 'foodpaaji_settings'

interface AppSettings {
  restaurant_name: string
  upi_id: string
  gstin: string
  default_tax_percent: number
  service_charge_percent: number
  address: string
  phone: string
  receipt_footer: string
  loyalty_points_per_100: number
}

const defaults: AppSettings = {
  restaurant_name: 'FoodPaaji',
  upi_id: 'restaurant@upi',
  gstin: '',
  default_tax_percent: 5,
  service_charge_percent: 0,
  address: '',
  phone: '',
  receipt_footer: 'Thank you! Visit again',
  loyalty_points_per_100: 10,
}

export type { AppSettings }

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return defaults
  try {
    const s = localStorage.getItem(SETTINGS_KEY)
    return s ? { ...defaults, ...JSON.parse(s) } : defaults
  } catch {
    return defaults
  }
}
