'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calculator, Save, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface InventoryItem {
  id: number;
  name: string;
  sku?: string;
  current_stock: number;
  cost_price: number;
  selling_price: number;
  minimum_stock: number;
  maximum_stock: number;
  reorder_point: number;
  base_unit: string;
}

interface BulkUpdateOperation {
  type: 'PRICE_UPDATE' | 'STOCK_ADJUSTMENT' | 'REORDER_LEVELS' | 'PERCENTAGE_MARKUP';
  field?: string;
  value?: number;
  percentage?: number;
}

interface UpdateItem {
  id: number;
  name: string;
  current_value: number;
  new_value: number;
  selected: boolean;
}

export default function BulkInventoryUpdate() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [updateItems, setUpdateItems] = useState<UpdateItem[]>([]);
  const [operation, setOperation] = useState<BulkUpdateOperation>({ type: 'PRICE_UPDATE' });
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const restaurantId = 1;

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await invoke('get_inventory_items', { restaurantId }) as {
        success: boolean;
        data?: InventoryItem[];
      };

      if (response.success && response.data) {
        setItems(response.data);
      }
    } catch (error) {
      console.error('Failed to load inventory items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (itemId: number, selected: boolean) => {
    const newSelected = new Set(selectedItems);
    if (selected) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const filteredItems = getFilteredItems();
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const getFilteredItems = () => {
    return items.filter(item =>
      !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const calculateNewValue = (item: InventoryItem): number => {
    switch (operation.type) {
      case 'PRICE_UPDATE':
        return operation.field === 'cost_price' ? (operation.value || 0) : (operation.value || 0);
      case 'STOCK_ADJUSTMENT':
        return item.current_stock + (operation.value || 0);
      case 'REORDER_LEVELS':
        if (operation.field === 'minimum_stock') return operation.value || 0;
        if (operation.field === 'maximum_stock') return operation.value || 0;
        if (operation.field === 'reorder_point') return operation.value || 0;
        return 0;
      case 'PERCENTAGE_MARKUP':
        if (operation.field === 'cost_price') {
          return item.cost_price * (1 + (operation.percentage || 0) / 100);
        }
        if (operation.field === 'selling_price') {
          return item.selling_price * (1 + (operation.percentage || 0) / 100);
        }
        return 0;
      default:
        return 0;
    }
  };

  const getCurrentValue = (item: InventoryItem): number => {
    switch (operation.type) {
      case 'PRICE_UPDATE':
        return operation.field === 'cost_price' ? item.cost_price : item.selling_price;
      case 'STOCK_ADJUSTMENT':
        return item.current_stock;
      case 'REORDER_LEVELS':
        if (operation.field === 'minimum_stock') return item.minimum_stock;
        if (operation.field === 'maximum_stock') return item.maximum_stock;
        if (operation.field === 'reorder_point') return item.reorder_point;
        return 0;
      case 'PERCENTAGE_MARKUP':
        return operation.field === 'cost_price' ? item.cost_price : item.selling_price;
      default:
        return 0;
    }
  };

  const generatePreview = () => {
    const selectedItemsData = items.filter(item => selectedItems.has(item.id));
    const preview = selectedItemsData.map(item => ({
      id: item.id,
      name: item.name,
      current_value: getCurrentValue(item),
      new_value: calculateNewValue(item),
      selected: true
    }));
    setUpdateItems(preview);
    setShowPreview(true);
  };

  const executeUpdate = async () => {
    setUpdating(true);
    try {
      updateItems.filter(item => item.selected).map(item => ({
        item_id: item.id,
        new_value: item.new_value,
        operation_type: operation.type,
        field: operation.field
      }));

      // This would call a backend command to perform bulk update
      // For now, we'll simulate the update process
      // console.log('Executing bulk update:', updates);

      // Reload items after update
      await loadItems();
      setShowPreview(false);
      setSelectedItems(new Set());
      setUpdateItems([]);
    } catch (error) {
      console.error('Failed to execute bulk update:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getOperationDescription = () => {
    switch (operation.type) {
      case 'PRICE_UPDATE':
        return `Update ${operation.field === 'cost_price' ? 'cost prices' : 'selling prices'} to ₹${operation.value || 0}`;
      case 'STOCK_ADJUSTMENT': {
        const adjustment = operation.value || 0;
        return `${adjustment >= 0 ? 'Increase' : 'Decrease'} stock by ${Math.abs(adjustment)} units`;
      }
      case 'REORDER_LEVELS': {
        const field = operation.field === 'minimum_stock' ? 'minimum stock' :
                     operation.field === 'maximum_stock' ? 'maximum stock' : 'reorder point';
        return `Update ${field} to ${operation.value || 0}`;
      }
      case 'PERCENTAGE_MARKUP': {
        const priceType = operation.field === 'cost_price' ? 'cost prices' : 'selling prices';
        return `Apply ${operation.percentage || 0}% markup to ${priceType}`;
      }
      default:
        return 'Select an operation';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const filteredItems = getFilteredItems();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Bulk Inventory Update</h1>
        <div className="text-sm text-gray-600">
          {selectedItems.size} of {filteredItems.length} items selected
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Update Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="operation_type">Operation Type</Label>
              <Select
                value={operation.type}
                onValueChange={(value: string | null) => setOperation({ type: value as 'PRICE_UPDATE' | 'STOCK_ADJUSTMENT' | 'REORDER_LEVELS' | 'PERCENTAGE_MARKUP' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRICE_UPDATE">Price Update</SelectItem>
                  <SelectItem value="STOCK_ADJUSTMENT">Stock Adjustment</SelectItem>
                  <SelectItem value="REORDER_LEVELS">Reorder Levels</SelectItem>
                  <SelectItem value="PERCENTAGE_MARKUP">Percentage Markup</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {operation.type === 'PRICE_UPDATE' && (
              <>
                <div>
                  <Label htmlFor="price_field">Price Field</Label>
                  <Select
                    value={operation.field || ''}
                    onValueChange={(value: string | null) => setOperation(prev => ({ ...prev, field: value || undefined }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cost_price">Cost Price</SelectItem>
                      <SelectItem value="selling_price">Selling Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="price_value">New Price (₹)</Label>
                  <Input
                    id="price_value"
                    type="number"
                    step="0.01"
                    value={operation.value || ''}
                    onChange={(e) => setOperation(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </>
            )}

            {operation.type === 'STOCK_ADJUSTMENT' && (
              <div>
                <Label htmlFor="stock_adjustment">Stock Adjustment</Label>
                <Input
                  id="stock_adjustment"
                  type="number"
                  step="0.01"
                  placeholder="Enter positive or negative value"
                  value={operation.value || ''}
                  onChange={(e) => setOperation(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            )}

            {operation.type === 'REORDER_LEVELS' && (
              <>
                <div>
                  <Label htmlFor="reorder_field">Level Type</Label>
                  <Select
                    value={operation.field || ''}
                    onValueChange={(value: string | null) => setOperation(prev => ({ ...prev, field: value || undefined }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimum_stock">Minimum Stock</SelectItem>
                      <SelectItem value="maximum_stock">Maximum Stock</SelectItem>
                      <SelectItem value="reorder_point">Reorder Point</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="level_value">New Level</Label>
                  <Input
                    id="level_value"
                    type="number"
                    step="0.01"
                    value={operation.value || ''}
                    onChange={(e) => setOperation(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </>
            )}

            {operation.type === 'PERCENTAGE_MARKUP' && (
              <>
                <div>
                  <Label htmlFor="markup_field">Price Field</Label>
                  <Select
                    value={operation.field || ''}
                    onValueChange={(value: string | null) => setOperation(prev => ({ ...prev, field: value || undefined }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cost_price">Cost Price</SelectItem>
                      <SelectItem value="selling_price">Selling Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="markup_percentage">Markup Percentage (%)</Label>
                  <Input
                    id="markup_percentage"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 10 for 10% increase, -5 for 5% decrease"
                    value={operation.percentage || ''}
                    onChange={(e) => setOperation(prev => ({ ...prev, percentage: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </>
            )}

            <div className="pt-4 border-t">
              <div className="text-sm text-gray-600 mb-3">Operation Summary:</div>
              <div className="text-sm font-medium p-3 bg-blue-50 rounded">
                {getOperationDescription()}
              </div>
            </div>

            <Button 
              onClick={generatePreview} 
              disabled={selectedItems.size === 0}
              className="w-full"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Preview Changes
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Select Items for Update</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={() => handleSelectAll(selectedItems.size !== filteredItems.length)} variant="outline" size="sm">
                {selectedItems.size === filteredItems.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading items...</span>
              </div>
            ) : (
              <div className="rounded-md border max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Cost Price</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            {item.sku && <div className="text-sm text-gray-600">SKU: {item.sku}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.current_stock} {item.base_unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.cost_price)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.selling_price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Preview Bulk Update</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded">
              <div className="font-medium">Operation: {getOperationDescription()}</div>
              <div className="text-sm text-gray-600 mt-1">
                {updateItems.filter(item => item.selected).length} items will be updated
              </div>
            </div>

            <div className="rounded-md border max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={updateItems.every(item => item.selected)}
                        onCheckedChange={(checked) => {
                          setUpdateItems(prev => prev.map(item => ({ ...item, selected: !!checked })));
                        }}
                      />
                    </TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Current Value</TableHead>
                    <TableHead className="text-right">New Value</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {updateItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={(checked) => {
                            setUpdateItems(prev => prev.map(i => 
                              i.id === item.id ? { ...i, selected: !!checked } : i
                            ));
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        {operation.type.includes('PRICE') || operation.type === 'PERCENTAGE_MARKUP' ? 
                          formatCurrency(item.current_value) : 
                          `${item.current_value} units`
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        {operation.type.includes('PRICE') || operation.type === 'PERCENTAGE_MARKUP' ? 
                          formatCurrency(item.new_value) : 
                          `${item.new_value} units`
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.new_value > item.current_value ? 'default' : 'destructive'}>
                          {item.new_value > item.current_value ? '+' : ''}
                          {operation.type.includes('PRICE') || operation.type === 'PERCENTAGE_MARKUP' ? 
                            formatCurrency(item.new_value - item.current_value) : 
                            `${(item.new_value - item.current_value).toFixed(2)} units`
                          }
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={executeUpdate} disabled={updating || !updateItems.some(item => item.selected)}>
                <Save className="h-4 w-4 mr-2" />
                {updating ? 'Updating...' : 'Execute Update'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}