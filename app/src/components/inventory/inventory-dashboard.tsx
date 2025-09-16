import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, TrendingDown, TrendingUp, DollarSign, BarChart3, RefreshCw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';

interface InventoryAnalytics {
  total_items: number;
  total_inventory_value: number;
  low_stock_items: number;
  out_of_stock_items: number;
  overstocked_items: number;
  total_categories: number;
  average_stock_level: number;
}

interface LowStockItem {
  item_id: number;
  item_name: string;
  sku?: string;
  current_stock: number;
  reorder_point: number;
  shortage: number;
  days_of_stock?: number;
  supplier_name?: string;
}

interface TopMovingItem {
  item_id: number;
  item_name: string;
  total_quantity_out: number;
  total_value_out: number;
  movement_frequency: number;
  rank: number;
}

interface AlertSummary {
  total_alerts: number;
  critical_alerts: number;
  low_alerts: number;
  out_of_stock_alerts: number;
  unacknowledged_alerts: number;
}

export default function InventoryDashboard() {
  const [analytics, setAnalytics] = useState<InventoryAnalytics | null>(null);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [topMovingItems, setTopMovingItems] = useState<TopMovingItem[]>([]);
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const restaurantId = 1;

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setRefreshing(true);
    try {
      const [analyticsResponse, lowStockResponse, topMovingResponse, alertsResponse] = await Promise.all([
        invoke('get_inventory_analytics', { restaurantId }) as Promise<{ success: boolean; data?: InventoryAnalytics }>,
        invoke('get_low_stock_report', { restaurantId }) as Promise<{ success: boolean; data?: LowStockItem[] }>,
        invoke('get_top_moving_items_report', { 
          request: { restaurant_id: restaurantId, start_date: null, end_date: null },
          limit: 5
        }) as Promise<{ success: boolean; data?: TopMovingItem[] }>,
        invoke('get_alert_summary', { restaurantId }) as Promise<{ success: boolean; data?: AlertSummary }>
      ]);

      if (analyticsResponse.success && analyticsResponse.data) {
        setAnalytics(analyticsResponse.data);
      }

      if (lowStockResponse.success && lowStockResponse.data) {
        setLowStockItems(lowStockResponse.data.slice(0, 5));
      }

      if (topMovingResponse.success && topMovingResponse.data) {
        setTopMovingItems(topMovingResponse.data);
      }

      if (alertsResponse.success && alertsResponse.data) {
        setAlertSummary(alertsResponse.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStockStatusColor = (current: number, reorder: number): string => {
    if (current <= 0) return 'bg-red-500';
    if (current <= reorder) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getAlertLevelColor = (level: number): string => {
    if (level === 0) return 'text-green-600';
    if (level < 5) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inventory Dashboard</h1>
        <Button 
          onClick={loadDashboardData} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total_items}</div>
              <p className="text-xs text-gray-600">
                {analytics.total_categories} categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics.total_inventory_value)}
              </div>
              <p className="text-xs text-gray-600">
                Avg: {formatCurrency(analytics.total_inventory_value / analytics.total_items)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {analytics.low_stock_items}
              </div>
              <p className="text-xs text-gray-600">
                {analytics.out_of_stock_items} out of stock
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overstocked</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {analytics.overstocked_items}
              </div>
              <p className="text-xs text-gray-600">
                Above maximum levels
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {alertSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{alertSummary.total_alerts}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getAlertLevelColor(alertSummary.critical_alerts)}`}>
                  {alertSummary.critical_alerts}
                </div>
                <div className="text-sm text-gray-600">Critical</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getAlertLevelColor(alertSummary.low_alerts)}`}>
                  {alertSummary.low_alerts}
                </div>
                <div className="text-sm text-gray-600">Low</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getAlertLevelColor(alertSummary.out_of_stock_alerts)}`}>
                  {alertSummary.out_of_stock_alerts}
                </div>
                <div className="text-sm text-gray-600">Out of Stock</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getAlertLevelColor(alertSummary.unacknowledged_alerts)}`}>
                  {alertSummary.unacknowledged_alerts}
                </div>
                <div className="text-sm text-gray-600">Unacknowledged</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockItems.length > 0 ? (
                lowStockItems.map((item) => (
                  <div key={item.item_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{item.item_name}</div>
                      {item.sku && <div className="text-sm text-gray-600">SKU: {item.sku}</div>}
                      {item.supplier_name && (
                        <div className="text-sm text-gray-600">Supplier: {item.supplier_name}</div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStockStatusColor(item.current_stock, item.reorder_point)}`}></div>
                        <span className="font-medium">{item.current_stock}</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        Reorder: {item.reorder_point}
                      </div>
                      {item.days_of_stock && (
                        <div className="text-xs text-orange-600">
                          {Math.round(item.days_of_stock)} days left
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No low stock items found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Moving Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topMovingItems.length > 0 ? (
                topMovingItems.map((item, index) => (
                  <div key={item.item_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <div className="font-medium">{item.item_name}</div>
                        <div className="text-sm text-gray-600">
                          {item.movement_frequency} movements
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{item.total_quantity_out} units</div>
                      <div className="text-sm text-gray-600">
                        {formatCurrency(item.total_value_out)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No movement data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}