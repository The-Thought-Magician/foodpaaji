import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChefHat, 
  FolderOpen, 
  DollarSign, 
  TrendingUp, 
  Star, 
  RefreshCw,
  Plus,
  Image
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import MenuCategories from './menu-categories';
import MenuItems from './menu-items';
import PricingManagement from './pricing-management';

interface MenuAnalytics {
  total_items: number;
  average_price: number;
  average_cost: number;
  average_margin: number;
  price_range: {
    min: number;
    max: number;
  };
}

interface MenuCategory {
  id: number;
  name: string;
  description?: string;
  parent_id?: number;
  image_path?: string;
  sort_order: number;
  is_active: boolean;
  display_in_menu: boolean;
  item_count?: number;
}

interface MenuItem {
  id: number;
  restaurant_id: number;
  category_id: number;
  name: string;
  description?: string;
  price: number;
  cost_price?: number;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_featured: boolean;
  is_available: boolean;
  is_active: boolean;
  image_path?: string;
}

export default function MenuDashboard() {
  const [analytics, setAnalytics] = useState<MenuAnalytics | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [featuredItems, setFeaturedItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const restaurantId = 1;

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setRefreshing(true);
    try {
      const [analyticsResponse, categoriesResponse] = await Promise.all([
        invoke('get_pricing_analytics', { restaurantId }) as Promise<{ success: boolean; data?: MenuAnalytics }>,
        invoke('get_menu_categories', { restaurantId }) as Promise<{ success: boolean; data?: MenuCategory[] }>
      ]);

      if (analyticsResponse.success && analyticsResponse.data) {
        setAnalytics(analyticsResponse.data);
      }

      if (categoriesResponse.success && categoriesResponse.data) {
        setCategories(categoriesResponse.data.filter(cat => cat.is_active));
        
        const featuredItemsPromises = categoriesResponse.data.slice(0, 3).map(category =>
          invoke('get_menu_items_by_category', { categoryId: category.id })
        );
        
        const featuredResults = await Promise.all(featuredItemsPromises);
        const allFeatured: MenuItem[] = [];
        
        featuredResults.forEach((result: any) => {
          if (result.success && result.data) {
            const featured = result.data.filter((item: MenuItem) => item.is_featured && item.is_active);
            allFeatured.push(...featured);
          }
        });
        
        setFeaturedItems(allFeatured.slice(0, 6));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const OverviewContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Menu Overview</h2>
        <Button onClick={loadDashboardData} disabled={refreshing} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <ChefHat className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total_items}</div>
              <p className="text-xs text-gray-600">Active menu items</p>
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
              <CardTitle className="text-sm font-medium">Avg Margin</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.average_margin.toFixed(1)}%</div>
              <p className="text-xs text-gray-600">Profit margin</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <FolderOpen className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories.length}</div>
              <p className="text-xs text-gray-600">Active categories</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Featured Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {featuredItems.length > 0 ? (
                featuredItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {item.image_path ? (
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Image className="h-5 w-5 text-gray-400" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <ChefHat className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="flex gap-2 mt-1">
                          {item.is_vegetarian && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">VEG</Badge>
                          )}
                          {item.is_vegan && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">VEGAN</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(item.price)}</div>
                      <Badge variant={item.is_available ? "default" : "secondary"} className="text-xs">
                        {item.is_available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No featured items found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={() => setActiveTab('categories')}
                variant="outline"
                className="justify-start"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Category
              </Button>
              <Button
                onClick={() => setActiveTab('items')}
                variant="outline"
                className="justify-start"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Menu Item
              </Button>
              <Button
                onClick={() => setActiveTab('pricing')}
                variant="outline"
                className="justify-start"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Manage Pricing
              </Button>
            </div>

            <div className="mt-6">
              <h4 className="font-medium mb-3">Categories</h4>
              <div className="space-y-2">
                {categories.slice(0, 5).map((category) => (
                  <div key={category.id} className="flex items-center justify-between text-sm">
                    <span>{category.name}</span>
                    <Badge variant="secondary">{category.item_count || 0}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Menu Management</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="items">Menu Items</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewContent />
        </TabsContent>

        <TabsContent value="categories">
          <MenuCategories 
            restaurantId={restaurantId}
            onCategoriesChange={() => loadDashboardData()}
          />
        </TabsContent>

        <TabsContent value="items">
          <MenuItems 
            restaurantId={restaurantId}
            categories={categories}
            onItemsChange={() => loadDashboardData()}
          />
        </TabsContent>

        <TabsContent value="pricing">
          <PricingManagement 
            restaurantId={restaurantId}
            categories={categories}
            onPricesChange={() => loadDashboardData()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}