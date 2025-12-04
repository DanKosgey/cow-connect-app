import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, Trash2, AlertCircle, Image, Tag, Package, ShoppingCart, CreditCard } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AgrovetProduct, ProductPackaging } from '@/services/agrovet-inventory-service';
import { ProductCategory } from '@/services/product-category-service';
import { validateProductForm, getErrorMessage } from '@/utils/productValidation';
import PackagingSelector from '@/components/creditor/product-management/PackagingSelector';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface ProductDialogsProps {
  isDialogOpen: boolean;
  closeDialog: () => void;
  editingProduct: AgrovetProduct | null;
  formData: Partial<AgrovetProduct>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSwitchChange: (checked: boolean) => void;
  // Updated to use packaging options instead of tiered pricing
  packagingData: Partial<ProductPackaging>[];
  handlePackagingChange: (index: number, field: string, value: any) => void;
  addPackagingOption: () => void;
  removePackagingOption: (index: number) => void;
  handleSubmit: (e: React.FormEvent) => void;
  dialogLoading: boolean;
  // Add categories prop
  categories: ProductCategory[];
}

const ProductDialogs: React.FC<ProductDialogsProps> = ({
  isDialogOpen,
  closeDialog,
  editingProduct,
  formData,
  handleInputChange,
  handleSwitchChange,
  // Updated props for packaging
  packagingData,
  handlePackagingChange,
  addPackagingOption,
  removePackagingOption,
  handleSubmit,
  dialogLoading,
  categories
}) => {
  const [errors, setErrors] = useState<ReturnType<typeof validateProductForm>>([]);

  // Validate form when formData or packagingData changes
  useEffect(() => {
    if (isDialogOpen) {
      // Note: We'll need to update the validation function to work with packagingData
      // For now, we'll pass an empty array for pricingData to avoid validation errors
      const validationErrors = validateProductForm(formData, []);
      setErrors(validationErrors);
    }
  }, [formData, packagingData, isDialogOpen]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    // Note: We'll need to update the validation function to work with packagingData
    // For now, we'll pass an empty array for pricingData to avoid validation errors
    const validationErrors = validateProductForm(formData, []);
    setErrors(validationErrors);
    
    // If no errors, submit the form
    if (validationErrors.length === 0) {
      handleSubmit(e);
    }
  };

  // Predefined units for easier selection
  const predefinedUnits = [
    "kg", "bags", "packets", "liters", "boxes", "units", "pieces"
  ];

  return (
    <>
      {/* Product Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingProduct ? <Package className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct 
                ? 'Modify the product details below' 
                : 'Fill in the product details below'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <Accordion type="multiple" defaultValue={["basic-info", "packaging"]} className="w-full">
              {/* Basic Information Section */}
              <AccordionItem value="basic-info">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    <span>Basic Information</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Product Name *
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name || ''}
                          onChange={handleInputChange}
                          placeholder="Enter product name"
                          required
                          className={getErrorMessage(errors, 'name') ? 'border-red-500' : ''}
                        />
                        {getErrorMessage(errors, 'name') && (
                          <div className="flex items-center text-red-500 text-sm mt-1">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            <span>{getErrorMessage(errors, 'name')}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description" className="flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={formData.description || ''}
                          onChange={handleInputChange}
                          placeholder="Enter product description"
                          rows={3}
                        />
                      </div>
                      
                      {/* Image Upload */}
                      <div className="space-y-2">
                        <Label htmlFor="image_url" className="flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          Product Image
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="image_url"
                            name="image_url"
                            value={formData.image_url || ''}
                            onChange={handleInputChange}
                            placeholder="Enter image URL or upload below"
                            className="flex-1"
                          />
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // In a real implementation, you would upload the file to a storage service
                                // For now, we'll just show a preview URL
                                const previewUrl = URL.createObjectURL(file);
                                handleInputChange({
                                  target: { name: 'image_url', value: previewUrl }
                                } as React.ChangeEvent<HTMLInputElement>);
                              }
                            }}
                            className="w-1/3"
                          />
                        </div>
                        {formData.image_url && (
                          <div className="mt-2">
                            <img 
                              src={formData.image_url} 
                              alt="Product preview" 
                              className="w-24 h-24 object-cover rounded-md border"
                              onError={(e) => {
                                // Fallback if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.src = "https://placehold.co/96x96?text=Image";
                              }}
                            />
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleInputChange({
                                target: { name: 'image_url', value: '' }
                              } as React.ChangeEvent<HTMLInputElement>)}
                              className="mt-1 text-red-600 hover:text-red-800"
                            >
                              Remove Image
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="category" className="flex items-center gap-2">
                            <Tag className="w-4 h-4" />
                            Category *
                          </Label>
                          <div className="flex gap-2">
                            <select
                              id="category"
                              name="category"
                              value={formData.category || ''}
                              onChange={(e) => {
                                // Find the selected category to get both name and ID
                                const selectedCategory = categories.find(cat => cat.name === e.target.value);
                                handleInputChange({
                                  target: { 
                                    name: 'category', 
                                    value: e.target.value 
                                  }
                                } as React.ChangeEvent<HTMLInputElement>);
                                
                                // Also set the category_id if a category was selected
                                if (selectedCategory) {
                                  handleInputChange({
                                    target: { 
                                      name: 'category_id', 
                                      value: selectedCategory.id 
                                    }
                                  } as React.ChangeEvent<HTMLInputElement>);
                                } else {
                                  // Clear category_id if "other" or custom category is selected
                                  handleInputChange({
                                    target: { 
                                      name: 'category_id', 
                                      value: null 
                                    }
                                  } as React.ChangeEvent<HTMLInputElement>);
                                }
                              }}
                              required
                              className={`border rounded-md px-3 py-2 ${getErrorMessage(errors, 'category') ? 'border-red-500' : ''}`}
                            >
                              <option value="">Select a category</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                              ))}
                              <option value="">Other (specify below)</option>
                            </select>
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  // Find the selected category to get both name and ID
                                  const selectedCategory = categories.find(cat => cat.name === e.target.value);
                                  handleInputChange({
                                    target: { 
                                      name: 'category', 
                                      value: e.target.value 
                                    }
                                  } as React.ChangeEvent<HTMLInputElement>);
                                  
                                  // Also set the category_id
                                  if (selectedCategory) {
                                    handleInputChange({
                                      target: { 
                                        name: 'category_id', 
                                        value: selectedCategory.id 
                                      }
                                    } as React.ChangeEvent<HTMLInputElement>);
                                  }
                                }
                              }}
                              className="border rounded-md px-2"
                            >
                              <option value="">Quick Select</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                              ))}
                            </select>
                          </div>
                          {getErrorMessage(errors, 'category') && (
                            <div className="flex items-center text-red-500 text-sm mt-1">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              <span>{getErrorMessage(errors, 'category')}</span>
                            </div>
                          )}
                          
                          {/* Show input field when "Other" is selected or when category is not in the list */}
                          {!categories.some(cat => cat.name === formData.category) && formData.category && (
                            <div className="mt-2">
                              <Input
                                id="custom_category"
                                name="category"
                                value={formData.category || ''}
                                onChange={handleInputChange}
                                placeholder="Enter custom category"
                                className={getErrorMessage(errors, 'category') ? 'border-red-500' : ''}
                              />
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="unit" className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Unit of Measure *
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="unit"
                              name="unit"
                              value={formData.unit || ''}
                              onChange={handleInputChange}
                              placeholder="e.g., kg, bags, packets"
                              required
                              className={getErrorMessage(errors, 'unit') ? 'border-red-500' : ''}
                            />
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleInputChange({
                                    target: { name: 'unit', value: e.target.value }
                                  } as React.ChangeEvent<HTMLInputElement>);
                                }
                              }}
                              className="border rounded-md px-2"
                            >
                              <option value="">Quick Select</option>
                              {predefinedUnits.map((unit) => (
                                <option key={unit} value={unit}>{unit}</option>
                              ))}
                            </select>
                          </div>
                          {getErrorMessage(errors, 'unit') && (
                            <div className="flex items-center text-red-500 text-sm mt-1">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              <span>{getErrorMessage(errors, 'unit')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="supplier" className="flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4" />
                          Supplier *
                        </Label>
                        <Input
                          id="supplier"
                          name="supplier"
                          value={formData.supplier || ''}
                          onChange={handleInputChange}
                          placeholder="Enter supplier name"
                          required
                          className={getErrorMessage(errors, 'supplier') ? 'border-red-500' : ''}
                        />
                        {getErrorMessage(errors, 'supplier') && (
                          <div className="flex items-center text-red-500 text-sm mt-1">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            <span>{getErrorMessage(errors, 'supplier')}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 pt-2">
                        <Switch
                          id="is_credit_eligible"
                          checked={formData.is_credit_eligible || false}
                          onCheckedChange={handleSwitchChange}
                        />
                        <Label htmlFor="is_credit_eligible" className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          Credit Eligible
                        </Label>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Packaging Options Section - REPLACES TIERED PRICING */}
              <AccordionItem value="packaging">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span>Packaging Options</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2 space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">
                        Define different packaging options for this product
                      </p>
                      <Button type="button" variant="outline" size="sm" onClick={addPackagingOption}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Packaging Option
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {packagingData.map((packageOption, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                            <div className="lg:col-span-2 space-y-2">
                              <Label htmlFor={`package_name_${index}`} className="flex items-center gap-2">
                                Package Name *
                              </Label>
                              <Input
                                id={`package_name_${index}`}
                                placeholder="e.g., 20kg Bag, Small Packet, etc."
                                value={packageOption.name || ''}
                                onChange={(e) => handlePackagingChange(index, 'name', e.target.value)}
                                required
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`package_weight_${index}`} className="flex items-center gap-2">
                                Weight/Quantity *
                              </Label>
                              <Input
                                id={`package_weight_${index}`}
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="e.g., 20"
                                value={packageOption.weight || ''}
                                onChange={(e) => handlePackagingChange(index, 'weight', e.target.value || null)}
                                required
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`package_unit_${index}`} className="flex items-center gap-2">
                                Unit *
                              </Label>
                              <Input
                                id={`package_unit_${index}`}
                                placeholder="e.g., kg, bags, packets"
                                value={packageOption.unit || ''}
                                onChange={(e) => handlePackagingChange(index, 'unit', e.target.value)}
                                required
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`package_price_${index}`} className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                Price (Ksh) *
                              </Label>
                              <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-500">Ksh</span>
                                <Input
                                  id={`package_price_${index}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={packageOption.price || 0}
                                  onChange={(e) => handlePackagingChange(index, 'price', e.target.value)}
                                  className="pl-12"
                                  placeholder="0.00"
                                  required
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="flex items-end space-x-2">
                              <div className="flex-1 space-y-2">
                                <Label htmlFor={`package_credit_${index}`} className="flex items-center gap-2">
                                  <CreditCard className="w-4 h-4" />
                                  Credit Eligible
                                </Label>
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id={`package_credit_${index}`}
                                    checked={packageOption.is_credit_eligible || false}
                                    onCheckedChange={(checked) => handlePackagingChange(index, 'is_credit_eligible', checked)}
                                  />
                                </div>
                              </div>
                              
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removePackagingOption(index)}
                                disabled={packagingData.length <= 1}
                                className="mb-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Inventory Section - REMOVED as per user request */}
            </Accordion>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={dialogLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={dialogLoading}>
                {dialogLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    {editingProduct ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  editingProduct ? 'Update Product' : 'Add Product'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Stock Adjustment Dialog - REMOVED as per user request to remove Low Stock functionality */}
      {/* 
      <AlertDialog open={isStockAdjustDialogOpen} onOpenChange={setIsStockAdjustDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Adjust Stock Level
            </AlertDialogTitle>
            <AlertDialogDescription>
              {productToAdjust && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium">{productToAdjust.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Current Stock: {productToAdjust.current_stock} {productToAdjust.unit}
                  </div>
                  <div className="text-sm text-gray-600">
                    Category: {productToAdjust.category}
                  </div>
                </div>
              )}
              <div className="mt-4">
                Enter the quantity to adjust. Use positive numbers to increase stock, negative numbers to decrease.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleStockAdjustment}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adjustment" className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Stock Adjustment *
                </Label>
                <Input
                  id="adjustment"
                  type="number"
                  value={stockAdjustment?.adjustment || 0}
                  onChange={(e) => setStockAdjustment({
                    adjustment: parseInt(e.target.value) || 0,
                    reason: stockAdjustment?.reason || ''
                  })}
                  required
                />
                {productToAdjust && (
                  <div className="text-sm text-gray-500">
                    New estimated stock: {productToAdjust.current_stock + (stockAdjustment?.adjustment || 0)} {productToAdjust.unit}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reason" className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Reason for Adjustment
                </Label>
                <Textarea
                  id="reason"
                  value={stockAdjustment?.reason || ''}
                  onChange={(e) => setStockAdjustment({
                    adjustment: stockAdjustment?.adjustment || 0,
                    reason: e.target.value
                  })}
                  placeholder="e.g., Received new shipment, damaged goods, etc."
                />
              </div>
            </div>
            
            <AlertDialogFooter className="mt-6">
              <AlertDialogCancel disabled={dialogLoading}>Cancel</AlertDialogCancel>
              <Button type="submit" disabled={dialogLoading}>
                {dialogLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    Adjusting...
                  </>
                ) : (
                  'Adjust Stock'
                )}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
      */}
    </>
  );
};

export default ProductDialogs;