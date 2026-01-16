import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Package, Tag, Building2, AlertCircle, Eye, Edit, Plus } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';

interface InventoryItem {
  id: number;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  category_id?: number;
  supplier_id?: number;
  unit_type: string;
  base_unit: string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  reorder_point: number;
  cost_price: number;
  selling_price: number;
  location?: string;
  is_active: boolean;
}

interface InventoryCategory {
  id: number;
  name: string;
  description?: string;
}

interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
}

interface SearchFilters {
  search?: string;
  category_id?: number;
  supplier_id?: number;
  low_stock_only?: boolean;
  page: number;
  limit: number;
}

interface SearchResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  limit: number;
}

export default function InventorySearch() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    page: 1,
    limit: 20
  });
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | null>(null);

  const restaurantId = 1;

  useEffect(() => {
    loadCategories();
    loadSuppliers();
  }, []);

  useEffect(() => {
    searchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadCategories = async () => {
    try {
      const response = await invoke('get_inventory_categories', { restaurantId }) as {
        success: boolean;
        data?: InventoryCategory[];
      };

      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await invoke('get_suppliers', { restaurantId }) as {
        success: boolean;
        data?: Supplier[];
      };

      if (response.success && response.data) {
        setSuppliers(response.data);
      }
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const searchItems = async () => {
    setLoading(true);
    try {
      const searchRequest = {
        restaurant_id: restaurantId,
        ...filters
      };

      const response = await invoke('search_inventory_items', { request: searchRequest }) as {
        success: boolean;
        data?: SearchResponse;
        error?: string;
      };

      if (response.success && response.data) {
        setItems(response.data.items);
        setTotalRecords(response.data.total);
      } else {
        console.error('Search failed:', response.error);
        setItems([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setItems([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string | number | boolean | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value
    }));
  };

  const clearFilters = () => {
    setFilters({ page: 1, limit: 20 });
    setSelectedCategory(null);
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800 border-red-200' };
    if (item.current_stock <= item.reorder_point) return { label: 'Low Stock', color: 'bg-orange-100 text-orange-800 border-orange-200' };
    if (item.current_stock > item.maximum_stock) return { label: 'Overstocked', color: 'bg-purple-100 text-purple-800 border-purple-200' };
    return { label: 'Normal', color: 'bg-green-100 text-green-800 border-green-200' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return '-';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || '-';
  };

  const getSupplierName = (supplierId?: number) => {
    if (!supplierId) return '-';
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || '-';
  };

  const totalPages = Math.ceil(totalRecords / filters.limit);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inventory Search & Browse</h1>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add New Item
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="search">Search Items</Label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Name, SKU, or barcode"
                    value={filters.search || ''}
                    onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={filters.category_id?.toString() || ''}
                  onValueChange={(value) => {
                    const categoryId = value ? parseInt(value) : undefined;
                    handleFilterChange('category_id', categoryId);
                    setSelectedCategory(categoryId ? categories.find(c => c.id === categoryId) || null : null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="supplier">Supplier</Label>
                <Select
                  value={filters.supplier_id?.toString() || ''}
                  onValueChange={(value) => handleFilterChange('supplier_id', value ? parseInt(value) : undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All suppliers</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="low_stock"
                  checked={filters.low_stock_only || false}
                  onChange={(e) => handleFilterChange('low_stock_only', e.target.checked || undefined)}
                />
                <Label htmlFor="low_stock">Show only low stock items</Label>
              </div>

              <div className="flex space-x-2">
                <Button onClick={clearFilters} variant="outline" size="sm" className="flex-1">
                  Clear All
                </Button>
                <Button onClick={searchItems} size="sm" className="flex-1">
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {selectedCategory && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Category Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="font-medium">{selectedCategory.name}</div>
                  {selectedCategory.description && (
                    <div className="text-sm text-gray-600">{selectedCategory.description}</div>
                  )}
                  <div className="text-sm text-gray-500">
                    {items.length} items in this category
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Search Results ({totalRecords} items found)
                {filters.search && (
                  <span className="text-base font-normal text-gray-600 ml-2">
                    for "{filters.search}"
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2">Searching...</span>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Details</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Stock Status</TableHead>
                          <TableHead className="text-right">Stock Level</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.length > 0 ? (
                          items.map((item) => {
                            const stockStatus = getStockStatus(item);
                            return (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium flex items-center gap-2">
                                      <Package className="h-4 w-4 text-gray-500" />
                                      {item.name}
                                    </div>
                                    {item.sku && (
                                      <div className="text-sm text-gray-600">SKU: {item.sku}</div>
                                    )}
                                    {item.description && (
                                      <div className="text-sm text-gray-500 max-w-48 truncate">{item.description}</div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="text-sm">{getCategoryName(item.category_id)}</div>
                                    <div className="text-xs text-gray-500">{getSupplierName(item.supplier_id)}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={stockStatus.color}>
                                    {item.current_stock <= item.reorder_point && (
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                    )}
                                    {stockStatus.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div>
                                    <div className="font-medium">{item.current_stock} {item.base_unit}</div>
                                    <div className="text-xs text-gray-500">
                                      Min: {item.minimum_stock} | Max: {item.maximum_stock}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div>
                                    <div className="font-medium">{formatCurrency(item.selling_price)}</div>
                                    <div className="text-xs text-gray-500">Cost: {formatCurrency(item.cost_price)}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3 text-gray-500" />
                                    <span className="text-sm">{item.location || 'Not set'}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline">
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="outline">
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                              {filters.search || filters.category_id || filters.supplier_id ? 
                                'No items found matching your search criteria' : 
                                'No inventory items found'
                              }
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
                        {Math.min(filters.page * filters.limit, totalRecords)} of {totalRecords} items
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
      </div>
    </div>
  );
}