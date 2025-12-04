import React from 'react';
import { ProductPricing } from '@/services/agrovet-inventory-service';

interface PricingTierDisplayProps {
  pricingTiers: ProductPricing[];
}

const PricingTierDisplay: React.FC<PricingTierDisplayProps> = ({ pricingTiers }) => {
  // Sort pricing tiers by sort_order or min_quantity
  const sortedTiers = [...pricingTiers].sort((a, b) => {
    if (a.sort_order !== undefined && b.sort_order !== undefined) {
      return (a.sort_order || 0) - (b.sort_order || 0);
    }
    return (a.min_quantity || 0) - (b.min_quantity || 0);
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Available Packaging Options</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedTiers.map((tier, index) => (
          <div 
            key={index} 
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-gray-900">
                  {tier.display_name || `${tier.packaging_size || ''}${tier.packaging_unit || ''}` || `Option ${index + 1}`}
                </h4>
                {tier.min_quantity > 1 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Min: {tier.min_quantity} {tier.packaging_unit || 'units'}
                  </p>
                )}
                {tier.max_quantity && (
                  <p className="text-sm text-gray-500">
                    Max: {tier.max_quantity} {tier.packaging_unit || 'units'}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-green-600">
                  Ksh {tier.price_per_unit?.toFixed(2)}
                </p>
                {tier.is_credit_eligible && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                    Credit Eligible
                  </span>
                )}
              </div>
            </div>
            
            {(tier.packaging_size || tier.packaging_unit) && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-sm text-gray-600">
                  Packaging: {tier.packaging_size} {tier.packaging_unit}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {sortedTiers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No pricing options available for this product</p>
        </div>
      )}
    </div>
  );
};

export default PricingTierDisplay;