import React from 'react';
import { Package, CreditCard, DollarSign } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/formatters';
import { AgrovetProduct, ProductPricing } from '@/services/agrovet-inventory-service';

interface ProductViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: AgrovetProduct | null;
  pricingData: ProductPricing[];
}

const ProductViewDialog: React.FC<ProductViewDialogProps> = ({
  isOpen,
  onClose,
  product,
  pricingData
}) => {
  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Product Details
          </DialogTitle>
          <DialogDescription>
            View detailed information about this product
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <div 
                className="w-32 h-32 rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200"
                role="img"
                aria-label={product.image_alt_text || `${product.name} product image`}
              >
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.image_alt_text || product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to placeholder if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.src = "https://placehold.co/128x128?text=Product";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100">
                    <Package className="w-12 h-12" aria-hidden="true" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
              <p className="text-gray-600 mt-2">{product.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <div className="text-sm text-gray-500">Category</div>
                  <div className="font-medium">{product.category}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500">Supplier</div>
                  <div className="font-medium">{product.supplier}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500">Unit</div>
                  <div className="font-medium">{product.unit}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500">Credit Eligible</div>
                  <div className="font-medium flex items-center gap-1">
                    {product.is_credit_eligible ? (
                      <>
                        <CreditCard className="w-4 h-4 text-green-600" />
                        Yes
                      </>
                    ) : (
                      "No"
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Pricing Information */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pricing Information
            </h4>
            
            <div className="mt-4 space-y-3">
              {pricingData && pricingData.length > 0 ? (
                pricingData.map((tier, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">
                        {tier.min_quantity} {tier.max_quantity ? `- ${tier.max_quantity}` : '+'} {product.unit}
                      </div>
                      <div className="text-sm text-gray-500">
                        {tier.is_credit_eligible ? "Credit eligible" : "Cash only"}
                      </div>
                    </div>
                    <div className="text-lg font-bold">
                      {formatCurrency(tier.price_per_unit)} per {product.unit}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <div className="font-medium">{formatCurrency(product.selling_price)} per {product.unit}</div>
                  <div className="text-sm text-gray-500 mt-1">Standard pricing</div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductViewDialog;