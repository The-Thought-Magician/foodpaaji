import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChefHat,
  Plus,
  Edit,
  Trash2,
  Star,
  Image as ImageIcon,
  Clock,
  Leaf
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';

interface MenuItem {
  id?: number;
  restaurant_id: number;
  category_id: number;
  name: string;
  description?: string;
  short_description?: string;
  price: number;
  cost_price?: number;
  preparation_time?: number;
  calories?: number;
  image_path?: string;
  slug: string;
  sku?: string;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_spicy: boolean;
  spice_level: number;
  is_available: boolean;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

interface MenuCategory {
  id: number;
  name: string;
  is_active: boolean;
}

interface MenuItemsProps {
  restaurantId: number;
  categories: MenuCategory[];
  onItemsChange: () => void;
}

export default function MenuItems({ restaurantId, categories, onItemsChange }: MenuItemsProps) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    restaurant_id: restaurantId,
    category_id: 0,
    name: '',
    description: '',
    short_description: '',
    price: 0,
    preparation_time: 0,
    calories: 0,
    sku: '',
    is_vegetarian: false,
    is_vegan: false,
    is_gluten_free: false,
    is_spicy: false,
    spice_level: 0,
    is_available: true,
    is_active: true,
    is_featured: false,
    sort_order: 0,
  });

  useEffect(() => {
    if (categories.length > 0 && selectedCategory) {
      loadMenuItems(selectedCategory);
    }
  }, [selectedCategory, categories]);

  useEffect(() => {
    filterItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, searchTerm]);

  const loadMenuItems = async (categoryId: number) => {
    setLoading(true);
    try {
      const response = await invoke('get_menu_items_by_category', { 
        categoryId 
      }) as { success: boolean; data?: MenuItem[] };
      
      if (response.success && response.data) {
        setItems(response.data);
      }
    } catch (error) {
      console.error('Failed to load menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    if (!searchTerm) {
      setFilteredItems(items);
      return;
    }

    const filtered = items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredItems(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingItem) {
        const response = await invoke('update_menu_item', {
          id: editingItem.id,
          request: formData
        }) as { success: boolean };
        
        if (response.success) {
          await handleImageUpload(editingItem.id);
          resetForm();
          if (selectedCategory) loadMenuItems(selectedCategory);
          onItemsChange();
        }
      } else {
        const response = await invoke('create_menu_item', {
          request: formData
        }) as { success: boolean; data?: MenuItem };
        
        if (response.success && response.data) {
          await handleImageUpload(response.data.id);
          resetForm();
          if (selectedCategory) loadMenuItems(selectedCategory);
          onItemsChange();
        }
      }
    } catch (error) {
      console.error('Failed to save menu item:', error);
    }
  };

  const handleImageUpload = async (itemId?: number) => {
    if (!selectedImage || !itemId) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        await invoke('upload_menu_item_image', {
          request: {
            menu_item_id: itemId,
            restaurant_id: restaurantId,
            image_data: e.target?.result as string,
            file_name: selectedImage.name,
            compress: true,
            max_width: 800,
            max_height: 600,
            quality: 85
          }
        });
      } catch (error) {
        console.error('Failed to upload image:', error);
      }
    };
    reader.readAsDataURL(selectedImage);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData(item);
    setShowForm(true);
  };

  const handleDelete = async (itemId: number) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      try {
        const response = await invoke('delete_menu_item', { id: itemId }) as { success: boolean };
        if (response.success && selectedCategory) {
          loadMenuItems(selectedCategory);
          onItemsChange();
        }
      } catch (error) {
        console.error('Failed to delete menu item:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      restaurant_id: restaurantId,
      category_id: selectedCategory || 0,
      name: '',
      description: '',
      short_description: '',
      price: 0,
      preparation_time: 0,
      calories: 0,
      sku: '',
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: false,
      is_spicy: false,
      spice_level: 0,
      is_available: true,
      is_active: true,
      is_featured: false,
      sort_order: 0,
    });
    setEditingItem(null);
    setSelectedImage(null);
    setImagePreview('');
    setShowForm(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Menu Items</h2>
        <Button 
          onClick={() => setShowForm(true)}
          disabled={!selectedCategory}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Menu Item
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Label>Select Category</Label>
          <Select
            value={selectedCategory?.toString()}
            onValueChange={(value) => setSelectedCategory(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a category to view items" />
            </SelectTrigger>
            <SelectContent>
              {categories
                .filter(cat => cat.is_active)
                .map(category => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedCategory && (
          <div className="flex-1">
            <Label>Search Items</Label>
            <Input
              placeholder="Search by name, description, or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      {!selectedCategory ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <ChefHat className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Category Selected</h3>
              <p className="text-gray-600">Please select a category to view and manage menu items.</p>
            </div>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    {item.sku && <p className="text-sm text-gray-600">SKU: {item.sku}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(item.id!)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {item.image_path && (
                  <div className="mb-3 w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                
                {item.short_description && (
                  <p className="text-sm text-gray-600 mb-3">{item.short_description}</p>
                )}
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(item.price)}
                    </span>
                    {item.is_featured && (
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    )}
                  </div>
                  
                  {item.preparation_time && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="h-3 w-3" />
                      {item.preparation_time} mins
                    </div>
                  )}
                  
                  <div className="flex gap-1 flex-wrap">
                    {item.is_vegetarian && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        <Leaf className="h-3 w-3 mr-1" />
                        VEG
                      </Badge>
                    )}
                    {item.is_vegan && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        VEGAN
                      </Badge>
                    )}
                    {item.is_gluten_free && (
                      <Badge variant="secondary" className="text-xs">GF</Badge>
                    )}
                    {item.is_spicy && (
                      <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                        🌶️ {item.spice_level}/5
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Badge variant={item.is_available ? "default" : "secondary"}>
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </Badge>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div>
                  <Label htmlFor="name">Item Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category_id?.toString()}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      category_id: parseInt(value) 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter(cat => cat.is_active)
                        .map(category => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="short_description">Short Description</Label>
                  <Input
                    id="short_description"
                    value={formData.short_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                    placeholder="Brief description for menu display"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Full Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    placeholder="Detailed description with ingredients, preparation, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price (₹)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="Stock keeping unit"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <div>
                  <Label htmlFor="image">Item Image</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                  />
                  {imagePreview && (
                    <div className="mt-2 w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="preparation_time">Prep Time (minutes)</Label>
                    <Input
                      id="preparation_time"
                      type="number"
                      min="0"
                      value={formData.preparation_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, preparation_time: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="calories">Calories</Label>
                    <Input
                      id="calories"
                      type="number"
                      min="0"
                      value={formData.calories}
                      onChange={(e) => setFormData(prev => ({ ...prev, calories: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_spicy"
                      checked={formData.is_spicy}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_spicy: checked }))}
                    />
                    <Label htmlFor="is_spicy">Spicy</Label>
                  </div>
                  {formData.is_spicy && (
                    <div>
                      <Label htmlFor="spice_level">Spice Level (1-5)</Label>
                      <Input
                        id="spice_level"
                        type="number"
                        min="1"
                        max="5"
                        value={formData.spice_level}
                        onChange={(e) => setFormData(prev => ({ ...prev, spice_level: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_vegetarian"
                      checked={formData.is_vegetarian}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_vegetarian: checked }))}
                    />
                    <Label htmlFor="is_vegetarian">Vegetarian</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_vegan"
                      checked={formData.is_vegan}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_vegan: checked }))}
                    />
                    <Label htmlFor="is_vegan">Vegan</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_gluten_free"
                      checked={formData.is_gluten_free}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_gluten_free: checked }))}
                    />
                    <Label htmlFor="is_gluten_free">Gluten Free</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <div>
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_available"
                      checked={formData.is_available}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_available: checked }))}
                    />
                    <Label htmlFor="is_available">Available</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_featured"
                      checked={formData.is_featured}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                    />
                    <Label htmlFor="is_featured">Featured</Label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingItem ? 'Update' : 'Create'} Menu Item
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}