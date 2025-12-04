import React from 'react';
import { CreditCard, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BulkActionsToolbarProps {
  selectedProductsCount: number;
  clearSelections: () => void;
  handleBulkToggleCreditEligibility: (enable: boolean) => void;
  handleBulkDelete: () => void;
  dialogLoading: boolean;
}

const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedProductsCount,
  clearSelections,
  handleBulkToggleCreditEligibility,
  handleBulkDelete,
  dialogLoading
}) => {
  return (
    <div 
      className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4"
      role="region"
      aria-label="Bulk actions toolbar"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-blue-800">
            {selectedProductsCount} product(s) selected
          </span>
          <Button 
            variant="link" 
            className="text-blue-600 hover:text-blue-800 p-0 h-auto"
            onClick={clearSelections}
            aria-label="Clear selection"
          >
            Clear selection
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleBulkToggleCreditEligibility(true)}
            disabled={dialogLoading}
            className="flex items-center gap-2"
            aria-label="Enable credit for selected products"
          >
            <CreditCard className="w-4 h-4" aria-hidden="true" />
            Enable Credit
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleBulkToggleCreditEligibility(false)}
            disabled={dialogLoading}
            className="flex items-center gap-2"
            aria-label="Disable credit for selected products"
          >
            <CreditCard className="w-4 h-4" aria-hidden="true" />
            Disable Credit
          </Button>
          
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleBulkDelete}
            disabled={dialogLoading}
            className="flex items-center gap-2"
            aria-label="Delete selected products"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Delete Selected
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsToolbar;