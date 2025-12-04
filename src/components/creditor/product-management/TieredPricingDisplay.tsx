import React from 'react';
import { formatCurrency } from '@/utils/formatters';
import { ProductPricing } from '@/services/agrovet-inventory-service';

interface TieredPricingDisplayProps {
  pricingTiers: ProductPricing[];
  unit: string;
}

const TieredPricingDisplay: React.FC<TieredPricingDisplayProps> = ({ pricingTiers, unit }) => {
  if (!pricingTiers || pricingTiers.length === 0) {
    return <div className="text-gray-500">No pricing tiers defined</div>;
  }

  // Sort tiers by min quantity
  const sortedTiers = [...pricingTiers].sort((a, b) => (a.min_quantity || 0) - (b.min_quantity || 0));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-4">
        {sortedTiers.map((tier, index) => (
          <div 
            key={tier.id || index} 
            className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-semibold text-gray-900 text-lg">
                  {tier.min_quantity && tier.max_quantity ? (
                    <span>{tier.min_quantity} - {tier.max_quantity} {unit}</span>
                  ) : tier.min_quantity && !tier.max_quantity ? (
                    <span>{tier.min_quantity}+ {unit}</span>
                  ) : (
                    <span>Any quantity</span>
                  )}
                </div>
                <div className="text-xl font-bold text-blue-600 mt-1">
                  {formatCurrency(tier.price_per_unit || 0)} <span className="text-sm font-normal text-gray-500">per {unit}</span>
                </div>
              </div>
              <div className="flex items-center">
                {tier.is_credit_eligible ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Credit
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Cash Only
                  </span>
                )}
              </div>
            </div>
            
            {/* Example calculation */}
            {tier.min_quantity && (
              <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                {tier.max_quantity ? (
                  <div>
                    <span>{tier.min_quantity} {unit} = {formatCurrency((tier.min_quantity || 0) * (tier.price_per_unit || 0))}</span>
                    <span className="mx-2">•</span>
                    <span>{tier.max_quantity} {unit} = {formatCurrency((tier.max_quantity || 0) * (tier.price_per_unit || 0))}</span>
                  </div>
                ) : (
                  <div>
                    <span>20 {unit} = {formatCurrency(20 * (tier.price_per_unit || 0))}</span>
                    <span className="mx-2">•</span>
                    <span>100 {unit} = {formatCurrency(100 * (tier.price_per_unit || 0))}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Special note for common package sizes */}
            {tier.min_quantity === 1 && tier.max_quantity === 20 && (
              <div className="mt-2 text-xs text-blue-600 font-medium">
                Standard 20kg pack: {formatCurrency(20 * (tier.price_per_unit || 0))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Summary */}
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-200">
        <p>Buy more, save more! Prices decrease with larger quantities.</p>
      </div>
    </div>
  );
};

export default TieredPricingDisplay;