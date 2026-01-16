import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calculator, Save, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';

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

interface AvailableUnits {
  weight_units: string[];
  volume_units: string[];
  length_units: string[];
  count_units: string[];
}

interface ConversionResult {
  original_quantity: number;
  original_unit: string;
  converted_quantity: number;
  converted_unit: string;
  conversion_factor: number;
}

interface InventoryItemFormData {
  name: string;
  description: string;
  sku: string;
  barcode: string;
  category_id: number | null;
  supplier_id: number | null;
  unit_type: string;
  base_unit: string;
  conversion_factor: number;
  minimum_stock: number;
  maximum_stock: number;
  reorder_point: number;
  cost_price: number;
  selling_price: number;
  tax_rate: number;
  expiry_tracking: boolean;
  batch_tracking: boolean;
  location: string;
}

interface InventoryItemFormProps {
  initialData?: Partial<InventoryItemFormData>;
  onSubmit: (data: InventoryItemFormData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export default function InventoryItemForm({ initialData, onSubmit, onCancel, isEditing = false }: InventoryItemFormProps) {
  const [formData, setFormData] = useState<InventoryItemFormData>({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    category_id: null,
    supplier_id: null,
    unit_type: 'weight',
    base_unit: 'kg',
    conversion_factor: 1.0,
    minimum_stock: 0,
    maximum_stock: 0,
    reorder_point: 0,
    cost_price: 0,
    selling_price: 0,
    tax_rate: 0,
    expiry_tracking: false,
    batch_tracking: false,
    location: '',
    ...initialData
  });

  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [availableUnits, setAvailableUnits] = useState<AvailableUnits | null>(null);
  const [conversionTest, setConversionTest] = useState({ quantity: 1, fromUnit: '', toUnit: '' });
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const restaurantId = 1;

  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      const [categoriesResponse, suppliersResponse, unitsResponse] = await Promise.all([
        invoke('get_inventory_categories', { restaurantId }) as Promise<{ success: boolean; data?: InventoryCategory[] }>,
        invoke('get_suppliers', { restaurantId }) as Promise<{ success: boolean; data?: Supplier[] }>,
        invoke('get_available_units') as Promise<{ success: boolean; data?: AvailableUnits }>
      ]);

      if (categoriesResponse.success && categoriesResponse.data) {
        setCategories(categoriesResponse.data);
      }

      if (suppliersResponse.success && suppliersResponse.data) {
        setSuppliers(suppliersResponse.data);
      }

      if (unitsResponse.success && unitsResponse.data) {
        setAvailableUnits(unitsResponse.data);
      }
    } catch (error) {
      console.error('Failed to load form data:', error);
    }
  };

  const handleInputChange = (field: keyof InventoryItemFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const testUnitConversion = async () => {
    if (!conversionTest.fromUnit || !conversionTest.toUnit || conversionTest.quantity <= 0) {
      return;
    }

    try {
      const response = await invoke('convert_units', {
        request: {
          restaurant_id: restaurantId,
          quantity: conversionTest.quantity,
          from_unit: conversionTest.fromUnit,
          to_unit: conversionTest.toUnit
        }
      }) as { success: boolean; data?: ConversionResult };

      if (response.success && response.data) {
        setConversionResult(response.data);
      }
    } catch (error) {
      console.error('Conversion test failed:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    }

    if (!formData.base_unit.trim()) {
      newErrors.base_unit = 'Base unit is required';
    }

    if (formData.conversion_factor <= 0) {
      newErrors.conversion_factor = 'Conversion factor must be greater than 0';
    }

    if (formData.cost_price < 0) {
      newErrors.cost_price = 'Cost price cannot be negative';
    }

    if (formData.selling_price < 0) {
      newErrors.selling_price = 'Selling price cannot be negative';
    }

    if (formData.minimum_stock < 0) {
      newErrors.minimum_stock = 'Minimum stock cannot be negative';
    }

    if (formData.maximum_stock < formData.minimum_stock) {
      newErrors.maximum_stock = 'Maximum stock must be greater than minimum stock';
    }

    if (formData.reorder_point < 0) {
      newErrors.reorder_point = 'Reorder point cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUnits = () => {
    if (!availableUnits) return [];
    
    switch (formData.unit_type) {
      case 'weight':
        return availableUnits.weight_units;
      case 'volume':
        return availableUnits.volume_units;
      case 'length':
        return availableUnits.length_units;
      case 'count':
        return availableUnits.count_units;
      default:
        return [];
    }
  };

  const calculateMargin = () => {
    if (formData.cost_price > 0 && formData.selling_price > formData.cost_price) {
      return ((formData.selling_price - formData.cost_price) / formData.selling_price * 100).toFixed(1);
    }
    return '0';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Inventory Item' : 'Add New Inventory Item'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter item name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                placeholder="Enter SKU"
              />
            </div>

            <div>
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => handleInputChange('barcode', e.target.value)}
                placeholder="Enter barcode"
              />
            </div>

            <div>
              <Label htmlFor="location">Storage Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g., Shelf A1, Freezer 2"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter item description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_id?.toString() || ''}
                onValueChange={(value) => handleInputChange('category_id', value ? parseInt(value) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
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
                value={formData.supplier_id?.toString() || ''}
                onValueChange={(value) => handleInputChange('supplier_id', value ? parseInt(value) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Units & Conversion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="unit_type">Unit Type</Label>
              <Select
                value={formData.unit_type}
                onValueChange={(value) => {
                  handleInputChange('unit_type', value);
                  const units = getCurrentUnits();
                  if (units.length > 0) {
                    handleInputChange('base_unit', units[0]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight">Weight</SelectItem>
                  <SelectItem value="volume">Volume</SelectItem>
                  <SelectItem value="length">Length</SelectItem>
                  <SelectItem value="count">Count</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="base_unit">Base Unit *</Label>
              <Select
                value={formData.base_unit}
                onValueChange={(value) => handleInputChange('base_unit', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getCurrentUnits().map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.base_unit && <p className="text-sm text-red-500 mt-1">{errors.base_unit}</p>}
            </div>

            <div>
              <Label htmlFor="conversion_factor">Conversion Factor</Label>
              <Input
                id="conversion_factor"
                type="number"
                step="0.0001"
                value={formData.conversion_factor}
                onChange={(e) => handleInputChange('conversion_factor', parseFloat(e.target.value) || 1)}
                className={errors.conversion_factor ? 'border-red-500' : ''}
              />
              {errors.conversion_factor && <p className="text-sm text-red-500 mt-1">{errors.conversion_factor}</p>}
            </div>
          </div>

          <Card className="bg-gray-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Unit Conversion Test
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input
                  type="number"
                  placeholder="Quantity"
                  value={conversionTest.quantity}
                  onChange={(e) => setConversionTest(prev => ({
                    ...prev,
                    quantity: parseFloat(e.target.value) || 0
                  }))}
                />
                <Select
                  value={conversionTest.fromUnit}
                  onValueChange={(value) => setConversionTest(prev => ({ ...prev, fromUnit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="From unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCurrentUnits().map((unit) => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={conversionTest.toUnit}
                  onValueChange={(value) => setConversionTest(prev => ({ ...prev, toUnit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="To unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCurrentUnits().map((unit) => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={testUnitConversion} variant="outline">
                  Convert
                </Button>
              </div>
              {conversionResult && (
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-sm">
                    <Badge className="mr-2">{conversionResult.original_quantity} {conversionResult.original_unit}</Badge>
                    =
                    <Badge className="mx-2">{conversionResult.converted_quantity} {conversionResult.converted_unit}</Badge>
                    (Factor: {conversionResult.conversion_factor})
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="minimum_stock">Minimum Stock</Label>
              <Input
                id="minimum_stock"
                type="number"
                step="0.01"
                value={formData.minimum_stock}
                onChange={(e) => handleInputChange('minimum_stock', parseFloat(e.target.value) || 0)}
                className={errors.minimum_stock ? 'border-red-500' : ''}
              />
              {errors.minimum_stock && <p className="text-sm text-red-500 mt-1">{errors.minimum_stock}</p>}
            </div>

            <div>
              <Label htmlFor="maximum_stock">Maximum Stock</Label>
              <Input
                id="maximum_stock"
                type="number"
                step="0.01"
                value={formData.maximum_stock}
                onChange={(e) => handleInputChange('maximum_stock', parseFloat(e.target.value) || 0)}
                className={errors.maximum_stock ? 'border-red-500' : ''}
              />
              {errors.maximum_stock && <p className="text-sm text-red-500 mt-1">{errors.maximum_stock}</p>}
            </div>

            <div>
              <Label htmlFor="reorder_point">Reorder Point</Label>
              <Input
                id="reorder_point"
                type="number"
                step="0.01"
                value={formData.reorder_point}
                onChange={(e) => handleInputChange('reorder_point', parseFloat(e.target.value) || 0)}
                className={errors.reorder_point ? 'border-red-500' : ''}
              />
              {errors.reorder_point && <p className="text-sm text-red-500 mt-1">{errors.reorder_point}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="cost_price">Cost Price (₹)</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => handleInputChange('cost_price', parseFloat(e.target.value) || 0)}
                className={errors.cost_price ? 'border-red-500' : ''}
              />
              {errors.cost_price && <p className="text-sm text-red-500 mt-1">{errors.cost_price}</p>}
            </div>

            <div>
              <Label htmlFor="selling_price">Selling Price (₹)</Label>
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => handleInputChange('selling_price', parseFloat(e.target.value) || 0)}
                className={errors.selling_price ? 'border-red-500' : ''}
              />
              {errors.selling_price && <p className="text-sm text-red-500 mt-1">{errors.selling_price}</p>}
            </div>

            <div>
              <Label htmlFor="tax_rate">Tax Rate (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                step="0.01"
                value={formData.tax_rate}
                onChange={(e) => handleInputChange('tax_rate', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label>Profit Margin</Label>
              <div className="p-2 bg-gray-100 rounded text-center font-medium">
                {calculateMargin()}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tracking Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="expiry_tracking"
              checked={formData.expiry_tracking}
              onCheckedChange={(checked) => handleInputChange('expiry_tracking', checked)}
            />
            <Label htmlFor="expiry_tracking">Enable expiry date tracking</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="batch_tracking"
              checked={formData.batch_tracking}
              onCheckedChange={(checked) => handleInputChange('batch_tracking', checked)}
            />
            <Label htmlFor="batch_tracking">Enable batch/lot tracking</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : isEditing ? 'Update Item' : 'Create Item'}
        </Button>
      </div>
    </form>
  );
}