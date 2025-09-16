import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  DollarSign, 
  TrendingUp, 
  Calculator, 
  BarChart3,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Target
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';

interface PriceCalculation {
  menu_item_id: number;
  item_name: string;
  cost_price: number;
  current_price: number;
  suggested_price: number;
  markup_amount: number;
  markup_percentage: number;
  profit_margin: number;
}

interface BulkPriceUpdateResult {
  total_items: number;
  updated_items: number;
  calculations: PriceCalculation[];
  total_revenue_impact: number;
}

interface MenuCategory {
  id: number;
  name: string;
  is_active: boolean;
}

interface PricingManagementProps {
  restaurantId: number;
  categories: MenuCategory[];
  onPricesChange: () => void;
}

type PricingStrategy = 'PercentageMarkup' | 'FixedMarkup' | 'CompetitivePricing' | 'ValueBased';

export default function PricingManagement({ restaurantId, categories, onPricesChange }: PricingManagementProps) {
  const [activeTab, setActiveTab] = useState('calculator');
  const [loading, setLoading] = useState(false);
  const [calculation, setCalculation] = useState<PriceCalculation | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkPriceUpdateResult | null>(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showCalculatorDialog, setShowCalculatorDialog] = useState(false);
  
  const [calculatorForm, setCalculatorForm] = useState({
    menu_item_id: 0,
    strategy: 'PercentageMarkup' as PricingStrategy,
    markup_percentage: 50,
    fixed_markup: 5,
    target_margin: 40,
  });

  const [bulkForm, setBulkForm] = useState({
    category_ids: [] as number[],
    menu_item_ids: [] as number[],
    strategy: 'PercentageMarkup' as PricingStrategy,
    markup_percentage: 50,
    fixed_markup: 5,
    target_margin: 40,
    apply_changes: false,
  });

  const [analytics, setAnalytics] = useState({
    total_items: 0,
    average_price: 0,
    average_cost: 0,
    average_margin: 0,
    price_range: { min: 0, max: 0 }
  });

  const [menuItems, setMenuItems] = useState<Array<{id: number; name: string; category_id: number}>>([]);

  useEffect(() => {
    loadAnalytics();
    loadMenuItems();
  }, [restaurantId]);

  const loadAnalytics = async () => {
    try {
      const response = await invoke('get_pricing_analytics', { restaurantId }) as {
        success: boolean;
        data?: typeof analytics;
      };
      
      if (response.success && response.data) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error('Failed to load pricing analytics:', error);
    }
  };

  const loadMenuItems = async () => {
    try {
      const allItems: Array<{id: number; name: string; category_id: number}> = [];
      
      for (const category of categories) {
        const response = await invoke('get_menu_items_by_category', {
          categoryId: category.id
        }) as { success: boolean; data?: Array<{id: number; name: string; category_id: number}> };
        
        if (response.success && response.data) {
          allItems.push(...response.data.map(item => ({
            id: item.id,
            name: item.name,
            category_id: category.id
          })));
        }
      }
      
      setMenuItems(allItems);
    } catch (error) {
      console.error('Failed to load menu items:', error);
    }
  };

  const handleCalculatePrice = async () => {
    setLoading(true);
    try {
      const response = await invoke('calculate_menu_item_price', {
        request: calculatorForm
      }) as { success: boolean; data?: PriceCalculation };
      
      if (response.success && response.data) {
        setCalculation(response.data);
      }
    } catch (error) {
      console.error('Failed to calculate price:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkCalculate = async () => {
    setLoading(true);
    try {
      const response = await invoke('bulk_calculate_prices', {
        request: {
          restaurant_id: restaurantId,
          ...bulkForm
        }
      }) as { success: boolean; data?: BulkPriceUpdateResult };
      
      if (response.success && response.data) {
        setBulkResult(response.data);
        if (bulkForm.apply_changes) {
          onPricesChange();
          loadAnalytics();
        }
      }
    } catch (error) {
      console.error('Failed to bulk calculate prices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCostPrices = async () => {
    setLoading(true);
    try {
      const response = await invoke('sync_cost_prices_from_recipes', { restaurantId }) as {
        success: boolean;
        message?: string;
      };
      
      if (response.success) {
        loadAnalytics();
        alert(response.message || 'Cost prices synchronized successfully');
      }
    } catch (error) {
      console.error('Failed to sync cost prices:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStrategyDescription = (strategy: PricingStrategy) => {
    switch (strategy) {
      case 'PercentageMarkup':
        return 'Apply percentage markup on cost price';
      case 'FixedMarkup':
        return 'Add fixed amount to cost price';
      case 'CompetitivePricing':
        return 'Price based on market competition';
      case 'ValueBased':
        return 'Price based on target profit margin';
      default:
        return '';
    }
  };

  const PricingOverview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Pricing Overview</h3>
        <Button onClick={loadAnalytics} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_items}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Price</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.average_price)}</div>
            <p className="text-xs text-gray-600">
              Range: {formatCurrency(analytics.price_range.min)} - {formatCurrency(analytics.price_range.max)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost</CardTitle>
            <Calculator className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.average_cost)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.average_margin.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => setShowCalculatorDialog(true)}
              className="w-full justify-start"
              variant="outline"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Price Calculator
            </Button>
            <Button
              onClick={() => setShowBulkDialog(true)}
              className="w-full justify-start"
              variant="outline"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Bulk Price Update
            </Button>
            <Button
              onClick={handleSyncCostPrices}
              disabled={loading}
              className="w-full justify-start"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Sync Cost Prices
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing Strategies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Percentage Markup</span>
                <Badge variant="secondary">Most Common</Badge>
              </div>
              <p className="text-sm text-gray-600">Apply percentage markup on cost price</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Fixed Markup</span>
                <Badge variant="outline">Simple</Badge>
              </div>
              <p className="text-sm text-gray-600">Add fixed amount to cost price</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Value Based</span>
                <Badge variant="outline">Advanced</Badge>
              </div>
              <p className="text-sm text-gray-600">Price based on target profit margin</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pricing Management</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tools">Pricing Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PricingOverview />
        </TabsContent>

        <TabsContent value="tools">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Price Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Calculate optimal pricing for individual menu items based on different strategies.
                </p>
                <Button onClick={() => setShowCalculatorDialog(true)} className="w-full">
                  Open Calculator
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Bulk Price Update
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Update prices for multiple items simultaneously using various pricing strategies.
                </p>
                <Button onClick={() => setShowBulkDialog(true)} className="w-full">
                  Bulk Update
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showCalculatorDialog} onOpenChange={setShowCalculatorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Price Calculator</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Menu Item</Label>
              <Select
                value={calculatorForm.menu_item_id.toString()}
                onValueChange={(value) => setCalculatorForm(prev => ({ 
                  ...prev, 
                  menu_item_id: parseInt(value) 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select menu item" />
                </SelectTrigger>
                <SelectContent>
                  {menuItems.map(item => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Pricing Strategy</Label>
              <Select
                value={calculatorForm.strategy}
                onValueChange={(value) => setCalculatorForm(prev => ({ 
                  ...prev, 
                  strategy: value as PricingStrategy 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PercentageMarkup">Percentage Markup</SelectItem>
                  <SelectItem value="FixedMarkup">Fixed Markup</SelectItem>
                  <SelectItem value="CompetitivePricing">Competitive Pricing</SelectItem>
                  <SelectItem value="ValueBased">Value Based</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600 mt-1">
                {getStrategyDescription(calculatorForm.strategy)}
              </p>
            </div>

            {calculatorForm.strategy === 'PercentageMarkup' && (
              <div>
                <Label>Markup Percentage (%)</Label>
                <Input
                  type="number"
                  value={calculatorForm.markup_percentage}
                  onChange={(e) => setCalculatorForm(prev => ({ 
                    ...prev, 
                    markup_percentage: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>
            )}

            {calculatorForm.strategy === 'FixedMarkup' && (
              <div>
                <Label>Fixed Markup Amount (₹)</Label>
                <Input
                  type="number"
                  value={calculatorForm.fixed_markup}
                  onChange={(e) => setCalculatorForm(prev => ({ 
                    ...prev, 
                    fixed_markup: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>
            )}

            {calculatorForm.strategy === 'ValueBased' && (
              <div>
                <Label>Target Margin (%)</Label>
                <Input
                  type="number"
                  value={calculatorForm.target_margin}
                  onChange={(e) => setCalculatorForm(prev => ({ 
                    ...prev, 
                    target_margin: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleCalculatePrice} 
                disabled={loading || calculatorForm.menu_item_id === 0}
                className="flex-1"
              >
                {loading ? 'Calculating...' : 'Calculate'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setCalculation(null);
                  setShowCalculatorDialog(false);
                }}
              >
                Close
              </Button>
            </div>

            {calculation && (
              <div className="border rounded-lg p-4 space-y-2">
                <h4 className="font-medium">{calculation.item_name}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Cost Price:</div>
                  <div>{formatCurrency(calculation.cost_price)}</div>
                  <div>Current Price:</div>
                  <div>{formatCurrency(calculation.current_price)}</div>
                  <div className="font-medium">Suggested Price:</div>
                  <div className="font-medium text-green-600">{formatCurrency(calculation.suggested_price)}</div>
                  <div>Profit Margin:</div>
                  <div>{calculation.profit_margin.toFixed(1)}%</div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Price Update</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Categories to Update</Label>
              <Select
                onValueChange={(value) => {
                  const categoryIds = value === 'all' 
                    ? categories.map(cat => cat.id) 
                    : [parseInt(value)];
                  setBulkForm(prev => ({ ...prev, category_ids: categoryIds }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Pricing Strategy</Label>
              <Select
                value={bulkForm.strategy}
                onValueChange={(value) => setBulkForm(prev => ({ 
                  ...prev, 
                  strategy: value as PricingStrategy 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PercentageMarkup">Percentage Markup</SelectItem>
                  <SelectItem value="FixedMarkup">Fixed Markup</SelectItem>
                  <SelectItem value="CompetitivePricing">Competitive Pricing</SelectItem>
                  <SelectItem value="ValueBased">Value Based</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bulkForm.strategy === 'PercentageMarkup' && (
              <div>
                <Label>Markup Percentage (%)</Label>
                <Input
                  type="number"
                  value={bulkForm.markup_percentage}
                  onChange={(e) => setBulkForm(prev => ({ 
                    ...prev, 
                    markup_percentage: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="apply_changes"
                checked={bulkForm.apply_changes}
                onChange={(e) => setBulkForm(prev => ({ ...prev, apply_changes: e.target.checked }))}
              />
              <Label htmlFor="apply_changes">Apply changes immediately</Label>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleBulkCalculate} 
                disabled={loading || bulkForm.category_ids.length === 0}
                className="flex-1"
              >
                {loading ? 'Processing...' : bulkForm.apply_changes ? 'Update Prices' : 'Preview Changes'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setBulkResult(null);
                  setShowBulkDialog(false);
                }}
              >
                Close
              </Button>
            </div>

            {bulkResult && (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Update Results</h4>
                  <Badge variant={bulkResult.updated_items > 0 ? "default" : "secondary"}>
                    {bulkResult.updated_items}/{bulkResult.total_items} Updated
                  </Badge>
                </div>
                
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Total Revenue Impact:</span>
                    <span className={bulkResult.total_revenue_impact > 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(Math.abs(bulkResult.total_revenue_impact))}
                      {bulkResult.total_revenue_impact > 0 ? ' increase' : ' decrease'}
                    </span>
                  </div>
                </div>

                {bulkResult.calculations.length > 0 && (
                  <div className="max-h-40 overflow-y-auto">
                    <div className="text-xs space-y-1">
                      {bulkResult.calculations.slice(0, 10).map((calc) => (
                        <div key={calc.menu_item_id} className="flex justify-between items-center py-1 border-b border-gray-100">
                          <span className="truncate flex-1">{calc.item_name}</span>
                          <div className="flex gap-2 text-right">
                            <span>{formatCurrency(calc.current_price)}</span>
                            <span>→</span>
                            <span className="text-green-600">{formatCurrency(calc.suggested_price)}</span>
                          </div>
                        </div>
                      ))}
                      {bulkResult.calculations.length > 10 && (
                        <div className="text-gray-500 text-center py-1">
                          +{bulkResult.calculations.length - 10} more items
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}