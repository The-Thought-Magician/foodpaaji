import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, Circle, Trash2, RefreshCw, Filter, Search, Package } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';

interface LowStockAlert {
  id: number;
  inventory_item_id: number;
  item_name: string;
  item_sku?: string;
  alert_level: string;
  current_stock: number;
  threshold_stock: number;
  is_acknowledged: boolean;
  acknowledged_by?: number;
  acknowledged_at?: string;
  created_at?: string;
}

interface AlertSummary {
  total_alerts: number;
  critical_alerts: number;
  low_alerts: number;
  out_of_stock_alerts: number;
  unacknowledged_alerts: number;
}

interface AlertSearchFilters {
  alert_level?: string;
  is_acknowledged?: boolean;
  page: number;
  limit: number;
}

interface AlertResponse {
  alerts: LowStockAlert[];
  total: number;
  page: number;
  limit: number;
}

export default function LowStockAlerts() {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState<AlertSearchFilters>({
    page: 1,
    limit: 25
  });
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const restaurantId = 1;

  useEffect(() => {
    loadAlerts();
    loadAlertSummary();
    const interval = setInterval(() => {
      loadAlerts();
      loadAlertSummary();
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const searchRequest = {
        restaurant_id: restaurantId,
        ...filters
      };

      const response = await invoke('get_low_stock_alerts', { request: searchRequest }) as {
        success: boolean;
        data?: AlertResponse;
        error?: string;
      };

      if (response.success && response.data) {
        setAlerts(response.data.alerts);
        setTotalRecords(response.data.total);
      } else {
        console.error('Failed to load alerts:', response.error);
        setAlerts([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setAlerts([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const loadAlertSummary = async () => {
    try {
      const response = await invoke('get_alert_summary', { restaurantId }) as {
        success: boolean;
        data?: AlertSummary;
      };

      if (response.success && response.data) {
        setAlertSummary(response.data);
      }
    } catch (error) {
      console.error('Failed to load alert summary:', error);
    }
  };

  const acknowledgeAlert = async (alertId: number) => {
    try {
      const request = {
        alert_id: alertId,
        user_id: 1, // TODO: Get from current user context
        restaurant_id: restaurantId
      };

      const response = await invoke('acknowledge_alert', { request }) as {
        success: boolean;
        error?: string;
      };

      if (response.success) {
        await loadAlerts();
        await loadAlertSummary();
      } else {
        console.error('Failed to acknowledge alert:', response.error);
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const bulkAcknowledge = async () => {
    if (selectedAlerts.size === 0) return;

    try {
      const request = {
        restaurant_id: restaurantId,
        user_id: 1, // TODO: Get from current user context
        alert_ids: Array.from(selectedAlerts)
      };

      const response = await invoke('bulk_acknowledge_alerts', { request }) as {
        success: boolean;
        error?: string;
      };

      if (response.success) {
        setSelectedAlerts(new Set());
        await loadAlerts();
        await loadAlertSummary();
      } else {
        console.error('Failed to bulk acknowledge:', response.error);
      }
    } catch (error) {
      console.error('Failed to bulk acknowledge:', error);
    }
  };

  const clearAcknowledgedAlerts = async () => {
    try {
      const response = await invoke('clear_acknowledged_alerts', { restaurantId }) as {
        success: boolean;
        error?: string;
      };

      if (response.success) {
        await loadAlerts();
        await loadAlertSummary();
      } else {
        console.error('Failed to clear alerts:', response.error);
      }
    } catch (error) {
      console.error('Failed to clear alerts:', error);
    }
  };

  const handleSelectAlert = (alertId: number, checked: boolean) => {
    const newSelected = new Set(selectedAlerts);
    if (checked) {
      newSelected.add(alertId);
    } else {
      newSelected.delete(alertId);
    }
    setSelectedAlerts(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = alerts.filter(alert => !alert.is_acknowledged).map(alert => alert.id);
      setSelectedAlerts(new Set(allIds));
    } else {
      setSelectedAlerts(new Set());
    }
  };

  const filteredAlerts = alerts.filter(alert =>
    !searchTerm ||
    alert.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (alert.item_sku && alert.item_sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'OUT_OF_STOCK':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'CRITICAL':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'LOW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'OUT_OF_STOCK':
        return <Package className="h-4 w-4 text-red-600" />;
      case 'CRITICAL':
      case 'LOW':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPages = Math.ceil(totalRecords / filters.limit);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Low Stock Alerts</h1>
        <div className="flex gap-2">
          <Button onClick={clearAcknowledgedAlerts} variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Acknowledged
          </Button>
          <Button onClick={loadAlerts} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {alertSummary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{alertSummary.total_alerts}</div>
              <div className="text-sm text-gray-600">Total Alerts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{alertSummary.out_of_stock_alerts}</div>
              <div className="text-sm text-gray-600">Out of Stock</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{alertSummary.critical_alerts}</div>
              <div className="text-sm text-gray-600">Critical</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{alertSummary.low_alerts}</div>
              <div className="text-sm text-gray-600">Low Stock</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{alertSummary.unacknowledged_alerts}</div>
              <div className="text-sm text-gray-600">Unacknowledged</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search Items</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name or SKU"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="alert_level">Alert Level</Label>
              <Select
                value={filters.alert_level || ''}
                onValueChange={(value) => setFilters(prev => ({ ...prev, alert_level: value || undefined, page: 1 }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All levels</SelectItem>
                  <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="LOW">Low Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.is_acknowledged !== undefined ? filters.is_acknowledged.toString() : ''}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  is_acknowledged: value === '' ? undefined : value === 'true',
                  page: 1
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="false">Unacknowledged</SelectItem>
                  <SelectItem value="true">Acknowledged</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="limit">Per Page</Label>
              <Select
                value={filters.limit.toString()}
                onValueChange={(value) => setFilters(prev => ({ ...prev, limit: parseInt(value), page: 1 }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedAlerts.size > 0 && (
            <div className="flex items-center justify-between mt-4 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-800">
                {selectedAlerts.size} alert(s) selected
              </span>
              <Button onClick={bulkAcknowledge} size="sm">
                <CheckCircle className="h-4 w-4 mr-2" />
                Acknowledge Selected
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert Details ({totalRecords} total)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading alerts...</span>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Checkbox
                          checked={selectedAlerts.size === alerts.filter(a => !a.is_acknowledged).length && alerts.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Alert Level</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Threshold</TableHead>
                      <TableHead className="text-right">Shortage</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlerts.length > 0 ? (
                      filteredAlerts.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell>
                            {!alert.is_acknowledged && (
                              <Checkbox
                                checked={selectedAlerts.has(alert.id)}
                                onCheckedChange={(checked) => handleSelectAlert(alert.id, !!checked)}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{alert.item_name}</div>
                              {alert.item_sku && (
                                <div className="text-sm text-gray-600">SKU: {alert.item_sku}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`flex items-center gap-1 w-fit ${getAlertLevelColor(alert.alert_level)}`}>
                              {getAlertIcon(alert.alert_level)}
                              {alert.alert_level.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {alert.current_stock}
                          </TableCell>
                          <TableCell className="text-right">
                            {alert.threshold_stock}
                          </TableCell>
                          <TableCell className="text-right text-red-600 font-medium">
                            {Math.max(0, alert.threshold_stock - alert.current_stock).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatDate(alert.created_at)}</div>
                          </TableCell>
                          <TableCell>
                            {alert.is_acknowledged ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Acknowledged
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                                <Circle className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {!alert.is_acknowledged && (
                              <Button
                                onClick={() => acknowledgeAlert(alert.id)}
                                size="sm"
                                variant="outline"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Acknowledge
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          No alerts found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Showing {Math.min((filters.page - 1) * filters.limit + 1, totalRecords)}-
                    {Math.min(filters.page * filters.limit, totalRecords)} of {totalRecords} records
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={filters.page <= 1}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, filters.page - 2)) + i;
                        return (
                          <Button
                            key={pageNum}
                            onClick={() => setFilters(prev => ({ ...prev, page: pageNum }))}
                            variant={filters.page === pageNum ? 'default' : 'outline'}
                            size="sm"
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      onClick={() => setFilters(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
                      disabled={filters.page >= totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}