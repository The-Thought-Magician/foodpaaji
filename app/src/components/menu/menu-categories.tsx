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
import { 
  FolderOpen, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';

interface MenuCategory {
  id?: number;
  restaurant_id: number;
  name: string;
  description?: string;
  parent_id?: number;
  slug: string;
  image_path?: string;
  sort_order: number;
  is_active: boolean;
  display_in_menu: boolean;
  created_at?: string;
  updated_at?: string;
}

interface MenuCategoriesProps {
  restaurantId: number;
  onCategoriesChange: () => void;
}

export default function MenuCategories({ restaurantId, onCategoriesChange }: MenuCategoriesProps) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [formData, setFormData] = useState<Partial<MenuCategory>>({
    restaurant_id: restaurantId,
    name: '',
    description: '',
    parent_id: undefined,
    sort_order: 0,
    is_active: true,
    display_in_menu: true,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    loadCategories();
  }, [restaurantId]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await invoke('get_menu_categories', { restaurantId }) as { 
        success: boolean; 
        data?: MenuCategory[] 
      };
      
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCategory) {
        const response = await invoke('update_menu_category', {
          id: editingCategory.id,
          request: formData
        }) as { success: boolean };
        
        if (response.success) {
          await handleImageUpload(editingCategory.id);
          resetForm();
          loadCategories();
          onCategoriesChange();
        }
      } else {
        const response = await invoke('create_menu_category', {
          request: formData
        }) as { success: boolean; data?: MenuCategory };
        
        if (response.success && response.data) {
          await handleImageUpload(response.data.id);
          resetForm();
          loadCategories();
          onCategoriesChange();
        }
      }
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  };

  const handleImageUpload = async (categoryId?: number) => {
    if (!selectedImage || !categoryId) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        await invoke('upload_menu_category_image', {
          request: {
            category_id: categoryId,
            restaurant_id: restaurantId,
            image_data: e.target?.result as string,
            file_name: selectedImage.name,
            compress: true,
            max_width: 400,
            max_height: 300,
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

  const handleEdit = (category: MenuCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      parent_id: category.parent_id,
      sort_order: category.sort_order,
      is_active: category.is_active,
      display_in_menu: category.display_in_menu,
    });
    setShowForm(true);
  };

  const handleDelete = async (categoryId: number) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        const response = await invoke('delete_menu_category', { id: categoryId }) as { success: boolean };
        if (response.success) {
          loadCategories();
          onCategoriesChange();
        }
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      restaurant_id: restaurantId,
      name: '',
      description: '',
      parent_id: undefined,
      sort_order: 0,
      is_active: true,
      display_in_menu: true,
    });
    setEditingCategory(null);
    setSelectedImage(null);
    setImagePreview('');
    setShowForm(false);
  };

  const getParentName = (parentId?: number) => {
    if (!parentId) return 'Root Category';
    const parent = categories.find(cat => cat.id === parentId);
    return parent?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Menu Categories</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(category)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(category.id!)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {category.image_path && (
                <div className="mb-3 w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
              
              {category.description && (
                <p className="text-sm text-gray-600 mb-3">{category.description}</p>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Parent:</span>
                  <span>{getParentName(category.parent_id)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sort Order:</span>
                  <span>{category.sort_order}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Badge variant={category.is_active ? "default" : "secondary"}>
                    {category.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant={category.display_in_menu ? "default" : "secondary"}>
                    {category.display_in_menu ? (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        Visible
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3 mr-1" />
                        Hidden
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="parent">Parent Category</Label>
              <Select
                value={formData.parent_id?.toString()}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  parent_id: value === 'none' ? undefined : parseInt(value) 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Root Category</SelectItem>
                  {categories
                    .filter(cat => cat.id !== editingCategory?.id)
                    .map(category => (
                    <SelectItem key={category.id} value={category.id!.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="image">Category Image</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                />
                <Button type="button" variant="outline" size="sm">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
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
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
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
                  id="display_in_menu"
                  checked={formData.display_in_menu}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, display_in_menu: checked }))}
                />
                <Label htmlFor="display_in_menu">Show in Menu</Label>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingCategory ? 'Update' : 'Create'} Category
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