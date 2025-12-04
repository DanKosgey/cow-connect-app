import React, { useState } from "react";
import { ProductPackaging } from "@/services/agrovet-inventory-service";
import { formatCurrency } from "@/utils/formatters";
import PackagingSelector from "@/components/farmer/PackagingSelector";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PackagingSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onConfirm: (packaging: ProductPackaging) => void;
}

const PackagingSelectionModal: React.FC<PackagingSelectionModalProps> = ({ 
  isOpen, 
  onClose, 
  product,
  onConfirm 
}) => {
  const [selectedPackaging, setSelectedPackaging] = useState<ProductPackaging | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!selectedPackaging) {
      setError("Please select a packaging option");
      return;
    }
    
    onConfirm(selectedPackaging);
    // Reset selection for next time
    setSelectedPackaging(null);
    setError(null);
  };

  const packagingOptions = product.packaging_options || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        setSelectedPackaging(null);
        setError(null);
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Packaging Option</DialogTitle>
          <DialogDescription>
            Choose a packaging option for {product.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="font-medium text-gray-900">{product.name}</h3>
            <p className="text-sm text-gray-600">{product.description}</p>
          </div>
          
          {packagingOptions.length > 0 ? (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Choose a packaging option:
                </label>
                <PackagingSelector 
                  packagingOptions={packagingOptions}
                  onSelect={setSelectedPackaging}
                  selectedPackagingId={selectedPackaging?.id}
                />
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900 mb-1">No Packaging Options Available</h4>
                  <p className="text-sm text-amber-700">
                    This product doesn't have any packaging options configured. 
                    Please contact the administrator.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {packagingOptions.length > 0 && (
            <Button 
              onClick={handleConfirm}
              disabled={!selectedPackaging}
            >
              Add to Cart
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PackagingSelectionModal;