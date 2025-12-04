import React from 'react';
import { Edit, Trash2, CreditCard, Package } from 'lucide-react';
import { AgrovetProduct } from '@/services/agrovet-inventory-service';
import { formatCurrency } from '@/utils/formatters';
import UnifiedPackagingDisplay from '@/components/common/UnifiedPackagingDisplay';
import { Button } from '@/components/ui/button';

interface ProductTableProps {
  products: AgrovetProduct[];
  toggleCreditEligibility: (product: AgrovetProduct) => void;
  actionLoading: Record<string, boolean>;
  openEditDialog: (product: AgrovetProduct) => void;
  handleDelete: (id: string) => void;
}

const ProductTable: React.FC<ProductTableProps> = ({
  products,
  toggleCreditEligibility,
  actionLoading,
  openEditDialog,
  handleDelete
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Product
            </th>
            <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider hidden sm:table-cell">
              Category
            </th>
            <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Packaging Options
            </th>
            <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider hidden md:table-cell">
              Credit Status
            </th>
            <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-gray-50 transition-colors duration-150">
              <td className="px-6 py-5 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-16 w-16 rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border border-gray-200 shadow-sm">
                    {product.image_url ? (
                      <img className="h-16 w-16 object-cover" src={product.image_url} alt={product.name} />
                    ) : (
                      <Package className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="text-base font-bold text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</div>
                    <div className="text-xs text-gray-500 mt-1 sm:hidden">Category: {product.category}</div>
                    <div className="text-xs text-gray-500 mt-1">Supplier: {product.supplier}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-5 whitespace-nowrap hidden sm:table-cell">
                <div className="flex items-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {product.category}
                  </span>
                </div>
              </td>
              <td className="px-6 py-5">
                <div className="max-w-md">
                  <UnifiedPackagingDisplay packagingOptions={product.packaging_options || []} />
                </div>
              </td>
              <td className="px-6 py-5 whitespace-nowrap hidden md:table-cell">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                  product.is_credit_eligible 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <CreditCard className="w-4 h-4 mr-1.5" />
                  {product.is_credit_eligible ? 'Credit Enabled' : 'Cash Only'}
                </span>
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(product)}
                    className="h-9 px-3 hover:bg-blue-50"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(product.id)}
                    disabled={actionLoading[product.id]}
                    className="h-9 px-3"
                  >
                    {actionLoading[product.id] ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Delete</span>
                      </>
                    )}
                  </Button>
                </div>
                {/* Show credit status on mobile */}
                <div className="mt-3 sm:hidden">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    product.is_credit_eligible 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <CreditCard className="w-3 h-3 mr-1" />
                    {product.is_credit_eligible ? 'Credit' : 'Cash Only'}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductTable;