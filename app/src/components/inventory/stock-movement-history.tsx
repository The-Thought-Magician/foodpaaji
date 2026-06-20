'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Download, TrendingUp, TrendingDown, RotateCcw, RefreshCw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface StockMovement {
  id: number;
  inventory_item_id: number;
  item_name: string;
  item_sku?: string;
  movement_type: string;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  reference_type?: string;
  reference_id?: number;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
  user_id?: number;
  movement_date?: string;
  created_at?: string;
}

interface MovementSearchFilters {
  inventory_item_id?: number;
  movement_type?: string;
  start_date?: string;
  end_date?: string;
  page: number;
  limit: number;
}

interface MovementResponse {
  movements: StockMovement[];
  total: number;
  page: number;
  limit: number;
}

interface InventoryItem {
  id: number;
  name: string;
  sku?: string;
}

export default function StockMovementHistory() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filters, setFilters] = useState<MovementSearchFilters>({
    page: 1,
    limit: 50
  });
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const restaurantId = 1;

  useEffect(() => {
    loadInventoryItems();
    loadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadInventoryItems = async () => {
    try {
      const response = await invoke('get_inventory_items', { restaurantId }) as {
        success: boolean;
        data?: InventoryItem[];
      };

      if (response.success && response.data) {
        setInventoryItems(response.data);
      }
    } catch (error) {
      console.error('Failed to load inventory items:', error);
    }
  };

  const loadMovements = async () => {
    setLoading(true);
    try {
      const searchRequest = {
        restaurant_id: restaurantId,
        ...filters
      };

      const response = await invoke('get_stock_movements', { request: searchRequest }) as {
        success: boolean;
        data?: MovementResponse;
        error?: string;
      };

      if (response.success && response.data) {
        setMovements(response.data.movements);
        setTotalRecords(response.data.total);
      } else {
        console.error('Failed to load movements:', response.error);
        setMovements([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error('Failed to load movements:', error);
      setMovements([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof MovementSearchFilters, value: string | number | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : (value as number)
    }));
  };

  const clearFilters = () => {
    setFilters({ page: 1, limit: 50 });
    setSearchTerm('');
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'IN':
      case 'RETURN':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'OUT':
      case 'WASTE':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'ADJUSTMENT':
        return <RotateCcw className="h-4 w-4 text-blue-600" />;
      case 'TRANSFER':
        return <RefreshCw className="h-4 w-4 text-purple-600" />;
      default:
        return null;
    }
  };

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'IN':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'OUT':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'ADJUSTMENT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'TRANSFER':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'WASTE':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'RETURN':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
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

  const exportMovements = async () => {
    // This would typically export to CSV/Excel
    // console.log('Export functionality to be implemented');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Stock Movement History</h1>
        <div className="flex gap-2">
          <Button onClick={exportMovements} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={loadMovements} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="item_search">Search Items</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  id="item_search"
                  placeholder="Search by item name or SKU"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="item_filter">Specific Item</Label>
              <Select
                value={filters.inventory_item_id?.toString() || ''}
                onValueChange={(value: string | null) => handleFilterChange('inventory_item_id', value ? parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All items</SelectItem>
                  {inventoryItems
                    .filter(item => 
                      !searchTerm || 
                      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                    .map((item) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.name} {item.sku && `(${item.sku})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="movement_type">Movement Type</Label>
              <Select
                value={filters.movement_type || ''}
                onValueChange={(value: string | null) => handleFilterChange('movement_type', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="IN">Stock In</SelectItem>
                  <SelectItem value="OUT">Stock Out</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                  <SelectItem value="WASTE">Waste</SelectItem>
                  <SelectItem value="RETURN">Return</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => handleFilterChange('start_date', e.target.value || undefined)}
              />
            </div>

            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => handleFilterChange('end_date', e.target.value || undefined)}
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="page_size">Show:</Label>
              <Select
                value={filters.limit.toString()}
                onValueChange={(value: string | null) => handleFilterChange('limit', parseInt(value ?? '10'))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">records</span>
            </div>

            <Button onClick={clearFilters} variant="outline" size="sm">
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movement Records ({totalRecords} total)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading movements...</span>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead>Batch/Expiry</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.length > 0 ? (
                      movements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(movement.movement_date)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{movement.item_name}</div>
                              {movement.item_sku && (
                                <div className="text-sm text-gray-600">SKU: {movement.item_sku}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`flex items-center gap-1 w-fit ${getMovementTypeColor(movement.movement_type)}`}>
                              {getMovementIcon(movement.movement_type)}
                              {movement.movement_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {movement.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(movement.unit_cost)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(movement.total_cost)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {movement.batch_number && (
                                <div>Batch: {movement.batch_number}</div>
                              )}
                              {movement.expiry_date && (
                                <div>Exp: {new Date(movement.expiry_date).toLocaleDateString()}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm max-w-48 truncate" title={movement.notes || ''}>
                              {movement.notes || '-'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No stock movements found
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
                      onClick={() => handleFilterChange('page', Math.max(1, filters.page - 1))}
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
                            onClick={() => handleFilterChange('page', pageNum)}
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
                      onClick={() => handleFilterChange('page', Math.min(totalPages, filters.page + 1))}
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