import React from 'react';
import { Package, AlertTriangle, Bell, CreditCard, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AgrovetProduct } from '@/services/agrovet-inventory-service';

interface StatisticsCardsProps {
  products: AgrovetProduct[];
}

const StatisticsCards: React.FC<StatisticsCardsProps> = ({ products }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      {/* Total Products Card */}
      <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 transform hover:-translate-y-1 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Products</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{products.length}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 transition-colors duration-300 group-hover:bg-blue-200">
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center text-xs text-gray-500">
              <span className="truncate">
                {products.filter(p => p.is_credit_eligible).length} credit eligible
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Credit Eligible Card */}
      <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500 transform hover:-translate-y-1 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Credit Eligible</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {products.filter(p => p.is_credit_eligible).length}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3 transition-colors duration-300 group-hover:bg-green-200">
              <CreditCard className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center text-xs text-gray-500">
              <span className="truncate">
                {((products.filter(p => p.is_credit_eligible).length / Math.max(1, products.length)) * 100).toFixed(1)}% of products
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* High Value Items Card - Updated to use cost_price instead of selling_price */}
      <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500 transform hover:-translate-y-1 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">High Value Items</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {products.filter(p => p.cost_price > 1000).length}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 transition-colors duration-300 group-hover:bg-purple-200">
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center text-xs text-gray-500">
              <span className="truncate">
                Above KES 1,000
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsCards;