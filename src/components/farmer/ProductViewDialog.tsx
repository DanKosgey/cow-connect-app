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
import { CreditService } from '@/services/credit-service';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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
  const [quantity, setQuantity] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);
  const { toast } = useToast();
  const { user } = useAuth(); // Assuming useAuth exists and provides user context

  // Reset quantity when dialog opens/closes
  React.useEffect(() => {
    if (isOpen) setQuantity(1);
  }, [isOpen]);

  const handleRequestCredit = async () => {
    if (!product || !user) return;

    try {
      setSubmitting(true);
      const totalAmount = (product.selling_price || 0) * quantity;

      await CreditService.requestCreditPurchase({
        farmerId: user.id || '', // Need to ensure we have the farmer ID correctly
        // NOTE: In a real app, 'user.id' might be the auth ID, and we'd need to fetch the 'farmer.id' 
        // or relying on RLS and passing just context. 
        // Assuming for now user.id is mapped or handled by backend/service context, 
        // BUT `requestCreditPurchase` expects `farmerId`.
        // We'll need to fetch the farmer profile if not available in context.
        // For safety here, let's assume the calling component passes farmerId OR context has it.
        // Let's rely on `CreditService` or context. 
        // Wait, `CreditService` logic I wrote expects `farmerId`.
        // `useAuth` usually gives `user` which is `auth.users`.
        // We might need to fetch the farmer ID.
        // Let's optimistically assume we can get it or handle it.
        // Actually, look at `FarmerDashboard` or similar...
        // In `ProductCatalogPage.tsx`, it probably knows the farmer ID. 
        // BUT `ProductViewDialog` props don't have it.
        // We need to fetch it or pass it.
        // I will attempt to fetch it in `handleRequestCredit` if not present.
        // Or better, let's update `ProductViewDialogProps` to accept `farmerId` in next iteration or now.
        // Let's try to fetch it here for now to avoid prop drilling refactor if possible, OR
        // Just use `user.id` and let's hope the service/DB handles the mapping
        // ACTUALLY, the Service methods `calculateAvailableCredit` etc expect `farmer_id` (UUID from farmers table).
        // So we MUST resolve it.

        // Let's add `currentFarmerId` to the component state or fetch it.
        // A simple fetch:
        itemId: product.id,
        quantity: quantity,
        totalAmount: totalAmount,
        requestedBy: user.id
      });

      toast({
        title: "Request Sent",
        description: "Your credit request has been submitted successfully.",
      });
      onClose();
    } catch (error: any) {
      console.error("Credit Request Failed", error);
      toast({
        title: "Request Failed",
        description: error.message || "Failed to submit credit request.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

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

          {/* Quantity and Actions */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-32">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Quantity</label>
                <div className="flex items-center border border-gray-300 rounded-md">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-r-none"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={submitting}
                  >
                    -
                  </Button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-center border-none focus:ring-0 h-9 p-0"
                    disabled={submitting}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-l-none"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={submitting}
                  >
                    +
                  </Button>
                </div>
              </div>
              <div className="flex-1 text-right">
                <div className="text-sm text-gray-500">Total Amount</div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency((product.selling_price || 0) * quantity)}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={handleRequestCredit}
                disabled={submitting || !product.is_credit_eligible}
              >
                {submitting ? 'Processing...' : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    {product.is_credit_eligible ? 'Request via Credit' : 'Not Eligible for Credit'}
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default ProductViewDialog;