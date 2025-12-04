import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Package, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ProductCategoryService, ProductCategory } from '@/services/product-category-service';

interface CategoryManagementProps {
  onCategoriesUpdate: () => void; // Simplified callback
}

const CategoryManagement: React.FC<CategoryManagementProps> = ({ onCategoriesUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryDesc, setEditingCategoryDesc] = useState('');
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load categories from the database
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const categoryData = await ProductCategoryService.getAllCategories();
      setCategories(categoryData);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast({
        title: "Error",
        description: "Category name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if category already exists (case insensitive)
      const normalizedNewCategory = newCategory.trim().toLowerCase();
      const categoryExists = categories.some(cat => cat.name.toLowerCase() === normalizedNewCategory);
      
      if (categoryExists) {
        toast({
          title: "Error",
          description: "Category already exists",
          variant: "destructive"
        });
        return;
      }

      // Create new category in database
      const newCategoryObj = await ProductCategoryService.createCategory({
        name: newCategory.trim(),
        description: '',
        is_active: true,
        sort_order: categories.length
      });

      // Update local state
      setCategories([...categories, newCategoryObj]);
      onCategoriesUpdate(); // Notify parent to refresh products
      setNewCategory('');
      
      toast({
        title: "Success",
        description: "Category added successfully"
      });
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive"
      });
    }
  };

  const handleEditCategory = async (categoryId: string, newName: string, newDescription: string) => {
    if (!newName.trim()) {
      toast({
        title: "Error",
        description: "Category name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if another category with the same name already exists
      const normalizedNewName = newName.trim().toLowerCase();
      const categoryExists = categories.some((cat) => 
        cat.name.toLowerCase() === normalizedNewName && cat.id !== categoryId
      );
      
      if (categoryExists) {
        toast({
          title: "Error",
          description: "A category with this name already exists",
          variant: "destructive"
        });
        return;
      }

      // Update category in database
      const updatedCategory = await ProductCategoryService.updateCategory(categoryId, {
        name: newName.trim(),
        description: newDescription.trim()
      });

      // Update local state
      const updatedCategories = categories.map(cat => 
        cat.id === categoryId ? updatedCategory : cat
      );
      setCategories(updatedCategories);
      onCategoriesUpdate(); // Notify parent to refresh products
      setEditingCategoryId(null);
      setEditingCategoryName('');
      setEditingCategoryDesc('');
      
      toast({
        title: "Success",
        description: "Category updated successfully"
      });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCategory = async (categoryToDelete: ProductCategory) => {
    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete the category "${categoryToDelete.name}"? This will not affect existing products.`)) {
      return;
    }

    try {
      // Soft delete category in database (set is_active to false)
      await ProductCategoryService.deleteCategory(categoryToDelete.id);

      // Update local state
      const updatedCategories = categories.map(cat => 
        cat.id === categoryToDelete.id ? { ...cat, is_active: false } : cat
      );
      setCategories(updatedCategories);
      onCategoriesUpdate(); // Notify parent to refresh products
      
      toast({
        title: "Success",
        description: "Category deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-600" />
              <span>Product Categories</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading categories...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />
            <span>Product Categories</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsEditing(!isEditing)}
            className="hover:bg-blue-50"
          >
            {isEditing ? 'Done' : 'Manage'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            {/* Add new category */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter new category name"
                  className="pl-10"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
              </div>
              <Button onClick={handleAddCategory} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Category list */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {categories.filter(cat => cat.is_active).length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Package className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <p>No categories yet</p>
                  <p className="text-sm">Add your first category above</p>
                </div>
              ) : (
                categories.filter(cat => cat.is_active).map((category) => (
                  <div 
                    key={category.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {editingCategoryId === category.id ? (
                      <div className="flex gap-2 flex-1 flex-col">
                        <div className="flex gap-2">
                          <Tag className="w-4 h-4 text-gray-400 mt-2" />
                          <Input
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            placeholder="Category name"
                            autoFocus
                            className="flex-1"
                          />
                        </div>
                        <div className="flex gap-2 ml-6">
                          <Input
                            value={editingCategoryDesc}
                            onChange={(e) => setEditingCategoryDesc(e.target.value)}
                            placeholder="Description (optional)"
                            className="flex-1"
                          />
                          <Button 
                            size="sm" 
                            onClick={() => handleEditCategory(category.id, editingCategoryName, editingCategoryDesc)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setEditingCategoryId(null);
                              setEditingCategoryName('');
                              setEditingCategoryDesc('');
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-blue-500" />
                          <div>
                            <span className="font-medium">{category.name}</span>
                            {category.description && (
                              <p className="text-xs text-gray-500 mt-1">{category.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setEditingCategoryId(category.id);
                              setEditingCategoryName(category.name);
                              setEditingCategoryDesc(category.description || '');
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDeleteCategory(category)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.filter(cat => cat.is_active).length === 0 ? (
              <div className="text-center py-4 text-gray-500 w-full">
                <Package className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p>No categories defined</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditing(true)}
                  className="mt-2"
                >
                  Add Categories
                </Button>
              </div>
            ) : (
              categories.filter(cat => cat.is_active).map((category) => (
                <span 
                  key={category.id} 
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                >
                  <Tag className="w-3 h-3 mr-1.5" />
                  {category.name}
                </span>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryManagement;