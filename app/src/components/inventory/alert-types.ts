export interface LowStockAlert {
  id: number
  inventory_item_id: number
  item_name: string
  item_sku?: string
  alert_level: string
  current_stock: number
  threshold_stock: number
  is_acknowledged: boolean
  acknowledged_by?: number
  acknowledged_at?: string
  created_at?: string
}

export interface AlertSummary {
  total_alerts: number
  critical_alerts: number
  low_alerts: number
  out_of_stock_alerts: number
  unacknowledged_alerts: number
}

export interface AlertFilters {
  alert_level?: string
  is_acknowledged?: boolean
  page: number
  limit: number
}

export const alertLevelColor = (level: string) => {
  const map: Record<string, string> = {
    OUT_OF_STOCK: 'bg-red-100 text-red-800 border-red-200',
    CRITICAL: 'bg-orange-100 text-orange-800 border-orange-200',
    LOW: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  }
  return map[level] ?? 'bg-muted text-muted-foreground border-border'
}

export const formatAlertDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
