import React from 'react';
import { ProductPackaging } from '@/services/agrovet-inventory-service';
import { formatCurrency } from '@/utils/formatters';
import { CreditCard, Package, Tag } from 'lucide-react';

interface UnifiedPackagingDisplayProps {
  packagingOptions: ProductPackaging[];
  compact?: boolean;
  showIcons?: boolean;
}

const UnifiedPackagingDisplay: React.FC<UnifiedPackagingDisplayProps> = ({ 
  packagingOptions, 
  compact = false,
  showIcons = true
}) => {
  if (!packagingOptions || packagingOptions.length === 0) {
    return compact ? (
      <span className="text-gray-500 text-xs">No packaging options</span>
    ) : (
      <div className="text-center py-2">
        <Package className="w-6 h-6 text-gray-300 mx-auto mb-1" />
        <p className="text-gray-500 text-xs">No packaging options</p>
      </div>
    );
  }

  // Group packaging options by credit eligibility for better organization
  const creditEligibleOptions = packagingOptions.filter(option => option.is_credit_eligible);
  const cashOnlyOptions = packagingOptions.filter(option => !option.is_credit_eligible);

  if (compact) {
    return (
      <div className="space-y-1">
        {creditEligibleOptions.map((packaging) => (
          <div key={packaging.id} className="flex justify-between text-xs">
            <span className="font-medium flex items-center gap-1">
              {showIcons && <Tag className="w-3 h-3 text-green-600" />}
              {packaging.name}
            </span>
            <span className="text-green-700 font-medium">
              {formatCurrency(packaging.price)}
            </span>
          </div>
        ))}
        {cashOnlyOptions.map((packaging) => (
          <div key={packaging.id} className="flex justify-between text-xs">
            <span className="font-medium flex items-center gap-1">
              {showIcons && <Tag className="w-3 h-3 text-gray-500" />}
              {packaging.name}
            </span>
            <span className="text-gray-700 font-medium">
              {formatCurrency(packaging.price)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Credit Eligible Options */}
      {creditEligibleOptions.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            {showIcons && <CreditCard className="w-3 h-3 text-green-600" />}
            <span className="text-[10px] font-medium text-green-700 uppercase">Credit Options</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {creditEligibleOptions.map((packaging) => (
              <div 
                key={packaging.id} 
                className="border border-green-200 rounded p-2 bg-green-50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-1">
                    {showIcons && <Tag className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />}
                    <div>
                      <div className="font-medium text-gray-900 text-xs">
                        {packaging.name}
                      </div>
                      <div className="text-[10px] text-gray-600 mt-0.5">
                        {packaging.weight} {packaging.unit}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-700 text-xs">
                      {formatCurrency(packaging.price)}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      per {packaging.unit}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cash Only Options */}
      {cashOnlyOptions.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            {showIcons && <Package className="w-3 h-3 text-gray-500" />}
            <span className="text-[10px] font-medium text-gray-600 uppercase">Cash Options</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {cashOnlyOptions.map((packaging) => (
              <div 
                key={packaging.id} 
                className="border border-gray-200 rounded p-2 bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-1">
                    {showIcons && <Tag className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />}
                    <div>
                      <div className="font-medium text-gray-900 text-xs">
                        {packaging.name}
                      </div>
                      <div className="text-[10px] text-gray-600 mt-0.5">
                        {packaging.weight} {packaging.unit}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-700 text-xs">
                      {formatCurrency(packaging.price)}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      per {packaging.unit}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedPackagingDisplay;