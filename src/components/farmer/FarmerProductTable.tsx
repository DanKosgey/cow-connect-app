import React from 'react';
import { Package, CreditCard } from 'lucide-react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/formatters';
import { AgrovetProduct } from '@/services/agrovet-inventory-service';

interface FarmerProductTableProps {
  products: AgrovetProduct[];
  openEditDialog: (product: AgrovetProduct) => void;
}

const FarmerProductTable: React.FC<FarmerProductTableProps> = ({
  products,
  openEditDialog
}) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Credit Eligible</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow 
              key={product.id} 
              className="hover:bg-gray-50 transition-colors duration-150"
            >
              <TableCell>
                <div className="flex items-center gap-4 group">
                  <div 
                    className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-105"
                    role="img"
                    aria-label={product.image_alt_text || `${product.name} product image`}
                  >
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.image_alt_text || product.name}
                        className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.src = "https://placehold.co/64x64?text=Product";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100">
                        <Package className="w-6 h-6" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200">{product.name}</div>
                    <div className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center">
                      <span className="truncate">Supplier: {product.supplier}</span>
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span 
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 transition-all duration-300 hover:bg-blue-200"
                  aria-label={`Category: ${product.category}`}
                >
                  {product.category}
                </span>
              </TableCell>
              <TableCell>
                <div className="font-medium">{formatCurrency(product.selling_price)}</div>
                <div className="text-xs text-gray-500">
                  Cost: {formatCurrency(product.cost_price)}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  {product.is_credit_eligible ? (
                    <CreditCard 
                      className="w-4 h-4 text-green-600 transition-colors duration-300" 
                      aria-label="Credit eligible"
                    />
                  ) : (
                    <CreditCard 
                      className="w-4 h-4 text-gray-400 transition-colors duration-300" 
                      aria-label="Not credit eligible"
                    />
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditDialog(product)}
                    className="transition-all duration-300 hover:bg-blue-50 hover:border-blue-300"
                    aria-label={`View details for ${product.name}`}
                  >
                    View Details
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default FarmerProductTable;