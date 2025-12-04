import { ProductCategoryService } from '../services/product-category-service';
import { AgrovetInventoryService } from '../services/agrovet-inventory-service';

describe('Category System', () => {
  it('should create and manage product categories', async () => {
    // Test creating a new category
    const newCategory = await ProductCategoryService.createCategory({
      name: 'Test Category',
      description: 'A test category for unit testing',
      is_active: true,
      sort_order: 0
    });

    expect(newCategory).toHaveProperty('id');
    expect(newCategory.name).toBe('Test Category');
    expect(newCategory.description).toBe('A test category for unit testing');

    // Test retrieving categories
    const categories = await ProductCategoryService.getActiveCategories();
    expect(categories.length).toBeGreaterThan(0);
    expect(categories.some(cat => cat.name === 'Test Category')).toBe(true);

    // Test updating a category
    const updatedCategory = await ProductCategoryService.updateCategory(newCategory.id, {
      name: 'Updated Test Category',
      description: 'An updated test category'
    });

    expect(updatedCategory.name).toBe('Updated Test Category');
    expect(updatedCategory.description).toBe('An updated test category');

    // Test soft deleting a category
    await ProductCategoryService.deleteCategory(newCategory.id);
    
    // Verify category is no longer active
    const activeCategories = await ProductCategoryService.getActiveCategories();
    expect(activeCategories.some(cat => cat.id === newCategory.id)).toBe(false);

    // Test restoring a category
    const restoredCategory = await ProductCategoryService.restoreCategory(newCategory.id);
    expect(restoredCategory.is_active).toBe(true);

    // Clean up by permanently deleting
    await ProductCategoryService.permanentlyDeleteCategory(newCategory.id);
  });

  it('should associate products with categories', async () => {
    // Create a test category
    const category = await ProductCategoryService.createCategory({
      name: 'Product Test Category',
      description: 'A test category for product association',
      is_active: true,
      sort_order: 0
    });

    // Create a test product with the category
    const productData = {
      name: 'Test Product',
      description: 'A test product for category association',
      category: 'Product Test Category', // Required field
      category_id: category.id,
      unit: 'kg',
      current_stock: 100,
      reorder_level: 10,
      supplier: 'Test Supplier',
      cost_price: 50,
      is_credit_eligible: true
    };

    const product = await AgrovetInventoryService.createInventoryItem(productData);

    expect(product).toHaveProperty('id');
    expect(product.category_id).toBe(category.id);
    expect(product.category).toBe('Product Test Category');

    // Test retrieving products by category
    const productsInCategory = await ProductCategoryService.getProductsByCategoryId(category.id);
    expect(productsInCategory.length).toBe(1);
    expect(productsInCategory[0].id).toBe(product.id);

    // Clean up
    await AgrovetInventoryService.deleteInventoryItem(product.id);
    await ProductCategoryService.permanentlyDeleteCategory(category.id);
  });
});