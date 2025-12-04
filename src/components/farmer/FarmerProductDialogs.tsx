import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, AlertCircle, Image, Tag, Package, ShoppingCart, CreditCard } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AgrovetProduct, ProductPricing } from '@/services/agrovet-inventory-service';
import { validateProductForm, getErrorMessage } from '@/utils/productValidation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface FarmerProductDialogsProps {
  isDialogOpen: boolean;
  closeDialog: () => void;
  editingProduct: AgrovetProduct | null;
  formData: Partial<AgrovetProduct>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSwitchChange: (checked: boolean) => void;
  pricingData: Partial<ProductPricing>[];
  handlePricingChange: (index: number, field: string, value: any) => void;
  addPricingTier: () => void;
  removePricingTier: (index: number) => void;
  handleSubmit: (e: React.FormEvent) => void;
  dialogLoading: boolean;
}

const FarmerProductDialogs: React.FC<FarmerProductDialogsProps> = ({
  isDialogOpen,
  closeDialog,
  editingProduct,
  formData,
  handleInputChange,
  handleSwitchChange,
  pricingData,
  handlePricingChange,
  addPricingTier,
  removePricingTier,
  handleSubmit,
  dialogLoading
}) => {
  const [errors, setErrors] = useState<ReturnType<typeof validateProductForm>>([]);

  // Validate form when formData or pricingData changes
  useEffect(() => {
    if (isDialogOpen) {
      const validationErrors = validateProductForm(formData, pricingData);
      setErrors(validationErrors);
    }
  }, [formData, pricingData, isDialogOpen]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateProductForm(formData, pricingData);
    setErrors(validationErrors);
    
    // If no errors, submit the form
    if (validationErrors.length === 0) {
      handleSubmit(e);
    }
  };

  // Predefined categories for easier selection
  const predefinedCategories = [
    "Seeds", "Fertilizers", "Pesticides", "Herbicides", "Feed", 
    "Veterinary Supplies", "Tools", "Equipment", "Other"
  ];

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
              {editingProduct ? 'View Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct 
                ? 'View product details below' 
                : 'Fill in the product details below'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <Accordion type="multiple" defaultValue={["basic-info", "pricing"]} className="w-full">
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
                          readOnly={!editingProduct}
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
                          readOnly={!editingProduct}
                        />
                      </div>
                      
                      {/* Image Upload */}
                      <div className="space-y-2">
                        <Label htmlFor="image_url" className="flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          Product Image
                        </Label>
                        {editingProduct ? (
                          <div>
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
                              </div>
                            )}
                          </div>
                        ) : (
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
                            <Input
                              id="category"
                              name="category"
                              value={formData.category || ''}
                              onChange={handleInputChange}
                              placeholder="e.g., Seeds, Fertilizer"
                              required
                              className={getErrorMessage(errors, 'category') ? 'border-red-500' : ''}
                              readOnly={!editingProduct}
                            />
                            {!editingProduct && (
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleInputChange({
                                      target: { name: 'category', value: e.target.value }
                                    } as React.ChangeEvent<HTMLInputElement>);
                                  }
                                }}
                                className="border rounded-md px-2"
                              >
                                <option value="">Quick Select</option>
                                {predefinedCategories.map((cat) => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            )}
                          </div>
                          {getErrorMessage(errors, 'category') && (
                            <div className="flex items-center text-red-500 text-sm mt-1">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              <span>{getErrorMessage(errors, 'category')}</span>
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
                              readOnly={!editingProduct}
                            />
                            {!editingProduct && (
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
                            )}
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
                          readOnly={!editingProduct}
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
                          disabled={!!editingProduct}
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

              {/* Pricing Section */}
              <AccordionItem value="pricing">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Pricing Information</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2 space-y-4">
                    <div className="space-y-4">
                      {pricingData.map((tier, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`min_qty_${index}`} className="flex items-center gap-2">
                                Min Quantity
                              </Label>
                              <Input
                                id={`min_qty_${index}`}
                                type="number"
                                min="1"
                                value={tier.min_quantity || 1}
                                onChange={(e) => handlePricingChange(index, 'min_quantity', e.target.value)}
                                readOnly={!!editingProduct}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`max_qty_${index}`} className="flex items-center gap-2">
                                Max Quantity
                              </Label>
                              <Input
                                id={`max_qty_${index}`}
                                type="number"
                                min="1"
                                value={tier.max_quantity || ''}
                                onChange={(e) => handlePricingChange(index, 'max_quantity', e.target.value || null)}
                                placeholder="No limit"
                                readOnly={!!editingProduct}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`price_${index}`} className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                Price Per Unit
                              </Label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                  id={`price_${index}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={tier.price_per_unit || 0}
                                  onChange={(e) => handlePricingChange(index, 'price_per_unit', e.target.value)}
                                  className="pl-10"
                                  readOnly={!!editingProduct}
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`credit_${index}`} className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4" />
                                Credit Eligible
                              </Label>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id={`credit_${index}`}
                                  checked={tier.is_credit_eligible || false}
                                  onCheckedChange={(checked) => handlePricingChange(index, 'is_credit_eligible', checked)}
                                  disabled={!!editingProduct}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={dialogLoading}>
                Close
              </Button>
              {!editingProduct && (
                <Button type="submit" disabled={dialogLoading}>
                  {dialogLoading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Adding...
                    </>
                  ) : (
                    'Add Product'
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FarmerProductDialogs;