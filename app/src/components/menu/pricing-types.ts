export interface PriceCalculation {
  menu_item_id: number
  item_name: string
  cost_price: number
  current_price: number
  suggested_price: number
  markup_amount: number
  markup_percentage: number
  profit_margin: number
}

export interface BulkPriceUpdateResult {
  total_items: number
  updated_items: number
  calculations: PriceCalculation[]
  total_revenue_impact: number
}

export interface PricingCategory {
  id: number
  name: string
  is_active: boolean
}

export type PricingStrategy = 'PercentageMarkup' | 'FixedMarkup' | 'CompetitivePricing' | 'ValueBased'

export interface PricingAnalytics {
  total_items: number
  average_price: number
  average_cost: number
  average_margin: number
  price_range: { min: number; max: number }
}

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)

export const strategyDescription = (s: PricingStrategy) => {
  const map: Record<PricingStrategy, string> = {
    PercentageMarkup: 'Apply percentage markup on cost price',
    FixedMarkup: 'Add fixed amount to cost price',
    CompetitivePricing: 'Price based on market competition',
    ValueBased: 'Price based on target profit margin',
  }
  return map[s]
}
