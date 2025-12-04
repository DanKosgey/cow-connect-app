import React, { useState } from "react";
import { ProductPackaging } from "@/services/agrovet-inventory-service";
import { formatCurrency } from "@/utils/formatters";
import { CreditCard, Package, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PackagingSelectorProps {
  packagingOptions: ProductPackaging[];
  onSelect: (packaging: ProductPackaging) => void;
  selectedPackagingId?: string;
  showPrices?: boolean;
}

const PackagingSelector: React.FC<PackagingSelectorProps> = ({ 
  packagingOptions, 
  onSelect, 
  selectedPackagingId,
  showPrices = true
}) => {
  // Group packaging options by credit eligibility
  const creditEligibleOptions = packagingOptions.filter(option => option.is_credit_eligible);
  const cashOnlyOptions = packagingOptions.filter(option => !option.is_credit_eligible);

  // If no packaging options, show a message
  if (packagingOptions.length === 0) {
    return (
      <div className="text-center py-4">
        <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">No packaging options available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Credit Eligible Options */}
      {creditEligibleOptions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Credit Options</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {creditEligibleOptions.map((packaging) => (
              <Card 
                key={packaging.id} 
                className={`cursor-pointer transition-all ${
                  selectedPackagingId === packaging.id 
                    ? "border-green-500 bg-green-50 ring-2 ring-green-200" 
                    : "hover:border-green-300"
                }`}
                onClick={() => onSelect(packaging)}
              >
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2">
                      <Tag className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {packaging.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {packaging.weight} {packaging.unit}
                        </div>
                      </div>
                    </div>
                    {showPrices && (
                      <div className="text-right">
                        <div className="font-semibold text-green-700 text-sm">
                          {formatCurrency(packaging.price)}
                        </div>
                        <div className="text-xs text-gray-500">
                          per {packaging.unit}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Cash Only Options */}
      {cashOnlyOptions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Cash Options</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cashOnlyOptions.map((packaging) => (
              <Card 
                key={packaging.id} 
                className={`cursor-pointer transition-all ${
                  selectedPackagingId === packaging.id 
                    ? "border-gray-500 bg-gray-50 ring-2 ring-gray-200" 
                    : "hover:border-gray-300"
                }`}
                onClick={() => onSelect(packaging)}
              >
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2">
                      <Tag className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {packaging.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {packaging.weight} {packaging.unit}
                        </div>
                      </div>
                    </div>
                    {showPrices && (
                      <div className="text-right">
                        <div className="font-semibold text-gray-700 text-sm">
                          {formatCurrency(packaging.price)}
                        </div>
                        <div className="text-xs text-gray-500">
                          per {packaging.unit}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PackagingSelector;