import { AgrovetProduct, ProductPackaging } from '@/services/agrovet-inventory-service';

export interface ValidationError {
  field: string;
  message: string;
}

export const validateProductForm = (formData: Partial<AgrovetProduct>, packagingData: Partial<ProductPackaging>[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Validate required fields
  if (!formData.name?.trim()) {
    errors.push({ field: 'name', message: 'Product name is required' });
  }

  if (!formData.category?.trim()) {
    errors.push({ field: 'category', message: 'Category is required' });
  }

  if (!formData.unit?.trim()) {
    errors.push({ field: 'unit', message: 'Unit of measure is required' });
  }

  if (!formData.supplier?.trim()) {
    errors.push({ field: 'supplier', message: 'Supplier is required' });
  }

  // Validate numeric fields (only if they are provided)
  if (formData.current_stock != null && formData.current_stock < 0) {
    errors.push({ field: 'current_stock', message: 'Current stock must be a non-negative number' });
  }

  if (formData.reorder_level != null && formData.reorder_level < 0) {
    errors.push({ field: 'reorder_level', message: 'Reorder level must be a non-negative number' });
  }

  if (formData.cost_price != null && formData.cost_price < 0) {
    errors.push({ field: 'cost_price', message: 'Cost price must be a non-negative number' });
  }

  // Validate packaging options
  for (let i = 0; i < packagingData.length; i++) {
    const pkg = packagingData[i];

    if (!pkg.name?.trim()) {
      errors.push({ field: `packaging_${i}_name`, message: 'Package name is required' });
    }

    if (pkg.weight == null || pkg.weight <= 0) {
      errors.push({ field: `packaging_${i}_weight`, message: 'Package weight must be a positive number' });
    }

    if (!pkg.unit?.trim()) {
      errors.push({ field: `packaging_${i}_unit`, message: 'Package unit is required' });
    }

    if (pkg.price == null || pkg.price < 0) {
      errors.push({ field: `packaging_${i}_price`, message: 'Package price must be a non-negative number' });
    }
  }

  return errors;
};

export const getErrorMessage = (errors: ValidationError[], field: string): string | undefined => {
  const error = errors.find(err => err.field === field);
  return error?.message;
};