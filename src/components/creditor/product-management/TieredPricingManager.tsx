import React from 'react';
import { Plus, Trash2, DollarSign, Package, CreditCard } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ProductPricing } from '@/services/agrovet-inventory-service';

interface TieredPricingManagerProps {
  pricingData: Partial<ProductPricing>[];
  handlePricingChange: (index: number, field: string, value: any) => void;
  addPricingTier: () => void;
  removePricingTier: (index: number) => void;
}

const TieredPricingManager: React.FC<TieredPricingManagerProps> = ({
  pricingData,
  handlePricingChange,
  addPricingTier,
  removePricingTier
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Tiered Pricing</h3>
          <p className="text-sm text-gray-500">
            Define different prices based on packaging sizes and quantities
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addPricingTier}>
          <Plus className="w-4 h-4 mr-1" />
          Add Packaging Tier
        </Button>
      </div>
      
      <div className="space-y-4">
        {pricingData.map((tier, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div className="lg:col-span-2 space-y-2">
                <Label htmlFor={`display_name_${index}`} className="flex items-center gap-2">
                  Packaging Description
                </Label>
                <Input
                  id={`display_name_${index}`}
                  placeholder="e.g., 20kg Bag, Small Packet, etc."
                  value={tier.display_name || ''}
                  onChange={(e) => handlePricingChange(index, 'display_name', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`packaging_size_${index}`} className="flex items-center gap-2">
                  Size
                </Label>
                <Input
                  id={`packaging_size_${index}`}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 20"
                  value={tier.packaging_size || ''}
                  onChange={(e) => handlePricingChange(index, 'packaging_size', e.target.value || null)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`packaging_unit_${index}`} className="flex items-center gap-2">
                  Unit
                </Label>
                <Input
                  id={`packaging_unit_${index}`}
                  placeholder="e.g., kg, bags, packets"
                  value={tier.packaging_unit || ''}
                  onChange={(e) => handlePricingChange(index, 'packaging_unit', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`price_${index}`} className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Price (Ksh)
                </Label>
                <Input
                  id={`price_${index}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={tier.price_per_unit || 0}
                  onChange={(e) => handlePricingChange(index, 'price_per_unit', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor={`min_qty_${index}`} className="flex items-center gap-2">
                  Minimum Quantity
                </Label>
                <Input
                  id={`min_qty_${index}`}
                  type="number"
                  min="1"
                  value={tier.min_quantity || 1}
                  onChange={(e) => handlePricingChange(index, 'min_quantity', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`max_qty_${index}`} className="flex items-center gap-2">
                  Maximum Quantity
                </Label>
                <Input
                  id={`max_qty_${index}`}
                  type="number"
                  min="1"
                  value={tier.max_quantity || ''}
                  onChange={(e) => handlePricingChange(index, 'max_quantity', e.target.value || null)}
                  placeholder="No limit"
                />
              </div>
              
              <div className="flex items-end space-x-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`credit_${index}`} className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Credit Eligible
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`credit_${index}`}
                      checked={tier.is_credit_eligible || false}
                      onCheckedChange={(checked) => handlePricingChange(index, 'is_credit_eligible', checked)}
                    />
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removePricingTier(index)}
                  disabled={pricingData.length <= 1}
                  className="mb-1"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Package className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Pricing Guidelines</h4>
            <ul className="text-sm text-blue-700 mt-1 list-disc list-inside space-y-1">
              <li>Create bulk discounts: Offer lower prices per unit for larger quantities</li>
              <li>Set min/max quantities for each tier. Leave "Max Quantity" blank for unlimited</li>
              <li>Different tiers can have different credit eligibility settings</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Package className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Example Pricing Structure</h4>
            <p className="text-sm text-blue-700 mt-1">
              For animal feed product:
            </p>
            <ul className="text-sm text-blue-700 mt-1 list-disc list-inside">
              <li>Bulk: 100kg bag at Ksh 10,000 (min qty: 1)</li>
              <li>Retail: 20kg bag at Ksh 2,200 (min qty: 1, max qty: 10)</li>
              <li>Small: 5kg packet at Ksh 600 (min qty: 1, max qty: 20)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TieredPricingManager;