import React from 'react';
import { formatCurrency } from '@/utils/formatters';
import { ProductPackaging } from '@/services/agrovet-inventory-service';
import { CreditCard, Package, Tag } from 'lucide-react';

interface PackagingOptionsDisplayProps {
  packagingOptions: ProductPackaging[];
}

const PackagingOptionsDisplay: React.FC<PackagingOptionsDisplayProps> = ({ packagingOptions }) => {
  if (!packagingOptions || packagingOptions.length === 0) {
    return (
      <div className="text-center py-2">
        <Package className="w-6 h-6 text-gray-300 mx-auto mb-1" />
        <p className="text-gray-500 text-xs">No packaging options</p>
      </div>
    );
  }

  // Group packaging options by credit eligibility for better organization
  const creditEligibleOptions = packagingOptions.filter(option => option.is_credit_eligible);
  const cashOnlyOptions = packagingOptions.filter(option => !option.is_credit_eligible);

  return (
    <div className="space-y-3">
      {/* Credit Eligible Options */}
      {creditEligibleOptions.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <CreditCard className="w-3 h-3 text-green-600" />
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
                    <Tag className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
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
            <Package className="w-3 h-3 text-gray-500" />
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
                    <Tag className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
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

      {/* Compact View for Tables - Improved */}
      {packagingOptions.length > 0 && (
        <div className="hidden">
          {packagingOptions.map((packaging) => (
            <div key={packaging.id} className="text-xs">
              <span className="font-medium">{packaging.name}</span> - 
              <span className="text-gray-600 ml-1">
                {packaging.weight} {packaging.unit} @ {formatCurrency(packaging.price)}
              </span>
              {packaging.is_credit_eligible && (
                <span className="ml-1 text-green-600">(Credit)</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PackagingOptionsDisplay;