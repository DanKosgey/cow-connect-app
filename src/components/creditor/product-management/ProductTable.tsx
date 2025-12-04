import React, { useState, useEffect } from 'react';
import { Package, CreditCard, Edit, Layers, Trash2, History, Building2, Tag } from 'lucide-react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/utils/formatters';
import { AgrovetProduct, ProductPackaging } from '@/services/agrovet-inventory-service';
import { AgrovetInventoryService } from '@/services/agrovet-inventory-service';
import PackagingOptionsDisplay from './PackagingOptionsDisplay';

interface ProductTableProps {
  products: AgrovetProduct[];
  selectedProducts: string[];
  toggleProductSelection: (productId: string) => void;
  toggleSelectAll: () => void;
  openEditDialog: (product: AgrovetProduct) => void;
  handleDelete: (id: string) => void;
  toggleCreditEligibility: (product: AgrovetProduct) => void;
  actionLoading: Record<string, boolean>;
  getStockStatusBadge: (product: AgrovetProduct) => JSX.Element;
  getStockStatus: (product: AgrovetProduct) => string;
}

const ProductTable: React.FC<ProductTableProps> = ({
  products,
  selectedProducts,
  toggleProductSelection,
  toggleSelectAll,
  openEditDialog,
  handleDelete,
  toggleCreditEligibility,
  actionLoading,
  getStockStatusBadge,
  getStockStatus
}) => {
  const { toast } = useToast();
  // State to store packaging information for each product
  const [productPackaging, setProductPackaging] = useState<Record<string, ProductPackaging[]>>({});
  const [loadingPackaging, setLoadingPackaging] = useState<Record<string, boolean>>({});

  // Fetch packaging information for all products
  useEffect(() => {
    const fetchAllPackaging = async () => {
      for (const product of products) {
        if (!productPackaging[product.id] && !loadingPackaging[product.id]) {
          setLoadingPackaging(prev => ({ ...prev, [product.id]: true }));
          try {
            const packagingData = await AgrovetInventoryService.getProductPackaging(product.id);
            setProductPackaging(prev => ({ ...prev, [product.id]: packagingData }));
          } catch (error) {
            console.warn(`Failed to fetch packaging for product ${product.id}:`, error);
            // Show a user-friendly message if it's a permissions error
            const errorMessage = (error as Error).message || String(error);
            if (errorMessage.includes('permission')) {
              toast({
                title: "Permission Required",
                description: "You don't have permission to view packaging options. Contact your administrator.",
                variant: "destructive"
              });
            }
          } finally {
            setLoadingPackaging(prev => ({ ...prev, [product.id]: false }));
          }
        }
      }
    };

    fetchAllPackaging();
  }, [products]);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedProducts.length === products.length && products.length > 0}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all products"
              />
            </TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Stock Status</TableHead>
            <TableHead>Stock Level</TableHead>
            <TableHead>Packaging Options</TableHead>
            <TableHead>Credit Eligible</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow 
              key={product.id} 
              className={`hover:bg-gray-50 transition-colors duration-150 ${
                selectedProducts.includes(product.id) ? 'bg-blue-50' : ''
              }`}
            >
              <TableCell>
                <Checkbox
                  checked={selectedProducts.includes(product.id)}
                  onCheckedChange={() => toggleProductSelection(product.id)}
                  aria-label={`Select product ${product.name}`}
                />
              </TableCell>
              <TableCell className="py-4">
                <div className="flex items-center gap-4">
                  <div 
                    className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 shadow-sm transition-all duration-300 group-hover:shadow-md"
                    role="img"
                    aria-label={product.image_alt_text || `${product.name} product image`}
                  >
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.image_alt_text || product.name}
                        className="w-full h-full object-cover transition-opacity duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "https://placehold.co/64x64?text=Product";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50">
                        <Package className="w-8 h-8" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 text-lg truncate">{product.name}</div>
                    <div className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</div>
                    <div className="flex items-center text-xs text-gray-500 mt-2">
                      <Building2 className="w-3 h-3 mr-1" />
                      <span className="truncate">{product.supplier}</span>
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-4">
                <div className="flex items-center">
                  <Tag className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {product.category}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-4">
                {getStockStatusBadge(product)}
              </TableCell>
              <TableCell className="py-4">
                <div className={`font-bold text-lg ${getStockStatus(product) === "low" || getStockStatus(product) === "out" ? "text-red-600" : "text-gray-900"}`}>
                  {product.current_stock} {product.unit}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Reorder at: {product.reorder_level} {product.unit}
                </div>
                <div 
                  className="mt-2 w-full bg-gray-200 rounded-full h-2"
                  role="progressbar"
                  aria-valuenow={product.current_stock}
                  aria-valuemin={0}
                  aria-valuemax={Math.max(1, product.reorder_level * 2)}
                  aria-label={`Stock level progress for ${product.name}`}
                >
                  <div 
                    className={`h-2 rounded-full ${
                      getStockStatus(product) === "out" ? "bg-red-600" : 
                      getStockStatus(product) === "low" ? "bg-yellow-500" : "bg-green-600"
                    }`}
                    style={{ 
                      width: `${Math.min(100, (product.current_stock / Math.max(1, product.reorder_level * 2)) * 100)}%` 
                    }}
                  ></div>
                </div>
              </TableCell>
              <TableCell className="py-4">
                {loadingPackaging[product.id] ? (
                  <div className="flex items-center text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                    Loading options...
                  </div>
                ) : productPackaging[product.id] ? (
                  <PackagingOptionsDisplay 
                    packagingOptions={productPackaging[product.id]} 
                  />
                ) : (
                  <div className="text-gray-500 italic">
                    Base price: {formatCurrency(product.cost_price)}
                  </div>
                )}
              </TableCell>
              <TableCell className="py-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toggleCreditEligibility(product)}
                  className={`transition-all duration-300 ${
                    product.is_credit_eligible 
                      ? 'bg-green-50 hover:bg-green-100 border-green-300 text-green-700' 
                      : 'hover:bg-gray-50 border-gray-300 text-gray-700'
                  }`}
                  disabled={actionLoading[`credit-${product.id}`]}
                  title={product.is_credit_eligible ? 'Disable credit eligibility' : 'Enable credit eligibility'}
                  aria-label={`${product.is_credit_eligible ? 'Disable' : 'Enable'} credit eligibility for ${product.name}`}
                >
                  {actionLoading[`credit-${product.id}`] ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1"></div>
                  ) : (
                    <CreditCard className={`w-4 h-4 mr-1 ${
                      product.is_credit_eligible ? 'text-green-600' : 'text-gray-400'
                    }`} aria-hidden="true" />
                  )}
                  {product.is_credit_eligible ? 'Credit Enabled' : 'Credit Disabled'}
                </Button>
              </TableCell>
              <TableCell className="py-4">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleCreditEligibility(product)}
                      className={`transition-all duration-300 ${
                        product.is_credit_eligible ? 'bg-green-50 hover:bg-green-100 border-green-300' : 'hover:bg-gray-50'
                      }`}
                      disabled={actionLoading[`credit-${product.id}`]}
                      title={product.is_credit_eligible ? 'Disable credit eligibility' : 'Enable credit eligibility'}
                      aria-label={`${product.is_credit_eligible ? 'Disable' : 'Enable'} credit eligibility for ${product.name}`}
                    >
                      {actionLoading[`credit-${product.id}`] ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      ) : (
                        <CreditCard className={`w-4 h-4 ${product.is_credit_eligible ? 'text-green-600' : 'text-gray-400'}`} aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditDialog(product)}
                      className="transition-all duration-300 hover:bg-blue-50 hover:border-blue-300"
                      disabled={actionLoading[`edit-${product.id}`]}
                      aria-label={`Edit ${product.name}`}
                    >
                      {actionLoading[`edit-${product.id}`] ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      ) : (
                        <Edit className="w-4 h-4" aria-hidden="true" />
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
                          handleDelete(product.id);
                        }
                      }}
                      className="transition-all duration-300 hover:bg-red-50 hover:border-red-300"
                      disabled={actionLoading[product.id]}
                      aria-label={`Delete ${product.name}`}
                    >
                      {actionLoading[product.id] ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProductTable;