import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, AlertCircle, Image, Tag, Package, ShoppingCart, CreditCard, Trash2, Info } from 'lucide-react';
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
import { formatCurrency } from '@/utils/formatters';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SimplifiedProductDialogsProps {
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

const SimplifiedProductDialogs: React.FC<SimplifiedProductDialogsProps> = ({
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
    
    // Log validation errors for debugging
    if (validationErrors.length > 0) {
      console.log('Form validation errors:', validationErrors);
    }
    
    // If no errors, submit the form
    if (validationErrors.length === 0) {
      handleSubmit(e);
    } else {
      // Scroll to first error
      const firstError = validationErrors[0];
      const errorElement = document.querySelector(`[name="${firstError.field}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (errorElement as HTMLElement).focus();
      }
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

  // Helper function to add a predefined pricing tier example for feed
  const addFeedPricingExample = () => {
    // Clear existing tiers
    const currentLength = pricingData.length;
    for (let i = currentLength - 1; i >= 0; i--) {
      removePricingTier(i);
    }
    
    // Add new tiers for the feed example after a brief delay
    setTimeout(() => {
      // Based on your example: 100 kg of feeds will cost 10000ksh but packed in 20 kg selling at 2000ksh
      // This means 20kg = 2000ksh => 1kg = 100ksh
      // We'll create tiered pricing with bulk discounts
      
      // Tier 1: 1-20 kg at 100 KSH/kg (20kg = 2000KSH)
      addPricingTier();
      setTimeout(() => {
        if (pricingData.length > 0) {
          handlePricingChange(pricingData.length - 1, 'min_quantity', 1);
          handlePricingChange(pricingData.length - 1, 'max_quantity', 20);
          handlePricingChange(pricingData.length - 1, 'price_per_unit', 100);
          handlePricingChange(pricingData.length - 1, 'is_credit_eligible', true);
        }
      }, 10);
      
      // Tier 2: 21-100 kg at 90 KSH/kg (bulk discount)
      setTimeout(() => {
        addPricingTier();
        setTimeout(() => {
          if (pricingData.length > 1) {
            handlePricingChange(pricingData.length - 1, 'min_quantity', 21);
            handlePricingChange(pricingData.length - 1, 'max_quantity', 100);
            handlePricingChange(pricingData.length - 1, 'price_per_unit', 90);
            handlePricingChange(pricingData.length - 1, 'is_credit_eligible', true);
          }
        }, 10);
      }, 50);
      
      // Tier 3: 101+ kg at 80 KSH/kg (largest bulk discount)
      setTimeout(() => {
        addPricingTier();
        setTimeout(() => {
          if (pricingData.length > 2) {
            handlePricingChange(pricingData.length - 1, 'min_quantity', 101);
            handlePricingChange(pricingData.length - 1, 'max_quantity', null);
            handlePricingChange(pricingData.length - 1, 'price_per_unit', 80);
            handlePricingChange(pricingData.length - 1, 'is_credit_eligible', true);
          }
        }, 10);
      }, 100);
    }, 50);
  };

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
            {/* Show validation errors at the top */}
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h3 className="font-medium text-red-800">Please fix the following errors:</h3>
                </div>
                <ul className="list-disc list-inside text-red-700 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error.message}</li>
                  ))}
                </ul>
              </div>
            )}
            
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
                            <Input
                              id="category"
                              name="category"
                              value={formData.category || ''}
                              onChange={handleInputChange}
                              placeholder="e.g., Seeds, Fertilizer"
                              required
                              className={getErrorMessage(errors, 'category') ? 'border-red-500' : ''}
                            />
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
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-gray-700 font-medium">
                          Define different prices based on quantity purchased (per {formData.unit || 'unit'})
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded-lg border border-blue-100 flex-1">
                            <p className="font-medium">Feed Example: 100kg=Ksh10,000 → 1-20kg at Ksh100/kg, 21-100kg at Ksh90/kg, 101+kg at Ksh80/kg</p>
                          </div>
                          <Button 
                            type="button" 
                            variant="default" 
                            size="sm" 
                            className="self-start bg-blue-600 hover:bg-blue-700 text-white h-fit"
                            onClick={addFeedPricingExample}
                          >
                            <Info className="w-4 h-4 mr-1" />
                            Apply Feed Example
                          </Button>
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={addPricingTier}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Tier
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {pricingData.map((tier, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            {/* Quantity Range */}
                            <div className="md:col-span-5 space-y-2">
                              <Label htmlFor={`min_qty_${index}`} className="flex items-center gap-2 text-gray-700">
                                Quantity Range
                              </Label>
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <Input
                                    id={`min_qty_${index}`}
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={tier.min_quantity || 1}
                                    onChange={(e) => handlePricingChange(index, 'min_quantity', e.target.value)}
                                    placeholder="Min"
                                    className="w-full"
                                  />
                                </div>
                                <span className="text-gray-500">-</span>
                                <div className="flex-1">
                                  <Input
                                    id={`max_qty_${index}`}
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={tier.max_quantity || ''}
                                    onChange={(e) => handlePricingChange(index, 'max_quantity', e.target.value || null)}
                                    placeholder="Max (leave blank for unlimited)"
                                    className="w-full"
                                  />
                                </div>
                                <span className="text-gray-500 whitespace-nowrap bg-gray-100 px-2 py-1 rounded text-sm">
                                  {formData.unit || 'units'}
                                </span>
                              </div>
                            </div>
                            
                            {/* Price Per Unit */}
                            <div className="md:col-span-4 space-y-2">
                              <Label htmlFor={`price_${index}`} className="flex items-center gap-2 text-gray-700">
                                <DollarSign className="w-4 h-4" />
                                Price Per {formData.unit || 'Unit'}
                              </Label>
                              <div className="relative">
                                <span className="absolute left-3 top-3 h-4 w-4 text-gray-500 text-sm">Ksh</span>
                                <Input
                                  id={`price_${index}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={tier.price_per_unit || 0}
                                  onChange={(e) => handlePricingChange(index, 'price_per_unit', e.target.value)}
                                  className="pl-12"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                            
                            {/* Credit Eligible & Actions */}
                            <div className="md:col-span-3 flex flex-col gap-2">
                              <div className="space-y-2 flex-1">
                                <Label htmlFor={`credit_${index}`} className="flex items-center gap-2 text-gray-700">
                                  <CreditCard className="w-4 h-4" />
                                  Credit Eligible
                                </Label>
                                <Switch
                                  id={`credit_${index}`}
                                  checked={tier.is_credit_eligible || false}
                                  onCheckedChange={(checked) => handlePricingChange(index, 'is_credit_eligible', checked)}
                                />
                              </div>
                              
                              <div className="flex items-end pt-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removePricingTier(index)}
                                  disabled={pricingData.length <= 1}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span className="sr-only">Remove tier</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Display tier summary */}
                          <div className="mt-3 pt-3 border-t border-gray-200 bg-gray-50 p-3 rounded-b-lg">
                            <div className="text-sm text-gray-700">
                              {tier.min_quantity && tier.max_quantity ? (
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {tier.min_quantity} - {tier.max_quantity} {formData.unit || 'units'}: {formatCurrency(tier.price_per_unit || 0)} each
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    <span>{tier.min_quantity} = {formatCurrency((tier.min_quantity || 0) * (tier.price_per_unit || 0))}</span>
                                    <span className="mx-2">•</span>
                                    <span>{tier.max_quantity} = {formatCurrency((tier.max_quantity || 0) * (tier.price_per_unit || 0))}</span>
                                  </div>
                                </div>
                              ) : tier.min_quantity && !tier.max_quantity ? (
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {tier.min_quantity}+ {formData.unit || 'units'}: {formatCurrency(tier.price_per_unit || 0)} each
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    <span>20 = {formatCurrency(20 * (tier.price_per_unit || 0))}</span>
                                    <span className="mx-2">•</span>
                                    <span>100 = {formatCurrency(100 * (tier.price_per_unit || 0))}</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-red-500">Invalid tier - set min quantity</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Pricing explanation */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                      <ul className="list-disc list-inside space-y-1 text-blue-800">
                        <li>Create bulk discounts: Offer lower prices per unit for larger quantities</li>
                        <li>Set min/max quantities for each tier. Leave "Max Quantity" blank for unlimited</li>
                        <li>Different tiers can have different credit eligibility settings</li>
                        <li>Use "Apply Feed Example" button for quick setup based on your 100kg=Ksh10,000 example</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
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
    </>
  );
};

export default SimplifiedProductDialogs;